import { Router } from "express";
import { getAllSettings, setSetting } from "../lib/settings.js";
import { rescheduleReminder } from "../lib/scheduler.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const settings = await getAllSettings();
    res.json(settings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/", async (req, res) => {
  try {
    const body = req.body ?? {};

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" || typeof value === "number") {
        await setSetting(key, String(value));
      }
    }

    const settings = await getAllSettings();

    if ("reminder_hour" in body || "reminder_minute" in body) {
      const h = parseInt(settings.reminder_hour ?? "9");
      const m = parseInt(settings.reminder_minute ?? "0");
      rescheduleReminder(h, m);
    }

    res.json({ ok: true, ...settings });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
