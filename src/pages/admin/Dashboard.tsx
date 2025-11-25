import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, TrendingUp, Target, BarChart } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFiltersComponent from "@/components/admin/DashboardFilters";
import TeamAccountsTable from "@/components/admin/TeamAccountsTable";
import { AttendanceManagement } from "@/components/admin/AttendanceManagement";
import { toast } from "sonner";

interface Stats {
  totalSubmissions: number;
  totalCallsDialled: number;
  totalCallsTaken: number;
  totalEnrollments: number;
  avgShowUp: number;
}

interface DashboardFilters {
  selectedUsers: string[];
  selectedTeams: string[];
  startDate: string;
  endDate: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  mode: string | null;
  role: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalSubmissions: 0,
    totalCallsDialled: 0,
    totalCallsTaken: 0,
    totalEnrollments: 0,
    avgShowUp: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    selectedUsers: [],
    selectedTeams: [],
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, [filters]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email !== "admin@salestrack.local") {
      navigate("/admin/login");
      return;
    }

    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, mode, role")
        .order("name");

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch submissions
      const { data, error } = await supabase
        .from("daily_submissions")
        .select("*");

      if (error) throw error;

      let submissions = data || [];

      // Apply filters
      let filtered = submissions;

      // Filter by date range
      if (filters.startDate) {
        filtered = filtered.filter((s) => s.date >= filters.startDate);
      }
      if (filters.endDate) {
        filtered = filtered.filter((s) => s.date <= filters.endDate);
      }

      // Filter by selected staff
      if (filters.selectedUsers.length > 0) {
        filtered = filtered.filter((s) =>
          filters.selectedUsers.includes(s.user_id)
        );
      }

      // Filter by selected teams
      if (filters.selectedTeams.length > 0) {
        filtered = filtered.filter((s) => {
          const userProfile = profilesData?.find((p) => p.id === s.user_id);
          return userProfile && filters.selectedTeams.includes(userProfile.mode || "");
        });
      }

      // Calculate stats from filtered data
      const totalCallsDialled = filtered.reduce((acc, s) => acc + s.calls_dialled, 0);
      const totalCallsTaken = filtered.reduce((acc, s) => acc + s.calls_taken, 0);
      const totalEnrollments = filtered.reduce(
        (acc, s) => acc + s.sm_enrolled + s.fu_enrolled,
        0
      );

      setStats({
        totalSubmissions: filtered.length,
        totalCallsDialled,
        totalCallsTaken,
        totalEnrollments,
        avgShowUp: totalCallsDialled > 0
          ? ((totalCallsTaken / totalCallsDialled) * 100)
          : 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Submissions",
      value: stats.totalSubmissions,
      icon: BarChart,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Calls Dialled",
      value: stats.totalCallsDialled,
      icon: Phone,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total Calls Taken",
      value: stats.totalCallsTaken,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Total Enrollments",
      value: stats.totalEnrollments,
      icon: Target,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of sales performance metrics</p>
        </div>

        <DashboardFiltersComponent
          filters={filters}
          onFilterChange={setFilters}
          profiles={profiles}
        />

        {isLoading ? (
          <p className="text-center py-8">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title} className="shadow-card hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="shadow-card mb-6">
              <CardHeader>
                <CardTitle>Average Show-up Rate</CardTitle>
                <CardDescription>Percentage of calls taken vs dialled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {stats.avgShowUp.toFixed(2)}%
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-primary transition-all duration-500"
                        style={{ width: `${Math.min(stats.avgShowUp, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <Button 
                onClick={() => navigate("/admin/data")} 
                size="lg"
                className="w-full md:w-auto"
              >
                <Users className="mr-2 h-4 w-4" />
                View Detailed Data
              </Button>
            </div>

            <div className="mb-8">
              <AttendanceManagement profiles={profiles} />
            </div>

            <div>
              <TeamAccountsTable profiles={profiles} onRefresh={checkAuthAndFetch} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
