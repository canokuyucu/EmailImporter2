import app from "./app";
import schedule from "node-schedule";
import {
  runEmailScan,
  setNextScanTime,
  sendReminderMessage,
  checkExpiryAlerts,
} from "./lib/scanner.js";
import { startTelegramBot, sendWeeklyReport, checkDayZeroAlerts } from "./lib/telegram-bot.js";
import { getAllSettings } from "./lib/settings.js";
import { initReminder } from "./lib/scheduler.js";
import { logBildirim } from "./lib/bildirim-logger.js";
import { initHatirlaticiScheduler } from "./lib/hatirlatici-scheduler.js";
import { initBackupScheduler } from "./routes/backup.js";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);

  // DB migrations
  try {
    await pool.query(`ALTER TABLE yetkiler ADD COLUMN IF NOT EXISTS etiket TEXT NOT NULL DEFAULT ''`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hatirlaticilar (
        id SERIAL PRIMARY KEY,
        yetki_id INTEGER NOT NULL,
        tasinmaz_no TEXT NOT NULL DEFAULT '',
        ad TEXT NOT NULL DEFAULT '',
        tarih TEXT NOT NULL,
        mesaj TEXT NOT NULL,
        gonderildi BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ DB migrations tamamlandı");
  } catch (e: any) {
    console.error("DB migration error:", e.message);
  }

  // Load settings from DB
  const settings = await getAllSettings();
  const reminderHour = parseInt(settings.reminder_hour ?? "9");
  const reminderMinute = parseInt(settings.reminder_minute ?? "0");

  console.log("Running initial email scan...");
  runEmailScan(true).then((result) => {
    console.log("Initial scan complete:", result.message);
  });

  // Every 10 minutes — scan new emails + check expiry alerts
  const tenMin = schedule.scheduleJob("*/10 * * * *", async () => {
    const next = new Date(Date.now() + 10 * 60 * 1000);
    setNextScanTime(next);
    console.log("Running scheduled scan...");
    await runEmailScan(false);
    await checkExpiryAlerts();
  });

  const nextRun = tenMin.nextInvocation();
  if (nextRun) setNextScanTime(new Date(nextRun.toISOString()));

  // Dynamic daily reminder — reads hour/minute from settings, can be rescheduled via API
  initReminder(reminderHour, reminderMinute, async () => {
    console.log("Sending daily reminder...");
    await sendReminderMessage();
    await logBildirim("SABAH", "Sabah bülteni gönderildi");
    checkDayZeroAlerts();
  });

  // Every Monday 08:00 — weekly summary report
  schedule.scheduleJob("0 8 * * 1", async () => {
    console.log("Sending weekly report...");
    await sendWeeklyReport();
    await logBildirim("HAFTALIK", "Haftalık özet rapor gönderildi");
  });

  console.log(`Scheduler started — scan every 10 min, expiry alerts, daily reminder at ${String(reminderHour).padStart(2,"0")}:${String(reminderMinute).padStart(2,"0")}`);

  // Start Telegram bot polling for incoming commands
  startTelegramBot();

  // Start additional schedulers
  initHatirlaticiScheduler();
  initBackupScheduler();
});
