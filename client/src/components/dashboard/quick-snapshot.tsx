import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Zap, Target, Clock, AlertTriangle } from "lucide-react";
import { formatTimeVariance, getPerformanceColor } from "@/lib/utils";
import type { DashboardMetrics, TopPerformer } from "@/types";

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

export function QuickSnapshot() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/analytics/metrics"],
  });

  const { data: topPerformers, isLoading: performersLoading } = useQuery<TopPerformer[]>({
    queryKey: ["/api/analytics/top-performers"],
  });

  const { data: windowPerformance, isLoading: windowLoading } = useQuery<WindowPerformanceData>({
    queryKey: ["/api/analytics/window-performance"],
  });

  if (metricsLoading || performersLoading || windowLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Performance Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-3/4"></div>
            <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-1/2"></div>
            <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallSuccessRate = windowPerformance?.successRate || 0;
  const totalRedos = metrics?.totalRedos || 0;
  const totalVehicles = metrics?.totalVehicles || 0;
  const avgTimeVariance = metrics?.avgTimeVariance || 0;
  const topPerformer = Array.isArray(topPerformers) && topPerformers.length > 0 ? topPerformers[0] : null;

  // Performance status based on success rate
  const getPerformanceStatus = (rate: number) => {
    if (rate >= 85) return { status: "Excellent", color: "text-green-600 dark:text-green-400", icon: TrendingUp };
    if (rate >= 70) return { status: "Good", color: "text-blue-600 dark:text-blue-400", icon: Target };
    if (rate >= 50) return { status: "Fair", color: "text-yellow-600 dark:text-yellow-400", icon: Clock };
    return { status: "Needs Attention", color: "text-red-600 dark:text-red-400", icon: AlertTriangle };
  };

  const performanceInfo = getPerformanceStatus(overallSuccessRate);
  const StatusIcon = performanceInfo.icon;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Performance Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Performance Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${performanceInfo.color}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Status
            </span>
          </div>
          <Badge 
            variant="outline" 
            className={`${performanceInfo.color} border-current`}
          >
            {performanceInfo.status}
          </Badge>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {overallSuccessRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Success Rate
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {totalVehicles}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Vehicles
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {totalRedos}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Redos
            </div>
          </div>
        </div>

        {/* Time Variance Alert */}
        {Math.abs(avgTimeVariance) > 30 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs text-yellow-700 dark:text-yellow-300">
              Avg time variance: {formatTimeVariance(avgTimeVariance)}
            </span>
          </div>
        )}

        {/* Top Performer */}
        {topPerformer && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Top Performer:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {topPerformer.installer.firstName} {topPerformer.installer.lastName}
              </span>
              <Badge 
                variant="outline" 
                className={`text-xs ${getPerformanceColor(topPerformer.successRate)} border-current`}
              >
                {topPerformer.successRate.toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}