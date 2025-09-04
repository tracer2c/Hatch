import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Egg, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FertilityDataEntry from "@/components/dashboard/FertilityDataEntry";


interface HouseInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_number: string;
  house_number: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  eggs_injected: number;
  chicks_hatched: number;
  status: string;
}

const FertilityEntryPage = () => {
  const { houseId } = useParams<{ houseId: string }>();
  const navigate = useNavigate();
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [fertilityData, setFertilityData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (houseId) {
      loadHouseInfo();
      loadFertilityData();
    }
  }, [houseId]);

  const loadHouseInfo = async () => {
    if (!houseId) return;
    
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number, house_number),
        machines(id, machine_number, machine_type, location)
      `)
      .eq('id', houseId)
      .single();

    if (error) {
      toast({
        title: "Error loading house",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setHouseInfo({
        id: data.id,
        batch_number: data.batch_number,
        flock_name: data.flocks?.flock_name || '',
        flock_number: data.flocks?.flock_number || 0,
        machine_number: data.machines?.machine_number || '',
        house_number: data.flocks?.house_number || '1',
        set_date: data.set_date,
        expected_hatch_date: data.expected_hatch_date,
        total_eggs_set: data.total_eggs_set,
        eggs_injected: data.eggs_injected ?? 0,
        chicks_hatched: data.chicks_hatched ?? 0,
        status: data.status
      });
    }
  };

  const loadFertilityData = async () => {
    if (!houseId) return;
    
    const { data, error } = await supabase
      .from('fertility_analysis')
      .select('*')
      .eq('batch_id', houseId);

    if (error) {
      toast({
        title: "Error loading fertility data",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setFertilityData(data || []);
    }
  };

  const handleFertilityDataUpdate = async (newData: any[]) => {
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: houseId
    }));
    
    setFertilityData(dataWithBatchId);
    toast({
      title: "Fertility Data Updated",
      description: "Data linked to current house"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'setting': return 'bg-blue-100 text-blue-800';
      case 'incubating': return 'bg-yellow-100 text-yellow-800';
      case 'hatching': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBack = () => {
    navigate('/data-entry');
  };

  if (!houseInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading House Information</h3>
              <p className="text-gray-600">Please wait while we load the house details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4">
        
        {/* Header with Navigation */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Data Entry
          </Button>
          
          {/* Breadcrumb */}
          <div className="text-sm text-gray-600 mb-4">
            Data Entry &gt; {houseInfo.flock_name} # {houseInfo.house_number} &gt; Fertility Analysis
          </div>
          
          {/* House Context Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <Egg className="h-6 w-6 text-green-600" />
                  Fertility Analysis - {houseInfo.flock_name} # {houseInfo.house_number}
                </CardTitle>
                <Badge className={getStatusColor(houseInfo.status)}>
                  {houseInfo.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Flock & House</p>
                  <p className="font-medium">{houseInfo.flock_name} # {houseInfo.house_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Machine</p>
                  <p className="font-medium">{houseInfo.machine_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Set Date</p>
                  <p className="font-medium">{new Date(houseInfo.set_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Eggs</p>
                  <p className="font-medium">{houseInfo.total_eggs_set.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Eggs Injected</p>
                  <p className="font-medium">{houseInfo.eggs_injected.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Chicks Hatched</p>
                  <p className="font-medium">{houseInfo.chicks_hatched.toLocaleString()}</p>
                </div>
                <div className="col-span-2 md:col-span-6">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="md:col-start-5">
                      <p className="text-gray-600">HOI % (Hatched / Injected)</p>
                      <p className="font-medium">{houseInfo.eggs_injected > 0 ? `${((houseInfo.chicks_hatched / houseInfo.eggs_injected) * 100).toFixed(2)}%` : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fertility Data Entry Component */}
        <FertilityDataEntry 
          data={fertilityData} 
          onDataUpdate={handleFertilityDataUpdate}
          batchInfo={{
            id: houseInfo.id,
            batch_number: houseInfo.batch_number,
            flock_name: houseInfo.flock_name,
            flock_number: houseInfo.flock_number
          }}
        />
      </div>
    </div>
  );
};

export default FertilityEntryPage;