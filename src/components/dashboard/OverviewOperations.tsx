import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Settings } from "lucide-react";
import BatchOverviewDashboard from "./BatchOverviewDashboard";
import { useViewMode } from "@/contexts/ViewModeContext";

const OverviewOperations = () => {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Overview & Operations Center</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={viewMode === 'simple' ? 'default' : 'secondary'}>
                {viewMode === 'simple' ? 'Simple View' : 'Detailed View'}
              </Badge>
              <Switch
                checked={viewMode === 'detailed'}
                onCheckedChange={(checked) => setViewMode(checked ? 'detailed' : 'simple')}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Overview Dashboard */}
      <BatchOverviewDashboard />
    </div>
  );
};

export default OverviewOperations;