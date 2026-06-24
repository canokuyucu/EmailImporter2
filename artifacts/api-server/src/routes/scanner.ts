import { Router, type IRouter } from "express";
import {
  runEmailScan,
  sendReminderMessage,
  getScannerStatus,
} from "../lib/scanner.js";
import {
  RunScannerResponse,
  GetScannerStatusResponse,
  SendReminderResponse,
} from "@workspace/api-zod";
import { logBildirim } from "../lib/bildirim-logger.js";
import { broadcastSSE } from "./sse.js";

const router: IRouter = Router();

router.post("/run", async (_req, res) => {
  const result = await runEmailScan(false);
  broadcastSSE("yetkiler_updated", { source: "manual-scan" });
  res.json(RunScannerResponse.parse(result));
});

router.get("/status", (_req, res) => {
  const status = getScannerStatus();
  res.json(GetScannerStatusResponse.parse(status));
});

router.post("/send-reminder", async (_req, res) => {
  await sendReminderMessage();
  logBildirim("HATIRLATMA", "Manuel hatırlatma bildirimi gönderildi").catch(() => {});
  res.json(
    SendReminderResponse.parse({
      success: true,
      message: "Hatırlatma Telegram'a gönderildi",
    })
  );
});

export default router;
