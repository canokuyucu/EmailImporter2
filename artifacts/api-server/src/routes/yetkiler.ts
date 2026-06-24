import { Router, type IRouter } from "express";
import { db, yetkilerTable, activityLogsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  ListYetkilerResponse,
  GetYetkiStatsResponse,
  DeleteYetkiResponse,
  BulkDeleteYetkilerResponse,
  GetYetkiResponse,
  UpdateYetkiResponse,
} from "@workspace/api-zod";
import { calcDurum, addActivityLog } from "../lib/scanner.js";

const router: IRouter = Router();

function serializeYetki(r: any) {
  const { durum, kalanGun } = calcDurum(r.bitisTarihi);
  return {
    ...r,
    durum,
    kalanGun,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

// GET /yetkiler
router.get("/", async (req, res) => {
  const { durum, search, sortBy, sortOrder } = req.query as Record<string, string>;
  let rows = await db.select().from(yetkilerTable);

  // Enrich with computed durum/kalanGun
  let enriched = rows.map(serializeYetki);

  // Filter by durum
  if (durum && durum !== "Tümü" && durum !== "") {
    enriched = enriched.filter((r) =>
      durum === "GÜN KALDI" ? r.durum.includes("GÜN KALDI") : r.durum === durum
    );
  }

  // Search
  if (search) {
    const s = search.toLowerCase();
    enriched = enriched.filter(
      (r) =>
        r.tasinmazNo.toLowerCase().includes(s) ||
        r.ad.toLowerCase().includes(s)
    );
  }

  // Sort
  if (sortBy) {
    const order = sortOrder === "desc" ? -1 : 1;
    enriched.sort((a: any, b: any) => {
      const av = a[sortBy] ?? "";
      const bv = b[sortBy] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * order;
      return String(av).localeCompare(String(bv)) * order;
    });
  }

  res.json(ListYetkilerResponse.parse(enriched));
});

// POST /yetkiler (manual create)
router.post("/", async (req, res) => {
  const { tasinmazNo, ad, bitisTarihi, mailTarihi } = req.body;
  if (!tasinmazNo || !ad) {
    res.status(400).json({ error: "tasinmazNo ve ad zorunludur" });
    return;
  }
  const { durum, kalanGun } = calcDurum(bitisTarihi ?? null);
  const now = new Date().toLocaleString("tr-TR");
  const [created] = await db.insert(yetkilerTable).values({
    tasinmazNo,
    ad,
    bitisTarihi: bitisTarihi ?? null,
    mailTarihi: mailTarihi ?? now,
    durum,
    kalanGun,
  }).returning();
  await addActivityLog("YENİ EKLEME", "Manuel olarak eklendi.", tasinmazNo, ad);
  res.status(201).json(serializeYetki(created));
});

// GET /yetkiler/takvim
router.get("/takvim", async (_req, res) => {
  const rows = await db.select().from(yetkilerTable);
  const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  const gruplar: Record<string, { ay: string; yil: number; ayNo: number; yetkiler: any[] }> = {};
  const belirsiz: any[] = [];

  for (const r of rows) {
    const s = serializeYetki(r);
    if (!r.bitisTarihi) {
      belirsiz.push(s);
      continue;
    }
    const [gun, ay, yil] = r.bitisTarihi.split(".");
    if (!ay || !yil) { belirsiz.push(s); continue; }
    const key = `${yil}-${ay.padStart(2, "0")}`;
    if (!gruplar[key]) {
      gruplar[key] = { ay: AYLAR[parseInt(ay) - 1] ?? ay, yil: parseInt(yil), ayNo: parseInt(ay), yetkiler: [] };
    }
    gruplar[key].yetkiler.push(s);
  }

  const sorted = Object.entries(gruplar)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  if (belirsiz.length > 0) {
    sorted.push({ ay: "Belirsiz / İptal", yil: 0, ayNo: 0, yetkiler: belirsiz });
  }

  res.json(sorted);
});

// GET /yetkiler/stats
router.get("/stats", async (_req, res) => {
  const rows = await db.select().from(yetkilerTable);
  let aktif = 0, surebitti = 0, iptal = 0, yaklasanlar = 0;
  for (const r of rows) {
    const { durum } = calcDurum(r.bitisTarihi);
    if (durum === "AKTİF") aktif++;
    else if (durum === "SÜRE BİTTİ") surebitti++;
    else if (durum === "İPTAL") iptal++;
    if (durum.includes("GÜN KALDI")) yaklasanlar++;
  }
  res.json(GetYetkiStatsResponse.parse({ total: rows.length, aktif, surebitti, iptal, yaklasanlar }));
});

// GET /yetkiler/export — CSV
router.get("/export", async (_req, res) => {
  const rows = await db.select().from(yetkilerTable);
  const headers = ["ID", "Taşınmaz No", "Ad Soyad", "Bitiş Tarihi", "Mail Tarihi", "Durum", "Kalan Gün", "Oluşturma", "Güncelleme"];
  const lines = [
    headers.join(";"),
    ...rows.map((r) => {
      const { durum, kalanGun } = calcDurum(r.bitisTarihi);
      return [
        r.id,
        r.tasinmazNo,
        r.ad,
        r.bitisTarihi ?? "",
        r.mailTarihi,
        durum,
        kalanGun ?? "",
        r.createdAt.toISOString(),
        r.updatedAt.toISOString(),
      ].join(";");
    }),
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="yetkiler_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send("\uFEFF" + lines.join("\n"));
});

// POST /yetkiler/bulk-delete
router.post("/bulk-delete", async (req, res) => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids dizisi zorunludur" });
    return;
  }
  const deleted = await db.select({ id: yetkilerTable.id, tasinmazNo: yetkilerTable.tasinmazNo, ad: yetkilerTable.ad })
    .from(yetkilerTable).where(inArray(yetkilerTable.id, ids));
  await db.delete(yetkilerTable).where(inArray(yetkilerTable.id, ids));
  for (const d of deleted) {
    await addActivityLog("SİLME", "Toplu silme ile kaldırıldı.", d.tasinmazNo, d.ad);
  }
  res.json(BulkDeleteYetkilerResponse.parse({ success: true, message: `${deleted.length} kayıt silindi` }));
});

// PATCH /yetkiler/:id/etiket
router.patch("/:id/etiket", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { etiket } = req.body ?? {};
    const [updated] = await db.update(yetkilerTable).set({
      etiket: typeof etiket === "string" ? etiket : "",
      updatedAt: new Date(),
    }).where(eq(yetkilerTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Kayıt bulunamadı" }); return; }
    res.json(serializeYetki(updated));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /yetkiler/:id — with logs
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const rows = await db.select().from(yetkilerTable).where(eq(yetkilerTable.id, id)).limit(1);
  if (!rows.length) { res.status(404).json({ error: "Kayıt bulunamadı" }); return; }
  const r = serializeYetki(rows[0]);
  const logs = await db.select().from(activityLogsTable)
    .where(eq(activityLogsTable.tasinmazNo, r.tasinmazNo));
  const serializedLogs = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
  }));
  res.json(GetYetkiResponse.parse({ ...r, logs: serializedLogs }));
});

// PUT /yetkiler/:id
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { tasinmazNo, ad, bitisTarihi, mailTarihi } = req.body;
  const { durum, kalanGun } = calcDurum(bitisTarihi ?? null);
  const [updated] = await db.update(yetkilerTable).set({
    tasinmazNo, ad, bitisTarihi: bitisTarihi ?? null, mailTarihi, durum, kalanGun,
    alert30Sent: false, alert14Sent: false, alert7Sent: false,
    updatedAt: new Date(),
  }).where(eq(yetkilerTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Kayıt bulunamadı" }); return; }
  await addActivityLog("GÜNCELLEME", "Manuel olarak güncellendi.", tasinmazNo, ad);
  res.json(UpdateYetkiResponse.parse(serializeYetki(updated)));
});

// DELETE /yetkiler/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const rows = await db.select().from(yetkilerTable).where(eq(yetkilerTable.id, id)).limit(1);
  if (rows.length) {
    await addActivityLog("SİLME", "Tek kayıt silindi.", rows[0].tasinmazNo, rows[0].ad);
  }
  await db.delete(yetkilerTable).where(eq(yetkilerTable.id, id));
  res.json(DeleteYetkiResponse.parse({ success: true, message: "Silindi" }));
});

export default router;
