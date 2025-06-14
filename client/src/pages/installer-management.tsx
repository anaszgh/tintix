import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Users, Trash2, Edit } from "lucide-react";
import type { User } from "@shared/schema";
import type { ColumnDef } from "@tanstack/react-table";

export default function InstallerManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstaller, setEditingInstaller] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    hourlyRate: "",
  });

  const { data: installers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/installers"],
  });

  const createInstallerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", "/api/installers", data);
    },
    onSuccess: () => {
      toast({
        title: "Installer Added",
        description: "New installer has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installers"] });
      setIsDialogOpen(false);
      resetForm();
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
        description: "Failed to add installer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateInstallerMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      await apiRequest("PATCH", `/api/installers/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Installer Updated",
        description: "Installer information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installers"] });
      setIsDialogOpen(false);
      resetForm();
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
        description: "Failed to update installer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteInstallerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/installers/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Installer Removed",
        description: "Installer has been removed from the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installers"] });
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
        description: "Failed to remove installer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateHourlyRateMutation = useMutation({
    mutationFn: async ({ id, hourlyRate }: { id: string; hourlyRate: string }) => {
      await apiRequest("PATCH", `/api/users/${id}/hourly-rate`, { hourlyRate });
    },
    onSuccess: () => {
      toast({
        title: "Hourly Rate Updated",
        description: "Installer's hourly rate has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installers"] });
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
        description: "Failed to update hourly rate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({ email: "", firstName: "", lastName: "", hourlyRate: "" });
    setEditingInstaller(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstaller) {
      updateInstallerMutation.mutate({ ...formData, id: editingInstaller.id });
    } else {
      createInstallerMutation.mutate(formData);
    }
  };

  const handleEdit = (installer: User) => {
    setEditingInstaller(installer);
    setFormData({
      email: installer.email || "",
      firstName: installer.firstName || "",
      lastName: installer.lastName || "",
      hourlyRate: installer.hourlyRate || "0.00",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </div>
          <div className="text-sm text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "manager" ? "default" : "secondary"}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "hourlyRate",
      header: "Hourly Rate",
      cell: ({ row }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState(row.original.hourlyRate || "0.00");

        const handleSave = () => {
          if (editValue !== row.original.hourlyRate) {
            updateHourlyRateMutation.mutate({
              id: row.original.id,
              hourlyRate: editValue,
            });
          }
          setIsEditing(false);
        };

        const handleCancel = () => {
          setEditValue(row.original.hourlyRate || "0.00");
          setIsEditing(false);
        };

        if (isEditing) {
          return (
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center space-x-2">
            <span className="font-mono">${Number(row.original.hourlyRate || 0).toFixed(2)}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              disabled={updateHourlyRateMutation.isPending}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
            disabled={createInstallerMutation.isPending || updateInstallerMutation.isPending}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteInstallerMutation.mutate(row.original.id)}
            disabled={deleteInstallerMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (user?.role !== "manager") {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title="Access Denied"
            description="Only managers can access installer management."
          />
          <main className="flex-1 p-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  You don't have permission to access this page.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Installer Management"
          description="Manage installer accounts and permissions"
          actions={
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Installer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingInstaller ? "Edit Installer" : "Add New Installer"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createInstallerMutation.isPending || updateInstallerMutation.isPending}
                    >
                      {editingInstaller ? "Update" : "Add"} Installer
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Installers ({installers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={installers}
                searchKey="firstName"
                searchPlaceholder="Search installers..."
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}