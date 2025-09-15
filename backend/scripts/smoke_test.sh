#!/usr/bin/env bash
set -e

BASE="http://localhost:8080"

echo "Run: Register user..."
USER_ID=$(curl -s -X POST "$BASE/api/v1/auth/register" -H "Content-Type: application/json" -d '{"email":"smoke@example.com","password":"SmokePass123"}' | jq -r .id)
echo "User created: $USER_ID"

echo "Login..."
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"smoke@example.com","password":"SmokePass123"}' | jq -r .token)
echo "Token: $TOKEN"

echo "Register a file..."
curl -s -X POST "$BASE/api/v1/files/register" -H "Content-Type: application/json" -H "X-User-Id: $USER_ID" -d '{"filename":"smoke.txt","hash":"deadbeef","size_bytes":100,"mime_type":"text/plain"}' | jq

echo "Done"