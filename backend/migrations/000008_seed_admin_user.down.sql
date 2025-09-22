-- 000008_seed_admin_user.down.sql
-- Remove admin user

DELETE FROM users WHERE email = 'rishit@example.com';