# FileVault API Documentation

## Overview

FileVault is a secure file storage system with deduplication capabilities. It provides JWT-based authentication and efficient file management through SHA-256 content hashing.

## Upload Flow Architecture

FileVault uses a hybrid approach for optimal performance and scalability:

1. **File Upload**: Use REST API (`POST /api/v1/files/upload`) for efficient multipart streaming
2. **Metadata Registration**: Use GraphQL (`registerFile` mutation) for database operations
3. **File Management**: Use GraphQL for querying, searching, and managing files

### Recommended Client Flow

```javascript
// 1. Upload file via REST (handles streaming, hashing, deduplication)
const uploadResponse = await fetch('/api/v1/files/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
const uploadResult = await uploadResponse.json();

// 2. Register file metadata via GraphQL (optional - REST already creates DB records)
const registerResponse = await graphqlClient.mutate({
  mutation: REGISTER_FILE,
  variables: {
    input: {
      filename: uploadResult[0].filename,
      hash: uploadResult[0].hash,
      sizeBytes: uploadResult[0].size_bytes,
      mimeType: uploadResult[0].mime_type
    }
  }
});

// 3. Query files via GraphQL
const filesResponse = await graphqlClient.query({
  query: GET_FILES,
  variables: { pagination: { limit: 20, offset: 0 } }
});
```

**Note**: The REST upload endpoint already creates database records, so the GraphQL `registerFile` step is optional for basic uploads. Use GraphQL `registerFile` when you need to register file metadata without uploading the actual file content.

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

## GraphQL API

FileVault provides a comprehensive GraphQL API for advanced file management operations.

**Endpoint**: `POST /graphql`  
**Playground**: `GET /playground` (Interactive GraphQL IDE for testing queries)

### Upload Flow Integration

The recommended approach combines REST for file uploads with GraphQL for metadata operations:

1. **REST Upload**: `POST /api/v1/files/upload` - Handles multipart streaming, hashing, and deduplication
2. **GraphQL Queries**: Use GraphQL for listing, searching, and managing file metadata
3. **GraphQL Mutations**: Use for user management and optional metadata registration

### Authentication

GraphQL operations support JWT authentication via the `Authorization: Bearer <token>` header. Some operations like `register` and `login` are public.

### Core Operations

#### User Management

```graphql
# Register new user
mutation Register {
  register(email: "user@example.com", password: "SecurePass123") {
    token
    user {
      id
      email
      role
      createdAt
    }
  }
}

# Login
mutation Login {
  login(email: "user@example.com", password: "SecurePass123") {
    token
    user {
      id
      email
      role
      createdAt
    }
  }
}

# Get current user
query Me {
  me {
    id
    email
    role
    createdAt
  }
}
```

#### File Management

```graphql
# List user files with pagination and filtering
query GetFiles {
  files(
    pagination: { limit: 20, offset: 0 }
    filter: {
      mimeTypes: ["image/jpeg", "image/png"]
      minSize: 1024
      maxSize: 10485760
      filenameContains: "photo"
    }
  ) {
    totalCount
    items {
      id
      filename
      visibility
      uploadedAt
      fileObject {
        id
        hash
        sizeBytes
        mimeType
        refCount
        createdAt
      }
      user {
        id
        email
      }
    }
  }
}

# Search files by filename
query SearchFiles {
  searchFiles(
    q: "document"
    pagination: { limit: 10, offset: 0 }
  ) {
    totalCount
    items {
      id
      filename
      uploadedAt
    }
  }
}

# Register file metadata (for metadata-only registration)
mutation RegisterFile {
  registerFile(input: {
    filename: "document.pdf"
    hash: "sha256-hash-string"
    sizeBytes: 2048
    mimeType: "application/pdf"
  }) {
    fileObject {
      id
      hash
      sizeBytes
      refCount
    }
    userFile {
      id
      filename
      visibility
      uploadedAt
    }
  }
}

# Delete file
mutation DeleteFile {
  deleteFile(userFileID: "uuid-string") {
    success
  }
}
```

#### Advanced Queries

```graphql
# Get storage statistics
query GetStats {
  stats {
    totalDedupedBytes
    originalBytes
    savedBytes
    savedPercent
  }
}

# Admin: List all files (admin-only)
query AdminFiles {
  adminFiles(pagination: { limit: 50, offset: 0 }) {
    totalCount
    items {
      id
      filename
      user {
        email
      }
      fileObject {
        sizeBytes
        refCount
      }
    }
  }
}
```

### GraphQL Schema Types

```graphql
scalar Time
scalar UUID

type User {
  id: UUID!
  email: String!
  role: String!
  createdAt: Time!
}

type FileObject {
  id: UUID!
  hash: String!
  storagePath: String!
  sizeBytes: Int!
  mimeType: String
  refCount: Int!
  createdAt: Time!
}

type UserFile {
  id: UUID!
  user: User!
  fileObject: FileObject!
  filename: String!
  visibility: String!
  uploadedAt: Time!
}

input FileFilter {
  mimeTypes: [String!]
  minSize: Int
  maxSize: Int
  dateFrom: Time
  dateTo: Time
  uploaderEmail: String
  filenameContains: String
}

input PaginationInput {
  limit: Int = 20
  offset: Int = 0
}

type FilePage {
  items: [UserFile!]!
  totalCount: Int!
}
```

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

## 📋 Production Tips & Cautions

### **🔧 MIME Type Handling - Relaxed Validation**
If you encounter MIME mismatches because some clients send generic `application/octet-stream`, you can relax the strict MIME check in `upload_handlers.go`:

**Current Strict Implementation:**
```go
if declared != "" && declared != detectedMime {
    http.Error(w, fmt.Sprintf("mime mismatch..."), http.StatusBadRequest)
    return
}
```

**Relaxed Alternative for Production:**
```go
if declared != "" && declared != detectedMime {
    // Log warning but continue with detected type
    log.Printf("MIME mismatch for %s: declared=%s detected=%s", 
               fh.Filename, declared, detectedMime)
    // Use detected MIME type and continue
    mimeType = detectedMime
}
```

### **📦 Large File Upload Considerations**
For very large uploads (> hundreds of MB):
- Consider streaming directly to cloud storage (S3)
- Implement chunked uploads for better reliability
- Add resume capability for failed uploads

### **💾 Storage Path Management**
We use temporary files under `${STORAGE_PATH}/tmp`:
- Ensure `STORAGE_PATH` has enough free disk space
- Verify proper permissions inside Docker containers
- Use `docker volume inspect infra_file_storage` to locate volume data on host

### **🐳 Docker vs Local Database Configuration**
**Critical Difference:**
- **Local development**: `DATABASE_URL=postgres://...@localhost:5433/...`
- **Docker Compose**: `DATABASE_URL=postgres://...@postgres:5432/...`

The backend container must use `postgres:5432` (compose service name and internal port), not `localhost:5433`.

### **🔍 Volume Inspection**
To check where Docker stores your files:
```bash
docker volume inspect infra_file_storage
# Shows actual host path: /var/lib/docker/volumes/infra_file_storage/_data
```

### **⚠️ Common Pitfalls**
1. **MIME Mismatches**: Mobile apps often send `application/octet-stream` for all files
2. **Database Connectivity**: Ensure container uses compose service names, not localhost
3. **Storage Permissions**: Verify Docker container can write to mounted volumes
4. **Disk Space**: Monitor storage volume usage for large file uploads