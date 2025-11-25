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
  const [existingAttendance, setExistingAttendance] = useState<any>(null);
  const [markedByName, setMarkedByName] = useState<string>("");

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
      // If marked ABSENT, show info card - don't redirect
      if (data.status === "absent") {
        setExistingAttendance(data);
        
        // Fetch who marked it
        if (data.marked_by) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", data.marked_by)
            .single();
          
          setMarkedByName(profileData?.name || (data.marked_by === session.user.id ? "You" : "Admin"));
        }
      } else {
        // If marked PRESENT, redirect to submit
        toast.info("Attendance already marked for today");
        navigate("/employee/submit");
      }
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
        marked_by: userId, // Track who marked it
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

  // If already marked absent, show info card instead of form
  if (existingAttendance && existingAttendance.status === "absent") {
    const getAbsenceLabel = (type: string) => {
      const labels: Record<string, string> = {
        sick_leave: "Sick Leave",
        casual_leave: "Casual Leave",
        emergency: "Emergency",
        unapproved: "Unapproved"
      };
      return labels[type] || type;
    };

    return (
      <div className="min-h-screen bg-employee-bg">
        <DashboardHeader />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-employee-border bg-employee-bg">
              <CardHeader className="border-b border-employee-border">
                <CardTitle className="text-employee-fg">Attendance Status</CardTitle>
                <CardDescription className="text-employee-fg/70">{new Date(today).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-500">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <h3 className="text-lg font-semibold">Your attendance for today has been marked as <span className="text-red-500">Absent</span></h3>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Absence Type:</span>
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-sm">
                        {existingAttendance.absence_type ? getAbsenceLabel(existingAttendance.absence_type) : "N/A"}
                      </span>
                    </div>
                    
                    {existingAttendance.notes && (
                      <div>
                        <span className="font-medium">Notes:</span>
                        <p className="mt-1 text-sm text-muted-foreground">{existingAttendance.notes}</p>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Marked by:</span> {markedByName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      📋 Contact admin if you believe this is incorrect
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => navigate("/employee/mode")}
                    className="w-full mt-4"
                  >
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

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
                  <>
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
                    
                    <div className="space-y-2 p-6 rounded-lg bg-employee-section-medium border border-employee-border">
                      <Label htmlFor="notes" className="text-employee-fg">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Explain your absence (e.g., Doctor's appointment, Family emergency...)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
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
                          <SelectItem value="Have time">Have time</SelectItem>
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
