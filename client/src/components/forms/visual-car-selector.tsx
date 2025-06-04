import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface WindowAssignment {
  windowId: string;
  installerId: string | null;
  windowName: string;
}

interface VisualCarSelectorProps {
  installers: User[];
  onWindowAssignmentsChange: (assignments: WindowAssignment[]) => void;
}

const CAR_WINDOWS = [
  { id: "front_windshield", name: "Front Windshield", x: "45%", y: "10%", width: "10%", height: "15%" },
  { id: "rear_windshield", name: "Rear Windshield", x: "45%", y: "75%", width: "10%", height: "15%" },
  { id: "front_driver", name: "Front Driver", x: "15%", y: "25%", width: "8%", height: "12%" },
  { id: "front_passenger", name: "Front Passenger", x: "77%", y: "25%", width: "8%", height: "12%" },
  { id: "rear_driver", name: "Rear Driver", x: "15%", y: "55%", width: "8%", height: "12%" },
  { id: "rear_passenger", name: "Rear Passenger", x: "77%", y: "55%", width: "8%", height: "12%" },
  { id: "driver_quarter", name: "Driver Quarter", x: "25%", y: "70%", width: "6%", height: "8%" },
  { id: "passenger_quarter", name: "Passenger Quarter", x: "69%", y: "70%", width: "6%", height: "8%" },
];

export function VisualCarSelector({ installers, onWindowAssignmentsChange }: VisualCarSelectorProps) {
  const [windowAssignments, setWindowAssignments] = useState<WindowAssignment[]>(
    CAR_WINDOWS.map(window => ({
      windowId: window.id,
      installerId: null,
      windowName: window.name
    }))
  );
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);

  const handleWindowClick = (windowId: string) => {
    setSelectedWindow(windowId);
  };

  const handleInstallerAssign = (windowId: string, installerId: string) => {
    const updatedAssignments = windowAssignments.map(assignment =>
      assignment.windowId === windowId
        ? { ...assignment, installerId: installerId === "none" ? null : installerId }
        : assignment
    );
    setWindowAssignments(updatedAssignments);
    onWindowAssignmentsChange(updatedAssignments.filter(a => a.installerId));
    setSelectedWindow(null);
  };

  const addCustomWindow = () => {
    const newWindow: WindowAssignment = {
      windowId: `custom_${Date.now()}`,
      installerId: null,
      windowName: `Custom Window ${windowAssignments.length - 7}`
    };
    const updatedAssignments = [...windowAssignments, newWindow];
    setWindowAssignments(updatedAssignments);
  };

  const removeCustomWindow = (windowId: string) => {
    const updatedAssignments = windowAssignments.filter(w => w.windowId !== windowId);
    setWindowAssignments(updatedAssignments);
    onWindowAssignmentsChange(updatedAssignments.filter(a => a.installerId));
  };

  const getInstallerColor = (installerId: string | null) => {
    if (!installerId) return "bg-gray-200 border-gray-300";
    const colors = [
      "bg-blue-200 border-blue-400",
      "bg-green-200 border-green-400", 
      "bg-yellow-200 border-yellow-400",
      "bg-purple-200 border-purple-400",
      "bg-red-200 border-red-400",
    ];
    const index = installers.findIndex(i => i.id === installerId);
    return colors[index % colors.length] || "bg-gray-200 border-gray-300";
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
      <CardContent className="space-y-6">
        {/* Visual Car Layout */}
        <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg p-6">
          <div className="relative mx-auto w-80 h-60 bg-slate-300 dark:bg-slate-600 rounded-lg border-2 border-slate-400">
            {/* Car Body */}
            <div className="absolute inset-2 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
            
            {/* Windows */}
            {CAR_WINDOWS.map((window) => {
              const assignment = windowAssignments.find(a => a.windowId === window.id);
              return (
                <button
                  key={window.id}
                  className={cn(
                    "absolute border-2 rounded cursor-pointer transition-all",
                    "hover:scale-110 hover:shadow-lg",
                    selectedWindow === window.id ? "ring-2 ring-blue-500" : "",
                    getInstallerColor(assignment?.installerId || null)
                  )}
                  style={{
                    left: window.x,
                    top: window.y,
                    width: window.width,
                    height: window.height
                  }}
                  onClick={() => handleWindowClick(window.id)}
                  title={`${window.name}${assignment?.installerId ? ` - ${getInstallerName(assignment.installerId)}` : ' - Unassigned'}`}
                >
                  <span className="text-xs font-medium">
                    {window.name.split(' ').map(w => w[0]).join('')}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {installers.slice(0, 5).map((installer, index) => (
              <div key={installer.id} className="flex items-center gap-2">
                <div className={cn("w-4 h-4 rounded border-2", getInstallerColor(installer.id))}></div>
                <span>{installer.firstName} {installer.lastName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Window Assignment Popup */}
        {selectedWindow && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">
                  Assign {CAR_WINDOWS.find(w => w.id === selectedWindow)?.name}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWindow(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Select 
                onValueChange={(value) => handleInstallerAssign(selectedWindow, value)}
              >
                <SelectTrigger>
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
            </CardContent>
          </Card>
        )}

        {/* Custom Windows */}
        {windowAssignments.filter(w => w.windowId.startsWith('custom_')).map((window) => (
          <div key={window.windowId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded">
            <div className="flex-1">
              <label className="text-sm font-medium">{window.windowName}</label>
              <Select 
                value={window.installerId || "none"} 
                onValueChange={(value) => handleInstallerAssign(window.windowId, value)}
              >
                <SelectTrigger>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeCustomWindow(window.windowId)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

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
            Click windows to assign installers
          </div>
        </div>
      </CardContent>
    </Card>
  );
}