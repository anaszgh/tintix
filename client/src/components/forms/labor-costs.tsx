import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, User as UserIcon, Package, Receipt, Printer, TrendingUp } from "lucide-react";
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

  const handlePrint = () => {
    const printContent = document.getElementById('job-cost-summary');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Job Cost Summary - ${jobEntry.jobNumber || `JOB-${jobEntry.id}`}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #000; background: #fff; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .section { margin-bottom: 25px; }
                .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                .cost-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .cost-item:last-child { border-bottom: none; }
                .installer-name { font-weight: 600; }
                .cost-details { font-size: 12px; color: #666; margin-left: 20px; }
                .total-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .grand-total { font-size: 24px; font-weight: bold; text-align: center; padding: 20px; background: #e3f2fd; border-radius: 8px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Tintix Performance Tracker</h1>
                <h2>Job Cost Summary</h2>
                <p><strong>Job:</strong> ${jobEntry.jobNumber || `JOB-${jobEntry.id}`} | <strong>Date:</strong> ${new Date(jobEntry.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })} | <strong>Vehicle:</strong> ${jobEntry.vehicleYear} ${jobEntry.vehicleMake} ${jobEntry.vehicleModel}</p>
              </div>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xl font-semibold">Job Cost Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-muted-foreground">Loading cost information...</span>
          </div>
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
    <div className="space-y-6">
      {/* Header with Print Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Job Cost Summary
            </h2>
            <p className="text-sm text-muted-foreground">Complete financial breakdown</p>
          </div>
        </div>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800"
        >
          <Printer className="h-4 w-4" />
          Print Summary
        </Button>
      </div>

      <div id="job-cost-summary" className="space-y-6">
        {/* Labor Costs Section */}
        <Card className="border-border/50 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-border/50">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <UserIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xl font-semibold">Labor Costs</span>
              {laborCosts.length > 0 && (
                <Badge variant="secondary" className="ml-auto font-mono">
                  {laborCosts.length} installer{laborCosts.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {laborCosts.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No labor costs calculated for this job</p>
              </div>
            ) : (
              <div className="space-y-4">
                {laborCosts.map((cost, index) => (
                  <div key={cost.installer.id} className="group">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-lg">
                          <UserIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {cost.installer.firstName} {cost.installer.lastName}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                      </div>
                      <Badge variant="outline" className="font-mono text-base px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                        ${cost.laborCost.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-300">Total Labor Cost</div>
                        <div className="text-sm text-emerald-600 dark:text-emerald-400">
                          {formatTime(totalTimeMinutes)} total time
                        </div>
                      </div>
                    </div>
                    <Badge className="font-mono text-lg px-4 py-2 bg-emerald-600 dark:bg-emerald-700">
                      ${totalLaborCost.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material Costs Section */}
        <Card className="border-border/50 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-b border-border/50">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xl font-semibold">Material Costs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/50 dark:to-amber-900/50 rounded-lg">
                  <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Film Cost</div>
                  <div className="text-sm text-muted-foreground">
                    {jobEntry.totalSqft?.toFixed(1)} sq ft coverage
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-base px-3 py-1 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                ${filmCost.toFixed(2)}
              </Badge>
            </div>
            
            {redoMaterialCost > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                    <Package className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700 dark:text-red-300">Redo Material Cost</div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {jobEntry.redoEntries.reduce((sum, redo) => sum + Number(redo.sqft || 0), 0).toFixed(1)} sq ft additional
                    </div>
                  </div>
                </div>
                <Badge variant="destructive" className="font-mono text-base px-3 py-1">
                  ${redoMaterialCost.toFixed(2)}
                </Badge>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div className="font-semibold text-orange-700 dark:text-orange-300">Total Materials</div>
                </div>
                <Badge className="font-mono text-lg px-4 py-2 bg-orange-600 dark:bg-orange-700">
                  ${totalMaterialCost.toFixed(2)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Job Cost Section */}
        <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-xl overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Receipt className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold">Total Job Cost</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">Labor Cost</span>
                  </div>
                  <span className="font-mono text-lg font-semibold">${totalLaborCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Material Cost</span>
                  </div>
                  <span className="font-mono text-lg font-semibold">${totalMaterialCost.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-center pt-4 border-t-2 border-blue-200 dark:border-blue-800">
                <div className="inline-flex items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg">
                  <div className="text-left">
                    <div className="text-sm opacity-90">Net Total</div>
                    <div className="font-mono text-4xl font-bold">
                      ${totalJobCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-white/20 rounded-lg">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}