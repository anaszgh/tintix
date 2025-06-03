import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EntryForm } from "@/components/forms/entry-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Download, Filter, RotateCcw } from "lucide-react";
import type { JobEntryWithDetails, User } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Entries() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
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

  const columns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }: any) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "installer",
      header: "Installer",
      cell: ({ row }: any) => `${row.original.installer.firstName} ${row.original.installer.lastName}`,
    },
    {
      accessorKey: "vehicle",
      header: "Vehicle",
      cell: ({ row }: any) => `${row.original.vehicleYear} ${row.original.vehicleMake} ${row.original.vehicleModel}`,
    },
    {
      accessorKey: "timeVariance",
      header: "Time Variance",
      cell: ({ row }: any) => {
        const variance = row.original.timeVariance;
        const isPositive = variance > 0;
        return (
          <span className={isPositive ? "text-error" : "text-success"}>
            {isPositive ? "+" : ""}{variance} min
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
  ];

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
