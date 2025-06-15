import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { User, Film } from "@shared/schema";

interface RedoEntryProps {
  part: string;
  installerId?: string;
  filmId?: number;
  lengthInches?: number;
  widthInches?: number;
  timeMinutes?: number;
  installers: User[];
  availableFilms: Film[];
  onPartChange: (value: string) => void;
  onInstallerChange: (value: string) => void;
  onFilmChange: (value: number) => void;
  onLengthChange: (value: number) => void;
  onWidthChange: (value: number) => void;
  onTimeChange: (value: number) => void;
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
  installerId,
  filmId,
  lengthInches = 0,
  widthInches = 0,
  timeMinutes = 0,
  installers,
  availableFilms,
  onPartChange, 
  onInstallerChange,
  onFilmChange,
  onLengthChange,
  onWidthChange,
  onTimeChange,
  onRemove 
}: RedoEntryProps) {
  const sqft = lengthInches && widthInches ? (lengthInches * widthInches) / 144 : 0;

  return (
    <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-destructive">REDO Entry</h4>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={onRemove}
          className="border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Part</label>
          <Select value={part} onValueChange={onPartChange}>
            <SelectTrigger className="bg-background border-border">
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
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Installer</label>
          <Select value={installerId || ""} onValueChange={onInstallerChange}>
            <SelectTrigger className="bg-background border-border">
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
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Film Type</label>
          <Select value={filmId?.toString() || ""} onValueChange={(value) => onFilmChange(Number(value))}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Select film" />
            </SelectTrigger>
            <SelectContent>
              {availableFilms.map((film) => (
                <SelectItem key={film.id} value={film.id.toString()}>
                  {film.name} ({film.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Length (in)</label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={lengthInches || ""}
            onChange={(e) => onLengthChange(Number(e.target.value) || 0)}
            placeholder="36"
            className="bg-background border-border"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Width (in)</label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={widthInches || ""}
            onChange={(e) => onWidthChange(Number(e.target.value) || 0)}
            placeholder="24"
            className="bg-background border-border"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Time (min)</label>
          <Input
            type="number"
            min="0"
            value={timeMinutes || ""}
            onChange={(e) => onTimeChange(Number(e.target.value) || 0)}
            placeholder="30"
            className="bg-background border-border"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Sq Ft</label>
          <div className="p-2 bg-muted rounded text-sm font-mono text-center">
            {sqft.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
