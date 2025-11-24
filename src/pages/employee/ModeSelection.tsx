import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap, MessageSquare } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

const ModeSelection = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userMode, setUserMode] = useState<"AI" | "DM" | null>(null);

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
    
    // Fetch user's pre-assigned mode
    const { data: profile } = await supabase
      .from("profiles")
      .select("mode")
      .eq("id", session.user.id)
      .single();
    
    if (profile?.mode) {
      setUserMode(profile.mode);
      // Auto-redirect to attendance if mode is already set
      navigate("/employee/attendance");
    } else {
      setIsLoading(false);
    }
  };

  const handleModeSelect = async (mode: "AI" | "DM") => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ mode })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`${mode} team selected`);
      navigate("/employee/attendance");
    } catch (error: any) {
      toast.error(error.message || "Failed to update team");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-employee-bg">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-employee-fg">Select Your Work Team</h1>
            <p className="text-employee-fg/70">Choose how you'll be working today</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {(!userMode || userMode === "AI") && (
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-employee-accent border-employee-border bg-employee-section-light" 
                onClick={() => !isLoading && handleModeSelect("AI")}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-employee-accent rounded-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-employee-fg">AI Team</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full mt-6 bg-employee-accent hover:bg-employee-accent/90 text-employee-accent-foreground" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModeSelect("AI");
                    }}
                    disabled={isLoading}
                  >
                    Select AI Team
                  </Button>
                </CardContent>
              </Card>
            )}

            {(!userMode || userMode === "DM") && (
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-employee-accent border-employee-border bg-employee-section-light" 
                onClick={() => !isLoading && handleModeSelect("DM")}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-employee-accent rounded-lg">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-employee-fg">DM Team</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full mt-6 bg-employee-accent hover:bg-employee-accent/90 text-employee-accent-foreground" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModeSelect("DM");
                    }}
                    disabled={isLoading}
                  >
                    Select DM Team
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModeSelection;
