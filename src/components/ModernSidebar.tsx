import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  FileInput, 
  CheckSquare, 
  Settings, 
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Home,
  Workflow,
  ChevronDown,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Upload
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode } from "@/contexts/ViewModeContext";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: Home,
    requiresAuth: true
  },
  {
    path: '/process-flow',
    label: 'Process Flow',
    icon: Workflow,
    requiresAuth: true
  },
  {
    path: '/data-entry',
    label: 'Data Entry',
    icon: FileInput,
    requiresAuth: true
  },
  {
    path: '/bulk-import',
    label: 'Bulk Import',
    icon: Upload,
    requiresAuth: true
  },
  {
    path: '/embrex-data-sheet',
    label: 'Data Sheet',
    icon: FileSpreadsheet,
    requiresAuth: true
  },
  {
    path: '/embrex-timeline',
    label: 'Embrex Timeline',
    icon: TrendingUp,
    requiresAuth: true
  },
  {
    path: '/checklist',
    label: 'Daily Tasks',
    icon: CheckSquare,
    requiresAuth: true
  },
  {
    path: '/chat',
    label: 'Smart Analytics',
    icon: MessageSquare,
    requiresAuth: true
  },
  {
    path: '/management',
    label: 'Management',
    icon: Settings,
    requiresAuth: true,
    requiredRole: 'company_admin' as const
  }
];

const advancedAnalyticsItems = [
  {
    path: '/comparison-model',
    label: 'Comparison Model',
    icon: BarChart3,
    requiresAuth: true,
    requiredRole: undefined
  },
  {
    path: '/unit-comparison',
    label: 'Hatcheries Weekly Comparison',
    icon: BarChart3,
    requiresAuth: true,
    requiredRole: undefined
  },
  {
    path: '/house-flow',
    label: 'House Flow',
    icon: Workflow,
    requiresAuth: true,
    requiredRole: undefined
  }
];

export function ModernSidebar() {
  const { open, setOpen } = useSidebar();
  const collapsed = !open;
  const { user, hasRole } = useAuth();
  const { viewMode } = useViewMode();
  const location = useLocation();
  const currentPath = location.pathname;
  const previousSidebarState = useRef<boolean>(open);

  // Auto-collapse sidebar for Embrex Timeline page
  useEffect(() => {
    if (currentPath === '/embrex-timeline') {
      // Store current state before auto-collapsing
      previousSidebarState.current = open;
      if (open) {
        setOpen(false);
      }
    } else if (currentPath !== '/embrex-timeline' && !open && previousSidebarState.current) {
      // Restore previous state when navigating away from timeline
      setOpen(true);
    }
  }, [currentPath, open, setOpen]);

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, setOpen]);

  const visibleNavItems = navigationItems.filter(item => {
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (item.requiredRole) {
      return hasRole(item.requiredRole);
    }
    return true;
  });

  const visibleAdvancedItems = advancedAnalyticsItems.filter(item => {
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (item.requiredRole) {
      return hasRole(item.requiredRole);
    }
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const hasActiveAdvancedItem = visibleAdvancedItems.some(item => isActive(item.path));

  return (
    <>
      {/* Floating Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-background/80 backdrop-blur-sm",
          "border-2 border-border/50 shadow-lg hover:shadow-xl",
          "transition-all duration-300 ease-out hover:scale-105",
          "hover:bg-accent/50 hover:border-primary/30"
        )}
        onClick={() => setOpen(!open)}
        title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
      >
        {collapsed ? (
          <PanelLeft className="h-5 w-5 transition-transform duration-300" />
        ) : (
          <PanelLeftClose className="h-5 w-5 transition-transform duration-300" />
        )}
      </Button>

      <Sidebar
        side="left"
        variant="sidebar" 
        collapsible="icon"
        className={cn(
          "border-r border-border/30 bg-background/95 backdrop-blur-sm",
          "transition-all duration-300 ease-out"
        )}
      >
        <SidebarContent className="pt-16 px-2">

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center rounded-lg transition-all duration-200",
                          collapsed ? "justify-center p-3 w-10 h-10" : "gap-3 px-3 py-2.5",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <NavLink
                          to={item.path}
                          className="flex items-center w-full h-full"
                        >
                          <Icon className={cn(
                            "flex-shrink-0 transition-colors",
                            collapsed ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          
                          {!collapsed && (
                            <span className="ml-3 text-sm font-medium truncate">
                              {item.label}
                            </span>
                          )}

                          {/* Active indicator for collapsed state */}
                          {active && collapsed && (
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* Advanced Analytics Dropdown - Only in Detailed View */}
                {viewMode === 'detailed' && (
                  <SidebarMenuItem>
                    <Collapsible
                      defaultOpen={hasActiveAdvancedItem}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={collapsed ? "Advanced Analytics" : undefined}
                          className={cn(
                            "group relative flex items-center rounded-lg transition-all duration-200",
                            collapsed ? "justify-center p-3 w-10 h-10" : "gap-3 px-3 py-2.5",
                            hasActiveAdvancedItem
                              ? "bg-accent text-foreground"
                              : "hover:bg-accent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <TrendingUp className={cn(
                            "flex-shrink-0 transition-colors",
                            collapsed ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          
                          {!collapsed && (
                            <>
                              <span className="ml-3 text-sm font-medium truncate">
                                Advanced Analytics
                              </span>
                              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}

                          {/* Active indicator for collapsed state */}
                          {hasActiveAdvancedItem && collapsed && (
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      {!collapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {visibleAdvancedItems.map((item) => {
                              const Icon = item.icon;
                              const active = isActive(item.path);
                              
                              return (
                                <SidebarMenuSubItem key={item.path}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={item.path}
                                       className={cn(
                                         "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                                         active
                                           ? "bg-black text-white shadow-sm"
                                           : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                       )}
                                    >
                                      <Icon className="h-4 w-4 flex-shrink-0" />
                                      <span className="text-sm truncate">
                                        {item.label}
                                      </span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Version Footer */}
          <div className="mt-auto pt-4">
            {!collapsed ? (
              <div className="px-3 py-2 text-center">
                <span className="text-xs text-muted-foreground">v1.1</span>
              </div>
            ) : (
              <div className="px-2 py-2 text-center">
                <span className="text-xs text-muted-foreground">1.1</span>
              </div>
            )}
          </div>

        </SidebarContent>
      </Sidebar>
    </>
  );
}