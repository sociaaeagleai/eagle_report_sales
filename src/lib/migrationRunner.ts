import { supabase } from "@/integrations/supabase/client";

// Parse CSV line by line
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const parseCSV = (csvText: string) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      row[header] = value === '' ? null : value;
    });
    
    data.push(row);
  }
  
  return data;
};

export const importAttendanceData = async (csvText: string) => {
  const records = parseCSV(csvText);
  
  const attendanceRecords = records.map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    date: r.date,
    status: r.status,
    absence_type: r.absence_type || null,
    task_completed: r.task_completed || null,
    performance_rating: r.performance_rating ? parseInt(r.performance_rating) : null,
    notes: r.notes || null,
    marked_by: r.marked_by || null,
  }));

  console.log(`Importing ${attendanceRecords.length} attendance records...`);
  
  const { error } = await supabase
    .from('attendance')
    .insert(attendanceRecords);

  if (error) {
    console.error('Attendance import error:', error);
    throw new Error(`Failed to import attendance: ${error.message}`);
  }

  return attendanceRecords.length;
};

export const importSubmissionsData = async (csvText: string) => {
  const records = parseCSV(csvText);
  
  const submissions = records.map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    date: r.date,
    calls_dialled: parseInt(r.calls_dialled) || 0,
    calls_taken: parseInt(r.calls_taken) || 0,
    rapport_built: parseInt(r.rapport_built) || 0,
    touched_base: parseInt(r.touched_base) || 0,
    calls_not_taken: parseInt(r.calls_not_taken) || 0,
    others: parseInt(r.others) || 0,
    disqualified: parseInt(r.disqualified) || 0,
    sm_rp: parseInt(r.sm_rp) || 0,
    sm_enrolled: parseInt(r.sm_enrolled) || 0,
    sm_rp_to_enrolled: parseInt(r.sm_rp_to_enrolled) || 0,
    fu_rp: parseInt(r.fu_rp) || 0,
    fu_enrolled: parseInt(r.fu_enrolled) || 0,
    fu_rp_to_enrolled: parseInt(r.fu_rp_to_enrolled) || 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
    is_crm_updated: r.is_crm_updated || null,
    followed_up: parseInt(r.followed_up) || 0,
    task_completion_status: r.task_completion_status || null,
    source: r.source ? JSON.parse(r.source) : [],
    sub_source: r.sub_source || null,
    admin_notes: r.admin_notes || null,
  }));

  console.log(`Importing ${submissions.length} submissions...`);
  
  // Import in batches of 50
  const batchSize = 50;
  let imported = 0;
  
  for (let i = 0; i < submissions.length; i += batchSize) {
    const batch = submissions.slice(i, i + batchSize);
    const { error } = await supabase
      .from('daily_submissions')
      .insert(batch);

    if (error) {
      console.error(`Submissions import error (batch ${i / batchSize + 1}):`, error);
      throw new Error(`Failed to import submissions: ${error.message}`);
    }
    
    imported += batch.length;
    console.log(`Imported ${imported}/${submissions.length} submissions`);
  }

  return submissions.length;
};

export const importAnomalyResolutions = async (csvText: string) => {
  const records = parseCSV(csvText);
  
  const resolutions = records.map((r: any) => ({
    id: r.id,
    submission_id: r.submission_id,
    anomaly_type: r.anomaly_type,
    anomaly_field: r.anomaly_field,
    anomaly_message: r.anomaly_message,
    resolved_by: r.resolved_by || null,
    resolution_note: r.resolution_note || null,
    resolved_at: r.resolved_at || null,
    created_at: r.created_at,
  }));

  console.log(`Importing ${resolutions.length} anomaly resolutions...`);
  
  const { error } = await supabase
    .from('anomaly_resolutions')
    .insert(resolutions);

  if (error) {
    console.error('Anomaly resolutions import error:', error);
    throw new Error(`Failed to import anomaly resolutions: ${error.message}`);
  }

  return resolutions.length;
};

export const importManualAnomalies = async (csvText: string) => {
  const records = parseCSV(csvText);
  
  const anomalies = records.map((r: any) => ({
    id: r.id,
    submission_id: r.submission_id,
    anomaly_field: r.anomaly_field,
    anomaly_message: r.anomaly_message,
    created_by: r.created_by,
    created_at: r.created_at,
    resolved_at: r.resolved_at || null,
    resolved_by: r.resolved_by || null,
    resolution_note: r.resolution_note || null,
  }));

  console.log(`Importing ${anomalies.length} manual anomalies...`);
  
  const { error } = await supabase
    .from('manual_anomalies')
    .insert(anomalies);

  if (error) {
    console.error('Manual anomalies import error:', error);
    throw new Error(`Failed to import manual anomalies: ${error.message}`);
  }

  return anomalies.length;
};
