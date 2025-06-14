import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Play, X } from "lucide-react";

interface UserGuideProps {
  trigger?: React.ReactNode;
}

export function UserGuide({ trigger }: UserGuideProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);

  // Define tour steps based on user role
  const getTourSteps = (): Step[] => {
    const baseSteps: Step[] = [
      {
        target: '[data-tour="navigation"]',
        content: 'This is your main navigation. Use it to access different sections of the application.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="job-entries"]',
        content: 'Create and manage job entries here. This is where you track all tinting work.',
        disableBeacon: true,
      },
    ];

    if (user?.role === "manager") {
      return [
        ...baseSteps,
        {
          target: '[data-tour="dashboard"]',
          content: 'View performance metrics and analytics on your dashboard.',
          disableBeacon: true,
        },
        {
          target: '[data-tour="reports"]',
          content: 'Generate detailed reports and export data for analysis.',
          disableBeacon: true,
        },
        {
          target: '[data-tour="film-management"]',
          content: 'Manage film types, costs, and inventory settings.',
          disableBeacon: true,
        },
        {
          target: '[data-tour="user-management"]',
          content: 'Add, edit, and manage user accounts and roles.',
          disableBeacon: true,
        },
        {
          target: '[data-tour="installer-management"]',
          content: 'Manage installer profiles and hourly rates.',
          disableBeacon: true,
        },
      ];
    } else if (user?.role === "installer") {
      return [
        ...baseSteps,
        {
          target: '[data-tour="dashboard"]',
          content: 'View your personal performance metrics and recent jobs.',
          disableBeacon: true,
        },
        {
          target: '[data-tour="time-reports"]',
          content: 'Track your time performance and efficiency metrics.',
          disableBeacon: true,
        },
      ];
    } else if (user?.role === "data_entry") {
      return [
        ...baseSteps,
        {
          target: '[data-tour="add-job"]',
          content: 'Click here to add new job entries. You can create and edit jobs but cannot view financial information.',
          disableBeacon: true,
        },
        {
          target: '[data-tour="job-filters"]',
          content: 'Use these filters to find specific jobs by date or search terms.',
          disableBeacon: true,
        },
      ];
    }

    return baseSteps;
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      setRunTour(false);
      localStorage.setItem(`tour-completed-${user?.role}`, 'true');
    }
  };

  const startTour = () => {
    setRunTour(true);
    setTourKey(prev => prev + 1);
    setIsOpen(false);
  };

  const resetTour = () => {
    localStorage.removeItem(`tour-completed-${user?.role}`);
    startTour();
  };

  // Check if user has completed the tour
  const hasCompletedTour = localStorage.getItem(`tour-completed-${user?.role}`) === 'true';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              User Guide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interactive Tour</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Take a guided tour of the application to learn about all the features available to you.
                </p>
                <div className="flex gap-2">
                  <Button onClick={startTour} className="gap-2">
                    <Play className="h-4 w-4" />
                    {hasCompletedTour ? 'Retake Tour' : 'Start Tour'}
                  </Button>
                  {hasCompletedTour && (
                    <Button variant="outline" onClick={resetTour}>
                      Reset Progress
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.role === "manager" && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Dashboard</h4>
                      <p className="text-sm text-muted-foreground">View overall performance metrics and analytics</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Job Entries</h4>
                      <p className="text-sm text-muted-foreground">Create, edit, and manage all job entries</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Reports</h4>
                      <p className="text-sm text-muted-foreground">Generate detailed reports and export data</p>
                    </div>
                    <div>
                      <h4 className="font-medium">User Management</h4>
                      <p className="text-sm text-muted-foreground">Manage user accounts and permissions</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Film Management</h4>
                      <p className="text-sm text-muted-foreground">Manage film types, costs, and inventory</p>
                    </div>
                  </div>
                )}

                {user?.role === "installer" && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Dashboard</h4>
                      <p className="text-sm text-muted-foreground">View your personal performance metrics</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Job Entries</h4>
                      <p className="text-sm text-muted-foreground">View and track your job assignments</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Time Reports</h4>
                      <p className="text-sm text-muted-foreground">Track your time performance and efficiency</p>
                    </div>
                  </div>
                )}

                {user?.role === "data_entry" && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Job Entries</h4>
                      <p className="text-sm text-muted-foreground">Create and edit job entries (financial info hidden)</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Search & Filter</h4>
                      <p className="text-sm text-muted-foreground">Use filters to find specific jobs quickly</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Edit Jobs</h4>
                      <p className="text-sm text-muted-foreground">Click the edit button to modify job details</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">New Job Entry</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl + N</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Search</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl + K</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Help</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">F1</kbd>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Joyride
        key={tourKey}
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={runTour}
        scrollToFirstStep
        showProgress
        showSkipButton
        steps={getTourSteps()}
        styles={{
          options: {
            primaryColor: 'hsl(var(--primary))',
            textColor: 'hsl(var(--foreground))',
            backgroundColor: 'hsl(var(--background))',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: 8,
            fontSize: 14,
          },
          tooltipContent: {
            padding: '12px 16px',
          },
          buttonNext: {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            borderRadius: 6,
            fontSize: 14,
            padding: '8px 16px',
          },
          buttonBack: {
            color: 'hsl(var(--muted-foreground))',
            marginRight: 8,
          },
          buttonSkip: {
            color: 'hsl(var(--muted-foreground))',
          },
        }}
      />
    </>
  );
}