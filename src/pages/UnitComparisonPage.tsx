import { useEffect } from "react";
import UnitWeeklyComparison from "@/components/dashboard/UnitWeeklyComparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const UnitComparisonPage = () => {
  useEffect(() => {
    document.title = "Hatcheries Weekly Comparison | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Weekly performance comparison across different hatcheries and time periods."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Weekly performance comparison across different hatcheries and time periods.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6">
      <UnitWeeklyComparison />
    </div>
  );
};

export default UnitComparisonPage;