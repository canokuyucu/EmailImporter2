import { Router, type Response } from "express";

const router = Router();
const clients = new Set<Response>();

export function broadcastSSE(event: string, data: object = {}): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  clients.add(res);
  res.write(`: connected (${clients.size} clients)\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch { clients.delete(res); }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

export default router;
