import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Filter, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, Star, CheckCircle2, StickyNote, Flag, Edit3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DashboardHeader from "@/components/DashboardHeader";
import { DataPagination } from "@/components/ui/DataPagination";
import { AdvancedFilters } from "@/components/admin/AdvancedFilters";
import { SubmissionDetailDialog } from "@/components/admin/SubmissionDetailDialog";
import { ExportMenu } from "@/components/admin/ExportMenu";
import { AnomalyResolutionDialog } from "@/components/admin/AnomalyResolutionDialog";
import { AddBlackMarkDialog } from "@/components/admin/AddBlackMarkDialog";
import { SelectionBar } from "@/components/admin/SelectionBar";
import { EditableCell } from "@/components/admin/EditableCell";
import { detectAnomalies } from "@/lib/anomalyDetection";
import { isAnomalyResolved, filterUnresolvedAnomalies, type ResolvedAnomaly } from "@/lib/anomalyResolution";
import { fetchManualAnomalies, getUnresolvedManualAnomalies, getResolvedManualAnomalies, type ManualAnomaly } from "@/lib/manualAnomalies";
import { getBatchForSource, requiresSubSource } from "@/lib/sourceBatches";
import { fetchSubmissionTotals, type TotalsData } from "@/lib/serverSidePagination";
import { toast } from "sonner";

interface SubmissionData {
  id: string;
  date: string;
  user_id: string;
  source: string[];
  sub_source: string | null;
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
  admin_notes?: string | null;
  isAbsentOnly?: boolean;
  attendance?: {
    task_completed: string | null;
    performance_rating: number | null;
    notes: string | null;
    status: string;
    absence_type?: string | null;
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
  selectedSubSources: string[];
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
  dataQuality: string;
  selectedAnomalies: string[];
  taskCompletionStatus: string[];
  attendanceStatus: string;
  absenceType: string[];
  adminNotesSearch: string;
  hasAdminNotes: string;
  attendanceNotesSearch: string;
  hasAttendanceNotes: string;
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
    anomaly: { type: 'critical' | 'warning' | 'info' | 'success' | 'blackmark'; message: string; field?: string; isManual?: boolean; manualAnomalyId?: string };
    existingResolution?: ResolvedAnomaly | null;
  } | null>(null);
  const [editingNoteSubmissionId, setEditingNoteSubmissionId] = useState<string | null>(null);
  const [tempNoteValue, setTempNoteValue] = useState<string>("");
  const [manualAnomalies, setManualAnomalies] = useState<ManualAnomaly[]>([]);
  const [blackMarkDialogOpen, setBlackMarkDialogOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  
  // Totals state
  const [filteredTotals, setFilteredTotals] = useState<TotalsData | null>(null);
  const [selectedTotals, setSelectedTotals] = useState<TotalsData | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    selectedUsers: [],
    selectedTeams: [],
    selectedSources: [],
    selectedSubSources: [],
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
    attendanceStatus: "all",
    absenceType: [],
    adminNotesSearch: "",
    hasAdminNotes: "all",
    attendanceNotesSearch: "",
    hasAttendanceNotes: "all",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [submissions, filters]);

