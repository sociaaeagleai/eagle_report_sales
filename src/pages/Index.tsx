import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, TrendingUp } from "lucide-react";
import { EagleLogo } from "@/components/EagleLogo";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center mb-6">
          <EagleLogo size="extra-large" />
        </div>
        
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Professional Sales Performance Management System
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 my-12">
          <div className="p-6 bg-card rounded-lg shadow-card border border-border/50">
            <Users className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Team Management</h3>
            <p className="text-sm text-muted-foreground">Track performance across your sales team</p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-card border border-border/50">
            <BarChart3 className="h-8 w-8 text-accent mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Analytics</h3>
            <p className="text-sm text-muted-foreground">Real-time insights and metrics</p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-card border border-border/50">
            <TrendingUp className="h-8 w-8 text-success mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Performance</h3>
            <p className="text-sm text-muted-foreground">Boost productivity and results</p>
          </div>
        </div>

        <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
