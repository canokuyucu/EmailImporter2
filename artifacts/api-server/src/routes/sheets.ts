import { Router } from "express";
import { db, yetkilerTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { readFromSheet, isSheetsConfigured } from "../lib/google-sheets.js";
import { calcDurum, addActivityLog } from "../lib/scanner.js";

const router = Router();

// POST /api/sheets/import — Sheets → DB
router.post("/import", async (_req, res) => {
  if (!isSheetsConfigured()) {
    return res.status(400).json({ error: "Google Sheets yapılandırılmamış" });
  }

  try {
    const sheetRows = await readFromSheet();
    if (sheetRows.length === 0) {
      return res.json({ ok: true, message: "Sheets boş veya okunamadı", imported: 0, updated: 0 });
    }

    let imported = 0, updated = 0, skipped = 0;

    for (const row of sheetRows) {
      if (!row.tasinmazNo || !row.ad) { skipped++; continue; }
      const { durum, kalanGun } = calcDurum(row.bitisTarihi);

      const existing = await db
        .select()
        .from(yetkilerTable)
        .where(eq(yetkilerTable.tasinmazNo, row.tasinmazNo))
        .limit(1);

      if (existing.length > 0) {
        await db.update(yetkilerTable).set({
          ad: row.ad,
          bitisTarihi: row.bitisTarihi,
          mailTarihi: row.mailTarihi,
          durum,
          kalanGun,
          updatedAt: new Date(),
        }).where(eq(yetkilerTable.tasinmazNo, row.tasinmazNo));
        updated++;
        await addActivityLog("GÜNCELLEME", "Google Sheets'ten güncellendi.", row.tasinmazNo, row.ad);
      } else {
        await db.insert(yetkilerTable).values({
          tasinmazNo: row.tasinmazNo,
          ad: row.ad,
          bitisTarihi: row.bitisTarihi,
          mailTarihi: row.mailTarihi,
          durum,
          kalanGun,
        });
        imported++;
        await addActivityLog("YENİ EKLEME", "Google Sheets'ten eklendi.", row.tasinmazNo, row.ad);
      }
    }

    res.json({
      ok: true,
      message: `Sheets'ten ${imported} yeni, ${updated} güncellendi, ${skipped} atlandı.`,
      imported, updated, skipped,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
