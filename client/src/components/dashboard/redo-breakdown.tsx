import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Printer } from "lucide-react";

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

interface RedoBreakdownProps {
  dateFilters?: {
    dateFrom?: string;
    dateTo?: string;
  };
  showPrintButton?: boolean;
}

export function RedoBreakdown({ dateFilters, showPrintButton = false }: RedoBreakdownProps = {}) {
  const { data: breakdown = [] } = useQuery<Array<{
    part: string;
    count: number;
  }>>({
    queryKey: ["/api/analytics/redo-breakdown", dateFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilters?.dateFrom) params.set('dateFrom', dateFilters.dateFrom);
      if (dateFilters?.dateTo) params.set('dateTo', dateFilters.dateTo);
      
      const response = await fetch(`/api/analytics/redo-breakdown?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch redo breakdown');
      return response.json();
    },
  });

  const totalRedos = breakdown.reduce((sum: number, item: any) => sum + item.count, 0);

  const printRedoBreakdown = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Redo Breakdown Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            .breakdown-item { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px; border-bottom: 1px solid #eee; }
            .part-name { font-weight: bold; }
            .count { color: #666; }
            .total { font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <h1>Work Today Redo Breakdown Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${dateFilters?.dateFrom ? `<p>Date Range: ${dateFilters.dateFrom} to ${dateFilters.dateTo}</p>` : '<p>All Time Data</p>'}
          <div>
            ${breakdown.map(item => {
              const label = partLabels[item.part as keyof typeof partLabels] || item.part;
              const percentage = totalRedos > 0 ? Math.round((item.count / totalRedos) * 100) : 0;
              return `
                <div class="breakdown-item">
                  <span class="part-name">${label}</span>
                  <span class="count">${item.count} (${percentage}%)</span>
                </div>
              `;
            }).join('')}
            <div class="total">
              <span>Total Redos: ${totalRedos}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground">Work Today Redo Breakdown</CardTitle>
          <div className="flex items-center space-x-2">
            {showPrintButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={printRedoBreakdown}
                className="border-border hover:bg-muted"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            )}
            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-card-foreground cursor-pointer" />
          </div>
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
