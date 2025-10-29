
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Package2, Factory, Calendar, AlertCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Flock {
  id: string;
  flock_number: number;
  flock_name: string;
  house_number: string;
  age_weeks: number;
  unit_id?: string | null;
}

interface Machine {
  id: string;
  machine_number: string;
  machine_type: string;
  capacity: number;
  status: string;
  location: string;
}

interface House {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  house_number: string;
  machine_number: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  unit_id?: string | null;
}

interface Unit {
  id: string;
  name: string;
}

interface HouseManagerProps {
  onHouseSelect: (houseId: string) => void;
  selectedHouse: string | null;
}

const HouseManager = ({ onHouseSelect, selectedHouse }: HouseManagerProps) => {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    flockId: '',
    machineId: '',
    unitId: '',
    setDate: new Date().toISOString().split('T')[0],
    totalEggs: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFlocks();
    loadMachines();
    loadHouses();
    loadUnits();
  }, []);

  const loadFlocks = async () => {
    const { data, error } = await supabase
      .from('flocks')
      .select('*')
      .order('flock_number', { ascending: true });
    
    if (error) {
      toast({
        title: "Error loading flocks",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setFlocks(data || []);
    }
  };

  const loadMachines = async () => {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('status', 'available')
      .order('machine_number', { ascending: true });
    
    if (error) {
      toast({
        title: "Error loading machines",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setMachines(data || []);
    }
  };

  const loadHouses = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number, house_number),
        machines(machine_number)
      `)
      .order('set_date', { ascending: false });
    
    if (error) {
      toast({
        title: "Error loading houses",
        description: error.message,
        variant: "destructive"
      });
    } else {
      const formattedHouses = data?.map(batch => ({
        id: batch.id,
        batch_number: batch.batch_number,
        flock_name: batch.flocks?.flock_name || '',
        flock_number: batch.flocks?.flock_number || 0,
        house_number: batch.flocks?.house_number || '',
        machine_number: batch.machines?.machine_number || '',
        set_date: batch.set_date,
        expected_hatch_date: batch.expected_hatch_date,
        total_eggs_set: batch.total_eggs_set,
        status: batch.status,
        unit_id: batch.unit_id ?? null,
      })) || [];
      setHouses(formattedHouses);
    }
  };

  const loadUnits = async () => {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Error loading units",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setUnits(data || []);
  };

const toggleFilterUnit = (id: string, checked: boolean) => {
  setSelectedUnitIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((u) => u !== id)));
};

const calculateHatchDate = (setDate: string) => {
    const date = new Date(setDate);
    date.setDate(date.getDate() + 21); // 21 days incubation period
    return date.toISOString().split('T')[0];
  };

  const createHouse = async () => {
    if (!formData.flockId || !formData.machineId || !formData.totalEggs || !formData.unitId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const selectedFlock = flocks.find(f => f.id === formData.flockId);
    
    // Get the next sequential house number for this flock
    const { data: nextNumber, error: numberError } = await supabase
      .rpc('get_next_house_number', { flock_uuid: formData.flockId });
    
    if (numberError) {
      toast({
        title: "Error generating house number",
        description: numberError.message,
        variant: "destructive"
      });
      return;
    }

    const houseNumber = `${selectedFlock?.flock_name} #${nextNumber}`;
    const expectedHatchDate = calculateHatchDate(formData.setDate);

    const { data, error } = await supabase
      .from('batches')
      .insert({
        batch_number: houseNumber,
        flock_id: formData.flockId,
        machine_id: formData.machineId,
        unit_id: formData.unitId,
        set_date: formData.setDate,
        expected_hatch_date: expectedHatchDate,
        total_eggs_set: parseInt(formData.totalEggs),
        status: 'setting'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating house",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "House Created",
        description: `House ${houseNumber} created successfully`
      });
      setShowCreateForm(false);
      setFormData({ flockId: '', machineId: '', unitId: '', setDate: new Date().toISOString().split('T')[0], totalEggs: '' });
      loadHouses();
      onHouseSelect(data.id);
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

  const filteredHouses = selectedUnitIds.length ? houses.filter((h) => h.unit_id && selectedUnitIds.includes(h.unit_id)) : houses;

  return (
    <div className="space-y-6">
      {/* Create New House */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              House Management
            </span>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    {`Filter Hatcheries${selectedUnitIds.length ? ` (${selectedUnitIds.length})` : ''}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Show hatcheries</div>
                    <div className="max-h-48 overflow-auto space-y-2">
                      {units.map((u) => (
                        <label key={u.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedUnitIds.includes(u.id)}
                            onCheckedChange={(c) => toggleFilterUnit(u.id, Boolean(c))}
                          />
                          <span className="text-sm">{u.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUnitIds([])}>Clear</Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUnitIds(units.map(u => u.id))}>All</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant={showCreateForm ? "outline" : "default"}
              >
                {showCreateForm ? "Cancel" : "New House"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {showCreateForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Hatchery *</Label>
                <Select value={formData.unitId} onValueChange={(value) => setFormData(prev => ({ ...prev, unitId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a hatchery" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Flock *</Label>
                <Select value={formData.flockId} onValueChange={(value) => setFormData(prev => ({ ...prev, flockId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a flock" />
                  </SelectTrigger>
                  <SelectContent>
                    {flocks.map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.flock_number} - {flock.flock_name} (Age: {flock.age_weeks}w)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Machine *</Label>
                <Select value={formData.machineId} onValueChange={(value) => setFormData(prev => ({ ...prev, machineId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.machine_number} - {machine.machine_type} (Cap: {machine.capacity.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Set Date *</Label>
                <Input
                  type="date"
                  value={formData.setDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, setDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Eggs Set *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 45000"
                  value={formData.totalEggs}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalEggs: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={createHouse}>Create House</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Existing Houses */}
      <Card>
        <CardHeader>
          <CardTitle>Active Houses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHouses.map((house) => (
              <div
                key={house.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedHouse === house.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onHouseSelect(house.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{house.flock_name} #{house.house_number}</h3>
                  <Badge className={getStatusColor(house.status)}>
                    {house.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4" />
                    {house.flock_number} - {house.flock_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    {house.machine_number}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Set: {new Date(house.set_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {units.find(u => u.id === house.unit_id)?.name || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {house.total_eggs_set.toLocaleString()} eggs
                  </div>
                </div>
              </div>
            ))}
          </div>
          {houses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No houses found. Create your first house to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HouseManager;
