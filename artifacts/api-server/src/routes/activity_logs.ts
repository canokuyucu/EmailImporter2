import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { ListActivityLogsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const limit = parseInt((req.query.limit as string) ?? "200") || 200;
  const rows = await db
    .select()
    .from(activityLogsTable)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  }));

  res.json(ListActivityLogsResponse.parse(serialized));
});

export default router;
