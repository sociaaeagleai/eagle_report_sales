import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Edit, UserX, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MarkAbsentDialog } from "./MarkAbsentDialog";
import { EditAttendanceDialog } from "./EditAttendanceDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Profile {
  id: string;
  name: string;
  email: string;
  mode: string | null;
  role: string;
}

interface AttendanceRecord {
  user_id: string;
  date: string;
  status: string;
  absence_type?: string | null;
  notes?: string | null;
  marked_by?: string | null;
}

interface AttendanceManagementProps {
  profiles: Profile[];
}

export const AttendanceManagement = ({ profiles }: AttendanceManagementProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [markedByProfiles, setMarkedByProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchAttendance();
    }
  }, [selectedDate, isOpen]);

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", selectedDate);

      if (error) throw error;

      setAttendance(data || []);

      // Fetch marked_by names
      const markedByIds = [...new Set((data || []).map(a => a.marked_by).filter(Boolean))];
      if (markedByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", markedByIds);

        const profilesMap: Record<string, string> = {};
        (profilesData || []).forEach(p => {
          profilesMap[p.id] = p.name;
        });
        setMarkedByProfiles(profilesMap);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const getAttendanceForUser = (userId: string) => {
    return attendance.find(a => a.user_id === userId);
  };

  const getAbsenceTypeLabel = (type: string | null | undefined) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      sick_leave: "Sick Leave",
      casual_leave: "Casual Leave",
      emergency: "Emergency",
      unapproved: "Unapproved"
    };
    return labels[type] || type;
  };

  const handleMarkAbsent = (employee: Profile) => {
    setSelectedEmployee({ id: employee.id, name: employee.name });
    setMarkDialogOpen(true);
  };

  const handleEditAttendance = (employee: Profile, attendanceRecord: AttendanceRecord) => {
    setSelectedEmployee({ id: employee.id, name: employee.name });
    setSelectedAttendance(attendanceRecord);
    setEditDialogOpen(true);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="shadow-card">
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Attendance Management
                  </CardTitle>
                  <CardDescription>Mark and manage employee attendance</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Absence Type</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Marked By</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.filter(p => p.role === 'employee').map((profile) => {
                      const userAttendance = getAttendanceForUser(profile.id);
                      const isPresent = userAttendance?.status === "present";
                      const isAbsent = userAttendance?.status === "absent";

                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{profile.mode || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>
                            {isPresent ? (
                              <Badge className="bg-green-500">🟢 Present</Badge>
                            ) : isAbsent ? (
                              <Badge variant="destructive">🔴 Absent</Badge>
                            ) : (
                              <Badge variant="secondary">⚪ Not Marked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAbsent && userAttendance?.absence_type ? (
                              <Badge variant="outline">
                                {getAbsenceTypeLabel(userAttendance.absence_type)}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {userAttendance?.notes || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {userAttendance?.marked_by ? (
                              <Badge variant="secondary" className="text-xs">
                                {markedByProfiles[userAttendance.marked_by] || "Admin"}
                              </Badge>
                            ) : userAttendance ? (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                System (before tracking)
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {userAttendance ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAttendance(profile, userAttendance)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAbsent(profile)}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Mark Absent
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <MarkAbsentDialog
        open={markDialogOpen}
        onOpenChange={setMarkDialogOpen}
        employee={selectedEmployee}
        selectedDate={selectedDate}
        onSuccess={fetchAttendance}
      />

      <EditAttendanceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        attendance={selectedAttendance}
        employeeName={selectedEmployee?.name || ""}
        markedByName={selectedAttendance?.marked_by ? markedByProfiles[selectedAttendance.marked_by] || "Admin" : "Unknown"}
        onSuccess={fetchAttendance}
      />
    </>
  );
};