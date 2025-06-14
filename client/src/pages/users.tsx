import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, UserCheck } from "lucide-react";
import type { User } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function UsersPage() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth() as { user: User | null; isAuthenticated: boolean; isLoading: boolean };
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Redirect non-managers
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role !== "manager") {
      toast({
        title: "Access Denied",
        description: "Only managers can access user management.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && user?.role === "manager",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const columns = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }: any) => row.original.email || "No email",
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: any) => {
        const firstName = row.original.firstName || "";
        const lastName = row.original.lastName || "";
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : "No name";
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }: any) => {
        const role = row.original.role;
        return (
          <Badge variant={role === "manager" ? "default" : role === "data_entry" ? "outline" : "secondary"}>
            {role === "manager" ? (
              <>
                <Shield className="w-3 h-3 mr-1" />
                Manager
              </>
            ) : role === "data_entry" ? (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                Data Entry
              </>
            ) : (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                Installer
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const currentUser = row.original;
        const currentRole = currentUser.role;
        
        // Don't allow users to change their own role
        if (currentUser.id === user?.id) {
          return (
            <span className="text-xs text-muted-foreground">Cannot modify own role</span>
          );
        }

        return (
          <Select
            value={currentRole}
            onValueChange={(newRole) => handleRoleChange(currentUser.id, newRole)}
            disabled={updateRoleMutation.isPending}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="installer">Installer</SelectItem>
              <SelectItem value="data_entry">Data Entry</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
  ];

  if (isLoading || !isAuthenticated || user?.role !== "manager") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header
          title="User Management"
          description="Manage user roles and permissions"
          actions={
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{users.length} users</span>
            </div>
          }
        />
        
        <div className="p-8 overflow-y-auto h-full space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={users}
                searchKey="email"
                searchPlaceholder="Search by email..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">Manager</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Can view all job entries</li>
                    <li>• Can create entries for any installer</li>
                    <li>• Can manage user roles</li>
                    <li>• Can view all analytics</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-4 h-4 text-secondary" />
                    <h3 className="font-medium">Installer</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Can view own job entries only</li>
                    <li>• Can create entries for themselves</li>
                    <li>• Can view personal analytics</li>
                    <li>• Cannot manage other users</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}