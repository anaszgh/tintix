import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useState, useEffect } from "react";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Entries from "@/pages/entries";
import Reports from "@/pages/reports";
import TimeReports from "@/pages/time-reports";
import UsersPage from "@/pages/users";
import InstallerManagement from "@/pages/installer-management";
import FilmManagement from "@/pages/film-management";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 20;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Tintix Performance Tracker</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <div className="space-y-4">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            {progress < 40 ? "Initializing..." : 
             progress < 80 ? "Authenticating..." : 
             "Loading data..."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Enable global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const userRole = user?.role || '';

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Data Entry role - Only access to job entries */}
          {userRole === 'data_entry' ? (
            <>
              <Route path="/" component={Entries} />
              <Route path="/entries" component={Entries} />
            </>
          ) : (
            /* Manager and Installer roles - Full access */
            <>
              <Route path="/" component={Dashboard} />
              <Route path="/entries" component={Entries} />
              <Route path="/reports" component={Reports} />
              <Route path="/time-reports" component={TimeReports} />
              <Route path="/installers" component={InstallerManagement} />
              <Route path="/users" component={UsersPage} />
              <Route path="/film-management" component={FilmManagement} />
            </>
          )}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
