import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, LineChart, Eye, EyeOff } from "lucide-react";
import ProcessFlowDashboard from "./ProcessFlowDashboard";
import PerformanceCharts from "./PerformanceCharts";
import ComparisonAnalysis from "./ComparisonAnalysis";
import { useBatchPerformanceMetrics } from "@/hooks/useHouseData";

const PerformanceAnalytics = () => {
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [showComparison, setShowComparison] = useState(false);
  const { data: performanceMetrics } = useBatchPerformanceMetrics();

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Performance Analytics Center</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={viewMode === 'simple' ? 'default' : 'secondary'}>
                  {viewMode === 'simple' ? 'Simple View' : 'Detailed View'}
                </Badge>
                <Switch
                  checked={viewMode === 'detailed'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'detailed' : 'simple')}
                />
              </div>
              {viewMode === 'detailed' && (
                <div className="flex items-center gap-2">
                  {showComparison ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span className="text-sm">Comparison Analysis</span>
                  <Switch
                    checked={showComparison}
                    onCheckedChange={setShowComparison}
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Simple View - Just the main process flow */}
      {viewMode === 'simple' && (
        <div className="space-y-6">
          <ProcessFlowDashboard />
        </div>
      )}

      {/* Detailed View - All analytics */}
      {viewMode === 'detailed' && (
        <Tabs defaultValue="process" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="process" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Process Flow Analysis
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Charts
            </TabsTrigger>
            {showComparison && (
              <TabsTrigger value="comparison" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Comparison Analysis
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="process">
            <ProcessFlowDashboard />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceCharts data={performanceMetrics || []} />
          </TabsContent>

          {showComparison && (
            <TabsContent value="comparison">
              <ComparisonAnalysis data={performanceMetrics || []} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default PerformanceAnalytics;