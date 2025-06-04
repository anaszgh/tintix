import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Target, AlertTriangle, TrendingUp } from "lucide-react";

interface WindowPerformanceData {
  totalWindows: number;
  totalRedos: number;
  successRate: number;
  installerPerformance: Array<{
    installer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
    };
    windowsCompleted: number;
    redoCount: number;
    successRate: number;
  }>;
}

export function WindowPerformance() {
  const { data: windowData, isLoading } = useQuery<WindowPerformanceData>({
    queryKey: ["/api/analytics/window-performance"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Team Window Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Individual Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!windowData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            No Window Performance Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No window installation data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600 bg-green-50";
    if (rate >= 85) return "text-blue-600 bg-blue-50";
    if (rate >= 75) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Window Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{windowData.totalWindows}</div>
              <div className="text-sm text-muted-foreground">Total Windows Completed</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">{windowData.totalRedos}</div>
              <div className="text-sm text-muted-foreground">Total Redos</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">{windowData.successRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Overall Success Rate</div>
            </div>
            <div className="space-y-2">
              <Progress value={windowData.successRate} className="h-3" />
              <div className="text-sm text-muted-foreground">Team Performance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Individual Installer Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {windowData.installerPerformance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No installer performance data available.</p>
            ) : (
              windowData.installerPerformance
                .sort((a, b) => b.windowsCompleted - a.windowsCompleted)
                .map((installer) => (
                  <div key={installer.installer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-semibold">
                          {installer.installer.firstName} {installer.installer.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {installer.installer.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {installer.windowsCompleted}
                        </div>
                        <div className="text-xs text-muted-foreground">Windows</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {installer.redoCount}
                        </div>
                        <div className="text-xs text-muted-foreground">Redos</div>
                      </div>
                      
                      <div className="text-center min-w-[100px]">
                        <Badge className={getSuccessRateColor(installer.successRate)}>
                          {installer.successRate.toFixed(1)}%
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">Success Rate</div>
                      </div>
                      
                      <div className="w-24">
                        <Progress value={installer.successRate} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}