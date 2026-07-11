# Salihov Vacancy MVP

Minimal vacancy website MVP with Next.js, PostgreSQL, Prisma, and Telegram notifications.

## Documentation

- [Project explanation for beginners](docs/project-explained.md)
- [Server deployment guide](docs/deployment.md)

## Setup

Use Node.js 24 or run the project through Docker.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create local environment variables:

   ```bash
   cp .env.example .env
   ```

3. Update `DATABASE_URL` and Telegram variables in `.env`.

4. Generate Prisma client and create the database schema:

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. Seed test vacancies:

   ```bash
   pnpm prisma:seed
   ```

6. Start development server:

   ```bash
   pnpm dev
   ```

The first admin user is created by the database migration:

- username: `admin`
- password: `admin`

Change this password after the first login.

## Production

Production deployment files are included:

- `Dockerfile`
- `docker-compose.prod.yml`
- `.env.production.example`
- `deploy/nginx/salihov-vacancy.conf`

Use the full guide in [docs/deployment.md](docs/deployment.md).
