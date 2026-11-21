# No Smoking Area — Cloudflare Worker

## Файлы
Загрузите все файлы и папку `src` из этого комплекта в корень репозитория GitHub.

## D1
В D1 Database (nosmokingarea-db) выполните SQL из `schema.sql`, если таблицы еще не созданы. Не выполняйте повторно, если уже успешно применяли схему.

## Worker secrets
В Cloudflare Worker → Settings → Variables and Secrets добавьте **Secrets**:
- `BOT_TOKEN` — токен Telegram-бота от BotFather
- `WEBHOOK_SECRET` — случайная строка длиной 32–64 символа (буквы/цифры, без пробелов)

Добавьте переменную (обычная Variable):
- `ADMIN_ID` — ваш Telegram user ID

Binding D1 должен называться `DB` и указывать на `nosmokingarea-db`.

## Webhook после публикации
После Deploy скопируйте публичный URL Worker. Откройте в браузере Telegram API URL `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>&secret_token=<WEBHOOK_SECRET>` (подставив свой токен, URL и секрет). Успешный ответ должен содержать `"ok":true`.

Важно: URL с токеном не пересылайте никому и не публикуйте. Если он попал в открытый доступ, перевыпустите токен через BotFather.

## Расписание
Cron `0 7 * * *` — ежедневно в 07:00 UTC, то есть в 10:00 по Омску (UTC+3). Cloudflare Cron может запускать с небольшим отклонением.
