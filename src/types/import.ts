export type ImportType = 
  | 'fertility'
  | 'residue'
  | 'egg_pack'
  | 'qa_temps'
  | 'weight_loss'
  | 'specific_gravity';

export interface ImportRecord {
  [key: string]: any;
}

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  warnings: number;
  errors: ValidationError[];
  createdRecords: any[];
}

export interface SheetData {
  sheetName: string;
  type: ImportType | null;
  rows: ImportRecord[];
  headerRow: number;
  dateContext?: {
    candleDate?: Date;
    hatchDate?: Date;
    setDate?: Date;
  };
}

export interface ColumnMapping {
  excelColumn: string;
  dbField: string;
  required: boolean;
  transform?: (value: any) => any;
}

export interface ImportConfig {
  type: ImportType;
  skipDuplicates: boolean;
  createMissingEntities: boolean;
  dateFormat?: string;
  defaultValues?: Record<string, any>;
  onProgress?: (current: number, total: number) => void;
}
