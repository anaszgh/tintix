import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { User } from "@shared/schema";

interface RedoEntryProps {
  part: string;
  timestamp: string;
  installerId?: string;
  installers: User[];
  onPartChange: (value: string) => void;
  onTimestampChange: (value: string) => void;
  onInstallerChange: (value: string) => void;
  onRemove: () => void;
}

const redoParts = [
  { value: "windshield", label: "Windshield (W.S)" },
  { value: "rollups", label: "Rollups" },
  { value: "back_windshield", label: "Back Windshield (B.W.S)" },
  { value: "quarter", label: "Quarter" },
];

export function RedoEntry({ 
  part, 
  timestamp, 
  installerId,
  installers,
  onPartChange, 
  onTimestampChange,
  onInstallerChange,
  onRemove 
}: RedoEntryProps) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-background rounded-lg border border-border">
      <Select value={part} onValueChange={onPartChange}>
        <SelectTrigger className="w-40 bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {redoParts.map((redoPart) => (
            <SelectItem key={redoPart.value} value={redoPart.value}>
              {redoPart.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={installerId || ""} onValueChange={onInstallerChange}>
        <SelectTrigger className="w-40 bg-background border-border">
          <SelectValue placeholder="Select installer" />
        </SelectTrigger>
        <SelectContent>
          {installers.map((installer) => (
            <SelectItem key={installer.id} value={installer.id}>
              {installer.firstName} {installer.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <span className="text-xs text-muted-foreground">at</span>
      
      <Input
        type="time"
        value={timestamp}
        onChange={(e) => onTimestampChange(e.target.value)}
        className="w-32 bg-background border-border"
      />
      
      <Button 
        type="button" 
        variant="ghost" 
        size="sm"
        onClick={onRemove}
        className="text-error hover:text-error/80 hover:bg-error/10 p-2"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
