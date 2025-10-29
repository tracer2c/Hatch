import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";

interface HatchPerformanceTabProps {
  data: any[];
  searchTerm: string;
}

export const HatchPerformanceTab = ({ data, searchTerm }: HatchPerformanceTabProps) => {
  const { formatPercentage, formatValue } = usePercentageToggle();

  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const calculateWeek = (setDate: string) => {
    const date = new Date(setDate);
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock#</TableHead>
            <TableHead>Flock Name</TableHead>
            <TableHead className="text-right">Age (weeks)</TableHead>
            <TableHead>House#</TableHead>
            <TableHead>Set Date</TableHead>
            <TableHead className="text-right">Week</TableHead>
            <TableHead className="text-right">Sample Size</TableHead>
            <TableHead className="text-right">Hatch</TableHead>
            <TableHead className="text-right">Hatch %</TableHead>
            <TableHead className="text-right">Hatch Over Fertile %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((item) => (
              <TableRow key={item.batch_id} className="hover:bg-muted/50">
                <TableCell>{item.flock_number || "-"}</TableCell>
                <TableCell>{item.flock_name || "-"}</TableCell>
                <TableCell className="text-right">{item.age_weeks || "-"}</TableCell>
                <TableCell>{item.house_number || "-"}</TableCell>
                <TableCell>{item.set_date ? new Date(item.set_date).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-right">{item.set_date ? calculateWeek(item.set_date) : "-"}</TableCell>
                <TableCell className="text-right">{item.sample_size || "-"}</TableCell>
                <TableCell className="text-right">
                  {item.chicks_hatched ? formatValue(item.chicks_hatched, item.sample_size) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.hatch_percent ? formatPercentage(item.hatch_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.hof_percent ? formatPercentage(item.hof_percent) : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
