# file_vault_proj — Capstone Task (Day 1)

This repository contains the Day 1 skeleton for the file_vault_proj file vault.

## What is done (Day 1)
- Project skeleton for backend and frontend
- Minimal Go HTTP server with `/health` endpoint
- Vite React TypeScript frontend with placeholder App
- Docker Compose skeleton for Postgres + backend + frontend
- Initial design doc with DB entities and architecture

## Quick start
1. Copy `backend/.env.example` -> `backend/.env`
2. From `infra/` run: `docker compose up -d`
3. Start backend: `cd backend && go run ./cmd/server`
4. Start frontend: `cd frontend && npm run dev`
## L
ocal Docker Development

1. Copy backend env example:
```bash
cp backend/.env.example backend/.env.dev
# Edit backend/.env.dev if you need to change DB password or port.
```

2. Start services:
```bash
./infra/up.sh
```

3. Verify:
- Backend health: `curl http://localhost:8080/health` -> OK
- Frontend: open http://localhost:3000
- Adminer: http://localhost:8081 (login: user=filevault_user, pass=filevault_pass, db=filevault_db, port=5433)

4. Stop services:
```bash
./infra/down.sh
```