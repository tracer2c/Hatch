import { ValidationError, ImportRecord, ImportType } from '@/types/import';

export class DataValidator {
  private errors: ValidationError[] = [];
  
  // Common column name variations
  private columnVariations: Record<string, string[]> = {
    'FLOCK': ['FLOCK#', 'FLOCK #', 'Flock#', 'Flock #', 'FLOCK NUMBER', 'Flock Number', 'FLOCK', 'Flock'],
    'SIZE': ['SIZE', 'SAMPLE SIZE', 'Sample Size', 'SAMPLE_SIZE', 'Sample'],
    'INFERTILE': ['INFERTILE', 'INFERTILE EGGS', 'Infertile', 'Infert'],
    'DEAD': ['DEAD', 'ED', 'Early Dead', 'EARLY DEAD'],
    'FERTILITY': ['FERTILITY', 'FERTILITY%', 'Fertility %', 'FERT%'],
    'HATCHERY': ['HATCHERY', 'Hatchery', 'UNIT', 'Unit', 'Site'],
    'NAME': ['NAME', 'Name', 'FLOCK NAME', 'Flock Name'],
    'AGE': ['AGE', 'Age', 'Age Weeks', 'AGE WEEKS'],
    'HOI': ['HOI', 'HOI%', 'Hoi %', 'HOI %'],
    'HOF': ['HOF', 'HOF%', 'Hof %', 'HOF %'],
    'IF_DEV': ['I/F DEV.', 'I/F dev.', 'IF DEV', 'IF_DEV', 'I/F DEV'],
    'EARLY_DEAD': ['EARLY DEAD', 'Early Dead', 'ED', 'E.D.', 'Early Dead %'],
    'HATCH': ['HATCH', 'HATCH%', 'Hatch %'],
    'TOTAL_EGGS_PULLED': ['Total Eggs Pulled', 'TOTAL EGGS PULLED', 'Total Pulled', 'Eggs Pulled'],
    'STAINED': ['Stained', 'STAINED', 'Stain'],
    'DIRTY': ['Dirty', 'DIRTY'],
    'CRACKED': ['Cracked', 'CRACKED', 'Crack'],
    'SMALL': ['Small', 'SMALL'],
    'TOTAL_WEIGHT': ['TOTAL WEIGHT', 'Total Weight', 'TOTAL_WEIGHT'],
    'PERCENT_LOSS': ['% LOSS', '%LOSS', 'PERCENT LOSS', 'Percent Loss'],
    'FLOAT': ['Float', 'FLOAT'],
    'PERCENT': ['%', 'PERCENT', 'Percent', 'PCT']
  };

