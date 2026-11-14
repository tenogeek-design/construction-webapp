"use strict";
import { createClient } from "@supabase/supabase-js";

// OWNER-only one-click Telegram webhook registration. Never exposes bot credentials.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const auth = req.headers.authorization || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return res.status(401).json({ error: "Sign in as OWNER first" });
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!url || !service || !token || !secret) return res.status(503).json({ error: "Missing server configuration" });
  try {
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData?.user) return res.status(401).json({ error: "Invalid session" });
    const client = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: "Bearer " + jwt } }
    });
    const { data: owner, error: roleError } = await client.rpc("is_owner");
    if (roleError || owner !== true) return res.status(403).json({ error: "OWNER permission required" });
    const target = "https://construction-webapp-eight.vercel.app/api/telegram-webhook";
    const result = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: false })
    });
    const data = await result.json();
    if (!result.ok || !data.ok) return res.status(502).json({ error: "Telegram rejected webhook registration", description: String(data.description || "").slice(0,200) });
    return res.status(200).json({ ok: true, webhook: target });
  } catch (error) {
    console.error("Webhook setup failed", error.message);
    return res.status(500).json({ error: "Webhook setup failed" });
  }
}
