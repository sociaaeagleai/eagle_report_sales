-- Create admin account for password-only access
-- Email: admin@salestrack.local
-- Password will be set to: Sakeel$134

-- First, we need to manually insert into auth.users (this will be done via Supabase Auth API)
-- But we'll prepare the profiles and user_roles tables to accept this user

-- Note: The actual user creation with password will happen through the signup process
-- This migration ensures the admin role structure is ready

-- Clean up any existing admin@salestrack.local entries first
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'admin@salestrack.local'
);

DELETE FROM public.profiles WHERE email = 'admin@salestrack.local';

-- The admin user will be created through the Auth system with:
-- Email: admin@salestrack.local
-- Password: Sakeel$134
-- This migration prepares the database to accept and properly role this user