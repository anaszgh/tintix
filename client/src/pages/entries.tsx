import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EntryForm } from "@/components/forms/entry-form";
import { JobCostSummary } from "@/components/forms/labor-costs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Download, Filter, RotateCcw, Edit, Trash2, FileText, Eye, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import type { JobEntryWithDetails, User } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Entries() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JobEntryWithDetails | null>(null);
  const [filters, setFilters] = useState({
    installer: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingEntry, setViewingEntry] = useState<JobEntryWithDetails | null>(null);

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

  const { data: installers = [] } = useQuery<User[]>({
    queryKey: ["/api/installers"],
    enabled: user?.role === "manager",
  });

  const { data: entries = [], refetch: refetchEntries } = useQuery<JobEntryWithDetails[]>({
    queryKey: ["/api/job-entries", filters],
    enabled: isAuthenticated,
  });

  // Filter and sort entries by creation date (newest first) and search term
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries;
    
    // Filter by search term (job number or vehicle make/model)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = entries.filter(entry => 
        entry.jobNumber.toLowerCase().includes(search) ||
        entry.vehicleMake.toLowerCase().includes(search) ||
        entry.vehicleModel.toLowerCase().includes(search) ||
        `${entry.vehicleMake} ${entry.vehicleModel}`.toLowerCase().includes(search)
      );
    }
    
    // Sort by creation date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [entries, searchTerm]);

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await apiRequest("DELETE", `/api/job-entries/${entryId}`);
    },
    onSuccess: () => {
      toast({
        title: "Entry Deleted",
        description: "Job entry has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (entryId: number) => {
    if (window.confirm("Are you sure you want to delete this job entry? This action cannot be undone.")) {
      deleteEntryMutation.mutate(entryId);
    }
  };

  const resetFilters = () => {
    setFilters({
      installer: "all",
      dateFrom: "",
      dateTo: "",
    });
  };

  const exportData = () => {
    // Export functionality would be implemented here
    toast({
      title: "Export Started",
      description: "Your data export is being prepared...",
    });
  };

  const generateJobPDF = (entry: JobEntryWithDetails) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.text('Tintix - Job Entry Report', pageWidth / 2, 20, { align: 'center' });
    
    // Job Information
    doc.setFontSize(12);
    doc.text(`Job Number: ${entry.jobNumber || `JOB-${entry.id}`}`, 20, 40);
    doc.text(`Date: ${new Date(entry.date).toLocaleDateString()}`, 20, 50);
    doc.text(`Vehicle: ${entry.vehicleYear} ${entry.vehicleMake} ${entry.vehicleModel}`, 20, 60);
    doc.text(`Total Windows: ${entry.totalWindows}`, 20, 70);
    
    // Installers
    doc.text('Installers:', 20, 90);
    let yPos = 100;
    entry.installers.forEach((installer) => {
      doc.text(`- ${installer.firstName} ${installer.lastName} (Time Variance: ${installer.timeVariance} min)`, 30, yPos);
      yPos += 10;
    });
    
    // Window Assignments
    if (entry.windowAssignments) {
      doc.text('Window Assignments:', 20, yPos + 10);
      yPos += 20;
      try {
        const assignments = JSON.parse(entry.windowAssignments as string);
        assignments.forEach((assignment: any) => {
          const installer = installers?.find(i => i.id === assignment.installerId);
          doc.text(`- ${assignment.windowName}: ${installer ? `${installer.firstName} ${installer.lastName}` : 'Unassigned'}`, 30, yPos);
          yPos += 10;
        });
      } catch (e) {
        doc.text('- No window assignments available', 30, yPos);
      }
    }
    
    // Material Consumption Breakdown
    doc.text('Material Consumption Breakdown:', 20, yPos + 10);
    yPos += 20;
    
    // Prepare combined consumption data (job dimensions + redo entries)
    const consumptionData: any[] = [];
    let totalJobSqft = 0;
    let totalRedoSqft = 0;
    
    // Add regular job dimensions
    if (entry.dimensions && entry.dimensions.length > 0) {
      entry.dimensions.forEach((dim, index) => {
        const sqft = (Number(dim.lengthInches) * Number(dim.widthInches)) / 144;
        totalJobSqft += sqft;
        consumptionData.push([
          dim.description || `Dimension ${index + 1}`,
          Number(dim.lengthInches).toFixed(1),
          Number(dim.widthInches).toFixed(1),
          sqft.toFixed(2),
          'Job'
        ]);
      });
    }
    
    // Add redo entries with material consumption
    if (entry.redoEntries && entry.redoEntries.length > 0) {
      entry.redoEntries.forEach((redo, index) => {
        if (redo.lengthInches && redo.widthInches) {
          const sqft = (Number(redo.lengthInches) * Number(redo.widthInches)) / 144;
          totalRedoSqft += sqft;
          consumptionData.push([
            `${redo.part} (REDO)`,
            Number(redo.lengthInches).toFixed(1),
            Number(redo.widthInches).toFixed(1),
            sqft.toFixed(2),
            'REDO'
          ]);
        }
      });
    }
    
    if (consumptionData.length > 0) {
      const consumptionHeaders = ['Description', 'Length (in)', 'Width (in)', 'Sq Ft', 'Type'];
      
      // Add consumption table using autoTable
      autoTable(doc, {
        head: [consumptionHeaders],
        body: consumptionData,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          4: { fontStyle: 'bold' }
        },
        didParseCell: function(data: any) {
          if (data.column.index === 4 && data.cell.raw === 'REDO') {
            data.cell.styles.textColor = [220, 53, 69]; // Red color for REDO
          }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Summary totals
      const totalSqft = totalJobSqft + totalRedoSqft;
      
      doc.setFontSize(12);
      doc.text(`Job Material: ${totalJobSqft.toFixed(2)} sq ft`, 20, yPos);
      yPos += 8;
      
      if (totalRedoSqft > 0) {
        doc.setTextColor(220, 53, 69); // Red color
        doc.text(`REDO Material: ${totalRedoSqft.toFixed(2)} sq ft`, 20, yPos);
        doc.setTextColor(0, 0, 0); // Reset to black
        yPos += 8;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Material: ${totalSqft.toFixed(2)} sq ft`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 10;
      
      // Cost breakdown
      if (entry.filmCost && entry.totalSqft) {
        const costPerSqft = Number(entry.filmCost) / Number(entry.totalSqft);
        const jobCost = totalJobSqft * costPerSqft;
        const redoCost = totalRedoSqft * costPerSqft;
        
        doc.text(`Rate: $${costPerSqft.toFixed(2)} per sq ft`, 20, yPos);
        yPos += 8;
        doc.text(`Job Cost: $${jobCost.toFixed(2)}`, 20, yPos);
        yPos += 8;
        
        if (totalRedoSqft > 0) {
          doc.setTextColor(220, 53, 69);
          doc.text(`REDO Cost: $${redoCost.toFixed(2)}`, 20, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 8;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Cost: $${Number(entry.filmCost).toFixed(2)}`, 20, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 15;
      }
    } else {
      doc.text('No consumption data available', 30, yPos);
      yPos += 15;
    }
    
    // Redo Entries
    if (entry.redoEntries.length > 0) {
      doc.text('Redo Entries:', 20, yPos + 5);
      yPos += 15;
      entry.redoEntries.forEach((redo) => {
        const installer = redo.installer;
        doc.text(`- ${redo.part}: ${installer ? `${installer.firstName} ${installer.lastName}` : 'No installer'}`, 30, yPos);
        yPos += 10;
      });
    }
    
    // Notes
    if (entry.notes) {
      doc.text('Notes:', 20, yPos + 10);
      doc.text(entry.notes, 20, yPos + 20);
    }
    
    // Save PDF
    doc.save(`Job-${entry.jobNumber || entry.id}.pdf`);
  };

  const columns = useMemo(() => [
    {
      accessorKey: "jobNumber",
      header: "Job #",
      cell: ({ row }: any) => row.original.jobNumber || `JOB-${row.original.id}`,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }: any) => {
        try {
          const date = new Date(row.original.date);
          return date.toLocaleDateString('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
          });
        } catch {
          return row.original.date || 'Unknown Date';
        }
      },
    },
    {
      accessorKey: "installers",
      header: "Installers",
      cell: ({ row }: any) => row.original.installers.map((installer: any) => `${installer.firstName} ${installer.lastName}`).join(", "),
    },
    {
      accessorKey: "vehicle",
      header: "Vehicle",
      cell: ({ row }: any) => `${row.original.vehicleYear} ${row.original.vehicleMake} ${row.original.vehicleModel}`,
    },
    {
      accessorKey: "timeVariance",
      header: "Total Time Variance",
      cell: ({ row }: any) => {
        // Calculate total time variance from all installers
        const totalVariance = row.original.installers.reduce((sum: number, installer: any) => {
          return sum + (installer.timeVariance || 0);
        }, 0);
        const isPositive = totalVariance > 0;
        return (
          <span className={isPositive ? "text-red-500" : totalVariance < 0 ? "text-green-500" : "text-muted-foreground"}>
            {isPositive ? "+" : ""}{totalVariance} min
          </span>
        );
      },
    },
    {
      accessorKey: "redoEntries",
      header: "Redos",
      cell: ({ row }: any) => {
        const redoCount = row.original.redoEntries.length;
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${
            redoCount === 0 
              ? "bg-muted text-muted-foreground"
              : redoCount === 1
              ? "bg-warning/20 text-warning"
              : "bg-error/20 text-error"
          }`}>
            {redoCount}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const entry = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingEntry(entry)}
              title="View Entry"
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateJobPDF(entry)}
              title="Export PDF"
              className="h-8 w-8 p-0"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingEntry(entry);
                setIsFormOpen(true);
              }}
              disabled={user?.role !== "manager"}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(entry.id)}
              disabled={user?.role !== "manager" || deleteEntryMutation.isPending}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [user?.role, deleteEntryMutation.isPending]);

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
          title="All Entries"
          description="View and manage job entries"
          actions={
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={exportData}
                className="border-border hover:bg-muted"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Dialog open={isFormOpen} onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) {
                  setEditingEntry(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setEditingEntry(null)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-card-foreground">
                      {editingEntry ? "Edit Vehicle Entry" : "New Vehicle Entry"}
                    </DialogTitle>
                  </DialogHeader>
                  <EntryForm 
                    editingEntry={editingEntry}
                    onSuccess={() => {
                      setIsFormOpen(false);
                      setEditingEntry(null);
                      refetchEntries();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          }
        />
        
        <div className="p-8 overflow-y-auto h-full space-y-8">
          {/* Filter Bar */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Job # or Vehicle..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-background border-border pl-10"
                    />
                  </div>
                </div>
                {user?.role === "manager" && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Installer
                    </label>
                    <Select value={filters.installer} onValueChange={(value) => setFilters(prev => ({ ...prev, installer: value }))}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="All Installers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Installers</SelectItem>
                        {installers.map((installer) => (
                          <SelectItem key={installer.id} value={installer.id}>
                            {installer.firstName} {installer.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={resetFilters}
                    className="w-full border-border hover:bg-muted"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entries Table */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <DataTable columns={columns} data={filteredAndSortedEntries} />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* View Entry Dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              View Job Entry - {viewingEntry?.jobNumber || `JOB-${viewingEntry?.id}`}
            </DialogTitle>
          </DialogHeader>
          {viewingEntry && (
            <div className="space-y-6 p-2">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Job Number</label>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewingEntry.jobNumber || `JOB-${viewingEntry.id}`}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</label>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {new Date(viewingEntry.date).toLocaleDateString('en-US', {
                        timeZone: 'America/Los_Angeles',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Vehicle</label>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {viewingEntry.vehicleYear} {viewingEntry.vehicleMake} {viewingEntry.vehicleModel}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Installers</label>
                    <div className="space-y-1">
                      {viewingEntry.installers.map((installer, index) => (
                        <p key={index} className="text-gray-900 dark:text-gray-100 font-medium">
                          {installer.firstName} {installer.lastName}
                          {installer.timeVariance !== 0 && (
                            <span className={`ml-2 text-xs px-2 py-1 rounded ${
                              installer.timeVariance > 0 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' 
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {installer.timeVariance > 0 ? '+' : ''}{installer.timeVariance} min
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</label>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {viewingEntry.durationMinutes ? `${Math.floor(viewingEntry.durationMinutes / 60)}h ${viewingEntry.durationMinutes % 60}m` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Windows</label>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewingEntry.totalWindows}</p>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              {viewingEntry.dimensions && viewingEntry.dimensions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Dimensions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {viewingEntry.dimensions.map((dimension, index) => (
                      <div key={index} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{dimension.description || `Dimension ${index + 1}`}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {Number(dimension.lengthInches).toFixed(1)}" × {Number(dimension.widthInches).toFixed(1)}"
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {Number(dimension.sqft).toFixed(2)} sq ft
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Redo Entries */}
              {viewingEntry.redoEntries && viewingEntry.redoEntries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Redo Entries</h3>
                  <div className="space-y-3">
                    {viewingEntry.redoEntries.map((redo, index) => (
                      <div key={index} className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Part</label>
                            <p className="text-gray-900 dark:text-gray-100 font-medium capitalize">{redo.part}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Installer</label>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                              {redo.installer ? `${redo.installer.firstName} ${redo.installer.lastName}` : 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Time</label>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{redo.timeMinutes || 0} minutes</p>
                          </div>
                        </div>
                        {redo.lengthInches && redo.widthInches && (
                          <div className="mt-2">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Dimensions</label>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                              {Number(redo.lengthInches).toFixed(1)}" × {Number(redo.widthInches).toFixed(1)}" 
                              ({((Number(redo.lengthInches) * Number(redo.widthInches)) / 144).toFixed(2)} sq ft)
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Cost Summary */}
              <JobCostSummary jobEntry={viewingEntry} />

              {/* Notes */}
              {viewingEntry.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Notes</label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {viewingEntry.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
