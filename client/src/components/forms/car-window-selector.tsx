import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, X } from "lucide-react";
import type { User } from "@shared/schema";

interface WindowAssignment {
  windowId: string;
  installerId: string | null;
  windowName: string;
  position: { x: number; y: number };
}

interface CarWindowSelectorProps {
  installers: User[];
  onWindowAssignmentsChange: (assignments: WindowAssignment[]) => void;
  initialAssignments?: WindowAssignment[];
}

const DEFAULT_WINDOWS: WindowAssignment[] = [
  { windowId: "windshield", installerId: null, windowName: "Windshield", position: { x: 50, y: 15 } },
  { windowId: "back_windshield", installerId: null, windowName: "Back Windshield", position: { x: 50, y: 85 } },
  { windowId: "front_left", installerId: null, windowName: "Front Left", position: { x: 15, y: 35 } },
  { windowId: "front_right", installerId: null, windowName: "Front Right", position: { x: 85, y: 35 } },
  { windowId: "rear_left", installerId: null, windowName: "Rear Left", position: { x: 15, y: 65 } },
  { windowId: "rear_right", installerId: null, windowName: "Rear Right", position: { x: 85, y: 65 } },
  { windowId: "quarter_left", installerId: null, windowName: "Quarter Left", position: { x: 25, y: 75 } },
];

export function CarWindowSelector({ installers, onWindowAssignmentsChange, initialAssignments }: CarWindowSelectorProps) {
  const [windowAssignments, setWindowAssignments] = useState<WindowAssignment[]>(
    initialAssignments || DEFAULT_WINDOWS
  );

  const handleWindowAssignment = (windowId: string, installerId: string) => {
    const updatedAssignments = windowAssignments.map(window => 
      window.windowId === windowId 
        ? { ...window, installerId: installerId === "none" ? null : installerId }
        : window
    );
    setWindowAssignments(updatedAssignments);
    
    const assignedWindows = updatedAssignments.filter(w => w.installerId);
    onWindowAssignmentsChange(assignedWindows, assignedWindows.length);
  };

  const addWindow = () => {
    const newWindow: WindowAssignment = {
      windowId: `custom_${Date.now()}`,
      installerId: null,
      windowName: `Custom Window ${windowAssignments.length + 1}`
    };
    const updatedAssignments = [...windowAssignments, newWindow];
    setWindowAssignments(updatedAssignments);
  };

  const removeWindow = (windowId: string) => {
    const updatedAssignments = windowAssignments.filter(w => w.windowId !== windowId);
    setWindowAssignments(updatedAssignments);
    
    const assignedWindows = updatedAssignments.filter(w => w.installerId);
    onWindowAssignmentsChange(assignedWindows, assignedWindows.length);
  };

  const getInstallerName = (installerId: string | null) => {
    if (!installerId) return null;
    const installer = installers.find(i => i.id === installerId);
    return installer ? `${installer.firstName} ${installer.lastName}` : "Unknown";
  };

  const assignedCount = windowAssignments.filter(w => w.installerId).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Window Installation Assignment
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {assignedCount} of {windowAssignments.length} windows assigned
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Car Visual Layout */}
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-8">
          <div className="relative mx-auto w-64 h-40 border-2 border-gray-400 rounded-lg">
            {/* Car outline */}
            <div className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg">
              {/* Front windshield */}
              <div className="absolute top-2 left-4 right-4 h-8 bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded-t-lg flex items-center justify-center text-xs">
                Windshield
              </div>
              
              {/* Front side windows */}
              <div className="absolute top-12 left-2 w-8 h-6 bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded-l-lg flex items-center justify-center text-[10px] writing-vertical">
                FL
              </div>
              <div className="absolute top-12 right-2 w-8 h-6 bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded-r-lg flex items-center justify-center text-[10px]">
                FR
              </div>
              
              {/* Rear side windows */}
              <div className="absolute top-20 left-2 w-8 h-6 bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded-l-lg flex items-center justify-center text-[10px]">
                RL
              </div>
              <div className="absolute top-20 right-2 w-8 h-6 bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded-r-lg flex items-center justify-center text-[10px]">
                RR
              </div>
              
              {/* Quarter windows */}
              <div className="absolute bottom-8 left-4 w-6 h-4 bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded flex items-center justify-center text-[8px]">
                QL
              </div>
              
              {/* Back windshield */}
              <div className="absolute bottom-2 left-4 right-4 h-8 bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded-b-lg flex items-center justify-center text-xs">
                Back
              </div>
            </div>
          </div>
        </div>

        {/* Window Assignment List */}
        <div className="grid gap-4 md:grid-cols-2">
          {windowAssignments.map((window) => (
            <div key={window.windowId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <label className="text-sm font-medium">{window.windowName}</label>
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
                  onClick={() => removeWindow(window.windowId)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={addWindow}
          >
            Add Custom Window
          </Button>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {assignedCount} windows
          </div>
        </div>
      </CardContent>
    </Card>
  );
}