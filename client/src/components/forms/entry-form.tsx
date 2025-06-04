import { useState } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RedoEntry } from "./redo-entry";
import { Plus, Save } from "lucide-react";
import { insertJobEntrySchema } from "@shared/schema";
import { z } from "zod";
import type { User, JobEntryWithDetails } from "@shared/schema";

const formSchema = insertJobEntrySchema.extend({
  date: z.string(),
  installerIds: z.array(z.string()).min(1, "At least one installer must be selected"),
  installerTimeVariances: z.record(z.string(), z.number()), // installer ID -> time variance
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
  const [redoEntries, setRedoEntries] = useState<Array<{ part: string; installerId?: string }>>(
    editingEntry ? editingEntry.redoEntries.map(redo => ({
      part: redo.part,
      installerId: redo.installerId
    })) : []
  );

  const { data: installers = [] } = useQuery<User[]>({
    queryKey: ["/api/installers"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editingEntry ? {
      date: typeof editingEntry.date === 'string' ? editingEntry.date.split('T')[0] : new Date(editingEntry.date).toISOString().split('T')[0],
      installerIds: editingEntry.installers.map(i => i.id),
      installerTimeVariances: editingEntry.installers.reduce((acc, installer) => {
        acc[installer.id] = installer.timeVariance || 0;
        return acc;
      }, {} as Record<string, number>),
      vehicleYear: editingEntry.vehicleYear,
      vehicleMake: editingEntry.vehicleMake,
      vehicleModel: editingEntry.vehicleModel,
      notes: editingEntry.notes || "",
    } : {
      date: new Date().toISOString().split('T')[0],
      installerIds: [],
      installerTimeVariances: {},
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
      notes: "",
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const method = editingEntry ? "PUT" : "POST";
      const url = editingEntry ? `/api/job-entries/${editingEntry.id}` : "/api/job-entries";
      await apiRequest(method, url, {
        ...data,
        redoEntries,
      });
    },
    onSuccess: () => {
      toast({
        title: editingEntry ? "Entry Updated" : "Entry Created",
        description: editingEntry ? "Job entry has been successfully updated." : "Job entry has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      if (!editingEntry) {
        form.reset();
        setRedoEntries([]);
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
    setRedoEntries([...redoEntries, { part: "windshield", installerId: "" }]);
  };

  const removeRedoEntry = (index: number) => {
    setRedoEntries(redoEntries.filter((_, i) => i !== index));
  };

  const updateRedoEntry = (index: number, field: string, value: string) => {
    const updated = [...redoEntries];
    updated[index] = { ...updated[index], [field]: value };
    setRedoEntries(updated);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createEntryMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                installers={installers}
                onPartChange={(value) => updateRedoEntry(index, "part", value)}
                onInstallerChange={(value) => updateRedoEntry(index, "installerId", value)}
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
