import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface ImportProgressProps {
  currentSheet: string;
  currentRow: number;
  totalRows: number;
  completedSheets: string[];
  failedSheets: string[];
  totalSheets: number;
}

export default function ImportProgress({
  currentSheet,
  currentRow,
  totalRows,
  completedSheets,
  failedSheets,
  totalSheets
}: ImportProgressProps) {
  const progress = totalRows > 0 ? (currentRow / totalRows) * 100 : 0;
  const overallProgress = ((completedSheets.length + failedSheets.length) / totalSheets) * 100;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
        <Progress value={overallProgress} className="mb-2" />
        <p className="text-sm text-muted-foreground">
          {completedSheets.length + failedSheets.length} of {totalSheets} sheets processed
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">
            Importing: {currentSheet}
          </h3>
        </div>
        <Progress value={progress} className="mb-2" />
        <p className="text-sm text-muted-foreground">
          Processing row {currentRow} of {totalRows}
        </p>
      </Card>

      {completedSheets.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Completed ({completedSheets.length})
          </h4>
          <ul className="space-y-1">
            {completedSheets.map(sheet => (
              <li key={sheet} className="text-sm text-muted-foreground">
                ✓ {sheet}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {failedSheets.length > 0 && (
        <Card className="p-6 border-destructive">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Failed ({failedSheets.length})
          </h4>
          <ul className="space-y-1">
            {failedSheets.map(sheet => (
              <li key={sheet} className="text-sm text-destructive">
                ✗ {sheet}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
