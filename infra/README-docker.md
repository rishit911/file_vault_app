# Docker Compose (local dev) — FileVault

## Prerequisites

- Docker & Docker Compose v2 installed.
- Copy `.env.docker` and set a secure POSTGRES_PASSWORD and JWT_SECRET before running.

## Start services

1. Copy `.env.docker` and edit secrets:

```bash
cp .env.docker .env.docker.local
# edit .env.docker.local and set POSTGRES_PASSWORD and JWT_SECRET
```

2. Start stack:

```bash
docker compose up --build -d
```

3. Check services:

```bash
docker compose ps
docker compose logs -f db backend frontend
```

## Apply DB migrations

The `backend/migrations` folder is mounted into the Postgres init folder; SQL files will run only if the volume is empty (first init).

To manually run migrations:

```bash
# example using psql from the db container
docker compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /docker-entrypoint-initdb.d/000001_create_core_tables.up.sql
```

Or use your project's migration tool from host with DATABASE_URL pointing to the db container.

## Stop & cleanup

```bash
docker compose down -v
```