  validate(rows: ImportRecord[], type: ImportType): ValidationError[] {
    console.log(`🔎 DataValidator: Validating ${rows.length} rows as type "${type}"`);
    this.errors = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // Account for header row

      switch (type) {
        case 'fertility':
          this.validateFertility(row, rowNum);
          break;
        case 'residue':
          this.validateResidue(row, rowNum);
          break;
        case 'egg_pack':
          this.validateEggPack(row, rowNum);
          break;
        case 'weight_loss':
          this.validateWeightLoss(row, rowNum);
          break;
        case 'specific_gravity':
          this.validateSpecificGravity(row, rowNum);
          break;
        case 'qa_temps':
          this.validateQATemps(row, rowNum);
          break;
      }
    });

    return this.errors;
  }

  private validateFertility(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK', rowNum);
    
    // Check for hatchery/unit (optional but recommended)
    const hatchery = this.findColumn(row, 'HATCHERY');
    if (!hatchery) {
      this.addError(rowNum, 'HATCHERY', null, 
        'Hatchery/Unit not specified', 'warning',
        'Data will be imported without unit assignment');
    }

    // Validate percentage ranges if percentages are provided
    const percentFields = ['FERTILITY', 'HATCH', 'HOI', 'HOF', 'IF_DEV', 'EARLY_DEAD'];
    percentFields.forEach(field => {
      const value = this.findColumn(row, field);
      if (value !== null && value !== undefined && value !== '') {
        const num = Number(value);
        // Allow negative values for IF_DEV
        if (field === 'IF_DEV') {
          if (num < -100 || num > 100) {
            this.addError(rowNum, field, value,
              `${field} must be between -100 and 100`, 'error');
          }
        } else if (num < 0 || num > 100) {
          this.addError(rowNum, field, value,
            `${field} must be between 0 and 100`, 'error');
        }
      }
    });

    // Validate sample size or infertile count
    const size = this.parseNumber(this.findColumn(row, 'SIZE'));
    const infertile = this.parseNumber(this.findColumn(row, 'INFERTILE'));
    
    if (size && infertile && infertile > size) {
      this.addError(rowNum, 'INFERTILE', infertile, 
        'Infertile eggs cannot exceed sample size', 'error');
    }

    // Warn if fertility seems low
    const fertility = this.parseNumber(this.findColumn(row, 'FERTILITY'));
    if (fertility && fertility < 70) {
      this.addError(rowNum, 'FERTILITY', fertility, 
        `Low fertility: ${fertility}%`, 'warning', 'Verify this is correct');
    }
  }

  private validateResidue(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK', rowNum);
    this.requireNumeric(row, 'INFERTILE', rowNum);
  }

  private validateEggPack(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK', rowNum);
    this.requireNumeric(row, 'TOTAL_EGGS_PULLED', rowNum);
    
    const totalPulled = this.parseNumber(this.findColumn(row, 'TOTAL_EGGS_PULLED'));
    const stained = this.parseNumber(this.findColumn(row, 'STAINED'));
    
    if (stained && totalPulled && stained > totalPulled) {
      this.addError(rowNum, 'Stained', stained, 
        'Defect count exceeds total eggs', 'error');
    }
  }

  private validateWeightLoss(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK', rowNum);
    this.requireNumeric(row, 'TOTAL_WEIGHT', rowNum);
    
    const percentLoss = this.parseNumber(this.findColumn(row, 'PERCENT_LOSS'));
    if (percentLoss) {
      if (percentLoss < 0) {
        this.addError(rowNum, '% LOSS', percentLoss, 
          'Weight loss cannot be negative', 'error');
      } else if (percentLoss > 15) {
        this.addError(rowNum, '% LOSS', percentLoss, 
          'Weight loss exceeds 15% - verify accuracy', 'warning');
      }
    }
  }

  private validateSpecificGravity(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK', rowNum);
    this.requireNumeric(row, 'FLOAT', rowNum);
    
    const floatPct = this.parseNumber(this.findColumn(row, 'PERCENT'));
    if (floatPct && (floatPct < 0 || floatPct > 100)) {
      this.addError(rowNum, '%', floatPct, 
        'Percentage must be between 0-100', 'error');
    }
  }

  private validateQATemps(row: ImportRecord, rowNum: number) {
    // Temperature validation
    const tempFields = Object.keys(row).filter(k => 
      k.toLowerCase().includes('temp') || k.toLowerCase().includes('temperature')
    );
    
    tempFields.forEach(field => {
      const temp = this.parseNumber(row[field]);
      if (temp && (temp < 90 || temp > 110)) {
        this.addError(rowNum, field, temp, 
          'Temperature outside normal range (90-110°F)', 'warning');
      }
    });
  }

  private findColumn(row: ImportRecord, fieldName: string): any {
    // Try exact match first
    if (row[fieldName] !== undefined) {
      return row[fieldName];
    }
    
    // Try variations
    const variations = this.columnVariations[fieldName.toUpperCase()] || [fieldName];
    for (const variant of variations) {
      if (row[variant] !== undefined) {
        return row[variant];
      }
    }
    
    // Try normalized matching using the columnMap metadata
    const normalizedField = fieldName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const columnMap = (row as any).__columnMap;
    
    if (columnMap && columnMap[normalizedField]) {
      const actualKey = columnMap[normalizedField];
      return row[actualKey];
    }
    
    // Try all variations with normalized matching
    for (const variant of variations) {
      const normalizedVariant = variant.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (columnMap && columnMap[normalizedVariant]) {
        const actualKey = columnMap[normalizedVariant];
        return row[actualKey];
      }
    }
    
    // Last resort: fuzzy match all keys
    for (const [key, value] of Object.entries(row)) {
      if (key === '__columnMap') continue;
      const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (normalizedKey === normalizedField) {
        return value;
      }
    }
    
    return undefined;
  }

  private requireField(row: ImportRecord, field: string, rowNum: number) {
    const value = this.findColumn(row, field);
    if (value === null || value === undefined || value === '') {
      this.addError(rowNum, field, value, 'Required field is missing', 'error');
    }
  }

  private requireNumeric(row: ImportRecord, field: string, rowNum: number) {
    const value = this.findColumn(row, field);
    if (value !== null && value !== undefined && value !== '') {
      const num = this.parseNumber(value);
      if (num === null) {
        this.addError(rowNum, field, value, 'Must be a number', 'error');
      }
    }
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  private addError(
    row: number, 
    column: string, 
    value: any, 
    error: string, 
    severity: 'error' | 'warning',
    suggestion?: string
  ) {
    this.errors.push({ row, column, value, error, severity, suggestion });
  }
}
