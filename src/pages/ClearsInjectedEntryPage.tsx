import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Syringe, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ClearsInjectedDataEntry from "@/components/dashboard/ClearsInjectedDataEntry";

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
  eggs_cleared: number | null;
  eggs_injected: number | null;
}

const ClearsInjectedEntryPage = () => {
  const { houseId } = useParams<{ houseId: string }>();
  const navigate = useNavigate();
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (houseId) {
      loadHouseInfo();
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
        status: data.status,
        eggs_cleared: (data as any).eggs_cleared,
        eggs_injected: data.eggs_injected
      });
    }
  };

  const handleSave = async (values: { clear_number: number; injected_number: number }) => {
    if (!houseId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('batches')
        .update({
          eggs_cleared: values.clear_number,
          eggs_injected: values.injected_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', houseId);

      if (error) {
        toast({
          title: "Error saving data",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Data saved successfully",
          description: "Clears and injected numbers have been updated"
        });
        
        // Update local state
        setHouseInfo(prev => prev ? {
          ...prev,
          eggs_cleared: values.clear_number,
          eggs_injected: values.injected_number
        } : null);
      }
    } catch (error) {
      toast({
        title: "Error saving data",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
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
        
        {/* Main Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Data Entry
          </Button>
          
          {/* Page Title */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <Syringe className="h-8 w-8 text-blue-600" />
              Clears & Injected Data Entry
            </h1>
            <p className="text-gray-600">Record the number of cleared eggs and injected eggs for this batch.</p>
          </div>
          
          {/* Batch Info - Streamlined */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                House {houseInfo.batch_number}
              </h2>
              <Badge className={getStatusColor(houseInfo.status)}>
                {houseInfo.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Flock:</span> <span className="font-medium ml-1">{houseInfo.flock_number} - {houseInfo.flock_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Machine:</span> <span className="font-medium ml-1">{houseInfo.machine_number}</span>
              </div>
              <div>
                <span className="text-gray-600">Set Date:</span> <span className="font-medium ml-1">{new Date(houseInfo.set_date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Eggs:</span> <span className="font-medium ml-1">{houseInfo.total_eggs_set.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clears & Injected Data Entry Component */}
        <ClearsInjectedDataEntry 
          initialClear={houseInfo.eggs_cleared}
          initialInjected={houseInfo.eggs_injected}
          totalEggs={houseInfo.total_eggs_set}
          onSave={handleSave}
          saving={saving}
          context={{
            flockNumber: houseInfo.flock_number,
            flockName: houseInfo.flock_name,
            houseNumber: houseInfo.house_number
          }}
        />
      </div>
    </div>
  );
};

export default ClearsInjectedEntryPage;