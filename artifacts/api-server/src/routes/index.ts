import { Router, type IRouter } from "express";
import healthRouter from "./health";
import yetkilerRouter from "./yetkiler";
import scannerRouter from "./scanner";
import activityLogsRouter from "./activity_logs";
import notlarRouter from "./notlar";
import notlarDeleteRouter from "./notlar_delete";
import bildirimlerRouter from "./bildirimler";
import telegramRouter from "./telegram";
import settingsRouter from "./settings";
import authRouter from "./auth";
import sheetsRouter from "./sheets";
import sseRouter from "./sse";
import hatirlaticilarRouter from "./hatirlaticilar";
import importCsvRouter from "./import-csv";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/yetkiler", yetkilerRouter);
router.use("/yetkiler", notlarRouter);
router.use("/notlar", notlarDeleteRouter);
router.use("/scanner", scannerRouter);
router.use("/activity-logs", activityLogsRouter);
router.use("/bildirimler", bildirimlerRouter);
router.use("/telegram", telegramRouter);
router.use("/settings", settingsRouter);
router.use("/auth", authRouter);
router.use("/sheets", sheetsRouter);
router.use("/sse", sseRouter);
router.use("/hatirlaticilar", hatirlaticilarRouter);
router.use("/import", importCsvRouter);
router.use("/backup", backupRouter);

export default router;
