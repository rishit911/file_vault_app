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

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker & Docker Compose v2

### 1. Clone the Repository
```bash
git clone https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-rishit911.git
cd vit-2026-capstone-internship-hiring-task-rishit911
```

### 2. Create Required Environment Files
```bash
# Create backend environment file (required for Docker Compose)
cp backend/.env.example backend/.env.dev
```

### 3. Start the Application
```bash
# Use the --env-file flag to ensure environment variables are loaded
docker compose --env-file .env.docker up --build -d
```

### 4. Verify Services are Running
```bash
# Check container status
docker compose --env-file .env.docker ps

# View logs (optional)
docker compose --env-file .env.docker logs --tail=10
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

### 6. 🔑 Admin Login Credentials
```
Email: rishit@example.com
Password: 12345678
```

⚠️ **Important**: Change the default admin password after first login in production!

### 7. Stop the Application
```bash
docker compose --env-file .env.docker down
```

### 🚨 Troubleshooting Docker Setup

**If you see environment variable warnings:**
- Always use `--env-file .env.docker` flag with docker compose commands
- Ensure `backend/.env.dev` file exists (copy from `.env.example`)

**If containers fail to start:**
```bash
# Clean up and restart
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up --build -d
```

## 💻 Local Development Setup

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+

### 1. Clone the Repository
```bash
git clone https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-rishit911.git
cd vit-2026-capstone-internship-hiring-task-rishit911
```

### 2. Database Setup
```bash
# Start PostgreSQL with Docker (recommended)
docker run --name filevault-db \
  -e POSTGRES_USER=filevault_user \
  -e POSTGRES_PASSWORD=filevault_pass \
  -e POSTGRES_DB=filevault_db \
  -p 5432:5432 -d postgres:15-alpine

# Or install PostgreSQL locally and create database
createdb filevault_db
```

### 3. Backend Setup
```bash
cd backend

# Copy environment file
cp .env.example .env.dev

# Edit .env.dev with your database settings
# DATABASE_URL=postgres://filevault_user:filevault_pass@localhost:5432/filevault_db?sslmode=disable

# Install dependencies
go mod download

# Run database migrations
go run ./cmd/migrate/

# Start the backend server
go run ./cmd/server/
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

### 6. 🔑 Admin Login Credentials
```
Email: rishit@example.com
Password: 12345678
```

## 🐳 Docker Commands

**Important**: Always use `--env-file .env.docker` flag with all docker compose commands.

```bash
# Start all services
docker compose --env-file .env.docker up --build -d

# View service status
docker compose --env-file .env.docker ps

# View logs
docker compose --env-file .env.docker logs -f backend frontend db

# View recent logs
docker compose --env-file .env.docker logs --tail=10

# Stop services
docker compose --env-file .env.docker down

# Clean up (removes volumes and data)
docker compose --env-file .env.docker down -v

# Rebuild containers
docker compose --env-file .env.docker build --no-cache
```

## 👤 Admin User Management

### Default Admin Credentials
The admin user is automatically created when the database is initialized:

```
Email: rishit@example.com
Password: 12345678
```

### Create Additional Admin Users
```bash
# Using Docker Compose
docker compose exec db psql -U filevault_user -d filevault_db -c \
  "INSERT INTO users (email, password_hash, role) VALUES ('admin@example.com', crypt('your_password', gen_salt('bf')), 'admin');"

# Using local PostgreSQL
psql -d filevault_db -c \
  "INSERT INTO users (email, password_hash, role) VALUES ('admin@example.com', crypt('your_password', gen_salt('bf')), 'admin');"
```

### 🔒 Security Best Practices
- ⚠️ **Change the default password** immediately after first login
- 🔒 Use strong passwords (minimum 12 characters)
- 🔄 Rotate admin passwords regularly
- 🛡️ Never commit real passwords to version control
- 🌐 Use HTTPS in production environments

## 📚 API Documentation

The backend provides both REST and GraphQL APIs:

- **REST API**: http://localhost:8080/api/
- **GraphQL Playground**: http://localhost:8080/query
- **Health Check**: http://localhost:8080/health

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/files` - List user files
- `POST /api/files/upload` - Upload files
- `DELETE /api/files/:id` - Delete files
- `POST /api/files/:id/share` - Create share links

## 📁 Project Structure

```
vit-2026-capstone-internship-hiring-task-rishit911/
├── backend/                 # Go backend service
│   ├── cmd/
│   │   ├── server/         # Main server application
│   │   └── migrate/        # Database migration tool
│   ├── internal/           # Internal packages
│   │   ├── auth/          # Authentication logic
│   │   ├── handlers/      # HTTP handlers
│   │   └── models/        # Data models
│   ├── migrations/         # Database migrations
│   ├── graph/              # GraphQL schema & resolvers
│   └── Dockerfile          # Backend container config
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   ├── public/
│   └── Dockerfile          # Frontend container config
├── data/files/             # Persistent file storage
├── docker-compose.yml      # Container orchestration
├── .env.docker            # Docker environment variables
└── README.md              # This file
```

## 🚨 Troubleshooting

### Common Issues

**Environment Variable Warnings**
```bash
# Always use the --env-file flag
docker compose --env-file .env.docker up -d

# Ensure backend environment file exists
cp backend/.env.example backend/.env.dev
```

**Port Already in Use**
```bash
# Check what's using the ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :8080

# Kill processes using the ports (Linux/Mac)
sudo kill -9 $(lsof -t -i:3000)
sudo kill -9 $(lsof -t -i:8080)

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Database Connection Issues**
```bash
# Check if PostgreSQL is running
docker compose --env-file .env.docker ps

# View database logs
docker compose --env-file .env.docker logs db

# Reset database
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up -d
```

**Container Build Issues**
```bash
# Clean rebuild
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d
```

**Permission Issues (Linux/Mac)**
```bash
# Fix file permissions
sudo chown -R $USER:$USER data/files/
chmod -R 755 data/files/
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
go test ./...
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing
1. Visit http://localhost:3000
2. Register a new user or login with admin credentials
3. Upload a file
4. Create a share link
5. Test file download and deletion

## 📝 License

This project is licensed under the MIT License.

## ✅ Verified Setup Steps (Tested)

These are the exact steps that have been tested and verified to work:

### Step 1: Clone and Navigate
```bash
git clone https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-rishit911.git
cd vit-2026-capstone-internship-hiring-task-rishit911
```

### Step 2: Create Backend Environment File
```bash
cp backend/.env.example backend/.env.dev
```

### Step 3: Start with Environment File
```bash
docker compose --env-file .env.docker up -d
```

### Step 4: Verify All Services
```bash
docker compose --env-file .env.docker ps
```

You should see:
- `fv-postgres` - healthy on port 5432
- `fv-backend` - healthy on port 8080  
- `fv-frontend` - healthy on port 3000

### Step 5: Access Application
- Open http://localhost:3000
- Login with: `rishit@example.com` / `12345678`

### Step 6: View Logs (Optional)
```bash
docker compose --env-file .env.docker logs --tail=10
```

---

**BalkanID Capstone Task Submission**  
**Student**: Rishit  
**Repository**: https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-rishit911.git