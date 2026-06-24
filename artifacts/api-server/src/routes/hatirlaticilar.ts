import { Router } from "express";
import { db, hatirlaticilarTable, yetkilerTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { yetkiId } = req.query as Record<string, string>;
    const rows = yetkiId
      ? await db.select().from(hatirlaticilarTable).where(eq(hatirlaticilarTable.yetkiId, parseInt(yetkiId)))
      : await db.select().from(hatirlaticilarTable);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { yetkiId, tasinmazNo, ad, tarih, mesaj } = req.body ?? {};
    if (!yetkiId || !tarih || !mesaj) {
      res.status(400).json({ error: "yetkiId, tarih ve mesaj zorunludur" });
      return;
    }
    const [created] = await db.insert(hatirlaticilarTable).values({
      yetkiId: parseInt(yetkiId),
      tasinmazNo: tasinmazNo ?? "",
      ad: ad ?? "",
      tarih,
      mesaj,
    }).returning();
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(hatirlaticilarTable).where(eq(hatirlaticilarTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
