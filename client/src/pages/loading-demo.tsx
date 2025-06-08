import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { LoadingSpinner, PulseLoader } from "@/components/ui/loading-spinner";
import { LoadingScreen, PageLoader, CardLoader } from "@/components/ui/loading-screen";
import { MetricCardSkeleton, TableRowSkeleton, ChartSkeleton, InstallerCardSkeleton } from "@/components/ui/skeleton";
import { Play, Pause, RotateCcw } from "lucide-react";

export default function LoadingDemo() {
  const [showPageLoader, setShowPageLoader] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const toggleDemo = (demoName: string) => {
    setActiveDemo(activeDemo === demoName ? null : demoName);
  };

  const triggerPageLoader = () => {
    setShowPageLoader(true);
    setTimeout(() => setShowPageLoader(false), 3000);
  };

  if (showPageLoader) {
    return <PageLoader variant="installer" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Loading Animations Demo"
          description="Interactive showcase of installer-themed loading screens and transitions"
          actions={
            <Button onClick={triggerPageLoader} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Demo Page Loader
            </Button>
          }
        />
        
        <div className="p-8 overflow-y-auto h-full space-y-8">
          
          {/* Loading Spinners */}
          <Card>
            <CardHeader>
              <CardTitle>Loading Spinners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center space-y-3">
                  <h4 className="font-medium">Default</h4>
                  <LoadingSpinner size="lg" variant="default" />
                </div>
                <div className="text-center space-y-3">
                  <h4 className="font-medium">Installer</h4>
                  <LoadingSpinner size="lg" variant="installer" />
                </div>
                <div className="text-center space-y-3">
                  <h4 className="font-medium">Performance</h4>
                  <LoadingSpinner size="lg" variant="performance" />
                </div>
                <div className="text-center space-y-3">
                  <h4 className="font-medium">Vehicle</h4>
                  <LoadingSpinner size="lg" variant="vehicle" />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Size Variations</h4>
                <div className="flex items-center gap-4">
                  <LoadingSpinner size="sm" variant="installer" />
                  <LoadingSpinner size="md" variant="installer" />
                  <LoadingSpinner size="lg" variant="installer" />
                  <LoadingSpinner size="xl" variant="installer" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Pulse Loader</h4>
                <PulseLoader />
              </div>
            </CardContent>
          </Card>

          {/* Loading Screens */}
          <Card>
            <CardHeader>
              <CardTitle>Loading Screens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Installer Theme</h4>
                  <div className="border rounded-lg h-64">
                    <LoadingScreen variant="installer" size="md" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Performance Theme</h4>
                  <div className="border rounded-lg h-64">
                    <LoadingScreen variant="performance" size="md" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Analytics Theme</h4>
                  <div className="border rounded-lg h-64">
                    <LoadingScreen variant="analytics" size="md" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Vehicle Theme</h4>
                  <div className="border rounded-lg h-64">
                    <LoadingScreen variant="vehicle" size="md" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Loaders */}
          <Card>
            <CardHeader>
              <CardTitle>Card Loading States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Default Card Loader</h4>
                  <CardLoader variant="default" message="Loading data..." />
                </div>
                <div>
                  <h4 className="font-medium mb-3">Performance Card Loader</h4>
                  <CardLoader variant="performance" message="Calculating metrics..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skeleton Components */}
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Loading States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Metric Cards</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <MetricCardSkeleton key={i} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Installer Cards</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <InstallerCardSkeleton key={i} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Chart Skeleton</h4>
                <ChartSkeleton />
              </div>

              <div>
                <h4 className="font-medium mb-3">Table Rows</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-4 text-left">Name</th>
                        <th className="p-4 text-left">Performance</th>
                        <th className="p-4 text-left">Status</th>
                        <th className="p-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRowSkeleton key={i} columns={4} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Demos */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Loading Demos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => toggleDemo('metrics')}
                    variant={activeDemo === 'metrics' ? 'default' : 'outline'}
                    size="sm"
                  >
                    {activeDemo === 'metrics' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Metrics Loading
                  </Button>
                  <Button 
                    onClick={() => toggleDemo('performance')}
                    variant={activeDemo === 'performance' ? 'default' : 'outline'}
                    size="sm"
                  >
                    {activeDemo === 'performance' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Performance Analysis
                  </Button>
                  <Button 
                    onClick={() => toggleDemo('installers')}
                    variant={activeDemo === 'installers' ? 'default' : 'outline'}
                    size="sm"
                  >
                    {activeDemo === 'installers' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Installer Data
                  </Button>
                  <Button 
                    onClick={triggerPageLoader}
                    variant="secondary"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Full Page Demo
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">Metrics Card</h4>
                    {activeDemo === 'metrics' ? (
                      <MetricCardSkeleton />
                    ) : (
                      <div className="p-6 bg-card border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Vehicles</span>
                          <div className="w-4 h-4 bg-primary/20 rounded-full" />
                        </div>
                        <div className="text-2xl font-bold">156</div>
                        <div className="text-xs text-success">+12% from last month</div>
                      </div>
                    )}
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-3">Performance Analysis</h4>
                    {activeDemo === 'performance' ? (
                      <LoadingScreen variant="performance" size="sm" />
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-lg font-semibold">94.2%</div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                      </div>
                    )}
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-3">Installer Info</h4>
                    {activeDemo === 'installers' ? (
                      <InstallerCardSkeleton />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">
                            JD
                          </div>
                          <div>
                            <div className="font-medium">John Doe</div>
                            <div className="text-sm text-muted-foreground">Senior Installer</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Windows: 45</div>
                          <div>Efficiency: 98%</div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">When to Use Each Variant</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><strong>Installer:</strong> User management, installer profiles</li>
                    <li><strong>Performance:</strong> Analytics, metrics, reports</li>
                    <li><strong>Vehicle:</strong> Job entries, vehicle processing</li>
                    <li><strong>Analytics:</strong> Data analysis, calculations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Loading State Best Practices</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Use skeletons for content that maintains layout</li>
                    <li>Use spinners for quick operations ({"<"}3 seconds)</li>
                    <li>Use full page loaders for major transitions</li>
                    <li>Match animation theme to content context</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}