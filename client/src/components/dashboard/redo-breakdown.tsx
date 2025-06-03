import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const partColors = {
  windshield: "bg-error",
  rollups: "bg-warning", 
  back_windshield: "bg-primary",
  quarter: "bg-success",
};

const partLabels = {
  windshield: "Windshield (W.S)",
  rollups: "Rollups",
  back_windshield: "Back Windshield (B.W.S)",
  quarter: "Quarter",
};

export function RedoBreakdown() {
  const { data: breakdown = [] } = useQuery({
    queryKey: ["/api/analytics/redo-breakdown"],
  });

  const totalRedos = breakdown.reduce((sum: number, item: any) => sum + item.count, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground">Redo Breakdown</CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-card-foreground cursor-pointer" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {breakdown.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No redo data available</p>
          </div>
        ) : (
          breakdown.map((item: any) => {
            const percentage = totalRedos > 0 ? (item.count / totalRedos) * 100 : 0;
            const colorClass = partColors[item.part as keyof typeof partColors] || "bg-muted";
            const label = partLabels[item.part as keyof typeof partLabels] || item.part;
            
            return (
              <div key={item.part} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${colorClass} rounded-full`}></div>
                  <span className="text-card-foreground">{label}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className={`${colorClass} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
