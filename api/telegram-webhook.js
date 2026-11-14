"use strict";

// CONSTRUCTION GROUP Telegram bot — serverless webhook on Vercel.
// No token or webhook secret is stored in source control.
const BASE = "https://construction-webapp-eight.vercel.app";
const buttons = {
  app: { text: "🏗 Відкрити CONSTRUCTION", web_app: { url: BASE + "/" } },
  objects: { text: "🏢 Об'єкти" },
  requests: { text: "📋 Заявки" },
  calculator: { text: "🧮 Калькулятор" },
  help: { text: "ℹ️ Допомога" }
};
const keyboard = { keyboard: [[buttons.app], [buttons.objects, buttons.requests], [buttons.calculator, buttons.help]], resize_keyboard: true, is_persistent: true };
const link = (text, url) => ({ text, url });
const menu = (language = "uk") => ({
  chat_id: undefined,
  text: language === "pl"
    ? "🏗 <b>CONSTRUCTION GROUP</b>\nWybierz dział w menu poniżej. Zgłoszenia i dostęp do obiektów są dostępne po zalogowaniu."
    : "🏗 <b>CONSTRUCTION GROUP</b>\nОбери розділ нижче. Заявки та об'єкти відкриваються через сайт після входу.",
  parse_mode: "HTML",
  reply_markup: keyboard
});
async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Telegram API HTTP " + response.status);
  const result = await response.json();
  if (!result.ok) throw new Error("Telegram API rejected request");
  return result;
}
function interpret(value) {
  const input = String(value || "").trim().toLowerCase();
  if (input === "/start" || input.startsWith("/start ") || input === "/menu" || input === "меню" || input === "menu") return "start";
  if (input === "/objects" || /об'єкти|об’єкти|объекты|obiekty/.test(input)) return "objects";
  if (input === "/requests" || /заявки|zgłoszenia/.test(input)) return "requests";
  if (input === "/calculator" || /калькулятор|kalkulator/.test(input)) return "calculator";
  if (input === "/help" || /допомога|pomoc|помощь/.test(input)) return "help";
  return "start";
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ service: "telegram-bot", configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET) });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return res.status(503).json({ error: "Bot not configured" });
  if (req.headers["x-telegram-bot-api-secret-token"] !== secret) return res.status(403).json({ error: "Forbidden" });
  const update = req.body || {};
  const message = update.message;
  if (!message || message.chat?.type !== "private" || !Number.isSafeInteger(message.chat.id)) return res.status(200).json({ ok: true });
  const id = message.chat.id;
  const command = interpret(message.text);
  const locale = message.from?.language_code === "pl" ? "pl" : "uk";
  let payload;
  if (command === "start") payload = { ...menu(locale), chat_id: id };
  else if (command === "objects") payload = {
    chat_id: id, text: "🏢 <b>Об'єкти</b>\nВідкрий кабінет бригадира, щоб вибрати об'єкт. Доступ до об'єктів перевіряється на сайті.",
    parse_mode: "HTML", reply_markup: { inline_keyboard: [[link("Відкрити об'єкти", BASE + "/foreman.html")]] }
  };
  else if (command === "requests") payload = {
    chat_id: id, text: "📋 <b>Заявки</b>\nСтворити заявку можна на сайті, а переглянути робочі заявки — після авторизації.",
    parse_mode: "HTML", reply_markup: { inline_keyboard: [[link("Створити заявку", BASE + "/")], [link("OWNER · заявки", BASE + "/admin.html#requests")]] }
  };
  else if (command === "calculator") payload = {
    chat_id: id, text: "🧮 <b>Калькулятор вартості</b>\nВідкрий сайт і вибери «Калькулятор».",
    parse_mode: "HTML", reply_markup: { inline_keyboard: [[link("Відкрити сайт", BASE + "/")]] }
  };
  else payload = {
    chat_id: id, text: "ℹ️ <b>CONSTRUCTION GROUP</b>\n/start — головне меню\n/objects — об'єкти\n/requests — заявки\n/calculator — калькулятор\n\nБот не показує приватні дані без входу в особистий кабінет.",
    parse_mode: "HTML", reply_markup: keyboard
  };
  try {
    await telegram("sendMessage", payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram bot request failed:", error.message);
    return res.status(502).json({ error: "Telegram request failed" });
  }
}
