import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RedoBreakdown } from "@/components/dashboard/redo-breakdown";
import { Download, FileText, BarChart3, Printer, Calendar, Filter, X } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User, JobEntryWithDetails } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFilter, setAppliedDateFilter] = useState<{dateFrom: string, dateTo: string} | null>(null);

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

  // Create query parameters for date filtering
  const getQueryParams = () => {
    if (!appliedDateFilter) return {};
    return {
      dateFrom: appliedDateFilter.dateFrom,
      dateTo: appliedDateFilter.dateTo
    };
  };

  const queryParams = getQueryParams();

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
    queryKey: ["/api/analytics/top-performers", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryParams.dateFrom) params.set('dateFrom', queryParams.dateFrom);
      if (queryParams.dateTo) params.set('dateTo', queryParams.dateTo);
      
      const response = await fetch(`/api/analytics/top-performers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch top performers');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: metrics } = useQuery<{
    totalVehicles: number;
    totalRedos: number;
    totalWindows: number;
    avgTimeVariance: number;
    activeInstallers: number;
  }>({
    queryKey: ["/api/analytics/metrics", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryParams.dateFrom) params.set('dateFrom', queryParams.dateFrom);
      if (queryParams.dateTo) params.set('dateTo', queryParams.dateTo);
      
      const response = await fetch(`/api/analytics/metrics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: jobEntries = [] } = useQuery<JobEntryWithDetails[]>({
    queryKey: ["/api/job-entries", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryParams.dateFrom) params.set('dateFrom', queryParams.dateFrom);
      if (queryParams.dateTo) params.set('dateTo', queryParams.dateTo);
      
      const response = await fetch(`/api/job-entries?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch job entries');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Calculate success rate using actual window counts
  const calculateSuccessRate = () => {
    if (!metrics) return 0;
    const totalWindows = metrics.totalWindows || 0;
    const totalRedos = metrics.totalRedos || 0;
    const successfulWindows = totalWindows - totalRedos;
    return totalWindows > 0 ? Math.round((successfulWindows / totalWindows) * 100) : 100;
  };

  const successRate = calculateSuccessRate();

  // Apply date filter
  const applyDateFilter = () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: "Invalid Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    
    if (new Date(dateFrom) > new Date(dateTo)) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date.",
        variant: "destructive",
      });
      return;
    }
    
    setAppliedDateFilter({ dateFrom, dateTo });
    toast({
      title: "Filter Applied",
      description: `Showing data from ${dateFrom} to ${dateTo}`,
    });
  };

  // Clear date filter
  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedDateFilter(null);
    toast({
      title: "Filter Cleared",
      description: "Showing all available data",
    });
  };

  // Print function
  const printReport = () => {
    window.print();
  };

  const exportExcel = () => {
    try {
      // Validate data
      if (!jobEntries || jobEntries.length === 0) {
        toast({
          title: "No Data",
          description: "No job entries available to export.",
          variant: "destructive",
        });
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Job Entries sheet
      const jobEntriesData = jobEntries.map(entry => ({
        Date: new Date(entry.date).toLocaleDateString(),
        Installers: entry.installers?.map(i => `${i.firstName || ''} ${i.lastName || ''}`).join(", ") || "No installers",
        Vehicle: `${entry.vehicleYear || ''} ${entry.vehicleMake || ''} ${entry.vehicleModel || ''}`.trim(),
        'Time Variance': entry.installers?.map(i => `${i.firstName || 'Unknown'}: ${i.timeVariance > 0 ? '+' : ''}${i.timeVariance || 0} min`).join(", ") || "No data",
        Redos: entry.redoEntries?.length || 0,
        'Redo Details': entry.redoEntries?.map(r => `${r.part} (${r.installer?.firstName || 'Unknown'})`).join(", ") || "None",
        Notes: entry.notes || ""
      }));
      
      const ws1 = XLSX.utils.json_to_sheet(jobEntriesData);
      XLSX.utils.book_append_sheet(wb, ws1, "Job Entries");
      
      // Top Performers sheet
      const performersData = topPerformers?.map(p => ({
        Installer: `${p.installer?.firstName || ''} ${p.installer?.lastName || ''}`.trim() || 'Unknown',
        Email: p.installer?.email || 'No email',
        'Vehicle Count': p.vehicleCount || 0,
        'Redo Count': p.redoCount || 0,
        'Success Rate': `${p.successRate || 0}%`
      })) || [];
      
      const ws2 = XLSX.utils.json_to_sheet(performersData);
      XLSX.utils.book_append_sheet(wb, ws2, "Top Performers");
      
      // Summary sheet
      const summaryData = [{
        'Total Vehicles': metrics?.totalVehicles || 0,
        'Total Redos': metrics?.totalRedos || 0,
        'Success Rate': `${successRate}%`,
        'Avg Time Variance': `${metrics?.avgTimeVariance || 0} min`,
        'Active Installers': metrics?.activeInstallers || 0,
        'Report Generated': new Date().toLocaleString()
      }];
      
      const ws3 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws3, "Summary");
      
      // Save file
      XLSX.writeFile(wb, `tintix-performance-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: "Excel Export Complete",
        description: "Performance report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to generate Excel report.",
        variant: "destructive",
      });
    }
  };

  const exportPDF = () => {
    try {
      // Validate data
      if (!jobEntries || jobEntries.length === 0) {
        toast({
          title: "No Data",
          description: "No job entries available to export.",
          variant: "destructive",
        });
        return;
      }

      const doc = new jsPDF();
      let yPosition = 20;
      
      // Header
      doc.setFontSize(20);
      doc.text('Tintix Performance Report', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 20;
      
      // Summary section
      doc.setFontSize(16);
      doc.text('Performance Summary', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.text(`Total Vehicles: ${metrics?.totalVehicles || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Total Redos: ${metrics?.totalRedos || 0}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Success Rate (7-Window): ${successRate || 0}%`, 20, yPosition);
      yPosition += 10;
      doc.text(`Avg Time Variance: ${metrics?.avgTimeVariance || 0} min`, 20, yPosition);
      yPosition += 10;
      doc.text(`Active Installers: ${metrics?.activeInstallers || 0}`, 20, yPosition);
      yPosition += 20;
      
      // Top Performers section
      doc.setFontSize(16);
      doc.text('Top Performers', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      topPerformers?.slice(0, 5).forEach((performer, index) => {
        const name = `${performer.installer?.firstName || ''} ${performer.installer?.lastName || ''}`.trim() || 'Unknown';
        const stats = `${name}: ${performer.vehicleCount || 0} vehicles, ${performer.redoCount || 0} redos, ${performer.successRate || 0}% success`;
        doc.text(`${index + 1}. ${stats}`, 20, yPosition);
        yPosition += 10;
      });
      
      yPosition += 10;
      
      // Job Entries section
      doc.setFontSize(16);
      doc.text('Recent Job Entries', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(10);
      jobEntries.slice(0, 8).forEach((entry, index) => {
        const date = new Date(entry.date).toLocaleDateString();
        const installers = entry.installers?.map(i => `${i.firstName || ''} ${i.lastName || ''}`).join(", ") || 'No installers';
        const vehicle = `${entry.vehicleYear || ''} ${entry.vehicleMake || ''} ${entry.vehicleModel || ''}`.trim() || 'Unknown vehicle';
        const redos = entry.redoEntries?.length || 0;
        
        doc.text(`${index + 1}. ${date} - ${vehicle}`, 20, yPosition);
        yPosition += 8;
        doc.text(`   Installers: ${installers}`, 20, yPosition);
        yPosition += 8;
        doc.text(`   Redos: ${redos}`, 20, yPosition);
        yPosition += 12;
        
        if (yPosition > 260) { // Start new page if needed
          doc.addPage();
          yPosition = 20;
        }
      });
      
      // Save PDF
      doc.save(`tintix-performance-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF Export Complete",
        description: "Performance report has been downloaded.",
      });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        title: "Export Error",
        description: `Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
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
                onClick={printReport}
                className="border-border hover:bg-muted"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
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
          {/* Date Filter Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter by Date Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label htmlFor="dateFrom" className="text-sm font-medium text-muted-foreground mb-2 block">
                      From Date
                    </Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo" className="text-sm font-medium text-muted-foreground mb-2 block">
                      To Date
                    </Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={applyDateFilter}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Apply Filter
                  </Button>
                  <Button
                    onClick={clearDateFilter}
                    variant="outline"
                    className="border-border hover:bg-muted"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
              
              {/* Show Applied Filter */}
              {appliedDateFilter && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Active Filter:</strong> {appliedDateFilter.dateFrom} to {appliedDateFilter.dateTo}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
