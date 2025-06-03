import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Car, RotateCcw, Clock, Users, TrendingUp, TrendingDown } from "lucide-react";

export function MetricsCards() {
  const { data: metrics } = useQuery({
    queryKey: ["/api/analytics/metrics"],
  });

  const cards = [
    {
      title: "Total Vehicles",
      value: metrics?.totalVehicles || 0,
      icon: Car,
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
      trend: "+12%",
      trendType: "up" as const,
    },
    {
      title: "Total Redos",
      value: metrics?.totalRedos || 0,
      icon: RotateCcw,
      iconBg: "bg-warning/20",
      iconColor: "text-warning",
      trend: "+5%",
      trendType: "down" as const,
    },
    {
      title: "Avg Time Variance",
      value: `${metrics?.avgTimeVariance || 0} min`,
      icon: Clock,
      iconBg: "bg-success/20",
      iconColor: "text-success",
      trend: "-3%",
      trendType: "up" as const,
    },
    {
      title: "Active Installers",
      value: metrics?.activeInstallers || 0,
      icon: Users,
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary",
      trend: "Active",
      trendType: "neutral" as const,
    },
  ];

  return (
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
  );
}
