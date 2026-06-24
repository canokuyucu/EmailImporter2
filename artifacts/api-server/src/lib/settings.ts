import { pool } from "@workspace/db";

const DEFAULTS: Record<string, string> = {
  reminder_hour: "9",
  reminder_minute: "0",
  // Bildirim kontrolleri (1=açık, 0=kapalı)
  notif_yeni: "1",           // Yeni yetki eklenince bildir
  notif_guncelleme: "1",     // Yetki güncellenince bildir
  notif_surebitis: "1",      // Yaklaşan bitiş uyarıları (30/14/7 gün)
  notif_alert30: "1",        // 30 gün uyarısı
  notif_alert14: "1",        // 14 gün uyarısı
  notif_alert7: "1",         // 7 gün uyarısı
};

export const SETTINGS_INIT: Promise<void> = pool
  .query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  .then(async () => {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      await pool.query(
        `INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [key, value]
      );
    }
  })
  .catch((e: Error) => console.error("Settings init error:", e.message));

export async function getSetting(key: string): Promise<string> {
  await SETTINGS_INIT;
  const { rows } = await pool.query(
    "SELECT value FROM system_settings WHERE key = $1",
    [key]
  );
  return rows[0]?.value ?? DEFAULTS[key] ?? "";
}

export async function setSetting(key: string, value: string): Promise<void> {
  await SETTINGS_INIT;
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  await SETTINGS_INIT;
  const { rows } = await pool.query("SELECT key, value FROM system_settings");
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}
