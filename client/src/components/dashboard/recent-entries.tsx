import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { EntryForm } from "@/components/forms/entry-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import type { JobEntryWithDetails } from "@shared/schema";

export function RecentEntries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JobEntryWithDetails | null>(null);
  
  const { data: entries = [], refetch: refetchEntries } = useQuery<JobEntryWithDetails[]>({
    queryKey: ["/api/job-entries", { limit: 5 }],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/job-entries/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Entry deleted",
        description: "Job entry has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (entry: JobEntryWithDetails) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (entry: JobEntryWithDetails) => {
    if (confirm(`Are you sure you want to delete the entry for ${entry.vehicleYear} ${entry.vehicleMake} ${entry.vehicleModel}?`)) {
      deleteMutation.mutate(entry.id);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground">Recent Entries</CardTitle>
          <Link href="/entries">
            <a className="text-primary hover:text-primary/80 text-sm font-medium flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No entries found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first job entry to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm font-medium text-muted-foreground pb-3">Date</th>
                  <th className="text-left text-sm font-medium text-muted-foreground pb-3">Installer</th>
                  <th className="text-left text-sm font-medium text-muted-foreground pb-3">Vehicle</th>
                  <th className="text-left text-sm font-medium text-muted-foreground pb-3">Time Variance</th>
                  <th className="text-left text-sm font-medium text-muted-foreground pb-3">Redos</th>
                  {user?.role === "manager" && (
                    <th className="text-left text-sm font-medium text-muted-foreground pb-3">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 text-sm text-card-foreground">
                      {formatDate(entry.date)}
                    </td>
                    <td className="py-4 text-sm text-card-foreground">
                      {entry.installers.map(installer => `${installer.firstName} ${installer.lastName}`).join(", ")}
                    </td>
                    <td className="py-4 text-sm text-card-foreground">
                      {entry.vehicleYear} {entry.vehicleMake} {entry.vehicleModel}
                    </td>
                    <td className="py-4 text-sm">
                      {entry.installers.map((installer, idx) => {
                        const jobInstaller = entry.installers.find(ji => ji.id === installer.id);
                        const timeVariance = jobInstaller?.timeVariance || 0;
                        return (
                          <div key={installer.id} className={idx > 0 ? "mt-1" : ""}>
                            <span className="text-xs text-muted-foreground">
                              {installer.firstName}: 
                            </span>
                            <span className={timeVariance > 0 ? "text-red-500 ml-1" : timeVariance < 0 ? "text-green-500 ml-1" : "ml-1"}>
                              {timeVariance > 0 ? "+" : ""}{timeVariance} min
                            </span>
                          </div>
                        );
                      })}
                    </td>
                    <td className="py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        entry.redoEntries.length === 0 
                          ? "bg-muted text-muted-foreground"
                          : entry.redoEntries.length === 1
                          ? "bg-warning/20 text-warning"
                          : "bg-error/20 text-error"
                      }`}>
                        {entry.redoEntries.length}
                      </span>
                    </td>
                    {user?.role === "manager" && (
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            className="text-muted-foreground hover:text-primary p-1"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(entry)}
                            disabled={deleteMutation.isPending}
                            className="text-muted-foreground hover:text-error p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingEntry(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Edit Job Entry</DialogTitle>
          </DialogHeader>
          <EntryForm 
            editingEntry={editingEntry}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              setEditingEntry(null);
              refetchEntries();
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
