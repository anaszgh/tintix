import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tooltip, ContextualTooltips } from "@/components/guide/tooltip";
import { RedoEntry } from "./redo-entry";
import { VisualCarSelector } from "./visual-car-selector";
import { Plus, Save, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { insertJobEntrySchema } from "@shared/schema";
import { z } from "zod";
import type { User, JobEntryWithDetails, Film } from "@shared/schema";
import { getCurrentPacificDate } from "@/lib/utils";

const formSchema = insertJobEntrySchema.extend({
  date: z.string(),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  installerIds: z.array(z.string()).min(1, "At least one installer must be selected"),
  totalWindows: z.number().min(1, "Must have at least one window").max(20, "Maximum 20 windows"),
  installerTimeVariances: z.record(z.string(), z.number()), // installer ID -> time variance
  filmId: z.number().optional(),
  totalSqft: z.number().min(0.1, "Total square footage must be greater than 0").optional(),
  filmCost: z.number().min(0, "Film cost cannot be negative").optional(),
  dimensions: z.array(z.object({
    lengthInches: z.number().min(0.1, "Length must be greater than 0"),
    widthInches: z.number().min(0.1, "Width must be greater than 0"),
    filmId: z.number().min(1, "Film type must be selected"),
    description: z.string().optional(),
  })).min(1, "At least one dimension entry is required"),
  redoEntries: z.array(z.object({
    part: z.string(),
    installerId: z.string().optional(),
  })).optional(),
});

interface EntryFormProps {
  onSuccess?: () => void;
  editingEntry?: JobEntryWithDetails | null;
}

export function EntryForm({ onSuccess, editingEntry }: EntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load films and installers data first
  const { data: installers = [], isLoading: installersLoading } = useQuery<User[]>({
    queryKey: ["/api/installers"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: films = [], isLoading: filmsLoading } = useQuery<any[]>({
    queryKey: ["/api/films"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const [redoEntries, setRedoEntries] = useState<Array<{ 
    part: string; 
    installerId?: string; 
    lengthInches?: number;
    widthInches?: number;
    timeMinutes?: number;
  }>>(
    editingEntry ? editingEntry.redoEntries.map(redo => ({
      part: redo.part,
      installerId: redo.installerId,
      lengthInches: redo.lengthInches ? Number(redo.lengthInches) : undefined,
      widthInches: redo.widthInches ? Number(redo.widthInches) : undefined,
      timeMinutes: redo.timeMinutes || undefined,
    })) : []
  );

  // Initialize dimensions with proper filmId defaults
  const [dimensions, setDimensions] = useState<Array<{ lengthInches: number; widthInches: number; filmId: number; description?: string }>>(
    editingEntry && editingEntry.dimensions ? editingEntry.dimensions.map(dim => ({
      lengthInches: Number(dim.lengthInches),
      widthInches: Number(dim.widthInches),
      filmId: (dim as any).filmId || 33, // Default to first available film
      description: dim.description || ""
    })) : [{ lengthInches: 1, widthInches: 1, filmId: 33, description: "" }]
  );

  // Update default filmId when films load
  useEffect(() => {
    if (films.length > 0 && dimensions.some(dim => !films.find(f => f.id === dim.filmId))) {
      const firstFilmId = films[0].id;
      setDimensions(dimensions.map(dim => ({
        ...dim,
        filmId: films.find(f => f.id === dim.filmId) ? dim.filmId : firstFilmId
      })));
    }
  }, [films]);

  const [windowAssignments, setWindowAssignments] = useState<Array<{ windowId: string; installerId: string | null; windowName: string }>>(() => {
    if (editingEntry && editingEntry.windowAssignments) {
      try {
        const assignments = typeof editingEntry.windowAssignments === 'string' 
          ? JSON.parse(editingEntry.windowAssignments) 
          : editingEntry.windowAssignments;
        return Array.isArray(assignments) ? assignments : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const updateTotalSqftFromDimensions = (dims: Array<{ lengthInches: number; widthInches: number; filmId: number; description?: string }>) => {
    const totalSqft = dims.reduce((total, dim) => 
      total + ((dim.lengthInches * dim.widthInches) / 144), 0
    );
    form.setValue("totalSqft", totalSqft);
    
    // Auto-calculate cost when sqft changes
    const filmId = form.getValues("filmId");
    const selectedFilm = films.find(f => f.id === filmId);
    if (selectedFilm && totalSqft > 0) {
      const calculatedCost = Number(selectedFilm.costPerSqft) * totalSqft;
      form.setValue("filmCost", calculatedCost);
    }
  };

  // Calculate proper duration including redo time for editing
  const calculateTotalDuration = () => {
    if (!editingEntry) return undefined;
    return editingEntry.durationMinutes || undefined;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editingEntry ? {
      date: new Date(editingEntry.date).toISOString().split('T')[0],
      installerIds: editingEntry.installers.map(i => i.id),
      totalWindows: editingEntry.totalWindows || 7,
      durationMinutes: calculateTotalDuration(),
      installerTimeVariances: editingEntry.installers.reduce((acc, installer) => {
        acc[installer.id] = installer.timeVariance || 0;
        return acc;
      }, {} as Record<string, number>),
      vehicleYear: editingEntry.vehicleYear,
      vehicleMake: editingEntry.vehicleMake,
      vehicleModel: editingEntry.vehicleModel,
      filmId: editingEntry.filmId || undefined,
      dimensions: dimensions,
      totalSqft: editingEntry.totalSqft || undefined,
      filmCost: editingEntry.filmCost ? Number(editingEntry.filmCost) : undefined,
      notes: editingEntry.notes || "",
    } : {
      date: getCurrentPacificDate(),
      installerIds: [],
      totalWindows: 7,
      durationMinutes: undefined,
      installerTimeVariances: {},
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
      filmId: undefined,
      dimensions: [{ lengthInches: 1, widthInches: 1, filmId: 33, description: "" }],
      totalSqft: undefined,
      filmCost: undefined,
      notes: "",
    },
  });

  const [createdJobNumber, setCreatedJobNumber] = useState<string | null>(null);
  const [baseDurationMinutes, setBaseDurationMinutes] = useState<number>(0);

  // Initialize base duration when editing an existing entry
  useEffect(() => {
    if (editingEntry && editingEntry.durationMinutes) {
      // Calculate the redo time from existing redo entries
      const existingRedoTime = editingEntry.redoEntries?.reduce((total, redo) => total + (redo.timeMinutes || 0), 0) || 0;
      // Base duration is total duration minus redo time
      const calculatedBaseDuration = editingEntry.durationMinutes - existingRedoTime;
      setBaseDurationMinutes(calculatedBaseDuration);
      
      // Always set the form to show the full duration including redo time
      form.setValue("durationMinutes", editingEntry.durationMinutes, { shouldValidate: false });
    }
  }, [editingEntry, form]);

  // Ensure duration field updates when redo entries change during editing
  useEffect(() => {
    if (editingEntry && baseDurationMinutes > 0) {
      const currentRedoTime = redoEntries.reduce((total, redo) => total + (redo.timeMinutes || 0), 0);
      const totalDuration = baseDurationMinutes + currentRedoTime;
      if (form.getValues("durationMinutes") !== totalDuration) {
        form.setValue("durationMinutes", totalDuration, { shouldValidate: false });
      }
    }
  }, [redoEntries, baseDurationMinutes, editingEntry, form]);

  // Track redo time changes and update total duration
  useEffect(() => {
    const redoTime = redoEntries.reduce((total, redo) => total + (redo.timeMinutes || 0), 0);
    const currentDuration = form.watch("durationMinutes") || 0;
    
    // Only update if we have a base duration set and redo time has changed
    if (baseDurationMinutes > 0) {
      const newTotalDuration = baseDurationMinutes + redoTime;
      if (currentDuration !== newTotalDuration) {
        form.setValue("durationMinutes", newTotalDuration, { shouldValidate: false });
      }
    }
  }, [redoEntries, baseDurationMinutes, form]);

  const createEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const method = editingEntry ? "PUT" : "POST";
      const url = editingEntry ? `/api/job-entries/${editingEntry.id}` : "/api/job-entries";
      const response = await apiRequest(method, url, {
        ...data,
        windowAssignments: windowAssignments.filter(w => w.installerId),
        redoEntries,
      });
      return response;
    },
    onSuccess: (response: any) => {
      // Show job number for new entries
      if (!editingEntry && response?.jobNumber) {
        setCreatedJobNumber(response.jobNumber);
      }
      
      toast({
        title: editingEntry ? "Entry Updated" : "Entry Created",
        description: editingEntry ? "Job entry has been successfully updated." : `Job entry created with number: ${response?.jobNumber || 'N/A'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      if (!editingEntry) {
        form.reset();
        setRedoEntries([]);
        setWindowAssignments([]);
      }
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create job entry",
        variant: "destructive",
      });
    },
  });

  const addRedoEntry = () => {
    setRedoEntries([...redoEntries, { 
      part: "windshield", 
      installerId: "",
      lengthInches: undefined,
      widthInches: undefined,
      timeMinutes: undefined
    }]);
  };

  const removeRedoEntry = (index: number) => {
    setRedoEntries(redoEntries.filter((_, i) => i !== index));
  };

  const updateRedoEntry = (index: number, field: string, value: string | number) => {
    const updated = [...redoEntries];
    updated[index] = { ...updated[index], [field]: value };
    setRedoEntries(updated);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const jobEntryData = {
      ...data,
      windowAssignments,
      dimensions,
      redoEntries: redoEntries.length > 0 ? redoEntries : undefined,
    };
    console.log('Form submission data:', jobEntryData);
    createEntryMutation.mutate(jobEntryData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Job Number Display for existing entries or newly created entries */}
        {(editingEntry || createdJobNumber) && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Job Number</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">Save this number for future reference and searching</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-blue-800 dark:text-blue-200">
                  {editingEntry?.jobNumber || createdJobNumber}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const jobNumber = editingEntry?.jobNumber || createdJobNumber;
                    if (jobNumber) {
                      navigator.clipboard.writeText(jobNumber);
                      toast({
                        title: "Copied!",
                        description: "Job number copied to clipboard",
                      });
                    }
                  }}
                >
                  Copy Job Number
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalWindows"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Windows *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Vehicle Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="vehicleYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Year *</FormLabel>
                <FormControl>
                  <Input placeholder="2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleMake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Make *</FormLabel>
                <FormControl>
                  <Input placeholder="Honda" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Model *</FormLabel>
                <FormControl>
                  <Input placeholder="Civic" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Installers Selection */}
        <FormField
          control={form.control}
          name="installerIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">
                Job Installers * (Select one or more installers for this job)
              </FormLabel>
              <div className="space-y-2 bg-background border border-border rounded-md p-3">
                {installers.map((installer) => (
                  <div key={installer.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={installer.id}
                        checked={field.value?.includes(installer.id)}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          const currentVariances = form.getValues("installerTimeVariances") || {};
                          
                          if (checked) {
                            field.onChange([...currentValue, installer.id]);
                            form.setValue("installerTimeVariances", {
                              ...currentVariances,
                              [installer.id]: 0
                            });
                          } else {
                            field.onChange(currentValue.filter(id => id !== installer.id));
                            const { [installer.id]: removed, ...remainingVariances } = currentVariances;
                            form.setValue("installerTimeVariances", remainingVariances);
                          }
                        }}
                      />
                      <label htmlFor={installer.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {installer.firstName} {installer.lastName}
                      </label>
                    </div>
                    
                    {field.value?.includes(installer.id) && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-muted-foreground">Time Variance (minutes):</label>
                        <Input
                          type="number"
                          className="w-20 h-8 text-xs"
                          placeholder="0"
                          value={form.watch("installerTimeVariances")?.[installer.id] || 0}
                          onChange={(e) => {
                            const currentVariances = form.getValues("installerTimeVariances") || {};
                            form.setValue("installerTimeVariances", {
                              ...currentVariances,
                              [installer.id]: parseInt(e.target.value) || 0
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dimensions Section */}
        <div className="col-span-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">Dimensions</h3>
              <p className="text-sm text-muted-foreground">Enter length and width measurements with film type for each window</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const defaultFilmId = films.length > 0 ? films[0].id : 33;
                setDimensions([...dimensions, { lengthInches: 1, widthInches: 1, filmId: defaultFilmId, description: "" }]);
              }}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Dimension
            </Button>
          </div>
          
          <div className="space-y-4">
            {dimensions.map((dimension, index) => (
              <div key={index} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Dimension {index + 1}</h4>
                  {dimensions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDimensions = dimensions.filter((_, i) => i !== index);
                        setDimensions(newDimensions);
                        updateTotalSqftFromDimensions(newDimensions);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor={`length-${index}`} className="text-sm font-medium">
                      Length (inches)
                    </Label>
                    <Input
                      id={`length-${index}`}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={dimension.lengthInches}
                      onChange={(e) => {
                        const newDimensions = [...dimensions];
                        const value = parseFloat(e.target.value) || 1;
                        newDimensions[index].lengthInches = value;
                        setDimensions(newDimensions);
                        updateTotalSqftFromDimensions(newDimensions);
                      }}
                      placeholder="1.0"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`width-${index}`} className="text-sm font-medium">
                      Width (inches)
                    </Label>
                    <Input
                      id={`width-${index}`}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={dimension.widthInches}
                      onChange={(e) => {
                        const newDimensions = [...dimensions];
                        const value = parseFloat(e.target.value) || 1;
                        newDimensions[index].widthInches = value;
                        setDimensions(newDimensions);
                        updateTotalSqftFromDimensions(newDimensions);
                      }}
                      placeholder="1.0"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`film-${index}`} className="text-sm font-medium">
                      Film Type
                    </Label>
                    <Select
                      value={dimension.filmId.toString()}
                      onValueChange={(value) => {
                        const newDimensions = [...dimensions];
                        newDimensions[index].filmId = parseInt(value);
                        setDimensions(newDimensions);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={filmsLoading ? "Loading films..." : "Select film type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filmsLoading ? (
                          <SelectItem value="loading" disabled>Loading films...</SelectItem>
                        ) : films.length === 0 ? (
                          <SelectItem value="no-films" disabled>No films available</SelectItem>
                        ) : (
                          films.map((film) => (
                            <SelectItem key={film.id} value={film.id.toString()}>
                              {film.name} - {film.type}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`description-${index}`} className="text-sm font-medium">
                      Description (optional)
                    </Label>
                    <Input
                      id={`description-${index}`}
                      value={dimension.description || ""}
                      onChange={(e) => {
                        const newDimensions = [...dimensions];
                        newDimensions[index].description = e.target.value;
                        setDimensions(newDimensions);
                      }}
                      placeholder="e.g., Front windshield"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="mt-3 text-sm text-muted-foreground">
                  Square footage: {((dimension.lengthInches * dimension.widthInches) / 144).toFixed(2)} sq ft
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Duration */}
        <FormField
          control={form.control}
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    field.onChange(value);
                    if (!editingEntry) {
                      setBaseDurationMinutes(value);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about this job..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={createEntryMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createEntryMutation.isPending 
              ? (editingEntry ? "Updating..." : "Creating...") 
              : (editingEntry ? "Update Entry" : "Create Entry")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}