import { Router } from "express";
import crypto from "node:crypto";

const DASHBOARD_PIN = process.env.DASHBOARD_PIN;
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24h

const validTokens = new Map<string, number>(); // token → expiry ms

// Clean expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of validTokens) {
    if (now > exp) validTokens.delete(token);
  }
}, 60 * 60 * 1000);

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ enabled: !!DASHBOARD_PIN });
});

router.post("/login", (req, res) => {
  if (!DASHBOARD_PIN) {
    return res.json({ ok: true, token: "no-auth-required" });
  }
  const { pin } = req.body ?? {};
  if (!pin || String(pin) !== String(DASHBOARD_PIN)) {
    return res.status(401).json({ ok: false, error: "Yanlış PIN. Tekrar deneyin." });
  }
  const token = crypto.randomBytes(32).toString("hex");
  validTokens.set(token, Date.now() + TOKEN_TTL);
  res.json({ ok: true, token });
});

router.get("/check", (req, res) => {
  if (!DASHBOARD_PIN) return res.json({ ok: true });
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (!token || !validTokens.has(token)) return res.status(401).json({ ok: false });
  const expiry = validTokens.get(token)!;
  if (Date.now() > expiry) {
    validTokens.delete(token);
    return res.status(401).json({ ok: false });
  }
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (token) validTokens.delete(token);
  res.json({ ok: true });
});

export default router;
