import { Router } from "express";
import { pool } from "@workspace/db";
import { INIT } from "../lib/bildirim-logger.js";

const router = Router();

router.get("/", async (req, res) => {
  await INIT;
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const { rows } = await pool.query(
      "SELECT * FROM bildirim_log ORDER BY gonderildi_at DESC LIMIT $1",
      [limit]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
