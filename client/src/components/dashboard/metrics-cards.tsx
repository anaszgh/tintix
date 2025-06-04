import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, RotateCcw, Clock, Users, TrendingUp, TrendingDown, Calendar, Filter, Search, X } from "lucide-react";

export function MetricsCards() {
  const [timeFilter, setTimeFilter] = useState<"all" | "lastMonth" | "lastWeek" | "today" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [appliedCustomRange, setAppliedCustomRange] = useState<{dateFrom: string, dateTo: string} | null>(null);
  
  // Calculate date ranges for different filters
  const getDateRange = () => {
    const now = new Date();
    
    switch (timeFilter) {
      case "today":
        const today = now.toISOString().split('T')[0];
        return { dateFrom: today, dateTo: today };
        
      case "lastWeek":
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          dateFrom: lastWeek.toISOString().split('T')[0],
          dateTo: now.toISOString().split('T')[0]
        };
        
      case "lastMonth":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          dateFrom: lastMonth.toISOString().split('T')[0],
          dateTo: lastMonthEnd.toISOString().split('T')[0]
        };
        
      case "custom":
        if (appliedCustomRange) {
          return appliedCustomRange;
        }
        return null;
        
      default:
        return null;
    }
  };

  const queryParams = getDateRange();

  // Apply custom date range
  const applyCustomRange = () => {
    if (customDateFrom && customDateTo) {
      setAppliedCustomRange({ dateFrom: customDateFrom, dateTo: customDateTo });
    }
  };

  // Clear custom date range
  const clearCustomRange = () => {
    setCustomDateFrom("");
    setCustomDateTo("");
    setAppliedCustomRange(null);
    setTimeFilter("all");
  };
  
  const { data: metrics } = useQuery({
    queryKey: ["/api/analytics/metrics", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryParams?.dateFrom) params.set('dateFrom', queryParams.dateFrom);
      if (queryParams?.dateTo) params.set('dateTo', queryParams.dateTo);
      
      const response = await fetch(`/api/analytics/metrics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    }
  });

  // Calculate success rate properly - windows done correctly vs total windows
  // Each vehicle has 7 windows (windshield, back windshield, 4 rollups, quarter)
  const totalJobs = metrics?.totalVehicles || 0;
  const totalRedos = metrics?.totalRedos || 0;
  const totalWindows = totalJobs * 7; // 7 windows per vehicle
  const successfulWindows = totalWindows - totalRedos;
  const successRate = totalWindows > 0 ? Math.round((successfulWindows / totalWindows) * 100) : 100;

  const hasData = totalJobs > 0;
  const getNoDataMessage = () => {
    switch (timeFilter) {
      case "today": return "No data for today";
      case "lastWeek": return "No data for last week";
      case "lastMonth": return "No data for last month";
      case "custom": return "No data for selected period";
      default: return "No data available";
    }
  };
  const noDataMessage = getNoDataMessage();

  const cards = [
    {
      title: "Total Vehicles Processed",
      value: hasData ? totalJobs : noDataMessage,
      icon: Car,
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
      trend: hasData ? `${successRate}% Success Rate` : "",
      trendType: "neutral" as const,
    },
    {
      title: "Total Redos",
      value: hasData ? totalRedos : noDataMessage,
      icon: RotateCcw,
      iconBg: "bg-warning/20",
      iconColor: "text-warning",
      trend: hasData ? `${totalRedos > 0 ? 'Needs Attention' : 'Perfect'}` : "",
      trendType: totalRedos > 0 ? "down" as const : "up" as const,
    },
    {
      title: "Avg Time Variance",
      value: hasData ? `${metrics?.avgTimeVariance || 0} min` : noDataMessage,
      icon: Clock,
      iconBg: "bg-success/20",
      iconColor: "text-success",
      trend: hasData ? (metrics?.avgTimeVariance && metrics.avgTimeVariance > 0 ? "Over Target" : "On Time") : "",
      trendType: "neutral" as const,
    },
    {
      title: "Active Installers",
      value: hasData ? (metrics?.activeInstallers || 0) : noDataMessage,
      icon: Users,
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary",
      trend: hasData ? "Active" : "",
      trendType: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Label className="text-lg font-semibold text-card-foreground">Date Range Filter</Label>
            </div>
            
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={timeFilter === "all" ? "default" : "outline"}
                onClick={() => setTimeFilter("all")}
                size="sm"
              >
                All Time
              </Button>
              <Button
                variant={timeFilter === "today" ? "default" : "outline"}
                onClick={() => setTimeFilter("today")}
                size="sm"
              >
                Today
              </Button>
              <Button
                variant={timeFilter === "lastWeek" ? "default" : "outline"}
                onClick={() => setTimeFilter("lastWeek")}
                size="sm"
              >
                Last 7 Days
              </Button>
              <Button
                variant={timeFilter === "lastMonth" ? "default" : "outline"}
                onClick={() => setTimeFilter("lastMonth")}
                size="sm"
              >
                Last Month
              </Button>
              <Button
                variant={timeFilter === "custom" ? "default" : "outline"}
                onClick={() => setTimeFilter("custom")}
                size="sm"
              >
                Custom Range
              </Button>
            </div>

            {/* Custom Date Range Inputs */}
            {timeFilter === "custom" && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFrom" className="text-sm font-medium text-muted-foreground mb-2 block">
                      From Date
                    </Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo" className="text-sm font-medium text-muted-foreground mb-2 block">
                      To Date
                    </Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                
                {/* Apply and Clear Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={applyCustomRange}
                    disabled={!customDateFrom || !customDateTo}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Apply Filter
                  </Button>
                  <Button
                    onClick={clearCustomRange}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
                
                {/* Show Applied Range */}
                {appliedCustomRange && (
                  <div className="text-sm text-muted-foreground bg-background p-2 rounded border">
                    Applied Range: {appliedCustomRange.dateFrom} to {appliedCustomRange.dateTo}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                card.trendType === "up" 
                  ? "text-success bg-success/20" 
                  : card.trendType === "down"
                  ? "text-error bg-error/20"
                  : "text-muted-foreground bg-muted"
              }`}>
                {card.trendType !== "neutral" && (
                  card.trendType === "up" ? (
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 inline mr-1" />
                  )
                )}
                {card.trend}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-1">
              {card.value}
            </h3>
            <p className="text-muted-foreground text-sm">{card.title}</p>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}
