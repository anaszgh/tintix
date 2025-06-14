import { useState } from "react";
import { 
  useFloating, 
  autoUpdate, 
  offset, 
  flip, 
  shift, 
  useHover, 
  useFocus, 
  useDismiss, 
  useRole, 
  useInteractions,
  FloatingPortal
} from "@floating-ui/react";
import { HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  trigger?: "hover" | "click" | "focus";
  placement?: "top" | "bottom" | "left" | "right";
  variant?: "default" | "info" | "help";
  className?: string;
  showIcon?: boolean;
}

export function Tooltip({
  content,
  children,
  trigger = "hover",
  placement = "top",
  variant = "default",
  className,
  showIcon = true,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift(),
    ],
  });

  const hover = useHover(context, { enabled: trigger === "hover" });
  const focus = useFocus(context, { enabled: trigger === "focus" });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const handleClick = () => {
    if (trigger === "click") {
      setIsOpen(!isOpen);
    }
  };

  const getIcon = () => {
    switch (variant) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "help":
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const referenceElement = children || (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1 hover:bg-muted transition-colors",
        className
      )}
      onClick={handleClick}
    >
      {showIcon && getIcon()}
    </button>
  );

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={handleClick}
        className="inline-flex items-center"
      >
        {referenceElement}
      </div>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={cn(
              "z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              variant === "info" && "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
              variant === "help" && "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100"
            )}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

// Contextual help tooltips for specific features
export const ContextualTooltips = {
  jobEntry: {
    timeVariance: "Time variance shows how much faster (negative) or slower (positive) the job took compared to the estimated time.",
    redoTracking: "Track any rework needed due to defects or customer requests. This affects performance metrics.",
    windowAssignment: "Assign specific windows to installers to track individual performance per window type.",
    filmSelection: "Choose the film type used for this job. This affects cost calculations and inventory tracking.",
    dimensions: "Record the exact dimensions of windows for accurate material usage and cost calculations.",
  },
  performance: {
    successRate: "Success rate is calculated as (Total Jobs - Redo Count) / Total Jobs × 100%",
    timeEfficiency: "Shows average time per window compared to standard estimates.",
    materialUsage: "Tracks film consumption and waste to optimize inventory management.",
  },
  roles: {
    manager: "Full access to all features including financial data, reports, and user management.",
    installer: "Access to personal performance data and job tracking without financial information.",
    dataEntry: "Can create and edit job entries but cannot view cost information or reports.",
  },
};