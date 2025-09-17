#!/usr/bin/env bash
set -e

BASE="http://localhost:8080"

echo "Registering user..."
USER_ID=$(curl -s -X POST "$BASE/api/v1/auth/register" -H "Content-Type: application/json" -d '{"email":"smoketest@example.com","password":"SmokePass123!"}' | jq -r .id)

if [ "$USER_ID" == "null" ] || [ -z "$USER_ID" ]; then
  echo "User may already exist; attempting login..."
fi

TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"smoketest@example.com","password":"SmokePass123!"}' | jq -r .token)
echo "Token obtained: ${TOKEN:0:20}..."

echo "Uploading a small test file..."
# create small file
TMPF=$(mktemp)
echo "hello smoke" > $TMPF

RESP=$(curl -s -X POST "$BASE/api/v1/files/upload" -H "Authorization: Bearer $TOKEN" -F "files=@$TMPF")
echo "Upload response: $RESP"

USER_FILE_ID=$(echo "$RESP" | jq -r '.[0].user_file_id')
echo "Uploaded user_file_id = $USER_FILE_ID"

echo "Listing files..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/files" | jq

echo "Deleting file..."
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/files/$USER_FILE_ID" -v || true

echo "Done."