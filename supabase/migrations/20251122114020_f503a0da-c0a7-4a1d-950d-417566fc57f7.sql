-- Add task completion and performance rating columns to attendance table
ALTER TABLE attendance 
ADD COLUMN task_completed TEXT 
CHECK (task_completed IN ('Yes(100%)', 'Not yet'));

ALTER TABLE attendance 
ADD COLUMN performance_rating INTEGER 
CHECK (performance_rating >= 1 AND performance_rating <= 5);