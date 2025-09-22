-- 000008_seed_admin_user.up.sql
-- Create admin user for BalkanID Capstone Task
-- Email: rishit@example.com, Password: 12345678

INSERT INTO users (email, password_hash, role) 
VALUES ('rishit@example.com', crypt('12345678', gen_salt('bf')), 'admin')
ON CONFLICT (email) DO NOTHING; 