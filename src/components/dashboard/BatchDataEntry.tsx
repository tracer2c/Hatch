import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, Egg, Activity, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import EggPackDataEntry from "./EggPackDataEntry";
import FertilityDataEntry from "./FertilityDataEntry";
import QADataEntry from "./QADataEntry";
import ResidueDataEntry from "./ResidueDataEntry";
import HOIEntry from "./HOIEntry";

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_id: string;
  machine_number: string;
  house_number: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  eggs_injected: number;
  chicks_hatched: number;
}

interface BatchDataEntryProps {
  batchId: string;
}

const BatchDataEntry = ({ batchId }: BatchDataEntryProps) => {
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [eggPackData, setEggPackData] = useState([]);
  const [fertilityData, setFertilityData] = useState([]);
  const [qaData, setQAData] = useState([]);
  const [residueData, setResidueData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (batchId) {
      loadBatchInfo();
      loadAllData();
    }
  }, [batchId]);

  const loadBatchInfo = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number, house_number),
        machines(id, machine_number, machine_type, location)
      `)
      .eq('id', batchId)
      .single();

    if (error) {
      toast({
        title: "Error loading batch",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setBatchInfo({
        id: data.id,
        batch_number: data.batch_number,
        flock_name: data.flocks?.flock_name || '',
        flock_number: data.flocks?.flock_number || 0,
        machine_id: data.machine_id,
        machine_number: data.machines?.machine_number || '',
        house_number: data.flocks?.house_number || '1',
        set_date: data.set_date,
        expected_hatch_date: data.expected_hatch_date,
        total_eggs_set: data.total_eggs_set,
        status: data.status,
        eggs_injected: data.eggs_injected ?? 0,
        chicks_hatched: data.chicks_hatched ?? 0,
      });
    }
  };

  const loadAllData = async () => {
    // Load all related data for this batch
    const [eggPackResult, fertilityResult, qaResult, residueResult] = await Promise.all([
      supabase.from('egg_pack_quality').select('*').eq('batch_id', batchId),
      supabase.from('fertility_analysis').select('*').eq('batch_id', batchId),
      supabase.from('qa_monitoring').select('*').eq('batch_id', batchId),
      supabase.from('residue_analysis').select('*').eq('batch_id', batchId)
    ]);

    if (eggPackResult.data) setEggPackData(eggPackResult.data);
    if (fertilityResult.data) setFertilityData(fertilityResult.data);
    if (qaResult.data) setQAData(qaResult.data);
    if (residueResult.data) setResidueData(residueResult.data);
  };

  const handleEggPackDataUpdate = async (newData: any[]) => {
    // For new records, add batch_id
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setEggPackData(dataWithBatchId);
    toast({
      title: "Egg Pack Data Updated",
      description: "Data linked to current batch"
    });
  };

  const handleFertilityDataUpdate = async (newData: any[]) => {
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setFertilityData(dataWithBatchId);
    toast({
      title: "Fertility Data Updated",
      description: "Data linked to current batch"
    });
  };

  const handleQADataUpdate = async (newData: any[]) => {
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setQAData(dataWithBatchId);
    toast({
      title: "QA Data Updated",
      description: "Data linked to current batch"
    });
  };

  const handleResidueDataUpdate = async (newData: any[]) => {
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setResidueData(dataWithBatchId);
    toast({
      title: "Residue Data Updated",
      description: "Data linked to current batch"
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

  if (!batchInfo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Batch</h3>
          <p className="text-gray-600">Choose a batch from the list above to start entering data.</p>
        </CardContent>
      </Card>
    );
  }

  const hoiPct = batchInfo.eggs_injected > 0
    ? Number(((batchInfo.chicks_hatched / batchInfo.eggs_injected) * 100).toFixed(2))
    : null;

  return (
    <div className="space-y-6">
      {/* Batch Info Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Batch: {batchInfo.batch_number}</CardTitle>
            <Badge className={getStatusColor(batchInfo.status)}>
              {batchInfo.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Flock</p>
              <p className="font-medium">{batchInfo.flock_number} - {batchInfo.flock_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Machine</p>
              <p className="font-medium">{batchInfo.machine_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Set Date</p>
              <p className="font-medium">{new Date(batchInfo.set_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Eggs</p>
              <p className="font-medium">{batchInfo.total_eggs_set.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Eggs Injected</p>
              <p className="font-medium">{(batchInfo.eggs_injected ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Chicks Hatched</p>
              <p className="font-medium">{(batchInfo.chicks_hatched ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">HOI %</p>
              <p className="font-medium">{hoiPct == null ? "-" : `${hoiPct}%`}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embrex / HOI Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Embrex / HOI</CardTitle>
        </CardHeader>
        <CardContent>
          <HOIEntry
            batchId={batchInfo.id}
            eggsInjected={batchInfo.eggs_injected ?? 0}
            chicksHatched={batchInfo.chicks_hatched ?? 0}
            onUpdated={({ eggs_injected, chicks_hatched }) => {
              setBatchInfo((prev) => prev ? { ...prev, eggs_injected, chicks_hatched } as BatchInfo : prev);
            }}
          />
        </CardContent>
      </Card>

      {/* Data Entry Tabs */}
      <Tabs defaultValue="eggpack" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="eggpack" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Egg Pack
          </TabsTrigger>
          <TabsTrigger value="fertility" className="flex items-center gap-2">
            <Egg className="h-4 w-4" />
            Fertility
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            QA
          </TabsTrigger>
          <TabsTrigger value="residue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Residue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eggpack">
          <EggPackDataEntry 
            data={eggPackData} 
            onDataUpdate={handleEggPackDataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number,
              machine_number: batchInfo.machine_number,
              house_number: batchInfo.house_number
            }}
          />
        </TabsContent>

        <TabsContent value="fertility">
          <FertilityDataEntry 
            data={fertilityData} 
            onDataUpdate={handleFertilityDataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number
            }}
          />
        </TabsContent>

        <TabsContent value="qa">
          <QADataEntry 
            data={qaData} 
            onDataUpdate={handleQADataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number,
              machine_id: batchInfo.machine_id,
              house_number: batchInfo.house_number
            }}
          />
        </TabsContent>

        <TabsContent value="residue">
          <ResidueDataEntry 
            data={residueData} 
            onDataUpdate={handleResidueDataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number,
              house_number: batchInfo.house_number
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatchDataEntry;
