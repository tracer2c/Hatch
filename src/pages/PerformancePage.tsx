import { useEffect } from "react";
import PerformanceAnalytics from "@/components/dashboard/PerformanceAnalytics";

const PerformancePage = () => {
  useEffect(() => {
    document.title = "Performance Analytics | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Performance analytics dashboard with process flow analysis and key metrics."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Performance analytics dashboard with process flow analysis and key metrics.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      <PerformanceAnalytics />
    </div>
  );
};

export default PerformancePage;