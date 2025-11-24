import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, Star, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import DashboardHeader from "@/components/DashboardHeader";
import { detectAnomalies } from "@/lib/anomalyDetection";
import { isAnomalyResolved, type ResolvedAnomaly } from "@/lib/anomalyResolution";

interface Submission {
  id: string;
  date: string;
  source: string;
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
}

const History = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<ResolvedAnomaly[]>([]);
  const [showResolvedAnomalies, setShowResolvedAnomalies] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("daily_submissions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;

      const submissionIds = (data || []).map(s => s.id);
      
      // Fetch resolved anomalies for these submissions
      const { data: resolvedData, error: resolvedError } = await supabase
        .from("anomaly_resolutions" as any)
        .select("*")
        .in("submission_id", submissionIds);

      if (resolvedError) {
        console.error("Error fetching resolved anomalies:", resolvedError);
      }

      setSubmissions(data || []);
      setResolvedAnomalies((resolvedData as any) || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-employee-bg">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg border-employee-border bg-employee-bg">
            <CardHeader className="border-b border-employee-border">
              <CardTitle className="text-employee-fg">Submission History</CardTitle>
              <CardDescription className="flex items-center justify-between text-employee-fg/70">
                <span>Your last 30 daily performance submissions</span>
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
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : submissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submissions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[100px]">Source</TableHead>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission) => {
                        // Detect anomalies for employee's own data
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
                        });

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
                        if (unresolvedCritical.length > 0) rowClass = "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500";
                        else if (unresolvedWarnings.length > 0) rowClass = "bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500";
                        else if (hasSuccess && unresolvedCritical.length === 0 && unresolvedWarnings.length === 0) rowClass = "bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500";

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
                                      {resolved.resolution_note && (
                                        <p className="italic text-muted-foreground">Note: {resolved.resolution_note}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="font-medium">{anomaly.message}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        };

                        return (
                          <TableRow key={submission.id} className={rowClass}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {new Date(submission.date).toLocaleDateString()}
                                {(hasCritical || hasWarnings || hasSuccess) && (
                                  <div className="flex items-center gap-1">
                                    {anomalies.critical.map(a => renderAnomalyIcon(a, AlertTriangle, "text-red-500"))}
                                    {anomalies.warnings.map(a => renderAnomalyIcon(a, AlertCircle, "text-yellow-500"))}
                                    {anomalies.info.map(a => renderAnomalyIcon(a, Info, "text-blue-500"))}
                                    {anomalies.success.map(a => renderAnomalyIcon(a, Star, "text-green-500 fill-current"))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{submission.source}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {submission.rapport_built}
                                {renderCellAnomaly('activities', 'warnings', AlertCircle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {submission.calls_dialled}
                                {renderCellAnomaly('activities', 'critical', AlertCircle, 'text-orange-500')}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-2">
                                {submission.calls_taken}
                                {renderCellAnomaly('calls_taken', 'critical', AlertTriangle, 'text-red-500')}
                                {renderCellAnomaly('calls_taken', 'warnings', AlertCircle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell>{submission.touched_base}</TableCell>
                            <TableCell className="text-destructive">{submission.calls_not_taken}</TableCell>
                            <TableCell>{submission.others}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {submission.disqualified}
                                {renderCellAnomaly('disqualified', 'warnings', AlertCircle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell>{submission.followed_up}</TableCell>
                            <TableCell className="font-semibold">
                              {submission.calls_dialled > 0 
                                ? `${((submission.calls_taken / submission.calls_dialled) * 100).toFixed(1)}%`
                                : '0.0%'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {submission.sm_rp}
                                {renderCellAnomaly('rp', 'warnings', AlertCircle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              <div className="flex items-center gap-2">
                                {submission.sm_enrolled}
                                {(() => {
                                  const infoAnomaly = anomalies.info.find(a => a.field === 'enrolled');
                                  if (infoAnomaly) {
                                    const resolved = isAnomalyResolved(submission.id, 'enrolled', infoAnomaly.message, resolvedAnomalies);
                                    if (!resolved || showResolvedAnomalies) {
                                      return (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <div className="relative">
                                                <Info className={resolved ? "h-4 w-4 text-gray-400" : "h-4 w-4 text-blue-500"} />
                                                {resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -bottom-0.5 -right-0.5" />}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {resolved ? (
                                                <div className="space-y-1 text-xs">
                                                  <p className="font-medium text-green-500">✓ Resolved by Admin</p>
                                                  <p className="text-muted-foreground">{infoAnomaly.message}</p>
                                                  {resolved.resolution_note && (
                                                    <p className="italic text-muted-foreground">Note: {resolved.resolution_note}</p>
                                                  )}
                                                </div>
                                              ) : (
                                                <p>{infoAnomaly.message}</p>
                                              )}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                                {renderCellAnomaly('enrolled', 'warnings', AlertCircle, 'text-yellow-500')}
                              </div>
                            </TableCell>
                            <TableCell>{submission.sm_rp_to_enrolled}</TableCell>
                            <TableCell>{submission.fu_rp}</TableCell>
                            <TableCell className="font-semibold text-blue-600">{submission.fu_enrolled}</TableCell>
                            <TableCell>{submission.fu_rp_to_enrolled}</TableCell>
                          </TableRow>
                        );
                      })}

                      {submissions.length > 0 && (() => {
                        // Calculate totals
                        const totals = submissions.reduce((acc, sub) => ({
                          rapport_built: acc.rapport_built + sub.rapport_built,
                          calls_taken: acc.calls_taken + sub.calls_taken,
                          calls_dialled: acc.calls_dialled + sub.calls_dialled,
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
                          rapport_built: 0,
                          calls_taken: 0,
                          calls_dialled: 0,
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

                        return (
                          <TableRow className="bg-muted/50 font-bold border-t-2 border-primary hover:bg-muted/50">
                            <TableCell className="font-bold text-base">TOTAL</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs font-semibold">
                                {new Set(submissions.map(s => s.source)).size} source{new Set(submissions.map(s => s.source)).size !== 1 ? 's' : ''}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold">{totals.rapport_built}</TableCell>
                            <TableCell className="font-bold">{totals.calls_taken}</TableCell>
                            <TableCell className="font-bold">{totals.calls_dialled}</TableCell>
                            <TableCell className="font-bold">{totals.touched_base}</TableCell>
                            <TableCell className="font-bold text-destructive">{totals.calls_not_taken}</TableCell>
                            <TableCell className="font-bold">{totals.others}</TableCell>
                            <TableCell className="font-bold">{totals.disqualified}</TableCell>
                            <TableCell className="font-bold">{totals.followed_up}</TableCell>
                            <TableCell className="font-bold">
                              {totals.calls_dialled > 0 
                                ? `${((totals.calls_taken / totals.calls_dialled) * 100).toFixed(1)}%`
                                : '0.0%'}
                            </TableCell>
                            <TableCell className="font-bold">{totals.sm_rp}</TableCell>
                            <TableCell className="font-bold text-green-600">{totals.sm_enrolled}</TableCell>
                            <TableCell className="font-bold">{totals.sm_rp_to_enrolled}</TableCell>
                            <TableCell className="font-bold">{totals.fu_rp}</TableCell>
                            <TableCell className="font-bold text-blue-600">{totals.fu_enrolled}</TableCell>
                            <TableCell className="font-bold">{totals.fu_rp_to_enrolled}</TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {submissions.length > 0 && (
                <div className="flex justify-center mt-6 pt-6 border-t border-border">
                  <Button 
                    onClick={() => navigate("/employee/submit")}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    Add Another Source
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default History;
