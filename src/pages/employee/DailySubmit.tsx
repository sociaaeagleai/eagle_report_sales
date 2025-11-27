import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronsUpDown, X, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getBatchForSource, getSourceDisplayLabel, getSourceDbValue } from "@/lib/sourceBatches";
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
  const [isCrmUpdated, setIsCrmUpdated] = useState("");
  const [callsDialled, setCallsDialled] = useState(0);
  const [callsTaken, setCallsTaken] = useState(0);
  const [rapportBuilt, setRapportBuilt] = useState(0);
  const [touchedBase, setTouchedBase] = useState(0);
  const [callsNotTaken, setCallsNotTaken] = useState(0);
  const [followedUp, setFollowedUp] = useState(0);
  const [others, setOthers] = useState(0);
  const [disqualified, setDisqualified] = useState(0);

  // Same Month Closing
  const [smRp, setSmRp] = useState(0);
  const [smEnrolled, setSmEnrolled] = useState(0);
  const [smRpToEnrolled, setSmRpToEnrolled] = useState(0);

  // Follow-up Closing
  const [fuRp, setFuRp] = useState(0);
  const [fuEnrolled, setFuEnrolled] = useState(0);
  const [fuRpToEnrolled, setFuRpToEnrolled] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);

    // Fetch user's mode
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
    if (!userId || selectedSources.length === 0 || !isCrmUpdated) {
      toast.error("Please fill all required fields");
      return;
    }

  // Detect anomalies and show warnings (non-blocking)
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

    // Show non-blocking warnings via toast
    if (anomalies.critical.length > 0) {
      anomalies.critical.forEach(a => {
        toast.warning(a.message, { duration: 5000 });
      });
    }
    if (anomalies.warnings.length > 0) {
      anomalies.warnings.forEach(a => {
        toast.warning(a.message, { duration: 5000 });
      });
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("daily_submissions").upsert([{
        user_id: userId,
        date: today,
        source: selectedSources.map(s => getSourceDbValue(s)),
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
      }]);

      if (error) throw error;

      toast.success("Daily submission completed!");
      
      // Check for warnings before navigating
      if (anomalies.critical.length > 0 || anomalies.warnings.length > 0) {
        setPendingNavigation("/employee/history");
        setShowWarningDialog(true);
      } else {
        navigate("/employee/history");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit data");
    } finally {
      setIsLoading(false);
    }
  };

  // Define source options based on mode - now returns display labels
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

  // Batch logic for multi-select
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

  // Real-time anomaly detection for current form values
  const currentAnomalies = detectAnomalies({
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

  // Get all form values for border class calculation
  const allFormValues = {
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
              {(currentAnomalies.critical.length > 0 || currentAnomalies.warnings.length > 0) && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Data Quality Warnings:</p>
                      {currentAnomalies.critical.map((a, i) => (
                        <p key={i} className="text-sm">• {a.message}</p>
                      ))}
                      {currentAnomalies.warnings.map((a, i) => (
                        <p key={i} className="text-sm">• {a.message}</p>
                      ))}
                      <p className="text-sm mt-2 text-muted-foreground">You can still submit, but please verify your data.</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
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
                      
                      {/* Show selected sources as badges below dropdown */}
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

                {/* Calls & Activities */}
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
                        className={getInputBorderClass(callsDialled, allFormValues, 'calls_dialled')}
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
                        className={getInputBorderClass(callsTaken, allFormValues, 'calls_taken')}
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
                        className={getInputBorderClass(disqualified, allFormValues, 'disqualified')}
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
                        className={getInputBorderClass(followedUp, allFormValues, 'followed_up')}
                      />
                    </div>
                  </div>
                </div>

                {/* Same Month Closing */}
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

                {/* Follow-up Closing */}
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

                <Button 
                  type="submit" 
                  className="w-full bg-employee-accent hover:bg-employee-accent/90 text-employee-accent-foreground" 
                  size="lg" 
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit Source"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Warning Dialog for Navigation */}
          <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Data Quality Warnings Detected</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    You have {currentAnomalies.critical.length} critical issue(s) and {currentAnomalies.warnings.length} warning(s).
                  </p>
                  
                  <div className="max-h-[200px] overflow-y-auto space-y-2 text-sm">
                    {currentAnomalies.critical.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-medium text-red-600">Critical Issues:</p>
                        {currentAnomalies.critical.map((anomaly, i) => (
                          <p key={`crit-${i}`} className="text-foreground/80 pl-2">
                            • {anomaly.message}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {currentAnomalies.warnings.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-medium text-yellow-600">Warnings:</p>
                        {currentAnomalies.warnings.map((anomaly, i) => (
                          <p key={`warn-${i}`} className="text-foreground/80 pl-2">
                            • {anomaly.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground">
                    Do you want to proceed anyway or check your data again?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPendingNavigation(null)}>
                  Check Again
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  if (pendingNavigation) {
                    navigate(pendingNavigation);
                  }
                }}>
                  Proceed Anyway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default DailySubmit;
