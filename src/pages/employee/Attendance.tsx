import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

const Attendance = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"present" | "absent" | "">("");
  const [absenceType, setAbsenceType] = useState<string>("");
  const [taskCompleted, setTaskCompleted] = useState<string>("");
  const [performanceRating, setPerformanceRating] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [today] = useState(new Date().toISOString().split("T")[0]);

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
    
    // Check if attendance already marked for today
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .single();
    
    if (data) {
      toast.info("Attendance already marked for today");
      navigate("/employee/submit");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!status) {
      toast.error("Please select attendance status");
      return;
    }

    if (status === "absent" && !absenceType) {
      toast.error("Please select an absence type");
      return;
    }

    if (status === "present" && (!taskCompleted || !performanceRating)) {
      toast.error("Please answer all questions for present status");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("attendance").insert([{
        user_id: userId,
        date: today,
        status,
        absence_type: status === "absent" ? (absenceType as any) : null,
        task_completed: status === "present" ? taskCompleted : null,
        performance_rating: status === "present" ? parseInt(performanceRating) : null,
        notes: notes || null,
      }]);

      if (error) throw error;

      toast.success("Attendance marked successfully");
      
      if (status === "present") {
        navigate("/employee/submit");
      } else {
        navigate("/employee/mode");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to mark attendance");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-employee-bg">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-employee-border bg-employee-bg">
            <CardHeader className="border-b border-employee-border">
              <CardTitle className="text-employee-fg">Mark Attendance</CardTitle>
              <CardDescription className="text-employee-fg/70">Record your attendance for {new Date(today).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4 p-6 rounded-lg bg-employee-section-light border border-employee-border">
                  <Label className="text-employee-fg">Attendance Status</Label>
                  <RadioGroup value={status} onValueChange={(value: "present" | "absent" | "") => setStatus(value)}>
                    <div className="flex items-center space-x-2 p-4 border border-employee-border rounded-lg cursor-pointer hover:bg-employee-section-medium transition-colors">
                      <RadioGroupItem value="present" id="present" />
                      <Label htmlFor="present" className="flex items-center gap-2 cursor-pointer flex-1 text-employee-fg">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span>Present</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border border-employee-border rounded-lg cursor-pointer hover:bg-employee-section-medium transition-colors">
                      <RadioGroupItem value="absent" id="absent" />
                      <Label htmlFor="absent" className="flex items-center gap-2 cursor-pointer flex-1 text-employee-fg">
                        <XCircle className="h-5 w-5 text-employee-accent" />
                        <span>Absent</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {status === "absent" && (
                  <div className="space-y-2 p-6 rounded-lg bg-employee-section-medium border border-employee-border">
                    <Label htmlFor="absence-type" className="text-employee-fg">Absence Type</Label>
                    <Select value={absenceType} onValueChange={setAbsenceType}>
                      <SelectTrigger id="absence-type">
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

                {status === "present" && (
                  <>
                    <div className="space-y-2 p-6 rounded-lg bg-employee-section-medium border border-employee-border">
                      <Label htmlFor="task-completed" className="text-employee-fg">Tasks assigned today is completed?</Label>
                      <Select value={taskCompleted} onValueChange={setTaskCompleted}>
                        <SelectTrigger id="task-completed">
                          <SelectValue placeholder="Select completion status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes(100%)">Yes(100%)</SelectItem>
                          <SelectItem value="Not yet">Not yet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4 p-6 rounded-lg bg-employee-section-dark border border-employee-border">
                      <Label className="text-employee-fg">How would you rate your performance today?</Label>
                      <RadioGroup value={performanceRating} onValueChange={setPerformanceRating}>
                        <div className="flex items-center space-x-2 p-3 border border-employee-border rounded-lg cursor-pointer hover:bg-employee-section-medium transition-colors">
                          <RadioGroupItem value="1" id="rating-1" />
                          <Label htmlFor="rating-1" className="cursor-pointer flex-1 text-employee-fg">1 - Poor</Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border border-employee-border rounded-lg cursor-pointer hover:bg-employee-section-medium transition-colors">
                          <RadioGroupItem value="2" id="rating-2" />
                          <Label htmlFor="rating-2" className="cursor-pointer flex-1 text-employee-fg">2 - Below Average</Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border border-employee-border rounded-lg cursor-pointer hover:bg-employee-section-medium transition-colors">
                          <RadioGroupItem value="3" id="rating-3" />
                          <Label htmlFor="rating-3" className="cursor-pointer flex-1 text-employee-fg">3 - Average</Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border border-employee-border rounded-lg cursor-pointer hover:bg-employee-section-medium transition-colors">
                          <RadioGroupItem value="4" id="rating-4" />
                          <Label htmlFor="rating-4" className="cursor-pointer flex-1 text-employee-fg">4 - Good</Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border border-employee-border rounded-lg cursor-pointer hover:bg-employee-section-medium transition-colors">
                          <RadioGroupItem value="5" id="rating-5" />
                          <Label htmlFor="rating-5" className="cursor-pointer flex-1 text-employee-fg">5 - Excellent</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2 p-6 rounded-lg bg-employee-section-light border border-employee-border">
                      <Label htmlFor="notes" className="text-employee-fg">Any Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-employee-accent hover:bg-employee-accent/90 text-employee-accent-foreground" 
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit Attendance"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Attendance;
