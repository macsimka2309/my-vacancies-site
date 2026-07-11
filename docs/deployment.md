# Деплой на сервер

Этот документ описывает простой production-деплой на VPS через Docker Compose.

## Что будет на сервере

На сервере будут запущены:

1. PostgreSQL - база данных.
2. Next.js-приложение - сайт, backend endpoint-ы и будущая админка.
3. Nginx - внешний web-сервер, который принимает запросы с домена и передает их в приложение.

Схема:

```text
Пользователь -> Nginx -> Next.js app -> PostgreSQL
                                |
                                -> Telegram Bot API
```

## Что нужно установить на сервер

Минимально нужны:

- Docker;
- Docker Compose plugin;
- Nginx;
- Certbot, если нужен HTTPS через Let's Encrypt;
- git, если код будет скачиваться из репозитория.

Проверка:

```bash
docker --version
docker compose version
nginx -v
git --version
```

## Подготовка проекта

На сервере перейди в папку, где будут проекты:

```bash
mkdir -p /opt/apps
cd /opt/apps
```

Склонируй репозиторий:

```bash
git clone <your-repository-url> salihov-vacancy
cd salihov-vacancy
```

Если репозиторий еще не создан, можно сначала загрузить проект любым удобным способом, а git подключить позже.

## Production env

Создай production-файл переменных:

```bash
cp .env.production.example .env.production
```

Открой файл:

```bash
nano .env.production
```

Замени значения:

```env
POSTGRES_DB="salihov_vacancy"
POSTGRES_USER="salihov_vacancy"
POSTGRES_PASSWORD="replace-with-a-long-random-password"

DATABASE_URL="postgresql://salihov_vacancy:replace-with-a-long-random-password@postgres:5432/salihov_vacancy?schema=public"

TELEGRAM_BOT_TOKEN="replace-with-telegram-bot-token"
TELEGRAM_CHAT_ID="replace-with-telegram-chat-id"

ADMIN_SESSION_SECRET="replace-with-a-long-random-session-secret"
```

Важно: пароль в `POSTGRES_PASSWORD` и пароль внутри `DATABASE_URL` должны совпадать.

Пример:

```env
POSTGRES_PASSWORD="my-secret-db-password"
DATABASE_URL="postgresql://salihov_vacancy:my-secret-db-password@postgres:5432/salihov_vacancy?schema=public"
```

Файл `.env.production` нельзя коммитить в git.

## Админка

После применения миграций создается первый пользователь админки:

```text
Логин: admin
Пароль: admin
Роль: Администратор
```

Администратор может создавать сотрудников, указывать необязательное ФИО,
назначать им несколько ролей и редактировать доступ в интерфейсе `/admin`.
Роль `Менеджер` дает доступ к откликам. Роль `Администратор вакансий` дает
доступ к откликам и разделу создания, редактирования и публикации вакансий.
Роль `Администратор` дает полный доступ, включая сотрудников и журнал.
Каждое изменение статуса или примечания записывается в журнал.

После первого входа обязательно смени пароль пользователя `admin`.
Сессии админки подписываются переменной `ADMIN_SESSION_SECRET`, поэтому в production
она должна быть заполнена длинной случайной строкой.

## Telegram

Для отправки уведомлений нужен Telegram bot token и chat id.

Общий порядок:

1. Создать бота через BotFather.
2. Получить `TELEGRAM_BOT_TOKEN`.
3. Добавить бота в нужный чат или канал.
4. Получить `TELEGRAM_CHAT_ID`.
5. Записать оба значения в `.env.production`.

Код отправки Telegram будет добавлен на этапе реализации endpoint-а отклика.

## Сборка Docker-образов

Собери production-образы:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
```

Что происходит:

- Docker читает `Dockerfile`;
- устанавливает зависимости;
- генерирует Prisma Client;
- собирает Next.js;
- готовит отдельный runtime-образ приложения.

## Запуск PostgreSQL

Сначала подними базу:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
```

