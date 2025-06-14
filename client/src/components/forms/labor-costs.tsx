import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, DollarSign, User } from "lucide-react";
import type { User } from "@shared/schema";

interface LaborCost {
  installer: User;
  timeMinutes: number;
  hourlyRate: number;
  laborCost: number;
}

interface LaborCostsProps {
  jobEntryId: number;
}

export function LaborCosts({ jobEntryId }: LaborCostsProps) {
  const { data: laborCosts = [], isLoading } = useQuery<LaborCost[]>({
    queryKey: ["/api/job-entries", jobEntryId, "labor-costs"],
    queryFn: () => fetch(`/api/job-entries/${jobEntryId}/labor-costs`).then(res => res.json()),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Labor Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading labor costs...</div>
        </CardContent>
      </Card>
    );
  }

  if (laborCosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Labor Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No labor costs calculated for this job.</div>
        </CardContent>
      </Card>
    );
  }

  const totalLaborCost = laborCosts.reduce((sum, cost) => sum + cost.laborCost, 0);
  const totalTimeMinutes = laborCosts.reduce((sum, cost) => sum + cost.timeMinutes, 0);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Labor Costs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {laborCosts.map((cost, index) => (
          <div key={cost.installer.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
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
            <span>Total Labor Cost</span>
            <span className="text-sm text-muted-foreground font-normal">
              ({formatTime(totalTimeMinutes)})
            </span>
          </div>
          <Badge className="font-mono text-base">
            ${totalLaborCost.toFixed(2)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}