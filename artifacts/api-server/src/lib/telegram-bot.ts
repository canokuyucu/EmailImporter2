import axios from "axios";
import { db, yetkilerTable, activityLogsTable, yetkiNotlariTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { calcDurum, runEmailScan, sendTelegramMessage, addActivityLog } from "./scanner.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

let offset = 0;
let polling = false;

// --- Multi-step /ekle state machine ---
type EkleState = { step: "tasinmazNo" | "ad" | "bitis" } & Record<string, string>;
const ekleSession: Map<string, EkleState & Record<string, string>> = new Map();

function statusIcon(durum: string): string {
  if (durum === "AKTİF") return "🟢";
  if (durum.includes("GÜN KALDI")) return "🟡";
  if (durum === "SÜRE BİTTİ") return "⚫";
  if (durum === "İPTAL") return "🔴";
  return "⚪";
}

async function getUpdates(): Promise<any[]> {
  try {
    const res = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`,
      { params: { offset, timeout: 30, limit: 10 }, timeout: 35000 }
    );
    return res.data?.result ?? [];
  } catch {
    return [];
  }
}

async function sendReply(chatId: number | string, text: string): Promise<void> {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { chat_id: chatId, text, parse_mode: "HTML" }
    );
  } catch (e: any) {
    console.error("sendReply error:", e.message);
  }
}

function isAuthorized(chatId: number | string): boolean {
  return String(chatId) === String(TELEGRAM_CHAT_ID);
}

async function handleCommand(chatId: number | string, text: string): Promise<void> {
  if (!isAuthorized(chatId)) {
    await sendReply(chatId, "⛔ Yetkisiz erişim.");
    return;
  }

  const key = String(chatId);
  const clean = text.trim();
  const cmd = clean.split(" ")[0].toLowerCase();
  const args = clean.slice(cmd.length).trim();

  // --- /ekle multi-step state machine ---
  if (ekleSession.has(key)) {
    const state = ekleSession.get(key)!;
    if (clean === "/iptal") {
      ekleSession.delete(key);
      await sendReply(chatId, "❌ Yetki ekleme iptal edildi.");
      return;
    }
    if (state.step === "tasinmazNo") {
      if (!/^\d{5,}$/.test(clean)) {
        await sendReply(chatId, "⚠️ Geçerli bir taşınmaz numarası girin (rakam, min 5 hane):");
        return;
      }
      state.tasinmazNo = clean;
      state.step = "ad";
      await sendReply(chatId, `✅ Taşınmaz No: <b>${clean}</b>\n\n👤 Şimdi <b>Ad Soyad / Unvan</b> girin:`);
      return;
    }
    if (state.step === "ad") {
      state.ad = clean;
      state.step = "bitis";
      await sendReply(chatId, `✅ Ad: <b>${clean}</b>\n\n📅 Bitiş tarihini <b>GG.AA.YYYY</b> formatında girin (yoksa "yok" yazın):`);
      return;
    }
    if (state.step === "bitis") {
      let bitisTarihi: string | null = null;
      if (clean.toLowerCase() !== "yok") {
        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(clean)) {
          await sendReply(chatId, "⚠️ GG.AA.YYYY formatında girin veya 'yok' yazın:");
          return;
        }
        bitisTarihi = clean;
      }
      const { durum, kalanGun } = calcDurum(bitisTarihi);
      const mailTarihi = new Date().toLocaleString("tr-TR");
      await db.insert(yetkilerTable).values({
        tasinmazNo: state.tasinmazNo,
        ad: state.ad,
        bitisTarihi,
        mailTarihi,
        durum,
        kalanGun,
      });
      await addActivityLog("YENİ EKLEME", `Telegram ile eklendi. Durum: ${durum}`, state.tasinmazNo, state.ad);
      ekleSession.delete(key);
      await sendReply(chatId,
        `✅ <b>Yetki Başarıyla Eklendi!</b>\n\n` +
        `🔢 No: ${state.tasinmazNo}\n` +
        `👤 Ad: ${state.ad}\n` +
        `📅 Bitiş: ${bitisTarihi ?? "—"}\n` +
        `📌 Durum: ${statusIcon(durum)} ${durum}`
      );
      return;
    }
  }

  // /ping
  if (cmd === "/ping") {
    const now = new Date().toLocaleString("tr-TR");
    await sendReply(chatId, `☁️ <b>Sistem Aktif</b>\n⏰ Saat: ${now}`);
    return;
  }

  // /ss
  if (cmd === "/ss") {
    await sendReply(chatId, "☁️ <i>Bot bulut sunucuda çalışıyor, ekran görüntüsü alınamaz.</i>");
    return;
  }

  // /guncelle — tüm mailleri tara
  if (cmd === "/guncelle") {
    await sendReply(chatId, "🔄 Geçmiş taranıyor...");
    const result = await runEmailScan(true);
    await sendReply(chatId,
      result.success
        ? `✅ <b>Tamamlandı!</b>\n📨 İşlenen: ${result.processed}\n🆕 Yeni: ${result.newCount}\n🔄 Güncellenen: ${result.updatedCount}`
        : `❌ <b>Tarama Hatası</b>\n${result.message}`
    );
    return;
  }

  // /liste — tüm portföy
  if (cmd === "/liste") {
    const rows = await db.select().from(yetkilerTable);
    if (rows.length === 0) { await sendReply(chatId, "📭 Kayıt bulunamadı."); return; }

    // Sort by mailTarihi desc (newest first)
    rows.sort((a, b) => new Date(b.mailTarihi).getTime() - new Date(a.mailTarihi).getTime());

    const chunks: string[] = [];
    let current = `📋 <b>TÜM YETKİLER (${rows.length})</b>\n\n`;
    for (const r of rows) {
      const { durum, kalanGun } = calcDurum(r.bitisTarihi);
      let line = `${statusIcon(durum)} <b>${r.ad}</b>\n🔢 ${r.tasinmazNo}`;
      if (r.bitisTarihi) line += ` | 📅 ${r.bitisTarihi}`;
      if (kalanGun !== null && kalanGun >= 0) line += ` | ⏳${kalanGun}g`;
      line += `\n\n`;
      if ((current + line).length > 3800) { chunks.push(current); current = line; }
      else current += line;
    }
    if (current) chunks.push(current);
    for (const c of chunks) await sendReply(chatId, c);
    return;
  }

  // /yaklasan
  if (cmd === "/yaklasan") {
    const rows = await db.select().from(yetkilerTable);
    const yaklasanlar = rows
      .map(r => ({ ...r, ...calcDurum(r.bitisTarihi) }))
      .filter(r => r.kalanGun !== null && r.kalanGun >= 0 && r.kalanGun <= 30)
      .sort((a, b) => (a.kalanGun ?? 999) - (b.kalanGun ?? 999));
    if (yaklasanlar.length === 0) {
      await sendReply(chatId, "✅ Önümüzdeki 30 gün içinde süresi bitecek yetki yok.");
      return;
    }
    let msg = `⚠️ <b>YAKLASAN YETKİLER — 30 GÜN (${yaklasanlar.length})</b>\n\n`;
    for (const r of yaklasanlar) {
      msg += `${statusIcon(r.durum)} <b>${r.ad}</b>\n`;
      msg += `   🔢 ${r.tasinmazNo} | 📅 ${r.bitisTarihi}\n`;
      msg += `   ⏳ <b>${r.kalanGun} gün kaldı</b>\n\n`;
    }
    await sendReply(chatId, msg.substring(0, 4000));
    return;
  }

  // /bitenler
  if (cmd === "/bitenler" || cmd === "/biten") {
    const rows = await db.select().from(yetkilerTable);
    const chunks: string[] = [];
    let current = "";
    let sayac = 0;
    for (const r of rows) {
      const { durum } = calcDurum(r.bitisTarihi);
      if (durum !== "AKTİF") {
        const line = `${statusIcon(durum)} <b>${r.ad}</b>\nDurum: ${durum}\n\n`;
        if ((current + line).length > 3800) { chunks.push(current); current = line; }
        else current += line;
        sayac++;
      }
    }
    if (sayac === 0) { await sendReply(chatId, "✅ Kritik yetki yok."); return; }
    if (current) chunks.push(current);
    for (const c of chunks) await sendReply(chatId, c);
    return;
  }

  // /bugun — bugün biten yetkiler
  if (cmd === "/bugun") {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
    const rows = await db.select().from(yetkilerTable);
    const todayRows = rows.filter(r => r.bitisTarihi === todayStr);
    if (todayRows.length === 0) {
      await sendReply(chatId, `✅ <b>Bugün (${todayStr}) süresi biten yetki yok.</b>`);
      return;
    }
    let msg = `🚨 <b>BUGÜN BİTEN YETKİLER (${todayRows.length})</b>\n📅 ${todayStr}\n\n`;
    for (const r of todayRows) {
      msg += `⚫ <b>${r.ad}</b>\n   🔢 ${r.tasinmazNo}\n\n`;
    }
    await sendReply(chatId, msg.substring(0, 4000));
    return;
  }

  // /haftalik — haftalık raporu gönder
  if (cmd === "/haftalik") {
    await sendWeeklyReport();
    return;
  }

  // /istatistik
  if (cmd === "/istatistik" || cmd === "/ozet") {
    const rows = await db.select().from(yetkilerTable);
    let aktif = 0, biten = 0, iptal = 0, yaklasan = 0;
    for (const r of rows) {
      const { durum, kalanGun } = calcDurum(r.bitisTarihi);
      if (durum === "AKTİF") aktif++;
      else if (durum === "SÜRE BİTTİ") biten++;
      else if (durum === "İPTAL") iptal++;
      if (kalanGun !== null && kalanGun >= 0 && kalanGun <= 30) yaklasan++;
    }
    const now = new Date().toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
    await sendReply(chatId,
      `📊 <b>SİSTEM İSTATİSTİKLERİ</b>\n${now}\n\n` +
      `📁 Toplam: <b>${rows.length}</b>\n` +
      `🟢 Aktif: <b>${aktif}</b>\n` +
      `⚫ Süresi Biten: <b>${biten}</b>\n` +
      `🔴 İptal: <b>${iptal}</b>\n` +
      `⚠️ 30 Günde Bitecek: <b>${yaklasan}</b>`
    );
    return;
  }

  // /ara [arama terimi] — explicit search command
  if (cmd === "/ara") {
    if (!args) {
      await sendReply(chatId, "ℹ️ Kullanım: /ara [isim veya no]\n\nÖrnek: /ara Ali veya /ara 32633559");
      return;
    }
    const q = args.toLowerCase();
    const rows = await db.select().from(yetkilerTable);
    const found = rows.filter(r =>
      r.tasinmazNo.toLowerCase().includes(q) || r.ad.toLowerCase().includes(q)
    );
    if (found.length === 0) {
      await sendReply(chatId, `🔍 "<b>${args}</b>" için sonuç bulunamadı.`);
      return;
    }
    let msg = `🔍 <b>ARAMA: ${args}</b> — ${found.length} sonuç\n\n`;
    for (const r of found.slice(0, 15)) {
      const { durum, kalanGun } = calcDurum(r.bitisTarihi);
      msg += `${statusIcon(durum)} <b>${r.ad}</b>\n`;
      msg += `   🔢 ${r.tasinmazNo}`;
      if (r.bitisTarihi) msg += ` | 📅 ${r.bitisTarihi}`;
      if (kalanGun !== null && kalanGun >= 0) msg += ` | ⏳${kalanGun} gün`;
      msg += `\n\n`;
    }
    if (found.length > 15) msg += `<i>... ve ${found.length - 15} sonuç daha.</i>`;
    await sendReply(chatId, msg.substring(0, 4000));
    return;
  }

  // /durum [tasinmazNo] — detaylı yetki bilgisi
  if (cmd === "/durum") {
    const no = args.trim();
    if (!no) { await sendReply(chatId, "ℹ️ Kullanım: /durum 12345"); return; }
    const rows = await db.select().from(yetkilerTable).where(eq(yetkilerTable.tasinmazNo, no)).limit(1);
    if (rows.length === 0) {
      await sendReply(chatId, `❌ <b>${no}</b> numaralı yetki bulunamadı.`);
      return;
    }
    const r = rows[0];
    const { durum, kalanGun } = calcDurum(r.bitisTarihi);
    let msg = `${statusIcon(durum)} <b>YETKİ DETAYI</b>\n\n`;
    msg += `🔢 No: <b>${r.tasinmazNo}</b>\n`;
    msg += `👤 Ad: ${r.ad}\n`;
    msg += `📌 Durum: <b>${durum}</b>\n`;
    if (r.bitisTarihi) msg += `📅 Bitiş: ${r.bitisTarihi}\n`;
    if (kalanGun !== null && kalanGun >= 0) msg += `⏳ Kalan: <b>${kalanGun} gün</b>\n`;
    else if (kalanGun !== null && kalanGun < 0) msg += `⚠️ <b>${Math.abs(kalanGun)} gün önce sona erdi</b>\n`;
    msg += `📨 Kayıt: ${r.mailTarihi}`;
    await sendReply(chatId, msg);
    return;
  }

  // /sil [tasinmazNo]
  if (cmd === "/sil") {
    const no = args.trim();
    if (!no) { await sendReply(chatId, "⚠️ Kullanım: /sil 12345"); return; }
    const rows = await db.select().from(yetkilerTable).where(eq(yetkilerTable.tasinmazNo, no)).limit(1);
    if (rows.length === 0) { await sendReply(chatId, "❌ Bulunamadı."); return; }
    await db.delete(yetkilerTable).where(eq(yetkilerTable.tasinmazNo, no));
    await addActivityLog("SİLME", `Telegram ile silindi.`, no, rows[0].ad);
    await sendReply(chatId, `✅ ${no} silindi.`);
    return;
  }

  // /tara
  if (cmd === "/tara") {
    await sendReply(chatId, "🔍 Gmail taraması başlatıldı...");
    const result = await runEmailScan(false);
    await sendReply(chatId,
      result.success
        ? `✅ <b>Tarama Tamamlandı</b>\n📨 İşlenen: ${result.processed}\n🆕 Yeni: ${result.newCount}\n🔄 Güncellenen: ${result.updatedCount}`
        : `❌ <b>Tarama Hatası</b>\n${result.message}`
    );
    return;
  }

  // /son
  if (cmd === "/son") {
    const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(5);
    if (logs.length === 0) { await sendReply(chatId, "📭 Aktivite kaydı yok."); return; }
    let msg = `📜 <b>SON AKTİVİTELER</b>\n\n`;
    for (const log of logs) {
      msg += `▸ <b>${log.action}</b>`;
      if (log.ad) msg += ` — ${log.ad}`;
      if (log.details) msg += `\n   ${log.details}`;
      msg += `\n   <i>${log.createdAt.toLocaleString("tr-TR")}</i>\n\n`;
    }
    await sendReply(chatId, msg);
    return;
  }

  // /ekle — multi-step add
  if (cmd === "/ekle") {
    ekleSession.set(key, { step: "tasinmazNo" });
    await sendReply(chatId,
      `➕ <b>Yeni Yetki Ekleme</b>\n\nİptal: /iptal\n\n🔢 <b>Taşınmaz numarasını</b> girin:`
    );
    return;
  }

  // /not [tasinmazNo] [metin]
  if (cmd === "/not") {
    const parts = args.split(" ");
    const no = parts[0];
    const metin = parts.slice(1).join(" ").trim();
    if (!no || !metin) {
      await sendReply(chatId, "ℹ️ Kullanım: /not [TaşınmazNo] [not metni]\nÖrnek: /not 3343737 Yenileme yapılacak");
      return;
    }
    const rows = await db.select().from(yetkilerTable).where(eq(yetkilerTable.tasinmazNo, no)).limit(1);
    if (rows.length === 0) {
      await sendReply(chatId, `❌ <b>${no}</b> numaralı yetki bulunamadı.`);
      return;
    }
    await db.insert(yetkiNotlariTable).values({ yetkiId: rows[0].id, not: metin });
    await sendReply(chatId, `✅ Not eklendi.\n🔢 <b>${no}</b> — ${rows[0].ad}\n📝 "${metin}"`);
    return;
  }

  // /yardim
  if (cmd === "/yardim" || cmd === "/help" || cmd === "/start" || cmd === "/menu") {
    await sendReply(chatId,
      `☁️ <b>EIDS YETKİ TAKİP — KOMUTLAR</b>\n\n` +
      `📋 <b>Listeleme</b>\n` +
      `▸ /liste — Tüm yetkiler\n` +
      `▸ /yaklasan — 30 günde bitenler\n` +
      `▸ /bugun — Bugün bitenler\n` +
      `▸ /bitenler — Süresi dolanlar\n\n` +
      `🔍 <b>Arama</b>\n` +
      `▸ /ara [isim/no] — Kayıt ara\n` +
      `▸ /durum [no] — Detaylı bilgi\n\n` +
      `📊 <b>Raporlar</b>\n` +
      `▸ /istatistik — Özet istatistik\n` +
      `▸ /haftalik — Haftalık rapor\n` +
      `▸ /son — Son aktiviteler\n\n` +
      `⚙️ <b>İşlemler</b>\n` +
      `▸ /tara — Yeni mailleri tara\n` +
      `▸ /guncelle — Tüm mailleri yeniden tara\n` +
      `▸ /ekle — Yeni yetki ekle\n` +
      `▸ /sil [no] — Kayıt sil\n` +
      `▸ /not [no] [metin] — Not ekle\n\n` +
      `💻 /ping — Sistem durumu\n\n` +
      `🔍 <i>Sadece isim/no yazarak da arama yapabilirsin.</i>`
    );
    return;
  }

  // Serbest arama — isim veya no ile
  if (clean.length >= 2 && !cmd.startsWith("/")) {
    const rows = await db.select().from(yetkilerTable);
    const lowerQ = clean.toLowerCase();
    const bulunan = rows.filter(r =>
      r.tasinmazNo.toLowerCase().includes(lowerQ) || r.ad.toLowerCase().includes(lowerQ)
    );
    if (bulunan.length === 0) { await sendReply(chatId, `🔍 Kayıt bulunamadı.`); return; }
    const lines = bulunan.map(r => {
      const { durum } = calcDurum(r.bitisTarihi);
      return `${statusIcon(durum)} <b>${r.ad}</b> (${r.tasinmazNo})`;
    });
    await sendReply(chatId, lines.join("\n"));
    return;
  }

  if (cmd.startsWith("/")) {
    await sendReply(chatId, `❓ Bilinmeyen komut.\n\n/yardim — tüm komutlar`);
  }
}

export async function sendWeeklyReport(): Promise<void> {
  const rows = await db.select().from(yetkilerTable);
  let aktif = 0, biten = 0, iptal = 0;
  const yaklasanlar: typeof rows = [];

  for (const r of rows) {
    const { durum, kalanGun } = calcDurum(r.bitisTarihi);
    if (durum === "AKTİF" || durum.includes("GÜN KALDI")) aktif++;
    else if (durum === "SÜRE BİTTİ") biten++;
    else iptal++;
    if (kalanGun !== null && kalanGun >= 0 && kalanGun <= 7) yaklasanlar.push(r);
  }

  let msg =
    `📅 <b>HAFTALIK ÖZET RAPORU</b>\n` +
    `${new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n` +
    `📁 Toplam: <b>${rows.length}</b>\n` +
    `🟢 Aktif: <b>${aktif}</b>\n` +
    `⚫ Süresi Biten: <b>${biten}</b>\n` +
    `🔴 İptal: <b>${iptal}</b>\n\n`;

  if (yaklasanlar.length > 0) {
    msg += `⚠️ <b>Bu Hafta Bitecekler (${yaklasanlar.length})</b>\n`;
    for (const r of yaklasanlar) {
      const { kalanGun } = calcDurum(r.bitisTarihi);
      msg += `• ${r.ad} — ${r.bitisTarihi} (<b>${kalanGun} gün</b>)\n`;
    }
  } else {
    msg += `✅ Bu hafta süresi dolacak yetki yok.`;
  }

  await sendTelegramMessage(msg.substring(0, 4000));
}

export async function checkDayZeroAlerts(): Promise<void> {
  const rows = await db.select().from(yetkilerTable);
  for (const r of rows) {
    const { kalanGun } = calcDurum(r.bitisTarihi);
    if (kalanGun === 0) {
      await sendTelegramMessage(
        `🚨 <b>YETKİ BUGÜN BİTİYOR!</b>\n\n👤 ${r.ad}\n🔢 No: ${r.tasinmazNo}\n📅 ${r.bitisTarihi}`
      );
    }
  }
}

export async function startTelegramBot(): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("Telegram bot: token veya chat ID eksik, atlanıyor.");
    return;
  }

  polling = true;
  console.log("Telegram bot polling başlatıldı.");

  try {
    const res = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`,
      { params: { offset: -1, limit: 1 }, timeout: 10000 }
    );
    const updates = res.data?.result ?? [];
    if (updates.length > 0) offset = updates[updates.length - 1].update_id + 1;
  } catch {}

  const poll = async () => {
    if (!polling) return;
    const updates = await getUpdates();
    for (const update of updates) {
      offset = update.update_id + 1;
      const msg = update.message;
      if (!msg?.text) continue;
      handleCommand(msg.chat.id, msg.text).catch((e) =>
        console.error("Bot handler error:", e.message)
      );
    }
    if (polling) setTimeout(poll, 1000);
  };

  poll();
}

export function stopTelegramBot(): void {
  polling = false;
}