Проверь статус:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

У `postgres` должен быть статус healthy.

## Применение миграций

Миграции создают таблицы в PostgreSQL.

Запусти:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile tools run --rm migrate
```

Эта команда применит SQL из:

```text
prisma/migrations/
```

В production используется `prisma migrate deploy`, а не `prisma migrate dev`.

## Запуск приложения

После миграций запусти app:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d app
```

Проверь контейнеры:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Проверь health endpoint на сервере:

```bash
curl http://127.0.0.1:3000/api/health
```

Ожидаемый ответ:

```json
{
  "ok": true,
  "service": "salihov-vacancy",
  "timestamp": "..."
}
```

## Загрузка тестовых вакансий

Если на сервере или staging-окружении нужно загрузить 3 тестовые вакансии, выполни:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile tools run --rm migrate pnpm prisma:seed
```

Для боевого сайта тестовые вакансии стоит заменить реальными данными до запуска рекламы.

## Nginx

Скопируй пример конфига:

```bash
sudo cp deploy/nginx/salihov-vacancy.conf /etc/nginx/sites-available/salihov-vacancy
```

Открой:

```bash
sudo nano /etc/nginx/sites-available/salihov-vacancy
```

Замени:

```nginx
server_name example.com www.example.com;
```

на свой домен:

```nginx
server_name your-domain.com www.your-domain.com;
```

Включи сайт:

```bash
sudo ln -s /etc/nginx/sites-available/salihov-vacancy /etc/nginx/sites-enabled/salihov-vacancy
```

Проверь конфиг:

```bash
sudo nginx -t
```

Перезагрузи Nginx:

```bash
sudo systemctl reload nginx
```

После этого сайт должен открываться по домену через HTTP.

## HTTPS

Если домен уже направлен на сервер, можно выпустить сертификат:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot сам обновит Nginx-конфиг и добавит HTTPS.

## Обновление проекта на сервере

Когда в репозитории появились новые изменения:

```bash
cd /opt/apps/salihov-vacancy
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
docker compose -f docker-compose.prod.yml --env-file .env.production --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d app
```

Если менялся только frontend-код без базы, миграции все равно можно запускать: Prisma просто скажет, что новых миграций нет.

## Просмотр логов

Логи приложения:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
```

Логи PostgreSQL:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f postgres
```

## Остановка

Остановить приложение:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production stop app
```

Остановить все сервисы:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

Осторожно: команда выше не удаляет данные PostgreSQL, потому что данные лежат в volume `postgres_data`.

Не запускай без понимания:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

Флаг `-v` удалит volume с базой данных.

## Backup базы данных

Минимальный backup:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Если переменные из `.env.production` не подхватываются твоей оболочкой, укажи значения явно:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres pg_dump -U salihov_vacancy salihov_vacancy > backup.sql
```

Backup лучше автоматизировать отдельной cron-задачей, когда MVP начнет принимать реальные отклики.

## Частые проблемы

### `DATABASE_URL is not configured`

Приложение не видит переменную `DATABASE_URL`.

Проверь:

```bash
cat .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production config
```

### `postgres` не healthy

Проверь логи:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs postgres
```

Частая причина - разные пароли в `POSTGRES_PASSWORD` и `DATABASE_URL`.

### Сайт не открывается по домену

Проверь по порядку:

```bash
curl http://127.0.0.1:3000/api/health
sudo nginx -t
sudo systemctl status nginx
```

Если `curl` работает, проблема обычно в Nginx или DNS.

Если `curl` не работает, проблема обычно в Docker-контейнере приложения.

## Почему так

Next.js `output: "standalone"` уменьшает production-сборку и позволяет запускать приложение через минимальный `server.js`.

Prisma в production должна применять уже созданные миграции через `migrate deploy`. Команда `migrate dev` предназначена для разработки.

Полезные официальные ссылки:

- Next.js standalone output: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Prisma migrate deploy: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
