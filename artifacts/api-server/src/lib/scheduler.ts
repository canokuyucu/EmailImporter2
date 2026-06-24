import schedule from "node-schedule";

type Callback = () => void | Promise<void>;

let reminderJob: schedule.Job | null = null;
let _callback: Callback | null = null;
let _hour = 9;
let _minute = 0;

export function initReminder(hour: number, minute: number, fn: Callback): void {
  _callback = fn;
  _hour = hour;
  _minute = minute;
  _reschedule();
}

export function rescheduleReminder(hour: number, minute: number): void {
  _hour = hour;
  _minute = minute;
  _reschedule();
}

function _reschedule(): void {
  if (reminderJob) { reminderJob.cancel(); reminderJob = null; }
  if (!_callback) return;
  reminderJob = schedule.scheduleJob(`${_minute} ${_hour} * * *`, async () => {
    try { await _callback!(); } catch (e: any) { console.error("Reminder job error:", e.message); }
  });
  const h = String(_hour).padStart(2, "0");
  const m = String(_minute).padStart(2, "0");
  console.log(`Sabah bülteni planlandı: ${h}:${m}`);
}

export function getReminderTime(): { hour: number; minute: number } {
  return { hour: _hour, minute: _minute };
}
