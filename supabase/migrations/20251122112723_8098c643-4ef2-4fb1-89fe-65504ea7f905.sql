-- Drop old unique constraint
ALTER TABLE daily_submissions 
DROP CONSTRAINT daily_submissions_user_id_date_key;

-- Add new unique constraint with source
ALTER TABLE daily_submissions 
ADD CONSTRAINT daily_submissions_user_id_date_source_key 
UNIQUE (user_id, date, source);

-- Add followed_up field
ALTER TABLE daily_submissions 
ADD COLUMN followed_up INTEGER NOT NULL DEFAULT 0 CHECK (followed_up >= 0);