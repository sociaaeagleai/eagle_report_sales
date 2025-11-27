// Anomaly detection utility functions for sales data validation

export interface AnomalyResult {
  type: 'critical' | 'warning' | 'info' | 'success' | 'blackmark';
  message: string;
  field?: string;
  isManual?: boolean;
}

export interface SubmissionAnomalies {
  hasAnomalies: boolean;
  critical: AnomalyResult[];
  warnings: AnomalyResult[];
  info: AnomalyResult[];
  success: AnomalyResult[];
}

export const detectAnomalies = (data: {
  calls_dialled: number;
  calls_taken: number;
  rapport_built?: number;
  touched_base?: number;
  calls_not_taken?: number;
  others?: number;
  disqualified?: number;
  followed_up?: number;
  sm_rp?: number;
  sm_enrolled?: number;
  fu_rp?: number;
  fu_enrolled?: number;
  performance_rating?: number;
}): SubmissionAnomalies => {
  const critical: AnomalyResult[] = [];
  const warnings: AnomalyResult[] = [];
  const info: AnomalyResult[] = [];
  const success: AnomalyResult[] = [];

  // Calculate show-up and no-show rates
  const showUpRate = data.calls_dialled > 0 ? (data.calls_taken / data.calls_dialled) : 0;
  const noShowCount = (data.calls_not_taken || 0) + (data.touched_base || 0) + (data.others || 0);
  const noShowRate = data.calls_dialled > 0 ? (noShowCount / data.calls_dialled) : 0;

  // ===== NEW CRITICAL ANOMALIES =====
  
  // CRITICAL: Show-up Rate > 100% (IMPOSSIBLE)
  if (showUpRate > 1.0) {
    critical.push({
      type: 'critical',
      message: 'IMPOSSIBLE: Show-up rate exceeds 100% - data error',
      field: 'show_up'
    });
  }

  // CRITICAL: No-show Rate > 100% (IMPOSSIBLE)
  if (noShowRate > 1.0) {
    critical.push({
      type: 'critical',
      message: 'IMPOSSIBLE: No-show rate exceeds 100% - data error',
      field: 'no_show'
    });
  }

  // CRITICAL: Total Activities > 150% of Calls Dialled
  const totalActivities = (data.touched_base || 0) + 
                          (data.calls_not_taken || 0) + (data.others || 0) + 
                          (data.disqualified || 0);
  if (totalActivities > data.calls_dialled * 1.5) {
    critical.push({
      type: 'critical',
      message: 'IMPOSSIBLE: Activity count severely exceeds calls dialed',
      field: 'activities'
    });
  }

  // CRITICAL: Calls Taken > Calls Dialled (existing)
  if (data.calls_taken > data.calls_dialled) {
    critical.push({
      type: 'critical',
      message: 'Error: Cannot take more calls than dialed',
      field: 'calls_taken'
    });
  }

  // CRITICAL: Total Activities > Calls Dialled (existing, but only if not already caught by 150% check)
  if (totalActivities > data.calls_dialled && totalActivities <= data.calls_dialled * 1.5) {
    critical.push({
      type: 'critical',
      message: 'Warning: Activity count exceeds calls dialed',
      field: 'activities'
    });
  }

  // ===== NEW WARNING ANOMALIES =====

  // WARNING: Breakdown exceeds calls dialled
  const callsBreakdown = (data.calls_taken || 0) + (data.touched_base || 0) + 
                        (data.calls_not_taken || 0) + (data.others || 0) + 
                        (data.disqualified || 0);
  if (callsBreakdown > data.calls_dialled) {
    warnings.push({
      type: 'warning',
      message: 'Some calls may be missing - breakdown exceeds total dialled',
      field: 'calls_dialled'
    });
  }

  // WARNING: Very High Show-up Rate (>85%)
  if (showUpRate > 0.85 && data.calls_dialled >= 5) {
    warnings.push({
      type: 'warning',
      message: 'Unusually high show-up rate (>85%) - verify accuracy',
      field: 'show_up'
    });
  }

  // WARNING: Perfect 100% Show-up
  if (showUpRate === 1.0 && data.calls_dialled >= 5) {
    warnings.push({
      type: 'warning',
      message: 'Perfect show-up rate - unusual but possible',
      field: 'show_up'
    });
  }

  // WARNING: Zero No-Shows with High Volume
  if (data.calls_dialled >= 10 && noShowCount === 0) {
    warnings.push({
      type: 'warning',
      message: 'No no-shows from high volume - verify data',
      field: 'no_show'
    });
  }

  // WARNING: Total RP > Calls Taken (existing)
  const totalRp = (data.sm_rp || 0) + (data.fu_rp || 0);
  if (totalRp > data.calls_taken) {
    warnings.push({
      type: 'warning',
      message: 'Warning: Total RP exceeds calls taken',
      field: 'rp'
    });
  }

  // WARNING: Zero Activity Despite Calls (existing)
  if (data.calls_taken > 0) {
    const hasActivity = (data.rapport_built || 0) > 0 || 
                       (data.touched_base || 0) > 0 || 
                       (data.disqualified || 0) > 0 || 
                       (data.sm_rp || 0) > 0 || 
                       (data.fu_rp || 0) > 0;
    if (!hasActivity) {
      warnings.push({
        type: 'warning',
        message: 'No follow-up activities recorded despite calls taken',
        field: 'activities'
      });
    }
  }

  // WARNING: All No-Shows (existing)
  if (data.calls_dialled > 0 && data.calls_taken === 0) {
    warnings.push({
      type: 'warning',
      message: 'Complete no-show - verify data',
      field: 'calls_taken'
    });
  }

  // WARNING: Disqualified > 15% of Calls Dialled
  if (data.calls_dialled > 0 && (data.disqualified || 0) > data.calls_dialled * 0.15) {
    warnings.push({
      type: 'warning',
      message: 'Disqualified exceeds 15% of calls dialled',
      field: 'disqualified'
    });
  }

  // WARNING: Show-up Rate < 55%
  if (data.calls_dialled > 0) {
    const showUpPercent = showUpRate * 100;
    if (showUpPercent < 55) {
      warnings.push({
        type: 'warning',
        message: 'Show-up rate below 55%',
        field: 'show_up'
      });
    }
  }

  // WARNING: Follow-ups < 5
  if ((data.followed_up || 0) < 5 && data.calls_dialled > 0) {
    warnings.push({
      type: 'warning',
      message: 'Follow-ups less than 5',
      field: 'followed_up'
    });
  }

  // WARNING: Performance Rating ≤ 3
  if (data.performance_rating !== undefined && data.performance_rating <= 3) {
    warnings.push({
      type: 'warning',
      message: 'Performance rating is 3 or less',
      field: 'performance_rating'
    });
  }

  // WARNING: Very High No-Show Rate (existing)
  if (data.calls_dialled > 0) {
    const noShowPercent = noShowRate * 100;
    if (noShowPercent > 50) {
      warnings.push({
        type: 'warning',
        message: 'More than half of calls resulted in no-show',
        field: 'no_show'
      });
    }
  }

  // WARNING: Zero Conversion Despite Opportunity (existing)
  if (data.calls_taken >= 5 && totalRp >= 3) {
    const totalEnrolled = (data.sm_enrolled || 0) + (data.fu_enrolled || 0);
    if (totalEnrolled === 0) {
      warnings.push({
        type: 'warning',
        message: 'No conversions from qualified opportunities',
        field: 'enrolled'
      });
    }
  }

  // ===== INFO ANOMALIES =====

  // INFO: Zero Enrollments Despite High Activity (existing)
  if (data.calls_taken >= 10) {
    const totalEnrolled = (data.sm_enrolled || 0) + (data.fu_enrolled || 0);
    if (totalEnrolled === 0) {
      info.push({
        type: 'info',
        message: 'No enrollments from significant call volume',
        field: 'enrolled'
      });
    }
  }

  // INFO: Perfect/Round Numbers (existing)
  const allRoundNumbers = [
    data.calls_dialled,
    data.calls_taken,
    data.rapport_built || 0,
    data.touched_base || 0,
    data.calls_not_taken || 0,
    data.others || 0,
    data.disqualified || 0,
    data.sm_rp || 0,
    data.sm_enrolled || 0,
    data.fu_rp || 0,
    data.fu_enrolled || 0
  ].filter(val => val > 0).every(val => val % 5 === 0 || val % 10 === 0);

  if (allRoundNumbers && data.calls_dialled >= 10) {
    info.push({
      type: 'info',
      message: 'Data may be estimated - verify accuracy',
      field: 'general'
    });
  }

  // ===== SUCCESS ANOMALIES =====

  // SUCCESS: Great Show-up Rate (>=70%)
  if (showUpRate >= 0.70 && data.calls_dialled >= 10) {
    success.push({
      type: 'success',
      message: 'Great show-up rate!',
      field: 'show_up'
    });
  }

  // SUCCESS: Calls Taken > 6
  if (data.calls_taken > 6) {
    success.push({
      type: 'success',
      message: 'Good call volume!',
      field: 'calls_taken'
    });
  }

  // SUCCESS: Dialled > 25
  if (data.calls_dialled > 25) {
    success.push({
      type: 'success',
      message: 'Excellent call activity!',
      field: 'calls_dialled'
    });
  }

  // SUCCESS: RP Built > 10
  if ((data.rapport_built || 0) > 10) {
    success.push({
      type: 'success',
      message: 'Strong rapport building!',
      field: 'rapport_built'
    });
  }

  // SUCCESS: Exceptional Conversion (existing)
  if (data.calls_taken > 0) {
    const totalEnrolled = (data.sm_enrolled || 0) + (data.fu_enrolled || 0);
    const conversionRate = totalEnrolled / data.calls_taken;
    if (conversionRate > 0.8) {
      success.push({
        type: 'success',
        message: 'Exceptional conversion rate!',
        field: 'conversion'
      });
    }
  }

  return {
    hasAnomalies: critical.length > 0 || warnings.length > 0 || info.length > 0 || success.length > 0,
    critical,
    warnings,
    info,
    success
  };
};

