# No Smoking Area — Cloudflare Workers edition

This folder is a JavaScript/TypeScript-runtime port of the Python/Aiogram bot for Cloudflare Workers.
It uses Telegram webhooks, Cloudflare D1, and a Cron Trigger at 04:00 UTC (= 10:00 Asia/Omsk).

## Important
- This is a separate deployment target; do not deploy the existing Python project directly as a Worker.
- Keep Railway online until the Cloudflare deployment is fully tested.
- Do not commit bot tokens or webhook secrets.
- Cloudflare free-plan quotas apply. This is not a contractual 24/7 guarantee.
- Test D1 schema and webhook in a separate bot/test environment before switching the production bot token.

## 1. Create D1
In Cloudflare dashboard: Workers & Pages → D1 SQL Database → Create database.
Name it `nosmokingarea-db`.
Open the database's Console and run all SQL from `schema.sql`.

Copy its Database ID into `wrangler.toml`, replacing `REPLACE_WITH_D1_DATABASE_ID`.

## 2. Install and deploy
Install Node.js LTS on your computer, then in this folder run:

```bash
npm install
npx wrangler login
npx wrangler secret put BOT_TOKEN
npx wrangler secret put ADMIN_ID
npx wrangler secret put WEBHOOK_SECRET
npm run deploy
```

For ADMIN_ID enter your numeric Telegram admin ID. WEBHOOK_SECRET should be a long random string (letters/numbers; no spaces). Do not share these values in chat.

## 3. Set Telegram webhook
After deploy, copy the Worker URL shown by Wrangler, e.g. `https://nosmokingarea.<your-subdomain>.workers.dev`.
Open this URL in a browser only to confirm the Worker responds.
Then set the webhook from your own computer (replace placeholders):

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<WORKER-URL>&secret_token=<WEBHOOK_SECRET>
```

Telegram's `secret_token` must contain only A-Z, a-z, 0-9, underscore, or hyphen. Check webhook status with:

```text
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Do not paste the token or full URL containing it into public places or chat.

## 4. Test before switching
Test with a separate Telegram test bot first:
- /start and both registration paths
- stats, ranking, SOS, reset counter
- admin /broadcast
- admin /reset_users (destructive; confirmation required)
- scheduled delivery (Cron at 04:00 UTC)
- re-registration and existing-user behavior

Only after all tests pass should you set the production bot webhook to this Worker. Remove the old Railway polling process at the same time; Telegram cannot run getUpdates polling and webhook concurrently for the same bot.

## Notes / known limitations
- Existing Railway/PostgreSQL data is not automatically copied. Export/transform it separately if preservation is required.
- The Worker port implements the main user-facing flows from the supplied project. Validate message formatting, admin delivery and quota behavior before production.
- Cron runs at 04:00 UTC, corresponding to 10:00 Asia/Omsk (UTC+6).
- Cloudflare Workers Free quotas can change; verify current plan limits in the Cloudflare dashboard.
