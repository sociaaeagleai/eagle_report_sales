import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, Star, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardHeader from "@/components/DashboardHeader";
import { AdvancedFilters } from "@/components/admin/AdvancedFilters";
import { SubmissionDetailDialog } from "@/components/admin/SubmissionDetailDialog";
import { ExportMenu } from "@/components/admin/ExportMenu";
import { AnomalyResolutionDialog } from "@/components/admin/AnomalyResolutionDialog";
import { detectAnomalies } from "@/lib/anomalyDetection";
import { isAnomalyResolved, filterUnresolvedAnomalies, type ResolvedAnomaly } from "@/lib/anomalyResolution";

interface SubmissionData {
  id: string;
  date: string;
  user_id: string;
  source: string[];
  calls_dialled: number;
  calls_taken: number;
  rapport_built: number;
  touched_base: number;
  calls_not_taken: number;
  others: number;
  disqualified: number;
  followed_up: number;
  sm_rp: number;
  sm_enrolled: number;
  sm_rp_to_enrolled: number;
  fu_rp: number;
  fu_enrolled: number;
  fu_rp_to_enrolled: number;
  is_crm_updated: string;
  task_completion_status: string | null;
  created_at?: string;
  updated_at?: string;
  attendance?: {
    task_completed: string | null;
    performance_rating: number | null;
    notes: string | null;
    status: string;
  } | null;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  mode: string | null;
}

interface FilterState {
  selectedUsers: string[];
  selectedTeams: string[];
  selectedSources: string[];
  startDate: string;
  endDate: string;
  rapportBuiltMin: string;
  rapportBuiltMax: string;
  callsDialledMin: string;
  callsDialledMax: string;
  callsTakenMin: string;
  callsTakenMax: string;
  touchedBaseMin: string;
  touchedBaseMax: string;
  callsNotTakenMin: string;
  callsNotTakenMax: string;
  othersMin: string;
  othersMax: string;
  disqualifiedMin: string;
  disqualifiedMax: string;
  followedUpMin: string;
  followedUpMax: string;
  anomalyResolutionStatus: string;
  closingTypes: string[];
  smRpMin: string;
  smRpMax: string;
  smEnrolledMin: string;
  smEnrolledMax: string;
  smRpToEnrolledMin: string;
  smRpToEnrolledMax: string;
  fuRpMin: string;
  fuRpMax: string;
  fuEnrolledMin: string;
  fuEnrolledMax: string;
  fuRpToEnrolledMin: string;
  fuRpToEnrolledMax: string;
  dataQuality: string; // 'all' | 'has_critical' | 'has_warnings' | 'has_info' | 'no_issues' | 'anomalies_only'
  selectedAnomalies: string[]; // array of selected anomaly messages
  taskCompletionStatus: string[]; // array of selected task completion statuses
}

