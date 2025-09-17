# FileVault API Documentation

## Overview

FileVault is a secure file storage system with deduplication capabilities. It provides JWT-based authentication and efficient file management through SHA-256 content hashing.

## Authentication

All file operations require JWT authentication via the `Authorization: Bearer <token>` header.

### POST /api/v1/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "id": "uuid-string"
}
```

### POST /api/v1/auth/login
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## File Operations

### POST /api/v1/files/upload
Upload files with automatic deduplication.

**Features:**
- **Streaming SHA-256**: Calculates hash during upload to prevent memory issues
- **MIME Validation**: Detects and validates content types with charset flexibility
- **Deduplication**: Files with identical SHA-256 hashes share storage
- **Multi-file Support**: Upload multiple files in single request

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `files` (supports multiple files)
- Authentication: Required

**Response:**
```json
[
  {
    "filename": "document.pdf",
    "file_object_id": "uuid-string",
    "user_file_id": "uuid-string",
    "hash": "sha256-hash-string",
    "size_bytes": 2048,
    "mime_type": "application/pdf"
  }
]
```

**Deduplication Behavior:**
- First upload: Creates new `file_object` with `ref_count = 1`
- Duplicate upload: Increments `ref_count`, creates new `user_file` entry
- Storage: Files stored as `/data/files/<hash[:2]>/<hash>`

### GET /api/v1/files
List user's files with deduplication statistics.

**Response:**
```json
[
  {
    "user_file_id": "uuid-string",
    "file_object_id": "uuid-string",
    "filename": "document.pdf",
    "size_bytes": 2048,
    "mime_type": "application/pdf",
    "ref_count": 2,
    "storage_path": "/data/files/ab/abc123...",
    "uploaded_at": "2025-09-18T02:11:34.534146+05:30",
    "storage_saved_bytes": 2048
  }
]
```

**Fields:**
- `ref_count`: Number of users sharing this file
- `storage_saved_bytes`: Bytes saved through deduplication (`size_bytes * (ref_count - 1)`)
- `storage_path`: Physical file location

### DELETE /api/v1/files/{user_file_id}
Delete a user's file with safe reference counting.

**Behavior:**
- If `ref_count > 1`: Decrements counter, keeps file object
- If `ref_count = 1`: Deletes file object and physical file
- Always removes user's file entry

**Response:**
- Status: `204 No Content` on success
- Status: `404 Not Found` if file doesn't exist
- Status: `403 Forbidden` if user doesn't own file

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK`: Successful operation
- `201 Created`: Resource created
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **User Isolation**: Users can only access their own files
- **MIME Validation**: Content type verification prevents malicious uploads
- **Path Sanitization**: Secure file path handling
- **CORS Support**: Configurable cross-origin resource sharing

## Storage Architecture

```
/data/files/
├── ab/
│   └── abc123def456... (SHA-256 hash)
├── cd/
│   └── cdef789abc123...
└── tmp/
    └── upload-* (temporary files during processing)
```

Files are organized by the first two characters of their SHA-256 hash for efficient storage and retrieval.