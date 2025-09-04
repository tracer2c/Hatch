import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomTarget {
  id: string;
  target_type: 'unit' | 'flock' | 'batch' | 'global';
  entity_id?: string;
  metric_name: string;
  target_value: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  entity_name?: string;
}

interface TargetFormData {
  target_type: 'unit' | 'flock' | 'batch' | 'global';
  entity_id?: string;
  metric_name: string;
  target_value: string;
  effective_from: string;
  effective_to?: string;
}

const METRIC_OPTIONS = [
  { value: 'fertility_rate', label: 'Fertility Rate (%)' },
  { value: 'hatch_rate', label: 'Hatch Rate (%)' },
  { value: 'hof_rate', label: 'Hatch of Fertile (%)' },
  { value: 'mortality_rate', label: 'Mortality Rate (%)' },
  { value: 'clear_rate', label: 'Clear Rate (%)' },
  { value: 'injection_rate', label: 'Injection Rate (%)' }
];

export const TargetManager = () => {
  const [targets, setTargets] = useState<CustomTarget[]>([]);
  const [entities, setEntities] = useState<{units: any[], flocks: any[], batches: any[]}>({
    units: [],
    flocks: [],
    batches: []
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TargetFormData>({
    target_type: 'global',
    metric_name: 'fertility_rate',
    target_value: '',
    effective_from: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTargets();
    loadEntities();
  }, []);

  const loadTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_targets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load entity names separately
      const targetsWithNames = await Promise.all(data.map(async (target) => {
        let entity_name = 'Global';
        
        if (target.entity_id && target.target_type !== 'global') {
          try {
            if (target.target_type === 'unit') {
              const { data: unitData } = await supabase
                .from('units')
                .select('name')
                .eq('id', target.entity_id)
                .single();
              entity_name = unitData?.name || 'Unknown Unit';
            } else if (target.target_type === 'flock') {
              const { data: flockData } = await supabase
                .from('flocks')
                .select('flock_name')
                .eq('id', target.entity_id)
                .single();
              entity_name = flockData?.flock_name || 'Unknown Flock';
            } else if (target.target_type === 'batch') {
              const { data: batchData } = await supabase
                .from('batches')
                .select('batch_number')
                .eq('id', target.entity_id)
                .single();
              entity_name = batchData?.batch_number || 'Unknown Batch';
            }
          } catch (entityError) {
            console.error('Error loading entity name:', entityError);
          }
        }

        return {
          ...target,
          entity_name
        } as CustomTarget;
      }));

      setTargets(targetsWithNames);
    } catch (error) {
      console.error('Error loading targets:', error);
      toast({
        title: "Error loading targets",
        description: "Failed to load custom targets",
        variant: "destructive"
      });
    }
  };

  const loadEntities = async () => {
    try {
      const [unitsRes, flocksRes, batchesRes] = await Promise.all([
        supabase.from('units').select('id, name').eq('status', 'active'),
        supabase.from('flocks').select('id, flock_name'),
        supabase.from('batches').select('id, batch_number').in('status', ['setting', 'incubating', 'hatching'])
      ]);

      setEntities({
        units: unitsRes.data || [],
        flocks: flocksRes.data || [],
        batches: batchesRes.data || []
      });
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const targetData = {
        target_type: formData.target_type,
        entity_id: formData.target_type === 'global' ? null : formData.entity_id,
        metric_name: formData.metric_name,
        target_value: parseFloat(formData.target_value),
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || null,
        is_active: true
      };

      const { error } = await supabase
        .from('custom_targets')
        .insert([targetData]);

      if (error) throw error;

      toast({
        title: "Target created",
        description: "Custom target has been created successfully"
      });

      setShowForm(false);
      setFormData({
        target_type: 'global',
        metric_name: 'fertility_rate',
        target_value: '',
        effective_from: new Date().toISOString().split('T')[0]
      });
      loadTargets();
    } catch (error) {
      console.error('Error creating target:', error);
      toast({
        title: "Error creating target",
        description: "Failed to create custom target",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (targetId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_targets')
        .update({ is_active: !currentStatus })
        .eq('id', targetId);

      if (error) throw error;

      toast({
        title: "Target updated",
        description: `Target ${!currentStatus ? 'activated' : 'deactivated'}`
      });

      loadTargets();
    } catch (error) {
      console.error('Error updating target:', error);
      toast({
        title: "Error updating target",
        description: "Failed to update target status",
        variant: "destructive"
      });
    }
  };

  const deleteTarget = async (targetId: string) => {
    try {
      const { error } = await supabase
        .from('custom_targets')
        .delete()
        .eq('id', targetId);

      if (error) throw error;

      toast({
        title: "Target deleted",
        description: "Custom target has been deleted"
      });

      loadTargets();
    } catch (error) {
      console.error('Error deleting target:', error);
      toast({
        title: "Error deleting target",
        description: "Failed to delete target",
        variant: "destructive"
      });
    }
  };

  const getEntityOptions = () => {
    switch (formData.target_type) {
      case 'unit':
        return entities.units.map(unit => ({ value: unit.id, label: unit.name }));
      case 'flock':
        return entities.flocks.map(flock => ({ value: flock.id, label: flock.flock_name }));
      case 'batch':
        return entities.batches.map(batch => ({ value: batch.id, label: batch.batch_number }));
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Custom Targets</h2>
          <p className="text-muted-foreground">Set performance targets for different levels</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Target
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Target</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target-type">Target Level</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value: any) => setFormData(prev => ({ 
                      ...prev, 
                      target_type: value,
                      entity_id: undefined 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="flock">Flock</SelectItem>
                      <SelectItem value="batch">Batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.target_type !== 'global' && (
                  <div>
                    <Label htmlFor="entity">Select {formData.target_type}</Label>
                    <Select
                      value={formData.entity_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, entity_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Choose ${formData.target_type}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getEntityOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="metric">Metric</Label>
                  <Select
                    value={formData.metric_name}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, metric_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target-value">Target Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                    placeholder="Enter target value"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effective-from">Effective From</Label>
                  <Input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="effective-to">Effective To (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.effective_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_to: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save Target
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {targets.map((target) => (
          <Card key={target.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={target.target_type === 'global' ? 'default' : 'secondary'}>
                      {target.target_type.charAt(0).toUpperCase() + target.target_type.slice(1)}
                    </Badge>
                    <Badge variant={target.is_active ? 'default' : 'secondary'}>
                      {target.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold">
                    {METRIC_OPTIONS.find(m => m.value === target.metric_name)?.label || target.metric_name}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {target.entity_name} • Target: {target.target_value}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From {new Date(target.effective_from).toLocaleDateString()}
                    {target.effective_to && ` to ${new Date(target.effective_to).toLocaleDateString()}`}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(target.id, target.is_active)}
                  >
                    {target.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTarget(target.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {targets.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No custom targets configured yet.</p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Target
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};