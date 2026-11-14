# CONSTRUCTION GROUP — Telegram bot

## Architecture
- Production: Vercel serverless webhook at `/api/telegram-webhook` (Node.js, no background polling needed).
- Local optional fallback: `telegram-bot/main.py` (aiogram 3 polling, not to be run together with a registered webhook).
- Telegram Mini App opens the existing company website; protected OWNER/foreman views enforce their own login and permissions.

## Security / go-live checklist
1. Revoke the previously exposed bot token in BotFather and generate a **new** token.
2. In Vercel project `construction-webapp`, add encrypted **Production** environment variables:
   - `TELEGRAM_BOT_TOKEN` — the new token.
   - `TELEGRAM_WEBHOOK_SECRET` — a distinct long random string containing only A-Z, a-z, 0-9, underscore or hyphen (1–256 characters).
3. Redeploy production so the Vercel function reads the new variables.
4. Register webhook with Telegram using the new token (from a secure local environment, **never** committing or posting token):
   `https://api.telegram.org/bot<NEW_TOKEN>/setWebhook` with POST parameters:
   - `url=https://construction-webapp-eight.vercel.app/api/telegram-webhook`
   - `secret_token=<TELEGRAM_WEBHOOK_SECRET>`
   - `allowed_updates=["message"]`
5. Verify with Telegram `getWebhookInfo` and send `/start` in a private chat.
6. Stop the old CMD polling process only when the hosted webhook is verified. Telegram cannot deliver polling and webhook updates at the same time.

IMPORTANT: Until steps 1–4 are completed, this webhook does not activate. It returns 503 if not configured and rejects unauthorized POST requests. Do not store secrets in code, GitHub, chat, screenshots or deployment build logs.

## Available menu
- /start, /menu — Home keyboard
- 🏢 Об'єкти — foreman cabinet entry (site login required)
- 📋 Заявки — public request entry and OWNER request dashboard
- 🧮 Калькулятор — site entry
- ℹ️ Допомога — help

These are safe navigation links, **not** live database-backed Telegram object lists or request processing. Later stages can add authenticated object selection and reporting after the bot/user identity binding is designed.
