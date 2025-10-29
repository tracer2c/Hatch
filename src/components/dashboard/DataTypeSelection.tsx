import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Egg, Activity, AlertTriangle, ArrowLeft, Info, Syringe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  status: string;
}

interface DataTypeSelectionProps {
  houseId: string;
  onBack: () => void;
}

const DataTypeSelection = ({ houseId, onBack }: DataTypeSelectionProps) => {
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [dataCounts, setDataCounts] = useState({
    eggPack: 0,
    fertility: 0,
    qa: 0,
    residue: 0,
    clearsInjected: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (houseId) {
      loadHouseInfo();
      loadDataCounts();
    }
  }, [houseId]);

  const loadHouseInfo = async () => {
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
        status: data.status
      });
    }
  };

  const loadDataCounts = async () => {
    const [eggPackResult, fertilityResult, qaResult, residueResult, clearsInjectedResult] = await Promise.all([
      supabase.from('egg_pack_quality').select('id', { count: 'exact' }).eq('batch_id', houseId),
      supabase.from('fertility_analysis').select('id', { count: 'exact' }).eq('batch_id', houseId),
      supabase.from('qa_monitoring').select('id', { count: 'exact' }).eq('batch_id', houseId),
      supabase.from('residue_analysis').select('id', { count: 'exact' }).eq('batch_id', houseId),
      supabase.from('batches').select('eggs_cleared, eggs_injected').eq('id', houseId).single()
    ]);

    // For clears & injected, check if either value exists and is not null
    const clearsInjectedCount = clearsInjectedResult.data && 
      ((clearsInjectedResult.data as any).eggs_cleared !== null || (clearsInjectedResult.data as any).eggs_injected !== null) ? 1 : 0;

    setDataCounts({
      eggPack: eggPackResult.count || 0,
      fertility: fertilityResult.count || 0,
      qa: qaResult.count || 0,
      residue: residueResult.count || 0,
      clearsInjected: clearsInjectedCount
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

  const dataTypes = [
    {
      id: 'egg-pack',
      title: 'Egg Pack Quality',
      description: 'Record egg quality, grading, and pack specifications',
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      count: dataCounts.eggPack,
      route: `/data-entry/house/${houseId}/egg-pack`
    },
    {
      id: 'fertility',
      title: 'Fertility Analysis',
      description: 'Track fertility rates, early/late dead, and hatch data',
      icon: Egg,
      color: 'from-green-500 to-green-600',
      count: dataCounts.fertility,
      route: `/data-entry/house/${houseId}/fertility`
    },
    {
      id: 'qa',
      title: 'Quality Assurance',
      description: 'Monitor temperature, humidity, and incubation conditions',
      icon: Activity,
      color: 'from-purple-500 to-purple-600',
      count: dataCounts.qa,
      route: `/data-entry/house/${houseId}/qa`
    },
    {
      id: 'residue',
      title: 'Residue Analysis',
      description: 'Analyze unhatched eggs, contamination, and pathology',
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      count: dataCounts.residue,
      route: `/data-entry/house/${houseId}/residue`
    },
    {
      id: 'clears-injected',
      title: 'Clears & Injected',
      description: 'Record the number of cleared and injected eggs',
      icon: Syringe,
      color: 'from-blue-500 to-blue-600',
      count: dataCounts.clearsInjected,
      route: `/data-entry/house/${houseId}/clears-injected`
    }
  ];

  if (!houseInfo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading House Information</h3>
          <p className="text-gray-600">Please wait while we load the house details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to House Selection
          </Button>
          
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {houseInfo.flock_name} #{houseInfo.house_number}
              </h1>
              <Badge className={getStatusColor(houseInfo.status)}>
                {houseInfo.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Flock</p>
                <p className="font-medium">{houseInfo.flock_number} - {houseInfo.flock_name}</p>
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
            </div>
          </div>
        </div>

        {/* Data Type Selection */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Data Entry Type</h2>
          <p className="text-gray-600 mb-6">Choose what type of data you want to enter for this house</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataTypes.map((dataType) => {
            const IconComponent = dataType.icon;
            return (
              <Card 
                key={dataType.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105 border-2 hover:border-blue-200"
                onClick={() => navigate(dataType.route)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${dataType.color} text-white`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    {dataType.count > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {dataType.count} record{dataType.count === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{dataType.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{dataType.description}</p>
                  <Button className="w-full" variant="outline">
                    Enter Data
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DataTypeSelection;