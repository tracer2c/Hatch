
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package, AlertTriangle, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EggPackData {
  id: string;
  flock: string;
  flockNumber: number;
  houseNumber: string;
  totalEggsPulled: number;
  stained: number;
  dirty: number;
  small: number;
  cracked: number;
  abnormal: number;
  contaminated: number;
  totalSampled: number;
  usd: number;
  setWeek?: string;
  hatchWeek?: string;
}

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_number: string;
  house_number?: string;
}

interface EggPackDataEntryProps {
  data: EggPackData[];
  onDataUpdate: (data: EggPackData[]) => void;
  batchInfo: BatchInfo;
}

const EggPackDataEntry: React.FC<EggPackDataEntryProps> = ({ data, onDataUpdate, batchInfo }) => {
  const [localData, setLocalData] = useState<EggPackData[]>(data);
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<EggPackData>>({
    flock: batchInfo.flock_name,
    flockNumber: batchInfo.flock_number,
    houseNumber: batchInfo.house_number || '1',
    totalEggsPulled: 648,
    stained: 0,
    dirty: 0,
    small: 0,
    cracked: 0,
    abnormal: 0,
    contaminated: 0,
    totalSampled: 648,
    usd: 0,
    setWeek: '',
    hatchWeek: ''
  });
  const { toast } = useToast();

  const calculatePercentage = (value: number, total: number): number => {
    return total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
  };

  const addEntry = async () => {
    const entry = {
      batch_id: batchInfo.id,
      sample_size: newEntry.totalEggsPulled || 648,
      large: 0, // Calculated from total - small
      small: newEntry.small || 0,
      dirty: newEntry.dirty || 0,
      cracked: newEntry.cracked || 0,
      grade_a: 0, // You can add these fields if needed
      grade_b: 0,
      grade_c: 0,
      inspection_date: new Date().toISOString().split('T')[0],
      notes: `Stained: ${newEntry.stained}, Abnormal: ${newEntry.abnormal}, Contaminated: ${newEntry.contaminated}, USD: ${newEntry.usd}${newEntry.setWeek ? `, Set Week: ${newEntry.setWeek}` : ''}`
    };

    const { error } = await supabase
      .from('egg_pack_quality')
      .insert([entry]);

    if (error) {
      toast({
        title: "Error saving data",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Entry Added",
        description: `Added egg pack quality assessment for ${batchInfo.flock_name}`,
      });
      
      // Reset form but keep batch info
      setNewEntry({
        flock: batchInfo.flock_name,
        flockNumber: batchInfo.flock_number,
        houseNumber: batchInfo.house_number || '1',
        totalEggsPulled: 648,
        stained: 0,
        dirty: 0,
        small: 0,
        cracked: 0,
        abnormal: 0,
        contaminated: 0,
        totalSampled: 648,
        usd: 0,
        setWeek: '',
        hatchWeek: ''
      });
      
      // Refresh data
      loadEggPackData();
    }
  };

  const loadEggPackData = async () => {
    const { data, error } = await supabase
      .from('egg_pack_quality')
      .select('*')
      .eq('batch_id', batchInfo.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading egg pack data:', error);
    } else {
      // Convert database records to component format
      const convertedData = data.map(record => ({
        id: record.id,
        flock: batchInfo.flock_name,
        flockNumber: batchInfo.flock_number,
        houseNumber: batchInfo.house_number || '1',
        totalEggsPulled: record.sample_size,
        stained: extractFromNotes(record.notes, 'Stained'),
        dirty: record.dirty,
        small: record.small,
        cracked: record.cracked,
        abnormal: extractFromNotes(record.notes, 'Abnormal'),
        contaminated: extractFromNotes(record.notes, 'Contaminated'),
        totalSampled: record.sample_size,
        usd: extractFromNotes(record.notes, 'USD'),
        setWeek: extractStringFromNotes(record.notes, 'Set Week'),
        hatchWeek: '' // Not stored in current schema
      }));
      setLocalData(convertedData);
      onDataUpdate(convertedData);
    }
  };

  const extractFromNotes = (notes: string | null, field: string): number => {
    if (!notes) return 0;
    const match = notes.match(new RegExp(`${field}:\\s*(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  };

  const extractStringFromNotes = (notes: string | null, field: string): string => {
    if (!notes) return '';
    const match = notes.match(new RegExp(`${field}:\\s*([^,]+)`));
    return match ? match[1].trim() : '';
  };

  useEffect(() => {
    loadEggPackData();
  }, [batchInfo.id]);

  const removeEntry = (id: string) => {
    const updatedData = localData.filter(entry => entry.id !== id);
    setLocalData(updatedData);
    toast({
      title: "Entry Removed",
      description: "Egg pack entry has been removed.",
    });
  };

  const saveData = () => {
    onDataUpdate(localData);
    toast({
      title: "Data Saved",
      description: `Successfully saved ${localData.length} egg pack records.`,
    });
  };

  const totalDefects = (entry: EggPackData) => {
    return entry.stained + entry.dirty + entry.small + entry.cracked + entry.abnormal + entry.contaminated;
  };

  const overallQualityScore = (entry: EggPackData) => {
    const defectRate = (totalDefects(entry) / entry.totalEggsPulled) * 100;
    return Math.max(0, 100 - defectRate);
  };

  return (
    <div className="space-y-6">

      {/* Quality Summary - Moved to Top */}
      {localData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Quality Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {localData.length}
                </div>
                <div className="text-sm text-gray-600">Total Flocks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(localData.reduce((sum, entry) => sum + overallQualityScore(entry), 0) / localData.length).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Avg Quality Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(localData.reduce((sum, entry) => sum + calculatePercentage(entry.usd, entry.totalEggsPulled), 0) / localData.length).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Avg USD Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {localData.reduce((sum, entry) => sum + entry.totalEggsPulled, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Eggs Assessed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Entry Toggle Button */}
      <div className="flex justify-center">
        <Button 
          onClick={() => setShowDataEntry(!showDataEntry)}
          variant="outline"
          className="flex items-center gap-2"
        >
          {showDataEntry ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDataEntry ? 'Hide Data Entry Form' : 'Show Data Entry Form'}
        </Button>
      </div>

      {/* Data Entry Form - Collapsible */}
      {showDataEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Egg Pack Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Selected Batch:</strong> {batchInfo.batch_number} - {batchInfo.flock_name} (Flock #{batchInfo.flock_number})
              </p>
              <p className="text-sm text-gray-600">Quality assessment data will be automatically linked to this batch.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="flock">Flock Name</Label>
                <Input
                  id="flock"
                  value={newEntry.flock}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="flockNumber">Flock #</Label>
                <Input
                  id="flockNumber"
                  type="number"
                  value={newEntry.flockNumber}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="houseNumber">House #</Label>
                <Input
                  id="houseNumber"
                  value={newEntry.houseNumber}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="totalEggsPulled">Total Eggs Pulled</Label>
                <Input
                  id="totalEggsPulled"
                  type="number"
                  value={newEntry.totalEggsPulled}
                  onChange={(e) => setNewEntry({...newEntry, totalEggsPulled: parseInt(e.target.value) || 648})}
                  placeholder="648"
                />
              </div>
              <div>
                <Label htmlFor="stained">Stained</Label>
                <Input
                  id="stained"
                  type="number"
                  value={newEntry.stained}
                  onChange={(e) => setNewEntry({...newEntry, stained: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="dirty">Dirty</Label>
                <Input
                  id="dirty"
                  type="number"
                  value={newEntry.dirty}
                  onChange={(e) => setNewEntry({...newEntry, dirty: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="small">Small</Label>
                <Input
                  id="small"
                  type="number"
                  value={newEntry.small}
                  onChange={(e) => setNewEntry({...newEntry, small: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="cracked">Cracked</Label>
                <Input
                  id="cracked"
                  type="number"
                  value={newEntry.cracked}
                  onChange={(e) => setNewEntry({...newEntry, cracked: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="abnormal">Abnormal</Label>
                <Input
                  id="abnormal"
                  type="number"
                  value={newEntry.abnormal}
                  onChange={(e) => setNewEntry({...newEntry, abnormal: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="contaminated">Contaminated</Label>
                <Input
                  id="contaminated"
                  type="number"
                  value={newEntry.contaminated}
                  onChange={(e) => setNewEntry({...newEntry, contaminated: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="usd">USD (Unsettable)</Label>
                <Input
                  id="usd"
                  type="number"
                  value={newEntry.usd}
                  onChange={(e) => setNewEntry({...newEntry, usd: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="setWeek">Set Week</Label>
                <Input
                  id="setWeek"
                  value={newEntry.setWeek}
                  onChange={(e) => setNewEntry({...newEntry, setWeek: e.target.value})}
                  placeholder="Week 1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addEntry} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
              <Button onClick={saveData} variant="outline" className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Egg Pack Quality Data ({localData.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flock</TableHead>
                  <TableHead>Flock #</TableHead>
                  <TableHead>House #</TableHead>
                  <TableHead>Total Pulled</TableHead>
                  <TableHead>Stained (%)</TableHead>
                  <TableHead>Dirty (%)</TableHead>
                  <TableHead>Small (%)</TableHead>
                  <TableHead>Cracked (%)</TableHead>
                  <TableHead>Abnormal (%)</TableHead>
                  <TableHead>Contaminated (%)</TableHead>
                  <TableHead>USD (%)</TableHead>
                  <TableHead>Quality Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.flock}</TableCell>
                    <TableCell>{entry.flockNumber}</TableCell>
                    <TableCell>{entry.houseNumber}</TableCell>
                    <TableCell>{entry.totalEggsPulled}</TableCell>
                    <TableCell>
                      {entry.stained} ({calculatePercentage(entry.stained, entry.totalEggsPulled)}%)
                    </TableCell>
                    <TableCell>
                      {entry.dirty} ({calculatePercentage(entry.dirty, entry.totalEggsPulled)}%)
                    </TableCell>
                    <TableCell>
                      {entry.small} ({calculatePercentage(entry.small, entry.totalEggsPulled)}%)
                    </TableCell>
                    <TableCell>
                      {entry.cracked} ({calculatePercentage(entry.cracked, entry.totalEggsPulled)}%)
                    </TableCell>
                    <TableCell>
                      {entry.abnormal} ({calculatePercentage(entry.abnormal, entry.totalSampled)}%)
                    </TableCell>
                    <TableCell>
                      {entry.contaminated} ({calculatePercentage(entry.contaminated, entry.totalEggsPulled)}%)
                    </TableCell>
                    <TableCell>
                      {entry.usd} ({calculatePercentage(entry.usd, entry.totalEggsPulled)}%)
                    </TableCell>
                    <TableCell>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${
                        overallQualityScore(entry) >= 95 ? 'bg-green-100 text-green-800' :
                        overallQualityScore(entry) >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {overallQualityScore(entry).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeEntry(entry.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {localData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No egg pack data entries yet. Add your first entry above.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default EggPackDataEntry;
