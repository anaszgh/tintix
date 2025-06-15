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
  totalSqft: z.number().min(0.1, "Total square footage must be greater than 0").optional(),
  filmCost: z.number().min(0, "Film cost cannot be negative").optional(),
  dimensions: z.array(z.object({
    lengthInches: z.number().min(0.1, "Length must be greater than 0"),
    widthInches: z.number().min(0.1, "Width must be greater than 0"),
    filmId: z.number().optional(),
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
  const [redoEntries, setRedoEntries] = useState<Array<{ 
    part: string; 
    installerId?: string; 
    filmId?: number;
    lengthInches?: number;
    widthInches?: number;
    timeMinutes?: number;
  }>>(
    editingEntry ? editingEntry.redoEntries.map(redo => ({
      part: redo.part,
      installerId: redo.installerId,
      filmId: redo.filmId,
      lengthInches: redo.lengthInches ? Number(redo.lengthInches) : undefined,
      widthInches: redo.widthInches ? Number(redo.widthInches) : undefined,
      timeMinutes: redo.timeMinutes || undefined,
    })) : []
  );

  const [dimensions, setDimensions] = useState<Array<{ lengthInches: number; widthInches: number; filmId?: number; description?: string }>>(
    editingEntry && editingEntry.dimensions ? editingEntry.dimensions.map(dim => ({
      lengthInches: Number(dim.lengthInches),
      widthInches: Number(dim.widthInches),
      filmId: dim.filmId,
      description: dim.description || ""
    })) : [{ lengthInches: 1, widthInches: 1, filmId: undefined, description: "" }]
  );

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

  const updateTotalSqftFromDimensions = (dims: Array<{ lengthInches: number; widthInches: number; filmId?: number; description?: string }>) => {
    const totalSqft = dims.reduce((total, dim) => 
      total + ((dim.lengthInches * dim.widthInches) / 144), 0
    );
    form.setValue("totalSqft", totalSqft);
    
    // Film cost calculation now handled per dimension since films can vary per window
  };

  const { data: installers = [], isLoading: installersLoading } = useQuery<User[]>({
    queryKey: ["/api/installers"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: films = [], isLoading: filmsLoading } = useQuery<any[]>({
    queryKey: ["/api/films"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

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
      // filmId removed from job level - now handled per dimension/redo
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
      dimensions: [{ lengthInches: 1, widthInches: 1, filmId: undefined, description: "" }],
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
      filmId: undefined,
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
                <FormLabel className="text-muted-foreground">Date *</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field}
                    className="bg-background border-border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Job Duration Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">Job Duration (minutes) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="1"
                      placeholder="Enter total job duration"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : undefined;
                        field.onChange(value);
                        // Track base duration when manually entered
                        if (value && value > 0) {
                          setBaseDurationMinutes(value);
                        }
                      }}
                      className="bg-background border-border"
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground">
                    Total time for this job in minutes (e.g., 80 for 1 hour 20 minutes)
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-center">
              <div className="text-sm text-muted-foreground bg-background border rounded-lg p-4">
                <p className="font-medium">Quick Reference:</p>
                <p>30 min = 30</p>
                <p>1 hr = 60</p>
                <p>1 hr 30 min = 90</p>
                <p>2 hr = 120</p>
              </div>
            </div>
          </div>

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
                              const newVariances = { ...currentVariances };
                              delete newVariances[installer.id];
                              form.setValue("installerTimeVariances", newVariances);
                            }
                          }}
                        />
                        <label
                          htmlFor={installer.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {installer.firstName} {installer.lastName}
                        </label>
                      </div>
                      
                      {field.value?.includes(installer.id) && (
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-muted-foreground">Time Variance (min):</label>
                          <div className="flex items-center space-x-1 border rounded">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => {
                                const currentVariances = form.getValues("installerTimeVariances") || {};
                                const currentValue = currentVariances[installer.id] || 0;
                                form.setValue("installerTimeVariances", {
                                  ...currentVariances,
                                  [installer.id]: currentValue - 1
                                });
                              }}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              className="w-16 h-8 text-xs text-center border-0 focus:ring-0"
                              value={form.watch("installerTimeVariances")?.[installer.id] || 0}
                              onChange={(e) => {
                                const currentVariances = form.getValues("installerTimeVariances") || {};
                                form.setValue("installerTimeVariances", {
                                  ...currentVariances,
                                  [installer.id]: parseInt(e.target.value) || 0
                                });
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-500 hover:bg-green-50"
                              onClick={() => {
                                const currentVariances = form.getValues("installerTimeVariances") || {};
                                const currentValue = currentVariances[installer.id] || 0;
                                form.setValue("installerTimeVariances", {
                                  ...currentVariances,
                                  [installer.id]: currentValue + 1
                                });
                              }}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="vehicleYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Vehicle Year *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. 2023" 
                    {...field}
                    className="bg-background border-border"
                  />
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
                <FormLabel className="text-muted-foreground">Make *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. Honda" 
                    {...field}
                    className="bg-background border-border"
                  />
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
                <FormLabel className="text-muted-foreground">Model *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. Civic" 
                    {...field}
                    className="bg-background border-border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Film Information Section */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Film Information</CardTitle>
            <p className="text-sm text-muted-foreground">Select film type and calculate material costs</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="filmId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Film Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value ? parseInt(value) : undefined);
                        // Auto-calculate cost when film type or sqft changes
                        const filmId = parseInt(value);
                        const selectedFilm = films.find(f => f.id === filmId);
                        const totalSqft = form.getValues("totalSqft");
                        if (selectedFilm && totalSqft) {
                          const calculatedCost = Number(selectedFilm.costPerSqft) * totalSqft;
                          form.setValue("filmCost", calculatedCost);
                        }
                      }} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select film type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {films.map((film) => (
                          <SelectItem key={film.id} value={film.id.toString()}>
                            {film.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dimensions Section */}
              <div className="col-span-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Dimensions</h3>
                    <p className="text-sm text-muted-foreground">Enter length and width measurements</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDimensions([...dimensions, { lengthInches: 1, widthInches: 1, description: "" }]);
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        Square footage: {dimension.lengthInches && dimension.widthInches 
                          ? ((dimension.lengthInches * dimension.widthInches) / 144).toFixed(2) 
                          : "0.00"} sq ft
                      </div>
                    </div>
                  ))}
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-lg font-semibold">
                      Total Square Footage: {dimensions.reduce((total, dim) => 
                        total + ((dim.lengthInches * dim.widthInches) / 144), 0
                      ).toFixed(2)} sq ft
                    </div>
                  </div>
                </div>
              </div>


            </div>

            {/* Material Consumption Summary */}
            {form.watch("filmId") && (dimensions.length > 0 || redoEntries.length > 0) && (
              <div className="bg-background border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-card-foreground">Material Consumption</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Create print-specific styles that match the actual design
                      const printContent = document.createElement('div');
                      printContent.innerHTML = `
                        <style>
                          @media print {
                            body * { visibility: hidden; }
                            .print-section, .print-section * { visibility: visible; }
                            .print-section { position: absolute; left: 0; top: 0; width: 100%; }
                            .print-container {
                              background: #f8fafc;
                              border: 1px solid #e2e8f0;
                              border-radius: 8px;
                              padding: 16px;
                              max-width: 600px;
                              margin: 20px auto;
                              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            }
                            .print-header {
                              display: flex;
                              justify-content: space-between;
                              align-items: center;
                              margin-bottom: 16px;
                              font-weight: 600;
                              font-size: 16px;
                              color: #1e293b;
                            }
                            .print-row {
                              display: flex;
                              justify-content: space-between;
                              padding: 8px 0;
                              font-size: 14px;
                            }
                            .print-label {
                              color: #64748b;
                            }
                            .print-value {
                              color: #1e293b;
                              font-weight: 500;
                            }
                            .print-separator {
                              border-top: 1px solid #e2e8f0;
                              margin: 12px 0;
                              padding-top: 8px;
                            }
                            .print-total-row {
                              font-weight: 600;
                              border-top: 1px solid #e2e8f0;
                              padding-top: 8px;
                              margin-top: 8px;
                            }
                            .print-blue { color: #2563eb; }
                            .print-red { color: #dc2626; }
                            .print-green { color: #16a34a; }
                            .print-small {
                              font-size: 12px;
                              color: #dc2626;
                              margin-top: 8px;
                            }
                            .job-consumption {
                              border-top: 1px solid #e2e8f0;
                              padding-top: 8px;
                              margin-top: 8px;
                            }
                            .consumption-header {
                              font-size: 12px;
                              font-weight: 600;
                              color: #64748b;
                              margin-bottom: 8px;
                            }
                            .redo-consumption {
                              border-top: 1px solid #e2e8f0;
                              padding-top: 8px;
                              margin-top: 8px;
                            }
                            .redo-header {
                              font-size: 12px;
                              font-weight: 600;
                              color: #dc2626;
                              margin-bottom: 8px;
                            }
                          </style>
                        </div>
                        <div class="print-section">
                          <div class="print-container">
                            <div class="print-header">
                              <span>Material Consumption</span>
                            </div>
                            
                            <div class="print-row">
                              <span class="print-label">Film Type:</span>
                              <span class="print-value">${films.find(f => f.id === form.watch("filmId"))?.name || 'N/A'}</span>
                            </div>
                            
                            <div class="print-row">
                              <span class="print-label">Rate per sq ft:</span>
                              <span class="print-value">$${Number(films.find(f => f.id === form.watch("filmId"))?.costPerSqft || 0).toFixed(2)}</span>
                            </div>

                            ${dimensions.length > 0 ? `
                              <div class="job-consumption">
                                <div class="consumption-header">Job Consumption</div>
                                ${dimensions.map((dim, index) => {
                                  const sqft = (dim.lengthInches * dim.widthInches) / 144;
                                  return `
                                    <div class="print-row" style="font-size: 12px;">
                                      <span class="print-label">${dim.description || `Dimension ${index + 1}`}: ${dim.lengthInches}" × ${dim.widthInches}"</span>
                                      <span class="print-value">${sqft.toFixed(2)} sq ft</span>
                                    </div>
                                  `;
                                }).join('')}
                              </div>
                            ` : ''}

                            ${redoEntries.filter(redo => redo.lengthInches && redo.widthInches).length > 0 ? `
                              <div class="redo-consumption">
                                <div class="redo-header">REDO Consumption</div>
                                ${redoEntries.filter(redo => redo.lengthInches && redo.widthInches).map((redo, index) => {
                                  const sqft = (redo.lengthInches! * redo.widthInches!) / 144;
                                  return `
                                    <div class="print-row" style="font-size: 12px;">
                                      <span class="print-label">${redo.part}: ${redo.lengthInches}" × ${redo.widthInches}" (REDO)</span>
                                      <span class="print-value print-red">${sqft.toFixed(2)} sq ft</span>
                                    </div>
                                  `;
                                }).join('')}
                              </div>
                            ` : ''}
                            
                            ${(() => {
                              const jobSqft = dimensions.reduce((total, dim) => total + ((dim.lengthInches * dim.widthInches) / 144), 0);
                              const redoSqft = redoEntries.reduce((total, redo) => {
                                if (redo.lengthInches && redo.widthInches) {
                                  return total + ((redo.lengthInches * redo.widthInches) / 144);
                                }
                                return total;
                              }, 0);
                              const totalSqft = jobSqft + redoSqft;
                              const costPerSqft = Number(films.find(f => f.id === form.watch("filmId"))?.costPerSqft || 0);
                              const jobCost = (totalSqft - redoSqft) * costPerSqft;
                              const redoCost = redoSqft * costPerSqft;
                              const totalCost = totalSqft * costPerSqft;
                              const totalFormDuration = form.watch("durationMinutes") || 0;
                              const redoTime = redoEntries.reduce((total, redo) => total + (redo.timeMinutes || 0), 0);
                              const baseDuration = baseDurationMinutes > 0 ? baseDurationMinutes : Math.max(0, totalFormDuration - redoTime);
                              const totalDuration = baseDuration + redoTime;
                              const totalHours = (totalDuration / 60).toFixed(1);
                              
                              return `
                                <div class="print-separator">
                                  <div class="print-row">
                                    <span class="print-label">Total Material SQFT:</span>
                                    <span class="print-value">${totalSqft.toFixed(2)} sq ft</span>
                                  </div>
                                  <div class="print-row">
                                    <span class="print-label">Total Cost:</span>
                                    <span class="print-value print-blue">$${jobCost.toFixed(2)}</span>
                                  </div>
                                  ${redoSqft > 0 ? `
                                    <div class="print-row">
                                      <span class="print-label">Total Cost Redo:</span>
                                      <span class="print-value print-red">$${redoCost.toFixed(2)}</span>
                                    </div>
                                  ` : ''}
                                  <div class="print-row print-total-row">
                                    <span class="print-label">Overall Cost:</span>
                                    <span class="print-value print-green">$${totalCost.toFixed(2)}</span>
                                  </div>
                                  <div class="print-row">
                                    <span class="print-label">Job Time:</span>
                                    <span class="print-value">${Math.floor(baseDuration / 60)}h ${baseDuration % 60}m</span>
                                  </div>
                                  ${redoTime > 0 ? `
                                    <div class="print-row">
                                      <span class="print-label">Redo Time:</span>
                                      <span class="print-value print-red">${Math.floor(redoTime / 60)}h ${redoTime % 60}m</span>
                                    </div>
                                  ` : ''}
                                  <div class="print-row print-total-row">
                                    <span class="print-label">Total Time:</span>
                                    <span class="print-value">${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m</span>
                                  </div>
                                  ${redoSqft > 0 ? `<div class="print-small">Includes ${redoSqft.toFixed(2)} sq ft redo material</div>` : ''}
                                  ${redoTime > 0 ? `<div class="print-small">Includes ${(redoTime / 60).toFixed(1)} hours redo time</div>` : ''}
                                </div>
                              `;
                            })()}
                          </div>
                        </div>
                      `;
                      document.body.appendChild(printContent);
                      window.print();
                      document.body.removeChild(printContent);
                    }}
                    className="flex items-center gap-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6,9 6,2 18,2 18,9"></polyline>
                      <path d="M6,18H4a2,2 0 0,1-2-2v-5a2,2 0 0,1,2-2H20a2,2 0 0,1,2,2v5a2,2 0 0,1-2,2H18"></path>
                      <polyline points="6,14 18,14 18,22 6,22 6,14"></polyline>
                    </svg>
                    Print
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {/* Film Information */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Film Type:</span>
                    <span className="text-card-foreground">
                      {films.find(f => f.id === form.watch("filmId"))?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rate per sq ft:</span>
                    <span className="text-card-foreground">
                      ${Number(films.find(f => f.id === form.watch("filmId"))?.costPerSqft || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Regular Job Consumption */}
                  {dimensions.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Job Consumption</div>
                      {dimensions.map((dim, index) => {
                        const sqft = (dim.lengthInches * dim.widthInches) / 144;
                        return (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {dim.description || `Dimension ${index + 1}`}: {dim.lengthInches}" × {dim.widthInches}"
                            </span>
                            <span className="text-card-foreground">{sqft.toFixed(2)} sq ft</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Redo Consumption */}
                  {redoEntries.filter(redo => redo.lengthInches && redo.widthInches).length > 0 && (
                    <div className="border-t border-border pt-2">
                      <div className="text-xs font-medium text-destructive mb-2">REDO Consumption</div>
                      {redoEntries.filter(redo => redo.lengthInches && redo.widthInches).map((redo, index) => {
                        const sqft = (redo.lengthInches! * redo.widthInches!) / 144;
                        return (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {redo.part}: {redo.lengthInches}" × {redo.widthInches}" (REDO)
                            </span>
                            <span className="text-destructive">{sqft.toFixed(2)} sq ft</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Total Calculation */}
                  {(() => {
                    const jobSqft = dimensions.reduce((total, dim) => total + ((dim.lengthInches * dim.widthInches) / 144), 0);
                    const redoSqft = redoEntries.reduce((total, redo) => {
                      if (redo.lengthInches && redo.widthInches) {
                        return total + ((redo.lengthInches * redo.widthInches) / 144);
                      }
                      return total;
                    }, 0);
                    const totalSqft = jobSqft + redoSqft;
                    const costPerSqft = Number(films.find(f => f.id === form.watch("filmId"))?.costPerSqft || 0);
                    const totalCost = totalSqft * costPerSqft;

                    // Calculate time breakdown properly
                    const totalFormDuration = form.watch("durationMinutes") || 0;
                    const redoTime = redoEntries.reduce((total, redo) => total + (redo.timeMinutes || 0), 0);
                    // Base duration is the original job time (total minus redo time)
                    const baseDuration = baseDurationMinutes > 0 ? baseDurationMinutes : Math.max(0, totalFormDuration - redoTime);
                    const totalDuration = baseDuration + redoTime;

                    // Update form values with calculated totals
                    if (form.watch("totalSqft") !== totalSqft) {
                      form.setValue("totalSqft", totalSqft);
                    }
                    if (form.watch("filmCost") !== totalCost) {
                      form.setValue("filmCost", totalCost);
                    }

                    const jobCost = (totalSqft - redoSqft) * costPerSqft;
                    const redoCost = redoSqft * costPerSqft;
                    const totalHours = (totalDuration / 60).toFixed(1);

                    return (
                      <div className="border-t border-border pt-2 space-y-1">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-card-foreground">Total Material SQFT:</span>
                          <span className="text-card-foreground">{totalSqft.toFixed(2)} sq ft</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-card-foreground">Total Cost:</span>
                          <span className="text-blue-600 font-semibold">${jobCost.toFixed(2)}</span>
                        </div>
                        {redoSqft > 0 && (
                          <div className="flex justify-between text-sm font-medium">
                            <span className="text-card-foreground">Total Cost Redo:</span>
                            <span className="text-red-600 font-semibold">${redoCost.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold border-t pt-1">
                          <span className="text-card-foreground">Overall Cost:</span>
                          <span className="text-success font-bold">${totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-card-foreground">Job Time:</span>
                          <span className="text-card-foreground">{Math.floor(baseDuration / 60)}h {baseDuration % 60}m</span>
                        </div>
                        {redoTime > 0 && (
                          <div className="flex justify-between text-sm font-medium">
                            <span className="text-card-foreground">Redo Time:</span>
                            <span className="text-red-600">{Math.floor(redoTime / 60)}h {redoTime % 60}m</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold border-t pt-1">
                          <span className="text-card-foreground">Total Time:</span>
                          <span className="text-card-foreground">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</span>
                        </div>
                        {redoSqft > 0 && (
                          <div className="text-xs text-destructive">
                            Includes {redoSqft.toFixed(2)} sq ft redo material
                          </div>
                        )}
                        {redoTime > 0 && (
                          <div className="text-xs text-destructive">
                            Includes {(redoTime / 60).toFixed(1)} hours redo time
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Car Window Assignment */}
        <div className="space-y-4">
          <VisualCarSelector
            installers={installers}
            selectedInstallers={form.watch("installerIds").map(id => installers.find(i => i.id === id)).filter(Boolean) as User[]}
            onWindowAssignmentsChange={(assignments) => {
              setWindowAssignments(assignments);
              
              // Only update total windows count, don't modify job-level installer selection
              form.setValue("totalWindows", assignments.filter(a => a.installerId).length, { shouldValidate: false, shouldDirty: false });
            }}
          />

          {/* Window Assignment Summary */}
          {windowAssignments.filter(w => w.installerId).length > 0 && (
            <Card className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
              <CardHeader>
                <CardTitle className="text-sm text-slate-900 dark:text-slate-100">Window Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {windowAssignments.filter(w => w.installerId).map((assignment) => {
                  const installer = installers.find(i => i.id === assignment.installerId);
                  return (
                    <div key={assignment.windowId} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{assignment.windowName}</span>
                      <span className="text-blue-700 dark:text-blue-300 font-semibold">
                        {installer ? `${installer.firstName} ${installer.lastName}` : 'Unknown'}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="bg-muted/30 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-card-foreground">Redo Entries</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addRedoEntry}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Redo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {redoEntries.map((redo, index) => (
              <RedoEntry
                key={index}
                part={redo.part}
                installerId={redo.installerId}
                filmId={redo.filmId}
                lengthInches={redo.lengthInches}
                widthInches={redo.widthInches}
                timeMinutes={redo.timeMinutes}
                installers={installers}
                availableFilms={films}
                onPartChange={(value) => updateRedoEntry(index, "part", value)}
                onInstallerChange={(value) => updateRedoEntry(index, "installerId", value)}
                onFilmChange={(value) => updateRedoEntry(index, "filmId", value)}
                onLengthChange={(value) => updateRedoEntry(index, "lengthInches", value)}
                onWidthChange={(value) => updateRedoEntry(index, "widthInches", value)}
                onTimeChange={(value) => updateRedoEntry(index, "timeMinutes", value)}
                onRemove={() => removeRedoEntry(index)}
              />
            ))}
            
            {redoEntries.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No redo entries. Add redo entries for different parts of the vehicle as needed.
              </p>
            )}
          </CardContent>
        </Card>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  rows={3}
                  placeholder="Any additional notes about this job..." 
                  {...field}
                  value={field.value || ""}
                  className="bg-background border-border resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Show form errors for debugging */}
        {Object.keys(form.formState.errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="text-red-800 font-medium mb-2">Form Validation Errors:</h4>
            <pre className="text-red-600 text-sm">{JSON.stringify(form.formState.errors, null, 2)}</pre>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
          <Button 
            type="submit" 
            disabled={createEntryMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {createEntryMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {editingEntry ? "Update Entry" : "Save Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
