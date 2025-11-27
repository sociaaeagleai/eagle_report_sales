-- Add is_crm_updated column to daily_submissions table
ALTER TABLE daily_submissions 
ADD COLUMN is_crm_updated text NOT NULL DEFAULT 'No'
CHECK (is_crm_updated IN ('Yes(100%)', 'No'));