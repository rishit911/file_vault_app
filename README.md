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