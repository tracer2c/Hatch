import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

interface UseChartDownloadReturn {
  downloadChart: (elementId: string, filename?: string) => Promise<void>;
  isDownloading: boolean;
}

export const useChartDownload = (): UseChartDownloadReturn => {
  const { toast } = useToast();

  const downloadChart = useCallback(async (elementId: string, filename?: string) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        toast({
          title: "Error",
          description: "Chart element not found",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "Generating image...",
        description: "Please wait while we create your chart image",
      });

      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = filename || `chart-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Chart downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading chart:', error);
      toast({
        title: "Error",
        description: "Failed to download chart. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    downloadChart,
    isDownloading: false, // Can be extended later with actual loading state
  };
};