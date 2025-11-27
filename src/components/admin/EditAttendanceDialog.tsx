import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface AttendanceRecord {
  id?: string;
  user_id: string;
  date: string;
  status: string;
  absence_type?: string | null;
  notes?: string | null;
  marked_by?: string | null;
}

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: AttendanceRecord | null;
  employeeName: string;
  markedByName: string;
  onSuccess: () => void;
}

export const EditAttendanceDialog = ({ open, onOpenChange, attendance, employeeName, markedByName, onSuccess }: EditAttendanceDialogProps) => {
  const [status, setStatus] = useState<string>("present");
  const [absenceType, setAbsenceType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (attendance) {
      setStatus(attendance.status);
      setAbsenceType(attendance.absence_type || "");
      setNotes(attendance.notes || "");
    }
  }, [attendance]);

  const handleSubmit = async () => {
    if (!attendance) return;

    if (status === "absent" && !absenceType) {
      toast.error("Please select absence type");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const updateData: any = {
        status,
        notes: notes || null,
        marked_by: session.user.id
      };

      if (status === "absent") {
        updateData.absence_type = absenceType;
      } else {
        updateData.absence_type = null;
      }

      const { error } = await supabase
        .from("attendance")
        .update(updateData)
        .eq("user_id", attendance.user_id)
        .eq("date", attendance.date);

      if (error) throw error;

      toast.success("Attendance updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating attendance:", error);
      toast.error(error.message || "Failed to update attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            Update attendance for {employeeName} on {attendance ? new Date(attendance.date).toLocaleDateString() : ''}
          </DialogDescription>
        </DialogHeader>

        {attendance && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Originally marked by: <Badge variant="secondary">{markedByName}</Badge>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Attendance Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "absent" && (
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
          )}

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add context or update details..."
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
            {isSubmitting ? "Updating..." : "Update Attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};