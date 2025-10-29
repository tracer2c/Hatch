import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";

interface FertilityAnalysisTabProps {
  data: any[];
  searchTerm: string;
}

export const FertilityAnalysisTab = ({ data, searchTerm }: FertilityAnalysisTabProps) => {
  const { showPercentages, formatValue, formatPercentage } = usePercentageToggle();

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

  const calculateTotalMortality = (earlyDead: number | null, lateDead: number | null) => {
    if (!earlyDead && !lateDead) return "-";
    return ((earlyDead || 0) + (lateDead || 0)).toString();
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
            <TableHead className="text-right">Infertile</TableHead>
            <TableHead className="text-right">Fertile</TableHead>
            <TableHead className="text-right">Early Dead</TableHead>
            <TableHead className="text-right">Late Dead</TableHead>
            <TableHead className="text-right">Fertility %</TableHead>
            <TableHead className="text-right">Total Embryonic Mortality</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center text-muted-foreground">
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
                  {formatValue(item.infertile_eggs, item.sample_size)}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(item.fertile_eggs, item.sample_size)}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(item.early_dead, item.sample_size)}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(item.late_dead, item.sample_size)}
                </TableCell>
                <TableCell className="text-right">
                  {item.fertility_percent ? formatPercentage(item.fertility_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {calculateTotalMortality(item.early_dead, item.late_dead)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
