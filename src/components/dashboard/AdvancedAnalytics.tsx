import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, TrendingUp, Target, BarChart3 } from "lucide-react";
import HeatmapCalendar from "./HeatmapCalendar";
import IncubationTimeline from "./IncubationTimeline";
import BatchFlowSankey from "./BatchFlowSankey";
import UnitWeeklyComparison from "./UnitWeeklyComparison";
import PredictionsPanel from "./PredictionsPanel";

const AdvancedAnalytics = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Advanced Analytics
        </h2>
        <p className="text-muted-foreground">
          Deep insights and advanced visualizations for comprehensive hatchery analysis
        </p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Environmental Calendar
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Incubation Timeline
          </TabsTrigger>
          <TabsTrigger value="flow" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            House Flow
          </TabsTrigger>
          <TabsTrigger value="unit-weekly" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Unit Weekly Comparison
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <HeatmapCalendar />
        </TabsContent>

        <TabsContent value="timeline">
          <IncubationTimeline />
        </TabsContent>

        <TabsContent value="flow">
          <BatchFlowSankey />
        </TabsContent>

        <TabsContent value="unit-weekly">
          <UnitWeeklyComparison />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;