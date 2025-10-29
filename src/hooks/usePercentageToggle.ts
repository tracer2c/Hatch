import { useState, useEffect } from "react";

export const usePercentageToggle = () => {
  const [showPercentages, setShowPercentages] = useState(() => {
    const saved = localStorage.getItem("showPercentages");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("showPercentages", JSON.stringify(showPercentages));
  }, [showPercentages]);

  const formatValue = (value: number | null, total: number | null, decimals = 1): string => {
    if (value === null || value === undefined) return "-";
    
    if (showPercentages && total && total > 0) {
      const percentage = (value / total) * 100;
      return `${percentage.toFixed(decimals)}%`;
    }
    
    return value.toLocaleString();
  };

  const formatPercentage = (value: number | null, decimals = 1): string => {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(decimals)}%`;
  };

  return {
    showPercentages,
    setShowPercentages,
    formatValue,
    formatPercentage,
  };
};
