import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveAlerts, useCheckAlerts } from "@/hooks/useAlerts";
import { Bell, RefreshCw, AlertTriangle, Thermometer, Droplets, Calendar, Wrench, Check, X, Clock, CheckSquare } from "lucide-react";
import { useAcknowledgeAlert, useResolveAlert, useDismissAlert } from "@/hooks/useAlerts";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: alerts, isLoading } = useActiveAlerts();
  const checkAlerts = useCheckAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const dismissAlert = useDismissAlert();

  const alertCount = alerts?.length || 0;
  const criticalCount = alerts?.filter(alert => alert.severity === 'critical').length || 0;

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'temperature': return <Thermometer className="h-3 w-3" />;
      case 'humidity': return <Droplets className="h-3 w-3" />;
      case 'critical_day': return <Calendar className="h-3 w-3" />;
      case 'machine_maintenance': return <Wrench className="h-3 w-3" />;
      case 'checklist_incomplete': return <CheckSquare className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'warning': return 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'info': return 'border-l-4 border-l-primary bg-primary/5';
      default: return 'border-l-4 border-l-muted';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {alertCount > 0 && (
          <Badge 
            variant={criticalCount > 0 ? "destructive" : "default"}
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-0"
          >
            {alertCount > 99 ? '99+' : alertCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-background border border-border rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                Notifications {alertCount > 0 && `(${alertCount})`}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => checkAlerts.mutate()}
                disabled={checkAlerts.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${checkAlerts.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Alert List */}
            <div className="max-h-80 overflow-y-auto">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading alerts...
                  </div>
                ) : alerts && alerts.length > 0 ? (
                  <div className="divide-y divide-border">
                    {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className={`p-3 hover:bg-muted/50 ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getAlertIcon(alert.alert_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground line-clamp-1">
                                {alert.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {alert.message}
                              </p>
                              
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeAgo(alert.triggered_at)}
                                </div>
                                
                                {alert.batches && (
                                  <span>House: {alert.batches.batch_number}</span>
                                )}
                                
                                {alert.current_temperature && (
                                  <span>{alert.current_temperature}°F</span>
                                )}
                                
                                {alert.current_humidity && (
                                  <span>{alert.current_humidity}%</span>
                                )}
                              </div>
                            </div>
                            
                            <Badge 
                              variant={alert.severity === 'critical' ? 'destructive' : 
                                     alert.severity === 'warning' ? 'default' : 'secondary'}
                              className="text-xs ml-2"
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          
                          {/* Quick Actions */}
                          <div className="flex gap-1 mt-2">
                            {alert.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acknowledgeAlert.mutate(alert.id);
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Ack
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveAlert.mutate(alert.id);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissAlert.mutate(alert.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No notifications</p>
                    <p className="text-sm">All systems operating normally</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Footer */}
            {alerts && alerts.length > 10 && (
              <div className="p-3 border-t border-border text-center">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all {alertCount} notifications
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;