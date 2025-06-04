import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Minus } from "lucide-react";
import type { User } from "@shared/schema";

interface WindowAssignment {
  windowId: string;
  installerId: string | null;
  windowName: string;
}

interface SimpleWindowSelectorProps {
  installers: User[];
  onWindowChange: (totalWindows: number, assignments: WindowAssignment[]) => void;
}

const DEFAULT_WINDOWS: WindowAssignment[] = [
  { windowId: "windshield", installerId: null, windowName: "Windshield" },
  { windowId: "back_windshield", installerId: null, windowName: "Back Windshield" },
  { windowId: "front_left", installerId: null, windowName: "Front Left" },
  { windowId: "front_right", installerId: null, windowName: "Front Right" },
  { windowId: "rear_left", installerId: null, windowName: "Rear Left" },
  { windowId: "rear_right", installerId: null, windowName: "Rear Right" },
  { windowId: "quarter", installerId: null, windowName: "Quarter Windows" },
];

export function SimpleWindowSelector({ installers, onWindowChange }: SimpleWindowSelectorProps) {
  const [windows, setWindows] = useState<WindowAssignment[]>(DEFAULT_WINDOWS);

  const handleWindowAssignment = (windowId: string, installerId: string) => {
    const updatedWindows = windows.map(window => 
      window.windowId === windowId 
        ? { ...window, installerId: installerId === "none" ? null : installerId }
        : window
    );
    setWindows(updatedWindows);
    
    const assignedWindows = updatedWindows.filter(w => w.installerId);
    onWindowChange(assignedWindows.length, assignedWindows);
  };

  const addCustomWindow = () => {
    const newWindow: WindowAssignment = {
      windowId: `custom_${Date.now()}`,
      installerId: null,
      windowName: `Custom Window ${windows.length - 6}`
    };
    const updatedWindows = [...windows, newWindow];
    setWindows(updatedWindows);
  };

  const removeCustomWindow = (windowId: string) => {
    const updatedWindows = windows.filter(w => w.windowId !== windowId);
    setWindows(updatedWindows);
    
    const assignedWindows = updatedWindows.filter(w => w.installerId);
    onWindowChange(assignedWindows.length, assignedWindows);
  };

  const assignedCount = windows.filter(w => w.installerId).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Car className="h-5 w-5" />
          Window Installation Assignment
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {assignedCount} of {windows.length} windows assigned
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Window Assignment Grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {windows.map((window) => (
            <div key={window.windowId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <label className="text-sm font-medium block mb-1">
                  {window.windowName}
                </label>
                <Select 
                  value={window.installerId || "none"} 
                  onValueChange={(value) => handleWindowAssignment(window.windowId, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select installer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No installer</SelectItem>
                    {installers.map((installer) => (
                      <SelectItem key={installer.id} value={installer.id}>
                        {installer.firstName} {installer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {window.windowId.startsWith('custom_') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCustomWindow(window.windowId)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={addCustomWindow}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Window
          </Button>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total assigned: {assignedCount} windows
          </div>
        </div>
      </CardContent>
    </Card>
  );
}