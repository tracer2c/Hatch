import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table,TableHeader,TableRow,TableHead, TableBody, TableCell,} from "@/components/ui/table";

type Props = {
  initialClear?: number | null;
  initialInjected?: number | null;
  totalEggs?: number | null;
  onSave: (vals: { clear_number: number; injected_number: number }) => Promise<void> | void;
  saving?: boolean;
  context?: {
    flockNumber?: number;
    flockName?: string;
    houseNumber?: string;
  };
};

export default function ClearsInjectedDataEntry({
  initialClear,
  initialInjected,
  totalEggs,
  onSave,
  saving,
  context,
}: Props) {
  const [clearNum, setClearNum] = useState<string>(initialClear?.toString() ?? "");
  
  useEffect(() => {
    setClearNum(initialClear?.toString() ?? "");
  }, [initialClear]);

  const clear = useMemo(() => {
    const n = Number(clearNum);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }, [clearNum]);
  
  const injected = useMemo(() => {
    if (totalEggs == null || !Number.isInteger(clear) || clear < 0) return null;
    const diff = totalEggs - clear;
    return diff >= 0 ? diff : null; // null if clear > totalEggs (invalid)
  }, [totalEggs, clear]);

  const valid =
    totalEggs != null &&
    Number.isInteger(clear) &&
    clear >= 0 &&
    injected != null &&
    Number.isInteger(injected) &&
    injected >= 0;

  const clearPct =
    valid && totalEggs! > 0 ? ((clear / totalEggs!) * 100).toFixed(2) : null;
  const injPct =
    valid && totalEggs! > 0 && injected != null ? ((injected / totalEggs!) * 100).toFixed(2) : null;

    const initialInjectedDisplay =
    initialInjected ??
    (totalEggs != null && initialClear != null ? Math.max(totalEggs - initialClear, 0) : null);

  return (
    <>
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clearNum">Clear number *</Label>
            <Input
              id="clearNum"
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              pattern="\d*"
              placeholder="e.g., 1200"
              value={clearNum}
              onChange={(e) => setClearNum(e.target.value.replace(/[^\d]/g, ""))}
            />
            {clearPct !== null && (
              <div className="text-xs text-gray-600">Clear %: {clearPct}%</div>
            )}
            {totalEggs != null && Number.isInteger(clear) && clear > totalEggs && (
                <div className="text-xs text-red-600">Clears cannot exceed total eggs.</div>
              )}
          </div>

          {/* Calculating Injected */}
          <div className="space-y-2">
            <Label htmlFor="injNum">Injected number *</Label>
            <Input
              id="injNum"
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              pattern="\d*"
              placeholder="e.g., 43000"
              value={injected ?? ""}
              readOnly
            />
            {injPct !== null && (
              <div className="text-xs text-gray-600">Injected %: {injPct}%</div>
            )}
            {totalEggs == null && (
                <div className="text-xs text-gray-500">
                  Enter total eggs to auto-calculate injected.
                </div>
              )}
          </div>

          <div className="flex items-end">
            <Button
              onClick={() =>
                onSave({
                  clear_number: Number(clearNum || 0),
                  injected_number: injected ?? 0,
                })
              }
              disabled={!valid || saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {totalEggs != null && (
          <div className="text-xs text-gray-500">
            Total eggs set: <span className="font-medium">{totalEggs.toLocaleString()}</span>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Records Card */}
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Clears & Injected – Current Record</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Flock #</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>House #</TableHead>
                <TableHead>Total Eggs</TableHead>
                <TableHead>Clears</TableHead>
                <TableHead>Clear %</TableHead>
                <TableHead>Injected</TableHead>
                <TableHead>Injected %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-gray-50/70">
                <TableCell>{context?.flockNumber ?? "—"}</TableCell>
                <TableCell>{context?.flockName ?? "—"}</TableCell>
                <TableCell>{context?.houseNumber ?? "—"}</TableCell>
                <TableCell>
                  {totalEggs != null ? totalEggs.toLocaleString() : "—"}
                </TableCell>
                <TableCell>{initialClear ?? "—"}</TableCell>
                <TableCell>{clearPct != null ? `${clearPct}%` : "—"}</TableCell>
                <TableCell>{initialInjectedDisplay != null ? initialInjectedDisplay : "—"}</TableCell>
                <TableCell>{injPct != null ? `${injPct}%` : "—"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
</>
  );
}