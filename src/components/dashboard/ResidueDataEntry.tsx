
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
  // Hatchability metrics from fertility analysis
  sampleSize?: number;
  fertileEggs?: number;
  hatchPercent?: number;
  hofPercent?: number;
  hoiPercent?: number;
  ifDevPercent?: number;
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
    chicks: '',
    earlyDeath: '',
    live: '',
    dead: '',
    midDeath: '',
    lateDeath: '',
    cullChicks: '',
    handlingCracks: '',
    transferCrack: '',
    contamination: '',
    mold: '',
    abnormal: '',
    brain: '',
    dryEgg: '',
    malpositioned: '',
    upsideDown: '',
    pipNumber: '',
    // Hatchability metrics
    sampleSize: '648'
  });
  const { toast } = useToast();

  const TOTAL_EGGS = 648;

  const calculatePercentage = (value: number) => {
    return Number(((value / TOTAL_EGGS) * 100).toFixed(2));
  };

  // Calculate hatchability metrics
  const calculateHatchabilityMetrics = (sampleSize: number, infertile: number, earlyDead: number, lateDead: number, cullChicks: number) => {
    const fertileEggs = Math.max(0, sampleSize - infertile);
    const viableChicks = Math.max(0, sampleSize - infertile - earlyDead - lateDead - cullChicks);
    const hatchPercent = sampleSize > 0 ? (viableChicks / sampleSize) * 100 : 0; // HOS
    const hofPercent = fertileEggs > 0 ? (viableChicks / fertileEggs) * 100 : 0; // Hatch of Fertile
    const hoiPercent = fertileEggs > 0 ? ((viableChicks + cullChicks) / fertileEggs) * 100 : 0; // Hatch incl. culls
    const ifDevPercent = hoiPercent - hofPercent; // delta due to culls
    
    return {
      fertileEggs,
      hatchPercent: Number(hatchPercent.toFixed(2)),
      hofPercent: Number(hofPercent.toFixed(2)),
      hoiPercent: Number(hoiPercent.toFixed(2)),
      ifDevPercent: Number(ifDevPercent.toFixed(2)),
    };
  };

  const calculateTotalUsed = () => {
    const values = [
      'infertile', 'chicks', 'earlyDeath', 'live', 'dead', 'midDeath', 
      'lateDeath', 'cullChicks', 'handlingCracks', 'transferCrack', 
      'contamination', 'mold', 'abnormal', 'brain', 'dryEgg', 
      'malpositioned', 'upsideDown'
    ];
    
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
    
    // Calculate hatchability metrics
    const sampleSize = Number(formData.sampleSize) || TOTAL_EGGS;
    const infertile = Number(formData.infertile) || 0;
    const earlyDead = Number(formData.earlyDeath) || 0;
    const lateDead = Number(formData.lateDeath) || 0;
    const cullChicks = Number(formData.cullChicks) || 0;
    
    const hatchabilityMetrics = calculateHatchabilityMetrics(sampleSize, infertile, earlyDead, lateDead, cullChicks);
    
    const newRecord: ResidueRecord = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      flockNumber: Number(formData.flockNumber),
      houseNumber: Number(formData.houseNumber),
      infertile: Number(formData.infertile) || 0,
      infertilePercent: calculatePercentage(Number(formData.infertile) || 0),
      chicks: Number(formData.chicks) || 0,
      earlyDeath: Number(formData.earlyDeath) || 0,
      earlyDeathPercent: calculatePercentage(Number(formData.earlyDeath) || 0),
      live: Number(formData.live) || 0,
      livePercent: calculatePercentage(Number(formData.live) || 0),
      dead: Number(formData.dead) || 0,
      deadPercent: calculatePercentage(Number(formData.dead) || 0),
      midDeath: Number(formData.midDeath) || 0,
      midDeathPercent: calculatePercentage(Number(formData.midDeath) || 0),
      lateDeath: Number(formData.lateDeath) || 0,
      lateDeathPercent: calculatePercentage(Number(formData.lateDeath) || 0),
      cullChicks: Number(formData.cullChicks) || 0,
      handlingCracks: Number(formData.handlingCracks) || 0,
      handlingCracksPercent: calculatePercentage(Number(formData.handlingCracks) || 0),
      transferCrack: Number(formData.transferCrack) || 0,
      transferCrackPercent: calculatePercentage(Number(formData.transferCrack) || 0),
      contamination: Number(formData.contamination) || 0,
      contaminationPercent: calculatePercentage(Number(formData.contamination) || 0),
      mold: Number(formData.mold) || 0,
      moldPercent: calculatePercentage(Number(formData.mold) || 0),
      abnormal: Number(formData.abnormal) || 0,
      abnormalPercent: calculatePercentage(Number(formData.abnormal) || 0),
      brain: Number(formData.brain) || 0,
      brainPercent: calculatePercentage(Number(formData.brain) || 0),
      dryEgg: Number(formData.dryEgg) || 0,
      dryEggPercent: calculatePercentage(Number(formData.dryEgg) || 0),
      malpositioned: Number(formData.malpositioned) || 0,
      malpositionedPercent: calculatePercentage(Number(formData.malpositioned) || 0),
      upsideDown: Number(formData.upsideDown) || 0,
      upsideDownPercent: calculatePercentage(Number(formData.upsideDown) || 0),
      pipNumber: Number(formData.pipNumber) || 0,
      totalEggs: TOTAL_EGGS,
      // Include hatchability metrics
      sampleSize: sampleSize,
      fertileEggs: hatchabilityMetrics.fertileEggs,
      hatchPercent: hatchabilityMetrics.hatchPercent,
      hofPercent: hatchabilityMetrics.hofPercent,
      hoiPercent: hatchabilityMetrics.hoiPercent,
      ifDevPercent: hatchabilityMetrics.ifDevPercent
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
      chicks: record.chicks.toString(),
      earlyDeath: record.earlyDeath.toString(),
      live: record.live.toString(),
      dead: record.dead.toString(),
      midDeath: record.midDeath.toString(),
      lateDeath: record.lateDeath.toString(),
      cullChicks: record.cullChicks.toString(),
      handlingCracks: record.handlingCracks.toString(),
      transferCrack: record.transferCrack.toString(),
      contamination: record.contamination.toString(),
      mold: record.mold.toString(),
      abnormal: record.abnormal.toString(),
      brain: record.brain.toString(),
      dryEgg: record.dryEgg.toString(),
      malpositioned: record.malpositioned.toString(),
      upsideDown: record.upsideDown.toString(),
      pipNumber: record.pipNumber.toString(),
      sampleSize: (record.sampleSize || TOTAL_EGGS).toString()
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
      chicks: '',
      earlyDeath: '',
      live: '',
      dead: '',
      midDeath: '',
      lateDeath: '',
      cullChicks: '',
      handlingCracks: '',
      transferCrack: '',
      contamination: '',
      mold: '',
      abnormal: '',
      brain: '',
      dryEgg: '',
      malpositioned: '',
      upsideDown: '',
      pipNumber: '',
      sampleSize: '648'
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

            {/* Core Metrics */}
            <div className="space-y-2">
              <Label htmlFor="infertile">Infertile</Label>
              <Input
                id="infertile"
                type="number"
                placeholder="e.g., 93"
                value={formData.infertile}
                onChange={(e) => handleInputChange('infertile', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chicks">Chicks</Label>
              <Input
                id="chicks"
                type="number"
                placeholder="e.g., 496"
                value={formData.chicks}
                onChange={(e) => handleInputChange('chicks', e.target.value)}
              />
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
            </div>

            {/* Transfer Data */}
            <div className="space-y-2">
              <Label htmlFor="live">Live (at transfer)</Label>
              <Input
                id="live"
                type="number"
                placeholder="e.g., 520"
                value={formData.live}
                onChange={(e) => handleInputChange('live', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dead">Dead (at transfer)</Label>
              <Input
                id="dead"
                type="number"
                placeholder="e.g., 12"
                value={formData.dead}
                onChange={(e) => handleInputChange('dead', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="midDeath">Mid Dead (7-14 days)</Label>
              <Input
                id="midDeath"
                type="number"
                placeholder="e.g., 8"
                value={formData.midDeath}
                onChange={(e) => handleInputChange('midDeath', e.target.value)}
              />
            </div>

            {/* Death Categories */}
            <div className="space-y-2">
              <Label htmlFor="lateDeath">Late Death (15-21 days)</Label>
              <Input
                id="lateDeath"
                type="number"
                placeholder="e.g., 22"
                value={formData.lateDeath}
                onChange={(e) => handleInputChange('lateDeath', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cullChicks">Cull Chicks</Label>
              <Input
                id="cullChicks"
                type="number"
                placeholder="e.g., 5"
                value={formData.cullChicks}
                onChange={(e) => handleInputChange('cullChicks', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handlingCracks">Handling Cracks</Label>
              <Input
                id="handlingCracks"
                type="number"
                placeholder="e.g., 3"
                value={formData.handlingCracks}
                onChange={(e) => handleInputChange('handlingCracks', e.target.value)}
              />
            </div>

            {/* Quality Issues */}
            <div className="space-y-2">
              <Label htmlFor="transferCrack">Transfer Crack</Label>
              <Input
                id="transferCrack"
                type="number"
                placeholder="e.g., 2"
                value={formData.transferCrack}
                onChange={(e) => handleInputChange('transferCrack', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contamination">Contamination</Label>
              <Input
                id="contamination"
                type="number"
                placeholder="e.g., 2"
                value={formData.contamination}
                onChange={(e) => handleInputChange('contamination', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mold">Mold</Label>
              <Input
                id="mold"
                type="number"
                placeholder="e.g., 1"
                value={formData.mold}
                onChange={(e) => handleInputChange('mold', e.target.value)}
              />
            </div>

            {/* Embryo Problems */}
            <div className="space-y-2">
              <Label htmlFor="abnormal">Abnormal</Label>
              <Input
                id="abnormal"
                type="number"
                placeholder="e.g., 4"
                value={formData.abnormal}
                onChange={(e) => handleInputChange('abnormal', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brain">Brain Defects</Label>
              <Input
                id="brain"
                type="number"
                placeholder="e.g., 1"
                value={formData.brain}
                onChange={(e) => handleInputChange('brain', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dryEgg">Dry Egg</Label>
              <Input
                id="dryEgg"
                type="number"
                placeholder="e.g., 3"
                value={formData.dryEgg}
                onChange={(e) => handleInputChange('dryEgg', e.target.value)}
              />
            </div>

            {/* Position Issues */}
            <div className="space-y-2">
              <Label htmlFor="malpositioned">Malpositioned</Label>
              <Input
                id="malpositioned"
                type="number"
                placeholder="e.g., 6"
                value={formData.malpositioned}
                onChange={(e) => handleInputChange('malpositioned', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upsideDown">Upside Down</Label>
              <Input
                id="upsideDown"
                type="number"
                placeholder="e.g., 2"
                value={formData.upsideDown}
                onChange={(e) => handleInputChange('upsideDown', e.target.value)}
              />
            </div>
            
            {/* PIP Number */}
            <div className="space-y-2">
              <Label htmlFor="pipNumber">PIP Number</Label>
              <Input
                id="pipNumber"
                type="number"
                placeholder="e.g., 15"
                value={formData.pipNumber}
                onChange={(e) => handleInputChange('pipNumber', e.target.value)}
              />
            </div>
          </div>

          {/* Hatchability Metrics Section */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">Hatchability Metrics</h3>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
              {/* Sample Size */}
              <div className="space-y-2">
                <Label htmlFor="sampleSize">Sample Size</Label>
                <Input
                  id="sampleSize"
                  type="number"
                  placeholder="e.g., 648"
                  value={formData.sampleSize}
                  onChange={(e) => handleInputChange('sampleSize', e.target.value)}
                />
              </div>

              {/* Calculated Hatchability Metrics */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Hatch % (HOS)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Hatch of Set = hatched chicks ÷ sample size × 100
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, ld, cc).hatchPercent;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  HOF %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Hatch of Fertile = hatched chicks ÷ fertile eggs × 100
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, ld, cc).hofPercent;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  I/F dev. %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Fertile eggs ÷ sample size × 100
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, ld, cc).ifDevPercent;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Fertile Eggs
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Sample size - infertile eggs
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, ld, cc).fertileEggs;
                  })()}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  HOI %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Hatch incl. culls = (hatched chicks + culls) ÷ fertile eggs × 100
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  disabled
                  className="bg-white"
                  value={(() => {
                    const s = Number(formData.sampleSize || 648);
                    const inf = Number(formData.infertile || 0);
                    const ed = Number(formData.earlyDeath || 0);
                    const ld = Number(formData.lateDeath || 0);
                    const cc = Number(formData.cullChicks || 0);
                    return calculateHatchabilityMetrics(s, inf, ed, ld, cc).hoiPercent;
                  })()}
                />
              </div>
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
                  <TableHead>Chicks</TableHead>
                  <TableHead>Early Dead</TableHead>
                  <TableHead>Mid Dead</TableHead>
                  <TableHead>Late Death</TableHead>
                  <TableHead>Contamination</TableHead>
                  <TableHead>Mold</TableHead>
                  <TableHead>Abnormal</TableHead>
                  <TableHead>Hatch %</TableHead>
                  <TableHead>HOF %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.flockNumber}</TableCell>
                    <TableCell>{record.houseNumber}</TableCell>
                    <TableCell>{record.infertile} ({record.infertilePercent}%)</TableCell>
                    <TableCell>{record.chicks}</TableCell>
                    <TableCell>{record.earlyDeath} ({record.earlyDeathPercent}%)</TableCell>
                    <TableCell>{record.midDeath} ({record.midDeathPercent}%)</TableCell>
                    <TableCell>{record.lateDeath} ({record.lateDeathPercent}%)</TableCell>
                    <TableCell 
                      className={record.contaminationPercent > 1 ? "text-red-600 font-medium" : ""}
                    >
                      {record.contamination} ({record.contaminationPercent}%)
                    </TableCell>
                    <TableCell 
                      className={record.moldPercent > 1 ? "text-red-600 font-medium" : ""}
                    >
                      {record.mold} ({record.moldPercent}%)
                    </TableCell>
                    <TableCell 
                      className={record.abnormalPercent > 2 ? "text-red-600 font-medium" : ""}
                    >
                      {record.abnormal} ({record.abnormalPercent}%)
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {record.hatchPercent ? `${record.hatchPercent}%` : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {record.hofPercent ? `${record.hofPercent}%` : '-'}
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
