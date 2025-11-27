// Anomaly resolution utility functions

export interface ResolvedAnomaly {
  id: string;
  submission_id: string;
  anomaly_type: 'critical' | 'warning' | 'info' | 'success';
  anomaly_field: string;
  anomaly_message: string;
  resolved_by: string;
  resolution_note?: string;
  resolved_at: string;
  created_at: string;
}

export const isAnomalyResolved = (
  submissionId: string,
  anomalyField: string,
  anomalyMessage: string,
  resolvedAnomalies: ResolvedAnomaly[]
): ResolvedAnomaly | null => {
  const resolved = resolvedAnomalies.find(
    r => r.submission_id === submissionId && 
         r.anomaly_field === anomalyField && 
         r.anomaly_message === anomalyMessage
  );
  return resolved || null;
};

export const filterUnresolvedAnomalies = (
  anomalies: { field?: string; message: string }[],
  submissionId: string,
  resolvedAnomalies: ResolvedAnomaly[]
): { field?: string; message: string }[] => {
  return anomalies.filter(anomaly => {
    const field = anomaly.field || 'general';
    return !isAnomalyResolved(submissionId, field, anomaly.message, resolvedAnomalies);
  });
};