  // Update totalCount when filteredSubmissions changes
  useEffect(() => {
    setTotalCount(filteredSubmissions.length);
  }, [filteredSubmissions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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
        .select("user_id, date, task_completed, performance_rating, notes, status, absence_type");

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

      // Fetch manual anomalies (BLACK MARKS)
      const manualAnomaliesData = await fetchManualAnomalies();
      setManualAnomalies(manualAnomaliesData);

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
            status: attendance.status,
            absence_type: attendance.absence_type
          } : null
        };
      });

      // Create virtual submissions for absent-only employees (no submission for that day)
      const existingUserDatePairs = new Set(
        (submissionsData || []).map(s => `${s.user_id}_${s.date}`)
      );
      
      const absentOnlyRecords = (attendanceData || [])
        .filter(att => 
          att.status === 'absent' && 
          !existingUserDatePairs.has(`${att.user_id}_${att.date}`)
        )
        .map(att => ({
          id: `absent-${att.user_id}-${att.date}`,
          date: att.date,
          user_id: att.user_id,
          source: [],
          sub_source: null,
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
          is_crm_updated: 'N/A',
          task_completion_status: null,
          admin_notes: null,
          created_at: undefined,
          updated_at: undefined,
          isAbsentOnly: true,
          attendance: {
            task_completed: null,
            performance_rating: null,
            notes: att.notes,
            status: att.status,
            absence_type: att.absence_type
          }
        }));
      
      // Combine both and sort by date descending, ensuring proper types
      const allRecords = [...submissionsWithAttendance, ...absentOnlyRecords]
        .map(record => ({
          ...record,
          source: Array.isArray(record.source) ? record.source : 
                  (record.source ? JSON.parse(record.source as string) : [])
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setSubmissions(allRecords);
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

  const refetchManualAnomalies = async () => {
    try {
      const data = await fetchManualAnomalies();
      setManualAnomalies(data);
    } catch (error) {
      console.error("Error refetching manual anomalies:", error);
    }
  };

  const handleBlackMarkAdded = () => {
    refetchManualAnomalies();
  };

  const handleAnomalyClick = (
    e: React.MouseEvent,
    submissionId: string,
    submissionDate: string,
    userName: string,
    anomaly: { type: 'critical' | 'warning' | 'info' | 'success' | 'blackmark'; message: string; field?: string; isManual?: boolean; manualAnomalyId?: string }
  ) => {
    e.stopPropagation();
    const field = anomaly.field || 'general';
    
    // For manual anomalies, check if resolved by looking at resolved_at
    const existingResolution = anomaly.isManual && anomaly.manualAnomalyId
      ? (manualAnomalies.find(m => m.id === anomaly.manualAnomalyId && m.resolved_at !== null) ? {} as any : null)
      : isAnomalyResolved(submissionId, field, anomaly.message, resolvedAnomalies);
    
    setSelectedAnomaly({
      submissionId,
      submissionDate,
      userName,
      anomaly,
      existingResolution
    });
    setResolutionDialogOpen(true);
  };

  const handleSaveNote = async (submissionId: string, note: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const submission = submissions.find(s => s.id === submissionId);
      
      if (submission?.isAbsentOnly) {
        // For absent-only rows, save to attendance.notes
        const { error } = await supabase
          .from("attendance")
          .update({ 
            notes: note,
            notes_updated_at: new Date().toISOString(),
            notes_updated_by: session.user.id
          })
          .eq("user_id", submission.user_id)
          .eq("date", submission.date);

        if (error) throw error;

        // Update local state
        setSubmissions(prev => prev.map(s => 
          s.id === submissionId 
            ? { ...s, attendance: { ...s.attendance!, notes: note } } 
            : s
        ));
      } else {
        // For normal submissions, save to daily_submissions.admin_notes
        const { error } = await supabase
          .from("daily_submissions")
          .update({ 
            admin_notes: note,
            admin_notes_updated_at: new Date().toISOString(),
            admin_notes_updated_by: session.user.id
          })
          .eq("id", submissionId);

        if (error) throw error;

        // Update local state
        setSubmissions(prev => prev.map(s => 
          s.id === submissionId ? { ...s, admin_notes: note } : s
        ));
      }
      
      setEditingNoteSubmissionId(null);
      setTempNoteValue("");
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const handleNoteClick = (e: React.MouseEvent, submission: SubmissionData) => {
    e.stopPropagation();
    setEditingNoteSubmissionId(submission.id);
    // For absent-only rows, use attendance.notes instead of admin_notes
    const noteValue = submission.isAbsentOnly 
      ? (submission.attendance?.notes || "")
      : (submission.admin_notes || "");
    setTempNoteValue(noteValue);
  };

  // Multi-select helpers
  const toggleRowSelection = (rowId: string) => {
    const newSelection = new Set(selectedRowIds);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    setSelectedRowIds(newSelection);
  };

  const selectAllOnPage = () => {
    const pageIds = new Set(paginatedSubmissions.map(s => s.id));
    setSelectedRowIds(pageIds);
  };

  const selectAllFiltered = () => {
    const allIds = new Set(filteredSubmissions.map(s => s.id));
    setSelectedRowIds(allIds);
  };

  const clearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAllOnPage();
    } else {
      clearSelection();
    }
  };

  // Determine selection mode
  const selectionMode = (() => {
    if (selectedRowIds.size === 0) return 'none';
    if (selectedRowIds.size === filteredSubmissions.length) return 'all-filtered';
    return 'specific';
  })();

  // Bulk action handlers
  const handleExportSelected = () => {
    const selectedData = filteredSubmissions.filter(s => selectedRowIds.has(s.id));
    if (selectedData.length === 0) {
      toast.error("No rows selected");
      return;
    }
    // Export selected data - the ExportMenu component will handle this
    toast.success(`Exporting ${selectedData.length} selected rows`);
  };

  const handleBulkResolveAnomalies = async () => {
    const selectedData = filteredSubmissions.filter(s => selectedRowIds.has(s.id));
    if (selectedData.length === 0) {
      toast.error("No rows selected");
      return;
    }

    if (!window.confirm(`Resolve all unresolved anomalies for ${selectedData.length} selected submissions?`)) {
      return;
    }

    let resolvedCount = 0;
    let errorCount = 0;

    for (const submission of selectedData) {
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

      // Resolve critical anomalies
      for (const anomaly of unresolved.critical) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          const { error } = await supabase
            .from("anomaly_resolutions")
            .insert({
              submission_id: submission.id,
              anomaly_type: 'critical',
              anomaly_field: anomaly.field || 'general',
              anomaly_message: anomaly.message,
              resolved_by: user.id,
              resolution_note: "Bulk resolved by admin"
            });

          if (error) {
            if (!error.message.includes('duplicate')) {
              errorCount++;
            }
          } else {
            resolvedCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      // Resolve warning anomalies
      for (const anomaly of unresolved.warnings) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          const { error } = await supabase
            .from("anomaly_resolutions")
            .insert({
              submission_id: submission.id,
              anomaly_type: 'warning',
              anomaly_field: anomaly.field || 'general',
              anomaly_message: anomaly.message,
              resolved_by: user.id,
              resolution_note: "Bulk resolved by admin"
            });

          if (error) {
            if (!error.message.includes('duplicate')) {
              errorCount++;
            }
          } else {
            resolvedCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      // Resolve info anomalies
      for (const anomaly of unresolved.info) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          const { error } = await supabase
            .from("anomaly_resolutions")
            .insert({
              submission_id: submission.id,
              anomaly_type: 'info',
              anomaly_field: anomaly.field || 'general',
              anomaly_message: anomaly.message,
              resolved_by: user.id,
              resolution_note: "Bulk resolved by admin"
            });

          if (error) {
            if (!error.message.includes('duplicate')) {
              errorCount++;
            }
          } else {
            resolvedCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      // Resolve success anomalies
      for (const anomaly of unresolved.success) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          const { error } = await supabase
            .from("anomaly_resolutions")
            .insert({
              submission_id: submission.id,
              anomaly_type: 'success',
              anomaly_field: anomaly.field || 'general',
              anomaly_message: anomaly.message,
              resolved_by: user.id,
              resolution_note: "Bulk resolved by admin"
            });

          if (error) {
            if (!error.message.includes('duplicate')) {
              errorCount++;
            }
          } else {
            resolvedCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }
    }

    await refetchResolvedAnomalies();
    
    if (resolvedCount > 0) {
      toast.success(`Resolved ${resolvedCount} anomalies`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to resolve ${errorCount} anomalies`);
    }
  };

  const handleBulkAddBlackMark = () => {
    const selectedData = filteredSubmissions.filter(s => selectedRowIds.has(s.id));
    if (selectedData.length === 0) {
      toast.error("No rows selected");
      return;
    }
    toast.info("Bulk black mark feature coming soon!");
  };

  const handleDeleteSelected = async () => {
    const selectedData = filteredSubmissions.filter(s => selectedRowIds.has(s.id));
    if (selectedData.length === 0) {
      toast.error("No rows selected");
      return;
    }

    if (!window.confirm(`Delete ${selectedData.length} selected submissions? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("daily_submissions")
        .delete()
        .in("id", Array.from(selectedRowIds));

      if (error) throw error;

      toast.success(`Deleted ${selectedData.length} submissions`);
      clearSelection();
      checkAuthAndFetch();
    } catch (err) {
      console.error("Error deleting submissions:", err);
      toast.error("Failed to delete submissions");
    }
  };

  // Handle field updates in edit mode
  const handleFieldUpdate = async (
    submission: SubmissionData,
    field: string,
    value: any
  ) => {
    const isAttendanceField = field.startsWith('attendance.');
    const actualField = isAttendanceField ? field.replace('attendance.', '') : field;

    try {
      // Special handling for source field changes - clear sub_source if batch changes
      if (field === 'source' && Array.isArray(value) && value.length > 0) {
        const userProfile = profiles.find(p => p.id === submission.user_id);
        const userMode = (userProfile?.mode || "DM") as "AI" | "DM";
        
        const newSourceBatch = getBatchForSource(value[0], userMode);
        const currentSourceBatch = submission.source.length > 0 
          ? getBatchForSource(submission.source[0], userMode) 
          : null;
        
        // If batch changed or sub-source no longer required, clear it
        const needsSubSource = requiresSubSource(value, userMode);
        const shouldClearSubSource = newSourceBatch !== currentSourceBatch || !needsSubSource;
        
        if (shouldClearSubSource && submission.sub_source) {
          // First clear the sub_source
          await supabase
            .from("daily_submissions")
            .update({ sub_source: null, updated_at: new Date().toISOString() })
            .eq("id", submission.id);
          
          // Update local state to clear sub_source
          setSubmissions(prev => prev.map(s => 
            s.id === submission.id ? { ...s, sub_source: null } : s
          ));
        }
      }

      if (isAttendanceField) {
        const { error } = await supabase
          .from("attendance")
          .update({ [actualField]: value, updated_at: new Date().toISOString() })
          .eq("user_id", submission.user_id)
          .eq("date", submission.date);

        if (error) throw error;

        // Update local state
        setSubmissions(prev => prev.map(s => 
          s.id === submission.id
            ? { ...s, attendance: { ...s.attendance!, [actualField]: value } }
            : s
        ));
      } else {
        const { error } = await supabase
          .from("daily_submissions")
          .update({ [actualField]: value, updated_at: new Date().toISOString() })
          .eq("id", submission.id);

        if (error) throw error;

        // Update local state
        setSubmissions(prev => prev.map(s => 
          s.id === submission.id ? { ...s, [actualField]: value } : s
        ));
      }

      toast.success("Updated successfully");
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Failed to update");
      throw error;
    }
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

    // Sub-Source filter (multi-select)
    if (filters.selectedSubSources.length > 0) {
      filtered = filtered.filter(s => {
        if (filters.selectedSubSources.includes('None (No Sub-Source)')) {
          return !s.sub_source || filters.selectedSubSources.includes(s.sub_source);
        }
        return s.sub_source && filters.selectedSubSources.includes(s.sub_source);
      });
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
          case 'has_blackmarks': {
            const submissionBlackMarks = manualAnomalies.filter(
              m => m.submission_id === s.id && !m.resolved_at
            );
            return submissionBlackMarks.length > 0;
          }
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

        // Include BLACK MARKS (manual anomalies)
        const submissionBlackMarks = manualAnomalies.filter(m => m.submission_id === submission.id);
        const unresolvedBlackMarks = getUnresolvedManualAnomalies(submissionBlackMarks);

        const allAnomalyMessages = [
          ...unresolved.critical,
          ...unresolved.warnings,
          ...unresolved.info,
          ...unresolved.success
        ].map(a => a.message);
        
        const blackMarkMessages = unresolvedBlackMarks.map(m => m.anomaly_message);

        // Check if submission has ANY of the selected anomaly messages (including BLACK MARKS)
        return filters.selectedAnomalies.some(selectedMsg => 
          allAnomalyMessages.includes(selectedMsg) || blackMarkMessages.includes(selectedMsg)
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

        // Include BLACK MARKS (manual anomalies)
        const submissionBlackMarks = manualAnomalies.filter(m => m.submission_id === submission.id);
        const unresolvedBlackMarks = getUnresolvedManualAnomalies(submissionBlackMarks);
        const resolvedBlackMarks = submissionBlackMarks.filter(m => m.resolved_at !== null);

        const totalAnomalies = [
          ...anomalies.critical,
          ...anomalies.warnings,
          ...anomalies.info,
          ...anomalies.success
        ].length + submissionBlackMarks.length;

        const totalUnresolvedAnomalies = [
          ...unresolved.critical,
          ...unresolved.warnings,
          ...unresolved.info,
          ...unresolved.success
        ].length + unresolvedBlackMarks.length;

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

    // Attendance Status filter
    if (filters.attendanceStatus !== "all") {
      filtered = filtered.filter(s => {
        if (filters.attendanceStatus === "present") {
          return s.attendance?.status === "present" || !s.attendance;
        } else if (filters.attendanceStatus === "absent") {
          return s.attendance?.status === "absent";
        }
        return true;
      });
    }

    // Absence Type filter
    if (filters.absenceType.length > 0) {
      filtered = filtered.filter(s =>
        s.attendance?.absence_type && filters.absenceType.includes(s.attendance.absence_type)
      );
    }

    // Admin Notes Search filter
    if (filters.adminNotesSearch.trim()) {
      const searchTerm = filters.adminNotesSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.admin_notes?.toLowerCase().includes(searchTerm)
      );
    }

    // Has Admin Notes filter
    if (filters.hasAdminNotes !== "all") {
      filtered = filtered.filter(s => {
        const hasNotes = !!s.admin_notes && s.admin_notes.trim() !== "";
        return filters.hasAdminNotes === "with_notes" ? hasNotes : !hasNotes;
      });
    }

    // Attendance Notes Search filter
    if (filters.attendanceNotesSearch.trim()) {
      const searchTerm = filters.attendanceNotesSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.attendance?.notes?.toLowerCase().includes(searchTerm)
      );
    }

    // Has Attendance Notes filter
    if (filters.hasAttendanceNotes !== "all") {
      filtered = filtered.filter(s => {
        const hasNotes = !!s.attendance?.notes && s.attendance.notes.trim() !== "";
        return filters.hasAttendanceNotes === "with_notes" ? hasNotes : !hasNotes;
      });
    }

    setFilteredSubmissions(filtered);
  };

  // Compute anomaly statistics from current filtered submissions
  const computeAnomalyStats = () => {
    const anomalyMap = new Map<string, {
      count: number;
      type: 'critical' | 'warning' | 'info' | 'success' | 'blackmark';
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

      // Add BLACK MARKS (manual anomalies)
      const submissionBlackMarks = manualAnomalies.filter(m => m.submission_id === submission.id);
      const unresolvedBlackMarks = getUnresolvedManualAnomalies(submissionBlackMarks);
      
      unresolvedBlackMarks.forEach(mark => {
        const existing = anomalyMap.get(mark.anomaly_message);
        if (existing) {
          existing.count++;
        } else {
          anomalyMap.set(mark.anomaly_message, {
            count: 1,
            type: 'blackmark',
            field: mark.anomaly_field
          });
        }
      });

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
        // Sort: blackmark → critical → warning → info → success, then by count descending
        const typeOrder = { blackmark: 0, critical: 1, warning: 2, info: 3, success: 4 };
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
  
  // Get unique sub-sources
  const uniqueSubSources = Array.from(new Set(submissions.map(s => s.sub_source).filter(Boolean))).sort();

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

  // Dynamic totals based on selected rows or all filtered
  const dataForTotals = useMemo(() => {
    if (selectedRowIds.size === 0) return filteredSubmissions;
    return filteredSubmissions.filter(s => selectedRowIds.has(s.id));
  }, [filteredSubmissions, selectedRowIds]);

  // Create paginated data slice
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(startIndex, startIndex + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize);

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
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-mode"
                  checked={isEditMode}
                  onCheckedChange={setIsEditMode}
                />
                <Label htmlFor="edit-mode" className="cursor-pointer flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Mode
                </Label>
              </div>
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
                subSources={uniqueSubSources}
              />
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          {isEditMode && (
            <div className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3 m-4 rounded-md">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Edit Mode Active - Click any field to edit. Changes save automatically.
              </p>
            </div>
          )}
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
                    <SelectItem value="has_blackmarks">
                      <span className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-purple-500" />
                        Has Black Marks
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
                                stat.type === 'blackmark' ? 'default' :
                                stat.type === 'info' ? 'info' : 'success'
                              }
                              className={`mr-2 shrink-0 ${
                                stat.type === 'blackmark' ? 'bg-purple-900 text-purple-50 dark:bg-purple-300 dark:text-purple-900' : ''
                              }`}
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
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            paginatedSubmissions.length > 0 && 
                            paginatedSubmissions.every(s => selectedRowIds.has(s.id))
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all rows on page"
                        />
                      </TableHead>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[90px]">Day</TableHead>
                      <TableHead className="min-w-[150px]">Entered At</TableHead>
                      <TableHead className="w-[180px]">Anomalies</TableHead>
                      <TableHead className="w-[60px]" title="Admin Notes">📝</TableHead>
                      <TableHead className="min-w-[120px]">Employee</TableHead>
                      <TableHead className="min-w-[120px]">Absence Type</TableHead>
                      <TableHead className="min-w-[180px]">Email</TableHead>
                      <TableHead className="min-w-[80px]">Role</TableHead>
                      <TableHead className="min-w-[80px]">Team</TableHead>
                      <TableHead className="min-w-[100px]">Source</TableHead>
                      <TableHead className="min-w-[100px]">Sub-Source</TableHead>
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
                      <TableHead className="min-w-[150px]">Attn. Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubmissions.map((submission) => {
                      const showUpPercent = Number(calculatePercentage(submission.calls_taken, submission.calls_dialled));
                      const noShowUpPercent = Number(calculatePercentage(submission.calls_not_taken + submission.touched_base + submission.others, submission.calls_dialled));
                      const smClosingPercent = Number(calculatePercentage(submission.sm_rp + submission.sm_enrolled, submission.calls_taken));
                      const fuClosingPercent = Number(calculatePercentage(submission.fu_rp + submission.fu_enrolled, submission.calls_taken));
                      const userProfile = getUserProfile(submission.user_id);
                      
                      // Detect anomalies for this submission (skip for absent/absent-only rows)
                      const isAbsent = submission.isAbsentOnly || submission.attendance?.status === 'absent';
                      const anomalies = isAbsent 
                        ? { critical: [], warnings: [], info: [], success: [], hasAnomalies: false }
                        : detectAnomalies({
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

                       // Get manual anomalies (BLACK MARKS) for this submission
                       const submissionBlackMarks = manualAnomalies.filter(m => m.submission_id === submission.id);
                       const unresolvedBlackMarks = getUnresolvedManualAnomalies(submissionBlackMarks);
                       const resolvedBlackMarks = getResolvedManualAnomalies(submissionBlackMarks);

                       // Determine row styling based on UNRESOLVED anomalies only (include black marks)
                       const hasCritical = unresolvedCritical.length > 0 || unresolvedBlackMarks.length > 0;
                       const hasWarnings = unresolvedWarnings.length > 0;
                       const hasSuccess = unresolvedSuccess.length > 0 && unresolvedCritical.length === 0 && unresolvedWarnings.length === 0 && unresolvedBlackMarks.length === 0;
                      
                      let rowClass = "cursor-pointer hover:bg-muted/50 transition-colors";
                      if (isAbsent) rowClass += " bg-purple-50 dark:bg-purple-950/20 border-l-4 border-l-purple-500";
                      else if (hasCritical) rowClass += " bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500";
                      else if (hasWarnings) rowClass += " bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500";
                      else if (hasSuccess) rowClass += " bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500";

                      const userName = getUserName(submission.user_id);

                      return (
                        <TableRow 
                          key={submission.id}
                          className={rowClass}
                          onClick={() => !isEditMode && handleRowClick(submission)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRowIds.has(submission.id)}
                              onCheckedChange={() => toggleRowSelection(submission.id)}
                              aria-label={`Select row for ${getUserName(submission.user_id)}`}
                            />
                          </TableCell>
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
                            {submission.isAbsentOnly ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              <Popover>
                                 <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                   <div className="flex gap-1 flex-wrap cursor-pointer">
                                     {unresolvedCritical.length > 0 && (
                                       <Badge variant="destructive" className="text-xs">
                                         <AlertTriangle className="h-3 w-3 mr-1" />
                                         {unresolvedCritical.length}
                                       </Badge>
                                     )}
                                     {unresolvedBlackMarks.length > 0 && (
                                       <Badge className="text-xs bg-purple-900 hover:bg-purple-800 text-white">
                                         ⚫ {unresolvedBlackMarks.length}
                                       </Badge>
                                     )}
                                     {unresolvedWarnings.length > 0 && (
                                       <Badge variant="default" className="text-xs bg-yellow-500 hover:bg-yellow-600">
                                         <AlertCircle className="h-3 w-3 mr-1" />
                                         {unresolvedWarnings.length}
                                       </Badge>
                                     )}
                                     {unresolvedInfo.length > 0 && (
                                       <Badge variant="secondary" className="text-xs">
                                         <Info className="h-3 w-3 mr-1" />
                                         {unresolvedInfo.length}
                                       </Badge>
                                     )}
                                     {unresolvedSuccess.length > 0 && (
                                       <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                         <Star className="h-3 w-3 mr-1" />
                                         {unresolvedSuccess.length}
                                       </Badge>
                                     )}
                                   </div>
                                 </PopoverTrigger>
                                <PopoverContent 
                                  side="right" 
                                  className="w-[450px] p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ScrollArea className="h-[400px]">
                                    <div className="p-4 space-y-4">
                                      {/* Critical Issues */}
                                      {unresolvedCritical.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="font-semibold text-red-500 flex items-center gap-2 pb-2 border-b">
                                            <AlertTriangle className="h-4 w-4" />
                                            Critical Issues ({unresolvedCritical.length})
                                          </div>
                                          {unresolvedCritical.map((anomaly, i) => {
                                            const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                            return (
                                              <div key={`crit-${i}`} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                                                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm break-words">{anomaly.message}</p>
                                                </div>
                                                {resolved ? (
                                                  <Badge variant="outline" className="shrink-0 text-green-600 border-green-600">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Resolved
                                                  </Badge>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="shrink-0"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleAnomalyClick(e, submission.id, submission.date, userName, { ...anomaly, type: 'critical' });
                                                    }}
                                                  >
                                                    Resolve
                                                  </Button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                       {/* Warnings */}
                                       {unresolvedWarnings.length > 0 && (
                                         <div className="space-y-2">
                                           <div className="font-semibold text-yellow-500 flex items-center gap-2 pb-2 border-b">
                                             <AlertCircle className="h-4 w-4" />
                                             Warnings ({unresolvedWarnings.length})
                                           </div>
                                           {unresolvedWarnings.map((anomaly, i) => {
                                             const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                             return (
                                               <div key={`warn-${i}`} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                                                 <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                                 <div className="flex-1 min-w-0">
                                                   <p className="text-sm break-words">{anomaly.message}</p>
                                                 </div>
                                                 {resolved ? (
                                                   <Badge variant="outline" className="shrink-0 text-green-600 border-green-600">
                                                     <CheckCircle2 className="h-3 w-3 mr-1" />
                                                     Resolved
                                                   </Badge>
                                                 ) : (
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     className="shrink-0"
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       handleAnomalyClick(e, submission.id, submission.date, userName, { ...anomaly, type: 'warning' });
                                                     }}
                                                   >
                                                     Resolve
                                                   </Button>
                                                 )}
                                               </div>
                                             );
                                           })}
                                         </div>
                                       )}

                                       {/* Black Marks (Admin Flagged) */}
                                       {unresolvedBlackMarks.length > 0 && (
                                         <div className="space-y-2">
                                           <div className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2 pb-2 border-b">
                                             <Flag className="h-4 w-4" />
                                             Black Marks - Admin Flagged ({unresolvedBlackMarks.length})
                                           </div>
                                           {unresolvedBlackMarks.map((mark, i) => (
                                             <div key={`blackmark-${i}`} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 bg-purple-50 dark:bg-purple-950/20">
                                               <Flag className="h-4 w-4 text-purple-900 dark:text-purple-300 shrink-0 mt-0.5" />
                                               <div className="flex-1 min-w-0">
                                                 <p className="text-xs text-muted-foreground mb-1 font-mono">{mark.anomaly_field}</p>
                                                 <p className="text-sm break-words">{mark.anomaly_message}</p>
                                               </div>
                                               <Button
                                                 size="sm"
                                                 variant="outline"
                                                 className="shrink-0"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleAnomalyClick(e, submission.id, submission.date, userName, { 
                                                     type: 'blackmark', 
                                                     message: mark.anomaly_message, 
                                                     field: mark.anomaly_field,
                                                     isManual: true,
                                                     manualAnomalyId: mark.id
                                                   });
                                                 }}
                                               >
                                                 Resolve
                                               </Button>
                                             </div>
                                           ))}
                                         </div>
                                       )}

                                      {/* Info */}
                                      {unresolvedInfo.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="font-semibold text-blue-500 flex items-center gap-2 pb-2 border-b">
                                            <Info className="h-4 w-4" />
                                            Information ({unresolvedInfo.length})
                                          </div>
                                          {unresolvedInfo.map((anomaly, i) => {
                                            const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                            return (
                                              <div key={`info-${i}`} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                                                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm break-words">{anomaly.message}</p>
                                                </div>
                                                {resolved ? (
                                                  <Badge variant="outline" className="shrink-0 text-green-600 border-green-600">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Resolved
                                                  </Badge>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="shrink-0"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleAnomalyClick(e, submission.id, submission.date, userName, { ...anomaly, type: 'info' });
                                                    }}
                                                  >
                                                    Resolve
                                                  </Button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Success */}
                                      {unresolvedSuccess.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="font-semibold text-green-500 flex items-center gap-2 pb-2 border-b">
                                            <Star className="h-4 w-4" />
                                            Success ({unresolvedSuccess.length})
                                          </div>
                                          {unresolvedSuccess.map((anomaly, i) => {
                                            const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                                            return (
                                              <div key={`success-${i}`} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                                                <Star className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm break-words">{anomaly.message}</p>
                                                </div>
                                                {resolved ? (
                                                  <Badge variant="outline" className="shrink-0 text-green-600 border-green-600">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Resolved
                                                  </Badge>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="shrink-0"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleAnomalyClick(e, submission.id, submission.date, userName, { ...anomaly, type: 'success' });
                                                    }}
                                                  >
                                                    Resolve
                                                  </Button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                       {/* Resolved Anomalies Section */}
                                       {(() => {
                                         const allResolvedForSubmission = resolvedAnomalies.filter(r => r.submission_id === submission.id);
                                         const allResolvedBlackMarksForSubmission = resolvedBlackMarks;
                                         const totalResolved = allResolvedForSubmission.length + allResolvedBlackMarksForSubmission.length;
                                         
                                         if (totalResolved === 0) return null;
                                         
                                         return (
                                           <div className="mt-6 pt-4 border-t space-y-2">
                                             <div className="font-semibold text-muted-foreground flex items-center gap-2 pb-2">
                                               <CheckCircle2 className="h-4 w-4 text-green-500" />
                                               Resolved ({totalResolved})
                                             </div>
                                             
                                             {/* Resolved regular anomalies */}
                                             {allResolvedForSubmission.map((resolved, i) => {
                                               const IconComponent = resolved.anomaly_type === 'critical' ? AlertTriangle : 
                                                                   resolved.anomaly_type === 'warning' ? AlertCircle : 
                                                                   resolved.anomaly_type === 'success' ? Star : Info;
                                               return (
                                                 <div key={`resolved-${i}`} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 opacity-60">
                                                   <IconComponent className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                                                   <div className="flex-1 min-w-0">
                                                     <p className="text-sm break-words text-muted-foreground line-through">{resolved.anomaly_message}</p>
                                                     {resolved.resolution_note && (
                                                       <p className="text-xs text-muted-foreground italic mt-1">Note: {resolved.resolution_note}</p>
                                                     )}
                                                   </div>
                                                   <div className="flex items-center gap-2 shrink-0">
                                                     <Badge variant="outline" className="text-green-600 border-green-600">
                                                       <CheckCircle2 className="h-3 w-3 mr-1" />
                                                       Resolved
                                                     </Badge>
                                                     <Button
                                                       size="sm"
                                                       variant="ghost"
                                                       className="shrink-0 h-8 px-2"
                                                       onClick={(e) => {
                                                         e.stopPropagation();
                                                         handleAnomalyClick(e, submission.id, submission.date, userName, { 
                                                           type: resolved.anomaly_type as any, 
                                                           message: resolved.anomaly_message, 
                                                           field: resolved.anomaly_field 
                                                         });
                                                       }}
                                                     >
                                                       Unresolve
                                                     </Button>
                                                   </div>
                                                 </div>
                                               );
                                             })}

                                             {/* Resolved BLACK MARKS */}
                                             {allResolvedBlackMarksForSubmission.map((mark, i) => (
                                               <div key={`resolved-blackmark-${i}`} className="flex items-start gap-2 p-2 rounded-md bg-purple-50/30 dark:bg-purple-950/10 opacity-60">
                                                 <Flag className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                                                 <div className="flex-1 min-w-0">
                                                   <p className="text-xs text-muted-foreground mb-1 font-mono">{mark.anomaly_field}</p>
                                                   <p className="text-sm break-words text-muted-foreground line-through">{mark.anomaly_message}</p>
                                                   {mark.resolution_note && (
                                                     <p className="text-xs text-muted-foreground italic mt-1">Note: {mark.resolution_note}</p>
                                                   )}
                                                 </div>
                                                 <div className="flex items-center gap-2 shrink-0">
                                                   <Badge variant="outline" className="text-green-600 border-green-600">
                                                     <CheckCircle2 className="h-3 w-3 mr-1" />
                                                     Resolved
                                                   </Badge>
                                                   <Button
                                                     size="sm"
                                                     variant="ghost"
                                                     className="shrink-0 h-8 px-2"
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       handleAnomalyClick(e, submission.id, submission.date, userName, { 
                                                         type: 'blackmark', 
                                                         message: mark.anomaly_message, 
                                                         field: mark.anomaly_field,
                                                         isManual: true,
                                                         manualAnomalyId: mark.id
                                                       });
                                                     }}
                                                   >
                                                     Unresolve
                                                   </Button>
                                                 </div>
                                               </div>
                                             ))}
                                           </div>
                                         );
                                        })()}
                                        
                                        {/* Add Black Mark Button (Edit Mode Only) */}
                                        {isEditMode && (
                                          <div className="mt-4 pt-4 border-t">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSubmission(submission);
                                                setBlackMarkDialogOpen(true);
                                              }}
                                            >
                                              <Flag className="h-3 w-3 mr-2 text-purple-600" />
                                              Add Black Mark
                                            </Button>
                                          </div>
                                        )}
                                     </div>
                                   </ScrollArea>
                                </PopoverContent>
                              </Popover>
                            )}
                          </TableCell>
                          <TableCell>
                            <Popover
                              open={editingNoteSubmissionId === submission.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setEditingNoteSubmissionId(null);
                                  setTempNoteValue("");
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => handleNoteClick(e, submission)}
                                >
                                  <StickyNote 
                                    className={
                                      (submission.isAbsentOnly 
                                        ? submission.attendance?.notes 
                                        : submission.admin_notes
                                      ) 
                                        ? "h-4 w-4 fill-yellow-400 text-yellow-600" 
                                        : "h-4 w-4 text-muted-foreground"
                                    } 
                                  />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Admin Notes</h4>
                                  <textarea
                                    className="w-full min-h-[100px] p-2 text-sm border rounded-md resize-none"
                                    value={tempNoteValue}
                                    onChange={(e) => setTempNoteValue(e.target.value)}
                                    placeholder="Add notes about this submission..."
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveNote(submission.id, tempNoteValue);
                                      }}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingNoteSubmissionId(null);
                                        setTempNoteValue("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {userProfile?.name || "Unknown"}
                              {(submission.isAbsentOnly || submission.attendance?.status === 'absent') && (
                                <Badge variant="destructive" className="text-xs">🔴 Absent</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {submission.attendance?.absence_type ? (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {submission.attendance.absence_type.replace('_', ' ')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
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
                            {submission.isAbsentOnly ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : isEditMode ? (
                              <EditableCell
                                value={submission.source}
                                fieldName="source"
                                fieldType="source"
                                userMode={userProfile?.mode as 'AI' | 'DM'}
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'source', val)}
                              />
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {submission.source.map((src, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {src}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.sub_source && isEditMode ? (
                              <EditableCell
                                value={submission.sub_source}
                                fieldName="sub_source"
                                fieldType="subsource"
                                userMode={userProfile?.mode as 'AI' | 'DM'}
                                sources={submission.source}
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'sub_source', val)}
                              />
                            ) : submission.sub_source ? (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {submission.sub_source}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.rapport_built}
                                    fieldName="rapport_built"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'rapport_built', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.rapport_built
                                )}
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.calls_dialled}
                                    fieldName="calls_dialled"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'calls_dialled', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.calls_dialled
                                )}
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
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.calls_taken}
                                    fieldName="calls_taken"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'calls_taken', val)}
                                    validationRules={{ 
                                      min: 0,
                                      maxRelativeField: 'calls_dialled',
                                      maxRelativeValue: submission.calls_dialled
                                    }}
                                  />
                                ) : (
                                  submission.calls_taken
                                )}
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : isEditMode ? (
                              <EditableCell
                                value={submission.touched_base}
                                fieldName="touched_base"
                                fieldType="numeric"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'touched_base', val)}
                                validationRules={{ min: 0 }}
                              />
                            ) : (
                              submission.touched_base
                            )}
                          </TableCell>
                          <TableCell className="text-destructive">
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : isEditMode ? (
                              <EditableCell
                                value={submission.calls_not_taken}
                                fieldName="calls_not_taken"
                                fieldType="numeric"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'calls_not_taken', val)}
                                validationRules={{ min: 0 }}
                              />
                            ) : (
                              submission.calls_not_taken
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : isEditMode ? (
                              <EditableCell
                                value={submission.others}
                                fieldName="others"
                                fieldType="numeric"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'others', val)}
                                validationRules={{ min: 0 }}
                              />
                            ) : (
                              submission.others
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.disqualified}
                                    fieldName="disqualified"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'disqualified', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.disqualified
                                )}
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.followed_up}
                                    fieldName="followed_up"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'followed_up', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.followed_up
                                )}
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.sm_rp}
                                    fieldName="sm_rp"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'sm_rp', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.sm_rp
                                )}
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
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.sm_enrolled}
                                    fieldName="sm_enrolled"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'sm_enrolled', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.sm_enrolled
                                )}
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : isEditMode ? (
                              <EditableCell
                                value={submission.sm_rp_to_enrolled}
                                fieldName="sm_rp_to_enrolled"
                                fieldType="numeric"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'sm_rp_to_enrolled', val)}
                                validationRules={{ min: 0 }}
                              />
                            ) : (
                              submission.sm_rp_to_enrolled
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.fu_rp}
                                    fieldName="fu_rp"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'fu_rp', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.fu_rp
                                )}
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
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isEditMode ? (
                                  <EditableCell
                                    value={submission.fu_enrolled}
                                    fieldName="fu_enrolled"
                                    fieldType="numeric"
                                    isEditMode={isEditMode}
                                    onSave={(val) => handleFieldUpdate(submission, 'fu_enrolled', val)}
                                    validationRules={{ min: 0 }}
                                  />
                                ) : (
                                  submission.fu_enrolled
                                )}
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
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : isEditMode ? (
                              <EditableCell
                                value={submission.fu_rp_to_enrolled}
                                fieldName="fu_rp_to_enrolled"
                                fieldType="numeric"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'fu_rp_to_enrolled', val)}
                                validationRules={{ min: 0 }}
                              />
                            ) : (
                              submission.fu_rp_to_enrolled
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <Badge variant={getPerformanceBadgeVariant(fuClosingPercent)} className="text-xs">
                                {fuClosingPercent.toFixed(1)}%
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : isEditMode ? (
                              <EditableCell
                                value={submission.is_crm_updated}
                                fieldName="is_crm_updated"
                                fieldType="dropdown"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'is_crm_updated', val)}
                              />
                            ) : (
                              <Badge 
                                variant={submission.is_crm_updated === 'Yes' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {submission.is_crm_updated}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent ? (
                              <span className="text-muted-foreground">—</span>
                            ) : submission.task_completion_status && isEditMode ? (
                              <EditableCell
                                value={submission.task_completion_status}
                                fieldName="task_completion_status"
                                fieldType="dropdown"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'task_completion_status', val)}
                              />
                            ) : submission.task_completion_status ? (
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
                            {isEditMode && submission.attendance ? (
                              <EditableCell
                                value={submission.attendance.performance_rating || ''}
                                fieldName="attendance.performance_rating"
                                fieldType="dropdown"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'attendance.performance_rating', val ? Number(val) : null)}
                              />
                            ) : submission.attendance?.performance_rating ? (
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
                            {isEditMode && submission.attendance ? (
                              <EditableCell
                                value={submission.attendance.notes || ''}
                                fieldName="attendance.notes"
                                fieldType="textarea"
                                isEditMode={isEditMode}
                                onSave={(val) => handleFieldUpdate(submission, 'attendance.notes', val)}
                              />
                            ) : submission.attendance?.notes ? (
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
                      // Calculate totals - exclude absent/absent-only rows, use selected rows if any
                      const presentSubmissions = dataForTotals.filter(s => 
                        !s.isAbsentOnly && s.attendance?.status !== 'absent'
                      );
                      const totals = presentSubmissions.reduce((acc, sub) => ({
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

                      const uniqueSourcesCount = new Set(presentSubmissions.flatMap(s => s.source)).size;
                      const uniqueSubSourcesCount = new Set(
                        presentSubmissions.map(s => s.sub_source).filter(Boolean)
                      ).size;
                      const totalShowUpPercent = Number(calculatePercentage(totals.calls_taken, totals.calls_dialled));
                      const totalNoShowUpPercent = Number(calculatePercentage(totals.calls_not_taken + totals.touched_base + totals.others, totals.calls_dialled));
                      const totalSMPercent = Number(calculatePercentage(totals.sm_rp + totals.sm_enrolled, totals.calls_taken));
                      const totalFUPercent = Number(calculatePercentage(totals.fu_rp + totals.fu_enrolled, totals.calls_taken));

                          return (
                          <TableRow className="bg-muted/50 font-bold border-t-2 border-primary hover:bg-muted/50">
                            <TableCell></TableCell>
                            <TableCell colSpan={9} className="text-base">
                              TOTAL ({presentSubmissions.length} records{selectedRowIds.size > 0 ? ', from selection' : ''})
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">-</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {uniqueSourcesCount} source{uniqueSourcesCount !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {uniqueSubSourcesCount > 0 ? (
                              <Badge variant="secondary" className="text-xs font-semibold">
                                {uniqueSubSourcesCount} sub-source{uniqueSubSourcesCount !== 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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
        
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </main>

      <SelectionBar
        selectedCount={selectedRowIds.size}
        totalVisible={paginatedSubmissions.length}
        totalFiltered={totalCount}
        selectionMode={selectionMode}
        onSelectAll={selectAllOnPage}
        onSelectAllFiltered={selectAllFiltered}
        onClearSelection={clearSelection}
        onExportSelected={handleExportSelected}
        onBulkResolveAnomalies={handleBulkResolveAnomalies}
        onAddBlackMark={handleBulkAddBlackMark}
        onDeleteSelected={handleDeleteSelected}
      />

      <SubmissionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        submission={selectedSubmission}
        userProfile={selectedSubmission ? getUserProfile(selectedSubmission.user_id) : undefined}
        onNoteSave={(submissionId, note) => {
          setSubmissions(prev => prev.map(s => {
            if (s.id === submissionId) {
              if (s.isAbsentOnly) {
                // Update attendance.notes for absent-only rows
                return { 
                  ...s, 
                  attendance: s.attendance 
                    ? { ...s.attendance, notes: note }
                    : null 
                };
              }
              return { ...s, admin_notes: note };
            }
            return s;
          }));
        }}
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
          onResolutionChange={() => {
            refetchResolvedAnomalies();
            refetchManualAnomalies();
          }}
        />
      )}

      {selectedSubmission && (
        <AddBlackMarkDialog
          open={blackMarkDialogOpen}
          onOpenChange={setBlackMarkDialogOpen}
          submissionId={selectedSubmission.id}
          submissionDate={selectedSubmission.date}
          userName={getUserName(selectedSubmission.user_id)}
          onBlackMarkAdded={handleBlackMarkAdded}
        />
      )}
    </div>
  );
};

export default AdminDataView;
