import { useEffect } from "react";
import AdvancedAnalytics from "@/components/dashboard/AdvancedAnalytics";

const AnalyticsPage = () => {
  useEffect(() => {
    document.title = "Advanced Analytics | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Advanced analytics with environmental calendar, predictions, and unit comparisons."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Advanced analytics with environmental calendar, predictions, and unit comparisons.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      <AdvancedAnalytics />
    </div>
  );
};

export default AnalyticsPage;