const AdminDataView = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<ResolvedAnomaly[]>([]);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<{
    submissionId: string;
    submissionDate: string;
    userName: string;
    anomaly: { type: 'critical' | 'warning' | 'info' | 'success'; message: string; field?: string };
    existingResolution?: ResolvedAnomaly | null;
  } | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    selectedUsers: [],
    selectedTeams: [],
    selectedSources: [],
    startDate: "",
    endDate: "",
    rapportBuiltMin: "",
    rapportBuiltMax: "",
    callsDialledMin: "",
    callsDialledMax: "",
    callsTakenMin: "",
    callsTakenMax: "",
    touchedBaseMin: "",
    touchedBaseMax: "",
    callsNotTakenMin: "",
    callsNotTakenMax: "",
    othersMin: "",
    othersMax: "",
    disqualifiedMin: "",
    disqualifiedMax: "",
    followedUpMin: "",
    followedUpMax: "",
    anomalyResolutionStatus: "all",
    closingTypes: [],
    smRpMin: "",
    smRpMax: "",
    smEnrolledMin: "",
    smEnrolledMax: "",
    smRpToEnrolledMin: "",
    smRpToEnrolledMax: "",
    fuRpMin: "",
    fuRpMax: "",
    fuEnrolledMin: "",
    fuEnrolledMax: "",
    fuRpToEnrolledMin: "",
    fuRpToEnrolledMax: "",
    dataQuality: "all",
    selectedAnomalies: [],
    taskCompletionStatus: [],
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [submissions, filters]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email !== "admin@salestrack.local") {
      navigate("/admin/login");
      return;
    }

    try {
      const { data: submissionsData, error: subError } = await supabase
        .from("daily_submissions")
        .select("*")
        .order("date", { ascending: false });

      if (subError) throw subError;

      const { data: profilesData, error: profError } = await supabase
        .from("profiles")
        .select("id, name, email, role, mode");

      if (profError) throw profError;

      // Fetch attendance data
      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select("user_id, date, task_completed, performance_rating, notes, status");

      if (attError) {
        console.error("Error fetching attendance:", attError);
      }

      // Fetch resolved anomalies
      const { data: resolvedData, error: resolvedError } = await supabase
        .from("anomaly_resolutions" as any)
        .select("*");

      if (resolvedError) {
        console.error("Error fetching resolved anomalies:", resolvedError);
      }

      // Merge attendance data with submissions
      const submissionsWithAttendance = (submissionsData || []).map(sub => {
        const attendance = (attendanceData || []).find(
          att => att.user_id === sub.user_id && att.date === sub.date
        );
        return {
          ...sub,
          attendance: attendance ? {
            task_completed: attendance.task_completed,
            performance_rating: attendance.performance_rating,
            notes: attendance.notes,
            status: attendance.status
          } : null
        };
      });

      setSubmissions(submissionsWithAttendance);
      setProfiles(profilesData || []);
      setResolvedAnomalies((resolvedData as any) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refetchResolvedAnomalies = async () => {
    try {
      const { data, error } = await supabase
        .from("anomaly_resolutions" as any)
        .select("*");

      if (error) throw error;
      setResolvedAnomalies((data as any) || []);
    } catch (error) {
      console.error("Error refetching resolved anomalies:", error);
    }
  };

  const handleAnomalyClick = (
    e: React.MouseEvent,
    submissionId: string,
    submissionDate: string,
    userName: string,
    anomaly: { type: 'critical' | 'warning' | 'info' | 'success'; message: string; field?: string }
  ) => {
    e.stopPropagation();
    const field = anomaly.field || 'general';
    const existingResolution = isAnomalyResolved(submissionId, field, anomaly.message, resolvedAnomalies);
    
    setSelectedAnomaly({
      submissionId,
      submissionDate,
      userName,
      anomaly,
      existingResolution
    });
    setResolutionDialogOpen(true);
  };

  const applyFilters = () => {
    let filtered = [...submissions];

    // Staff filter (multi-select)
    if (filters.selectedUsers.length > 0) {
      filtered = filtered.filter(s => filters.selectedUsers.includes(s.user_id));
    }

    // Team filter (multi-select)
    if (filters.selectedTeams.length > 0) {
      filtered = filtered.filter(s => {
        const userProfile = profiles.find(p => p.id === s.user_id);
        return userProfile && userProfile.mode && filters.selectedTeams.includes(userProfile.mode);
      });
    }

    // Source filter (multi-select) - check if ANY selected source is in the submission's source array
    if (filters.selectedSources.length > 0) {
      filtered = filtered.filter(s => 
        s.source.some(src => filters.selectedSources.includes(src))
      );
    }

    // Date filters
    if (filters.startDate) {
      filtered = filtered.filter(s => s.date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(s => s.date <= filters.endDate);
    }

    // Call activity filters
    if (filters.rapportBuiltMin) {
      filtered = filtered.filter(s => s.rapport_built >= Number(filters.rapportBuiltMin));
    }
    if (filters.rapportBuiltMax) {
      filtered = filtered.filter(s => s.rapport_built <= Number(filters.rapportBuiltMax));
    }
    if (filters.callsDialledMin) {
      filtered = filtered.filter(s => s.calls_dialled >= Number(filters.callsDialledMin));
    }
    if (filters.callsDialledMax) {
      filtered = filtered.filter(s => s.calls_dialled <= Number(filters.callsDialledMax));
    }
    if (filters.callsTakenMin) {
      filtered = filtered.filter(s => s.calls_taken >= Number(filters.callsTakenMin));
    }
    if (filters.callsTakenMax) {
      filtered = filtered.filter(s => s.calls_taken <= Number(filters.callsTakenMax));
    }
    if (filters.touchedBaseMin) {
      filtered = filtered.filter(s => s.touched_base >= Number(filters.touchedBaseMin));
    }
    if (filters.touchedBaseMax) {
      filtered = filtered.filter(s => s.touched_base <= Number(filters.touchedBaseMax));
    }
    if (filters.callsNotTakenMin) {
      filtered = filtered.filter(s => s.calls_not_taken >= Number(filters.callsNotTakenMin));
    }
    if (filters.callsNotTakenMax) {
      filtered = filtered.filter(s => s.calls_not_taken <= Number(filters.callsNotTakenMax));
    }

    // Other activity filters
    if (filters.othersMin) {
      filtered = filtered.filter(s => s.others >= Number(filters.othersMin));
    }
    if (filters.othersMax) {
      filtered = filtered.filter(s => s.others <= Number(filters.othersMax));
    }
    if (filters.disqualifiedMin) {
      filtered = filtered.filter(s => s.disqualified >= Number(filters.disqualifiedMin));
    }
    if (filters.disqualifiedMax) {
      filtered = filtered.filter(s => s.disqualified <= Number(filters.disqualifiedMax));
    }

    // Follow-up activity filters
    if (filters.followedUpMin) {
      filtered = filtered.filter(s => s.followed_up >= Number(filters.followedUpMin));
    }
    if (filters.followedUpMax) {
      filtered = filtered.filter(s => s.followed_up <= Number(filters.followedUpMax));
    }

    // Same Month filters
    if (filters.smRpMin) {
      filtered = filtered.filter(s => s.sm_rp >= Number(filters.smRpMin));
    }
    if (filters.smRpMax) {
      filtered = filtered.filter(s => s.sm_rp <= Number(filters.smRpMax));
    }
    if (filters.smEnrolledMin) {
      filtered = filtered.filter(s => s.sm_enrolled >= Number(filters.smEnrolledMin));
    }
    if (filters.smEnrolledMax) {
      filtered = filtered.filter(s => s.sm_enrolled <= Number(filters.smEnrolledMax));
    }
    if (filters.smRpToEnrolledMin) {
      filtered = filtered.filter(s => s.sm_rp_to_enrolled >= Number(filters.smRpToEnrolledMin));
    }
    if (filters.smRpToEnrolledMax) {
      filtered = filtered.filter(s => s.sm_rp_to_enrolled <= Number(filters.smRpToEnrolledMax));
    }

    // Follow-up filters
    if (filters.fuRpMin) {
      filtered = filtered.filter(s => s.fu_rp >= Number(filters.fuRpMin));
    }
    if (filters.fuRpMax) {
      filtered = filtered.filter(s => s.fu_rp <= Number(filters.fuRpMax));
    }
    if (filters.fuEnrolledMin) {
      filtered = filtered.filter(s => s.fu_enrolled >= Number(filters.fuEnrolledMin));
    }
    if (filters.fuEnrolledMax) {
      filtered = filtered.filter(s => s.fu_enrolled <= Number(filters.fuEnrolledMax));
    }
    if (filters.fuRpToEnrolledMin) {
      filtered = filtered.filter(s => s.fu_rp_to_enrolled >= Number(filters.fuRpToEnrolledMin));
    }
    if (filters.fuRpToEnrolledMax) {
      filtered = filtered.filter(s => s.fu_rp_to_enrolled <= Number(filters.fuRpToEnrolledMax));
    }

    // Data Quality filter - filter by anomalies
    if (filters.dataQuality !== "all") {
      filtered = filtered.filter(s => {
        const anomalies = detectAnomalies({
          calls_dialled: s.calls_dialled,
          calls_taken: s.calls_taken,
          rapport_built: s.rapport_built,
          touched_base: s.touched_base,
          calls_not_taken: s.calls_not_taken,
          others: s.others,
          disqualified: s.disqualified,
          followed_up: s.followed_up,
          sm_rp: s.sm_rp,
          sm_enrolled: s.sm_enrolled,
          fu_rp: s.fu_rp,
          fu_enrolled: s.fu_enrolled,
          performance_rating: s.attendance?.performance_rating ?? undefined,
        });

        const unresolved = {
          critical: filterUnresolvedAnomalies(anomalies.critical, s.id, resolvedAnomalies),
          warnings: filterUnresolvedAnomalies(anomalies.warnings, s.id, resolvedAnomalies),
          info: filterUnresolvedAnomalies(anomalies.info, s.id, resolvedAnomalies),
          success: filterUnresolvedAnomalies(anomalies.success, s.id, resolvedAnomalies)
        };

        switch(filters.dataQuality) {
          case 'has_critical': return unresolved.critical.length > 0;
          case 'has_warnings': return unresolved.warnings.length > 0;
          case 'has_info': return unresolved.info.length > 0 || unresolved.success.length > 0;
          case 'no_issues': return unresolved.critical.length === 0 && unresolved.warnings.length === 0;
          case 'anomalies_only': return unresolved.critical.length > 0 || unresolved.warnings.length > 0 || unresolved.info.length > 0 || unresolved.success.length > 0;
          default: return true;
        }
      });
    }

    // Filter by selected specific anomaly messages
    if (filters.selectedAnomalies.length > 0) {
      filtered = filtered.filter(submission => {
        const anomalies = detectAnomalies({
          calls_dialled: submission.calls_dialled,
          calls_taken: submission.calls_taken,
          rapport_built: submission.rapport_built,
          touched_base: submission.touched_base,
          calls_not_taken: submission.calls_not_taken,
          others: submission.others,
          disqualified: submission.disqualified,
          followed_up: submission.followed_up,
          sm_rp: submission.sm_rp,
          sm_enrolled: submission.sm_enrolled,
          fu_rp: submission.fu_rp,
          fu_enrolled: submission.fu_enrolled,
          performance_rating: submission.attendance?.performance_rating ?? undefined,
        });

        const unresolved = {
          critical: filterUnresolvedAnomalies(anomalies.critical, submission.id, resolvedAnomalies),
          warnings: filterUnresolvedAnomalies(anomalies.warnings, submission.id, resolvedAnomalies),
          info: filterUnresolvedAnomalies(anomalies.info, submission.id, resolvedAnomalies),
          success: filterUnresolvedAnomalies(anomalies.success, submission.id, resolvedAnomalies)
        };

        const allAnomalyMessages = [
          ...unresolved.critical,
          ...unresolved.warnings,
          ...unresolved.info,
          ...unresolved.success
        ].map(a => a.message);

        // Check if submission has ANY of the selected anomaly messages
        return filters.selectedAnomalies.some(selectedMsg => 
          allAnomalyMessages.includes(selectedMsg)
        );
      });
    }

    // Filter by anomaly resolution status
    if (filters.anomalyResolutionStatus === 'resolved' || filters.anomalyResolutionStatus === 'unresolved') {
      filtered = filtered.filter(submission => {
        const anomalies = detectAnomalies({
          calls_dialled: submission.calls_dialled,
          calls_taken: submission.calls_taken,
          rapport_built: submission.rapport_built,
          touched_base: submission.touched_base,
          calls_not_taken: submission.calls_not_taken,
          others: submission.others,
          disqualified: submission.disqualified,
          followed_up: submission.followed_up,
          sm_rp: submission.sm_rp,
          sm_enrolled: submission.sm_enrolled,
          fu_rp: submission.fu_rp,
          fu_enrolled: submission.fu_enrolled,
          performance_rating: submission.attendance?.performance_rating ?? undefined,
        });

        const unresolved = {
          critical: filterUnresolvedAnomalies(anomalies.critical, submission.id, resolvedAnomalies),
          warnings: filterUnresolvedAnomalies(anomalies.warnings, submission.id, resolvedAnomalies),
          info: filterUnresolvedAnomalies(anomalies.info, submission.id, resolvedAnomalies),
          success: filterUnresolvedAnomalies(anomalies.success, submission.id, resolvedAnomalies)
        };

        const totalAnomalies = [
          ...anomalies.critical,
          ...anomalies.warnings,
          ...anomalies.info,
          ...anomalies.success
        ].length;

        const totalUnresolvedAnomalies = [
          ...unresolved.critical,
          ...unresolved.warnings,
          ...unresolved.info,
          ...unresolved.success
        ].length;

        const hasResolvedAnomalies = totalAnomalies > totalUnresolvedAnomalies;
        const hasUnresolvedAnomalies = totalUnresolvedAnomalies > 0;

        if (filters.anomalyResolutionStatus === 'resolved') {
          return hasResolvedAnomalies;
        } else {
          return hasUnresolvedAnomalies;
        }
      });
    }

    // Task Completion Status filter
    if (filters.taskCompletionStatus.length > 0) {
      filtered = filtered.filter(s => 
        s.task_completion_status && filters.taskCompletionStatus.includes(s.task_completion_status)
      );
    }

    setFilteredSubmissions(filtered);
  };

  // Compute anomaly statistics from current filtered submissions
  const computeAnomalyStats = () => {
    const anomalyMap = new Map<string, {
      count: number;
      type: 'critical' | 'warning' | 'info' | 'success';
      field?: string;
    }>();

    filteredSubmissions.forEach(submission => {
      const anomalies = detectAnomalies({
        calls_dialled: submission.calls_dialled,
        calls_taken: submission.calls_taken,
        rapport_built: submission.rapport_built,
        touched_base: submission.touched_base,
        calls_not_taken: submission.calls_not_taken,
        others: submission.others,
        disqualified: submission.disqualified,
        followed_up: submission.followed_up,
        sm_rp: submission.sm_rp,
        sm_enrolled: submission.sm_enrolled,
        fu_rp: submission.fu_rp,
        fu_enrolled: submission.fu_enrolled,
        performance_rating: submission.attendance?.performance_rating ?? undefined,
      });

      const unresolved = {
        critical: filterUnresolvedAnomalies(anomalies.critical, submission.id, resolvedAnomalies),
        warnings: filterUnresolvedAnomalies(anomalies.warnings, submission.id, resolvedAnomalies),
        info: filterUnresolvedAnomalies(anomalies.info, submission.id, resolvedAnomalies),
        success: filterUnresolvedAnomalies(anomalies.success, submission.id, resolvedAnomalies)
      };

      // Count each unique message with proper type assignment
      unresolved.critical.forEach(anomaly => {
        const existing = anomalyMap.get(anomaly.message);
        if (existing) {
          existing.count++;
        } else {
          anomalyMap.set(anomaly.message, {
            count: 1,
            type: 'critical',
            field: anomaly.field
          });
        }
      });

      unresolved.warnings.forEach(anomaly => {
        const existing = anomalyMap.get(anomaly.message);
        if (existing) {
          existing.count++;
        } else {
          anomalyMap.set(anomaly.message, {
            count: 1,
            type: 'warning',
            field: anomaly.field
          });
        }
      });

      unresolved.info.forEach(anomaly => {
        const existing = anomalyMap.get(anomaly.message);
        if (existing) {
          existing.count++;
        } else {
          anomalyMap.set(anomaly.message, {
            count: 1,
            type: 'info',
            field: anomaly.field
          });
        }
      });

      unresolved.success.forEach(anomaly => {
        const existing = anomalyMap.get(anomaly.message);
        if (existing) {
          existing.count++;
        } else {
          anomalyMap.set(anomaly.message, {
            count: 1,
            type: 'success',
            field: anomaly.field
          });
        }
      });
    });

    return Array.from(anomalyMap.entries())
      .map(([message, stats]) => ({ message, ...stats }))
      .sort((a, b) => {
        // Sort: critical → warning → info → success, then by count descending
        const typeOrder = { critical: 0, warning: 1, info: 2, success: 3 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type];
        }
        return b.count - a.count;
      });
  };

  const anomalyStats = computeAnomalyStats();

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return "0.00";
    return ((value / total) * 100).toFixed(2);
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.name || "Unknown";
  };

  const getUserProfile = (userId: string) => {
    return profiles.find(p => p.id === userId);
  };

  const handleRowClick = (submission: SubmissionData) => {
    setSelectedSubmission(submission);
    setDetailDialogOpen(true);
  };

  const getPerformanceBadgeVariant = (percent: number): "default" | "secondary" | "destructive" => {
    if (percent >= 70) return "default";
    if (percent >= 40) return "secondary";
    return "destructive";
  };

  // Get unique sources - flatten source arrays and get unique values
  const uniqueSources = Array.from(new Set(submissions.flatMap(s => s.source))).sort();

  // Calculate anomaly count
  const anomalyCount = filteredSubmissions.filter(s => {
    const anomalies = detectAnomalies({
      calls_dialled: s.calls_dialled,
      calls_taken: s.calls_taken,
      rapport_built: s.rapport_built,
      touched_base: s.touched_base,
      calls_not_taken: s.calls_not_taken,
      others: s.others,
      disqualified: s.disqualified,
      followed_up: s.followed_up,
      sm_rp: s.sm_rp,
      sm_enrolled: s.sm_enrolled,
      fu_rp: s.fu_rp,
      fu_enrolled: s.fu_enrolled,
      performance_rating: s.attendance?.performance_rating ?? undefined,
    });
    return anomalies.hasAnomalies;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Sales Data</h1>
              <p className="text-muted-foreground">Comprehensive view of all employee submissions</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
              <ExportMenu data={filteredSubmissions} getUserName={getUserName} />
            </div>
          </div>
        </div>

        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Advanced Filters</CardTitle>
              <CardDescription>Apply comprehensive filters to narrow down results</CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedFilters 
                filters={filters}
                onFilterChange={setFilters}
                profiles={profiles}
                sources={uniqueSources}
              />
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Submission Records ({filteredSubmissions.length})
                  {anomalyCount > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {anomalyCount} anomal{anomalyCount !== 1 ? 'ies' : 'y'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{anomalyCount} record{anomalyCount !== 1 ? 's' : ''} with data quality issues</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
                <CardDescription>Click any row to view detailed breakdown</CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                {/* Quick severity filters */}
                <Select 
                  value={filters.dataQuality} 
                  onValueChange={(v) => setFilters({...filters, dataQuality: v})}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Data</SelectItem>
                    <SelectItem value="has_critical">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Has Critical Issues
                      </span>
                    </SelectItem>
                    <SelectItem value="has_warnings">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Has Warnings
                      </span>
                    </SelectItem>
                    <SelectItem value="has_info">
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        Has Info/Success
                      </span>
                    </SelectItem>
                    <SelectItem value="no_issues">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        No Issues
                      </span>
                    </SelectItem>
                    <SelectItem value="anomalies_only">Any Anomalies</SelectItem>
                  </SelectContent>
                </Select>

                {/* Resolution status filter */}
                <Select 
                  value={filters.anomalyResolutionStatus} 
                  onValueChange={(v) => setFilters({...filters, anomalyResolutionStatus: v})}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Resolution status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Anomalies</SelectItem>
                    <SelectItem value="unresolved">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Unresolved Only
                      </span>
                    </SelectItem>
                    <SelectItem value="resolved">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Resolved Only
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Dynamic anomaly message filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[250px] justify-between">
                      {filters.selectedAnomalies.length > 0 
                        ? `${filters.selectedAnomalies.length} anomaly type(s) selected`
                        : "Filter by specific anomalies"
                      }
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search anomaly types..." />
                      <CommandEmpty>No anomalies found</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {anomalyStats.map(stat => (
                          <CommandItem
                            key={stat.message}
                            onSelect={() => {
                              setFilters(prev => ({
                                ...prev,
                                selectedAnomalies: prev.selectedAnomalies.includes(stat.message)
                                  ? prev.selectedAnomalies.filter(m => m !== stat.message)
                                  : [...prev.selectedAnomalies, stat.message]
                              }));
                            }}
                          >
                            <Checkbox
                              checked={filters.selectedAnomalies.includes(stat.message)}
                              className="mr-2"
                            />
                            <Badge 
                              variant={
                                stat.type === 'critical' ? 'destructive' :
                                stat.type === 'warning' ? 'warning' :
                                stat.type === 'info' ? 'info' : 'success'
                              }
                              className="mr-2 shrink-0"
                            >
                              {stat.count}
                            </Badge>
                            <span className="text-sm truncate">{stat.message}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                    {filters.selectedAnomalies.length > 0 && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFilters({...filters, selectedAnomalies: []})}
                          className="w-full"
                        >
                          Clear selection
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8">Loading...</p>
            ) : filteredSubmissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[90px]">Day</TableHead>
                      <TableHead className="min-w-[150px]">Entered At</TableHead>
                      <TableHead className="w-[180px]">Anomalies</TableHead>
                      <TableHead className="min-w-[120px]">Employee</TableHead>
                      <TableHead className="min-w-[180px]">Email</TableHead>
                      <TableHead className="min-w-[80px]">Role</TableHead>
                      <TableHead className="min-w-[80px]">Team</TableHead>
                      <TableHead className="min-w-[100px]">Source</TableHead>
                      <TableHead>Rapport Built</TableHead>
                      <TableHead>Dialled</TableHead>
                      <TableHead>Taken</TableHead>
                      <TableHead>Touched base</TableHead>
                      <TableHead>Not Taken</TableHead>
                      <TableHead>Others</TableHead>
                      <TableHead>Disq.</TableHead>
                      <TableHead>Follow-ups</TableHead>
                      <TableHead>Show-up %</TableHead>
                      <TableHead>No Show %</TableHead>
                      <TableHead>SM: RP</TableHead>
                      <TableHead>SM: Enr.</TableHead>
                      <TableHead>SM: RP→E</TableHead>
                      <TableHead>SM %</TableHead>
                      <TableHead>FU: RP</TableHead>
                      <TableHead>FU: Enr.</TableHead>
                      <TableHead>FU: RP→E</TableHead>
                      <TableHead>FU %</TableHead>
                      <TableHead className="min-w-[100px]">CRM Updated</TableHead>
                      <TableHead className="min-w-[120px]">Task Status</TableHead>
                      <TableHead className="min-w-[120px]">Task Completed</TableHead>
                      <TableHead className="min-w-[140px]">Performance Rating</TableHead>
                      <TableHead className="min-w-[150px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => {
                      const showUpPercent = Number(calculatePercentage(submission.calls_taken, submission.calls_dialled));
                      const noShowUpPercent = Number(calculatePercentage(submission.calls_not_taken + submission.touched_base + submission.others, submission.calls_dialled));
                      const smClosingPercent = Number(calculatePercentage(submission.sm_rp + submission.sm_enrolled, submission.calls_taken));
                      const fuClosingPercent = Number(calculatePercentage(submission.fu_rp + submission.fu_enrolled, submission.calls_taken));
                      const userProfile = getUserProfile(submission.user_id);
                      
                      // Detect anomalies for this submission
                      const anomalies = detectAnomalies({
                        calls_dialled: submission.calls_dialled,
                        calls_taken: submission.calls_taken,
                        rapport_built: submission.rapport_built,
                        touched_base: submission.touched_base,
                        calls_not_taken: submission.calls_not_taken,
                        others: submission.others,
                        disqualified: submission.disqualified,
                        followed_up: submission.followed_up,
                        sm_rp: submission.sm_rp,
                        sm_enrolled: submission.sm_enrolled,
                        fu_rp: submission.fu_rp,
                        fu_enrolled: submission.fu_enrolled,
                        performance_rating: submission.attendance?.performance_rating ?? undefined,
                      });

                      // Filter out resolved anomalies for row color priority
                      const unresolvedCritical = filterUnresolvedAnomalies(anomalies.critical, submission.id, resolvedAnomalies);
                      const unresolvedWarnings = filterUnresolvedAnomalies(anomalies.warnings, submission.id, resolvedAnomalies);
                      const unresolvedInfo = filterUnresolvedAnomalies(anomalies.info, submission.id, resolvedAnomalies);
                      const unresolvedSuccess = filterUnresolvedAnomalies(anomalies.success, submission.id, resolvedAnomalies);

                      // Determine row styling based on UNRESOLVED anomalies only
                      const hasCritical = unresolvedCritical.length > 0;
                      const hasWarnings = unresolvedWarnings.length > 0;
                      const hasSuccess = unresolvedSuccess.length > 0 && unresolvedCritical.length === 0 && unresolvedWarnings.length === 0;
                      
                      let rowClass = "cursor-pointer hover:bg-muted/50 transition-colors";
                      if (hasCritical) rowClass += " bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500";
                      else if (hasWarnings) rowClass += " bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500";
                      else if (hasSuccess) rowClass += " bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500";

                      const userName = getUserName(submission.user_id);

                      return (
                        <TableRow 
                          key={submission.id}
                          className={rowClass}
                          onClick={() => handleRowClick(submission)}
                        >
                          <TableCell className="font-medium">
                            <div className="whitespace-nowrap">
                              {new Date(submission.date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(submission.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {submission.created_at ? new Date(submission.created_at).toLocaleString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZoneName: 'short'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex gap-1 flex-wrap">
                                    {unresolvedCritical.length > 0 && (
                                      <Badge 
                                        variant="destructive" 
                                        className="cursor-pointer text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAnomalyClick(e, submission.id, submission.date, userName, { ...unresolvedCritical[0], type: 'critical' });
                                        }}
                                      >
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {unresolvedCritical.length}
                                      </Badge>
                                    )}
                                    {unresolvedWarnings.length > 0 && (
                                      <Badge 
                                        variant="default" 
                                        className="cursor-pointer text-xs bg-yellow-500 hover:bg-yellow-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAnomalyClick(e, submission.id, submission.date, userName, { ...unresolvedWarnings[0], type: 'warning' });
                                        }}
                                      >
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {unresolvedWarnings.length}
                                      </Badge>
                                    )}
                                    {unresolvedInfo.length > 0 && (
                                      <Badge 
                                        variant="secondary" 
                                        className="cursor-pointer text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAnomalyClick(e, submission.id, submission.date, userName, { ...unresolvedInfo[0], type: 'info' });
                                        }}
                                      >
                                        <Info className="h-3 w-3 mr-1" />
                                        {unresolvedInfo.length}
                                      </Badge>
                                    )}
                                    {unresolvedSuccess.length > 0 && (
                                      <Badge 
                                        variant="outline" 
                                        className="cursor-pointer text-xs border-green-500 text-green-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAnomalyClick(e, submission.id, submission.date, userName, { ...unresolvedSuccess[0], type: 'success' });
                                        }}
                                      >
                                        <Star className="h-3 w-3 mr-1" />
                                        {unresolvedSuccess.length}
                                      </Badge>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[400px] max-h-[300px] overflow-y-auto">
                                  <div className="space-y-3">
                                    {unresolvedCritical.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="font-semibold text-red-500 flex items-center gap-1">
                                          <AlertTriangle className="h-4 w-4" />
                                          Critical Issues ({unresolvedCritical.length})
                                        </p>
                                        {unresolvedCritical.map((anomaly, i) => (
                                          <p key={`crit-${i}`} className="text-xs pl-5">• {anomaly.message}</p>
                                        ))}
                                      </div>
                                    )}
                                    {unresolvedWarnings.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="font-semibold text-yellow-500 flex items-center gap-1">
                                          <AlertCircle className="h-4 w-4" />
                                          Warnings ({unresolvedWarnings.length})
                                        </p>
                                        {unresolvedWarnings.map((anomaly, i) => (
                                          <p key={`warn-${i}`} className="text-xs pl-5">• {anomaly.message}</p>
                                        ))}
                                      </div>
                                    )}
                                    {unresolvedInfo.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="font-semibold text-blue-500 flex items-center gap-1">
                                          <Info className="h-4 w-4" />
                                          Info ({unresolvedInfo.length})
                                        </p>
                                        {unresolvedInfo.map((anomaly, i) => (
                                          <p key={`info-${i}`} className="text-xs pl-5">• {anomaly.message}</p>
                                        ))}
                                      </div>
                                    )}
                                    {unresolvedSuccess.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="font-semibold text-green-500 flex items-center gap-1">
                                          <Star className="h-4 w-4" />
                                          Success ({unresolvedSuccess.length})
                                        </p>
                                        {unresolvedSuccess.map((anomaly, i) => (
                                          <p key={`success-${i}`} className="text-xs pl-5">• {anomaly.message}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="font-medium">{userProfile?.name || "Unknown"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{userProfile?.email || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {userProfile?.role || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {userProfile?.mode || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {submission.source.map((src, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {src}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.rapport_built}
                              {anomalies.warnings.filter(a => a.field === 'activities').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.calls_dialled}
                              {anomalies.critical.filter(a => a.field === 'activities').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-orange-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              {submission.calls_taken}
                              {anomalies.critical.filter(a => a.field === 'calls_taken').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertTriangle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-red-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                              {anomalies.warnings.filter(a => a.field === 'calls_taken').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-orange-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                              {anomalies.warnings.filter(a => a.field === 'rp').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>{submission.touched_base}</TableCell>
                          <TableCell className="text-destructive">{submission.calls_not_taken}</TableCell>
                          <TableCell>{submission.others}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.disqualified}
                              {anomalies.warnings.filter(a => a.field === 'disqualified').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.followed_up}
                              {anomalies.warnings.filter(a => a.field === 'followed_up').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={getPerformanceBadgeVariant(showUpPercent)} className="text-xs">
                                {showUpPercent.toFixed(1)}%
                              </Badge>
                              {[...anomalies.critical, ...anomalies.warnings, ...anomalies.success].filter(a => a.field === 'show_up').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                const IconComponent = anomaly.type === 'critical' ? AlertTriangle : anomaly.type === 'success' ? Star : AlertCircle;
                                const iconColor = resolved ? "text-gray-400" : anomaly.type === 'critical' ? "text-red-500" : anomaly.type === 'success' ? "text-green-500" : "text-yellow-500";
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <IconComponent className={`h-3.5 w-3.5 ${iconColor} ${anomaly.type === 'success' ? 'fill-current' : ''}`} />
                                          {resolved && <CheckCircle2 className="h-2 w-2 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${anomalies.warnings.some(a => a.field === 'no_show') ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                {noShowUpPercent.toFixed(1)}%
                              </span>
                              {anomalies.warnings.filter(a => a.field === 'no_show').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-red-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.sm_rp}
                              {anomalies.warnings.filter(a => a.field === 'rp').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            <div className="flex items-center gap-2">
                              {submission.sm_enrolled}
                              {anomalies.info.filter(a => a.field === 'enrolled').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <Info className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-blue-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                              {anomalies.warnings.filter(a => a.field === 'enrolled').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-orange-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>{submission.sm_rp_to_enrolled}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={getPerformanceBadgeVariant(smClosingPercent)} className="text-xs">
                                {anomalies.success.filter(a => a.field === 'conversion').map((anomaly, idx) => {
                                  const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                  return (
                                    <TooltipProvider key={idx}>
                                      <Tooltip>
                                        <TooltipTrigger
                                          onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                          className="cursor-pointer"
                                        >
                                          <div className="relative inline-flex items-center">
                                            <Star className={resolved ? "h-3 w-3 mr-1 text-gray-400 fill-gray-400" : "h-3 w-3 mr-1 fill-current"} />
                                            {resolved && <CheckCircle2 className="h-2 w-2 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {resolved ? (
                                            <div className="text-xs space-y-1">
                                              <p className="font-medium text-green-500">✓ Resolved</p>
                                              <p className="text-muted-foreground">{anomaly.message}</p>
                                              {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                            </div>
                                          ) : (
                                            <p className="font-medium">{anomaly.message}</p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                                {smClosingPercent.toFixed(1)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.fu_rp}
                              {anomalies.warnings.filter(a => a.field === 'rp').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            <div className="flex items-center gap-2">
                              {submission.fu_enrolled}
                              {anomalies.info.filter(a => a.field === 'enrolled').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <Info className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-blue-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                              {anomalies.warnings.filter(a => a.field === 'enrolled').map((anomaly, idx) => {
                                const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                return (
                                  <TooltipProvider key={idx}>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                        className="cursor-pointer"
                                      >
                                        <div className="relative">
                                          <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                          {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {resolved ? (
                                          <div className="text-xs space-y-1">
                                            <p className="font-medium text-green-500">✓ Resolved</p>
                                            <p className="text-muted-foreground">{anomaly.message}</p>
                                            {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                          </div>
                                        ) : (
                                          <p className="font-medium">{anomaly.message}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>{submission.fu_rp_to_enrolled}</TableCell>
                          <TableCell>
                            <Badge variant={getPerformanceBadgeVariant(fuClosingPercent)} className="text-xs">
                              {fuClosingPercent.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={submission.is_crm_updated === 'Yes' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {submission.is_crm_updated}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {submission.task_completion_status ? (
                              <Badge 
                                variant={
                                  submission.task_completion_status === 'Yes (100%)' ? 'success' :
                                  submission.task_completion_status === 'Not yet' ? 'warning' :
                                  'info'
                                }
                                className="text-xs"
                              >
                                {submission.task_completion_status}
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {submission.attendance?.task_completed ? (
                              <Badge 
                                variant={submission.attendance.task_completed.includes("100%") ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {submission.attendance.task_completed}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not marked</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.attendance?.performance_rating ? (
                              <div className="flex items-center gap-1">
                                <Badge 
                                  variant={submission.attendance.performance_rating >= 4 ? "default" : 
                                          submission.attendance.performance_rating >= 3 ? "secondary" : "destructive"}
                                  className="text-xs"
                                >
                                  {submission.attendance.performance_rating}/5
                                </Badge>
                                {submission.attendance.performance_rating >= 4 && (
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                )}
                                {anomalies.warnings.filter(a => a.field === 'performance_rating').map((anomaly, idx) => {
                                  const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                  return (
                                    <TooltipProvider key={idx}>
                                      <Tooltip>
                                        <TooltipTrigger
                                          onClick={(e) => handleAnomalyClick(e, submission.id, submission.date, userName, anomaly)}
                                          className="cursor-pointer"
                                        >
                                          <div className="relative">
                                            <AlertCircle className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-yellow-500"} />
                                            {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {resolved ? (
                                            <div className="text-xs space-y-1">
                                              <p className="font-medium text-green-500">✓ Resolved</p>
                                              <p className="text-muted-foreground">{anomaly.message}</p>
                                              {resolved.resolution_note && <p className="italic">Note: {resolved.resolution_note}</p>}
                                            </div>
                                          ) : (
                                            <p className="font-medium">{anomaly.message}</p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not rated</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.attendance?.notes ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="text-xs text-muted-foreground truncate max-w-[150px] block">
                                    {submission.attendance.notes}
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>{submission.attendance.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground text-xs">No notes</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {filteredSubmissions.length > 0 && (() => {
                      // Calculate totals
                      const totals = filteredSubmissions.reduce((acc, sub) => ({
                        calls_dialled: acc.calls_dialled + sub.calls_dialled,
                        calls_taken: acc.calls_taken + sub.calls_taken,
                        rapport_built: acc.rapport_built + sub.rapport_built,
                        touched_base: acc.touched_base + sub.touched_base,
                        calls_not_taken: acc.calls_not_taken + sub.calls_not_taken,
                        others: acc.others + sub.others,
                        disqualified: acc.disqualified + sub.disqualified,
                        followed_up: acc.followed_up + sub.followed_up,
                        sm_rp: acc.sm_rp + sub.sm_rp,
                        sm_enrolled: acc.sm_enrolled + sub.sm_enrolled,
                        sm_rp_to_enrolled: acc.sm_rp_to_enrolled + sub.sm_rp_to_enrolled,
                        fu_rp: acc.fu_rp + sub.fu_rp,
                        fu_enrolled: acc.fu_enrolled + sub.fu_enrolled,
                        fu_rp_to_enrolled: acc.fu_rp_to_enrolled + sub.fu_rp_to_enrolled,
                      }), {
                        calls_dialled: 0,
                        calls_taken: 0,
                        rapport_built: 0,
                        touched_base: 0,
                        calls_not_taken: 0,
                        others: 0,
                        disqualified: 0,
                        followed_up: 0,
                        sm_rp: 0,
                        sm_enrolled: 0,
                        sm_rp_to_enrolled: 0,
                        fu_rp: 0,
                        fu_enrolled: 0,
                        fu_rp_to_enrolled: 0,
                      });

                      const uniqueSourcesCount = new Set(filteredSubmissions.flatMap(s => s.source)).size;
                      const totalShowUpPercent = Number(calculatePercentage(totals.calls_taken, totals.calls_dialled));
                      const totalNoShowUpPercent = Number(calculatePercentage(totals.calls_not_taken + totals.touched_base + totals.others, totals.calls_dialled));
                      const totalSMPercent = Number(calculatePercentage(totals.sm_rp + totals.sm_enrolled, totals.calls_taken));
                      const totalFUPercent = Number(calculatePercentage(totals.fu_rp + totals.fu_enrolled, totals.calls_taken));

                      return (
                        <TableRow className="bg-muted/50 font-bold border-t-2 border-primary hover:bg-muted/50">
                          <TableCell colSpan={8} className="text-base">TOTAL</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {uniqueSourcesCount} source{uniqueSourcesCount !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell>{totals.rapport_built}</TableCell>
                          <TableCell>{totals.calls_dialled}</TableCell>
                          <TableCell className="font-bold">{totals.calls_taken}</TableCell>
                          <TableCell>{totals.touched_base}</TableCell>
                          <TableCell className="text-destructive">{totals.calls_not_taken}</TableCell>
                          <TableCell>{totals.others}</TableCell>
                          <TableCell>{totals.disqualified}</TableCell>
                          <TableCell>{totals.followed_up}</TableCell>
                          <TableCell>
                            <Badge variant={getPerformanceBadgeVariant(totalShowUpPercent)} className="text-xs font-semibold">
                              {totalShowUpPercent.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold">{totalNoShowUpPercent.toFixed(1)}%</span>
                          </TableCell>
                          <TableCell>{totals.sm_rp}</TableCell>
                          <TableCell className="font-bold text-green-600">{totals.sm_enrolled}</TableCell>
                          <TableCell>{totals.sm_rp_to_enrolled}</TableCell>
                          <TableCell>
                            <Badge variant={getPerformanceBadgeVariant(totalSMPercent)} className="text-xs font-semibold">
                              {totalSMPercent.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>{totals.fu_rp}</TableCell>
                          <TableCell className="font-bold text-blue-600">{totals.fu_enrolled}</TableCell>
                          <TableCell>{totals.fu_rp_to_enrolled}</TableCell>
                          <TableCell>
                            <Badge variant={getPerformanceBadgeVariant(totalFUPercent)} className="text-xs font-semibold">
                              {totalFUPercent.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">-</TableCell>
                          <TableCell className="text-muted-foreground text-xs">-</TableCell>
                          <TableCell className="text-muted-foreground text-xs">-</TableCell>
                          <TableCell className="text-muted-foreground text-xs">-</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <SubmissionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        submission={selectedSubmission}
        userProfile={selectedSubmission ? getUserProfile(selectedSubmission.user_id) : undefined}
      />

      {selectedAnomaly && (
        <AnomalyResolutionDialog
          open={resolutionDialogOpen}
          onOpenChange={setResolutionDialogOpen}
          submissionId={selectedAnomaly.submissionId}
          submissionDate={selectedAnomaly.submissionDate}
          userName={selectedAnomaly.userName}
          anomaly={selectedAnomaly.anomaly}
          existingResolution={selectedAnomaly.existingResolution}
          onResolutionChange={refetchResolvedAnomalies}
        />
      )}
    </div>
  );
};

export default AdminDataView;
