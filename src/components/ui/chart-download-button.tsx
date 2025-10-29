import React from 'react';
import { Download } from 'lucide-react';
import { Button } from './button';
import { useChartDownload } from '@/hooks/useChartDownload';

interface ChartDownloadButtonProps {
  chartId: string;
  filename?: string;
  className?: string;
}

export const ChartDownloadButton: React.FC<ChartDownloadButtonProps> = ({
  chartId,
  filename,
  className = ""
}) => {
  const { downloadChart } = useChartDownload();

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadChart(chartId, filename);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      className={`h-8 w-8 p-0 hover:bg-accent ${className}`}
      title="Download chart as image"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
};