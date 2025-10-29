import { useEffect } from "react";
import BatchFlowSankey from "@/components/dashboard/BatchFlowSankey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";

const HouseFlowPage = () => {
  useEffect(() => {
    document.title = "House Flow Analysis | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Detailed house flow analysis and batch processing visualization."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Detailed house flow analysis and batch processing visualization.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      <BatchFlowSankey />
    </div>
  );
};

export default HouseFlowPage;