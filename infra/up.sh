#!/usr/bin/env bash
set -e

# copy example to local .env if not exists
if [ ! -f backend/.env.dev ]; then
    echo "Creating backend/.env.dev from .env.example (edit values as needed)..."
    cp backend/.env.example backend/.env.dev
    sed -i "s/filevault_pass/${POSTGRES_PASSWORD:-filevault_pass}/g" backend/.env.dev || true
fi

echo "Starting docker-compose..."
docker compose -f infra/docker-compose.yml up --build -d

echo "Services started. Backend: http://localhost:8080, Frontend: http://localhost:3000, Adminer: http://localhost:8081"