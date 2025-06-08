import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Target, BarChart3 } from "lucide-react";

interface TimePerformanceData {
  installer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  totalMinutes: number;
  totalWindows: number;
  avgTimePerWindow: number;
  jobCount: number;
}

export function TimePerformance() {
  const { data: timeData, isLoading } = useQuery<TimePerformanceData[]>({
    queryKey: ["/api/analytics/time-performance"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                <div className="rounded-full bg-muted h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeData || timeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No time performance data available yet.
            <br />
            Complete jobs with duration tracking to see analytics.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by average time per window (most efficient first)
  const sortedData = [...timeData].sort((a, b) => a.avgTimePerWindow - b.avgTimePerWindow);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getEfficiencyColor = (avgTime: number) => {
    if (avgTime <= 20) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    if (avgTime <= 30) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Performance Analytics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Individual installer performance based on time allocation per window
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((installer) => (
            <div
              key={installer.installer.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">
                    {installer.installer.firstName} {installer.installer.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {installer.installer.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Total Time
                  </div>
                  <div className="font-semibold">
                    {formatTime(installer.totalMinutes)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Windows
                  </div>
                  <div className="font-semibold">
                    {installer.totalWindows}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Jobs</div>
                  <div className="font-semibold">
                    {installer.jobCount}
                  </div>
                </div>

                <div className="text-center">
                  <Badge
                    variant="secondary"
                    className={getEfficiencyColor(installer.avgTimePerWindow)}
                  >
                    {installer.avgTimePerWindow.toFixed(1)}m/window
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedData.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatTime(sortedData.reduce((sum, item) => sum + item.totalMinutes, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Time Tracked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {sortedData.reduce((sum, item) => sum + item.totalWindows, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Windows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {(
                    sortedData.reduce((sum, item) => sum + item.avgTimePerWindow, 0) /
                    sortedData.length
                  ).toFixed(1)}m
                </div>
                <div className="text-sm text-muted-foreground">Avg Time/Window</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}