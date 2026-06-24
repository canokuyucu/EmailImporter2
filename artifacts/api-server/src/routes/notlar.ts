import { Router, type IRouter } from "express";
import { db, yetkiNotlariTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListYetkiNotlariResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeNot(n: any) {
  return {
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  };
}

// GET /yetkiler/:id/notlar
router.get("/:id/notlar", async (req, res) => {
  const yetkiId = parseInt(req.params.id);
  const notlar = await db
    .select()
    .from(yetkiNotlariTable)
    .where(eq(yetkiNotlariTable.yetkiId, yetkiId))
    .orderBy(yetkiNotlariTable.createdAt);

  res.json(ListYetkiNotlariResponse.parse(notlar.map(serializeNot)));
});

// POST /yetkiler/:id/notlar
router.post("/:id/notlar", async (req, res) => {
  const yetkiId = parseInt(req.params.id);
  const { not } = req.body;

  if (!not || typeof not !== "string") {
    res.status(400).json({ error: "not alanı zorunludur" });
    return;
  }

  const [created] = await db
    .insert(yetkiNotlariTable)
    .values({ yetkiId, not })
    .returning();

  res.status(201).json(serializeNot(created));
});

export default router;
