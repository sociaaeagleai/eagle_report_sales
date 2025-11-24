-- Add notes column to attendance table
ALTER TABLE public.attendance
ADD COLUMN notes TEXT;