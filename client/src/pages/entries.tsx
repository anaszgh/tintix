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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Download, Filter, RotateCcw, Edit, Trash2 } from "lucide-react";
import type { JobEntryWithDetails, User } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Entries() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState({
    installer: "all",
    dateFrom: "",
    dateTo: "",
  });

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

  const columns = useMemo(() => [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }: any) => new Date(row.original.date).toLocaleDateString(),
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
              onClick={() => {
                // TODO: Implement edit functionality
                toast({
                  title: "Edit Feature",
                  description: "Edit functionality coming soon",
                });
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
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-card-foreground">New Vehicle Entry</DialogTitle>
                  </DialogHeader>
                  <EntryForm 
                    onSuccess={() => {
                      setIsFormOpen(false);
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <DataTable columns={columns} data={entries} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
