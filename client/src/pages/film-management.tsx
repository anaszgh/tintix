import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { insertFilmSchema, type Film } from "@shared/schema";

const filmTypes = [
  "Window Tint",
  "Paint Protection Film", 
  "Ceramic Coating",
  "Vinyl Wrap",
  "Clear Bra",
  "Security Film"
];

const formSchema = insertFilmSchema.extend({
  costPerSqft: z.number().min(0.01, "Cost must be greater than 0"),
  totalSqft: z.number().optional().nullable(),
  grossWeight: z.number().optional().nullable(),
  coreWeight: z.number().optional().nullable(),
  netWeight: z.number().optional().nullable(),
});

export default function FilmManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [calculatedNetWeight, setCalculatedNetWeight] = useState<number | null>(null);
  const [weightPerSqft, setWeightPerSqft] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      costPerSqft: 0,
      isActive: true,
      totalSqft: null,
      grossWeight: null,
      coreWeight: null,
      netWeight: null,
    },
  });

  const { data: films = [], isLoading: filmsLoading } = useQuery<Film[]>({
    queryKey: ['/api/films'],
  });

  const createFilmMutation = useMutation({
    mutationFn: (filmData: z.infer<typeof formSchema>) => 
      apiRequest('POST', '/api/films', filmData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/films'] });
      toast({ title: "Film type created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error creating film type", description: error.message, variant: "destructive" });
    }
  });

  const updateFilmMutation = useMutation({
    mutationFn: ({ id, ...filmData }: { id: number } & z.infer<typeof formSchema>) => 
      apiRequest('PATCH', `/api/films/${id}`, filmData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/films'] });
      toast({ title: "Film type updated successfully" });
      setIsDialogOpen(false);
      form.reset();
      setEditingFilm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating film type", description: error.message, variant: "destructive" });
    }
  });

  const deleteFilmMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/films/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/films'] });
      toast({ title: "Film type deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting film type", description: error.message, variant: "destructive" });
    }
  });

  const resetCalculatedFields = () => {
    setCalculatedNetWeight(null);
    setWeightPerSqft(null);
  };

  const calculateWeights = (grossWeight: number, coreWeight: number, totalSqft: number) => {
    const netWeight = grossWeight - coreWeight;
    const weightPerSqftValue = netWeight / totalSqft;
    
    setCalculatedNetWeight(netWeight);
    setWeightPerSqft(weightPerSqftValue);
    form.setValue('netWeight', netWeight.toString());
  };

  const openCreateDialog = () => {
    setEditingFilm(null);
    form.reset();
    resetCalculatedFields();
    setIsDialogOpen(true);
  };

  const handleEdit = (film: Film) => {
    setEditingFilm(film);
    form.reset({
      name: film.name,
      type: film.type,
      costPerSqft: Number(film.costPerSqft),
      isActive: film.isActive,
      totalSqft: film.totalSqft || undefined,
      grossWeight: film.grossWeight || undefined,
      coreWeight: film.coreWeight || undefined,
      netWeight: film.netWeight || undefined,
    });
    
    // Recalculate weights if all values are present
    if (film.grossWeight && film.coreWeight !== undefined && film.totalSqft) {
      calculateWeights(Number(film.grossWeight), Number(film.coreWeight), Number(film.totalSqft));
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = (film: Film) => {
    if (confirm(`Are you sure you want to delete "${film.name}"?`)) {
      deleteFilmMutation.mutate(film.id);
    }
  };

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingFilm) {
      updateFilmMutation.mutate({ id: editingFilm.id, ...data });
    } else {
      createFilmMutation.mutate(data);
    }
  };

  if (!user || user.role !== 'manager') {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only managers can access film management.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Film Management</h1>
            <p className="text-muted-foreground">Manage film types and pricing</p>
          </div>
          <Button 
            onClick={openCreateDialog}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Film Type
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">
                {editingFilm ? "Edit Film Type" : "Add New Film Type"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Film Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 36 XR+ 20%"
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Film Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Select film type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filmTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costPerSqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Cost per Sq Ft *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 8.50"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          className="bg-background border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Weight Specifications (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="totalSqft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Total SQFT in Roll</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="e.g. 150.00"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange(value);
                                
                                const grossWeight = form.getValues('grossWeight');
                                const coreWeight = form.getValues('coreWeight');
                                if (grossWeight && coreWeight !== undefined && value) {
                                  calculateWeights(grossWeight, coreWeight, value);
                                }
                              }}
                              className="bg-background border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grossWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Gross Weight (grams)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="e.g. 2500.00"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange(value);
                                
                                const coreWeight = form.getValues('coreWeight');
                                const totalSqft = form.getValues('totalSqft');
                                if (value && coreWeight !== undefined && totalSqft) {
                                  calculateWeights(value, coreWeight, totalSqft);
                                }
                              }}
                              className="bg-background border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="coreWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Core Weight (grams)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="e.g. 500.00"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange(value);
                                
                                const grossWeight = form.getValues('grossWeight');
                                const totalSqft = form.getValues('totalSqft');
                                if (grossWeight && value !== undefined && totalSqft) {
                                  calculateWeights(grossWeight, value, totalSqft);
                                }
                              }}
                              className="bg-background border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="netWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Net Weight (grams) - Auto Calculated</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Auto-calculated"
                              {...field}
                              value={calculatedNetWeight !== null ? calculatedNetWeight : field.value || ''}
                              readOnly
                              className="bg-gray-50 dark:bg-gray-800 border-border text-muted-foreground"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {weightPerSqft !== null && weightPerSqft > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Weight per Square Foot: {weightPerSqft.toFixed(2)} grams/sq ft
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-border hover:bg-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createFilmMutation.isPending || updateFilmMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {editingFilm ? "Update" : "Create"} Film Type
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <div className="p-6 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Film Types & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filmsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Film Name</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Cost per Sq Ft</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {films.map((film) => (
                      <TableRow key={film.id} className="border-border hover:bg-muted/50">
                        <TableCell className="font-medium text-card-foreground">{film.name}</TableCell>
                        <TableCell className="text-muted-foreground">{film.type}</TableCell>
                        <TableCell className="text-muted-foreground">${Number(film.costPerSqft).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={film.isActive ? "default" : "secondary"} className="text-xs">
                            {film.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(film)}
                              className="border-border hover:bg-muted"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(film)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}