
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";

interface ResidueRecord {
  id: string;
  name: string;
  flockNumber: number;
  houseNumber: number;
  infertile: number;
  infertilePercent: number;
  chicks: number;
  earlyDeath: number;
  earlyDeathPercent: number;
  live: number;
  livePercent: number;
  dead: number;
  deadPercent: number;
  midDeath: number;
  midDeathPercent: number;
  lateDeath: number;
  lateDeathPercent: number;
  cullChicks: number;
  handlingCracks: number;
  handlingCracksPercent: number;
  transferCrack: number;
  transferCrackPercent: number;
  contamination: number;
  contaminationPercent: number;
  mold: number;
  moldPercent: number;
  abnormal: number;
  abnormalPercent: number;
  brain: number;
  brainPercent: number;
  dryEgg: number;
  dryEggPercent: number;
  malpositioned: number;
  malpositionedPercent: number;
  upsideDown: number;
  upsideDownPercent: number;
  pipNumber: number;
  totalEggs: number;
}

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  house_number?: string;
}

interface ResidueDataEntryProps {
  data: ResidueRecord[];
  onDataUpdate: (data: ResidueRecord[]) => void;
  batchInfo: BatchInfo;
}

const ResidueDataEntry = ({ data, onDataUpdate, batchInfo }: ResidueDataEntryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: batchInfo.flock_name,
    flockNumber: batchInfo.flock_number.toString(),
    houseNumber: batchInfo.house_number || '1',
    infertile: '',
    earlyDeath: ''
  });
  const { toast } = useToast();

  const TOTAL_EGGS = 648;

  const calculatePercentage = (value: number) => {
    return Number(((value / TOTAL_EGGS) * 100).toFixed(2));
  };

  const calculateTotalUsed = () => {
    const values = ['infertile', 'earlyDeath'];
    
    return values.reduce((sum, field) => {
      const value = Number(formData[field as keyof typeof formData]) || 0;
      return sum + value;
    }, 0);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const totalUsed = calculateTotalUsed();
    
    if (totalUsed > TOTAL_EGGS) {
      toast({
        title: "Validation Error",
        description: `Total eggs used (${totalUsed}) exceeds ${TOTAL_EGGS}`,
        variant: "destructive"
      });
      return false;
    }
    
    if (!formData.name || !formData.flockNumber || !formData.houseNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const newRecord: ResidueRecord = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      flockNumber: Number(formData.flockNumber),
      houseNumber: Number(formData.houseNumber),
      infertile: Number(formData.infertile) || 0,
      infertilePercent: calculatePercentage(Number(formData.infertile) || 0),
      earlyDeath: Number(formData.earlyDeath) || 0,
      earlyDeathPercent: calculatePercentage(Number(formData.earlyDeath) || 0),
      // Set all other fields to 0 for database compatibility
      chicks: 0,
      live: 0,
      livePercent: 0,
      dead: 0,
      deadPercent: 0,
      midDeath: 0,
      midDeathPercent: 0,
      lateDeath: 0,
      lateDeathPercent: 0,
      cullChicks: 0,
      handlingCracks: 0,
      handlingCracksPercent: 0,
      transferCrack: 0,
      transferCrackPercent: 0,
      contamination: 0,
      contaminationPercent: 0,
      mold: 0,
      moldPercent: 0,
      abnormal: 0,
      abnormalPercent: 0,
      brain: 0,
      brainPercent: 0,
      dryEgg: 0,
      dryEggPercent: 0,
      malpositioned: 0,
      malpositionedPercent: 0,
      upsideDown: 0,
      upsideDownPercent: 0,
      pipNumber: 0,
      totalEggs: TOTAL_EGGS
    };

    if (editingId) {
      const updatedData = data.map(item => item.id === editingId ? newRecord : item);
      onDataUpdate(updatedData);
      toast({
        title: "Record Updated",
        description: "Residue record updated successfully"
      });
    } else {
      onDataUpdate([...data, newRecord]);
      toast({
        title: "Record Added",
        description: "New residue record added successfully"
      });
    }

    handleCancel();
  };

  const handleEdit = (record: ResidueRecord) => {
    setEditingId(record.id);
    setFormData({
      name: record.name,
      flockNumber: record.flockNumber.toString(),
      houseNumber: record.houseNumber.toString(),
      infertile: record.infertile.toString(),
      earlyDeath: record.earlyDeath.toString()
    });
  };

  const handleDelete = (id: string) => {
    const updatedData = data.filter(item => item.id !== id);
    onDataUpdate(updatedData);
    toast({
      title: "Record Deleted",
      description: "Residue record deleted successfully"
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: batchInfo.flock_name,
      flockNumber: batchInfo.flock_number.toString(),
      houseNumber: batchInfo.house_number || '1',
      infertile: '',
      earlyDeath: ''
    });
  };

  const totalUsed = calculateTotalUsed();
  const remaining = TOTAL_EGGS - totalUsed;

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Residue Record' : 'Add New Residue Record'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Selected Batch:</strong> {batchInfo.batch_number} - {batchInfo.flock_name} (Flock #{batchInfo.flock_number})
            </p>
            <p className="text-sm text-gray-600">Residue analysis data will be automatically linked to this batch.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Information - Auto-populated from batch */}
            <div className="space-y-2">
              <Label htmlFor="name">Flock Name</Label>
              <Input
                id="name"
                value={formData.name}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flockNumber">Flock Number</Label>
              <Input
                id="flockNumber"
                type="number"
                value={formData.flockNumber}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="houseNumber">House Number</Label>
              <Input
                id="houseNumber"
                type="number"
                value={formData.houseNumber}
                disabled
                className="bg-gray-100"
              />
            </div>

            {/* Simplified Core Metrics - Only Infertile and Early Death */}
            <div className="space-y-2">
              <Label htmlFor="infertile">Infertile</Label>
              <Input
                id="infertile"
                type="number"
                placeholder="e.g., 93"
                value={formData.infertile}
                onChange={(e) => handleInputChange('infertile', e.target.value)}
              />
              {formData.infertile && (
                <p className="text-sm text-muted-foreground">
                  {calculatePercentage(Number(formData.infertile))}% of total
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="earlyDeath">Early Dead (1-7 days)</Label>
              <Input
                id="earlyDeath"
                type="number"
                placeholder="e.g., 15"
                value={formData.earlyDeath}
                onChange={(e) => handleInputChange('earlyDeath', e.target.value)}
              />
              {formData.earlyDeath && (
                <p className="text-sm text-muted-foreground">
                  {calculatePercentage(Number(formData.earlyDeath))}% of total
                </p>
              )}
            </div>
            
          </div>

          {/* Validation Display */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Total Used: {totalUsed}</span>
                <span className="mx-2">|</span>
                <span className="font-medium">Remaining: {remaining}</span>
                <span className="mx-2">|</span>
                <span className="font-medium">Target: {TOTAL_EGGS}</span>
              </div>
              {remaining < 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Exceeds total eggs!</span>
                </div>
              )}
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="mt-6">
            <Label>Residue Analysis Images</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Upload images documenting the residue analysis results
            </p>
            <ImageUpload
              recordType="residue_analysis"
              recordId={editingId || 'new'}
              maxFiles={5}
              onImageUploaded={(imageUrl, imageId) => {
                console.log('Image uploaded:', { imageUrl, imageId });
              }}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {editingId ? 'Update Record' : 'Add Record'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Residue Analysis Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Flock #</TableHead>
                  <TableHead>House #</TableHead>
                  <TableHead>Infertile</TableHead>
                  <TableHead>Early Dead</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.flockNumber}</TableCell>
                    <TableCell>{record.houseNumber}</TableCell>
                    <TableCell className="font-medium">
                      {record.infertile} ({record.infertilePercent}%)
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.earlyDeath} ({record.earlyDeathPercent}%)
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidueDataEntry;
