import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Package, Plus, History, Settings, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";

interface FilmInventory {
  id: number;
  filmId: number;
  currentStock: string;
  minimumStock: string;
  createdAt: string;
  updatedAt: string;
}

interface FilmWithInventory {
  id: number;
  name: string;
  type: string;
  costPerSqft: string;
  isActive: boolean;
  inventory?: FilmInventory;
}

interface InventoryTransaction {
  id: number;
  filmId: number;
  type: string;
  quantity: string;
  previousStock: string;
  newStock: string;
  jobEntryId?: number;
  notes?: string;
  createdAt: string;
  film: {
    id: number;
    name: string;
    type: string;
  };
  createdByUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
  jobEntry?: {
    id: number;
    jobNumber: string;
  };
}

export default function Inventory() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFilm, setSelectedFilm] = useState<FilmWithInventory | null>(null);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [adjustStockOpen, setAdjustStockOpen] = useState(false);
  const [setMinimumOpen, setSetMinimumOpen] = useState(false);

  const { data: inventory = [], isLoading } = useQuery<FilmWithInventory[]>({
    queryKey: ["/api/inventory"],
    enabled: !!user,
  });

  const { data: lowStockFilms = [] } = useQuery<FilmWithInventory[]>({
    queryKey: ["/api/inventory/low-stock"],
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery<InventoryTransaction[]>({
    queryKey: ["/api/inventory/transactions"],
    enabled: !!user,
  });

  const addStockMutation = useMutation({
    mutationFn: async ({ filmId, quantity, notes }: { filmId: number; quantity: number; notes?: string }) => {
      const response = await fetch(`/api/inventory/${filmId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, notes }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: "Success", description: "Inventory added successfully" });
      setAddStockOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add inventory",
        variant: "destructive" 
      });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ filmId, newStock, notes }: { filmId: number; newStock: number; notes?: string }) => {
      const response = await fetch(`/api/inventory/${filmId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStock, notes }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: "Success", description: "Inventory adjusted successfully" });
      setAdjustStockOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to adjust inventory",
        variant: "destructive" 
      });
    },
  });

  const setMinimumMutation = useMutation({
    mutationFn: async ({ filmId, minimumStock }: { filmId: number; minimumStock: number }) => {
      const response = await fetch(`/api/inventory/${filmId}/minimum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minimumStock }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: "Success", description: "Minimum stock updated successfully" });
      setSetMinimumOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update minimum stock",
        variant: "destructive" 
      });
    },
  });

  const getStockLevel = (film: FilmWithInventory): number => {
    return film.inventory ? Number(film.inventory.currentStock) : 0;
  };

  const getMinimumStock = (film: FilmWithInventory): number => {
    return film.inventory ? Number(film.inventory.minimumStock) : 0;
  };

  const isLowStock = (film: FilmWithInventory): boolean => {
    return getStockLevel(film) <= getMinimumStock(film) && getMinimumStock(film) > 0;
  };

  // Calculate weight per SQFT based on film specifications
  const getWeightPerSqft = (film: FilmWithInventory): number => {
    const totalSqft = (film as any).totalSqft;
    const netWeight = (film as any).netWeight;
    if (!totalSqft || !netWeight || Number(totalSqft) === 0) return 0;
    return Number(netWeight) / Number(totalSqft);
  };

  // Calculate current stock in grams
  const getStockInGrams = (film: FilmWithInventory): number => {
    const weightPerSqft = getWeightPerSqft(film);
    const stockSqft = getStockLevel(film);
    return weightPerSqft * stockSqft;
  };

  // Format stock display showing both SQFT and grams
  const formatStockDisplay = (film: FilmWithInventory): string => {
    const sqft = getStockLevel(film);
    const grams = getStockInGrams(film);
    
    if (grams > 0) {
      return `${sqft.toFixed(1)} sq ft (${grams.toFixed(0)}g)`;
    }
    return `${sqft.toFixed(1)} sq ft`;
  };

  const getStockStatus = (film: FilmWithInventory) => {
    const current = getStockLevel(film);
    const minimum = getMinimumStock(film);
    
    if (minimum === 0) {
      return { status: 'unknown', color: 'gray', text: 'No minimum set' };
    }
    
    if (current <= minimum) {
      return { status: 'low', color: 'red', text: 'Low Stock' };
    } else if (current <= minimum * 1.5) {
      return { status: 'approaching', color: 'yellow', text: 'Approaching Limit' };
    } else {
      return { status: 'good', color: 'green', text: 'Good Stock' };
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'low': return 'destructive';
      case 'approaching': return 'outline';
      case 'good': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'low': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'approaching': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'good': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getStockIcon = (film: FilmWithInventory) => {
    const status = getStockStatus(film);
    switch (status.status) {
      case "low":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "approaching":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStockBadgeVariant = (film: FilmWithInventory) => {
    const status = getStockStatus(film);
    switch (status.status) {
      case "low":
        return "destructive" as const;
      case "approaching":
        return "secondary" as const;
      case "good":
        return "default" as const;
      default:
        return "outline" as const;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Film Inventory Management</h1>
          <p className="text-muted-foreground">Track film stock levels and manage inventory</p>
        </div>
      </div>

      {lowStockFilms.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockFilms.map((film) => (
                <div key={film.id} className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900 rounded">
                  <div className="flex items-center gap-3">
                    {getStockIcon(film)}
                    <div>
                      <div className="font-semibold text-orange-900 dark:text-orange-100">{film.name}</div>
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        {formatStockDisplay(film)} remaining
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">Low Stock</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Inventory Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventory.map((film) => (
              <Card key={film.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStockIcon(film)}
                      <CardTitle className="text-lg">{film.name}</CardTitle>
                    </div>
                    <Badge variant={getStockBadgeVariant(film)} className={getStatusBadgeColor(getStockStatus(film).status)}>
                      {getStockStatus(film).text}
                    </Badge>
                  </div>
                  <CardDescription>
                    {film.type} • ${Number(film.costPerSqft).toFixed(2)}/sq ft
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Current Stock:</span>
                      <span className="font-medium">{formatStockDisplay(film)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Minimum Stock:</span>
                      <span className="font-medium">{getMinimumStock(film)} sq ft</span>
                    </div>
                    
                    {user?.role === "manager" && (
                      <div className="flex gap-2 pt-4">
                        <Dialog open={addStockOpen && selectedFilm?.id === film.id} onOpenChange={setAddStockOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedFilm(film)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Stock - {selectedFilm?.name}</DialogTitle>
                              <DialogDescription>
                                Add inventory to this film type
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const quantity = Number(formData.get("quantity"));
                                const notes = formData.get("notes") as string;
                                
                                if (selectedFilm && quantity > 0) {
                                  addStockMutation.mutate({
                                    filmId: selectedFilm.id,
                                    quantity,
                                    notes: notes || undefined,
                                  });
                                }
                              }}
                              className="space-y-4"
                            >
                              <div>
                                <Label htmlFor="quantity">Quantity (sq ft)</Label>
                                <Input
                                  id="quantity"
                                  name="quantity"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  required
                                  placeholder="Enter quantity to add"
                                  onChange={(e) => {
                                    const sqft = Number(e.target.value);
                                    const weightPerSqft = getWeightPerSqft(selectedFilm || film);
                                    const grams = sqft * weightPerSqft;
                                    const addWeightDisplay = document.getElementById('addWeightDisplay');
                                    if (addWeightDisplay && grams > 0) {
                                      addWeightDisplay.textContent = `≈ ${grams.toFixed(0)} grams`;
                                    } else if (addWeightDisplay) {
                                      addWeightDisplay.textContent = '';
                                    }
                                  }}
                                />
                                {getWeightPerSqft(selectedFilm || film) > 0 && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    <span id="addWeightDisplay"></span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="notes">Notes (optional)</Label>
                                <Textarea
                                  id="notes"
                                  name="notes"
                                  placeholder="Add notes about this stock addition"
                                />
                              </div>
                              <DialogFooter>
                                <Button type="submit" disabled={addStockMutation.isPending}>
                                  {addStockMutation.isPending ? "Adding..." : "Add Stock"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={adjustStockOpen && selectedFilm?.id === film.id} onOpenChange={setAdjustStockOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedFilm(film)}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Adjust
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adjust Stock - {selectedFilm?.name}</DialogTitle>
                              <DialogDescription>
                                Set the exact stock level for this film type
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const newStock = Number(formData.get("newStock"));
                                const notes = formData.get("notes") as string;
                                
                                if (selectedFilm && newStock >= 0) {
                                  adjustStockMutation.mutate({
                                    filmId: selectedFilm.id,
                                    newStock,
                                    notes: notes || undefined,
                                  });
                                }
                              }}
                              className="space-y-4"
                            >
                              <div>
                                <Label htmlFor="newStock">New Stock Level (sq ft)</Label>
                                <Input
                                  id="newStock"
                                  name="newStock"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={getStockLevel(selectedFilm || film)}
                                  required
                                  placeholder="Enter new stock level"
                                  onChange={(e) => {
                                    const sqft = Number(e.target.value);
                                    const weightPerSqft = getWeightPerSqft(selectedFilm || film);
                                    const grams = sqft * weightPerSqft;
                                    const weightDisplay = document.getElementById('weightDisplay');
                                    if (weightDisplay && grams > 0) {
                                      weightDisplay.textContent = `≈ ${grams.toFixed(0)} grams`;
                                    } else if (weightDisplay) {
                                      weightDisplay.textContent = '';
                                    }
                                  }}
                                />
                                {getWeightPerSqft(selectedFilm || film) > 0 && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    <span id="weightDisplay">≈ {(getStockLevel(selectedFilm || film) * getWeightPerSqft(selectedFilm || film)).toFixed(0)} grams</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="notes">Notes (optional)</Label>
                                <Textarea
                                  id="notes"
                                  name="notes"
                                  placeholder="Add notes about this adjustment"
                                />
                              </div>
                              <DialogFooter>
                                <Button type="submit" disabled={adjustStockMutation.isPending}>
                                  {adjustStockMutation.isPending ? "Adjusting..." : "Adjust Stock"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={setMinimumOpen && selectedFilm?.id === film.id} onOpenChange={setSetMinimumOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedFilm(film)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Min
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Set Minimum Stock - {selectedFilm?.name}</DialogTitle>
                              <DialogDescription>
                                Set the minimum stock threshold for low stock alerts
                              </DialogDescription>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const minimumStock = Number(formData.get("minimumStock"));
                                
                                if (selectedFilm && minimumStock >= 0) {
                                  setMinimumMutation.mutate({
                                    filmId: selectedFilm.id,
                                    minimumStock,
                                  });
                                }
                              }}
                              className="space-y-4"
                            >
                              <div>
                                <Label htmlFor="minimumStock">Minimum Stock (sq ft)</Label>
                                <Input
                                  id="minimumStock"
                                  name="minimumStock"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={getMinimumStock(selectedFilm || film)}
                                  required
                                  placeholder="Enter minimum stock level"
                                />
                              </div>
                              <DialogFooter>
                                <Button type="submit" disabled={setMinimumMutation.isPending}>
                                  {setMinimumMutation.isPending ? "Setting..." : "Set Minimum"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Inventory Transactions
              </CardTitle>
              <CardDescription>
                View all inventory movements and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No inventory transactions found
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.film.name}</span>
                          <Badge variant={
                            transaction.type === "addition" ? "default" :
                            transaction.type === "deduction" ? "destructive" : "secondary"
                          }>
                            {transaction.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {transaction.type === "addition" && "+"}{Number(transaction.quantity).toFixed(2)} sq ft
                          • {transaction.previousStock} → {transaction.newStock} sq ft
                        </div>
                        {transaction.notes && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {transaction.notes}
                          </div>
                        )}
                        {transaction.jobEntry && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Job: {transaction.jobEntry.jobNumber}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{formatDate(transaction.createdAt)}</div>
                        <div>{transaction.createdByUser.firstName} {transaction.createdByUser.lastName}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}