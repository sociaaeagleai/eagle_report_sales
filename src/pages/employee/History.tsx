import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, Star, CheckCircle2, Plus, CalendarIcon, Filter, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DashboardHeader from "@/components/DashboardHeader";
import { detectAnomalies } from "@/lib/anomalyDetection";
import { isAnomalyResolved, type ResolvedAnomaly } from "@/lib/anomalyResolution";
import { getSourceDisplayLabel, getSubSourceDisplayLabel, DM_BATCHES, AI_BATCHES, requiresSubSource, getSubSourceOptions } from "@/lib/sourceBatches";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface Submission {
  id: string;
  date: string;
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
  task_completion_status: string | null;
  created_at?: string;
  attendance?: any;
}

const History = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<ResolvedAnomaly[]>([]);
  const [showResolvedAnomalies, setShowResolvedAnomalies] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userMode, setUserMode] = useState<"AI" | "DM" | null>(null);
  
  // Filter states - default to current month
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSubSources, setSelectedSubSources] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  // Get available sources based on user mode
  const availableSources = useMemo(() => {
    if (!userMode) return [];
    const batches = userMode === "DM" ? DM_BATCHES : AI_BATCHES;
    return batches.flatMap(batch => batch.sources);
  }, [userMode]);

  // Determine if sub-source filter should be shown
  const showSubSourceFilter = useMemo(() => {
    return selectedSources.length > 0 && requiresSubSource(selectedSources, userMode || "AI");
  }, [selectedSources, userMode]);

  // Get available sub-sources based on selected sources
  const availableSubSources = useMemo(() => {
    if (!showSubSourceFilter || !userMode) return [];
    return getSubSourceOptions(selectedSources, userMode);
  }, [selectedSources, userMode, showSubSourceFilter]);

  // Filter submissions based on filters
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      // Date range filter
      if (startDate) {
        const subDate = new Date(sub.date);
        subDate.setHours(0, 0, 0, 0);
        const filterStart = new Date(startDate);
        filterStart.setHours(0, 0, 0, 0);
        if (subDate < filterStart) return false;
      }
      if (endDate) {
        const subDate = new Date(sub.date);
        subDate.setHours(23, 59, 59, 999);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);
        if (subDate > filterEnd) return false;
      }
      
      // Source filter
      if (selectedSources.length > 0) {
        const hasMatchingSource = sub.source.some(s => selectedSources.includes(s));
        if (!hasMatchingSource) return false;
      }
      
      // Sub-source filter
      if (selectedSubSources.length > 0) {
        if (!sub.sub_source || !selectedSubSources.includes(sub.sub_source)) return false;
      }
      
      return true;
    });
  }, [submissions, startDate, endDate, selectedSources, selectedSubSources]);

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
    setSelectedSources([]);
    setSelectedSubSources([]);
  };

  // Quick date presets
  const handleDatePreset = (preset: 'today' | 'week' | 'month') => {
    const today = new Date();
    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'week':
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
    }
  };

  // Toggle source selection
  const toggleSource = (source: string) => {
    setSelectedSources(prev => {
      const newSources = prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source];
      
      // Clear sub-sources if no longer applicable
      if (newSources.length === 0 || !requiresSubSource(newSources, userMode || "AI")) {
        setSelectedSubSources([]);
      }
      
      return newSources;
    });
  };

  // Toggle sub-source selection
  const toggleSubSource = (subSource: string) => {
    setSelectedSubSources(prev => 
      prev.includes(subSource)
        ? prev.filter(s => s !== subSource)
        : [...prev, subSource]
    );
  };

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    try {
      // Fetch user profile for mode
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("mode")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;
      setUserMode(profile.mode);

      const { data, error } = await supabase
        .from("daily_submissions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;

      // Fetch attendance data
      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(30);

      if (attError) {
        console.error("Error fetching attendance:", attError);
      }

      const submissionIds = (data || []).map(s => s.id);
      
      // Fetch resolved anomalies for these submissions
      const { data: resolvedData, error: resolvedError } = await supabase
        .from("anomaly_resolutions" as any)
        .select("*")
        .in("submission_id", submissionIds);

      if (resolvedError) {
        console.error("Error fetching resolved anomalies:", resolvedError);
      }

      // Merge attendance data with submissions
      const submissionsWithAttendance = (data || []).map(sub => {
        const attendance = (attendanceData || []).find(
          att => att.date === sub.date
        );
        return {
          ...sub,
          attendance: attendance || null
        };
      });

      // Add absent-only days (attendance records without submissions)
      const absentOnlyDays = (attendanceData || [])
        .filter(att => att.status === "absent" && !data?.find(sub => sub.date === att.date))
        .map(att => ({
          id: `absent-${att.date}`,
          date: att.date,
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
          task_completion_status: null,
          created_at: att.created_at,
          attendance: att
        }));

      const allRecords = [...submissionsWithAttendance, ...absentOnlyDays].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setSubmissions(allRecords);
      setResolvedAnomalies((resolvedData as any) || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals based on filtered submissions
  const totals = {
    callsDialled: 0,
    callsTaken: 0,
    rapportBuilt: 0,
    touchedBase: 0,
    callsNotTaken: 0,
    others: 0,
    disqualified: 0,
    followedUp: 0,
    smRP: 0,
    smEnrolled: 0,
    smRPToEnrolled: 0,
    fuRP: 0,
    fuEnrolled: 0,
    fuRPToEnrolled: 0,
  };

  filteredSubmissions.forEach((sub) => {
    if (!sub.id.toString().startsWith("absent-")) {
      totals.callsDialled += sub.calls_dialled;
      totals.callsTaken += sub.calls_taken;
      totals.rapportBuilt += sub.rapport_built;
      totals.touchedBase += sub.touched_base;
      totals.callsNotTaken += sub.calls_not_taken;
      totals.others += sub.others;
      totals.disqualified += sub.disqualified;
      totals.followedUp += sub.followed_up;
      totals.smRP += sub.sm_rp;
      totals.smEnrolled += sub.sm_enrolled;
      totals.smRPToEnrolled += sub.sm_rp_to_enrolled;
      totals.fuRP += sub.fu_rp;
      totals.fuEnrolled += sub.fu_enrolled;
      totals.fuRPToEnrolled += sub.fu_rp_to_enrolled;
    }
  });

  const totalShowUpPercent = totals.callsDialled > 0 
    ? ((totals.callsTaken / totals.callsDialled) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-employee-bg">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Filters Section */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters} className="mb-4">
            <Card className="shadow-lg border-employee-border bg-employee-bg">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                  </CollapsibleTrigger>
                  
                  {(selectedSources.length > 0 || selectedSubSources.length > 0) && (
                    <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                <CollapsibleContent className="space-y-4">
                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-employee-fg">Date Range</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDatePreset('today')}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDatePreset('week')}
                      >
                        This Week
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDatePreset('month')}
                      >
                        This Month
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Start Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "End Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Source Multi-Select */}
                  {userMode && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-employee-fg">Source</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <Filter className="mr-2 h-4 w-4" />
                            {selectedSources.length > 0
                              ? `${selectedSources.length} selected`
                              : "Select sources..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {availableSources.map((source) => (
                              <div key={source} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`source-${source}`}
                                  checked={selectedSources.includes(source)}
                                  onCheckedChange={() => toggleSource(source)}
                                />
                                <label
                                  htmlFor={`source-${source}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {source}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      {selectedSources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSources.map((source) => (
                            <Badge
                              key={source}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => toggleSource(source)}
                            >
                              {source}
                              <X className="ml-1 h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-Source Multi-Select (Conditional) */}
                  {showSubSourceFilter && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-employee-fg">Sub-Source</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <Filter className="mr-2 h-4 w-4" />
                            {selectedSubSources.length > 0
                              ? `${selectedSubSources.length} selected`
                              : "Select sub-sources..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-2">
                            {availableSubSources.map((subSource) => (
                              <div key={subSource} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`subsource-${subSource}`}
                                  checked={selectedSubSources.includes(subSource)}
                                  onCheckedChange={() => toggleSubSource(subSource)}
                                />
                                <label
                                  htmlFor={`subsource-${subSource}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {subSource}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      {selectedSubSources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSubSources.map((subSource) => (
                            <Badge
                              key={subSource}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => toggleSubSource(subSource)}
                            >
                              {subSource}
                              <X className="ml-1 h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Card>
          </Collapsible>

          <Card className="shadow-lg border-employee-border bg-employee-bg">
            <CardHeader className="border-b border-employee-border">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-employee-fg">Submission History</CardTitle>
                  <CardDescription className="text-employee-fg/70 mt-1">
                    Showing {filteredSubmissions.length} of {submissions.length} submissions
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-resolved" 
                    checked={showResolvedAnomalies}
                    onCheckedChange={(checked) => setShowResolvedAnomalies(checked as boolean)}
                  />
                  <Label htmlFor="show-resolved" className="text-sm font-normal cursor-pointer">
                    Show resolved anomalies
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : filteredSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {submissions.length === 0 ? "No submissions yet" : "No submissions match the selected filters"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[150px]">Entered At</TableHead>
                        <TableHead className="min-w-[120px]">Attendance</TableHead>
                        <TableHead className="min-w-[100px]">Source</TableHead>
                        <TableHead className="min-w-[100px]">Sub-Source</TableHead>
                        <TableHead>Rapport Built</TableHead>
                        <TableHead>Dialled</TableHead>
                        <TableHead>Taken</TableHead>
                        <TableHead>Touched Base</TableHead>
                        <TableHead>Not Taken</TableHead>
                        <TableHead>Others</TableHead>
                        <TableHead>Disq.</TableHead>
                        <TableHead>Follow-ups</TableHead>
                        <TableHead>Show up %</TableHead>
                        <TableHead>SM: RP</TableHead>
                        <TableHead>SM: Enrolled</TableHead>
                        <TableHead>SM: RP→E</TableHead>
                        <TableHead>FU: RP</TableHead>
                        <TableHead>FU: Enrolled</TableHead>
                        <TableHead>FU: RP→E</TableHead>
                        <TableHead className="min-w-[120px]">Task Status</TableHead>
                      </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => {
                        const isAbsentOnly = submission.id.toString().startsWith("absent-");
                        
                        // Detect anomalies for employee's own data (skip for absent-only rows)
                        const anomalies = !isAbsentOnly ? detectAnomalies({
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
                        }) : { critical: [], warnings: [], info: [], success: [], hasAnomalies: false };

                        const hasCritical = anomalies.critical.length > 0;
                        const hasWarnings = anomalies.warnings.length > 0;
                        const hasSuccess = anomalies.success.length > 0;

                        // Filter out resolved anomalies for row color
                        const unresolvedCritical = anomalies.critical.filter(a => 
                          !isAnomalyResolved(submission.id, a.field || 'general', a.message, resolvedAnomalies)
                        );
                        const unresolvedWarnings = anomalies.warnings.filter(a => 
                          !isAnomalyResolved(submission.id, a.field || 'general', a.message, resolvedAnomalies)
                        );

                        let rowClass = "";
                        if (isAbsentOnly) {
                          rowClass = "bg-muted/30 border-l-4 border-l-purple-500";
                        } else if (unresolvedCritical.length > 0) {
                          rowClass = "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500";
                        } else if (unresolvedWarnings.length > 0) {
                          rowClass = "bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500";
                        } else if (hasSuccess && unresolvedCritical.length === 0 && unresolvedWarnings.length === 0) {
                          rowClass = "bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500";
                        }

                        // Helper to check if anomaly should be shown in cell
                        const shouldShowAnomaly = (anomaly: any) => {
                          const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                          return !resolved || showResolvedAnomalies;
                        };

                        const renderAnomalyIcon = (anomaly: any, IconComponent: any, colorClass: string) => {
                          const resolved = isAnomalyResolved(submission.id, anomaly.field || 'general', anomaly.message, resolvedAnomalies);
                          
                          // Don't show if resolved and filter is off
                          if (resolved && !showResolvedAnomalies) return null;

                          return (
                            <TooltipProvider key={anomaly.message}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="relative">
                                    <IconComponent className={resolved ? "h-4 w-4 text-gray-400" : `h-4 w-4 ${colorClass}`} />
                                    {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  {resolved ? (
                                    <div className="space-y-1 text-xs">
                                      <p className="font-medium text-green-500">✓ Resolved by Admin</p>
                                      <p className="text-muted-foreground">{anomaly.message}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(resolved.resolved_at).toLocaleDateString()}
                                      </p>
                                      {resolved.resolution_note && (
                                        <p className="italic text-muted-foreground">Note: {resolved.resolution_note}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm">{anomaly.message}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        };

                        // Helper to render cell anomaly with resolution check
                        const renderCellAnomaly = (field: string, anomalyType: 'critical' | 'warnings', IconComponent: any, colorClass: string) => {
                          const anomalyList = anomalyType === 'critical' ? anomalies.critical : anomalies.warnings;
                          const anomaly = anomalyList.find(a => a.field === field);
                          
                          if (!anomaly) return null;
                          
                          const resolved = isAnomalyResolved(submission.id, field, anomaly.message, resolvedAnomalies);
                          
                          // Don't show if resolved and filter is off
                          if (resolved && !showResolvedAnomalies) return null;

                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="relative">
                                    <IconComponent className={resolved ? "h-4 w-4 text-gray-400" : `h-4 w-4 ${colorClass}`} />
                                    {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {resolved ? (
                                    <div className="space-y-1 text-xs">
                                      <p className="font-medium text-green-500">✓ Resolved by Admin</p>
                                      <p className="text-muted-foreground">{anomaly.message}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(resolved.resolved_at).toLocaleDateString()}
                                      </p>
                                      {resolved.resolution_note && (
                                        <p className="italic text-muted-foreground">Note: {resolved.resolution_note}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm">{anomaly.message}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        };

                        const showUpPercent = submission.calls_dialled > 0 
                          ? ((submission.calls_taken / submission.calls_dialled) * 100).toFixed(1)
                          : "0";

                        return (
                          <TableRow key={submission.id} className={rowClass}>
                            <TableCell className="font-medium">
                              {new Date(submission.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {submission.created_at 
                                ? new Date(submission.created_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                    timeZoneName: 'short'
                                  })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {submission.attendance?.status === "absent" ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  🔴 Absent
                                  {submission.attendance.absence_type && (
                                    <span className="text-xs opacity-80">
                                      ({submission.attendance.absence_type.replace('_', ' ')})
                                    </span>
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="success" className="flex items-center gap-1 w-fit">
                                  🟢 Present
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {isAbsentOnly ? (
                                "-"
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {submission.source.map((src, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {getSourceDisplayLabel(src)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isAbsentOnly ? "-" : (submission.sub_source ? getSubSourceDisplayLabel(submission.sub_source) : "-")}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.rapport_built}
                                {renderCellAnomaly('rapport_built', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('rapport_built', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.calls_dialled}
                                {renderCellAnomaly('calls_dialled', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('calls_dialled', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.calls_taken}
                                {renderCellAnomaly('calls_taken', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('calls_taken', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.touched_base}
                                {renderCellAnomaly('touched_base', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('touched_base', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.calls_not_taken}
                                {renderCellAnomaly('calls_not_taken', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('calls_not_taken', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.others}
                                {renderCellAnomaly('others', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('others', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.disqualified}
                                {renderCellAnomaly('disqualified', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('disqualified', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.followed_up}
                                {renderCellAnomaly('followed_up', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('followed_up', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isAbsentOnly ? "-" : `${showUpPercent}%`}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.sm_rp}
                                {renderCellAnomaly('sm_rp', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('sm_rp', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.sm_enrolled}
                                {renderCellAnomaly('sm_enrolled', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('sm_enrolled', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isAbsentOnly ? "-" : submission.sm_rp_to_enrolled}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.fu_rp}
                                {renderCellAnomaly('fu_rp', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('fu_rp', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isAbsentOnly ? "-" : submission.fu_enrolled}
                                {renderCellAnomaly('fu_enrolled', 'critical', AlertCircle, 'text-red-500')}
                                {renderCellAnomaly('fu_enrolled', 'warnings', AlertTriangle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isAbsentOnly ? "-" : submission.fu_rp_to_enrolled}
                            </TableCell>
                            <TableCell>
                              {isAbsentOnly ? (
                                <Badge variant="secondary" className="text-xs">
                                  N/A
                                </Badge>
                              ) : submission.task_completion_status ? (
                                <Badge 
                                  variant={submission.task_completion_status === "Yes" ? "success" : "secondary"}
                                  className="text-xs"
                                >
                                  {submission.task_completion_status}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">Not specified</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* TOTAL Row */}
                      <TableRow className="bg-muted/50 font-bold border-t-2 border-primary">
                        <TableCell colSpan={5} className="text-base">TOTAL</TableCell>
                        <TableCell className="text-center">{totals.rapportBuilt}</TableCell>
                        <TableCell className="text-center">{totals.callsDialled}</TableCell>
                        <TableCell className="text-center">{totals.callsTaken}</TableCell>
                        <TableCell className="text-center">{totals.touchedBase}</TableCell>
                        <TableCell className="text-center">{totals.callsNotTaken}</TableCell>
                        <TableCell className="text-center">{totals.others}</TableCell>
                        <TableCell className="text-center">{totals.disqualified}</TableCell>
                        <TableCell className="text-center">{totals.followedUp}</TableCell>
                        <TableCell className="text-center">{totalShowUpPercent}%</TableCell>
                        <TableCell className="text-center">{totals.smRP}</TableCell>
                        <TableCell className="text-center">{totals.smEnrolled}</TableCell>
                        <TableCell className="text-center">{totals.smRPToEnrolled}</TableCell>
                        <TableCell className="text-center">{totals.fuRP}</TableCell>
                        <TableCell className="text-center">{totals.fuEnrolled}</TableCell>
                        <TableCell className="text-center">{totals.fuRPToEnrolled}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-center">
            <Button onClick={() => navigate("/employee/daily-submit")}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Submission
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default History;