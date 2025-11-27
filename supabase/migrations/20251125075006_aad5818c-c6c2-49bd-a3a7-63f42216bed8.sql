-- Step 1: Add new column as text array
ALTER TABLE daily_submissions ADD COLUMN source_new text[];

-- Step 2: Migrate existing data (convert single ENUM to array with one element)
UPDATE daily_submissions SET source_new = ARRAY[source::text];

-- Step 3: Drop old column and rename new one
ALTER TABLE daily_submissions DROP COLUMN source;
ALTER TABLE daily_submissions RENAME COLUMN source_new TO source;

-- Step 4: Add NOT NULL constraint
ALTER TABLE daily_submissions ALTER COLUMN source SET NOT NULL;

-- Step 5: Add check constraint to ensure array is not empty
ALTER TABLE daily_submissions ADD CONSTRAINT source_not_empty CHECK (array_length(source, 1) > 0);