import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, Star, CheckCircle2, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ResolvedAnomaly } from "@/lib/anomalyResolution";
import { resolveManualAnomaly, unresolveManualAnomaly, updateManualAnomalyMessage } from "@/lib/manualAnomalies";

interface AnomalyResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  submissionDate: string;
  userName: string;
  anomaly: {
    type: 'critical' | 'warning' | 'info' | 'success' | 'blackmark';
    message: string;
    field?: string;
    isManual?: boolean;
    manualAnomalyId?: string;
  };
  existingResolution?: ResolvedAnomaly | null;
  onResolutionChange: () => void;
}

export const AnomalyResolutionDialog = ({
  open,
  onOpenChange,
  submissionId,
  submissionDate,
  userName,
  anomaly,
  existingResolution,
  onResolutionChange
}: AnomalyResolutionDialogProps) => {
  const [resolutionNote, setResolutionNote] = useState(existingResolution?.resolution_note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingReason, setIsEditingReason] = useState(false);
  const [editedReason, setEditedReason] = useState(anomaly.message);

  const getIcon = () => {
    switch (anomaly.type) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      case 'success': return <Star className="h-5 w-5 text-green-500" />;
      case 'blackmark': return <Flag className="h-5 w-5 text-purple-900" />;
    }
  };

  const getBadgeVariant = () => {
    switch (anomaly.type) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'success': return 'success';
      case 'blackmark': return 'default';
    }
  };

  const handleUpdateReason = async () => {
    if (!anomaly.manualAnomalyId || !editedReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await updateManualAnomalyMessage(anomaly.manualAnomalyId, editedReason.trim());
      
      if (result.success) {
        toast({
          title: "Reason Updated",
          description: "Black mark reason has been updated."
        });
        setIsEditingReason(false);
        onResolutionChange();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update reason.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    try {
      // Handle BLACK MARK (manual anomaly) differently
      if (anomaly.isManual && anomaly.manualAnomalyId) {
        const result = await resolveManualAnomaly(anomaly.manualAnomalyId, resolutionNote.trim() || undefined);
        
        if (result.success) {
          toast({
            title: "Black Mark Resolved",
            description: "The black mark has been marked as resolved."
          });
          onResolutionChange();
          onOpenChange(false);
          setResolutionNote("");
        } else {
          throw new Error(result.error);
        }
        return;
      }

      // Handle regular anomaly resolution
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('anomaly_resolutions' as any)
        .insert({
          submission_id: submissionId,
          anomaly_type: anomaly.type,
          anomaly_field: anomaly.field || 'general',
          anomaly_message: anomaly.message,
          resolved_by: session.user.id,
          resolution_note: resolutionNote.trim() || null
        } as any);

      if (error) throw error;

      toast({
        title: "Anomaly Resolved",
        description: "The data quality issue has been marked as resolved."
      });

      onResolutionChange();
      onOpenChange(false);
      setResolutionNote("");
    } catch (error: any) {
      console.error("Error resolving anomaly:", error);
      
      // Check for unique constraint violation (already resolved)
      if (error.message?.includes('duplicate key') || 
          error.code === '23505' ||
          error.message?.includes('unique constraint')) {
        toast({
          title: "Already Resolved",
          description: "This anomaly has already been marked as resolved.",
          variant: "default"
        });
        // Refresh data to show the existing resolution
        onResolutionChange();
        onOpenChange(false);
        return;
      }
      
      // Check for RLS policy violation
      if (error.message?.includes('row-level security') || 
          error.message?.includes('policy') ||
          error.code === '42501') {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to resolve anomalies.",
          variant: "destructive"
        });
        // Still refresh to ensure UI is in sync
        onResolutionChange();
        return;
      }

      // Check for foreign key violation
      if (error.message?.includes('foreign key') || 
          error.code === '23503') {
        toast({
          title: "Submission Not Found",
          description: "The submission associated with this anomaly no longer exists.",
          variant: "destructive"
        });
        onResolutionChange();
        return;
      }
      
      // Generic error
      toast({
        title: "Error",
        description: error.message || "Failed to resolve anomaly. Please try again.",
        variant: "destructive"
      });
      
      // Always refresh to keep UI in sync
      onResolutionChange();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnresolve = async () => {
    setIsSubmitting(true);
    try {
      // Handle BLACK MARK (manual anomaly) differently
      if (anomaly.isManual && anomaly.manualAnomalyId) {
        const result = await unresolveManualAnomaly(anomaly.manualAnomalyId);
        
        if (result.success) {
          toast({
            title: "Black Mark Unresolved",
            description: "The black mark has been marked as unresolved."
          });
          onResolutionChange();
          onOpenChange(false);
          setResolutionNote("");
        } else {
          throw new Error(result.error);
        }
        return;
      }

      // Handle regular anomaly
      if (!existingResolution) return;
      
      const { error } = await supabase
        .from('anomaly_resolutions' as any)
        .delete()
        .eq('id', existingResolution.id);

      if (error) throw error;

      toast({
        title: "Resolution Removed",
        description: "The anomaly has been marked as unresolved."
      });

      onResolutionChange();
      onOpenChange(false);
      setResolutionNote("");
    } catch (error: any) {
      console.error("Error unresolving anomaly:", error);
      
      // Check for RLS policy violation
      if (error.message?.includes('row-level security') || 
          error.message?.includes('policy') ||
          error.code === '42501') {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to unresolve anomalies.",
          variant: "destructive"
        });
        onResolutionChange();
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to unresolve anomaly. Please try again.",
        variant: "destructive"
      });
      
      // Always refresh to keep UI in sync
      onResolutionChange();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {existingResolution ? "Resolved Anomaly" : "Resolve Anomaly"}
          </DialogTitle>
          <DialogDescription>
            {userName} • {new Date(submissionDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Anomaly Type</Label>
            <Badge 
              variant={getBadgeVariant()} 
              className={anomaly.type === 'blackmark' ? 'bg-purple-900 text-white capitalize' : 'capitalize'}
            >
              {anomaly.type === 'blackmark' ? 'Black Mark (Admin Flagged)' : anomaly.type}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label>
              {anomaly.isManual ? 'Flagging Reason' : 'Issue Description'}
              {anomaly.isManual && !existingResolution && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2 h-6 text-xs"
                  onClick={() => setIsEditingReason(!isEditingReason)}
                >
                  {isEditingReason ? 'Cancel' : 'Edit Reason'}
                </Button>
              )}
            </Label>
            {isEditingReason ? (
              <div className="space-y-2">
                <Textarea
                  value={editedReason}
                  onChange={(e) => setEditedReason(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button 
                  size="sm" 
                  onClick={handleUpdateReason} 
                  disabled={isSubmitting || !editedReason.trim()}
                >
                  Save Reason
                </Button>
              </div>
            ) : (
              <p className={`text-sm text-muted-foreground border p-3 rounded-md ${
                anomaly.type === 'blackmark' ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' : 'bg-muted/50'
              }`}>
                {anomaly.message}
              </p>
            )}
          </div>

          {anomaly.field && (
            <div className="space-y-2">
              <Label>Affected Field</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {anomaly.field}
              </Badge>
            </div>
          )}

          {existingResolution ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Resolution Note
              </Label>
              <p className="text-sm text-muted-foreground border p-3 rounded-md bg-green-50 dark:bg-green-950/20">
                {existingResolution.resolution_note || "No note provided"}
              </p>
              <p className="text-xs text-muted-foreground">
                Resolved on {new Date(existingResolution.resolved_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="resolution-note">
                Resolution Note <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="resolution-note"
                placeholder="Add context about why this anomaly is being resolved (e.g., 'Data verified with employee', 'Expected behavior for this scenario', etc.)"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          {existingResolution ? (
            <Button variant="destructive" onClick={handleUnresolve} disabled={isSubmitting}>
              Unresolve
            </Button>
          ) : (
            <Button onClick={handleResolve} disabled={isSubmitting}>
              Mark as Resolved
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
