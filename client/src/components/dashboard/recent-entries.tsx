import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { JobEntryWithDetails } from "@shared/schema";

export function RecentEntries() {
  const { user } = useAuth();
  
  const { data: entries = [] } = useQuery<JobEntryWithDetails[]>({
    queryKey: ["/api/job-entries", { limit: 5 }],
  });

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
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-sm text-card-foreground">
                      {entry.installers.map(installer => `${installer.firstName} ${installer.lastName}`).join(", ")}
                    </td>
                    <td className="py-4 text-sm text-card-foreground">
                      {entry.vehicleYear} {entry.vehicleMake} {entry.vehicleModel}
                    </td>
                    <td className="py-4 text-sm">
                      <span className={entry.timeVariance > 0 ? "text-error" : "text-success"}>
                        {entry.timeVariance > 0 ? "+" : ""}{entry.timeVariance} min
                      </span>
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
                            className="text-muted-foreground hover:text-primary p-1"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
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
    </Card>
  );
}
