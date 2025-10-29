import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface OverviewHeaderProps {
  machines?: { id: string; name: string }[];
  onRefresh?: () => void;
  onExport?: () => void;
  onStatusChange?: (status: string) => void;
  onMachineChange?: (machineId: string | "all") => void;
  onDateRangeChange?: (range: { from?: Date; to?: Date }) => void;
  
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({ machines, onRefresh, onExport, onStatusChange, onMachineChange, onDateRangeChange }) => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [status, setStatus] = React.useState<string>("all");
  const [machine, setMachine] = React.useState<string>("all");

  const handleRefresh = () => {
    if (onRefresh) return onRefresh();
    window.location.reload();
  };

  const handleExport = () => {
    if (onExport) return onExport();
    toast({ title: "Export queued", description: "Selected charts will be exported shortly." });
  };

  return (
    <div className="sticky top-0 z-10 -mx-4 px-4 lg:mx-0 lg:px-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between h-auto lg:h-14 py-3 lg:py-0">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start min-w-[240px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from && dateRange.to ? (
                  <span>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </span>
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange as any}
                onSelect={(range: any) => {
                  setDateRange(range);
                  // notify parent
                  (onDateRangeChange as any)?.(range);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              onStatusChange?.(v);
            }}
          >
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="setting">Setting</SelectItem>
              <SelectItem value="incubating">Incubating</SelectItem>
              <SelectItem value="hatching">Hatching</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {machines && machines.length > 0 && (
            <Select
              value={machine}
              onValueChange={(v) => {
                setMachine(v);
                onMachineChange?.(v);
              }}
            >
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All machines</SelectItem>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>
    </div>
  );
};
