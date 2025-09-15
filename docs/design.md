# file_vault_proj — Design Overview (Day 1)

## Goals
- Secure file vault with deduplication, upload, search, sharing, quotas, admin.

## High-level architecture
- Frontend: React + TypeScript (Vite), communicates with backend via GraphQL (preferred) / REST.
- Backend: Go (Golang) exposing GraphQL SDL (gqlgen) or REST handlers; PostgreSQL for persistence; file blobs on disk (or S3 if extended).
- Container orchestration: Docker Compose for local dev.
- Auth: JWT for session-less auth (refresh tokens optional).
- Rate limiting: token-bucket per-user (middleware).
- Storage: dedup by SHA-256, `file_objects` store actual content, `user_files` reference mapping.

## DB entities (initial plan)
- users (id, email, password_hash, role, created_at)
- file_objects (id, hash, storage_path, size, mime_type, ref_count, created_at)
- user_files (id, user_id, file_object_id, filename, uploaded_at, visibility, tags)
- shares (id, user_file_id, public_link, expires_at, download_count)
- downloads (id, user_file_id, user_id, ip, created_at)

## Next steps (Day 2+)
- Implement migrations with goose / golang-migrate
- Implement auth and storage hashing