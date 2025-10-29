import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, Filter, ChevronDown, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useUnitsData, useHouseNumbers } from "@/hooks/useComparisonData";
import type { ComparisonFilters } from "@/hooks/useComparisonData";

interface ComparisonFiltersProps {
  filters: ComparisonFilters;
  onFiltersChange: (filters: ComparisonFilters) => void;
  onApplyFilters: () => void;
}

const ComparisonFiltersComponent = ({ filters, onFiltersChange, onApplyFilters }: ComparisonFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: units = [] } = useUnitsData();
  const { data: houseNumbers = [] } = useHouseNumbers();

  const quickDateRanges = [
    { label: "Last 30 days", days: 30 },
    { label: "Last 60 days", days: 60 },
    { label: "Last 90 days", days: 90 },
  ];

  const batchStatusOptions = [
    { value: "setting", label: "Setting" },
    { value: "incubating", label: "Incubating" },
    { value: "hatching", label: "Hatching" },
    { value: "completed", label: "Completed" },
  ];

  const handleQuickDateRange = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    onFiltersChange({ ...filters, dateRange: { from, to } });
  };

  const handleUnitToggle = (unitId: string) => {
    const newUnitIds = filters.unitIds.includes(unitId)
      ? filters.unitIds.filter(id => id !== unitId)
      : [...filters.unitIds, unitId];
    onFiltersChange({ ...filters, unitIds: newUnitIds });
  };

  const handleHouseToggle = (houseNumber: string) => {
    const newHouseNumbers = filters.houseNumbers.includes(houseNumber)
      ? filters.houseNumbers.filter(h => h !== houseNumber)
      : [...filters.houseNumbers, houseNumber];
    onFiltersChange({ ...filters, houseNumbers: newHouseNumbers });
  };

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.batchStatus.includes(status)
      ? filters.batchStatus.filter(s => s !== status)
      : [...filters.batchStatus, status];
    onFiltersChange({ ...filters, batchStatus: newStatus });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: { from: subDays(new Date(), 30), to: new Date() },
      unitIds: [],
      houseNumbers: [],
      batchStatus: ["completed"],
      limit: 100,
    });
  };

  const activeFiltersCount = 
    (filters.unitIds.length > 0 ? 1 : 0) +
    (filters.houseNumbers.length > 0 ? 1 : 0) +
    (filters.batchStatus.length > 0 ? 1 : 0);

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Comparison Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount} active
                  </Badge>
                )}
              </CardTitle>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Time Period</h4>
              <div className="flex flex-wrap gap-2">
                {quickDateRanges.map((range) => (
                  <Button
                    key={range.days}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateRange(range.days)}
                    className="h-8"
                  >
                    {range.label}
                  </Button>
                ))}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {filters.dateRange.from && filters.dateRange.to
                        ? `${format(filters.dateRange.from, "MMM d")} - ${format(filters.dateRange.to, "MMM d")}`
                        : "Custom range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          onFiltersChange({ ...filters, dateRange: { from: range.from, to: range.to } });
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Units Filter */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Units</h4>
                <ScrollArea className="h-24 border rounded-md p-2">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`unit-${unit.id}`}
                        checked={filters.unitIds.includes(unit.id)}
                        onCheckedChange={() => handleUnitToggle(unit.id)}
                      />
                      <label
                        htmlFor={`unit-${unit.id}`}
                        className="text-sm cursor-pointer hover:text-primary"
                      >
                        {unit.name}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Houses Filter */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Houses</h4>
                <ScrollArea className="h-24 border rounded-md p-2">
                  {houseNumbers.map((houseNumber) => (
                    <div key={houseNumber} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`house-${houseNumber}`}
                        checked={filters.houseNumbers.includes(houseNumber)}
                        onCheckedChange={() => handleHouseToggle(houseNumber)}
                      />
                      <label
                        htmlFor={`house-${houseNumber}`}
                        className="text-sm cursor-pointer hover:text-primary"
                      >
                        {houseNumber}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Batch Status</h4>
                <ScrollArea className="h-24 border rounded-md p-2">
                  {batchStatusOptions.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filters.batchStatus.includes(status.value)}
                        onCheckedChange={() => handleStatusToggle(status.value)}
                      />
                      <label
                        htmlFor={`status-${status.value}`}
                        className="text-sm cursor-pointer hover:text-primary"
                      >
                        {status.label}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>

            {/* Results Limit */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Results Limit</h4>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) => onFiltersChange({ ...filters, limit: parseInt(value) })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 batches</SelectItem>
                  <SelectItem value="100">100 batches</SelectItem>
                  <SelectItem value="200">200 batches</SelectItem>
                  <SelectItem value="500">500 batches</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Active Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.unitIds.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Units: {filters.unitIds.length}
                    </Badge>
                  )}
                  {filters.houseNumbers.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Houses: {filters.houseNumbers.length}
                    </Badge>
                  )}
                  {filters.batchStatus.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Status: {filters.batchStatus.length}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button onClick={onApplyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ComparisonFiltersComponent;