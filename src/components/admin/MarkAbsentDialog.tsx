import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarkAbsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: { id: string; name: string } | null;
  selectedDate: string;
  onSuccess: () => void;
}

export const MarkAbsentDialog = ({ open, onOpenChange, employee, selectedDate, onSuccess }: MarkAbsentDialogProps) => {
  const [absenceType, setAbsenceType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!employee || !absenceType) {
      toast.error("Please select absence type");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("attendance")
        .insert([{
          user_id: employee.id,
          date: selectedDate,
          status: "absent" as const,
          absence_type: absenceType as any,
          notes: notes || null,
          marked_by: session.user.id
        }]);

      if (error) throw error;

      toast.success(`Marked ${employee.name} as absent`);
      setAbsenceType("");
      setNotes("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error marking absent:", error);
      toast.error(error.message || "Failed to mark attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Employee Absent</DialogTitle>
          <DialogDescription>
            Mark {employee?.name} as absent for {new Date(selectedDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Absence Type *</Label>
            <Select value={absenceType} onValueChange={setAbsenceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select absence type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="casual_leave">Casual Leave</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="unapproved">Unapproved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add context or details about the absence..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Mark Absent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};