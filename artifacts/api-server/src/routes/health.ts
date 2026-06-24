import { Router, type IRouter } from "express";
import { HealthCheckResponse, TestConnectionsResponse } from "@workspace/api-zod";
import { testConnections } from "../lib/scanner.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/connections", async (_req, res) => {
  const result = await testConnections();
  res.json(TestConnectionsResponse.parse(result));
});

export default router;
