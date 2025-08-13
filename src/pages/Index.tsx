
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, LineChart, Activity, Workflow, Brain } from "lucide-react";
import Navigation from "@/components/Navigation";
import BatchOverviewDashboard from "@/components/dashboard/BatchOverviewDashboard";
import ProcessFlowDashboard from "@/components/dashboard/ProcessFlowDashboard";
import PerformanceCharts from "@/components/dashboard/PerformanceCharts";
import ComparisonAnalysis from "@/components/dashboard/ComparisonAnalysis";
import SystemFlowchart from "@/components/dashboard/SystemFlowchart";
import AdvancedAnalytics from "@/components/dashboard/AdvancedAnalytics";
import { useBatchPerformanceMetrics } from "@/hooks/useHouseData";
import { useEffect } from "react";

const Index = () => {
  const { data: performanceMetrics } = useBatchPerformanceMetrics();

  useEffect(() => {
    document.title = "Hatchery Performance Dashboard | Live Overview";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Live overview of hatchery performance metrics, QA alerts, and machine utilization."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Live overview of hatchery performance metrics, QA alerts, and machine utilization.";
      document.head.appendChild(m);
    }
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (!existingCanonical) {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      link.setAttribute("href", window.location.href);
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Hatchery Performance Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time analytics and insights for hatchery operations
          </p>
        </div>

        {/* Navigation */}
        <Navigation />

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Overview
            </TabsTrigger>
            <TabsTrigger value="process" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Process Flow
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Advanced Analytics
            </TabsTrigger>
            <TabsTrigger value="flowchart" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              System Flow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <BatchOverviewDashboard />
          </TabsContent>

          <TabsContent value="process">
            <ProcessFlowDashboard />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceCharts data={performanceMetrics || []} />
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonAnalysis data={performanceMetrics || []} />
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedAnalytics />
          </TabsContent>

          <TabsContent value="flowchart">
            <SystemFlowchart />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
