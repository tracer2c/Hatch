import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SheetData } from '@/types/import';
import { FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface SheetSelectorProps {
  sheets: SheetData[];
  selectedSheets: string[];
  onSelectionChange: (sheetNames: string[]) => void;
}

export default function SheetSelector({ 
  sheets, 
  selectedSheets, 
  onSelectionChange 
}: SheetSelectorProps) {
  const toggleSheet = (sheetName: string) => {
    if (selectedSheets.includes(sheetName)) {
      onSelectionChange(selectedSheets.filter(s => s !== sheetName));
    } else {
      onSelectionChange([...selectedSheets, sheetName]);
    }
  };

  const getTypeLabel = (type: string | null) => {
    const labels = {
      fertility: 'Fertility Analysis',
      residue: 'Residue Breakout',
      egg_pack: 'Egg Pack Quality',
      qa_temps: 'QA Temperature',
      weight_loss: 'Weight Loss',
      specific_gravity: 'Specific Gravity'
    };
    return type ? labels[type as keyof typeof labels] || type : 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Select Sheets to Import</h3>
        <div className="space-x-2">
          <button
            onClick={() => onSelectionChange(sheets.filter(s => s.type).map(s => s.sheetName))}
            className="text-sm text-primary hover:underline"
          >
            Select All
          </button>
          <button
            onClick={() => onSelectionChange([])}
            className="text-sm text-muted-foreground hover:underline"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sheets.map((sheet) => (
          <Card
            key={sheet.sheetName}
            className={`p-4 cursor-pointer transition-all ${
              selectedSheets.includes(sheet.sheetName)
                ? 'border-primary bg-primary/5'
                : 'hover:border-primary/50'
            } ${!sheet.type ? 'opacity-50' : ''}`}
            onClick={() => sheet.type && toggleSheet(sheet.sheetName)}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedSheets.includes(sheet.sheetName)}
                disabled={!sheet.type}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => sheet.type && toggleSheet(sheet.sheetName)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <h4 className="font-semibold">{sheet.sheetName}</h4>
                </div>
                {sheet.type ? (
                  <div className="space-y-2">
                    <Badge variant="secondary">{getTypeLabel(sheet.type)}</Badge>
                    <p className="text-sm text-muted-foreground">
                      {sheet.rows.length} records
                    </p>
                    {sheet.dateContext && Object.keys(sheet.dateContext).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Date context detected
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Format not recognized</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
