import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronsUpDown, X, Info, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  getBatchForSource, 
  getSourceDisplayLabel, 
  getSourceDbValue,
  requiresSubSource,
  getSubSourceOptions,
  getSubSourceDbValue
} from "@/lib/sourceBatches";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import DashboardHeader from "@/components/DashboardHeader";
import { detectAnomalies, getInputBorderClass } from "@/lib/anomalyDetection";

interface SubSourceMetrics {
  callsDialled: number;
  callsTaken: number;
  rapportBuilt: number;
  touchedBase: number;
  callsNotTaken: number;
  followedUp: number;
  others: number;
  disqualified: number;
  smRp: number;
  smEnrolled: number;
  smRpToEnrolled: number;
  fuRp: number;
  fuEnrolled: number;
  fuRpToEnrolled: number;
}

const DailySubmit = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userMode, setUserMode] = useState<"AI" | "DM" | null>(null);
  const [today] = useState(new Date().toISOString().split("T")[0]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Form state
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSubSources, setSelectedSubSources] = useState<string[]>([]);
  const [isCrmUpdated, setIsCrmUpdated] = useState("");
  
  // Metrics per sub-source
  const [metricsPerSubSource, setMetricsPerSubSource] = useState<Record<string, SubSourceMetrics>>({});

  // Standard metrics (for sources without sub-sources)
  const [callsDialled, setCallsDialled] = useState(0);
  const [callsTaken, setCallsTaken] = useState(0);
  const [rapportBuilt, setRapportBuilt] = useState(0);
  const [touchedBase, setTouchedBase] = useState(0);
  const [callsNotTaken, setCallsNotTaken] = useState(0);
  const [followedUp, setFollowedUp] = useState(0);
  const [others, setOthers] = useState(0);
  const [disqualified, setDisqualified] = useState(0);
  const [smRp, setSmRp] = useState(0);
  const [smEnrolled, setSmEnrolled] = useState(0);
  const [smRpToEnrolled, setSmRpToEnrolled] = useState(0);
  const [fuRp, setFuRp] = useState(0);
  const [fuEnrolled, setFuEnrolled] = useState(0);
  const [fuRpToEnrolled, setFuRpToEnrolled] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  // Reset sub-source selection when sources change
  useEffect(() => {
    if (selectedSources.length > 0 && userMode) {
      const needsSubSource = requiresSubSource(selectedSources, userMode);
      if (!needsSubSource) {
        setSelectedSubSources([]);
        setMetricsPerSubSource({});
      } else {
        // Get available options and remove any invalid selections
        const availableOptions = getSubSourceOptions(selectedSources, userMode);
        setSelectedSubSources(prev => prev.filter(ss => availableOptions.includes(ss)));
      }
    } else {
      setSelectedSubSources([]);
      setMetricsPerSubSource({});
    }
  }, [selectedSources, userMode]);

  // Initialize metrics when sub-sources change
  useEffect(() => {
    const newMetrics: Record<string, SubSourceMetrics> = {};
    selectedSubSources.forEach(subSource => {
      const key = subSource.toLowerCase();
      newMetrics[key] = metricsPerSubSource[key] || {
        callsDialled: 0,
        callsTaken: 0,
        rapportBuilt: 0,
        touchedBase: 0,
        callsNotTaken: 0,
        followedUp: 0,
        others: 0,
        disqualified: 0,
        smRp: 0,
        smEnrolled: 0,
        smRpToEnrolled: 0,
        fuRp: 0,
        fuEnrolled: 0,
        fuRpToEnrolled: 0,
      };
    });
    setMetricsPerSubSource(newMetrics);
  }, [selectedSubSources]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("mode")
      .eq("id", session.user.id)
      .single();

    if (profile?.mode) {
      setUserMode(profile.mode);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || selectedSources.length === 0 || !isCrmUpdated || !userMode) {
      toast.error("Please fill all required fields");
      return;
    }

    const needsSubSource = requiresSubSource(selectedSources, userMode);
    if (needsSubSource && selectedSubSources.length === 0) {
      toast.error("Please select at least one sub-source");
      return;
    }

    setIsLoading(true);
    try {
      const sourceDbValues = selectedSources.map(s => getSourceDbValue(s));

      if (needsSubSource) {
        // Create one row per sub-source
        for (const subSource of selectedSubSources) {
          const key = subSource.toLowerCase();
          const metrics = metricsPerSubSource[key];
          
          // Detect anomalies for this sub-source
          const anomalies = detectAnomalies({
            calls_dialled: metrics.callsDialled,
            calls_taken: metrics.callsTaken,
            rapport_built: metrics.rapportBuilt,
            touched_base: metrics.touchedBase,
            calls_not_taken: metrics.callsNotTaken,
            others: metrics.others,
            disqualified: metrics.disqualified,
            followed_up: metrics.followedUp,
            sm_rp: metrics.smRp,
            sm_enrolled: metrics.smEnrolled,
            fu_rp: metrics.fuRp,
            fu_enrolled: metrics.fuEnrolled,
          });
          if (anomalies.critical.length > 0) {
            anomalies.critical.forEach(a => toast.warning(`${subSource}: ${a.message}`, { duration: 5000 }));
          }
          if (anomalies.warnings.length > 0) {
            anomalies.warnings.forEach(a => toast.warning(`${subSource}: ${a.message}`, { duration: 5000 }));
          }

          const { error } = await supabase.from("daily_submissions").upsert({
            user_id: userId,
            date: today,
            source: sourceDbValues,
            sub_source: getSubSourceDbValue(subSource),
            is_crm_updated: isCrmUpdated,
            calls_dialled: metrics.callsDialled,
            calls_taken: metrics.callsTaken,
            rapport_built: metrics.rapportBuilt,
            touched_base: metrics.touchedBase,
            calls_not_taken: metrics.callsNotTaken,
            followed_up: metrics.followedUp,
            others: metrics.others,
            disqualified: metrics.disqualified,
            sm_rp: metrics.smRp,
            sm_enrolled: metrics.smEnrolled,
            sm_rp_to_enrolled: metrics.smRpToEnrolled,
            fu_rp: metrics.fuRp,
            fu_enrolled: metrics.fuEnrolled,
            fu_rp_to_enrolled: metrics.fuRpToEnrolled,
          });

          if (error) throw error;
        }
      } else {
        // Standard submission without sub-source
        const anomalies = detectAnomalies({
          calls_dialled: callsDialled,
          calls_taken: callsTaken,
          rapport_built: rapportBuilt,
          touched_base: touchedBase,
          calls_not_taken: callsNotTaken,
          others,
          disqualified,
          followed_up: followedUp,
          sm_rp: smRp,
          sm_enrolled: smEnrolled,
          fu_rp: fuRp,
          fu_enrolled: fuEnrolled,
        });

        if (anomalies.critical.length > 0) {
          anomalies.critical.forEach(a => toast.warning(a.message, { duration: 5000 }));
        }
        if (anomalies.warnings.length > 0) {
          anomalies.warnings.forEach(a => toast.warning(a.message, { duration: 5000 }));
        }

        const { error } = await supabase.from("daily_submissions").upsert({
          user_id: userId,
          date: today,
          source: sourceDbValues,
          sub_source: null,
          is_crm_updated: isCrmUpdated,
          calls_dialled: callsDialled,
          calls_taken: callsTaken,
          rapport_built: rapportBuilt,
          touched_base: touchedBase,
          calls_not_taken: callsNotTaken,
          followed_up: followedUp,
          others,
          disqualified,
          sm_rp: smRp,
          sm_enrolled: smEnrolled,
          sm_rp_to_enrolled: smRpToEnrolled,
          fu_rp: fuRp,
          fu_enrolled: fuEnrolled,
          fu_rp_to_enrolled: fuRpToEnrolled,
        });

        if (error) throw error;
      }

      toast.success("Daily submission completed!");
      navigate("/employee/history");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit data");
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceOptions = () => {
    if (!userMode) return [];
    
    const aiSources = [
      "Micro VSL", "VSL", "Manoj", "Thiru", "Sha", 
      "Meta Leads", "CTWA", "Direct Call", "Direct Visit", 
      "Direct WhatsApp", "WABA", "Website", "Social Media", 
      "Webinar", "Referral"
    ];

    const dmSources = [
      "Micro VSL", "VSL", "GDD", "Sha", "Vishnu",
      "Meta Leads", "CTWA", "Direct Call", "Direct Visit",
      "Direct WhatsApp", "WABA", "Website", "Social Media",
      "Webinar", "Referral"
    ];

    return userMode === "AI" ? aiSources : dmSources;
  };

  const getActiveBatchId = (): number | null => {
    if (selectedSources.length === 0) return null;
    return getBatchForSource(selectedSources[0], userMode!);
  };

  const isSourceDisabled = (source: string): boolean => {
    if (selectedSources.length === 0) return false;
    const activeBatch = getActiveBatchId();
    const sourceBatch = getBatchForSource(source, userMode!);
    return activeBatch !== sourceBatch;
  };

  const needsSubSource = userMode && selectedSources.length > 0 && requiresSubSource(selectedSources, userMode);
  const subSourceOptions = needsSubSource ? getSubSourceOptions(selectedSources, userMode!) : [];
  const sectionsDisabled = needsSubSource && selectedSubSources.length === 0;

  // Sort sub-sources: Booked/Qualified first, then Optin
  const sortedSubSources = [...selectedSubSources].sort((a, b) => {
    if (a === 'Booked' || a === 'Qualified') return -1;
    if (b === 'Booked' || b === 'Qualified') return 1;
    return 0;
  });

  const updateMetric = (subSource: string, field: keyof SubSourceMetrics, value: number) => {
    const key = subSource.toLowerCase();
    setMetricsPerSubSource(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const renderMetricsSections = (subSource: string, index: number) => {
    const key = subSource.toLowerCase();
    const metrics = metricsPerSubSource[key] || {} as SubSourceMetrics;
    const isBookedOrQualified = subSource === 'Booked' || subSource === 'Qualified';
    
    // Create source display string
    const sourceDisplay = selectedSources.join(' + ');
    const sectionTitle = `${sourceDisplay} → ${subSource}`;

    return (
      <div key={subSource} className="space-y-6">
        {/* Sticky heading with prominent styling */}
        <div className={cn(
          "sticky top-0 z-10 p-4 rounded-lg border-2",
          isBookedOrQualified 
            ? "bg-purple-100 dark:bg-purple-950 border-purple-500" 
            : "bg-blue-100 dark:bg-blue-950 border-blue-500"
        )}>
          <h2 className={cn(
            "text-xl font-bold flex items-center gap-2",
            isBookedOrQualified ? "text-purple-900 dark:text-purple-100" : "text-blue-900 dark:text-blue-100"
          )}>
            {isBookedOrQualified ? "🟣" : "🔵"}
            <span>{sectionTitle}</span>
          </h2>
        </div>

        {/* Calls & Activities */}
        <div className="space-y-4 p-6 rounded-lg bg-employee-section-medium border border-employee-border">
          <h3 className="text-lg font-semibold text-employee-fg">Calls & Activities</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>No. of Rapport Built</Label>
              <Input
                type="number"
                min="0"
                value={metrics.rapportBuilt || 0}
                onChange={(e) => updateMetric(subSource, 'rapportBuilt', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of Calls Dialled</Label>
              <Input
                type="number"
                min="0"
                value={metrics.callsDialled || 0}
                onChange={(e) => updateMetric(subSource, 'callsDialled', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of Calls Taken</Label>
              <Input
                type="number"
                min="0"
                value={metrics.callsTaken || 0}
                onChange={(e) => updateMetric(subSource, 'callsTaken', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of Touched Base</Label>
              <Input
                type="number"
                min="0"
                value={metrics.touchedBase || 0}
                onChange={(e) => updateMetric(subSource, 'touchedBase', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Calls Not Taken</Label>
              <Input
                type="number"
                min="0"
                value={metrics.callsNotTaken || 0}
                onChange={(e) => updateMetric(subSource, 'callsNotTaken', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Others (DNP, DNS, etc.)</Label>
              <Input
                type="number"
                min="0"
                value={metrics.others || 0}
                onChange={(e) => updateMetric(subSource, 'others', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Disqualified / Not Interested</Label>
              <Input
                type="number"
                min="0"
                value={metrics.disqualified || 0}
                onChange={(e) => updateMetric(subSource, 'disqualified', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Followed Up</Label>
              <Input
                type="number"
                min="0"
                value={metrics.followedUp || 0}
                onChange={(e) => updateMetric(subSource, 'followedUp', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Same Month Closing */}
        <div className="space-y-4 p-6 rounded-lg bg-employee-section-dark border border-employee-border">
          <h3 className="text-lg font-semibold text-employee-fg">Same Month Closing</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>No. of RP</Label>
              <Input
                type="number"
                min="0"
                value={metrics.smRp || 0}
                onChange={(e) => updateMetric(subSource, 'smRp', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of Fully Enrolled</Label>
              <Input
                type="number"
                min="0"
                value={metrics.smEnrolled || 0}
                onChange={(e) => updateMetric(subSource, 'smEnrolled', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of RP to Enrolled</Label>
              <Input
                type="number"
                min="0"
                value={metrics.smRpToEnrolled || 0}
                onChange={(e) => updateMetric(subSource, 'smRpToEnrolled', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Follow-up Closing */}
        <div className="space-y-4 p-6 rounded-lg bg-employee-section-light border border-employee-border">
          <h3 className="text-lg font-semibold text-employee-fg">Follow-up Closing</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>No. of RP</Label>
              <Input
                type="number"
                min="0"
                value={metrics.fuRp || 0}
                onChange={(e) => updateMetric(subSource, 'fuRp', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of Fully Enrolled</Label>
              <Input
                type="number"
                min="0"
                value={metrics.fuEnrolled || 0}
                onChange={(e) => updateMetric(subSource, 'fuEnrolled', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of RP to Enrolled</Label>
              <Input
                type="number"
                min="0"
                value={metrics.fuRpToEnrolled || 0}
                onChange={(e) => updateMetric(subSource, 'fuRpToEnrolled', Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-employee-bg">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-employee-border bg-employee-bg">
            <CardHeader className="border-b border-employee-border">
              <CardTitle className="text-employee-fg">Daily Sales Performance</CardTitle>
              <CardDescription className="text-employee-fg/70">
                Submit your daily activities for {new Date(today).toLocaleDateString('en-US', { weekday: 'long' })}, {new Date(today).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-4 p-6 rounded-lg bg-employee-section-light border border-employee-border">
                  <h3 className="text-lg font-semibold text-employee-fg">Basic Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="source">
                        Source * {userMode && <span className="text-muted-foreground text-sm">({userMode} Team)</span>}
                      </Label>
                      <TooltipProvider>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {selectedSources.length === 0
                                ? "Select sources..."
                                : `${selectedSources.length} source${selectedSources.length > 1 ? 's' : ''} selected`}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 bg-white dark:bg-gray-800 z-50" align="start">
                            <Command>
                              <CommandInput placeholder="Search sources..." />
                              <CommandEmpty>No source found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {getSourceOptions().map((source) => {
                                  const disabled = isSourceDisabled(source);
                                  const isSelected = selectedSources.includes(source);
                                  
                                  return (
                                    <CommandItem
                                      key={source}
                                      value={source}
                                      disabled={disabled}
                                      onSelect={() => {
                                        if (disabled) return;
                                        
                                        setSelectedSources(prev =>
                                          prev.includes(source)
                                            ? prev.filter(s => s !== source)
                                            : [...prev, source]
                                        );
                                      }}
                                      className={cn(
                                        "flex items-center gap-2",
                                        disabled && "opacity-40 cursor-not-allowed"
                                      )}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        disabled={disabled}
                                        className="pointer-events-none"
                                      />
                                      <span className="flex-1">{source}</span>
                                      {disabled && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                                            <p className="text-sm">This source is from a different batch</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TooltipProvider>
                      
                      {selectedSources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedSources.map(source => (
                            <Badge key={source} variant="secondary" className="gap-1">
                              {source}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => setSelectedSources(prev => prev.filter(s => s !== source))}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sub-Source Multi-Select */}
                    {needsSubSource && (
                      <div className="space-y-2">
                        <Label htmlFor="sub-source">
                          Sub-Source * <span className="text-xs text-muted-foreground">(Select one or more)</span>
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {selectedSubSources.length === 0
                                ? "Select sub-sources..."
                                : `${selectedSubSources.length} sub-source${selectedSubSources.length > 1 ? 's' : ''} selected`}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 bg-white dark:bg-gray-800 z-50" align="start">
                            <Command>
                              <CommandEmpty>No sub-source found.</CommandEmpty>
                              <CommandGroup>
                                {subSourceOptions.map((subSource) => {
                                  const isSelected = selectedSubSources.includes(subSource);
                                  
                                  return (
                                    <CommandItem
                                      key={subSource}
                                      value={subSource}
                                      onSelect={() => {
                                        setSelectedSubSources(prev =>
                                          prev.includes(subSource)
                                            ? prev.filter(s => s !== subSource)
                                            : [...prev, subSource]
                                        );
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        className="pointer-events-none"
                                      />
                                      <span className="flex-1">{subSource}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        {selectedSubSources.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedSubSources.map(subSource => (
                              <Badge key={subSource} variant="secondary" className="gap-1">
                                {subSource}
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => setSelectedSubSources(prev => prev.filter(s => s !== subSource))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="crm-updated">
                        Is this data updated inside the CRM? *
                      </Label>
                      <Select value={isCrmUpdated} onValueChange={setIsCrmUpdated} required>
                        <SelectTrigger id="crm-updated">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes(100%)">Yes(100%)</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Warning if sub-source required but not selected */}
                {sectionsDisabled && (
                  <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">Please select at least one sub-source before entering data.</p>
                      <p className="text-sm mt-1">The form sections below will become available once you make a selection.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Dynamic sections based on sub-source */}
                {needsSubSource ? (
                  sectionsDisabled ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a sub-source to continue</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {sortedSubSources.map((subSource, index) => renderMetricsSections(subSource, index))}
                    </div>
                  )
                ) : (
                  <>
                    {/* Standard Calls & Activities */}
                    <div className="space-y-4 p-6 rounded-lg bg-employee-section-medium border border-employee-border">
                      <h3 className="text-lg font-semibold text-employee-fg">Calls & Activities</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rapport-built">No. of Rapport Built</Label>
                          <Input
                            id="rapport-built"
                            type="number"
                            min="0"
                            value={rapportBuilt}
                            onChange={(e) => setRapportBuilt(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="calls-dialled">No. of Calls Dialled</Label>
                          <Input
                            id="calls-dialled"
                            type="number"
                            min="0"
                            value={callsDialled}
                            onChange={(e) => setCallsDialled(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="calls-taken">No. of Calls Taken</Label>
                          <Input
                            id="calls-taken"
                            type="number"
                            min="0"
                            value={callsTaken}
                            onChange={(e) => setCallsTaken(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="touched-base">No. of Touched Base</Label>
                          <Input
                            id="touched-base"
                            type="number"
                            min="0"
                            value={touchedBase}
                            onChange={(e) => setTouchedBase(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="calls-not-taken">Calls Not Taken</Label>
                          <Input
                            id="calls-not-taken"
                            type="number"
                            min="0"
                            value={callsNotTaken}
                            onChange={(e) => setCallsNotTaken(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="others">Others (DNP, DNS, etc.)</Label>
                          <Input
                            id="others"
                            type="number"
                            min="0"
                            value={others}
                            onChange={(e) => setOthers(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="disqualified">Disqualified / Not Interested</Label>
                          <Input
                            id="disqualified"
                            type="number"
                            min="0"
                            value={disqualified}
                            onChange={(e) => setDisqualified(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="followed-up">Followed Up</Label>
                          <Input
                            id="followed-up"
                            type="number"
                            min="0"
                            value={followedUp}
                            onChange={(e) => setFollowedUp(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Standard Same Month Closing */}
                    <div className="space-y-4 p-6 rounded-lg bg-employee-section-dark border border-employee-border">
                      <h3 className="text-lg font-semibold text-employee-fg">Same Month Closing</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sm-rp">No. of RP</Label>
                          <Input
                            id="sm-rp"
                            type="number"
                            min="0"
                            value={smRp}
                            onChange={(e) => setSmRp(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sm-enrolled">No. of Fully Enrolled</Label>
                          <Input
                            id="sm-enrolled"
                            type="number"
                            min="0"
                            value={smEnrolled}
                            onChange={(e) => setSmEnrolled(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sm-rp-enrolled">No. of RP to Enrolled</Label>
                          <Input
                            id="sm-rp-enrolled"
                            type="number"
                            min="0"
                            value={smRpToEnrolled}
                            onChange={(e) => setSmRpToEnrolled(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Standard Follow-up Closing */}
                    <div className="space-y-4 p-6 rounded-lg bg-employee-section-light border border-employee-border">
                      <h3 className="text-lg font-semibold text-employee-fg">Follow-up Closing</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fu-rp">No. of RP</Label>
                          <Input
                            id="fu-rp"
                            type="number"
                            min="0"
                            value={fuRp}
                            onChange={(e) => setFuRp(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fu-enrolled">No. of Fully Enrolled</Label>
                          <Input
                            id="fu-enrolled"
                            type="number"
                            min="0"
                            value={fuEnrolled}
                            onChange={(e) => setFuEnrolled(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fu-rp-enrolled">No. of RP to Enrolled</Label>
                          <Input
                            id="fu-rp-enrolled"
                            type="number"
                            min="0"
                            value={fuRpToEnrolled}
                            onChange={(e) => setFuRpToEnrolled(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-employee-accent hover:bg-employee-accent/90 text-employee-accent-foreground" 
                  size="lg" 
                  disabled={isLoading || sectionsDisabled}
                >
                  {isLoading ? "Submitting..." : "Submit Data"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DailySubmit;
