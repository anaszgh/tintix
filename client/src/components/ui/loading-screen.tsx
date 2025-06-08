import { cn } from "@/lib/utils";
import { Car, Clock, BarChart3, Wrench, Target, Gauge } from "lucide-react";
import { LoadingSpinner } from "./loading-spinner";

interface LoadingScreenProps {
  message?: string;
  variant?: "default" | "installer" | "performance" | "analytics" | "vehicle";
  size?: "sm" | "md" | "lg" | "fullscreen";
  className?: string;
}

const messages = {
  default: "Loading...",
  installer: "Preparing installer data...",
  performance: "Analyzing performance metrics...",
  analytics: "Calculating analytics...",
  vehicle: "Processing vehicle information..."
};

const backgrounds = {
  default: "bg-background/80",
  installer: "bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/80 dark:to-indigo-950/80",
  performance: "bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/80 dark:to-emerald-950/80",
  analytics: "bg-gradient-to-br from-purple-50/80 to-violet-50/80 dark:from-purple-950/80 dark:to-violet-950/80",
  vehicle: "bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/80 dark:to-amber-950/80"
};

export function LoadingScreen({ 
  message, 
  variant = "default", 
  size = "md",
  className 
}: LoadingScreenProps) {
  const displayMessage = message || messages[variant];

  const sizeClasses = {
    sm: "p-4",
    md: "p-8",
    lg: "p-12",
    fullscreen: "fixed inset-0 z-50"
  };

  const spinnerSizes = {
    sm: "lg" as const,
    md: "xl" as const, 
    lg: "xl" as const,
    fullscreen: "xl" as const
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center backdrop-blur-sm",
      backgrounds[variant],
      sizeClasses[size],
      size === "fullscreen" && "min-h-screen",
      className
    )}>
      {/* Animated container */}
      <div className="animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Logo/Brand area */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Car className="w-8 h-8 text-primary animate-pulse" />
            </div>
            {/* Floating particles */}
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-primary/20 rounded-full animate-bounce" 
                 style={{ animationDelay: "0.5s" }} />
            <div className="absolute -bottom-1 -left-2 w-2 h-2 bg-primary/30 rounded-full animate-bounce" 
                 style={{ animationDelay: "1s" }} />
          </div>
        </div>

        {/* Main spinner */}
        <div className="flex justify-center mb-4">
          <LoadingSpinner 
            size={spinnerSizes[size]} 
            variant={variant === "default" ? "default" : variant}
          />
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground animate-pulse">
            {displayMessage}
          </p>
          
          {/* Progress indicators */}
          <div className="flex justify-center space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: "1.2s"
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Background animation elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {variant === "installer" && (
          <>
            <Wrench className="absolute top-1/4 left-1/4 w-4 h-4 text-primary/10 animate-bounce" 
                   style={{ animationDelay: "0.5s" }} />
            <Target className="absolute top-3/4 right-1/4 w-3 h-3 text-primary/10 animate-bounce" 
                    style={{ animationDelay: "1.5s" }} />
          </>
        )}
        
        {variant === "performance" && (
          <>
            <BarChart3 className="absolute top-1/3 right-1/3 w-4 h-4 text-primary/10 animate-bounce" 
                       style={{ animationDelay: "0.8s" }} />
            <Gauge className="absolute bottom-1/3 left-1/3 w-3 h-3 text-primary/10 animate-bounce" 
                   style={{ animationDelay: "1.2s" }} />
          </>
        )}
        
        {variant === "analytics" && (
          <>
            <BarChart3 className="absolute top-1/4 right-1/4 w-4 h-4 text-primary/10 animate-bounce" 
                       style={{ animationDelay: "0.3s" }} />
            <Clock className="absolute bottom-1/4 left-1/4 w-3 h-3 text-primary/10 animate-bounce" 
                   style={{ animationDelay: "1s" }} />
          </>
        )}
      </div>
    </div>
  );
}

export function PageLoader({ variant = "default" }: { variant?: LoadingScreenProps["variant"] }) {
  return <LoadingScreen variant={variant} size="fullscreen" />;
}

export function CardLoader({ variant = "default", message }: { 
  variant?: LoadingScreenProps["variant"];
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center p-8 bg-card rounded-lg border">
      <LoadingScreen variant={variant} size="sm" message={message} />
    </div>
  );
}