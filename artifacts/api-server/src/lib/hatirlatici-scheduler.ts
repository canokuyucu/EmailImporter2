import schedule from "node-schedule";
import { db, hatirlaticilarTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendTelegramMessage } from "./scanner.js";

let initialized = false;

function parseTR(tarih: string): Date | null {
  const m = tarih.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(tarih);
  return isNaN(d.getTime()) ? null : d;
}

export async function checkHatirlaticilar(): Promise<void> {
  try {
    const rows = await db.select().from(hatirlaticilarTable)
      .where(eq(hatirlaticilarTable.gonderildi, false));

    const now = new Date();

    for (const row of rows) {
      const tarih = parseTR(row.tarih);
      if (!tarih) continue;

      tarih.setHours(23, 59, 59);

      if (tarih <= now) {
        await sendTelegramMessage(
          `🔔 <b>HATIRLATICI</b>\n\n👤 ${row.ad}\n🏢 No: ${row.tasinmazNo}\n📝 ${row.mesaj}\n📅 Tarih: ${row.tarih}`
        );
        await db.update(hatirlaticilarTable)
          .set({ gonderildi: true })
          .where(eq(hatirlaticilarTable.id, row.id));
        console.log(`Hatırlatıcı gönderildi: ${row.ad} — ${row.tarih}`);
      }
    }
  } catch (e: any) {
    console.error("Hatırlatıcı check error:", e.message);
  }
}

export function initHatirlaticiScheduler(): void {
  if (initialized) return;
  initialized = true;

  schedule.scheduleJob("0 * * * *", async () => {
    await checkHatirlaticilar();
  });

  setTimeout(() => checkHatirlaticilar().catch(() => {}), 15000);

  console.log("Hatırlatıcı scheduler başlatıldı (saatlik kontrol).");
}
