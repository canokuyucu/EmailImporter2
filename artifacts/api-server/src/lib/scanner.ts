import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db, yetkilerTable, activityLogsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import axios from "axios";
import { syncYetkiToSheet, fullSyncToSheet, isSheetsConfigured } from "./google-sheets.js";

const EMAIL = process.env.EMAIL!;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD!;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const SENDER = "eids.yetki@ticaret.gov.tr";

export interface ScanResult {
  success: boolean;
  message: string;
  processed: number;
  newCount: number;
  updatedCount: number;
}

export interface ScannerStatus {
  lastScan: string | null;
  nextScan: string | null;
  isRunning: boolean;
}

let lastScan: Date | null = null;
let isRunning = false;
let nextScanTime: Date | null = null;

export function setNextScanTime(d: Date) {
  nextScanTime = d;
}

export function getScannerStatus(): ScannerStatus {
  return {
    lastScan: lastScan ? lastScan.toISOString() : null,
    nextScan: nextScanTime ? nextScanTime.toISOString() : null,
    isRunning,
  };
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return false;
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }
    );
    return true;
  } catch (e: any) {
    console.error("Telegram error:", e.message);
    return false;
  }
}

export async function addActivityLog(
  action: string,
  details?: string,
  tasinmazNo?: string,
  ad?: string
) {
  try {
    await db.insert(activityLogsTable).values({
      action,
      details: details ?? null,
      tasinmazNo: tasinmazNo ?? null,
      ad: ad ?? null,
    });
  } catch (e: any) {
    console.error("Activity log error:", e.message);
  }
}

export function calcDurum(bitisTarihi: string | null | undefined): {
  durum: string;
  kalanGun: number | null;
} {
  if (!bitisTarihi) return { durum: "İPTAL", kalanGun: null };
  try {
    const [day, month, year] = bitisTarihi.split(".");
    const bitis = new Date(Number(year), Number(month) - 1, Number(day));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffMs = bitis.getTime() - now.getTime();
    const kalanGun = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (kalanGun < 0) return { durum: "SÜRE BİTTİ", kalanGun };
    if (kalanGun <= 7) return { durum: `${kalanGun} GÜN KALDI`, kalanGun };
    return { durum: "AKTİF", kalanGun };
  } catch {
    return { durum: "HATA", kalanGun: null };
  }
}

function statusIcon(durum: string): string {
  if (durum.includes("GÜN KALDI")) return "🟡";
  if (durum === "AKTİF") return "🟢";
  if (durum === "İPTAL") return "🔴";
  if (durum === "SÜRE BİTTİ") return "⚫";
  return "⚪";
}

