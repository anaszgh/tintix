import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RedoBreakdown } from "@/components/dashboard/redo-breakdown";
import { Download, FileText, BarChart3 } from "lucide-react";
import type { User } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: topPerformers = [] } = useQuery<Array<{
    installer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
    };
    vehicleCount: number;
    redoCount: number;
    successRate: number;
  }>>({
    queryKey: ["/api/analytics/top-performers"],
    enabled: isAuthenticated,
  });

  const { data: metrics } = useQuery<{
    totalVehicles: number;
    totalRedos: number;
    avgTimeVariance: number;
    activeInstallers: number;
  }>({
    queryKey: ["/api/analytics/metrics"],
    enabled: isAuthenticated,
  });

  // Calculate success rate using 7-window rule
  const calculateSuccessRate = () => {
    if (!metrics) return 0;
    const totalJobs = metrics.totalVehicles || 0;
    const totalRedos = metrics.totalRedos || 0;
    const totalWindows = totalJobs * 7; // 7 windows per vehicle
    const successfulWindows = totalWindows - totalRedos;
    return totalWindows > 0 ? Math.round((successfulWindows / totalWindows) * 100) : 100;
  };

  const successRate = calculateSuccessRate();

  const exportExcel = () => {
    toast({
      title: "Excel Export",
      description: "Generating Excel report...",
    });
  };

  const exportPDF = () => {
    toast({
      title: "PDF Export",
      description: "Generating PDF report...",
    });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Reports & Analytics"
          description="Comprehensive performance reports and data exports"
          actions={
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={exportPDF}
                className="border-border hover:bg-muted"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                onClick={exportExcel}
                className="bg-success hover:bg-success/90 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          }
        />
        
        <div className="p-8 overflow-y-auto h-full space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Vehicles Processed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {metrics?.totalVehicles || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time total
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overall Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {successRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  7-window rule calculation
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Installers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {metrics?.activeInstallers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PerformanceChart />
            <RedoBreakdown />
          </div>

          {/* Detailed Performance Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Detailed Performance Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-sm font-medium text-muted-foreground pb-3">
                        Installer
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground pb-3">
                        Vehicles
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground pb-3">
                        Redos
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground pb-3">
                        Success Rate
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground pb-3">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topPerformers.map((performer, index: number) => (
                      <tr key={performer.installer.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-4 text-sm text-card-foreground">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              {performer.installer.firstName} {performer.installer.lastName}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-card-foreground">
                          {performer.vehicleCount}
                        </td>
                        <td className="py-4 text-sm text-card-foreground">
                          {performer.redoCount}
                        </td>
                        <td className="py-4 text-sm">
                          <span className="text-success font-medium">
                            {performer.successRate}%
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-success h-2 rounded-full" 
                                style={{ width: `${performer.successRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {performer.successRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
