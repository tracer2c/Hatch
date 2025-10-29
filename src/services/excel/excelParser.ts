import * as XLSX from 'xlsx';
import { SheetData, ImportRecord, ImportType } from '@/types/import';

export class ExcelParser {
  private workbook: XLSX.WorkBook | null = null;

  async parseFile(file: File): Promise<SheetData[]> {
    const buffer = await file.arrayBuffer();
    this.workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    const sheets: SheetData[] = [];
    
    for (const sheetName of this.workbook.SheetNames) {
      const sheet = this.workbook.Sheets[sheetName];
      const type = this.detectSheetType(sheetName, sheet);
      const rows = this.parseSheet(sheet, type);
      const dateContext = this.extractDateContext(sheet);

      sheets.push({
        sheetName,
        type,
        rows,
        headerRow: 0,
        dateContext
      });
    }

    return sheets;
  }

  private detectSheetType(sheetName: string, sheet: XLSX.WorkSheet): ImportType | null {
    const name = sheetName.toLowerCase();
    const firstRow = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
    const headerText = firstRow?.join(' ').toLowerCase() || '';

    // Check for hatchery-based fertility sheet (unit + fertility metrics)
    if (
      (headerText.includes('hatchery') || headerText.includes('unit')) &&
      (headerText.includes('fertility') || headerText.includes('hatch') || headerText.includes('hof'))
    ) {
      return 'fertility';
    }

    if (name.includes('fertility') || headerText.includes('fertility') || headerText.includes('infertile')) {
      return 'fertility';
    }
    if (name.includes('residue') || headerText.includes('residue') || headerText.includes('mid dead')) {
      return 'residue';
    }
    if (name.includes('egg pack') || headerText.includes('stained') || headerText.includes('usd%')) {
      return 'egg_pack';
    }
    if (name.includes('weight') || headerText.includes('% loss')) {
      return 'weight_loss';
    }
    if (name.includes('specific gravity') || headerText.includes('float')) {
      return 'specific_gravity';
    }
    if (name.includes('temp') || name.includes('qa')) {
      return 'qa_temps';
    }

    return null;
  }

  private normalizeColumnName(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  }

  private parseSheet(sheet: XLSX.WorkSheet, type: ImportType | null = null): ImportRecord[] {
    // Get all rows as array of objects
    const data = XLSX.utils.sheet_to_json(sheet, { 
      defval: null,
      raw: false 
    }) as ImportRecord[];

    // Clean up column names and create normalized lookup
    return data.map(row => {
      const cleaned: ImportRecord = {};
      const normalizedMap: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.trim().replace(/\s+/g, ' ');
        const normalized = this.normalizeColumnName(key);
        
        // Store with original key
        cleaned[cleanKey] = value;
        // Store normalized mapping
        normalizedMap[normalized] = cleanKey;
      }
      
      // Add normalized lookup as metadata
      (cleaned as any).__columnMap = normalizedMap;
      return cleaned;
    }).filter(row => this.isDataRow(row, type));
  }

  private isDataRow(row: ImportRecord, type: ImportType | null): boolean {
    // Check if row has any actual values (excluding metadata)
    const values = Object.entries(row)
      .filter(([key]) => key !== '__columnMap')
      .filter(([, value]) => value !== null && value !== '');
    
    if (values.length === 0) return false;
    
    // Get first column value (usually NAME or identifier)
    const firstValue = String(values[0]?.[1] || '').toLowerCase();
    
    // Skip known non-data patterns
    const skipPatterns = [
      'overall average',
      'total',
      'candle date',
      'candelle date',
      'embrex date',
      'residue week',
      'troy flocks',
      'enterprise flocks',
      'hatch week',
      'set week',
      '---',
      '===',
    ];
    
    for (const pattern of skipPatterns) {
      if (firstValue.includes(pattern)) {
        return false;
      }
    }
    
    // For fertility/residue/egg_pack types, require FLOCK column to have a numeric value
    if (type === 'fertility' || type === 'residue' || type === 'egg_pack') {
      const flockValue = this.findFlockValue(row);
      if (!flockValue || isNaN(Number(flockValue))) {
        return false;
      }
    }
    
    return true;
  }

  private findFlockValue(row: ImportRecord): any {
    const flockVariations = ['FLOCK#', 'FLOCK #', 'Flock#', 'Flock #', 'FLOCK NUMBER', 'Flock Number', 'FLOCK'];
    
    // Try direct match first
    for (const variant of flockVariations) {
      if (row[variant] !== undefined && row[variant] !== null && row[variant] !== '') {
        return row[variant];
      }
    }
    
    // Try normalized search
    const columnMap = (row as any).__columnMap;
    if (columnMap) {
      const normalizedVariants = ['FLOCK', 'FLOCKNUMBER'];
      for (const variant of normalizedVariants) {
        if (columnMap[variant]) {
          const value = row[columnMap[variant]];
          if (value !== undefined && value !== null && value !== '') {
            return value;
          }
        }
      }
    }
    
    return null;
  }

  private extractDateContext(sheet: XLSX.WorkSheet): any {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const dateContext: any = {};

    // Check first few rows for date patterns
    for (let R = 0; R <= Math.min(3, range.e.r); R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];
        
        if (!cell || !cell.v) continue;
        
        const cellText = String(cell.v).toLowerCase();
        
        if (cellText.includes('candelled') || cellText.includes('candled')) {
          const dateMatch = String(cell.v).match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
          if (dateMatch) {
            dateContext.candleDate = this.parseDate(dateMatch[1]);
          }
        }
        
        if (cellText.includes('hatch week') || cellText.includes('hatch date')) {
          const dateMatch = String(cell.v).match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
          if (dateMatch) {
            dateContext.hatchDate = this.parseDate(dateMatch[1]);
          }
        }

        if (cellText.includes('set week')) {
          const dateMatch = String(cell.v).match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
          if (dateMatch) {
            dateContext.setDate = this.parseDate(dateMatch[1]);
          }
        }
      }
    }

    return dateContext;
  }

  private parseDate(dateStr: string): Date | null {
    try {
      // Handle MM/DD/YY or MM/DD/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let [month, day, year] = parts.map(Number);
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        return new Date(year, month - 1, day);
      }
    } catch (e) {
      console.error('Date parse error:', e);
    }
    return null;
  }

  getSheetNames(): string[] {
    return this.workbook?.SheetNames || [];
  }
}
