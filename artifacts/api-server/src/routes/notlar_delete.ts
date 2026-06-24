import { Router, type IRouter } from "express";
import { db, yetkiNotlariTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DeleteYetkiNotResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// DELETE /notlar/:notId
router.delete("/:notId", async (req, res) => {
  const notId = parseInt(req.params.notId);
  await db.delete(yetkiNotlariTable).where(eq(yetkiNotlariTable.id, notId));
  res.json(DeleteYetkiNotResponse.parse({ success: true, message: "Not silindi" }));
});

export default router;
