import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, RefreshCw, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BatchStatusRule {
  id: string;
  name: string;
  fromStatus: string;
  toStatus: string;
  daysAfterSet: number;
  requiresData: boolean;
  enabled: boolean;
}

const BatchStatusSettings = () => {
  const [autoProgressEnabled, setAutoProgressEnabled] = useState(true);
  const [statusRules, setStatusRules] = useState<BatchStatusRule[]>([
    {
      id: '1',
      name: 'Start Incubation',
      fromStatus: 'setting',
      toStatus: 'incubating',
      daysAfterSet: 1,
      requiresData: false,
      enabled: true
    },
    {
      id: '2',
      name: 'Start Hatching',
      fromStatus: 'incubating',
      toStatus: 'hatching',
      daysAfterSet: 18,
      requiresData: false,
      enabled: true
    },
    {
      id: '3',
      name: 'Complete Batch',
      fromStatus: 'hatching',
      toStatus: 'completed',
      daysAfterSet: 21,
      requiresData: true,
      enabled: true
    }
  ]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setting': return 'bg-blue-100 text-blue-800';
      case 'incubating': return 'bg-yellow-100 text-yellow-800';
      case 'hatching': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRuleUpdate = (ruleId: string, field: string, value: any) => {
    setStatusRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    ));
  };

  const runBatchStatusUpdate = async () => {
    if (!autoProgressEnabled) {
      toast({
        title: "Auto-progression disabled",
        description: "Enable auto-progression to run batch status updates",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get all active batches
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select(`
          id, 
          batch_number, 
          set_date, 
          status,
          fertility_analysis(id)
        `)
        .in('status', ['setting', 'incubating', 'hatching']);

      if (batchesError) throw batchesError;

      let updatedCount = 0;
      const today = new Date();

      for (const batch of batches || []) {
        const setDate = new Date(batch.set_date);
        const daysSinceSet = Math.floor((today.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));

        // Find applicable rule
        const applicableRule = statusRules.find(rule => 
          rule.enabled && 
          rule.fromStatus === batch.status && 
          daysSinceSet >= rule.daysAfterSet &&
          (!rule.requiresData || (rule.requiresData && batch.fertility_analysis?.length > 0))
        );

        if (applicableRule) {
          const { error: updateError } = await supabase
            .from('batches')
            .update({ status: applicableRule.toStatus as any })
            .eq('id', batch.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      toast({
        title: "Batch Status Update Complete",
        description: `Updated ${updatedCount} batches based on automation rules`,
      });

    } catch (error) {
      console.error('Error updating batch statuses:', error);
      toast({
        title: "Error updating batuses",
        description: "Failed to run batch status automation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    // In a real app, you'd save these settings to a database or config
    localStorage.setItem('batchStatusSettings', JSON.stringify({
      autoProgressEnabled,
      statusRules
    }));
    
    toast({
      title: "Settings Saved",
      description: "Batch status automation settings have been saved"
    });
  };

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('batchStatusSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setAutoProgressEnabled(parsed.autoProgressEnabled ?? true);
      setStatusRules(parsed.statusRules || statusRules);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Batch Status Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-progress">Enable Auto-Progression</Label>
              <p className="text-sm text-gray-600">
                Automatically advance batch statuses based on time and data completion
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                id="auto-progress"
                checked={autoProgressEnabled}
                onCheckedChange={setAutoProgressEnabled}
              />
              <Button
                onClick={runBatchStatusUpdate}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>From Status</TableHead>
                  <TableHead>To Status</TableHead>
                  <TableHead>Days After Set</TableHead>
                  <TableHead>Requires Data</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(rule.fromStatus)}>
                        {rule.fromStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(rule.toStatus)}>
                        {rule.toStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={rule.daysAfterSet}
                        onChange={(e) => handleRuleUpdate(rule.id, 'daysAfterSet', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.requiresData}
                        onCheckedChange={(checked) => handleRuleUpdate(rule.id, 'requiresData', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleRuleUpdate(rule.id, 'enabled', checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={saveSettings} variant="outline">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Flow Info */}
      <Card>
        <CardHeader>
          <CardTitle>Status Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge className="bg-blue-100 text-blue-800">setting</Badge>
            <span>→</span>
            <Badge className="bg-yellow-100 text-yellow-800">incubating</Badge>
            <span>→</span>
            <Badge className="bg-orange-100 text-orange-800">hatching</Badge>
            <span>→</span>
            <Badge className="bg-green-100 text-green-800">completed</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Batches automatically progress through statuses based on days elapsed and data availability.
            The "Complete Batch" rule requires fertility analysis data to be recorded.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchStatusSettings;