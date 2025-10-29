import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, TrendingUp } from "lucide-react";
import { CompleteDataView } from "@/components/dashboard/CompleteDataView";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { toast } from "sonner";

const EmbrexDataSheetPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { showPercentages, setShowPercentages } = usePercentageToggle();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Data Sheet | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "View and analyze all hatchery data including flock information, fertility analysis, egg pack quality, and hatch performance metrics."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "View and analyze all hatchery data including flock information, fertility analysis, egg pack quality, and hatch performance metrics.";
      document.head.appendChild(m);
    }
  }, []);

  const handleExportCSV = () => {
    toast.success("CSV export started");
    // Export functionality will be implemented based on active tab
  };

  const handleTimelineView = () => {
    navigate("/embrex-timeline");
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col">
      {/* Header Section */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Data Sheet</h1>
            <p className="text-sm text-muted-foreground mt-1">View and analyze all hatchery data in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="percentage-toggle"
                checked={showPercentages}
                onCheckedChange={setShowPercentages}
              />
              <Label htmlFor="percentage-toggle" className="text-sm cursor-pointer">
                Show percentages
              </Label>
            </div>
            <Button variant="outline" onClick={handleTimelineView} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Timeline View
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Data</TabsTrigger>
              <TabsTrigger value="embrex">Embrex/HOI</TabsTrigger>
              <TabsTrigger value="residue">Residue Analysis</TabsTrigger>
              <TabsTrigger value="egg-pack">Egg Quality</TabsTrigger>
              <TabsTrigger value="hatch">Hatch Results</TabsTrigger>
            </TabsList>
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </Tabs>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-auto p-6">
        <CompleteDataView activeTab={activeTab} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default EmbrexDataSheetPage;