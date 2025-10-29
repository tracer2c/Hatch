import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart3, FileInput, CheckSquare, Settings, MessageSquare, LogOut, User } from "lucide-react";
import NotificationBell from "@/components/alerts/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const location = useLocation();
  const { user, profile, signOut, hasRole } = useAuth();

  const navItems = [
    {
      path: '/',
      label: 'Overview',
      icon: BarChart3,
      requiresAuth: true
    },
    {
      path: '/performance',
      label: 'Performance',
      icon: BarChart3,
      requiresAuth: true
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      requiresAuth: true
    },
    {
      path: '/data-entry',
      label: 'Data Entry',
      icon: FileInput,
      requiresAuth: true
    },
    {
      path: '/checklist',
      label: 'Checklist',
      icon: CheckSquare,
      requiresAuth: true
    },
    {
      path: '/management',
      label: 'Management',
      icon: Settings,
      requiresAuth: true,
      requiredRole: 'company_admin' as const
    },
    {
      path: '/chat',
      label: 'Smart Analytics',
      icon: MessageSquare,
      requiresAuth: true
    }
  ];

  const visibleNavItems = navItems.filter(item => {
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (item.requiredRole) {
      return hasRole(item.requiredRole);
    }
    return true;
  });

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Hatchery Pro</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? 'bg-secondary text-secondary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <NotificationBell />
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuItem className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {profile?.first_name && profile?.last_name 
                        ? `${profile.first_name} ${profile.last_name}`
                        : user.email
                      }
                    </span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;