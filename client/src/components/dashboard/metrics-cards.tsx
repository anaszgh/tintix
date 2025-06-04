import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, RotateCcw, Clock, Users, TrendingUp, TrendingDown, Calendar } from "lucide-react";

export function MetricsCards() {
  const [timeFilter, setTimeFilter] = useState<"all" | "lastMonth">("all");
  
  // Calculate last month date range
  const getLastMonthRange = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      dateFrom: lastMonth.toISOString().split('T')[0],
      dateTo: lastMonthEnd.toISOString().split('T')[0]
    };
  };

  const queryParams = timeFilter === "lastMonth" ? getLastMonthRange() : null;
  
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

  // Calculate success rate properly
  const totalJobs = metrics?.totalVehicles || 0;
  const totalRedos = metrics?.totalRedos || 0;
  const successRate = totalJobs > 0 ? Math.round(((totalJobs - totalRedos) / totalJobs) * 100) : 100;

  const hasData = totalJobs > 0;
  const noDataMessage = timeFilter === "lastMonth" ? "No data for last month" : "No data available";

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
      {/* Filter Buttons */}
      <div className="flex gap-3">
        <Button
          variant={timeFilter === "all" ? "default" : "outline"}
          onClick={() => setTimeFilter("all")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Calendar className="h-4 w-4 mr-2" />
          All Time
        </Button>
        <Button
          variant={timeFilter === "lastMonth" ? "default" : "outline"}
          onClick={() => setTimeFilter("lastMonth")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Last Month
        </Button>
      </div>

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
