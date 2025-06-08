import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export function PerformanceChart() {
  const { data: performers = [] } = useQuery({
    queryKey: ["/api/analytics/top-performers"],
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground">Top Performers</CardTitle>
          <Select defaultValue="month">
            <SelectTrigger className="w-32 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <InstallerCardSkeleton key={index} />
          ))
        ) : (performers as any[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No performance data available</p>
          </div>
        ) : (
          (performers as any[]).slice(0, 3).map((performer: any, index: number) => (
            <div key={performer.installer.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    {performer.installer.firstName} {performer.installer.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {performer.vehicleCount} vehicles, {performer.redoCount} redos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-success">
                  {performer.successRate}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
