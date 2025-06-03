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
import type { User } from "@shared/schema";

const formSchema = insertJobEntrySchema.extend({
  date: z.string(),
  installerIds: z.array(z.string()).min(1, "At least one installer must be selected"),
  redoEntries: z.array(z.object({
    part: z.string(),
    timestamp: z.string(),
    installerId: z.string().optional(),
  })).optional(),
});

interface EntryFormProps {
  onSuccess?: () => void;
}

export function EntryForm({ onSuccess }: EntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [redoEntries, setRedoEntries] = useState<Array<{ part: string; timestamp: string; installerId?: string }>>([]);

  const { data: installers = [] } = useQuery<User[]>({
    queryKey: ["/api/installers"],
    enabled: user?.role === "manager",
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      installerIds: user?.role === "installer" ? [user.id] : [],
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
      timeVariance: 0,
      notes: "",
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest("POST", "/api/job-entries", {
        ...data,
        redoEntries,
      });
    },
    onSuccess: () => {
      toast({
        title: "Entry Created",
        description: "Job entry has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      form.reset();
      setRedoEntries([]);
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
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setRedoEntries([...redoEntries, { part: "windshield", timestamp, installerId: "" }]);
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

          {user?.role === "manager" && (
            <FormField
              control={form.control}
              name="installerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">Installers *</FormLabel>
                  <div className="space-y-2 bg-background border border-border rounded-md p-3">
                    {installers.map((installer) => (
                      <div key={installer.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={installer.id}
                          checked={field.value?.includes(installer.id)}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            if (checked) {
                              field.onChange([...currentValue, installer.id]);
                            } else {
                              field.onChange(currentValue.filter(id => id !== installer.id));
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
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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

        <FormField
          control={form.control}
          name="timeVariance"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">Time Variance (minutes) *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Enter positive or negative minutes" 
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  className="bg-background border-border"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Positive for over time, negative for under time
              </p>
            </FormItem>
          )}
        />

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
                timestamp={redo.timestamp}
                installerId={redo.installerId}
                installers={installers}
                onPartChange={(value) => updateRedoEntry(index, "part", value)}
                onTimestampChange={(value) => updateRedoEntry(index, "timestamp", value)}
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
            Save Entry
          </Button>
        </div>
      </form>
    </Form>
  );
}
