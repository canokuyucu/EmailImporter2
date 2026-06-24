import { pool } from "@workspace/db";

export const INIT: Promise<void> = pool
  .query(`
    CREATE TABLE IF NOT EXISTS bildirim_log (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      mesaj TEXT NOT NULL,
      gonderildi_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `)
  .then(() => {})
  .catch((e: Error) => {
    console.error("bildirim_log init error:", e.message);
  });

export async function logBildirim(type: string, mesaj: string): Promise<void> {
  try {
    await INIT;
    await pool.query(
      "INSERT INTO bildirim_log (type, mesaj) VALUES ($1, $2)",
      [type, mesaj]
    );
  } catch (e: any) {
    console.error("logBildirim error:", e.message);
  }
}
