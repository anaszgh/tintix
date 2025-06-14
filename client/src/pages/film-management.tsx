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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { insertFilmSchema } from "@shared/schema";
import { z } from "zod";
import type { Film } from "@shared/schema";

const filmFormSchema = insertFilmSchema.extend({
  costPerSqft: z.number().min(0.01, "Cost must be greater than 0"),
  totalSqft: z.number().min(0.01, "Total SQFT must be greater than 0").optional(),
  grossWeight: z.number().min(0.01, "Gross weight must be greater than 0").optional(),
  coreWeight: z.number().min(0, "Core weight cannot be negative").optional(),
  netWeight: z.number().min(0.01, "Net weight must be greater than 0").optional(),
});

const filmTypes = [
  "Ceramic",
  "Carbon", 
  "Dyed",
  "Crystalline",
  "Metallic",
  "Hybrid",
  "Security",
  "Privacy"
];

export default function FilmManagement() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch films
  const { data: films = [], isLoading: filmsLoading } = useQuery<Film[]>({
    queryKey: ["/api/films/all"],
    enabled: !!user,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const form = useForm<z.infer<typeof filmFormSchema>>({
    resolver: zodResolver(filmFormSchema),
    defaultValues: {
      name: "",
      type: "",
      costPerSqft: 0,
      totalSqft: undefined,
      grossWeight: undefined,
      coreWeight: undefined,
      netWeight: undefined,
      isActive: true,
    },
  });

  // Create film mutation
  const createFilmMutation = useMutation({
    mutationFn: async (data: z.infer<typeof filmFormSchema>) => {
      const response = await fetch("/api/films", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create film");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/films"] });
      queryClient.invalidateQueries({ queryKey: ["/api/films/all"] });
      toast({
        title: "Success",
        description: "Film type created successfully",
      });
      form.reset();
      setIsDialogOpen(false);
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
        description: error instanceof Error ? error.message : "Failed to create film type",
        variant: "destructive",
      });
    },
  });

  // Update film mutation
  const updateFilmMutation = useMutation({
    mutationFn: async (data: z.infer<typeof filmFormSchema>) => {
      if (!editingFilm) throw new Error("No film selected for editing");
      const response = await fetch(`/api/films/${editingFilm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update film");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/films"] });
      queryClient.invalidateQueries({ queryKey: ["/api/films/all"] });
      toast({
        title: "Success",
        description: "Film type updated successfully",
      });
      form.reset();
      setEditingFilm(null);
      setIsDialogOpen(false);
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
        description: error instanceof Error ? error.message : "Failed to update film type",
        variant: "destructive",
      });
    },
  });

  // Delete film mutation
  const deleteFilmMutation = useMutation({
    mutationFn: async (filmId: number) => {
      const response = await fetch(`/api/films/${filmId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete film");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/films"] });
      queryClient.invalidateQueries({ queryKey: ["/api/films/all"] });
      toast({
        title: "Success",
        description: "Film type deleted successfully",
      });
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
        description: error instanceof Error ? error.message : "Failed to delete film type",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof filmFormSchema>) => {
    if (editingFilm) {
      updateFilmMutation.mutate(data);
    } else {
      createFilmMutation.mutate(data);
    }
  };

  const handleEdit = (film: Film) => {
    setEditingFilm(film);
    form.reset({
      name: film.name,
      type: film.type,
      costPerSqft: Number(film.costPerSqft),
      isActive: film.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (film: Film) => {
    if (confirm(`Are you sure you want to delete "${film.name}"? This action cannot be undone.`)) {
      deleteFilmMutation.mutate(film.id);
    }
  };

  const openCreateDialog = () => {
    setEditingFilm(null);
    form.reset({
      name: "",
      type: "",
      costPerSqft: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is manager
  if (user?.role !== "manager") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only managers can access film management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Film Management"
          description="Manage film types and pricing"
          actions={
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Film Type
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
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
                              placeholder="e.g. 3M Ceramic 70%" 
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
          }
        />

        <div className="p-6 space-y-6">
          {/* Film Types Table */}
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
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {films.map((film) => (
                      <TableRow key={film.id} className="border-border hover:bg-muted/20">
                        <TableCell className="font-medium text-card-foreground">
                          {film.name}
                        </TableCell>
                        <TableCell className="text-card-foreground">
                          <Badge variant="outline" className="border-border text-muted-foreground">
                            {film.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-card-foreground font-mono">
                          ${Number(film.costPerSqft).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={film.isActive ? "default" : "secondary"}
                            className={film.isActive ? "bg-success text-white" : "bg-muted text-muted-foreground"}
                          >
                            {film.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(film)}
                              className="border-border hover:bg-muted"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(film)}
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!filmsLoading && films.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No film types found. Add your first film type to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}