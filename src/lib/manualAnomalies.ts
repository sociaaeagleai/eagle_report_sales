// Manual anomaly (BLACK MARK) utility functions
import { supabase } from "@/integrations/supabase/client";

export interface ManualAnomaly {
  id: string;
  submission_id: string;
  anomaly_field: string;
  anomaly_message: string;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

export const fetchManualAnomalies = async (): Promise<ManualAnomaly[]> => {
  const { data, error } = await supabase
    .from('manual_anomalies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching manual anomalies:", error);
    return [];
  }

  return data || [];
};

export const fetchManualAnomaliesForSubmission = async (submissionId: string): Promise<ManualAnomaly[]> => {
  const { data, error } = await supabase
    .from('manual_anomalies')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching manual anomalies for submission:", error);
    return [];
  }

  return data || [];
};

export const createManualAnomaly = async (
  submissionId: string,
  field: string,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from('manual_anomalies')
      .insert({
        submission_id: submissionId,
        anomaly_field: field,
        anomaly_message: message,
        created_by: session.user.id,
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error creating manual anomaly:", error);
    return { success: false, error: error.message || "Failed to create black mark" };
  }
};

export const updateManualAnomalyMessage = async (
  anomalyId: string,
  newMessage: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from('manual_anomalies')
      .update({ 
        anomaly_message: newMessage,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      })
      .eq('id', anomalyId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error updating manual anomaly:", error);
    return { success: false, error: error.message || "Failed to update black mark" };
  }
};

export const resolveManualAnomaly = async (
  anomalyId: string,
  resolutionNote?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from('manual_anomalies')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: session.user.id,
        resolution_note: resolutionNote || null,
      })
      .eq('id', anomalyId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error resolving manual anomaly:", error);
    return { success: false, error: error.message || "Failed to resolve black mark" };
  }
};

export const unresolveManualAnomaly = async (
  anomalyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('manual_anomalies')
      .update({
        resolved_at: null,
        resolved_by: null,
        resolution_note: null,
      })
      .eq('id', anomalyId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error unresolving manual anomaly:", error);
    return { success: false, error: error.message || "Failed to unresolve black mark" };
  }
};

export const deleteManualAnomaly = async (
  anomalyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('manual_anomalies')
      .delete()
      .eq('id', anomalyId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting manual anomaly:", error);
    return { success: false, error: error.message || "Failed to delete black mark" };
  }
};

export const isManualAnomalyResolved = (anomaly: ManualAnomaly): boolean => {
  return anomaly.resolved_at !== null;
};

export const getUnresolvedManualAnomalies = (anomalies: ManualAnomaly[]): ManualAnomaly[] => {
  return anomalies.filter(a => !isManualAnomalyResolved(a));
};

export const getResolvedManualAnomalies = (anomalies: ManualAnomaly[]): ManualAnomaly[] => {
  return anomalies.filter(a => isManualAnomalyResolved(a));
};