function extractDateFromText(body: string): string | null {
  // dd.mm.yyyy veya dd/mm/yyyy
  const m1 = body.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (m1) {
    const year = parseInt(m1[3]);
    if (year >= 2020 && year <= 2040) return `${m1[1]}.${m1[2]}.${m1[3]}`;
  }
  // Yazılı tarih: "15 Aralık 2025"
  const MONTHS: Record<string, string> = {
    ocak: "01", şubat: "02", mart: "03", nisan: "04",
    mayıs: "05", haziran: "06", temmuz: "07", ağustos: "08",
    eylül: "09", ekim: "10", kasım: "11", aralık: "12",
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };
  const m2 = body.match(/(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
  if (m2) {
    const monthNum = MONTHS[m2[2].toLowerCase()];
    const year = parseInt(m2[3]);
    if (monthNum && year >= 2020 && year <= 2040) {
      return `${m2[1].padStart(2, "0")}.${monthNum}.${m2[3]}`;
    }
  }
  // Fallback: 1-2 hane gün/ay
  const m3 = body.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
  if (m3) {
    const year = parseInt(m3[3]);
    if (year >= 2020 && year <= 2040)
      return `${m3[1].padStart(2, "0")}.${m3[2].padStart(2, "0")}.${m3[3]}`;
  }
  return null;
}

function extractTasinmazNo(body: string): string | null {
  // Labeled: "Taşınmaz No: 12345678"
  const labeled = body.match(/ta[sş][iı]nmaz\s*(?:no|numaras[iı])[.:\s]*(\d{5,})/i);
  if (labeled) return labeled[1];
  // 8+ hane sayı (daha güvenilir)
  const match8 = body.match(/\b(\d{8,})\b/);
  if (match8) return match8[1];
  // 6-7 hane
  const match6 = body.match(/\b(\d{6,7})\b/);
  return match6 ? match6[1] : null;
}

function extractAd(body: string): string | null {
  // Desen 1: "konusunda XXX tarafından"
  const m1 = body.match(/konusunda\s+([\p{L}\s.]{3,60}?)\s+taraf[ıi]ndan/iu);
  if (m1) return m1[1].trim();
  // Desen 2: "XXX tarafından yetkilendirilmiş"
  const m2 = body.match(/([\p{L}\s.]{5,60}?)\s+taraf[ıi]ndan\s+yetkilendirilmi[sş]/iu);
  if (m2) return m2[1].trim();
  // Desen 3: "Ad Soyad / Unvan :" label
  const m3 = body.match(/(?:ad[iı]?\s*soyad[iı]?|unvan)\s*[:/]\s*([\p{L}\s.]{3,60}?)(?:\n|Taş|No|[0-9])/iu);
  if (m3) return m3[1].trim();
  // Desen 4: "adına" pattern
  const m4 = body.match(/(?:ad[iı]na|lehine)\s+([\p{L}\s.]{5,60}?)(?:\s+ad[iı]na|\s+için|\s*[,\n])/iu);
  if (m4) return m4[1].trim();
  // Desen 5: Büyük harfli ad (2+ kelime)
  const m5 = body.match(/\b([A-ZÇĞİÖŞÜ][A-Za-zçğışöüÇĞİÖŞÜ]+\s+[A-ZÇĞİÖŞÜ][A-Za-zçğışöüÇĞİÖŞÜ]+(?:\s+[A-ZÇĞİÖŞÜ][A-Za-zçğışöüÇĞİÖŞÜ]+)?)\s+(?:adına|için|tarafından)/u);
  if (m5) return m5[1].trim();
  return null;
}

function debugEmailParse(subject: string, body: string, tasinmazNo: string | null, ad: string | null): void {
  if (!tasinmazNo || !ad) {
    const preview = body.substring(0, 300).replace(/\n/g, " ");
    console.warn(`[PARSE BAŞARISIZ] Konu: "${subject}"`);
    console.warn(`  TaşınmazNo: ${tasinmazNo ?? "BULUNAMADI"}`);
    console.warn(`  Ad: ${ad ?? "BULUNAMADI"}`);
    console.warn(`  İçerik önizleme: ${preview}`);
  }
}

export async function testConnections(): Promise<{
  gmail: { ok: boolean; message: string };
  telegram: { ok: boolean; message: string };
}> {
  const result = {
    gmail: { ok: false, message: "" },
    telegram: { ok: false, message: "" },
  };

  // Test Gmail
  try {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: EMAIL, pass: EMAIL_PASSWORD },
      logger: false,
    });
    await client.connect();
    await client.logout();
    result.gmail = { ok: true, message: "Gmail IMAP bağlantısı başarılı" };
  } catch (e: any) {
    result.gmail = { ok: false, message: `Gmail hatası: ${e.message}` };
  }

  // Test Telegram
  try {
    const res = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe`
    );
    const botName = res.data?.result?.username ?? "bot";
    result.telegram = { ok: true, message: `Telegram bağlantısı başarılı (@${botName})` };
  } catch (e: any) {
    result.telegram = { ok: false, message: `Telegram hatası: ${e.message}` };
  }

  return result;
}

export async function runEmailScan(initialScan = false): Promise<ScanResult> {
  if (isRunning) {
    return { success: false, message: "Tarama zaten çalışıyor", processed: 0, newCount: 0, updatedCount: 0 };
  }

  isRunning = true;
  let processed = 0, newCount = 0, updatedCount = 0;

  try {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: EMAIL, pass: EMAIL_PASSWORD },
      logger: {
        debug: () => {},
        info: () => {},
        warn: (obj: any) => console.warn("[IMAP WARN]", obj?.msg ?? obj),
        error: (obj: any) => console.error("[IMAP ERR]", obj?.msg ?? obj),
      },
    });

    // Unhandled error event process'i çöktürür — yakala ve scanner hata yolunu kullan
    client.on("error", (err: Error) => {
      console.error("IMAP socket error:", err.message);
    });

    await client.connect();

    // Gmail'de All Mail tüm klasörleri (INBOX + Spam + diğerleri) kapsar, duplikatsız
    // \All özelliğine sahip klasörü otomatik bul (dile göre değişir: "All Mail" / "Tüm Postalar" vs.)
    let targetMailbox = "INBOX";
    try {
      const mailboxList = await client.list();
      // m.flags bir Set veya Array olabilir
      const flagsToArr = (flags: any): string[] => {
        if (!flags) return [];
        if (typeof flags.has === "function") return [...flags]; // Set
        if (Array.isArray(flags)) return flags;
        return [];
      };
      console.log("Mevcut klasörler:", mailboxList.map((m: any) => `${m.path}[${flagsToArr(m.flags).join(",")}]`).join(" | "));
      // \All özelliğine sahip klasörü bul (Gmail All Mail — dile göre farklı ad taşır)
      const allMailBox = mailboxList.find((m: any) => flagsToArr(m.flags).includes("\\All"));
      if (allMailBox) {
        targetMailbox = allMailBox.path;
        console.log(`All Mail klasörü bulundu: ${targetMailbox}`);
      } else {
        console.log("All Mail klasörü bulunamadı, INBOX kullanılıyor.");
      }
    } catch (e: any) {
      console.warn("Klasör listesi alınamadı:", e.message);
    }

    const lock = await client.getMailboxLock(targetMailbox);
    console.log(`Taranan klasör: ${targetMailbox}`);

    try {
      // İlk taramada: tüm geçmişi çek
      // Sonraki taramalarda: son taramadan bu yana gelen mailleri çek (seen durumuna bakma)
      let searchCriteria: any;
      if (initialScan) {
        searchCriteria = { from: SENDER };
      } else {
        // Son tarama varsa ondan bu yana, yoksa son 30 gün
        const since = lastScan
          ? new Date(lastScan.getTime() - 5 * 60 * 1000) // 5 dakika örtüşme payı
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        searchCriteria = { from: SENDER, since };
      }

      console.log(`IMAP arama: ${JSON.stringify(searchCriteria)}`);
      const messages = client.fetch(searchCriteria, { source: true, envelope: true });

      let found = 0;
      for await (const msg of messages) {
        found++;
        try {
          const parsed = await simpleParser(msg.source);
          const body = typeof parsed.text === "string" ? parsed.text : "";
          const html = typeof parsed.textAsHtml === "string" ? parsed.textAsHtml.replace(/<[^>]*>/g, " ") : "";
          const subject = parsed.subject ?? "";
          const fromAddr = parsed.from?.text ?? "?";
          const combined = body + "\n" + html + "\n" + subject;
          console.log(`[MAIL ${found}] Kimden: ${fromAddr} | Konu: ${subject.substring(0, 80)}`);

          const tasinmazNo = extractTasinmazNo(combined);
          const ad = extractAd(combined);
          const isIptal = combined.toLowerCase().includes("iptal");
          const dateStr = isIptal ? null : extractDateFromText(combined);
          const mailTarihi = parsed.date
            ? parsed.date.toLocaleString("tr-TR")
            : new Date().toLocaleString("tr-TR");

          if (!tasinmazNo || !ad) {
            debugEmailParse(subject, combined, tasinmazNo, ad);
            continue;
          }

          const { durum, kalanGun } = calcDurum(dateStr);
          const existing = await db
            .select()
            .from(yetkilerTable)
            .where(eq(yetkilerTable.tasinmazNo, tasinmazNo))
            .limit(1);

          const sheetRow = { tasinmazNo, ad, bitisTarihi: dateStr, mailTarihi, durum, kalanGun };

          if (existing.length > 0) {
            // Uyarı bayraklarını SADECE bitisTarihi gerçekten değiştiyse sıfırla
            const bitisDegisti = existing[0].bitisTarihi !== dateStr;
            await db.update(yetkilerTable).set({
              ad, bitisTarihi: dateStr, mailTarihi, durum, kalanGun,
              ...(bitisDegisti ? { alert30Sent: false, alert14Sent: false, alert7Sent: false } : {}),
              updatedAt: new Date(),
            }).where(eq(yetkilerTable.tasinmazNo, tasinmazNo));
            updatedCount++;
            await addActivityLog("GÜNCELLEME", `E-posta ile güncellendi. Durum: ${durum}`, tasinmazNo, ad);
            if (!initialScan) {
              const notifGuncelleme = await getSetting("notif_guncelleme");
              if (notifGuncelleme !== "0") {
                await sendTelegramMessage(
                  `${statusIcon(durum)} <b>YETKİ GÜNCELLENDİ</b>\n\n👤 ${ad}\n🏢 No: ${tasinmazNo}\n📌 Durum: ${durum}`
                );
              }
            }
          } else {
            await db.insert(yetkilerTable).values({
              tasinmazNo, ad, bitisTarihi: dateStr, mailTarihi, durum, kalanGun,
            });
            newCount++;
            await addActivityLog("YENİ EKLEME", `E-posta ile eklendi. Durum: ${durum}`, tasinmazNo, ad);
            if (!initialScan) {
              const notifYeni = await getSetting("notif_yeni");
              if (notifYeni !== "0") {
                await sendTelegramMessage(
                  `${statusIcon(durum)} <b>YENİ YETKİ EKLENDİ</b>\n\n👤 ${ad}\n🏢 No: ${tasinmazNo}\n📌 Durum: ${durum}`
                );
              }
            }
          }

          if (!initialScan && isSheetsConfigured()) {
            syncYetkiToSheet(sheetRow).catch(() => {});
          }
          processed++;
        } catch (msgErr: any) {
          console.error("Message error:", msgErr.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    lastScan = new Date();

    await addActivityLog(
      "TARAMA",
      `${processed} e-posta işlendi. ${newCount} yeni, ${updatedCount} güncellendi.`
    );

    // İlk taramada tüm kayıtları tek seferde Google Sheets'e yaz
    if (initialScan && isSheetsConfigured()) {
      try {
        const allRows = await db.select().from(yetkilerTable);
        await fullSyncToSheet(allRows.map(r => ({
          tasinmazNo: r.tasinmazNo,
          ad: r.ad,
          bitisTarihi: r.bitisTarihi,
          mailTarihi: r.mailTarihi,
          durum: r.durum,
          kalanGun: r.kalanGun,
        })));
      } catch (sheetErr: any) {
        console.error("Google Sheets initial sync error:", sheetErr.message);
      }
    }

    return {
      success: true,
      message: `Tarama tamamlandı. ${processed} e-posta işlendi.`,
      processed, newCount, updatedCount,
    };
  } catch (err: any) {
    console.error("Scanner error:", err.message);
    await addActivityLog("HATA", `Tarama hatası: ${err.message}`);
    return {
      success: false,
      message: `Tarama hatası: ${err.message}`,
      processed, newCount, updatedCount,
    };
  } finally {
    isRunning = false;
  }
}

export async function checkExpiryAlerts(): Promise<void> {
  try {
    // Tüm bildirim ayarlarını tek seferde oku
    const [notifSurebitis, notif30, notif14, notif7] = await Promise.all([
      getSetting("notif_surebitis"),
      getSetting("notif_alert30"),
      getSetting("notif_alert14"),
      getSetting("notif_alert7"),
    ]);

    if (notifSurebitis === "0") return; // Tüm bitiş uyarıları kapalı

    const rows = await db.select().from(yetkilerTable);
    const thresholds = [
      { days: 30, field: "alert30Sent" as const, label: "30", enabled: notif30 !== "0" },
      { days: 14, field: "alert14Sent" as const, label: "14", enabled: notif14 !== "0" },
      { days: 7,  field: "alert7Sent" as const,  label: "7",  enabled: notif7  !== "0" },
    ];

    for (const row of rows) {
      const { kalanGun } = calcDurum(row.bitisTarihi);
      if (kalanGun === null || kalanGun < 0) continue;

      for (const t of thresholds) {
        if (!t.enabled) continue;
        if (kalanGun <= t.days && !row[t.field]) {
          await sendTelegramMessage(
            `⚠️ <b>YETKİ SÜRESİ YAKLAŞIYOR — ${t.label} GÜN</b>\n\n👤 ${row.ad}\n🏢 No: ${row.tasinmazNo}\n📅 Bitiş: ${row.bitisTarihi}\n⏳ Kalan: ${kalanGun} gün`
          );
          await db.update(yetkilerTable)
            .set({ [t.field]: true, updatedAt: new Date() })
            .where(eq(yetkilerTable.id, row.id));
          await addActivityLog(
            "UYARI",
            `${t.label} günlük yaklaşma uyarısı Telegram'a gönderildi.`,
            row.tasinmazNo, row.ad
          );
        }
      }
    }
  } catch (e: any) {
    console.error("Expiry alert error:", e.message);
  }
}

