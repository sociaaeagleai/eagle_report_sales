import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { EagleLogo } from "@/components/EagleLogo";

const DashboardHeader = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Set flag before logout to prevent auto-login
      sessionStorage.setItem('justLoggedOut', 'true');
      
      const { error } = await supabase.auth.signOut();
      
      // Ignore "session not found" errors - user is already logged out
      if (error && !error.message?.toLowerCase().includes('session')) {
        toast.error(error.message || "Failed to log out");
      } else {
        toast.success("Logged out successfully");
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      // Don't show error to user if it's session-related
      if (!error.message?.toLowerCase().includes('session')) {
        toast.error("Failed to log out");
      }
    } finally {
      // Small delay to ensure session is cleared before navigation
      setTimeout(() => {
        navigate("/auth");
      }, 100);
    }
  };

  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <EagleLogo size="medium" />
          </div>
          
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
