import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAcknowledgeAlert, useResolveAlert, useDismissAlert } from "@/hooks/useAlerts";
import { AlertTriangle, Thermometer, Droplets, Calendar, Wrench, Check, X, Clock } from "lucide-react";

interface AlertItemProps {
  alert: any;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const dismissAlert = useDismissAlert();

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'humidity': return <Droplets className="h-4 w-4" />;
      case 'critical_day': return <Calendar className="h-4 w-4" />;
      case 'machine_maintenance': return <Wrench className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 border-destructive/20';
      case 'warning': return 'bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800/40';
      case 'info': return 'bg-primary/10 border-primary/20';
      default: return 'bg-muted/10 border-border';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
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
    <div className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getAlertIcon(alert.alert_type)}
          <div>
            <h4 className="font-medium text-card-foreground">{alert.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
          </div>
        </div>
        {getSeverityBadge(alert.severity)}
      </div>

      {/* Alert Details */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTimeAgo(alert.triggered_at)}
        </div>
        
        {alert.batches && (
          <div>House: {alert.batches.batch_number}</div>
        )}
        
        {alert.machines && (
          <div>Machine: {alert.machines.machine_number}</div>
        )}
        
        {alert.batch_day && (
          <div>Day {alert.batch_day}</div>
        )}
        
        {alert.current_temperature && (
          <div>{alert.current_temperature}°F</div>
        )}
        
        {alert.current_humidity && (
          <div>{alert.current_humidity}%</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {alert.status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => acknowledgeAlert.mutate(alert.id)}
            disabled={acknowledgeAlert.isPending}
          >
            <Check className="h-3 w-3 mr-1" />
            Acknowledge
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => resolveAlert.mutate(alert.id)}
          disabled={resolveAlert.isPending}
        >
          <Check className="h-3 w-3 mr-1" />
          Resolve
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dismissAlert.mutate(alert.id)}
          disabled={dismissAlert.isPending}
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
      </div>
      
      {alert.status === 'acknowledged' && (
        <div className="mt-2 text-xs text-muted-foreground">
          Acknowledged {formatTimeAgo(alert.acknowledged_at)} by {alert.acknowledged_by}
        </div>
      )}
    </div>
  );
};

export default AlertItem;