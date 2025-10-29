import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

interface ResidueBreakoutRow {
  batch_id: string;
  batch_number: string;
  set_date: string;
  flock_number: number;
  flock_name: string;
  age_weeks: number;
  house_number: string;
  sample_size: number | null;
  infertile_eggs: number | null;
  fertile_eggs: number | null;
  early_dead: number | null;
  mid_dead: number | null;
  late_dead: number | null;
  fertility_percent: number | null;
  chicks_hatched: number;
  hatch_percent: number | null;
  hof_percent: number | null;
}

type SortColumn = keyof ResidueBreakoutRow | null;
type SortDirection = "asc" | "desc";

const ResidueBreakoutPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("set_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: residueData, isLoading } = useQuery({
    queryKey: ["residue-breakout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select(`
          id,
          batch_number,
          set_date,
          chicks_hatched,
          flocks (
            flock_number,
            flock_name,
            age_weeks
          ),
          fertility_analysis (
            sample_size,
            infertile_eggs,
            fertile_eggs,
            early_dead,
            late_dead,
            fertility_percent,
            hatch_percent,
            hof_percent
          ),
          residue_analysis (
            mid_dead
          )
        `)
        .order("set_date", { ascending: false });

      if (error) throw error;

      return data.map((batch: any) => {
        // Extract house number from batch_number (e.g., "Jimmy Trawick #14" -> "#14")
        const houseMatch = batch.batch_number.match(/#(\d+)/);
        const houseNumber = houseMatch ? `#${houseMatch[1]}` : "-";

        const fertility = batch.fertility_analysis?.[0];
        const residue = batch.residue_analysis?.[0];
        const flock = batch.flocks;

        return {
          batch_id: batch.id,
          batch_number: batch.batch_number,
          set_date: batch.set_date,
          flock_number: flock?.flock_number || 0,
          flock_name: flock?.flock_name || "-",
          age_weeks: flock?.age_weeks || 0,
          house_number: houseNumber,
          sample_size: fertility?.sample_size || null,
          infertile_eggs: fertility?.infertile_eggs || null,
          fertile_eggs: fertility?.fertile_eggs || null,
          early_dead: fertility?.early_dead || null,
          mid_dead: residue?.mid_dead || null,
          late_dead: fertility?.late_dead || null,
          fertility_percent: fertility?.fertility_percent || null,
          chicks_hatched: batch.chicks_hatched || 0,
          hatch_percent: fertility?.hatch_percent || residue?.hatch_percent || null,
          hof_percent: fertility?.hof_percent || residue?.hof_percent || null,
        } as ResidueBreakoutRow;
      });
    },
  });

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!residueData) return [];
    
    const search = searchTerm.toLowerCase();
    return residueData.filter((row) =>
      row.flock_name.toLowerCase().includes(search) ||
      row.batch_number.toLowerCase().includes(search) ||
      row.house_number.toLowerCase().includes(search)
    );
  }, [residueData, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const exportToCSV = () => {
    if (!sortedData.length) return;

    const headers = [
      "Flock #",
      "Flock Name",
      "Age (weeks)",
      "House #",
      "Set Date",
      "Sample Size",
      "Infertile Eggs",
      "Fertile Eggs",
      "Early Dead",
      "Mid Dead",
      "Late Dead",
      "Fertility %",
      "Hatch",
      "Hatch %",
      "Hatch Over Fertile %",
    ];

    const csvContent = [
      headers.join(","),
      ...sortedData.map((row) =>
        [
          row.flock_number,
          `"${row.flock_name}"`,
          row.age_weeks,
          row.house_number,
          format(new Date(row.set_date), "M/d/yyyy"),
          row.sample_size ?? "",
          row.infertile_eggs ?? "",
          row.fertile_eggs ?? "",
          row.early_dead ?? "",
          row.mid_dead ?? "",
          row.late_dead ?? "",
          row.fertility_percent?.toFixed(1) ?? "",
          row.chicks_hatched,
          row.hatch_percent?.toFixed(1) ?? "",
          row.hof_percent?.toFixed(1) ?? "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `residue-breakout-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">Residue Breakout Analysis</CardTitle>
              <Badge variant="secondary" className="text-sm">
                {sortedData.length} Records
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search flock, batch, or house..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button onClick={exportToCSV} variant="outline" size="default">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("flock_number")}
                      >
                        <div className="flex items-center">
                          Flock #
                          <SortIcon column="flock_number" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("flock_name")}
                      >
                        <div className="flex items-center">
                          Flock Name
                          <SortIcon column="flock_name" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("age_weeks")}
                      >
                        <div className="flex items-center">
                          Age (wks)
                          <SortIcon column="age_weeks" />
                        </div>
                      </TableHead>
                      <TableHead>House #</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("set_date")}
                      >
                        <div className="flex items-center">
                          Set Date
                          <SortIcon column="set_date" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Sample</TableHead>
                      <TableHead className="text-right">Infertile</TableHead>
                      <TableHead className="text-right">Fertile</TableHead>
                      <TableHead className="text-right">Early Dead</TableHead>
                      <TableHead className="text-right">Mid Dead</TableHead>
                      <TableHead className="text-right">Late Dead</TableHead>
                      <TableHead className="text-right">Fert. %</TableHead>
                      <TableHead className="text-right">Hatch</TableHead>
                      <TableHead className="text-right">Hatch %</TableHead>
                      <TableHead className="text-right">HOF %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                          No data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row) => (
                        <TableRow key={row.batch_id}>
                          <TableCell className="font-medium">{row.flock_number}</TableCell>
                          <TableCell>{row.flock_name}</TableCell>
                          <TableCell>{row.age_weeks}</TableCell>
                          <TableCell>{row.house_number}</TableCell>
                          <TableCell>
                            {format(new Date(row.set_date), "M/d/yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.sample_size ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.infertile_eggs ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.fertile_eggs ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.early_dead ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.mid_dead ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.late_dead ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.fertility_percent
                              ? `${row.fertility_percent.toFixed(1)}%`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.chicks_hatched}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.hatch_percent
                              ? `${row.hatch_percent.toFixed(1)}%`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.hof_percent ? `${row.hof_percent.toFixed(1)}%` : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({sortedData.length} total)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidueBreakoutPage;
