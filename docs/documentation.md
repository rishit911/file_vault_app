# FileVault — System Design & Architecture

## Project Overview

FileVault is a modern, secure file storage and sharing platform built with Go backend and React frontend. The system provides enterprise-grade file management with advanced features like deduplication, user-to-user sharing, folder organization, and comprehensive admin controls.

## Design Goals

### Primary Objectives

- **Secure File Storage**: SHA-256 based deduplication with efficient storage management
- **User Experience**: Intuitive interface for file management and sharing
- **Scalability**: Architecture designed for horizontal scaling
- **Security**: JWT-based authentication with role-based access control
- **Performance**: Optimized for large file uploads and concurrent users
- **Maintainability**: Clean architecture with comprehensive testing

### Key Features Implemented

- ✅ File upload with deduplication
- ✅ User authentication and authorization
- ✅ File sharing (public links + user-to-user)
- ✅ Folder organization and hierarchy
- ✅ File tagging system
- ✅ Advanced search and filtering
- ✅ Admin dashboard and user management
- ✅ Storage quotas and usage tracking
- ✅ Download analytics and monitoring
- ✅ Docker containerization
- ✅ CI/CD pipeline with GitHub Actions

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│     (Go)        │◄──►│  (PostgreSQL)   │
│   Port: 3000    │    │   Port: 8080    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  File Storage   │
                       │ (Local/S3-ready)│
                       └─────────────────┘
```

### Technology Stack

#### Backend (Go 1.21+)

- **Web Framework**: Standard library with custom routing
- **GraphQL**: gqlgen for schema-first development
- **Database**: PostgreSQL 15+ with pgx driver
- **Authentication**: JWT tokens with bcrypt hashing
- **File Storage**: Local filesystem with SHA-256 deduplication
- **Migrations**: golang-migrate for schema management
- **Rate Limiting**: Token bucket algorithm (2 req/sec, burst 5)
- **Testing**: Go testing framework with comprehensive coverage

#### Frontend (React 18 + TypeScript)

- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS for utility-first styling
- **HTTP Client**: Axios for API communication
- **Routing**: React Router v7 for client-side routing
- **State Management**: React Context API
- **UI Components**: Lucide React icons, React Hot Toast
- **File Upload**: React Dropzone for drag-and-drop uploads

#### Infrastructure

- **Containerization**: Docker and Docker Compose
- **Reverse Proxy**: Nginx for production deployments
- **CI/CD**: GitHub Actions for automated testing
- **Environment Management**: dotenv configuration
- **Code Quality**: ESLint, gofmt, automated formatting

## Database Design

### Core Entities (Implemented)

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### File Objects (Deduplication Core)

```sql
CREATE TABLE file_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash VARCHAR(64) UNIQUE NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(255),
    ref_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### User Files (User-File Mapping)

```sql
CREATE TABLE user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_object_id UUID REFERENCES file_objects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    visibility VARCHAR(50) DEFAULT 'private',
    folder_id UUID REFERENCES folders(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

#### Folders (Hierarchical Organization)

```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Shares (Public & Private Sharing)

```sql
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES user_files(id),
    folder_id UUID REFERENCES folders(id),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    public BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    max_downloads INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### User Shares (Direct User-to-User Sharing)

```sql
CREATE TABLE user_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_object_id UUID REFERENCES file_objects(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP DEFAULT NOW(),
    message TEXT
);
```

#### Tags & File Tags (Categorization)

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE file_tags (
    file_object_id UUID REFERENCES file_objects(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (file_object_id, tag_id)
);
```

#### Downloads (Analytics & Tracking)

```sql
CREATE TABLE downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID REFERENCES shares(id),
    file_id UUID REFERENCES user_files(id),
    downloader_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Relationships

- **One-to-Many**: Users → User Files, Users → Folders, Folders → User Files
- **Many-to-One**: User Files → File Objects (deduplication)
- **Many-to-Many**: File Objects ↔ Tags (via file_tags junction table)
- **Self-Referencing**: Folders → Parent Folders (hierarchical structure)
- **Polymorphic**: Shares can reference either Files or Folders

## API Design

### Hybrid API Architecture

FileVault implements a hybrid approach combining REST and GraphQL:

#### REST API (File Operations)

- **POST /api/v1/files/upload**: Multipart file upload with streaming
- **GET /api/v1/files**: List user files
- **DELETE /api/v1/files/{id}**: Delete user file
- **POST /api/v1/auth/register**: User registration
- **POST /api/v1/auth/login**: User authentication

#### GraphQL API (Metadata Operations)

- **Queries**: File listing, search, user management, statistics
- **Mutations**: File registration, sharing, folder operations, user updates
- **Subscriptions**: Real-time updates (future enhancement)

### Authentication & Authorization

#### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "user|admin",
  "exp": 1640995200,
  "iat": 1640908800
}
```

#### Role-Based Access Control

- **User Role**: Access to own files, sharing, basic operations
- **Admin Role**: Full system access, user management, system statistics

## File Storage Architecture

### Deduplication Strategy

Files are stored using SHA-256 content hashing:

```
/data/files/
├── ab/
│   └── abc123def456789... (full SHA-256 hash)
├── cd/
│   └── cdef789abc123456...
└── tmp/
    └── upload-* (temporary files during processing)
```

### Storage Process Flow

1. **Upload Initiation**: Client starts multipart upload
2. **Streaming Hash**: SHA-256 calculated during upload stream
3. **Deduplication Check**: Query `file_objects` table for existing hash
4. **Storage Decision**:
   - If hash exists: Increment `ref_count`, create `user_file` entry
   - If new: Store file, create `file_object` with `ref_count = 1`
