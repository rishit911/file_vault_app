# FileVault — Secure File Storage & Sharing Platform

A modern, secure file storage and sharing platform built with Go backend and React frontend.

## Features

- 🔐 **Secure Authentication** - JWT-based user authentication
- 📁 **File Management** - Upload, organize, and manage files with folders
- 🔗 **File Sharing** - Generate secure public links with expiration
- 👥 **Admin Panel** - User management and system administration
- 🏷️ **File Tagging** - Organize files with custom tags
- 🔍 **Search & Filter** - Find files quickly with advanced search
- 📊 **Storage Quotas** - Per-user storage limits and usage tracking
- 🐳 **Docker Ready** - Full containerization with Docker Compose

## Quick Start

### Prerequisites
- Docker & Docker Compose v2
- Go 1.21+ (for local development)
- Node.js 18+ (for local development)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd file_vault_proj
cp .env.docker .env.docker.local
# Edit .env.docker.local and set secure POSTGRES_PASSWORD
```

### 2. Start with Docker Compose
```bash
docker compose up --build -d
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

### 4. Admin Login (Default)
- **Email**: `admin@filevault.com`
- **Password**: `admin123`

⚠️ **Security Note**: Change the default admin password after first login in production!

## Development

### Local Development Setup

1. **Backend Setup**:
```bash
cd backend
cp .env.example .env.dev
# Edit .env.dev with your database settings
go mod download
go run ./cmd/server/
```

2. **Frontend Setup**:
```bash
cd frontend
npm install
npm run dev
```

3. **Database Setup**:
```bash
# Start PostgreSQL with Docker
docker run --name filevault-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15-alpine
# Run migrations (they auto-run with docker-compose)
```

### Admin User Management

A default admin user is automatically created when the database is initialized:

- **Email**: `admin@filevault.com`
- **Password**: `admin123`

**Alternative: Create Admin User Manually**
```bash
# Using Docker Compose
docker compose exec db psql -U filevault_user -d filevault_db -c "INSERT INTO users (email, password_hash, role) VALUES ('admin@example.com', crypt('your_password', gen_salt('bf')), 'admin');"

# Or use the provided script
docker compose exec db psql -U filevault_user -d filevault_db -f /scripts/create-admin.sql
```

**Security Notes:**
- ⚠️ **Change the default password** after first login
- 🔒 Use strong passwords in production
- 🔄 Rotate admin passwords regularly
- 🛡️ Never commit real passwords to the repository

### Docker Commands

```bash
# Start all services
docker compose up --build -d

# View service status
docker compose ps

# View logs
docker compose logs -f backend frontend db

# Stop services
docker compose down

# Clean up (removes volumes)
docker compose down -v
```

## API Documentation

The backend provides both REST and GraphQL APIs:

- **REST API**: http://localhost:8080/api/
- **GraphQL**: http://localhost:8080/query
- **Health Check**: http://localhost:8080/health

## Project Structure

```
file_vault_proj/
├── backend/                 # Go backend
│   ├── cmd/
│   │   ├── server/         # Main server
│   │   └── seed_admin/     # Admin user seeding utility
│   ├── internal/           # Internal packages
│   ├── migrations/         # Database migrations
│   └── graph/              # GraphQL schema & resolvers
├── frontend/               # React frontend
│   ├── src/
│   └── public/
├── infra/                  # Infrastructure & docs
├── data/files/             # Persistent file storage
└── docker-compose.yml      # Container orchestration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `go test ./...` and `npm test`
5. Submit a pull request

## License

This project is licensed under the MIT License.