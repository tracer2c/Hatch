import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Home, Calendar, Egg, TrendingUp, AlertTriangle, Activity, Thermometer, Droplets } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface HouseInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  machine_number: string;
  set_date: string;
  total_eggs: number;
  status: string;
  expected_hatch_date: string;
  incubation_day: number;
}

interface AlertContext {
  alertId: string;
  alertType: string;
  severity: string;
  message: string;
  batchDay?: number;
  currentTemperature?: number;
  currentHumidity?: number;
}

const HouseDetailPage = () => {
  const { houseId } = useParams<{ houseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [house, setHouse] = useState<HouseInfo | null>(null);
  const [recentQAData, setRecentQAData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get alert context from navigation state
  const alertContext: AlertContext | null = location.state?.alertContext || null;

  useEffect(() => {
    if (houseId) {
      loadHouseDetails();
      loadRecentQAData();
    }
  }, [houseId]);

  const loadHouseDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks (flock_name),
          machines (machine_number)
        `)
        .eq('id', houseId)
        .single();

      if (error) throw error;
      
      // Calculate incubation day
      const setDate = new Date(data.set_date);
      const today = new Date();
      const incubationDay = Math.floor((today.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      setHouse({
        id: data.id,
        batch_number: data.batch_number,
        flock_name: data.flocks?.flock_name || 'Unknown',
        machine_number: data.machines?.machine_number || 'Unknown',
        set_date: data.set_date,
        total_eggs: data.total_eggs_set || 0,
        status: data.status,
        expected_hatch_date: data.expected_hatch_date,
        incubation_day: incubationDay
      });
    } catch (error) {
      console.error('Error loading house details:', error);
      toast({
        title: "Error",
        description: "Failed to load house details",
        variant: "destructive",
      });
    }
  };

  const loadRecentQAData = async () => {
    try {
      const { data, error } = await supabase
        .from('qa_monitoring')
        .select('*')
        .eq('batch_id', houseId)
        .order('monitoring_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setRecentQAData(data || []);
    } catch (error) {
      console.error('Error loading QA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'setting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'hatching': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
          <p>Loading house details...</p>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>House not found</p>
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
              <h1 className="text-3xl font-bold">House {house.batch_number}</h1>
              <p className="text-muted-foreground">
                {house.flock_name} • Machine {house.machine_number} • Day {house.incubation_day}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(house.status)}>
            {house.status}
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
                  {alertContext.batchDay && (
                    <span className="ml-4">Incubation Day: {alertContext.batchDay}</span>
                  )}
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

        {/* House Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Set Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {new Date(house.set_date).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected Hatch: {new Date(house.expected_hatch_date).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Egg className="h-5 w-5" />
                Total Eggs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {house.total_eggs?.toLocaleString() || '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Set in incubator
              </p>
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
              <div className="text-lg font-bold">
                {recentQAData[0]?.temperature || '--'}°F
              </div>
              <p className="text-xs text-muted-foreground">
              {recentQAData[0]?.check_date ? 
                  `Recorded ${new Date(recentQAData[0].check_date).toLocaleDateString()}` : 
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
              <div className="text-lg font-bold">
                {recentQAData[0]?.humidity || '--'}%
              </div>
              <p className="text-xs text-muted-foreground">
              {recentQAData[0]?.check_date ? 
                  `Recorded ${new Date(recentQAData[0].check_date).toLocaleDateString()}` : 
                  'No recent readings'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent QA Data */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent QA Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentQAData.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <span>Date</span>
                  <span>Temperature</span>
                  <span>Humidity</span>
                  <span>Status</span>
                </div>
                {recentQAData.map((qa) => (
                  <div key={qa.id} className="grid grid-cols-4 gap-4 text-sm py-2 hover:bg-muted/20 rounded-lg px-2">
                    <span>{new Date(qa.check_date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      {qa.temperature}°F
                    </span>
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      {qa.humidity}%
                    </span>
                    <Badge variant={qa.temperature > 100 || qa.humidity > 70 ? 'destructive' : 'secondary'}>
                      {qa.temperature > 100 || qa.humidity > 70 ? 'Alert' : 'Normal'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-8 w-8 mx-auto mb-2" />
                <p>No QA data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button onClick={() => navigate(`/data-entry/house/${house.id}/qa`)}>
            Record QA Data
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`/data-entry/house/${house.id}/fertility`)}
          >
            Record Fertility
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`/checklist/house/${house.id}`)}
          >
            Daily Checklist
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HouseDetailPage;