import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Thermometer, Droplets, Wrench, Clock, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface MachineInfo {
  id: string;
  machine_number: string;
  machine_type: string;
  status: string | null;
  location: string | null;
  last_maintenance: string | null;
}

interface AlertContext {
  alertId: string;
  alertType: string;
  severity: string;
  message: string;
  currentTemperature?: number;
  currentHumidity?: number;
}

const MachineDetailPage = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [recentReadings, setRecentReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get alert context from navigation state
  const alertContext: AlertContext | null = location.state?.alertContext || null;

  useEffect(() => {
    if (machineId) {
      loadMachineDetails();
      loadRecentReadings();
    }
  }, [machineId]);

  const loadMachineDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('id', machineId)
        .single();

      if (error) throw error;
      setMachine({
        id: data.id,
        machine_number: data.machine_number,
        machine_type: data.machine_type,
        status: data.status,
        location: data.location,
        last_maintenance: data.last_maintenance
      });
    } catch (error) {
      console.error('Error loading machine details:', error);
      toast({
        title: "Error",
        description: "Failed to load machine details",
        variant: "destructive",
      });
    }
  };

  const loadRecentReadings = async () => {
    try {
      // Get batches for this machine first
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('id, batch_number')
        .eq('machine_id', machineId);

      if (batchError) throw batchError;

      if (batchData && batchData.length > 0) {
        const batchIds = batchData.map(b => b.id);
        
        const { data, error } = await supabase
          .from('qa_monitoring')
          .select('*')
          .in('batch_id', batchIds)
          .order('check_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Merge batch info
        const readingsWithBatch = data?.map(reading => ({
          ...reading,
          batches: batchData.find(b => b.id === reading.batch_id)
        })) || [];
        
        setRecentReadings(readingsWithBatch);
      } else {
        setRecentReadings([]);
      }
    } catch (error) {
      console.error('Error loading readings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading machine details...</p>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Machine not found</p>
          <Button onClick={() => navigate('/data-entry')} className="mt-4">
            Back to Data Entry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Alert Context */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/data-entry')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Data Entry
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Machine {machine.machine_number}</h1>
              <p className="text-muted-foreground">{machine.machine_type} • {machine.location}</p>
            </div>
          </div>
          <Badge className={getStatusColor(machine.status)}>
            {machine.status}
          </Badge>
        </div>

        {/* Alert Context Banner */}
        {alertContext && (
          <Alert className="border-l-4 border-l-primary bg-primary/5">
            <div className="flex items-center gap-2">
              {getSeverityIcon(alertContext.severity)}
              <AlertDescription className="flex-1">
                <div className="font-medium">Alert Triggered: {alertContext.alertType}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {alertContext.message}
                  {alertContext.currentTemperature && (
                    <span className="ml-4">Current Temperature: {alertContext.currentTemperature}°F</span>
                  )}
                  {alertContext.currentHumidity && (
                    <span className="ml-4">Current Humidity: {alertContext.currentHumidity}%</span>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Machine Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Service:</span>
                  <span className="text-sm font-medium">
                    {machine.last_maintenance ? new Date(machine.last_maintenance).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Location:</span>
                  <span className="text-sm font-medium">
                    {machine.location || 'Not specified'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Latest Temperature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentReadings[0]?.temperature || '--'}°F
              </div>
              <p className="text-xs text-muted-foreground">
              {recentReadings[0]?.check_date ? 
                  `Recorded ${new Date(recentReadings[0].check_date).toLocaleString()}` : 
                  'No recent readings'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Latest Humidity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentReadings[0]?.humidity || '--'}%
              </div>
              <p className="text-xs text-muted-foreground">
              {recentReadings[0]?.check_date ? 
                  `Recorded ${new Date(recentReadings[0].check_date).toLocaleString()}` : 
                  'No recent readings'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Readings */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Readings History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReadings.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <span>Date</span>
                  <span>Batch</span>
                  <span>Temperature</span>
                  <span>Humidity</span>
                  <span>Status</span>
                </div>
                {recentReadings.map((reading) => (
                  <div key={reading.id} className="grid grid-cols-5 gap-4 text-sm py-2 hover:bg-muted/20 rounded-lg px-2">
                    <span>{new Date(reading.check_date).toLocaleDateString()}</span>
                    <span>{reading.batches?.batch_number || 'N/A'}</span>
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      {reading.temperature}°F
                    </span>
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      {reading.humidity}%
                    </span>
                    <Badge variant={reading.temperature > 100 || reading.humidity > 70 ? 'destructive' : 'secondary'}>
                      {reading.temperature > 100 || reading.humidity > 70 ? 'Alert' : 'Normal'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No recent readings available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={() => navigate(`/data-entry/house/${recentReadings[0]?.batch_id}/qa`)}
            disabled={!recentReadings[0]?.batch_id}
          >
            Record QA Data
          </Button>
          <Button variant="outline">
            Schedule Maintenance
          </Button>
          <Button variant="outline">
            View Full History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MachineDetailPage;