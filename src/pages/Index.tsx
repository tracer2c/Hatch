
import { useEffect } from "react";
import OverviewOperations from "@/components/dashboard/OverviewOperations";

const Index = () => {
  useEffect(() => {
    document.title = "Dashboard Overview | Hatchery Pro";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Live overview of hatchery operations with KPIs, alerts, and system status."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Live overview of hatchery operations with KPIs, alerts, and system status.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      <OverviewOperations />
    </div>
  );
};

export default Index;
