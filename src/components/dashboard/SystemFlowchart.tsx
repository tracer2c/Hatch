import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileImage, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';

const SystemFlowchart = () => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const flowchartDefinition = `
flowchart TD
    Start([🏭 Hatchery System Entry]) --> Dashboard{📊 Main Dashboard}
    
    Dashboard --> Tab1[📈 Live Overview]
    Dashboard --> Tab2[🔄 Process Flow]
    Dashboard --> Tab3[📊 Performance Charts]
    Dashboard --> Tab4[📈 Analysis & Comparison]
    Dashboard --> Tab5[🧠 Advanced Analytics]
    
    %% Data Entry Flow
    Tab1 --> DataEntry[📝 Data Entry Navigation]
    DataEntry --> HOFHOI[🥚 HOF / HOI Entry]
    DataEntry --> Fertility[🐣 Fertility Analysis Entry]
    DataEntry --> QA[🔍 QA Monitoring Entry]
    DataEntry --> Residue[🧪 Residue Analysis Entry]
    
    %% Daily Operations
    Tab1 --> Checklist[✅ Daily Checklist]
    Checklist --> SOPItems[📋 SOP-Based Items]
    Checklist --> Progress[📊 Progress Tracking]
    
    %% Management Center
    Tab1 --> Management[⚙️ Management Center]
    Management --> BatchMgmt[📦 Batch Management]
    Management --> SOPMgmt[📚 SOP Management]
    Management --> FlockMgmt[🐔 Flock Management]
    Management --> MachineMgmt[🏭 Machine Management]
    Management --> DataCleanup[🧹 Data Cleanup]
    
    %% Process Flow Analysis (Updated with HOI/HOF)
    Tab2 --> FlowAnalysis[🔄 Process Flow Analysis]
    FlowAnalysis --> HOICharts[📈 HOI Analysis]
    FlowAnalysis --> HOFCharts[📈 HOF Analysis]
    FlowAnalysis --> AgePerformance[📈 Performance by Flock Age]
    FlowAnalysis --> BreedComparison[🐔 Performance by Breed]
    FlowAnalysis --> ProcessMetrics[📊 Complete Process Metrics]
    
    %% Performance Analytics
    Tab3 --> PerformanceCharts[📊 Performance Charts]
    PerformanceCharts --> TrendAnalysis[📈 Trend Analysis]
    PerformanceCharts --> KPIMetrics[🎯 KPI Metrics]
    PerformanceCharts --> HistoricalData[📅 Historical Performance]
    PerformanceCharts --> MultiUnit[🏢 Multi-Unit Aggregation]
    
    %% Comparison & Analysis (Colorful)
    Tab4 --> ComparisonAnalysis[📈 Comparison Analysis]
    ComparisonAnalysis --> BatchComparison[📦 Batch-to-Batch Comparison]
    ComparisonAnalysis --> BenchmarkAnalysis[🎯 Benchmark Analysis]
    ComparisonAnalysis --> TrendPrediction[🔮 Trend Prediction]
    ComparisonAnalysis --> ColorPalette[🎨 Themed Chart Palette]
    
    %% Advanced Analytics
    Tab5 --> AdvancedAnalytics[🧠 Advanced Analytics Hub]
    AdvancedAnalytics --> EnvironmentalCalendar[📅 Environmental Calendar]
    AdvancedAnalytics --> IncubationTimeline[⏰ Incubation Timeline]
    AdvancedAnalytics --> BatchFlowSankey[📊 Batch Flow Analysis]
    AdvancedAnalytics --> PredictionsPanel[🔮 Predictions Panel]
    AdvancedAnalytics --> AIInsights[🤖 AI Chart Insights]
    
    %% Advanced Analytics Data Flows
    BatchFlowSankey --> ActiveBatchData[📦 Active Batch Integration]
    PredictionsPanel --> PredictEdge[⚡ predict-metrics Edge Function]
    AIInsights --> ChartEdge[⚡ chart-insights Edge Function]
    EnvironmentalCalendar --> QAMonitoringData[🌡️ QA Monitoring Data]
    IncubationTimeline --> RealTimeTracking[⏱️ Real-time Batch Tracking]
    
    %% Alert System
    AlertSystem[🚨 Alert & Monitoring System]
    AlertSystem --> TempAlerts[🌡️ Temperature Alerts]
    AlertSystem --> HumidityAlerts[💧 Humidity Alerts]
    AlertSystem --> ScheduleAlerts[⏰ Schedule Reminders]
    AlertSystem --> MaintenanceAlerts[🔧 Maintenance Alerts]
    
    %% Data Processing Engine
    DataEngine[(🔄 Data Processing Engine)]
    HOFHOI --> DataEngine
    Fertility --> DataEngine
    QA --> DataEngine
    Residue --> DataEngine
    
    DataEngine --> Analytics[📊 Analytics Generation]
    Analytics --> Tab2
    Analytics --> Tab3
    Analytics --> Tab4
    
    %% Advanced Analytics Engine
    DataEngine --> AdvancedEngine[🧠 Advanced Analytics Engine]
    AdvancedEngine --> Tab5
    AdvancedEngine --> ProjectedMetrics[📈 Projected Metrics]
    AdvancedEngine --> ActiveBatchData
    
    %% Database Integration
    DataEngine --> Database[(🗄️ Supabase Database)]
    Database --> Batches[📦 Batches Table]
    Database --> Flocks[🐔 Flocks Table]
    Database --> Machines[🏭 Machines Table]
    Database --> QualityData[📊 Quality Data Tables]
    Database --> Alerts[🚨 Alerts Table]
    Database --> EdgeLogs[📝 Edge Function Logs]
    
    %% Real-time Monitoring
    Database --> RealTimeSync[⚡ Real-time Sync]
    RealTimeSync --> AlertSystem
    RealTimeSync --> Dashboard
    
    %% Export & Reporting
    Analytics --> Reports[📄 Reports & Export]
    Reports --> PDFExport[📄 PDF Reports]
    Reports --> ExcelExport[📊 Excel Export]
    Reports --> DataVisualization[📊 Data Visualization]
    Reports --> ProjectReport[📕 Project Report Screen]
    
    %% Milestones Timeline
    subgraph Milestones
      M1[Setup & Auth • Weeks 1-2]
      M2[Data Models & Entry • Weeks 3-5]
      M3[Dashboards & Flow • Weeks 6-9]
      M4[HOI/HOF + Analysis • Weeks 10-13]
      M5[Advanced Analytics + AI • Weeks 14-18]
      M6[Alerts & Exports • Weeks 19-22]
      M7[Polish, Colors, UX • Weeks 23-27]
    end
    Start --> M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7 --> Dashboard
    
    %% Styling
    classDef primary fill:#3b82f6,stroke:#1e40af,stroke-width:2px,color:#fff
    classDef secondary fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    classDef accent fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef data fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
    classDef storage fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    
    class Dashboard,Tab1,Tab2,Tab3,Tab4,Tab5 primary
    class DataEntry,HOFHOI,Fertility,QA,Residue secondary
    class Management,BatchMgmt,SOPMgmt,FlockMgmt,MachineMgmt accent
    class DataEngine,Analytics,AlertSystem,AdvancedEngine,PredictionsPanel,AIInsights data
    class Database,Batches,Flocks,Machines,QualityData,Alerts,EdgeLogs storage
    class AdvancedAnalytics,EnvironmentalCalendar,IncubationTimeline,BatchFlowSankey,PredictiveAnalytics,HOICharts,HOFCharts primary
  `;

  useEffect(() => {
    if (mermaidRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      });

      mermaid.render('mermaid-diagram', flowchartDefinition).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
          setIsLoading(false);
        }
      });
    }
  }, []);

  const downloadAsImage = async () => {
    if (mermaidRef.current) {
      try {
        const canvas = await html2canvas(mermaidRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });
        
        const link = document.createElement('a');
        link.download = 'hatchery-system-flowchart.png';
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Error generating image:', error);
      }
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Hatchery Management System Flowchart
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button 
                onClick={handleZoomOut}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isLoading || zoomLevel <= 0.3}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2 min-w-[50px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button 
                onClick={handleZoomIn}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isLoading || zoomLevel >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleResetZoom}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              onClick={downloadAsImage}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Download className="h-4 w-4" />
              Download Image
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete system architecture and data flow visualization
        </p>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="w-full h-[600px] overflow-hidden border rounded-md relative bg-gray-50"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-white z-10">
              Loading flowchart...
            </div>
          )}
          <div 
            ref={mermaidRef} 
            className="w-full h-full"
            style={{
              transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Use mouse to pan • Zoom controls above • Click download to save as image
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemFlowchart;