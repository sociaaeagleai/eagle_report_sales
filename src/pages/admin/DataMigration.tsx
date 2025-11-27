import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Upload, Database } from "lucide-react";
import { toast } from "sonner";
import DashboardHeader from "@/components/DashboardHeader";

const DataMigration = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleMigration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      toast.info("Starting complete data migration...");
      
      // Call the edge function which now handles ALL data imports
      const { data, error } = await supabase.functions.invoke('migrate-data');

      if (error) {
        console.error('Migration error:', error);
        toast.error(`Migration failed: ${error.message}`);
        setResult({ error: error.message });
        return;
      }

      console.log('Migration result:', data.results);
      setResult(data);

      if (data.results.errors.length === 0) {
        toast.success("Complete data migration finished successfully!");
      } else {
        toast.warning(`Migration completed with ${data.results.errors.length} errors`);
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error("Migration failed");
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Migration
            </CardTitle>
            <CardDescription>
              Import all users, attendance, submissions, and anomaly data from your previous system.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will create 22 users with their complete historical data. All users will have the default password: <strong>SocialEagle@2024</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold">Migration includes:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>22 user accounts (1 admin, 21 employees)</li>
                <li>43 attendance records</li>
                <li>87 daily submissions</li>
                <li>28 anomaly resolutions</li>
                <li>3 manual anomalies</li>
              </ul>
            </div>

            <Button 
              onClick={handleMigration}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Migrating Data...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Migration
                </>
              )}
            </Button>

            {result && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {result.error ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        Migration Failed
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Migration Results
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  ) : (
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Users Created:</span>
                        <strong>{result.results.users_created}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Profiles Inserted:</span>
                        <strong>{result.results.profiles_inserted}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>User Roles Inserted:</span>
                        <strong>{result.results.user_roles_inserted}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Attendance Records:</span>
                        <strong>{result.results.attendance_inserted}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Submissions:</span>
                        <strong>{result.results.submissions_inserted}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Anomaly Resolutions:</span>
                        <strong>{result.results.anomaly_resolutions_inserted}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Manual Anomalies:</span>
                        <strong>{result.results.manual_anomalies_inserted}</strong>
                      </div>
                      
                      {result.results.errors.length > 0 && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertDescription>
                            <div className="font-semibold mb-2">Errors:</div>
                            <ul className="list-disc list-inside text-xs">
                              {result.results.errors.slice(0, 5).map((err: string, i: number) => (
                                <li key={i}>{err}</li>
                              ))}
                              {result.results.errors.length > 5 && (
                                <li>... and {result.results.errors.length - 5} more</li>
                              )}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="pt-4 space-x-2">
              <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataMigration;
