import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, DollarSign, User as UserIcon, Package, Receipt } from "lucide-react";
import type { User, JobEntryWithDetails } from "@shared/schema";

interface LaborCost {
  installer: User;
  timeMinutes: number;
  hourlyRate: number;
  laborCost: number;
}

interface JobCostSummaryProps {
  jobEntry: JobEntryWithDetails;
}

export function JobCostSummary({ jobEntry }: JobCostSummaryProps) {
  const { data: laborCosts = [], isLoading } = useQuery<LaborCost[]>({
    queryKey: ["/api/job-entries", jobEntry.id, "labor-costs"],
    queryFn: () => fetch(`/api/job-entries/${jobEntry.id}/labor-costs`).then(res => res.json()),
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Job Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading cost information...</div>
        </CardContent>
      </Card>
    );
  }

  const totalLaborCost = laborCosts.reduce((sum, cost) => sum + cost.laborCost, 0);
  const totalTimeMinutes = laborCosts.reduce((sum, cost) => sum + cost.timeMinutes, 0);
  
  // Calculate material costs
  const filmCost = Number(jobEntry.filmCost || 0);
  const redoMaterialCost = jobEntry.redoEntries.reduce((sum, redo) => {
    const redoSqft = Number(redo.sqft || 0);
    // Calculate cost per sqft from job's film cost and total sqft
    const costPerSqft = jobEntry.totalSqft ? Number(jobEntry.filmCost || 0) / Number(jobEntry.totalSqft) : 0;
    return sum + (redoSqft * costPerSqft);
  }, 0);
  const totalMaterialCost = filmCost + redoMaterialCost;
  
  const totalJobCost = totalLaborCost + totalMaterialCost;

  return (
    <div className="space-y-4">
      {/* Labor Costs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Labor Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {laborCosts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No labor costs calculated for this job.</div>
          ) : (
            <>
              {laborCosts.map((cost, index) => (
                <div key={cost.installer.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {cost.installer.firstName} {cost.installer.lastName}
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      ${cost.laborCost.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground ml-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(cost.timeMinutes)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${cost.hourlyRate.toFixed(2)}/hr</span>
                      </div>
                    </div>
                  </div>
                  
                  {index < laborCosts.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
              
              <Separator />
              
              <div className="flex items-center justify-between font-semibold">
                <div className="flex items-center gap-2">
                  <span>Total Labor</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    ({formatTime(totalTimeMinutes)})
                  </span>
                </div>
                <Badge variant="secondary" className="font-mono text-base">
                  ${totalLaborCost.toFixed(2)}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Material Costs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Film Cost</span>
              <span className="text-sm text-muted-foreground">
                ({jobEntry.totalSqft?.toFixed(1)} sq ft)
              </span>
            </div>
            <Badge variant="outline" className="font-mono">
              ${filmCost.toFixed(2)}
            </Badge>
          </div>
          
          {redoMaterialCost > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-600">Redo Material Cost</span>
                  <span className="text-sm text-muted-foreground">
                    ({jobEntry.redoEntries.reduce((sum, redo) => sum + Number(redo.sqft || 0), 0).toFixed(1)} sq ft)
                  </span>
                </div>
                <Badge variant="destructive" className="font-mono">
                  ${redoMaterialCost.toFixed(2)}
                </Badge>
              </div>
              <Separator />
            </>
          )}
          
          <div className="flex items-center justify-between font-semibold">
            <span>Total Materials</span>
            <Badge variant="secondary" className="font-mono text-base">
              ${totalMaterialCost.toFixed(2)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Total Job Cost Section */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Total Job Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Labor Cost:</span>
              <span className="font-mono">${totalLaborCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Material Cost:</span>
              <span className="font-mono">${totalMaterialCost.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xl font-bold">
              <span>Net Total:</span>
              <Badge className="font-mono text-xl px-4 py-2">
                ${totalJobCost.toFixed(2)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}