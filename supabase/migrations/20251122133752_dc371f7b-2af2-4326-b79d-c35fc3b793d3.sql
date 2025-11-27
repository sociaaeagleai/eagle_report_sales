-- Add RLS policies for anomaly_resolutions table

-- Policy: Admins can manage all resolutions
CREATE POLICY "Admins can manage all resolutions"
  ON public.anomaly_resolutions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Everyone can view resolution status (transparency)
CREATE POLICY "Everyone can view resolutions"
  ON public.anomaly_resolutions
  FOR SELECT
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.anomaly_resolutions IS 'Tracks anomaly resolutions made by admins to improve data quality transparency';