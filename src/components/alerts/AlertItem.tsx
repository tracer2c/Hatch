import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAcknowledgeAlert, useResolveAlert, useDismissAlert } from "@/hooks/useAlerts";
import { Info, Thermometer, Droplets, Calendar, Wrench, Check, X, Clock, Eye, Wind, RotateCcw, Skull, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AlertItemProps {
  alert: any;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const dismissAlert = useDismissAlert();
  const navigate = useNavigate();

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'humidity': return <Droplets className="h-4 w-4" />;
      case 'critical_day': return <Calendar className="h-4 w-4" />;
      case 'machine_maintenance': return <Wrench className="h-4 w-4" />;
      case 'co2_level': return <Wind className="h-4 w-4" />;
      case 'ventilation_rate': return <Wind className="h-4 w-4" />;
      case 'turning_frequency': return <RotateCcw className="h-4 w-4" />;
      case 'mortality_spike': return <Skull className="h-4 w-4" />;
      case 'hatch_approaching': return <Clock className="h-4 w-4" />;
      case 'batch_status_change': return <TrendingUp className="h-4 w-4" />;
      case 'checklist_incomplete': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40';
      case 'warning': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/40';
      case 'info': return 'bg-primary/10 border-primary/20';
      default: return 'bg-muted/10 border-border';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200">Needs Attention</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200">Monitor</Badge>;
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

  const handleViewDetails = () => {
    const alertContext = {
      alertId: alert.id,
      alertType: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      batchDay: alert.batch_day,
      currentTemperature: alert.current_temperature,
      currentHumidity: alert.current_humidity,
      co2Level: alert.co2_level,
      ventilationRate: alert.ventilation_rate,
      turningFrequency: alert.turning_frequency,
      mortalityCount: alert.mortality_count
    };

    if (alert.batch_id) {
      // Navigate to house detail page with alert context
      navigate(`/house-detail/${alert.batch_id}`, { 
        state: { alertContext } 
      });
    } else if (alert.machine_id) {
      // Navigate to machine detail page with alert context
      navigate(`/machine-detail/${alert.machine_id}`, { 
        state: { alertContext } 
      });
    } else {
      // Fallback to data entry page
      navigate(`/data-entry`);
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} cursor-pointer hover:shadow-md transition-shadow`}
         onClick={handleViewDetails}>
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

        {alert.co2_level && (
          <div>{alert.co2_level} ppm CO2</div>
        )}

        {alert.ventilation_rate && (
          <div>{alert.ventilation_rate} CFM</div>
        )}

        {alert.turning_frequency && (
          <div>{alert.turning_frequency}/day turns</div>
        )}

        {alert.mortality_count && (
          <div>{alert.mortality_count} deaths</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
        >
          <Eye className="h-3 w-3 mr-1" />
          View Details
        </Button>
        
        {alert.status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              acknowledgeAlert.mutate(alert.id);
            }}
            disabled={acknowledgeAlert.isPending}
          >
            <Check className="h-3 w-3 mr-1" />
            Acknowledge
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            resolveAlert.mutate(alert.id);
          }}
          disabled={resolveAlert.isPending}
        >
          <Check className="h-3 w-3 mr-1" />
          Resolve
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            dismissAlert.mutate(alert.id);
          }}
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