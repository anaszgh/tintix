import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Trophy, Clock, Target, Award, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import jsPDF from "jspdf";

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

export default function TimeReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: timeData, isLoading: isLoadingTime, refetch } = useQuery<TimePerformanceData[]>({
    queryKey: ["/api/analytics/time-performance", { dateFrom, dateTo }],
    enabled: isAuthenticated,
  });

  const handleGeneratePDF = () => {
    if (!timeData || timeData.length === 0) {
      toast({
        title: "No Data",
        description: "No time performance data available for the selected period.",
        variant: "destructive",
      });
      return;
    }

    // Filter out installers with no activity
    const activeInstallers = timeData.filter(item => item.totalMinutes > 0);
    
    if (activeInstallers.length === 0) {
      toast({
        title: "No Activity",
        description: "No installer activity found for the selected period.",
        variant: "destructive",
      });
      return;
    }

    // Sort by efficiency (lowest avg time per window = most efficient)
    const sortedByEfficiency = [...activeInstallers].sort((a, b) => a.avgTimePerWindow - b.avgTimePerWindow);
    const winner = sortedByEfficiency[0];

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Time Performance Analysis Report', 20, 25);
    
    // Date range
    doc.setFontSize(12);
    const dateRange = dateFrom && dateTo 
      ? 'Period: ' + formatDate(dateFrom) + ' - ' + formatDate(dateTo)
      : 'Generated: ' + formatDate(new Date().toISOString());
    doc.text(dateRange, 20, 35);
    
    // Winner section
    doc.setFontSize(16);
    doc.text('TOP PERFORMER', 20, 50);
    
    doc.setFontSize(14);
    doc.text(winner.installer.firstName + ' ' + winner.installer.lastName, 20, 65);
    
    doc.setFontSize(11);
    doc.text('Email: ' + (winner.installer.email || 'N/A'), 20, 75);
    doc.text('Average Time per Window: ' + winner.avgTimePerWindow.toFixed(1) + ' minutes', 20, 85);
    doc.text('Total Windows Completed: ' + winner.totalWindows.toString(), 20, 95);
    doc.text('Total Time Worked: ' + formatTime(winner.totalMinutes), 20, 105);
    doc.text('Jobs Completed: ' + winner.jobCount.toString(), 20, 115);

    // Save the PDF
    const fileName = 'time-performance-report-' + (dateFrom || 'all') + '-' + (dateTo || 'time') + '.pdf';
    doc.save(fileName);

    toast({
      title: "Report Generated",
      description: 'Time performance report saved as ' + fileName,
    });
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter out installers with no activity for display
  const activeTimeData = timeData?.filter(item => item.totalMinutes > 0) || [];
  const sortedByEfficiency = [...activeTimeData].sort((a, b) => a.avgTimePerWindow - b.avgTimePerWindow);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Time Performance Reports"
          description="Generate detailed time performance analysis and identify top performers"
        />
        
        <div className="p-8 overflow-y-auto h-full space-y-8">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={() => refetch()}
                    className="w-full"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performer Highlight */}
          {sortedByEfficiency.length > 0 && (
            <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <Trophy className="h-6 w-6" />
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                      {sortedByEfficiency[0].installer.firstName} {sortedByEfficiency[0].installer.lastName}
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Most efficient installer with {sortedByEfficiency[0].avgTimePerWindow.toFixed(1)} minutes per window
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(sortedByEfficiency[0].totalMinutes)} total</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>{sortedByEfficiency[0].totalWindows} windows</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        <span>{sortedByEfficiency[0].jobCount} jobs</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 text-lg px-3 py-1">
                      #{1}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Rankings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Performance Rankings
              </CardTitle>
              <Button onClick={handleGeneratePDF} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Generate PDF Report
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingTime ? (
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
              ) : sortedByEfficiency.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No time performance data available for the selected period.
                  <br />
                  Complete jobs with duration tracking to see rankings.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedByEfficiency.map((installer, index) => (
                    <div
                      key={installer.installer.id}
                      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                        index === 0 ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-amber-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          #{index + 1}
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
                          <div className="text-sm text-muted-foreground">Total Time</div>
                          <div className="font-semibold">
                            {formatTime(installer.totalMinutes)}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Windows</div>
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}