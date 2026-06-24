import { Router } from "express";
import { db, yetkilerTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calcDurum, addActivityLog } from "../lib/scanner.js";
import { broadcastSSE } from "./sse.js";

const router = Router();

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; continue; }
      if (c === "," && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-zçğışöü0-9]/g, ""));
  return lines.slice(1).map(line => {
    const cols = parseRow(line);
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { rec[h] = cols[i] ?? ""; });
    return rec;
  });
}

function resolveField(rec: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = rec[k.toLowerCase().replace(/[^a-zçğışöü0-9]/g, "")];
    if (v) return v;
  }
  return "";
}

router.post("/", async (req, res) => {
  try {
    const contentType = req.headers["content-type"] ?? "";
    let records: Array<{ tasinmazNo: string; ad: string; bitisTarihi?: string | null; mailTarihi?: string; etiket?: string }> = [];

    if (contentType.includes("text/plain") || contentType.includes("text/csv")) {
      const rawCSV = parseCSV(req.body as string);
      records = rawCSV.map(r => ({
        tasinmazNo: resolveField(r, "taşınmazno", "tasinmazno", "tasinmazno", "no"),
        ad: resolveField(r, "adsoyad", "ad", "name", "ünvan", "unvan"),
        bitisTarihi: resolveField(r, "bitistarihi", "bitis", "bitiş") || null,
        mailTarihi: resolveField(r, "mailtarihi", "mail", "tarih") || new Date().toLocaleString("tr-TR"),
        etiket: resolveField(r, "etiket", "kategori", "tip"),
      }));
    } else if (Array.isArray(req.body)) {
      records = req.body;
    }

    let added = 0, updated = 0, skipped = 0;
    const now = new Date().toLocaleString("tr-TR");

    for (const rec of records) {
      if (!rec.tasinmazNo?.trim() || !rec.ad?.trim()) { skipped++; continue; }
      const { durum, kalanGun } = calcDurum(rec.bitisTarihi ?? null);
      const existing = await db.select().from(yetkilerTable)
        .where(eq(yetkilerTable.tasinmazNo, rec.tasinmazNo)).limit(1);

      if (existing.length > 0) {
        await db.update(yetkilerTable).set({
          ad: rec.ad, bitisTarihi: rec.bitisTarihi ?? null,
          mailTarihi: rec.mailTarihi ?? now, durum, kalanGun,
          etiket: rec.etiket ?? existing[0].etiket ?? "",
          updatedAt: new Date(),
        }).where(eq(yetkilerTable.tasinmazNo, rec.tasinmazNo));
        updated++;
      } else {
        await db.insert(yetkilerTable).values({
          tasinmazNo: rec.tasinmazNo, ad: rec.ad,
          bitisTarihi: rec.bitisTarihi ?? null,
          mailTarihi: rec.mailTarihi ?? now, durum, kalanGun,
          etiket: rec.etiket ?? "",
        });
        await addActivityLog("YENİ EKLEME", "CSV/Excel import ile eklendi.", rec.tasinmazNo, rec.ad);
        added++;
      }
    }

    broadcastSSE("yetkiler_updated", { source: "import", added, updated });
    res.json({ ok: true, added, updated, skipped, total: records.length, message: `${added} eklendi, ${updated} güncellendi, ${skipped} atlandı.` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
