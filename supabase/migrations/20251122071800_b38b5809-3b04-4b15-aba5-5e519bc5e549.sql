-- First, alter the daily_submissions table to use text temporarily
ALTER TABLE daily_submissions ALTER COLUMN source TYPE text;

-- Drop the old enum
DROP TYPE IF EXISTS source_type;

-- Create the new expanded enum with all sources
CREATE TYPE source_type AS ENUM (
  'ai',
  'micro_vsl',
  'vsl',
  'manoj',
  'thiru',
  'gdd',
  'sha',
  'vishnu',
  'website',
  'direct_call',
  'direct_visit',
  'direct_whatsapp',
  'waba',
  'meta_leads',
  'ctwa',
  'social_media',
  'webinar',
  'referral'
);

-- Alter the column back to use the new enum
ALTER TABLE daily_submissions ALTER COLUMN source TYPE source_type USING source::source_type;

-- Insert admin user credentials (user must sign up first at /auth, then this updates their role)
-- This is a placeholder comment - the actual user creation happens through Supabase Auth signup
-- After signup with sakeel@socialeagle.ai, run this to grant admin access:
-- UPDATE profiles SET role = 'admin' WHERE email = 'sakeel@socialeagle.ai';
-- INSERT INTO user_roles (user_id, role) 
-- SELECT id, 'admin'::app_role FROM profiles WHERE email = 'sakeel@socialeagle.ai'
-- ON CONFLICT (user_id, role) DO NOTHING;