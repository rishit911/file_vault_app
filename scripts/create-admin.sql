-- Create admin user script
-- Usage: docker compose exec db psql -U filevault_user -d filevault_db -f /scripts/create-admin.sql

INSERT INTO users (email, password_hash, role) 
VALUES ('admin@filevault.com', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (email) DO UPDATE SET 
    password_hash = crypt('admin123', gen_salt('bf')),
    role = 'admin';

-- Verify admin user was created
SELECT id, email, role, created_at FROM users WHERE role = 'admin';