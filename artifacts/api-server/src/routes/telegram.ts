import { Router } from "express";
import { db, yetkilerTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { calcDurum, sendTelegramMessage } from "../lib/scanner.js";
import { logBildirim } from "../lib/bildirim-logger.js";

const router = Router();

router.post("/toplu-gonder", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids dizisi gereklidir" });
  }

  const numIds = ids.map((id: any) => Number(id)).filter((id) => !isNaN(id));
  if (numIds.length === 0) {
    return res.status(400).json({ error: "Geçerli id bulunamadı" });
  }

  const rows = await db
    .select()
    .from(yetkilerTable)
    .where(inArray(yetkilerTable.id, numIds));

  if (rows.length === 0) {
    return res.status(404).json({ error: "Kayıt bulunamadı" });
  }

  const now = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let msg = `📋 <b>EIDS Seçili Yetki Özeti</b>\n`;
  msg += `📅 <i>${now}</i>\n`;
  msg += `📊 Toplam: <b>${rows.length} kayıt</b>\n`;
  msg += `─────────────────────\n`;

  for (const r of rows) {
    const { durum, kalanGun } = calcDurum(r.bitisTarihi);
    const icon =
      durum === "AKTİF"
        ? "🟢"
        : durum.includes("GÜN KALDI")
        ? "🟡"
        : durum === "SÜRE BİTTİ"
        ? "⚫"
        : "🔴";

    msg += `\n${icon} <b>${r.tasinmazNo}</b>\n`;
    msg += `👤 ${r.ad}\n`;
    if (r.bitisTarihi) {
      msg += `📅 ${r.bitisTarihi}`;
      if (kalanGun !== null && kalanGun >= 0)
        msg += ` • <b>${kalanGun} gün kaldı</b>`;
      else if (kalanGun !== null && kalanGun < 0)
        msg += ` • <b>SÜRESİ GEÇTİ</b>`;
      msg += `\n`;
    }
  }

  await sendTelegramMessage(msg);
  await logBildirim("TOPLU", `${rows.length} kayıt seçilerek gönderildi`);

  res.json({ success: true, count: rows.length });
});

export default router;
