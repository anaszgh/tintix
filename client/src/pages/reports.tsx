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

  const { data: filmConsumption = [] } = useQuery<Array<{
    date: string;
    filmType: string;
    filmName: string;
    totalSqft: number;
    totalCost: number;
    jobCount: number;
  }>>({
    queryKey: ["/api/analytics/film-consumption", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryParams.dateFrom) params.set('dateFrom', queryParams.dateFrom);
      if (queryParams.dateTo) params.set('dateTo', queryParams.dateTo);
      
      const response = await fetch(`/api/analytics/film-consumption?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch film consumption');
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
    
    // Show helpful feedback about available dates
    // Format directly from the date strings without any Date object conversion
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-');
      return `${parseInt(month)}/${parseInt(day)}/${year}`;
    };
    
    const fromFormatted = formatDate(dateFrom);
    const toFormatted = formatDate(dateTo);
    
    toast({
      title: "Filter Applied",
      description: `Showing data from ${fromFormatted} to ${toFormatted}`,
      duration: 2000, // Auto-dismiss after 2 seconds
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

  const printFilmCostReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Tintix - Film Cost Estimation Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range info
    doc.setFontSize(12);
    let dateRangeText = 'All Time';
    if (appliedDateFilter?.dateFrom || appliedDateFilter?.dateTo) {
      const fromDate = appliedDateFilter?.dateFrom ? new Date(appliedDateFilter.dateFrom).toLocaleDateString() : 'Start';
      const toDate = appliedDateFilter?.dateTo ? new Date(appliedDateFilter.dateTo).toLocaleDateString() : 'End';
      dateRangeText = `${fromDate} - ${toDate}`;
    }
    doc.text(`Date Range: ${dateRangeText}`, pageWidth / 2, 30, { align: 'center' });
    
    // Film cost table
    if (jobEntries.length > 0) {
      const tableHeaders = ['Date', 'Job #', 'Vehicle', 'Film Type', 'Sq Ft', 'Film Cost', 'Duration'];
      const tableData = jobEntries.map(entry => [
        new Date(entry.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }),
        entry.jobNumber,
        `${entry.vehicleYear || ''} ${entry.vehicleMake || ''} ${entry.vehicleModel || ''}`.trim() || 'N/A',
        entry.filmId ? filmConsumption.find(f => new Date(f.date).toDateString() === new Date(entry.date).toDateString())?.filmName || 'N/A' : 'N/A',
        entry.totalSqft ? Number(entry.totalSqft).toFixed(2) : '0.00',
        `$${entry.filmCost ? Number(entry.filmCost).toFixed(2) : '0.00'}`,
        entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m` : 'N/A'
      ]);
      
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right' }
        }
      });
      
      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.text('Summary:', 20, finalY);
      doc.text(`Total Jobs: ${jobEntries.length}`, 20, finalY + 15);
      doc.text(`Total Film Cost: $${jobEntries.reduce((sum, entry) => sum + (Number(entry.filmCost) || 0), 0).toFixed(2)}`, 20, finalY + 30);
    }
    
    doc.save(`film-cost-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const printRedoCostReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Tintix - Redo Cost Analysis Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range info
    doc.setFontSize(12);
    let dateRangeText = 'All Time';
    if (appliedDateFilter?.dateFrom || appliedDateFilter?.dateTo) {
      const fromDate = appliedDateFilter?.dateFrom ? new Date(appliedDateFilter.dateFrom).toLocaleDateString() : 'Start';
      const toDate = appliedDateFilter?.dateTo ? new Date(appliedDateFilter.dateTo).toLocaleDateString() : 'End';
      dateRangeText = `${fromDate} - ${toDate}`;
    }
    doc.text(`Date Range: ${dateRangeText}`, pageWidth / 2, 30, { align: 'center' });
    
    // Redo cost table
    const redoJobs = jobEntries.filter(entry => entry.redoEntries && entry.redoEntries.length > 0);
    if (redoJobs.length > 0) {
      const tableHeaders = ['Date', 'Job #', 'Vehicle', 'Redo Part', 'Installer', 'Redo Sq Ft', 'Redo Cost', 'Redo Time'];
      const tableData = redoJobs.flatMap(entry => 
        entry.redoEntries?.map((redo) => {
          const redoSqft = redo.lengthInches && redo.widthInches ? 
            (Number(redo.lengthInches) * Number(redo.widthInches)) / 144 : 0;
          const filmCostPerSqft = entry.filmCost && entry.totalSqft ? 
            Number(entry.filmCost) / Number(entry.totalSqft) : 0;
          const redoCost = redoSqft * filmCostPerSqft;
          
          return [
            new Date(entry.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }),
            entry.jobNumber,
            `${entry.vehicleYear || ''} ${entry.vehicleMake || ''} ${entry.vehicleModel || ''}`.trim() || 'N/A',
            redo.part,
            redo.installer ? `${redo.installer.firstName} ${redo.installer.lastName}` : 'N/A',
            redoSqft.toFixed(2),
            `$${redoCost.toFixed(2)}`,
            redo.timeMinutes ? `${Math.floor(redo.timeMinutes / 60)}h ${redo.timeMinutes % 60}m` : 'N/A'
          ];
        }) || []
      );
      
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 53, 69] },
        columnStyles: {
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold', textColor: [220, 53, 69] },
          7: { halign: 'right' }
        }
      });
      
      // Summary
      const totalRedoCost = redoJobs.reduce((sum, entry) => {
        const filmCostPerSqft = entry.filmCost && entry.totalSqft ? 
          Number(entry.filmCost) / Number(entry.totalSqft) : 0;
        return sum + (entry.redoEntries?.reduce((redoSum, redo) => {
          const redoSqft = redo.lengthInches && redo.widthInches ? 
            (Number(redo.lengthInches) * Number(redo.widthInches)) / 144 : 0;
          return redoSum + (redoSqft * filmCostPerSqft);
        }, 0) || 0);
      }, 0);
      
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.text('Summary:', 20, finalY);
      doc.text(`Total Redos: ${redoJobs.reduce((sum, entry) => sum + (entry.redoEntries?.length || 0), 0)}`, 20, finalY + 15);
      doc.text(`Total Redo Cost: $${totalRedoCost.toFixed(2)}`, 20, finalY + 30);
    }
    
    doc.save(`redo-cost-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const printFilmTypeCostReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Tintix - Film Type Cost Summary', pageWidth / 2, 20, { align: 'center' });
    
    // Date range info
    doc.setFontSize(12);
    let dateRangeText = 'All Time';
    if (appliedDateFilter?.dateFrom || appliedDateFilter?.dateTo) {
      const fromDate = appliedDateFilter?.dateFrom ? new Date(appliedDateFilter.dateFrom).toLocaleDateString() : 'Start';
      const toDate = appliedDateFilter?.dateTo ? new Date(appliedDateFilter.dateTo).toLocaleDateString() : 'End';
      dateRangeText = `${fromDate} - ${toDate}`;
    }
    doc.text(`Date Range: ${dateRangeText}`, pageWidth / 2, 30, { align: 'center' });
    
    // Film type summary table
    if (filmConsumption.length > 0) {
      const filmTypeSummary = filmConsumption.reduce((acc, item) => {
        const key = `${item.filmType}-${item.filmName}`;
        if (!acc[key]) {
          acc[key] = {
            filmType: item.filmType,
            filmName: item.filmName,
            totalJobs: 0,
            totalSqft: 0,
            totalCost: 0
          };
        }
        acc[key].totalJobs += item.jobCount;
        acc[key].totalSqft += item.totalSqft;
        acc[key].totalCost += item.totalCost;
        return acc;
      }, {} as Record<string, any>);
      
      const summaryArray = Object.values(filmTypeSummary);
      const tableHeaders = ['Film Type', 'Film Name', 'Total Jobs', 'Total Sq Ft', 'Total Cost', 'Avg Cost/Job'];
      const tableData = summaryArray.map((summary: any) => [
        summary.filmType,
        summary.filmName,
        summary.totalJobs.toString(),
        summary.totalSqft.toFixed(2),
        `$${summary.totalCost.toFixed(2)}`,
        `$${(summary.totalCost / summary.totalJobs).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
          5: { halign: 'right' }
        }
      });
      
      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.text('Summary:', 20, finalY);
      doc.text(`Total Cost: $${filmConsumption.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}`, 20, finalY + 15);
    }
    
    doc.save(`film-type-cost-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const printFilmConsumptionReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Tintix - Daily Film Consumption Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range info
    doc.setFontSize(12);
    let dateRangeText = 'All Time';
    if (appliedDateFilter?.dateFrom || appliedDateFilter?.dateTo) {
      const fromDate = appliedDateFilter?.dateFrom ? new Date(appliedDateFilter.dateFrom).toLocaleDateString() : 'Start';
      const toDate = appliedDateFilter?.dateTo ? new Date(appliedDateFilter.dateTo).toLocaleDateString() : 'End';
      dateRangeText = `${fromDate} - ${toDate}`;
    }
    doc.text(`Date Range: ${dateRangeText}`, pageWidth / 2, 30, { align: 'center' });
    
    // Film consumption table
    if (filmConsumption.length > 0) {
      const tableHeaders = ['Date', 'Film Type', 'Film Name', 'Sq Ft Used', 'Total Cost', 'Jobs'];
      const tableData = filmConsumption.map(item => [
        new Date(item.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }),
        item.filmType,
        item.filmName,
        item.totalSqft.toFixed(2),
        `$${item.totalCost.toFixed(2)}`,
        item.jobCount.toString()
      ]);
      
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          3: { halign: 'right' }, // Sq Ft
          4: { halign: 'right' }, // Cost
          5: { halign: 'right' }  // Jobs
        }
      });
      
      // Summary totals
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      const totalSqft = filmConsumption.reduce((sum, item) => sum + item.totalSqft, 0);
      const totalCost = filmConsumption.reduce((sum, item) => sum + item.totalCost, 0);
      const totalJobs = filmConsumption.reduce((sum, item) => sum + item.jobCount, 0);
      
      doc.setFontSize(14);
      doc.text('Summary Totals:', 20, finalY);
      doc.setFontSize(12);
      doc.text(`Total Square Footage: ${totalSqft.toFixed(2)} sq ft`, 20, finalY + 15);
      doc.text(`Total Cost: $${totalCost.toFixed(2)}`, 20, finalY + 25);
      doc.text(`Total Jobs: ${totalJobs}`, 20, finalY + 35);
      
    } else {
      doc.text('No film consumption data available for the selected date range.', 20, 50);
    }
    
    // Save PDF
    doc.save(`film-consumption-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
        Date: new Date(entry.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }),
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
      
      // Film Consumption sheet
      const filmConsumptionData = filmConsumption.map(item => ({
        Date: new Date(item.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }),
        'Film Type': item.filmType,
        'Film Name': item.filmName,
        'Sq Ft Used': item.totalSqft.toFixed(2),
        'Total Cost': `$${item.totalCost.toFixed(2)}`,
        'Job Count': item.jobCount
      }));
      
      const ws3 = XLSX.utils.json_to_sheet(filmConsumptionData);
      XLSX.utils.book_append_sheet(wb, ws3, "Film Consumption");
      
      // Summary sheet
      const summaryData = [{
        'Total Vehicles': metrics?.totalVehicles || 0,
        'Total Redos': metrics?.totalRedos || 0,
        'Success Rate': `${successRate}%`,
        'Avg Time Variance': `${metrics?.avgTimeVariance || 0} min`,
        'Active Installers': metrics?.activeInstallers || 0,
        'Total Film Sq Ft': filmConsumption.reduce((sum, item) => sum + item.totalSqft, 0).toFixed(2),
        'Total Film Cost': `$${filmConsumption.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}`,
        'Report Generated': new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) + ' (Pacific Time)'
      }];
      
      const ws4 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws4, "Summary");
      
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
            <RedoBreakdown 
              dateFilters={appliedDateFilter ? { dateFrom: appliedDateFilter.dateFrom, dateTo: appliedDateFilter.dateTo } : undefined}
              showPrintButton={true}
            />
          </div>

          {/* Film Consumption Report */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Daily Film Consumption Report</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => printFilmConsumptionReport()}
                  className="border-border hover:bg-muted"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Film Type</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Film Name</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Sq Ft Used</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total Cost</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Jobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filmConsumption.length > 0 ? (
                      filmConsumption.map((item, index) => (
                        <tr key={index} className="border-b border-border hover:bg-muted/50">
                          <td className="p-3 text-card-foreground">
                            {new Date(item.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}
                          </td>
                          <td className="p-3 text-card-foreground">{item.filmType}</td>
                          <td className="p-3 text-card-foreground">{item.filmName}</td>
                          <td className="p-3 text-right text-card-foreground font-mono">
                            {item.totalSqft.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-card-foreground font-mono">
                            ${item.totalCost.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-card-foreground">
                            {item.jobCount}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No film consumption data available for the selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Summary totals */}
              {filmConsumption.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-card-foreground">
                        {filmConsumption.reduce((sum, item) => sum + item.totalSqft, 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Sq Ft</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-card-foreground">
                        ${filmConsumption.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-card-foreground">
                        {filmConsumption.reduce((sum, item) => sum + item.jobCount, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Jobs</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Film Cost Estimation Report */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Film Cost Estimation Report</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={printFilmCostReport}
                  className="border-border hover:bg-muted"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Job #</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Vehicle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Film Type</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Sq Ft</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Film Cost</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobEntries.length > 0 ? (
                      jobEntries.map((entry, index) => (
                        <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-3 text-card-foreground">
                            {new Date(entry.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}
                          </td>
                          <td className="p-3 text-card-foreground font-mono">{entry.jobNumber}</td>
                          <td className="p-3 text-card-foreground">
                            {`${entry.vehicleYear || ''} ${entry.vehicleMake || ''} ${entry.vehicleModel || ''}`.trim() || 'N/A'}
                          </td>
                          <td className="p-3 text-card-foreground">
                            {entry.filmId ? filmConsumption.find(f => new Date(f.date).toDateString() === new Date(entry.date).toDateString())?.filmName || 'N/A' : 'N/A'}
                          </td>
                          <td className="p-3 text-right text-card-foreground font-mono">
                            {entry.totalSqft ? Number(entry.totalSqft).toFixed(2) : '0.00'}
                          </td>
                          <td className="p-3 text-right text-card-foreground font-mono">
                            ${entry.filmCost ? Number(entry.filmCost).toFixed(2) : '0.00'}
                          </td>
                          <td className="p-3 text-right text-card-foreground">
                            {entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m` : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No film cost data available for the selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Summary totals with date filtering */}
              {(() => {
                // Use jobEntries which are already filtered by the backend query parameters
                let summaryEntries = jobEntries;
                
                return summaryEntries.length > 0 ? (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-card-foreground">
                          {summaryEntries.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Jobs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-card-foreground">
                          {summaryEntries.reduce((sum, entry) => sum + (Number(entry.totalSqft) || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Sq Ft</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-card-foreground">
                          ${summaryEntries.reduce((sum, entry) => sum + (Number(entry.filmCost) || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Film Cost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-card-foreground">
                          {Math.floor(summaryEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0) / 60)}h {summaryEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0) % 60}m
                        </div>
                        <div className="text-sm text-muted-foreground">Total Time</div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

          {/* Redo Cost Analysis Report */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-red-500" />
                  <span>Redo Cost Analysis Report</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={printRedoCostReport}
                  className="border-border hover:bg-muted"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Job #</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Vehicle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Redo Part</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Installer</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Redo Sq Ft</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Redo Cost</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Redo Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Use jobEntries which are already filtered by backend query parameters
                      const redoJobs = jobEntries.filter(entry => entry.redoEntries && entry.redoEntries.length > 0);
                      return redoJobs.length > 0 ? (
                        redoJobs.flatMap(entry => 
                          entry.redoEntries?.map((redo, redoIndex) => {
                            const redoSqft = redo.lengthInches && redo.widthInches ? 
                              (Number(redo.lengthInches) * Number(redo.widthInches)) / 144 : 0;
                            const filmCostPerSqft = entry.filmCost && entry.totalSqft ? 
                              Number(entry.filmCost) / Number(entry.totalSqft) : 0;
                            const redoCost = redoSqft * filmCostPerSqft;
                            
                            return (
                              <tr key={`${entry.id}-${redoIndex}`} className="border-b border-border hover:bg-muted/50">
                                <td className="p-3 text-card-foreground">
                                  {new Date(entry.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}
                                </td>
                                <td className="p-3 text-card-foreground font-mono">{entry.jobNumber}</td>
                                <td className="p-3 text-card-foreground">
                                  {`${entry.vehicleYear || ''} ${entry.vehicleMake || ''} ${entry.vehicleModel || ''}`.trim() || 'N/A'}
                                </td>
                                <td className="p-3 text-red-600 font-medium">{redo.part}</td>
                                <td className="p-3 text-card-foreground">
                                  {redo.installer ? `${redo.installer.firstName} ${redo.installer.lastName}` : 'N/A'}
                                </td>
                                <td className="p-3 text-right text-red-600 font-mono">
                                  {redoSqft.toFixed(2)}
                                </td>
                                <td className="p-3 text-right text-red-600 font-mono font-bold">
                                  ${redoCost.toFixed(2)}
                                </td>
                                <td className="p-3 text-right text-red-600">
                                  {redo.timeMinutes ? `${Math.floor(redo.timeMinutes / 60)}h ${redo.timeMinutes % 60}m` : 'N/A'}
                                </td>
                              </tr>
                            );
                          }) || []
                        )
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            No redo cost data available for the selected date range.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Redo Summary totals with date filtering */}
              {(() => {
                // Use jobEntries which are already filtered by backend query parameters
                const redoJobs = jobEntries.filter(entry => entry.redoEntries && entry.redoEntries.length > 0);
                const totalRedos = redoJobs.reduce((sum, entry) => sum + (entry.redoEntries?.length || 0), 0);
                const totalRedoSqft = redoJobs.reduce((sum, entry) => {
                  return sum + (entry.redoEntries?.reduce((redoSum, redo) => {
                    const redoSqft = redo.lengthInches && redo.widthInches ? 
                      (Number(redo.lengthInches) * Number(redo.widthInches)) / 144 : 0;
                    return redoSum + redoSqft;
                  }, 0) || 0);
                }, 0);
                const totalRedoCost = redoJobs.reduce((sum, entry) => {
                  const filmCostPerSqft = entry.filmCost && entry.totalSqft ? 
                    Number(entry.filmCost) / Number(entry.totalSqft) : 0;
                  return sum + (entry.redoEntries?.reduce((redoSum, redo) => {
                    const redoSqft = redo.lengthInches && redo.widthInches ? 
                      (Number(redo.lengthInches) * Number(redo.widthInches)) / 144 : 0;
                    return redoSum + (redoSqft * filmCostPerSqft);
                  }, 0) || 0);
                }, 0);
                const totalRedoTime = redoJobs.reduce((sum, entry) => {
                  return sum + (entry.redoEntries?.reduce((redoSum, redo) => redoSum + (redo.timeMinutes || 0), 0) || 0);
                }, 0);
                
                return totalRedos > 0 ? (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {totalRedos}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Redos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {totalRedoSqft.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Redo Sq Ft</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          ${totalRedoCost.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Redo Cost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {Math.floor(totalRedoTime / 60)}h {totalRedoTime % 60}m
                        </div>
                        <div className="text-sm text-muted-foreground">Total Redo Time</div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

          {/* Film Type Cost Summary */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Film Type Cost Summary</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={printFilmTypeCostReport}
                  className="border-border hover:bg-muted"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Film Type</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Film Name</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total Jobs</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total Sq Ft</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total Cost</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Avg Cost/Job</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Use filmConsumption which is already filtered by backend query parameters
                      const filmTypeSummary = filmConsumption.reduce((acc, item) => {
                        const key = `${item.filmType}-${item.filmName}`;
                        if (!acc[key]) {
                          acc[key] = {
                            filmType: item.filmType,
                            filmName: item.filmName,
                            totalJobs: 0,
                            totalSqft: 0,
                            totalCost: 0
                          };
                        }
                        acc[key].totalJobs += item.jobCount;
                        acc[key].totalSqft += item.totalSqft;
                        acc[key].totalCost += item.totalCost;
                        return acc;
                      }, {} as Record<string, any>);
                      
                      const summaryArray = Object.values(filmTypeSummary);
                      
                      return summaryArray.length > 0 ? (
                        summaryArray.map((summary: any, index) => (
                          <tr key={index} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3 text-card-foreground font-medium">{summary.filmType}</td>
                            <td className="p-3 text-card-foreground">{summary.filmName}</td>
                            <td className="p-3 text-right text-card-foreground">{summary.totalJobs}</td>
                            <td className="p-3 text-right text-card-foreground font-mono">
                              {summary.totalSqft.toFixed(2)}
                            </td>
                            <td className="p-3 text-right text-card-foreground font-mono font-bold">
                              ${summary.totalCost.toFixed(2)}
                            </td>
                            <td className="p-3 text-right text-card-foreground font-mono">
                              ${(summary.totalCost / summary.totalJobs).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No film type data available for the selected date range.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Film Type Summary totals with date filtering */}
              {(() => {
                // Use filmConsumption which is already filtered by backend query parameters
                return filmConsumption.length > 0 ? (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-card-foreground">
                          {filmConsumption.reduce((sum, item) => sum + item.jobCount, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Jobs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-card-foreground">
                          {filmConsumption.reduce((sum, item) => sum + item.totalSqft, 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Sq Ft</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-card-foreground">
                          ${filmConsumption.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Cost</div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

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
