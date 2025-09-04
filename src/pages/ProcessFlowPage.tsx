import { useEffect } from "react";
import ProcessFlowDashboard from "@/components/dashboard/ProcessFlowDashboard";

const ProcessFlowPage = () => {
  useEffect(() => {
    document.title = "Process Flow Analysis | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Complete process flow analysis with batch performance metrics, age-based trends, and breed comparisons."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Complete process flow analysis with batch performance metrics, age-based trends, and breed comparisons.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      <ProcessFlowDashboard />
    </div>
  );
};

export default ProcessFlowPage;