// Get input field border color based on anomaly type
export const getInputBorderClass = (
  value: number,
  relatedValues: { [key: string]: number },
  fieldName: string
): string => {
  const anomalies = detectAnomalies({
    calls_dialled: relatedValues.calls_dialled || 0,
    calls_taken: relatedValues.calls_taken || 0,
    rapport_built: relatedValues.rapport_built,
    touched_base: relatedValues.touched_base,
    calls_not_taken: relatedValues.calls_not_taken,
    others: relatedValues.others,
    disqualified: relatedValues.disqualified,
    followed_up: relatedValues.followed_up,
    sm_rp: relatedValues.sm_rp,
    sm_enrolled: relatedValues.sm_enrolled,
    fu_rp: relatedValues.fu_rp,
    fu_enrolled: relatedValues.fu_enrolled,
    performance_rating: relatedValues.performance_rating,
  });

  // Check if this field has critical issues
  const hasCritical = anomalies.critical.some(a => a.field === fieldName);
  if (hasCritical) return 'border-red-500 focus-visible:ring-red-500';

  // Check if this field has warnings
  const hasWarning = anomalies.warnings.some(a => a.field === fieldName);
  if (hasWarning) return 'border-yellow-500 focus-visible:ring-yellow-500';

  // Check if this field has info
  const hasInfo = anomalies.info.some(a => a.field === fieldName);
  if (hasInfo) return 'border-blue-500 focus-visible:ring-blue-500';

  // Valid data
  if (value > 0) return 'border-green-500 focus-visible:ring-green-500';

  return ''; // Default styling
};