5. **Cleanup**: Remove temporary files, update database

### Storage Benefits

- **Space Efficiency**: ~50% storage savings on average
- **Integrity Verification**: SHA-256 ensures file integrity
- **Fast Duplicate Detection**: Hash-based lookup in milliseconds
- **Scalable**: Ready for cloud storage backends (S3, GCS)

## Security Architecture

### Authentication Flow

```
Client → Login Request → Backend → JWT Token → Client
Client → API Request + JWT → Backend → Validate → Response
```

### Security Measures Implemented

#### Input Validation

- File type validation via MIME detection
- Filename sanitization and path traversal prevention
- Request size limits and rate limiting
- SQL injection prevention with parameterized queries

#### Access Control

- JWT token validation on all protected endpoints
- Role-based authorization for admin functions
- User isolation (users can only access their own files)
- Secure file serving with token-based access

#### Data Protection

- Password hashing with bcrypt (cost factor 12)
- Secure JWT signing with 256-bit secrets
- HTTPS enforcement in production
- CORS configuration for cross-origin security

## Performance Considerations

### Optimization Strategies

#### Database Performance

- Indexes on frequently queried columns (hash, user_id, email)
- Connection pooling with pgx driver
- Query optimization with EXPLAIN ANALYZE
- Prepared statements for common queries

#### File Upload Performance

- Streaming uploads to prevent memory exhaustion
- Concurrent hash calculation during upload
- Temporary file cleanup with automatic garbage collection
- Multipart upload support for large files

#### Caching Strategy (Future)

- Redis for session management and frequently accessed data
- CDN integration for static assets and public files
- Database query result caching
- File metadata caching

## Scalability Design

### Horizontal Scaling Readiness

#### Stateless Backend

- JWT tokens eliminate server-side session storage
- Database connection pooling supports multiple instances
- File storage abstraction ready for distributed storage

#### Database Scaling

- Read replicas for query distribution
- Connection pooling and query optimization
- Prepared for database sharding by user_id

#### Storage Scaling

- Abstracted storage interface ready for S3/GCS
- File path structure supports distributed storage
- Deduplication works across storage backends

## Development Workflow

### Code Organization

```
file_vault_proj/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/            # Private application code
│   │   ├── auth/           # Authentication logic
│   │   ├── db/             # Database operations
│   │   ├── server/         # HTTP handlers
│   │   └── storage/        # File storage abstraction
│   ├── graph/              # GraphQL schema and resolvers
│   ├── migrations/         # Database schema migrations
│   └── scripts/            # Utility scripts
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components
│   │   ├── contexts/       # React context providers
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── docs/                   # Project documentation
```

### Testing Strategy

#### Backend Testing

- Unit tests for business logic (auth, storage, deduplication)
- Integration tests for database operations
- API endpoint tests with test database
- Performance tests for file upload scenarios

#### Frontend Testing

- Component unit tests with React Testing Library
- Integration tests for user workflows
- End-to-end tests with Cypress (planned)
- Visual regression tests (planned)

### CI/CD Pipeline

#### GitHub Actions Workflow

1. **Code Quality**: Linting, formatting, type checking
2. **Testing**: Unit tests, integration tests
3. **Building**: Backend compilation, frontend build
4. **Security**: Dependency vulnerability scanning
5. **Deployment**: Docker image building and deployment

## Deployment Architecture

### Development Environment

- Docker Compose with hot reloading
- Exposed ports for debugging
- Volume mounts for live code updates
- Separate database container with persistent storage

### Production Environment

- Multi-stage Docker builds for optimization
- Nginx reverse proxy with SSL termination
- Health checks and automatic restarts
- Persistent volumes for file storage and database
- Environment-based configuration management

## Future Enhancements

### Planned Features

- [ ] Real-time notifications with WebSockets
- [ ] File versioning and history
- [ ] Advanced admin analytics dashboard
- [ ] Mobile application (React Native)
- [ ] API rate limiting per user tier
- [ ] File preview generation (thumbnails, PDFs)
- [ ] Bulk operations (zip downloads, batch uploads)
- [ ] Integration with cloud storage providers
- [ ] Advanced search with full-text indexing
- [ ] Audit logging and compliance features

### Technical Improvements

- [ ] Redis caching layer
- [ ] Database read replicas
- [ ] CDN integration
- [ ] Microservices architecture
- [ ] Event-driven architecture with message queues
- [ ] Advanced monitoring and alerting
- [ ] Automated backup and disaster recovery
- [ ] Performance monitoring and APM integration

## Lessons Learned

### Architecture Decisions

- **Hybrid API**: REST for file operations, GraphQL for metadata provides optimal performance
- **Deduplication**: SHA-256 based approach balances security and efficiency
- **JWT Authentication**: Stateless tokens enable easy horizontal scaling
- **Docker First**: Containerization from day one simplified deployment

### Development Insights

- **Database Design**: Proper indexing and relationships crucial for performance
- **File Handling**: Streaming uploads prevent memory issues with large files
- **Security**: Input validation and sanitization must be comprehensive
- **Testing**: Early test implementation saves debugging time later

### Production Considerations

- **Monitoring**: Comprehensive logging and health checks are essential
- **Backup Strategy**: Regular database and file storage backups critical
- **Security Updates**: Automated dependency updates and security scanning
- **Performance Monitoring**: Real-time metrics for proactive issue resolution

This design document reflects the current state of FileVault as a production-ready file storage and sharing platform with a solid foundation for future enhancements and scaling.
