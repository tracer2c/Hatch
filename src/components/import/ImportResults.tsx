import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportResult } from '@/types/import';
import { CheckCircle2, AlertTriangle, XCircle, Download } from 'lucide-react';

interface ImportResultsProps {
  results: ImportResult[];
  onClose: () => void;
  onDownloadErrors?: () => void;
}

export default function ImportResults({ 
  results, 
  onClose,
  onDownloadErrors 
}: ImportResultsProps) {
  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
  const allErrors = results.flatMap(r => r.errors);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalSuccess}</p>
              <p className="text-sm text-muted-foreground">Successfully Imported</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{totalWarnings}</p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{totalFailed}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {allErrors.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Import Issues</h3>
            {onDownloadErrors && (
              <Button variant="outline" size="sm" onClick={onDownloadErrors}>
                <Download className="w-4 h-4 mr-2" />
                Download Error Report
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allErrors.slice(0, 50).map((error, idx) => (
              <Alert key={idx} variant={error.severity === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>
                  <span className="font-semibold">Row {error.row}:</span> {error.error}
                  {error.column && ` (Column: ${error.column})`}
                  {error.suggestion && (
                    <p className="text-sm mt-1 opacity-80">
                      💡 {error.suggestion}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ))}
            {allErrors.length > 50 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                ... and {allErrors.length - 50} more issues
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="flex justify-center gap-4">
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
