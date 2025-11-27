import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createManualAnomaly } from "@/lib/manualAnomalies";
import { toast } from "@/hooks/use-toast";

interface AddBlackMarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  submissionDate: string;
  userName: string;
  preSelectedField?: string;
  onBlackMarkAdded: () => void;
}

const EDITABLE_FIELDS = [
  { value: 'rapport_built', label: 'Rapport Built' },
  { value: 'calls_dialled', label: 'Calls Dialled' },
  { value: 'calls_taken', label: 'Calls Taken' },
  { value: 'touched_base', label: 'Touched Base' },
  { value: 'calls_not_taken', label: 'Calls Not Taken' },
  { value: 'others', label: 'Others' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'followed_up', label: 'Followed Up' },
  { value: 'sm_rp', label: 'SM RP' },
  { value: 'sm_enrolled', label: 'SM Enrolled' },
  { value: 'sm_rp_to_enrolled', label: 'SM RP to Enrolled' },
  { value: 'fu_rp', label: 'FU RP' },
  { value: 'fu_enrolled', label: 'FU Enrolled' },
  { value: 'fu_rp_to_enrolled', label: 'FU RP to Enrolled' },
  { value: 'source', label: 'Source' },
  { value: 'sub_source', label: 'Sub-Source' },
  { value: 'is_crm_updated', label: 'CRM Updated' },
  { value: 'task_completion_status', label: 'Task Completion' },
  { value: 'performance_rating', label: 'Performance Rating' },
  { value: 'attendance_status', label: 'Attendance Status' },
  { value: 'absence_type', label: 'Absence Type' },
  { value: 'date', label: 'Date' },
  { value: 'general', label: 'General (Row-level)' },
];

export const AddBlackMarkDialog = ({
  open,
  onOpenChange,
  submissionId,
  submissionDate,
  userName,
  preSelectedField,
  onBlackMarkAdded
}: AddBlackMarkDialogProps) => {
  const [selectedField, setSelectedField] = useState(preSelectedField || "");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = () => {
    if (!preSelectedField) setSelectedField("");
    setReason("");
  };

  const handleAdd = async () => {
    if (!selectedField || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a field and provide a reason.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createManualAnomaly(submissionId, selectedField, reason.trim());
      
      if (result.success) {
        toast({
          title: "Black Mark Added",
          description: `Successfully flagged ${selectedField} with a black mark.`
        });
        onBlackMarkAdded();
        onOpenChange(false);
        handleReset();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error adding black mark:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add black mark. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">⚫</span>
            Add Black Mark
          </DialogTitle>
          <DialogDescription>
            {userName} • {new Date(submissionDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field">Field to Flag *</Label>
            <Select 
              value={selectedField} 
              onValueChange={setSelectedField}
              disabled={!!preSelectedField}
            >
              <SelectTrigger id="field">
                <SelectValue placeholder="Select a field" />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_FIELDS.map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preSelectedField && (
              <p className="text-xs text-muted-foreground">
                Field pre-selected from edit mode
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Black Mark *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this field is being flagged (e.g., 'Data verified incorrect during call audit', 'Employee confirmed wrong entry', etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be visible to admins and can be edited later
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-3 rounded-md">
            <p className="text-xs text-purple-900 dark:text-purple-100">
              <strong>Black Mark:</strong> A manual flag indicating a serious data quality issue requiring admin attention. Can be resolved/unresolved like other anomalies.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              handleReset();
            }} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={isSubmitting || !selectedField || !reason.trim()}
            className="bg-purple-900 hover:bg-purple-800"
          >
            Add Black Mark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
