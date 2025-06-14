import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Car, BarChart3, Plus, List, LogOut, User, Users, Clock, FileText } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const getNavigationForRole = () => {
    const userRole = user?.role || '';
    
    // Data Entry role - Only job entries access
    if (userRole === 'data_entry') {
      return [
        { name: "Job Entries", href: "/entries", icon: Plus, current: location === "/entries" || location === "/", tourId: "job-entries" },
      ];
    }
    
    // Manager and Installer roles - Full access
    return [
      { name: "Dashboard", href: "/", icon: BarChart3, current: location === "/", tourId: "dashboard" },
      { name: "Job Entries", href: "/entries", icon: Plus, current: location === "/entries", tourId: "job-entries" },
      { name: "Reports", href: "/reports", icon: BarChart3, current: location === "/reports", tourId: "reports" },
      { name: "Time Reports", href: "/time-reports", icon: Clock, current: location === "/time-reports", tourId: "time-reports" },
      ...(userRole === "manager" ? [
        { name: "Installer Management", href: "/installers", icon: User, current: location === "/installers", tourId: "installer-management" },
        { name: "User Management", href: "/users", icon: Users, current: location === "/users", tourId: "user-management" },
        { name: "Film Management", href: "/film-management", icon: FileText, current: location === "/film-management", tourId: "film-management" }
      ] : []),
    ];
  };

  const navigation = getNavigationForRole();

  return (
    <aside className="w-64 bg-card border-r border-border flex-shrink-0 flex flex-col" data-tour="navigation">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Car className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-card-foreground">Tintix</h1>
            <p className="text-xs text-muted-foreground">Performance Tracker</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <div 
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                  item.current
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted hover:text-card-foreground"
                }`}
                data-tour={item.tourId}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-6">
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted-foreground/20 rounded-full flex items-center justify-center">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              className="text-muted-foreground hover:text-card-foreground p-1"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
