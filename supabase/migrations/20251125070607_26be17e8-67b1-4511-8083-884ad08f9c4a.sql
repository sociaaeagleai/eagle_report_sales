-- Add task completion status column to daily_submissions table
ALTER TABLE daily_submissions 
ADD COLUMN task_completion_status TEXT 
CHECK (task_completion_status IN ('Yes (100%)', 'Not yet', 'Have time'));

-- Add comment for documentation
COMMENT ON COLUMN daily_submissions.task_completion_status IS 
'Track whether assigned tasks for the day are completed: Yes (100%), Not yet, or Have time';