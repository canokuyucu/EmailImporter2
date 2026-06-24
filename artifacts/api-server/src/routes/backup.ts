import { Router } from "express";
import { db, yetkilerTable, hatirlaticilarTable } from "@workspace/db";
import fs from "fs";
import path from "path";
import schedule from "node-schedule";

const router = Router();

const BACKUP_DIR = "/tmp/eids-backups";

export async function createBackupFile(): Promise<string> {
  const rows = await db.select().from(yetkilerTable);
  const hatirlaticilar = await db.select().from(hatirlaticilarTable);
  const backup = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    yetkiler: { count: rows.length, records: rows },
    hatirlaticilar: { count: hatirlaticilar.length, records: hatirlaticilar },
  };

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const filename = `eids-backup-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");

  // Keep only last 7 backups
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".json")).sort();
  if (files.length > 7) {
    files.slice(0, files.length - 7).forEach(f => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
    });
  }

  return filepath;
}

export function initBackupScheduler(): void {
  schedule.scheduleJob("0 2 * * *", async () => {
    try {
      const filepath = await createBackupFile();
      console.log(`✅ Otomatik yedekleme tamamlandı: ${filepath}`);
    } catch (e: any) {
      console.error("Yedekleme hatası:", e.message);
    }
  });
  console.log("Otomatik yedekleme planlandı: Her gece 02:00");
}

router.get("/download", async (_req, res) => {
  try {
    const rows = await db.select().from(yetkilerTable);
    const hatirlaticilar = await db.select().from(hatirlaticilarTable);
    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      yetkiler: { count: rows.length, records: rows },
      hatirlaticilar: { count: hatirlaticilar.length, records: hatirlaticilar },
    };
    const filename = `eids-backup-${new Date().toISOString().split("T")[0]}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/list", (_req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse()
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, createdAt: stat.birthtime.toISOString() };
      });
    res.json(files);
  } catch {
    res.json([]);
  }
});

export default router;
