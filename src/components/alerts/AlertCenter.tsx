import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveAlerts, useCheckAlerts } from "@/hooks/useAlerts";
import { AlertTriangle, Bell, RefreshCw, Thermometer, Droplets, Calendar, Wrench } from "lucide-react";
import AlertItem from "./AlertItem";

const AlertCenter = () => {
  const { data: alerts, isLoading } = useActiveAlerts();
  const checkAlerts = useCheckAlerts();

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'humidity': return <Droplets className="h-4 w-4" />;
      case 'critical_day': return <Calendar className="h-4 w-4" />;
      case 'machine_maintenance': return <Wrench className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const criticalCount = alerts?.filter(alert => alert.severity === 'critical').length || 0;
  const warningCount = alerts?.filter(alert => alert.severity === 'warning').length || 0;
  const infoCount = alerts?.filter(alert => alert.severity === 'info').length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Center
            {alerts && alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkAlerts.mutate()}
            disabled={checkAlerts.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkAlerts.isPending ? 'animate-spin' : ''}`} />
            Check Alerts
          </Button>
        </div>
        
        {/* Alert Summary */}
        <div className="flex gap-2 mt-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} Critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="default" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} Warning
            </Badge>
          )}
          {infoCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {infoCount} Info
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {alerts && alerts.length > 0 ? (
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No Active Alerts</p>
            <p className="text-sm">All systems are operating normally</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertCenter;