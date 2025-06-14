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
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins}m`;
    };

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Job Cost Summary - ${jobEntry.jobNumber || `JOB-${jobEntry.id}`}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              
              body { 
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
                line-height: 1.6; 
                color: #1f2937; 
                background: #fff;
                padding: 40px;
              }
              
              .document-header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 3px solid #2563eb;
                position: relative;
              }
              
              .company-name {
                font-size: 32px;
                font-weight: 700;
                color: #1e40af;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
              }
              
              .document-title {
                font-size: 24px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 20px;
              }
              
              .job-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
              }
              
              .job-info-item {
                text-align: center;
              }
              
              .job-info-label {
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }
              
              .job-info-value {
                font-size: 16px;
                font-weight: 700;
                color: #111827;
              }
              
              .section {
                margin-bottom: 35px;
                break-inside: avoid;
              }
              
              .section-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                padding: 15px 20px;
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border-radius: 12px;
                border-left: 4px solid #0ea5e9;
              }
              
              .section-title {
                font-size: 20px;
                font-weight: 700;
                color: #0c4a6e;
              }
              
              .section-badge {
                background: #0ea5e9;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
              }
              
              .labor-section .section-header {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border-left-color: #16a34a;
              }
              
              .labor-section .section-title { color: #14532d; }
              .labor-section .section-badge { background: #16a34a; }
              
              .material-section .section-header {
                background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
                border-left-color: #ea580c;
              }
              
              .material-section .section-title { color: #9a3412; }
              .material-section .section-badge { background: #ea580c; }
              
              .cost-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                margin-bottom: 12px;
                background: #fafafa;
                border-radius: 10px;
                border: 1px solid #e5e7eb;
                position: relative;
              }
              
              .cost-item:hover { background: #f5f5f5; }
              
              .cost-item-left {
                display: flex;
                align-items: center;
                gap: 15px;
              }
              
              .cost-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 16px;
              }
              
              .labor-icon { background: #dcfce7; color: #16a34a; }
              .material-icon { background: #fed7aa; color: #ea580c; }
              .redo-icon { background: #fecaca; color: #dc2626; }
              
              .cost-details h4 {
                font-size: 16px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 4px;
              }
              
              .cost-details p {
                font-size: 13px;
                color: #6b7280;
                margin: 0;
              }
              
              .cost-amount {
                font-size: 18px;
                font-weight: 700;
                color: #111827;
                font-family: 'SF Mono', Monaco, monospace;
              }
              
              .redo-item {
                background: #fef2f2;
                border-color: #fecaca;
              }
              
              .total-section {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border: 2px solid #3b82f6;
                border-radius: 16px;
                padding: 30px;
                margin-top: 30px;
                text-align: center;
              }
              
              .total-breakdown {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 25px;
              }
              
              .breakdown-item {
                background: white;
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                text-align: center;
              }
              
              .breakdown-label {
                font-size: 14px;
                color: #6b7280;
                font-weight: 600;
                margin-bottom: 8px;
              }
              
              .breakdown-amount {
                font-size: 20px;
                font-weight: 700;
                color: #111827;
                font-family: 'SF Mono', Monaco, monospace;
              }
              
              .grand-total {
                background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%);
                color: white;
                padding: 25px 40px;
                border-radius: 16px;
                display: inline-block;
                box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
              }
              
              .grand-total-label {
                font-size: 16px;
                opacity: 0.9;
                margin-bottom: 8px;
              }
              
              .grand-total-amount {
                font-size: 36px;
                font-weight: 800;
                font-family: 'SF Mono', Monaco, monospace;
                letter-spacing: -1px;
              }
              
              .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
              }
              
              @media print {
                body { padding: 20px; }
                .section { page-break-inside: avoid; }
                .cost-item { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="document-header">
              <div class="company-name">Tintix Performance Tracker</div>
              <div class="document-title">Professional Job Cost Summary</div>
              <div class="job-info">
                <div class="job-info-item">
                  <div class="job-info-label">Job Number</div>
                  <div class="job-info-value">${jobEntry.jobNumber || `JOB-${jobEntry.id}`}</div>
                </div>
                <div class="job-info-item">
                  <div class="job-info-label">Date</div>
                  <div class="job-info-value">${new Date(jobEntry.date).toLocaleDateString('en-US', { 
                    timeZone: 'America/Los_Angeles',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>
                </div>
                <div class="job-info-item">
                  <div class="job-info-label">Vehicle</div>
                  <div class="job-info-value">${jobEntry.vehicleYear} ${jobEntry.vehicleMake} ${jobEntry.vehicleModel}</div>
                </div>
                <div class="job-info-item">
                  <div class="job-info-label">Total Windows</div>
                  <div class="job-info-value">${jobEntry.totalWindows || 7}</div>
                </div>
              </div>
            </div>

            ${laborCosts.length > 0 ? `
            <div class="section labor-section">
              <div class="section-header">
                <div class="section-title">Labor Costs</div>
                <div class="section-badge">${laborCosts.length} installer${laborCosts.length !== 1 ? 's' : ''}</div>
              </div>
              
              ${laborCosts.map(cost => `
                <div class="cost-item">
                  <div class="cost-item-left">
                    <div class="cost-icon labor-icon">👤</div>
                    <div class="cost-details">
                      <h4>${cost.installer.firstName} ${cost.installer.lastName}</h4>
                      <p>${formatTime(cost.timeMinutes)} at $${cost.hourlyRate.toFixed(2)}/hr</p>
                    </div>
                  </div>
                  <div class="cost-amount">$${cost.laborCost.toFixed(2)}</div>
                </div>
              `).join('')}
              
              <div class="cost-item" style="background: #dcfce7; border-color: #16a34a; margin-top: 20px;">
                <div class="cost-item-left">
                  <div class="cost-icon labor-icon">📊</div>
                  <div class="cost-details">
                    <h4>Total Labor Cost</h4>
                    <p>${formatTime(totalTimeMinutes)} total time</p>
                  </div>
                </div>
                <div class="cost-amount" style="color: #16a34a; font-size: 20px;">$${totalLaborCost.toFixed(2)}</div>
              </div>
            </div>
            ` : ''}

            <div class="section material-section">
              <div class="section-header">
                <div class="section-title">Material Costs</div>
              </div>
              
              <div class="cost-item">
                <div class="cost-item-left">
                  <div class="cost-icon material-icon">📦</div>
                  <div class="cost-details">
                    <h4>Film Cost</h4>
                    <p>${jobEntry.totalSqft?.toFixed(1) || '0.0'} sq ft coverage</p>
                  </div>
                </div>
                <div class="cost-amount">$${filmCost.toFixed(2)}</div>
              </div>

              ${redoMaterialCost > 0 ? `
              <div class="cost-item redo-item">
                <div class="cost-item-left">
                  <div class="cost-icon redo-icon">🔄</div>
                  <div class="cost-details">
                    <h4>Redo Material Cost</h4>
                    <p>${jobEntry.redoEntries.reduce((sum, redo) => sum + Number(redo.sqft || 0), 0).toFixed(1)} sq ft additional</p>
                  </div>
                </div>
                <div class="cost-amount" style="color: #dc2626;">$${redoMaterialCost.toFixed(2)}</div>
              </div>
              ` : ''}
              
              <div class="cost-item" style="background: #fed7aa; border-color: #ea580c; margin-top: 20px;">
                <div class="cost-item-left">
                  <div class="cost-icon material-icon">📊</div>
                  <div class="cost-details">
                    <h4>Total Material Cost</h4>
                    <p>All materials included</p>
                  </div>
                </div>
                <div class="cost-amount" style="color: #ea580c; font-size: 20px;">$${totalMaterialCost.toFixed(2)}</div>
              </div>
            </div>

            <div class="total-section">
              <div class="total-breakdown">
                <div class="breakdown-item">
                  <div class="breakdown-label">Labor Cost</div>
                  <div class="breakdown-amount">$${totalLaborCost.toFixed(2)}</div>
                </div>
                <div class="breakdown-item">
                  <div class="breakdown-label">Material Cost</div>
                  <div class="breakdown-amount">$${totalMaterialCost.toFixed(2)}</div>
                </div>
              </div>
              
              <div class="grand-total">
                <div class="grand-total-label">Net Total</div>
                <div class="grand-total-amount">$${totalJobCost.toFixed(2)}</div>
              </div>
            </div>

            <div class="footer">
              <p>Generated on ${new Date().toLocaleDateString('en-US', { 
                timeZone: 'America/Los_Angeles',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} PST</p>
              <p>Tintix Performance Tracker - Professional Window Tinting Services</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
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
        <Card className="border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <UserIcon className="h-5 w-5 text-green-700 dark:text-green-300" />
              </div>
              <span className="text-xl font-semibold text-gray-800 dark:text-gray-100">Labor Costs</span>
              {laborCosts.length > 0 && (
                <Badge variant="secondary" className="ml-auto font-mono bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
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
                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800 rounded-lg">
                          <UserIcon className="h-4 w-4 text-green-700 dark:text-green-300" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {cost.installer.firstName} {cost.installer.lastName}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                      <Badge variant="outline" className="font-mono text-base px-3 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                        ${cost.laborCost.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <div className="font-semibold text-green-700 dark:text-green-300">Total Labor Cost</div>
                        <div className="text-sm text-green-600 dark:text-green-400">
                          {formatTime(totalTimeMinutes)} total time
                        </div>
                      </div>
                    </div>
                    <Badge className="font-mono text-lg px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white">
                      ${totalLaborCost.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material Costs Section */}
        <Card className="border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                <Package className="h-5 w-5 text-orange-700 dark:text-orange-300" />
              </div>
              <span className="text-xl font-semibold text-gray-800 dark:text-gray-100">Material Costs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-800 dark:to-amber-800 rounded-lg">
                  <Package className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Film Cost</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {jobEntry.totalSqft?.toFixed(1)} sq ft coverage
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-base px-3 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                ${filmCost.toFixed(2)}
              </Badge>
            </div>
            
            {redoMaterialCost > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                    <Package className="h-4 w-4 text-red-700 dark:text-red-300" />
                  </div>
                  <div>
                    <div className="font-semibold text-red-800 dark:text-red-200">Redo Material Cost</div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      {jobEntry.redoEntries.reduce((sum, redo) => sum + Number(redo.sqft || 0), 0).toFixed(1)} sq ft additional
                    </div>
                  </div>
                </div>
                <Badge className="font-mono text-base px-3 py-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white">
                  ${redoMaterialCost.toFixed(2)}
                </Badge>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div className="font-semibold text-orange-700 dark:text-orange-300">Total Materials</div>
                </div>
                <Badge className="font-mono text-lg px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white">
                  ${totalMaterialCost.toFixed(2)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Job Cost Section */}
        <Card className="border-2 border-blue-300 dark:border-blue-600 shadow-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
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
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-gray-800 dark:text-gray-100">Labor Cost</span>
                  </div>
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">${totalLaborCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-gray-800 dark:text-gray-100">Material Cost</span>
                  </div>
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">${totalMaterialCost.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-center pt-4 border-t-2 border-blue-200 dark:border-blue-700">
                <div className="inline-flex items-center gap-6 p-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-xl">
                  <div className="text-left">
                    <div className="text-base opacity-90 mb-1">Net Total</div>
                    <div className="font-mono text-5xl font-bold">
                      ${totalJobCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-white/20 rounded-xl">
                    <TrendingUp className="h-10 w-10" />
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