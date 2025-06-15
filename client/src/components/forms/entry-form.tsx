import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, X, Calendar, Clock, Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentPacificDate } from "@/lib/utils";
import type { 
  JobEntryWithDetails, 
  User, 
  Film, 
  InsertJobEntry,
  InsertJobDimension,
  InsertRedoEntry
} from "@shared/schema";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  vehicleYear: z.string().min(1, "Vehicle year is required"),
  vehicleMake: z.string().min(1, "Vehicle make is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  totalWindows: z.number().min(1, "Must have at least 1 window"),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  installerIds: z.array(z.string()).min(1, "At least one installer is required"),
  installerTimeVariances: z.record(z.string(), z.number()),
  totalSqft: z.number().min(0, "Total square footage cannot be negative"),
  filmCost: z.number().min(0, "Film cost cannot be negative"),
  notes: z.string().optional(),
  windowAssignments: z.array(z.object({
    windowType: z.string(),
    count: z.number().min(1),
  })).optional(),
  redoEntries: z.array(z.object({
    part: z.string().min(1, "Part is required"),
    reason: z.string().min(1, "Reason is required"),
    installerId: z.string().min(1, "Installer is required"),
    timeMinutes: z.number().min(1, "Time must be at least 1 minute"),
    filmId: z.number().optional(),
    filmCost: z.number().min(0).optional(),
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EntryFormProps {
  onSuccess?: () => void;
  editingEntry?: JobEntryWithDetails | null;
}

export function EntryForm({ onSuccess, editingEntry }: EntryFormProps) {
  const { toast } = useToast();
  
  // State for dimensions and redo entries
  const [dimensions, setDimensions] = useState<Array<{
    lengthInches: number;
    widthInches: number;
    description?: string;
    filmId?: number;
    filmCost?: number;
  }>>([{ lengthInches: 1, widthInches: 1, description: "" }]);
  
  const [redoEntries, setRedoEntries] = useState<Array<{
    part: string;
    reason: string;
    installerId: string;
    timeMinutes: number;
    filmId?: number;
    filmCost?: number;
  }>>([]);

  // Fetch data
  const { data: installers } = useQuery<User[]>({
    queryKey: ["/api/installers"],
  });

  const { data: films } = useQuery<Film[]>({
    queryKey: ["/api/films"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: getCurrentPacificDate(),
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
      totalWindows: 1,
      durationMinutes: 60,
      installerIds: [],
      installerTimeVariances: {},
      totalSqft: 0,
      filmCost: 0,
      notes: "",
      windowAssignments: [],
      redoEntries: [],
    },
  });

  // Auto-calculate total square footage from dimensions
  const updateTotalSqftFromDimensions = (dims: typeof dimensions) => {
    const totalSqft = dims.reduce((total, dim) => {
      return total + ((dim.lengthInches * dim.widthInches) / 144);
    }, 0);
    form.setValue("totalSqft", totalSqft);
  };

  // Auto-calculate film cost from dimensions and redo entries
  const calculateTotalFilmCost = () => {
    let totalCost = 0;
    
    // Add costs from dimensions
    dimensions.forEach(dim => {
      if (dim.filmCost) {
        totalCost += dim.filmCost;
      }
    });
    
    // Add costs from redo entries
    redoEntries.forEach(redo => {
      if (redo.filmCost) {
        totalCost += redo.filmCost;
      }
    });
    
    form.setValue("filmCost", totalCost);
  };

  // Effect to recalculate costs when dimensions change
  useEffect(() => {
    calculateTotalFilmCost();
  }, [dimensions]);

  // Effect to recalculate costs when redo entries change
  useEffect(() => {
    calculateTotalFilmCost();
  }, [redoEntries]);

  // Load editing data
  useEffect(() => {
    if (editingEntry) {
      form.reset({
        date: editingEntry.date instanceof Date ? editingEntry.date.toISOString().split('T')[0] : editingEntry.date,
        vehicleYear: editingEntry.vehicleYear,
        vehicleMake: editingEntry.vehicleMake,
        vehicleModel: editingEntry.vehicleModel,
        totalWindows: editingEntry.totalWindows,
        durationMinutes: editingEntry.durationMinutes,
        installerIds: editingEntry.installers.map(i => i.id),
        installerTimeVariances: editingEntry.installers.reduce((acc, installer) => {
          acc[installer.id] = installer.timeVariance;
          return acc;
        }, {} as Record<string, number>),
        totalSqft: editingEntry.totalSqft ?? 0,
        filmCost: editingEntry.filmCost ?? 0,
        notes: editingEntry.notes || "",
        redoEntries: [],
      });

      // Load dimensions
      if (editingEntry.dimensions?.length > 0) {
        setDimensions(editingEntry.dimensions.map(dim => ({
          lengthInches: parseFloat(dim.lengthInches?.toString() || "1"),
          widthInches: parseFloat(dim.widthInches?.toString() || "1"),
          description: dim.description || "",
          filmId: dim.filmId || undefined,
          filmCost: parseFloat(dim.filmCost?.toString() || "0"),
        })));
      }

      // Load redo entries - these don't exist in the current schema
      if (editingEntry.redoEntries?.length > 0) {
        setRedoEntries(editingEntry.redoEntries.map(redo => ({
          part: redo.part,
          reason: "", // Not in current schema
          installerId: redo.installerId,
          timeMinutes: redo.timeMinutes || 30,
          filmId: redo.filmId || undefined,
          filmCost: 0, // Not in current schema
        })));
      }
    }
  }, [editingEntry, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const jobEntryData = {
        date: data.date,
        vehicleYear: data.vehicleYear,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        totalWindows: data.totalWindows,
        durationMinutes: data.durationMinutes,
        totalSqft: data.totalSqft.toString(),
        filmCost: data.filmCost.toString(),
        notes: data.notes,
        windowAssignments: data.windowAssignments || [],
        dimensions: dimensions.map(dim => ({
          lengthInches: dim.lengthInches.toString(),
          widthInches: dim.widthInches.toString(),
          description: dim.description || "",
          filmId: dim.filmId || null,
          filmCost: dim.filmCost?.toString() || "0",
          sqft: ((dim.lengthInches * dim.widthInches) / 144).toString(),
        })),
      };

      const installerData = data.installerIds.map(id => ({
        installerId: id,
        timeVariance: data.installerTimeVariances[id] || 0,
      }));

      return apiRequest("/api/job-entries", {
        method: "POST",
        body: JSON.stringify({ jobEntry: jobEntryData, installerData }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job entry created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      form.reset();
      setDimensions([{ lengthInches: 1, widthInches: 1, description: "" }]);
      setRedoEntries([]);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job entry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!editingEntry) throw new Error("No entry to update");
      
      const jobEntryData: Partial<InsertJobEntry> = {
        date: data.date,
        vehicleYear: data.vehicleYear,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        totalWindows: data.totalWindows,
        durationMinutes: data.durationMinutes,
        totalSqft: data.totalSqft,
        filmCost: data.filmCost,
        notes: data.notes,
        windowAssignments: data.windowAssignments || [],
      };

      return apiRequest(`/api/job-entries/${editingEntry.id}`, {
        method: "PUT",
        body: JSON.stringify(jobEntryData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job entry updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update job entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (editingEntry) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addRedoEntry = () => {
    setRedoEntries([...redoEntries, {
      part: "",
      reason: "",
      installerId: "",
      timeMinutes: 30,
    }]);
  };

  const removeRedoEntry = (index: number) => {
    const newRedoEntries = redoEntries.filter((_, i) => i !== index);
    setRedoEntries(newRedoEntries);
  };

  const updateRedoEntry = (index: number, field: string, value: any) => {
    const newRedoEntries = [...redoEntries];
    (newRedoEntries[index] as any)[field] = value;
    
    // Auto-calculate film cost if film is selected
    if (field === 'filmId' && value && films) {
      const selectedFilm = films.find(f => f.id === parseInt(value));
      if (selectedFilm) {
        newRedoEntries[index].filmCost = selectedFilm.costPerSqft;
      }
    }
    
    setRedoEntries(newRedoEntries);
  };

  const updateDimension = (index: number, field: string, value: any) => {
    const newDimensions = [...dimensions];
    (newDimensions[index] as any)[field] = value;
    
    // Auto-calculate film cost if film is selected
    if (field === 'filmId' && value && films) {
      const selectedFilm = films.find(f => f.id === parseInt(value));
      if (selectedFilm) {
        const sqft = (newDimensions[index].lengthInches * newDimensions[index].widthInches) / 144;
        newDimensions[index].filmCost = selectedFilm.costPerSqft * sqft;
      }
    }
    
    // Recalculate film cost if dimensions change
    if (field === 'lengthInches' || field === 'widthInches') {
      if (newDimensions[index].filmId && films) {
        const selectedFilm = films.find(f => f.id === newDimensions[index].filmId);
        if (selectedFilm) {
          const sqft = (newDimensions[index].lengthInches * newDimensions[index].widthInches) / 144;
          newDimensions[index].filmCost = selectedFilm.costPerSqft * sqft;
        }
      }
    }
    
    setDimensions(newDimensions);
    updateTotalSqftFromDimensions(newDimensions);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="vehicleYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Year</FormLabel>
                    <FormControl>
                      <Input placeholder="2020" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleMake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Make</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
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
                    <FormLabel>Vehicle Model</FormLabel>
                    <FormControl>
                      <Input placeholder="Camry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalWindows"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Windows</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the job..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Film Information */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Film Information</CardTitle>
            <p className="text-sm text-muted-foreground">Select film type and calculate material costs</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dimensions Section */}
            <div>
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
                            const value = parseFloat(e.target.value) || 1;
                            updateDimension(index, 'lengthInches', value);
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
                            const value = parseFloat(e.target.value) || 1;
                            updateDimension(index, 'widthInches', value);
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
                          value={dimension.filmId?.toString() || ""}
                          onValueChange={(value) => updateDimension(index, 'filmId', value ? parseInt(value) : undefined)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select film" />
                          </SelectTrigger>
                          <SelectContent>
                            {films?.map((film) => (
                              <SelectItem key={film.id} value={film.id.toString()}>
                                {film.name} (${film.costPerSqft}/sqft)
                              </SelectItem>
                            ))}
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
                          onChange={(e) => updateDimension(index, 'description', e.target.value)}
                          placeholder="e.g., Front windshield"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                      <span>
                        Square footage: {dimension.lengthInches && dimension.widthInches 
                          ? ((dimension.lengthInches * dimension.widthInches) / 144).toFixed(2) 
                          : "0.00"} sq ft
                      </span>
                      {dimension.filmCost && (
                        <span className="font-medium text-green-600">
                          Cost: ${dimension.filmCost.toFixed(2)}
                        </span>
                      )}
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
          </CardContent>
        </Card>

        {/* Material Consumption Summary */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="space-y-4">
            {(dimensions.length > 0 || redoEntries.length > 0) && (
              <div className="bg-background border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-card-foreground">Material Consumption</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={calculateTotalFilmCost}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Recalculate
                  </Button>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  Total Film Cost: ${form.watch("filmCost")?.toFixed(2) || "0.00"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installer Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Installer Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="installerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Installers</FormLabel>
                  <div className="space-y-2">
                    {installers?.map((installer) => (
                      <div key={installer.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={installer.id}
                          checked={field.value.includes(installer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...field.value, installer.id]);
                            } else {
                              field.onChange(field.value.filter(id => id !== installer.id));
                            }
                          }}
                        />
                        <label htmlFor={installer.id} className="text-sm font-medium">
                          {installer.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("installerIds").map((installerId) => {
              const installerName = installers?.find(i => i.id === installerId)?.name || "Unknown";
              return (
                <div key={installerId} className="space-y-2">
                  <Label>Time Variance for {installerName} (minutes)</Label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={form.watch("installerTimeVariances")[installerId] || 0}
                    onChange={(e) => {
                      const currentVariances = form.getValues("installerTimeVariances");
                      form.setValue("installerTimeVariances", {
                        ...currentVariances,
                        [installerId]: parseInt(e.target.value) || 0
                      });
                    }}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Redo Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Redo Entries
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRedoEntry}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Redo
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {redoEntries.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No redo entries</p>
            ) : (
              <div className="space-y-4">
                {redoEntries.map((redo, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Redo Entry {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRedoEntry(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Part</Label>
                        <Input
                          value={redo.part}
                          onChange={(e) => updateRedoEntry(index, 'part', e.target.value)}
                          placeholder="Window part"
                        />
                      </div>
                      <div>
                        <Label>Reason</Label>
                        <Input
                          value={redo.reason}
                          onChange={(e) => updateRedoEntry(index, 'reason', e.target.value)}
                          placeholder="Reason for redo"
                        />
                      </div>
                      <div>
                        <Label>Installer</Label>
                        <Select
                          value={redo.installerId}
                          onValueChange={(value) => updateRedoEntry(index, 'installerId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select installer" />
                          </SelectTrigger>
                          <SelectContent>
                            {installers?.map((installer) => (
                              <SelectItem key={installer.id} value={installer.id}>
                                {installer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Time (minutes)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={redo.timeMinutes}
                          onChange={(e) => updateRedoEntry(index, 'timeMinutes', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Film Type</Label>
                        <Select
                          value={redo.filmId?.toString() || ""}
                          onValueChange={(value) => updateRedoEntry(index, 'filmId', value ? parseInt(value) : undefined)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select film" />
                          </SelectTrigger>
                          <SelectContent>
                            {films?.map((film) => (
                              <SelectItem key={film.id} value={film.id.toString()}>
                                {film.name} (${film.costPerSqft}/sqft)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Film Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={redo.filmCost || 0}
                          onChange={(e) => updateRedoEntry(index, 'filmCost', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
            className="min-w-[120px]"
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {editingEntry ? "Update Entry" : "Save Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}