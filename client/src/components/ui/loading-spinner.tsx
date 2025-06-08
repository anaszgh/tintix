import { cn } from "@/lib/utils";
import { Car, Clock, BarChart3, Wrench } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "installer" | "performance" | "vehicle" | "analytics";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
  xl: "w-12 h-12"
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-6 h-6", 
  xl: "w-8 h-8"
};

export function LoadingSpinner({ size = "md", variant = "default", className }: LoadingSpinnerProps) {
  const getIcon = () => {
    switch (variant) {
      case "installer":
        return <Wrench className={cn(iconSizes[size], "text-primary")} />;
      case "performance":
        return <BarChart3 className={cn(iconSizes[size], "text-primary")} />;
      case "analytics":
        return <BarChart3 className={cn(iconSizes[size], "text-primary")} />;
      case "vehicle":
        return <Car className={cn(iconSizes[size], "text-primary")} />;
      default:
        return <Clock className={cn(iconSizes[size], "text-primary")} />;
    }
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Spinning ring */}
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin",
        sizeClasses[size]
      )} />
      
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        {getIcon()}
      </div>
    </div>
  );
}

export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-primary rounded-full animate-pulse"
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1s"
          }}
        />
      ))}
    </div>
  );
}