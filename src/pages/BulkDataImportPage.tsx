import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ExcelParser } from '@/services/excel/excelParser';
import { DataValidator } from '@/services/excel/dataValidator';
import { BulkImporter } from '@/services/excel/bulkImporter';
import { SheetData, ImportResult, ImportConfig } from '@/types/import';
import FileUploadZone from '@/components/import/FileUploadZone';
import SheetSelector from '@/components/import/SheetSelector';
import ImportProgress from '@/components/import/ImportProgress';
import ImportResults from '@/components/import/ImportResults';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

type Step = 'upload' | 'select' | 'validate' | 'import' | 'results';

export default function BulkDataImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [sampleSize, setSampleSize] = useState(648);
  const [currentProgress, setCurrentProgress] = useState({
    currentSheet: '',
    currentRow: 0,
    totalRows: 0,
    completedSheets: [] as string[],
    failedSheets: [] as string[],
    totalSheets: 0
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      const parser = new ExcelParser();
      const parsedSheets = await parser.parseFile(selectedFile);
      setSheets(parsedSheets);
      setStep('select');
      
      toast({
        title: 'File Parsed',
        description: `Found ${parsedSheets.length} sheets in ${selectedFile.name}`
      });
    } catch (error: any) {
      toast({
        title: 'Parse Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleValidate = () => {
    console.log('🔍 Starting validation...');
    const validator = new DataValidator();
    const allErrors: any[] = [];

    selectedSheets.forEach(sheetName => {
      const sheet = sheets.find(s => s.sheetName === sheetName);
      if (sheet && sheet.type) {
        console.log(`📋 Validating sheet: "${sheetName}" (Type: ${sheet.type})`);
        console.log(`   Rows to validate: ${sheet.rows.length}`);
        
        // Log first row as sample
        if (sheet.rows.length > 0) {
          console.log('   Sample row (first row):', sheet.rows[0]);
        }
        
        const errors = validator.validate(sheet.rows, sheet.type);
        
        console.log(`   Found ${errors.length} issues in this sheet`);
        allErrors.push(...errors);
      }
    });

    setValidationErrors(allErrors);
    
    const errorCount = allErrors.filter(e => e.severity === 'error').length;
    const warningCount = allErrors.filter(e => e.severity === 'warning').length;

    console.log('\n📊 VALIDATION SUMMARY:');
    console.log(`   Total Issues: ${allErrors.length}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);

    // Log all errors first
    if (errorCount > 0) {
      console.log('\n❌ ERRORS (Critical - must fix):');
      const errors = allErrors.filter(e => e.severity === 'error');
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Row ${err.row}, Column "${err.column}"`);
        console.log(`      Value: ${JSON.stringify(err.value)}`);
        console.log(`      Error: ${err.error}`);
        if (err.suggestion) {
          console.log(`      💡 Suggestion: ${err.suggestion}`);
        }
      });
    }

    // Log warnings
    if (warningCount > 0) {
      console.log('\n⚠️  WARNINGS (Non-critical):');
      const warnings = allErrors.filter(e => e.severity === 'warning');
      // Only log first 10 warnings to avoid console spam
      warnings.slice(0, 10).forEach((warn, idx) => {
        console.log(`   ${idx + 1}. Row ${warn.row}, Column "${warn.column}"`);
        console.log(`      Value: ${JSON.stringify(warn.value)}`);
        console.log(`      Warning: ${warn.error}`);
      });
      if (warnings.length > 10) {
        console.log(`   ... and ${warnings.length - 10} more warnings`);
      }
    }

    // Create a downloadable summary
    console.log('\n📥 Full validation results available in validationErrors state');
    console.log('   Use: console.table(validationErrors) to see formatted table');

    if (errorCount > 0) {
      toast({
        title: 'Validation Failed',
        description: `Found ${errorCount} errors and ${warningCount} warnings`,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Validation Passed',
        description: warningCount > 0 
          ? `Ready to import with ${warningCount} warnings`
          : 'All data is valid'
      });
    }

    setStep('validate');
  };

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 60000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  const handleImport = async () => {
    setStep('import');
    const importer = new BulkImporter();
    const results: ImportResult[] = [];
    
    const completedSheets: string[] = [];
    const failedSheets: string[] = [];

    setCurrentProgress({
      currentSheet: '',
      currentRow: 0,
      totalRows: 0,
      completedSheets: [],
      failedSheets: [],
      totalSheets: selectedSheets.length
    });

    try {
      for (const sheetName of selectedSheets) {
        const sheet = sheets.find(s => s.sheetName === sheetName);
        if (!sheet || !sheet.type) continue;

        setCurrentProgress(prev => ({
          ...prev,
          currentSheet: sheetName,
          currentRow: 0,
          totalRows: sheet.rows.length
        }));

        const config: ImportConfig = {
          type: sheet.type,
          skipDuplicates: true,
          createMissingEntities: true,
          defaultValues: {
            analysisDate: sheet.dateContext?.candleDate || new Date().toISOString().split('T')[0],
            inspectionDate: sheet.dateContext?.setDate || new Date().toISOString().split('T')[0],
            checkDate: new Date().toISOString().split('T')[0],
            testDate: new Date().toISOString().split('T')[0],
            sampleSize: sampleSize
          },
          onProgress: (current, total) => {
            setCurrentProgress(prev => ({
              ...prev,
              currentRow: current,
              totalRows: total
            }));
          }
        };

        try {
          const result = await withTimeout(
            importer.import(sheet.rows, sheet.type, config),
            60000
          );
          results.push(result);
          completedSheets.push(sheetName);
          
          setCurrentProgress(prev => ({
            ...prev,
            completedSheets: [...prev.completedSheets, sheetName],
            currentRow: sheet.rows.length
          }));

          toast({
            title: `${sheetName} Imported`,
            description: `${result.success} records imported successfully`
          });
        } catch (error: any) {
          failedSheets.push(sheetName);
          setCurrentProgress(prev => ({
            ...prev,
            failedSheets: [...prev.failedSheets, sheetName]
          }));
          
          toast({
            title: `${sheetName} Failed`,
            description: error.message,
            variant: 'destructive'
          });
        }
      }

      setImportResults(results);
      setStep('results');
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setSheets([]);
    setSelectedSheets([]);
    setValidationErrors([]);
    setImportResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Bulk Data Import</h1>
        <p className="text-muted-foreground">
          Import historical data from Excel files
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          {['upload', 'select', 'validate', 'import', 'results'].map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['upload', 'select', 'validate', 'import', 'results'].indexOf(step) > idx 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {idx + 1}
              </div>
              {idx < 4 && <div className="w-12 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
          <span className="w-8 text-center">Upload</span>
          <span className="w-12" />
          <span className="w-8 text-center">Select</span>
          <span className="w-12" />
          <span className="w-8 text-center">Validate</span>
          <span className="w-12" />
          <span className="w-8 text-center">Import</span>
          <span className="w-12" />
          <span className="w-8 text-center">Results</span>
        </div>
      </div>

      {step === 'upload' && (
        <FileUploadZone onFileSelect={handleFileSelect} />
      )}

      {step === 'select' && (
        <div className="space-y-6">
          <SheetSelector
            sheets={sheets}
            selectedSheets={selectedSheets}
            onSelectionChange={setSelectedSheets}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button 
              onClick={handleValidate}
              disabled={selectedSheets.length === 0}
            >
              Next: Validate
            </Button>
          </div>
        </div>
      )}

      {step === 'validate' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Validation Results</h3>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {sheets.filter(s => selectedSheets.includes(s.sheetName))
                    .reduce((sum, s) => sum + s.rows.length, 0) - validationErrors.filter(e => e.severity === 'error').length}
                </p>
                <p className="text-sm text-muted-foreground">Valid Records</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {validationErrors.filter(e => e.severity === 'warning').length}
                </p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {validationErrors.filter(e => e.severity === 'error').length}
                </p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {validationErrors.slice(0, 20).map((error, idx) => (
                  <Alert key={idx} variant={error.severity === 'error' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Row {error.row}, {error.column}: {error.error}
                    </AlertDescription>
                  </Alert>
                ))}
                {validationErrors.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center">
                    ... and {validationErrors.length - 20} more issues
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Import Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Default Sample Size</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used to calculate egg counts from percentages when sample size is not in the data
                </p>
                <input
                  type="number"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-32 px-3 py-2 border rounded-md bg-background"
                  min="1"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('select')}>
              Back
            </Button>
            <Button 
              onClick={handleImport}
              disabled={validationErrors.filter(e => e.severity === 'error').length > 0}
            >
              Start Import
            </Button>
          </div>
        </div>
      )}

      {step === 'import' && (
        <ImportProgress {...currentProgress} />
      )}

      {step === 'results' && (
        <ImportResults
          results={importResults}
          onClose={handleReset}
        />
      )}
    </div>
  );
}
