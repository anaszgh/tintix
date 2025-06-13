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
          <title>Redo Breakdown Report - Material Consumption & Time Analysis</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            h1 { color: #333; margin-bottom: 20px; }
            .breakdown-item { margin: 15px 0; padding: 12px; border-bottom: 1px solid #eee; background: #f9f9f9; }
            .part-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; }
            .part-name { color: #333; }
            .count { color: #666; }
            .details { margin-left: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 14px; color: #555; }
            .detail-item { }
            .detail-label { font-weight: bold; }
            .totals { margin-top: 25px; padding: 15px; background: #e8e8e8; border-radius: 5px; }
            .totals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; }
            .total-item { text-align: center; }
            .total-value { font-size: 18px; font-weight: bold; color: #333; }
            .total-label { font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Redo Breakdown Report - Material Consumption & Time Analysis</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${dateFilters?.dateFrom ? `<p>Date Range: ${dateFilters.dateFrom} to ${dateFilters.dateTo}</p>` : '<p>All Time Data</p>'}
          
          <div>
            ${breakdown.map(item => {
              const label = partLabels[item.part as keyof typeof partLabels] || item.part;
              const percentage = totalRedos > 0 ? Math.round((item.count / totalRedos) * 100) : 0;
              return `
                <div class="breakdown-item">
                  <div class="part-header">
                    <span class="part-name">${label}</span>
                    <span class="count">${item.count} redos (${percentage}%)</span>
                  </div>
                  <div class="details">
                    <div class="detail-item">
                      <span class="detail-label">Material Used:</span><br>
                      ${item.totalSqft?.toFixed(1) || '0.0'} sq ft
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Material Cost:</span><br>
                      $${item.totalCost?.toFixed(2) || '0.00'}
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Avg Time per Redo:</span><br>
                      ${item.avgTimeMinutes || 0} minutes
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
            
            <div class="totals">
              <h3 style="margin-top: 0; margin-bottom: 15px;">Summary Totals</h3>
              <div class="totals-grid">
                <div class="total-item">
                  <div class="total-value">${totalRedos}</div>
                  <div class="total-label">Total Redos</div>
                </div>
                <div class="total-item">
                  <div class="total-value">${breakdown.reduce((sum, item) => sum + (item.totalSqft || 0), 0).toFixed(1)}</div>
                  <div class="total-label">Total Sq Ft</div>
                </div>
                <div class="total-item">
                  <div class="total-value">$${breakdown.reduce((sum, item) => sum + (item.totalCost || 0), 0).toFixed(2)}</div>
                  <div class="total-label">Total Cost</div>
                </div>
                <div class="total-item">
                  <div class="total-value">${breakdown.reduce((sum, item) => sum + (item.avgTimeMinutes || 0) * item.count, 0)}</div>
                  <div class="total-label">Total Time (min)</div>
                </div>
              </div>
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
              <div key={item.part} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 ${colorClass} rounded-full`}></div>
                    <span className="text-card-foreground font-medium">{label}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className={`${colorClass} h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-card-foreground w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
                
                {/* Material consumption and time tracking details */}
                <div className="ml-6 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Material:</span> {item.totalSqft?.toFixed(1) || '0.0'} sq ft
                  </div>
                  <div>
                    <span className="font-medium">Cost:</span> ${item.totalCost?.toFixed(2) || '0.00'}
                  </div>
                  <div>
                    <span className="font-medium">Avg Time:</span> {item.avgTimeMinutes || 0} min
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
