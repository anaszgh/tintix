import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2 } from "lucide-react";
import { getCurrentPacificDate } from "@/lib/utils";
import { RedoEntry } from "./redo-entry";
import { VisualCarSelector } from "./visual-car-selector";
import type { User, Film, JobEntryWithDetails } from "@shared/schema";
import { useState, useEffect } from "react";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  vehicleYear: z.string().min(1, "Vehicle year is required"),
  vehicleMake: z.string().min(1, "Vehicle make is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  totalWindows: z.number().min(1, "Must have at least one window").max(20, "Maximum 20 windows"),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  installerIds: z.array(z.string()).min(1, "At least one installer must be selected"),
  installerTimeVariances: z.record(z.string(), z.number()), // installer ID -> time variance

  dimensions: z.array(z.object({
    lengthInches: z.number().min(0.1, "Length must be greater than 0"),
    widthInches: z.number().min(0.1, "Width must be greater than 0"),
    filmId: z.number().min(1, "Film type must be selected"),
    description: z.string().optional(),
  })).min(1, "At least one dimension entry is required"),

  notes: z.string().optional(),

  redoEntries: z.array(z.object({
    part: z.string().min(1, "Part is required"),
    filmId: z.number().min(1, "Film type must be selected"),
    installerId: z.string().min(1, "Installer must be selected"),
    lengthInches: z.number().min(0.1, "Length must be greater than 0"),
    widthInches: z.number().min(0.1, "Width must be greater than 0"),
    timeMinutes: z.number().min(1, "Time must be at least 1 minute"),
  })).optional(),
});

interface EntryFormProps {
  onSuccess?: () => void;
  editingEntry?: JobEntryWithDetails | null;
}