export async function sendReminderMessage(): Promise<void> {
  try {
    const rows = await db.select().from(yetkilerTable);
    let toplam_aktif = 0;
    const yarinBitenler: string[] = [];

    for (const row of rows) {
      const { durum, kalanGun } = calcDurum(row.bitisTarihi);

      // Durum değişikliği varsa DB'yi güncelle
      if (row.durum !== durum) {
        await db.update(yetkilerTable)
          .set({ durum, kalanGun, updatedAt: new Date() })
          .where(eq(yetkilerTable.id, row.id));
        await addActivityLog(
          "DURUM DEĞİŞİKLİĞİ",
          `${row.durum} → ${durum}`,
          row.tasinmazNo, row.ad
        );
      }

      if (durum === "AKTİF" || durum.includes("GÜN KALDI")) {
        toplam_aktif++;
      }
      // Yarın bitecek = "1 GÜN KALDI"
      if (durum === "1 GÜN KALDI") {
        yarinBitenler.push(`👤 ${row.ad} (No: ${row.tasinmazNo})`);
      }
    }

    let mesaj = `☀️ <b>Günaydın Ali Can!</b> ☕\n\n🏠 Bugün <b>${toplam_aktif}</b> aktif yetkin var.\n\n`;
    if (yarinBitenler.length > 0) {
      mesaj += `🚨 <b>YARIN BİTECEK YETKİLER:</b>\n` + yarinBitenler.join("\n");
    } else {
      mesaj += `✅ Bugün süresi dolacak kritik yetki yok.`;
    }

    await sendTelegramMessage(mesaj.substring(0, 4000));
    await addActivityLog("TARAMA", `Sabah bülteni gönderildi. ${toplam_aktif} aktif yetki.`);
  } catch (err: any) {
    console.error("Reminder error:", err.message);
  }
}
