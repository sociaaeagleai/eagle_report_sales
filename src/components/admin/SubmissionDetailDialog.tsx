import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, TrendingUp, Target, Calendar, Star, CheckCircle2 } from "lucide-react";

interface SubmissionData {
  id: string;
  date: string;
  user_id: string;
  source: string[];
  calls_dialled: number;
  calls_taken: number;
  rapport_built: number;
  touched_base: number;
  calls_not_taken: number;
  others: number;
  disqualified: number;
  sm_rp: number;
  sm_enrolled: number;
  sm_rp_to_enrolled: number;
  fu_rp: number;
  fu_enrolled: number;
  fu_rp_to_enrolled: number;
  created_at?: string;
  updated_at?: string;
  attendance?: {
    task_completed: string | null;
    performance_rating: number | null;
    notes: string | null;
    status: string;
  } | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  mode: string | null;
}

interface SubmissionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionData | null;
  userProfile?: UserProfile;
}

export const SubmissionDetailDialog = ({
  open,
  onOpenChange,
  submission,
  userProfile,
}: SubmissionDetailDialogProps) => {
  if (!submission) return null;

  const showUpPercent = submission.calls_dialled > 0
    ? (submission.calls_taken / submission.calls_dialled) * 100
    : 0;

  const noShowUpPercent = submission.calls_dialled > 0
    ? (submission.calls_not_taken / submission.calls_dialled) * 100
    : 0;

  const smTotal = submission.sm_rp + submission.sm_enrolled;
  const smClosingPercent = submission.calls_taken > 0
    ? (smTotal / submission.calls_taken) * 100
    : 0;

  const fuTotal = submission.fu_rp + submission.fu_enrolled;
  const fuClosingPercent = submission.calls_taken > 0
    ? (fuTotal / submission.calls_taken) * 100
    : 0;

  const getPerformanceBadge = (percent: number) => {
    if (percent >= 70) return <Badge className="bg-green-500">Excellent</Badge>;
    if (percent >= 40) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Submission Details</span>
            {getPerformanceBadge(showUpPercent)}
          </DialogTitle>
          <DialogDescription>
            Complete breakdown of performance metrics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Staff Information */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold">Staff Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{userProfile?.name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold text-sm">{userProfile?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="secondary" className="capitalize">
                  {userProfile?.role || "N/A"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Work Mode</p>
                <Badge variant="outline">{userProfile?.mode || "N/A"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">{new Date(submission.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <div className="flex flex-wrap gap-1">
                  {submission.source.map((src, idx) => (
                    <Badge key={idx} variant="outline">{src}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Call Activity Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Call Activity</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Calls Dialled</p>
                <p className="text-2xl font-bold">{submission.calls_dialled}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Calls Taken</p>
                <p className="text-2xl font-bold text-green-600">{submission.calls_taken}</p>
                <Progress value={showUpPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{showUpPercent.toFixed(1)}% show-up</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Calls Not Taken</p>
                <p className="text-2xl font-bold text-red-600">{submission.calls_not_taken}</p>
                <Progress value={noShowUpPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{noShowUpPercent.toFixed(1)}% no show-up</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Rapport Built</p>
                <p className="text-2xl font-bold">{submission.rapport_built}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Touched Base</p>
                <p className="text-2xl font-bold">{submission.touched_base}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Others</p>
                <p className="text-2xl font-bold">{submission.others}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Disqualified</p>
                <p className="text-2xl font-bold">{submission.disqualified}</p>
              </div>
            </div>
          </div>

          {/* Same Month Closing Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Same Month Closing</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">RP</p>
                <p className="text-2xl font-bold">{submission.sm_rp}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Fully Enrolled</p>
                <p className="text-2xl font-bold">{submission.sm_enrolled}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">RP to Enrolled</p>
                <p className="text-2xl font-bold">{submission.sm_rp_to_enrolled}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Closing Rate</p>
                <p className="text-2xl font-bold text-primary">{smClosingPercent.toFixed(1)}%</p>
                <Progress value={smClosingPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {smTotal} out of {submission.calls_taken} calls
                </p>
              </div>
            </div>
          </div>

          {/* Follow-up Closing Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Follow-up Closing</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">RP</p>
                <p className="text-2xl font-bold">{submission.fu_rp}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Fully Enrolled</p>
                <p className="text-2xl font-bold">{submission.fu_enrolled}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">RP to Enrolled</p>
                <p className="text-2xl font-bold">{submission.fu_rp_to_enrolled}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Closing Rate</p>
                <p className="text-2xl font-bold text-primary">{fuClosingPercent.toFixed(1)}%</p>
                <Progress value={fuClosingPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {fuTotal} out of {submission.calls_taken} calls
                </p>
              </div>
            </div>
          </div>

          {/* Attendance Section */}
          {submission.attendance && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="text-lg font-semibold">Attendance Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Attendance Status</p>
                  <Badge variant={submission.attendance.status === "present" ? "default" : "destructive"} className="capitalize">
                    {submission.attendance.status}
                  </Badge>
                </div>
                {submission.attendance.task_completed && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Task Completion</p>
                    <Badge 
                      variant={submission.attendance.task_completed.includes("100%") ? "default" : "secondary"}
                    >
                      {submission.attendance.task_completed}
                    </Badge>
                  </div>
                )}
                {submission.attendance.performance_rating && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Performance Rating</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={submission.attendance.performance_rating >= 4 ? "default" : 
                                submission.attendance.performance_rating >= 3 ? "secondary" : "destructive"}
                      >
                        {submission.attendance.performance_rating}/5
                      </Badge>
                      {submission.attendance.performance_rating >= 4 && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>
              {submission.attendance.notes && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm bg-background p-3 rounded border">{submission.attendance.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Submission Info */}
          {(submission.created_at || submission.updated_at) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Submission Info</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {submission.created_at && (
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(submission.created_at).toLocaleString()}</p>
                  </div>
                )}
                {submission.updated_at && (
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{new Date(submission.updated_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};