export function EntryForm({ onSuccess, editingEntry }: EntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dimensions, setDimensions] = useState([
    { lengthInches: 0, widthInches: 0, filmId: 0, description: "" }
  ]);
  const [redoEntries, setRedoEntries] = useState<any[]>([]);
  const [windowAssignments, setWindowAssignments] = useState<any[]>([]);

  // Fetch installers
  const { data: installers = [] } = useQuery<User[]>({
    queryKey: ["/api/installers"],
  });

  // Fetch films
  const { data: films = [] } = useQuery<Film[]>({
    queryKey: ["/api/films"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
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
      dimensions: [],
      notes: "",
      redoEntries: [],
    },
  });

  // Initialize form data when editing
  useEffect(() => {
    if (editingEntry) {
      const installerTimeVariances: Record<string, number> = {};
      editingEntry.installers.forEach(installer => {
        installerTimeVariances[installer.id] = installer.timeVariance || 0;
      });

      form.reset({
        date: editingEntry.date,
        vehicleYear: editingEntry.vehicleYear,
        vehicleMake: editingEntry.vehicleMake,
        vehicleModel: editingEntry.vehicleModel,
        totalWindows: editingEntry.totalWindows,
        durationMinutes: editingEntry.durationMinutes,
        installerIds: editingEntry.installers.map(i => i.id),
        installerTimeVariances,
        dimensions: editingEntry.dimensions.map(d => ({
          lengthInches: d.lengthInches,
          widthInches: d.widthInches,
          filmId: d.filmId,
          description: d.description || "",
        })),
        notes: editingEntry.notes || "",
        redoEntries: editingEntry.redoEntries.map(r => ({
          part: r.part,
          filmId: r.filmId,
          installerId: r.installerId,
          lengthInches: r.lengthInches,
          widthInches: r.widthInches,
          timeMinutes: r.timeMinutes,
        })),
      });

      setDimensions(editingEntry.dimensions.map(d => ({
        lengthInches: d.lengthInches,
        widthInches: d.widthInches,
        filmId: d.filmId,
        description: d.description || "",
      })));

      setRedoEntries(editingEntry.redoEntries.map(r => ({
        part: r.part,
        filmId: r.filmId,
        installerId: r.installerId,
        lengthInches: r.lengthInches,
        widthInches: r.widthInches,
        timeMinutes: r.timeMinutes,
      })));
    }
  }, [editingEntry, form]);

  const createEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const url = editingEntry ? `/api/job-entries/${editingEntry.id}` : "/api/job-entries";
      const method = editingEntry ? "PUT" : "POST";
      
      const payload = {
        ...data,
        dimensions: dimensions.map(dim => ({
          lengthInches: dim.lengthInches,
          widthInches: dim.widthInches,
          filmId: dim.filmId,
          description: dim.description || null,
        })),
        redoEntries: redoEntries,
      };

      return apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: editingEntry ? "Job entry updated" : "Job entry created",
        description: editingEntry ? "The job entry has been updated successfully." : "The job entry has been created successfully.",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    createEntryMutation.mutate(data);
  };

  const addDimension = () => {
    setDimensions([...dimensions, { lengthInches: 0, widthInches: 0, filmId: 0, description: "" }]);
  };

  const removeDimension = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  const updateDimension = (index: number, field: string, value: any) => {
    const updated = [...dimensions];
    updated[index] = { ...updated[index], [field]: value };
    setDimensions(updated);
  };

  const addRedoEntry = () => {
    setRedoEntries([...redoEntries, {
      part: "",
      filmId: 0,
      installerId: "",
      lengthInches: 0,
      widthInches: 0,
      timeMinutes: 0,
    }]);
  };

  const removeRedoEntry = (index: number) => {
    setRedoEntries(redoEntries.filter((_, i) => i !== index));
  };

  const updateRedoEntry = (index: number, field: string, value: any) => {
    const updated = [...redoEntries];
    updated[index] = { ...updated[index], [field]: value };
    setRedoEntries(updated);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Job Information */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Job Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background border-border" {...field} />
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
                    <FormLabel className="text-muted-foreground">Vehicle Year</FormLabel>
                    <FormControl>
                      <Input placeholder="2023" className="bg-background border-border" {...field} />
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
                    <FormLabel className="text-muted-foreground">Vehicle Make</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" className="bg-background border-border" {...field} />
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
                    <FormLabel className="text-muted-foreground">Vehicle Model</FormLabel>
                    <FormControl>
                      <Input placeholder="Camry" className="bg-background border-border" {...field} />
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
                    <FormLabel className="text-muted-foreground">Total Windows</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        className="bg-background border-border"
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
                    <FormLabel className="text-muted-foreground">Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        className="bg-background border-border"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Installer Selection */}
            <div className="space-y-3">
              <FormLabel className="text-muted-foreground">Installers</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {installers.map((installer) => (
                  <div key={installer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={installer.id}
                      checked={form.watch("installerIds").includes(installer.id)}
                      onCheckedChange={(checked) => {
                        const currentIds = form.getValues("installerIds");
                        if (checked) {
                          form.setValue("installerIds", [...currentIds, installer.id]);
                        } else {
                          form.setValue("installerIds", currentIds.filter(id => id !== installer.id));
                        }
                      }}
                    />
                    <label htmlFor={installer.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {installer.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Car Window Assignment */}
        <div className="space-y-4">
          <VisualCarSelector
            installers={installers}
            selectedInstallers={form.watch("installerIds").map(id => installers.find(i => i.id === id)).filter(Boolean) as User[]}
            onWindowAssignmentsChange={(assignments) => {
              setWindowAssignments(assignments);
              
              // Auto-update total windows count based on assigned windows
              form.setValue("totalWindows", assignments.filter(a => a.installerId).length, { shouldValidate: false, shouldDirty: false });
            }}
          />

          {/* Window Assignment Summary */}
          {windowAssignments.filter(w => w.installerId).length > 0 && (
            <Card className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Window Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {windowAssignments.filter(w => w.installerId).map((assignment, index) => {
                    const installer = installers.find(i => i.id === assignment.installerId);
                    return (
                      <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded border">
                        <span className="text-slate-700 dark:text-slate-300">
                          {assignment.windowName}: {installer?.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Installer Time Variance Section */}
        {form.watch("installerIds").length > 0 && (
          <Card className="bg-muted/30 border-muted">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Installer Time Variance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Adjust time variance for each installer (positive = took longer, negative = finished faster)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.watch("installerIds").map((installerId) => {
                const installer = installers.find(i => i.id === installerId);
                const currentVariance = form.watch("installerTimeVariances")?.[installerId] || 0;
                
                return (
                  <div key={installerId} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{installer?.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Time variance: {currentVariance > 0 ? '+' : ''}{currentVariance} minutes
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newVariance = (currentVariance || 0) - 5;
                          form.setValue(`installerTimeVariances.${installerId}`, newVariance);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        -5
                      </Button>
                      <Input
                        type="number"
                        value={currentVariance || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          form.setValue(`installerTimeVariances.${installerId}`, value);
                        }}
                        className="w-20 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newVariance = (currentVariance || 0) + 5;
                          form.setValue(`installerTimeVariances.${installerId}`, newVariance);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        +5
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Dimensions Section */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">Dimensions</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addDimension}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Dimension
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dimensions.map((dimension, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Dimension {index + 1}</h4>
                  {dimensions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDimension(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Length (inches)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={dimension.lengthInches || ""}
                      onChange={(e) => updateDimension(index, "lengthInches", parseFloat(e.target.value) || 0)}
                      className="bg-background border-border"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Width (inches)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={dimension.widthInches || ""}
                      onChange={(e) => updateDimension(index, "widthInches", parseFloat(e.target.value) || 0)}
                      className="bg-background border-border"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Film Type</label>
                    <Select
                      value={dimension.filmId ? dimension.filmId.toString() : ""}
                      onValueChange={(value) => updateDimension(index, "filmId", parseInt(value))}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select film" />
                      </SelectTrigger>
                      <SelectContent>
                        {films.map((film) => (
                          <SelectItem key={film.id} value={film.id.toString()}>
                            {film.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
                    <Input
                      value={dimension.description || ""}
                      onChange={(e) => updateDimension(index, "description", e.target.value)}
                      placeholder="Window description"
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
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
          </CardContent>
        </Card>

        {/* Redo Entries Section */}
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
            {redoEntries.map((redo, index) => {
              // Get films used in the current dimensions for redo selection
              const availableFilms = dimensions
                .filter(dim => dim.filmId)
                .map(dim => films?.find(f => f.id === dim.filmId))
                .filter((film): film is Film => Boolean(film))
                .filter((film, idx, arr) => arr.findIndex(f => f!.id === film.id) === idx); // Remove duplicates
              
              return (
                <RedoEntry
                  key={index}
                  part={redo.part}
                  filmId={redo.filmId}
                  installerId={redo.installerId}
                  lengthInches={redo.lengthInches}
                  widthInches={redo.widthInches}
                  timeMinutes={redo.timeMinutes}
                  installers={installers}
                  availableFilms={availableFilms}
                  onPartChange={(value) => updateRedoEntry(index, "part", value)}
                  onFilmChange={(value) => updateRedoEntry(index, "filmId", value)}
                  onInstallerChange={(value) => updateRedoEntry(index, "installerId", value)}
                  onLengthChange={(value) => updateRedoEntry(index, "lengthInches", value)}
                  onWidthChange={(value) => updateRedoEntry(index, "widthInches", value)}
                  onTimeChange={(value) => updateRedoEntry(index, "timeMinutes", value)}
                  onRemove={() => removeRedoEntry(index)}
                />
              );
            })}
            
            {redoEntries.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No redo entries. Add redo entries for different parts of the vehicle as needed.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any notes about this job..."
                  className="bg-background border-border resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            size="lg"
            disabled={createEntryMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {createEntryMutation.isPending ? (
              <>
                <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                {editingEntry ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editingEntry ? 'Update Job Entry' : 'Create Job Entry'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}