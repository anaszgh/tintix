import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentPacificDate } from "@/lib/utils";
import { CarWindowSelector } from "./car-window-selector";
import { Plus, Trash2 } from "lucide-react";
import type { User, Film, JobEntryWithDetails } from "@shared/schema";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  vehicleYear: z.string().min(1, "Vehicle year is required"),
  vehicleMake: z.string().min(1, "Vehicle make is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  totalWindows: z.number().min(1, "Must have at least 1 window"),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  installerIds: z.array(z.string()).min(1, "At least one installer is required"),
  installerTimeVariances: z.record(z.number()),
  totalSqft: z.number().min(0, "Square footage cannot be negative"),
  filmCost: z.number().min(0, "Film cost cannot be negative"),
  notes: z.string().optional(),
  windowAssignments: z.array(z.any()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EntryFormProps {
  onSuccess?: () => void;
  editingEntry?: JobEntryWithDetails | null;
}

export function EntryForm({ onSuccess, editingEntry }: EntryFormProps) {
  const { toast } = useToast();
  
  // State for dimensions - simple structure
  const [dimensions, setDimensions] = useState<Array<{
    lengthInches: number;
    widthInches: number;
    description?: string;
  }>>([{ lengthInches: 1, widthInches: 1, description: "" }]);
  
  // State for selected film type (for this entry)
  const [selectedFilmId, setSelectedFilmId] = useState<number | null>(null);

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
    },
  });

  // Auto-calculate total square footage from dimensions
  const updateTotalSqft = (dims: typeof dimensions) => {
    const totalSqft = dims.reduce((total, dim) => {
      return total + ((Number(dim.lengthInches) * Number(dim.widthInches)) / 144);
    }, 0);
    form.setValue("totalSqft", totalSqft);
    return totalSqft;
  };

  // Auto-calculate film cost based on total sqft and selected film
  const updateFilmCost = (totalSqft: number, filmId: number | null) => {
    if (filmId && films) {
      const selectedFilm = films.find(f => f.id === filmId);
      if (selectedFilm) {
        const cost = totalSqft * selectedFilm.costPerSqft;
        form.setValue("filmCost", cost);
      }
    } else {
      form.setValue("filmCost", 0);
    }
  };

  // Effect to recalculate when dimensions or film selection changes
  useEffect(() => {
    const totalSqft = updateTotalSqft(dimensions);
    updateFilmCost(totalSqft, selectedFilmId);
  }, [dimensions, selectedFilmId, films]);

  // Load editing data
  useEffect(() => {
    if (editingEntry) {
      form.reset({
        date: editingEntry.date instanceof Date ? editingEntry.date.toISOString().split('T')[0] : editingEntry.date,
        vehicleYear: editingEntry.vehicleYear,
        vehicleMake: editingEntry.vehicleMake,
        vehicleModel: editingEntry.vehicleModel,
        totalWindows: editingEntry.totalWindows,
        durationMinutes: editingEntry.durationMinutes ?? 60,
        installerIds: editingEntry.installers.map(i => i.id),
        installerTimeVariances: editingEntry.installers.reduce((acc, installer) => {
          acc[installer.id] = installer.timeVariance;
          return acc;
        }, {} as Record<string, number>),
        totalSqft: parseFloat(editingEntry.totalSqft?.toString() || "0"),
        filmCost: parseFloat(editingEntry.filmCost?.toString() || "0"),
        notes: editingEntry.notes || "",
      });

      // Load dimensions
      if (editingEntry.dimensions?.length > 0) {
        setDimensions(editingEntry.dimensions.map(dim => ({
          lengthInches: parseFloat(dim.lengthInches?.toString() || "1"),
          widthInches: parseFloat(dim.widthInches?.toString() || "1"),
          description: dim.description || "",
        })));
        
        // Set selected film from first dimension that has a film
        const firstFilmId = editingEntry.dimensions.find(d => d.filmId)?.filmId;
        if (firstFilmId) {
          setSelectedFilmId(firstFilmId);
        }
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
          filmId: selectedFilmId,
          filmCost: selectedFilmId && films ? 
            (films.find(f => f.id === selectedFilmId)?.costPerSqft || 0) * ((Number(dim.lengthInches) * Number(dim.widthInches)) / 144) : 0,
          sqft: ((Number(dim.lengthInches) * Number(dim.widthInches)) / 144).toString(),
        })),
      };

      const installerData = data.installerIds.map(id => ({
        installerId: id,
        timeVariance: data.installerTimeVariances[id] || 0,
      }));

      return apiRequest("POST", "/api/job-entries", { jobEntry: jobEntryData, installerData });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job entry created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      form.reset();
      setDimensions([{ lengthInches: 1, widthInches: 1, description: "" }]);
      setSelectedFilmId(null);
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
      };

      return apiRequest("PUT", `/api/job-entries/${editingEntry.id}`, jobEntryData);
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

  const addDimension = () => {
    setDimensions([...dimensions, { lengthInches: 1, widthInches: 1, description: "" }]);
  };

  const removeDimension = (index: number) => {
    if (dimensions.length > 1) {
      const newDimensions = dimensions.filter((_, i) => i !== index);
      setDimensions(newDimensions);
    }
  };

  const updateDimension = (index: number, field: string, value: any) => {
    const newDimensions = [...dimensions];
    (newDimensions[index] as any)[field] = value;
    setDimensions(newDimensions);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
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
            <CardTitle>Job Details</CardTitle>
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

        {/* Film Information - Original Simple Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Film Information</CardTitle>
            <p className="text-sm text-muted-foreground">Select film type and calculate material costs</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Film Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="filmType">Film Type</Label>
                <Select value={selectedFilmId?.toString() || ""} onValueChange={(value) => setSelectedFilmId(value ? parseInt(value) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select film..." />
                  </SelectTrigger>
                  <SelectContent>
                    {films?.map((film) => (
                      <SelectItem key={film.id} value={film.id.toString()}>
                        {film.name} ({film.type}) - ${film.costPerSqft}/sqft
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Total Square Footage</Label>
                <div className="text-2xl font-semibold text-muted-foreground">
                  {form.watch("totalSqft").toFixed(2)} sq ft
                </div>
                <p className="text-xs text-muted-foreground">(calculated)</p>
              </div>

              <div>
                <Label>Film Cost</Label>
                <div className="text-2xl font-semibold text-green-600">
                  ${form.watch("filmCost").toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically calculated when film type and sqft are selected
                </p>
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Dimensions</Label>
                <Button type="button" onClick={addDimension} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dimension
                </Button>
              </div>

              <div className="space-y-4">
                {dimensions.map((dimension, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Dimension {index + 1}</h4>
                      {dimensions.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeDimension(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Length (inches)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={dimension.lengthInches}
                          onChange={(e) => updateDimension(index, 'lengthInches', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <Label>Width (inches)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={dimension.widthInches}
                          onChange={(e) => updateDimension(index, 'widthInches', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <Label>Description (optional)</Label>
                        <Input
                          placeholder="e.g., Front windshield"
                          value={dimension.description || ""}
                          onChange={(e) => updateDimension(index, 'description', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Square footage: {((Number(dimension.lengthInches) * Number(dimension.widthInches)) / 144).toFixed(2)} sq ft
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installer Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Installer Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {installers?.map((installer) => (
                <div key={installer.id} className="flex items-center space-x-4">
                  <Checkbox
                    id={installer.id}
                    checked={form.watch("installerIds").includes(installer.id)}
                    onCheckedChange={(checked) => {
                      const currentIds = form.getValues("installerIds");
                      if (checked) {
                        form.setValue("installerIds", [...currentIds, installer.id]);
                      } else {
                        form.setValue("installerIds", currentIds.filter(id => id !== installer.id));
                        const variances = { ...form.getValues("installerTimeVariances") };
                        delete variances[installer.id];
                        form.setValue("installerTimeVariances", variances);
                      }
                    }}
                  />
                  <Label htmlFor={installer.id} className="flex-1">
                    {installer.firstName} {installer.lastName}
                  </Label>
                  {form.watch("installerIds").includes(installer.id) && (
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`variance-${installer.id}`} className="text-sm">
                        Time Variance (min):
                      </Label>
                      <Input
                        id={`variance-${installer.id}`}
                        type="number"
                        className="w-20"
                        value={form.watch("installerTimeVariances")[installer.id] || 0}
                        onChange={(e) => {
                          const variances = { ...form.getValues("installerTimeVariances") };
                          variances[installer.id] = parseInt(e.target.value) || 0;
                          form.setValue("installerTimeVariances", variances);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
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