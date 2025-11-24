-- Create anomaly_resolutions table for tracking admin-resolved data quality issues
CREATE TABLE public.anomaly_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.daily_submissions(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('critical', 'warning', 'info', 'success')),
  anomaly_field TEXT NOT NULL,
  anomaly_message TEXT NOT NULL,
  resolved_by UUID NOT NULL,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, anomaly_field, anomaly_message)
);

-- Enable RLS
ALTER TABLE public.anomaly_resolutions ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX idx_anomaly_resolutions_submission_id ON public.anomaly_resolutions(submission_id);
CREATE INDEX idx_anomaly_resolutions_resolved_by ON public.anomaly_resolutions(resolved_by);

-- RLS Policy: Admins can manage all res