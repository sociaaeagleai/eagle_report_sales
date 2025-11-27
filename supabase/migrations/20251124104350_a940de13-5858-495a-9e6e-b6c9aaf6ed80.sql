-- Fix RLS policy for daily_submissions UPDATE to support UPSERT
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.daily_submissions;

CREATE POLICY "Users can update their own submissions" 
ON public.daily_submissions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);