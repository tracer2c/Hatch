import { supabase } from '@/integrations/supabase/client';
import { ImportRecord, ImportType, ImportResult, ImportConfig } from '@/types/import';

export class BulkImporter {
  private companyId: string | null = null;
  private unitCache: Map<string, string> = new Map();
  
  // Column variations for flexible matching
  private columnVariations: Record<string, string[]> = {
    'FLOCK': ['FLOCK#', 'FLOCK #', 'Flock#', 'Flock #', 'FLOCK NUMBER', 'Flock Number', 'FLOCK', 'Flock'],
    'SIZE': ['SIZE', 'SAMPLE SIZE', 'Sample Size', 'SAMPLE_SIZE'],
    'INFERTILE': ['INFERTILE', 'INFERTILE EGGS', 'Infertile'],
    'DEAD': ['DEAD', 'ED', 'Early Dead'],
    'FERTILITY': ['FERTILITY', 'FERTILITY%', 'Fertility %'],
    'HATCH': ['HATCH%', 'HATCH', 'Hatch %'],
    'HOF': ['HOF%', 'HOF', 'Hof %', 'HOF %'],
    'HOI': ['HOI', 'HOI%', 'Hoi %', 'HOI %'],
    'IF_DEV': ['I/F DEV.', 'I/F dev.', 'IF DEV', 'IF_DEV', 'I/F DEV', 'IF DEV %', 'I/F DEV %'],
    'EARLY_DEAD': ['EARLY DEAD', 'Early Dead', 'ED', 'E.D.', 'Early Dead %'],
    'HATCHERY': ['HATCHERY', 'Hatchery', 'UNIT', 'Unit', 'Site'],
    'NAME': ['NAME', 'Name', 'FLOCK NAME', 'Flock Name'],
    'AGE': ['AGE', 'Age', 'Age Weeks', 'AGE WEEKS'],
    'TOTAL_EGGS_PULLED': ['Total Eggs Pulled', 'TOTAL EGGS PULLED', 'Total Pulled'],
    'STAINED': ['Stained', 'STAINED'],
    'DIRTY': ['Dirty', 'DIRTY'],
    'CRACKED': ['Cracked', 'CRACKED'],
    'SMALL': ['Small', 'SMALL'],
    'TOTAL_WEIGHT': ['TOTAL WEIGHT', 'Total Weight'],
    'PERCENT_LOSS': ['% LOSS', '%LOSS', 'PERCENT LOSS'],
    'DATE_CHECK': ['DATE CHECK', 'Date Check'],
    'TOP_WEIGHT': ['TOP WEIGHT', 'Top Weight'],
    'MIDDLE_WEIGHT': ['MIDDLE WEIGHT', 'Middle Weight'],
    'BOTTOM_WEIGHT': ['BOTTOM WEIGHT', 'Bottom Weight'],
    'CONC': ['Conc', 'CONC', 'Concentration'],
    'FLOAT': ['Float', 'FLOAT'],
    'PERCENT': ['%', 'PERCENT', 'Percent'],
    'DIFFERENCE': ['Difference', 'DIFFERENCE', 'Diff']
  };
  
  private findColumn(row: ImportRecord, fieldName: string): any {
    const variations = this.columnVariations[fieldName.toUpperCase()] || [fieldName];
    
    for (const variant of variations) {
      if (row[variant] !== undefined) {
        return row[variant];
      }
    }
    
    // Try normalized matching
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
    
    return undefined;
  }

  async initialize() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    this.companyId = profile?.company_id || null;

    // Pre-load units into cache
    const { data: units } = await supabase
      .from('units')
      .select('id, name, code')
      .eq('company_id', this.companyId);
      
    if (units) {
      units.forEach(unit => {
        this.unitCache.set(unit.name.toLowerCase(), unit.id);
        if (unit.code) {
          this.unitCache.set(unit.code.toLowerCase(), unit.id);
        }
      });
      console.log(`📋 Cached ${units.length} units`);
    }
  }

  async import(
    rows: ImportRecord[], 
    type: ImportType, 
    config: ImportConfig
  ): Promise<ImportResult> {
    await this.initialize();

    const result: ImportResult = {
      success: 0,
      failed: 0,
      warnings: 0,
      errors: [],
      createdRecords: []
    };

    for (let i = 0; i < rows.length; i++) {
      // Report progress
      if (config.onProgress) {
        config.onProgress(i, rows.length);
      }

      try {
        const record = await this.importRow(rows[i], type, config);
        if (record) {
          result.success++;
          result.createdRecords.push(record);
        }
      } catch (error: any) {
        console.error(`❌ Import error at row ${i + 2}:`, error.message);
        result.failed++;
        result.errors.push({
          row: i + 2,
          column: '',
          value: rows[i],
          error: error.message,
          severity: 'error'
        });
      }
    }

    // Final progress update
    if (config.onProgress) {
      config.onProgress(rows.length, rows.length);
    }

    return result;
  }

  private async importRow(
    row: ImportRecord, 
    type: ImportType, 
    config: ImportConfig
  ): Promise<any> {
    switch (type) {
      case 'fertility':
        return this.importFertility(row, config);
      case 'residue':
        return this.importResidue(row, config);
      case 'egg_pack':
        return this.importEggPack(row, config);
      case 'weight_loss':
        return this.importWeightLoss(row, config);
      case 'specific_gravity':
        return this.importSpecificGravity(row, config);
      default:
        throw new Error(`Unsupported import type: ${type}`);
    }
  }

  private async importFertility(row: ImportRecord, config: ImportConfig) {
    // Extract hatchery/unit information
    const hatcheryName = this.findColumn(row, 'HATCHERY');
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    
    console.log(`📊 Importing fertility for Flock ${flockNumber} (Hatchery: ${hatcheryName || 'N/A'})`);
    
    let unitId: string | null = null;
    
    if (hatcheryName && config.createMissingEntities) {
      unitId = await this.findOrCreateUnit(String(hatcheryName));
    }

    // Extract flock information
    const flockName = String(this.findColumn(row, 'NAME') || `Flock ${flockNumber}`);
    const ageWeeks = this.parseNumber(this.findColumn(row, 'AGE'));

    // Find or create batch with unit_id
    const batchId = await this.findOrCreateBatch(
      flockNumber, 
      config,
      {
        flockName,
        ageWeeks,
        unitId
      }
    );

    // Extract fertility metrics (check if they're percentages or counts)
    const fertilityPercent = this.parseNumber(this.findColumn(row, 'FERTILITY'));
    const ifDevPercent = this.parseNumber(this.findColumn(row, 'IF_DEV'));
    const hatchPercent = this.parseNumber(this.findColumn(row, 'HATCH'));
    const hoiPercent = this.parseNumber(this.findColumn(row, 'HOI'));
    const hofPercent = this.parseNumber(this.findColumn(row, 'HOF'));
    const earlyDeadPercent = this.parseNumber(this.findColumn(row, 'EARLY_DEAD'));

    // Determine sample size
    const sampleSize = this.parseNumber(this.findColumn(row, 'SIZE')) || 
                       config.defaultValues?.sampleSize || 
                       648;

    // Calculate counts from percentages if needed
    const fertileEggs = fertilityPercent 
      ? Math.round((fertilityPercent / 100) * sampleSize)
      : sampleSize - (this.parseNumber(this.findColumn(row, 'INFERTILE')) || 0);
    
    const infertileEggs = sampleSize - fertileEggs;
    const earlyDead = earlyDeadPercent 
      ? Math.round((earlyDeadPercent / 100) * sampleSize)
      : this.parseNumber(this.findColumn(row, 'DEAD')) || 0;

    const data = {
      batch_id: batchId,
      analysis_date: config.defaultValues?.analysisDate || new Date().toISOString().split('T')[0],
      sample_size: sampleSize,
      fertile_eggs: fertileEggs,
      infertile_eggs: infertileEggs,
      early_dead: earlyDead,
      late_dead: 0,
      cull_chicks: 0,
      hatch_percent: hatchPercent,
      hof_percent: hofPercent,
      hoi_percent: hoiPercent,
      if_dev_percent: ifDevPercent,
    };

    const { data: inserted, error } = await supabase
      .from('fertility_analysis')
      .insert(data)
      .select()
      .single();

    if (error) {
      if (config.skipDuplicates && error.code === '23505') {
        return null; // Skip duplicate
      }
      throw error;
    }

    return inserted;
  }

  private async importResidue(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const data = {
      batch_id: batchId,
      analysis_date: config.defaultValues?.analysisDate || new Date().toISOString().split('T')[0],
      sample_size: 648,
      total_residue_count: (this.parseNumber(this.findColumn(row, 'INFERTILE')) || 0) + 
                           (this.parseNumber(this.findColumn(row, 'ED')) || 0) + 
                           (this.parseNumber(this.findColumn(row, 'MD')) || 0),
      contaminated_eggs: this.parseNumber(this.findColumn(row, 'Cont')) || 0,
      malformed_chicks: this.parseNumber(this.findColumn(row, 'Abnormal')) || 0,
      mid_dead: this.parseNumber(this.findColumn(row, 'MD')) || 0,
      pip_number: this.parseNumber(this.findColumn(row, 'DY egg')) || 0,
      pipped_not_hatched: 0,
      unhatched_fertile: 0
    };

    const { data: inserted, error } = await supabase
      .from('residue_analysis')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async importEggPack(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const totalPulled = this.parseNumber(this.findColumn(row, 'TOTAL_EGGS_PULLED')) || 0;
    const stained = this.parseNumber(this.findColumn(row, 'STAINED')) || 0;
    const dirty = this.parseNumber(this.findColumn(row, 'DIRTY')) || 0;
    const cracked = this.parseNumber(this.findColumn(row, 'CRACKED')) || 0;

    const data = {
      batch_id: batchId,
      inspection_date: config.defaultValues?.inspectionDate || new Date().toISOString().split('T')[0],
      sample_size: totalPulled,
      grade_a: totalPulled - stained - dirty - cracked,
      grade_b: 0,
      grade_c: 0,
      cracked,
      dirty,
      small: this.parseNumber(this.findColumn(row, 'SMALL')) || 0,
      large: 0
    };

    const { data: inserted, error } = await supabase
      .from('egg_pack_quality')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async importWeightLoss(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const batchId = await this.findOrCreateBatch(flockNumber, config);
    const flockId = await this.findFlockId(flockNumber);

    const dateCheck = this.findColumn(row, 'DATE_CHECK');

    const data = {
      batch_id: batchId,
      flock_id: flockId,
      check_date: config.defaultValues?.checkDate || new Date().toISOString().split('T')[0],
      day_of_incubation: dateCheck?.includes('18') ? 18 : 1,
      check_day: dateCheck,
      top_weight: this.parseNumber(this.findColumn(row, 'TOP_WEIGHT')),
      middle_weight: this.parseNumber(this.findColumn(row, 'MIDDLE_WEIGHT')),
      bottom_weight: this.parseNumber(this.findColumn(row, 'BOTTOM_WEIGHT')),
      total_weight: this.parseNumber(this.findColumn(row, 'TOTAL_WEIGHT')),
      percent_loss: this.parseNumber(this.findColumn(row, 'PERCENT_LOSS')),
      company_id: this.companyId
    };

    const { data: inserted, error } = await supabase
      .from('weight_tracking')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async importSpecificGravity(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const flockId = await this.findFlockId(flockNumber);

    const data = {
      flock_id: flockId,
      test_date: config.defaultValues?.testDate || new Date().toISOString().split('T')[0],
      age_weeks: this.parseNumber(this.findColumn(row, 'AGE')) || 0,
      concentration: this.findColumn(row, 'CONC'),
      float_count: this.parseNumber(this.findColumn(row, 'FLOAT')) || 0,
      sample_size: 100,
      float_percentage: this.parseNumber(this.findColumn(row, 'PERCENT')) || 0,
      difference: this.parseNumber(this.findColumn(row, 'DIFFERENCE')),
      company_id: this.companyId
    };

    const { data: inserted, error } = await supabase
      .from('specific_gravity_tests')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async findOrCreateBatch(
    flockNumber: number, 
    config: ImportConfig,
    flockMetadata?: {
      flockName?: string;
      ageWeeks?: number;
      unitId?: string | null;
    }
  ): Promise<string> {
    console.log(`📦 Finding/creating batch for flock ${flockNumber}`);
    const flockId = await this.findOrCreateFlock(flockNumber, config, flockMetadata);

    // Find most recent batch for this flock
    const { data: batch } = await supabase
      .from('batches')
      .select('id')
      .eq('flock_id', flockId)
      .order('set_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (batch) return batch.id;

    // Create batch if needed
    if (config.createMissingEntities) {
      const { data: machines } = await supabase
        .from('machines')
        .select('id')
        .eq('company_id', this.companyId)
        .limit(1);

      const { data: newBatch, error } = await supabase
        .from('batches')
        .insert({
          batch_number: `Batch-${flockNumber}`,
          flock_id: flockId,
          machine_id: machines?.[0]?.id,
          set_date: config.defaultValues?.analysisDate || new Date().toISOString().split('T')[0],
          expected_hatch_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_eggs_set: config.defaultValues?.sampleSize || 0,
          status: 'completed',
          company_id: this.companyId,
          unit_id: flockMetadata?.unitId || null
        })
        .select()
        .single();

      if (error) throw error;
      return newBatch.id;
    }

    throw new Error(`No batch found for flock #${flockNumber}`);
  }

  private async findOrCreateFlock(
    flockNumber: number,
    config: ImportConfig,
    metadata?: {
      flockName?: string;
      ageWeeks?: number;
      unitId?: string | null;
    }
  ): Promise<string> {
    console.log(`🐔 Finding/creating flock ${flockNumber}`);
    
    // Try to find existing flock
    const { data: existingFlock } = await supabase
      .from('flocks')
      .select('id')
      .eq('flock_number', flockNumber)
      .eq('company_id', this.companyId)
      .maybeSingle();

    if (existingFlock) {
      return existingFlock.id;
    }

    if (!config.createMissingEntities) {
      throw new Error(`Flock ${flockNumber} not found`);
    }

    // Create new flock with metadata
    const { data: newFlock, error } = await supabase
      .from('flocks')
      .insert({
        flock_number: flockNumber,
        flock_name: metadata?.flockName || `Flock ${flockNumber}`,
        age_weeks: metadata?.ageWeeks || 30,
        breed: 'breeder' as any,
        arrival_date: new Date().toISOString().split('T')[0],
        company_id: this.companyId,
        unit_id: metadata?.unitId || null,
      } as any)
      .select('id')
      .single();

    if (error) throw error;
    return newFlock.id;
  }

  private async findOrCreateUnit(unitName: string): Promise<string | null> {
    if (!unitName || !this.companyId) return null;

    console.log(`🏢 Looking up unit: "${unitName}"`);

    // Check cache first
    const cachedId = this.unitCache.get(unitName.toLowerCase());
    if (cachedId) {
      console.log(`   ✅ Found in cache (${cachedId})`);
      return cachedId;
    }

    // First try exact match
    const { data: exactMatch } = await supabase
      .from('units')
      .select('id, name')
      .eq('company_id', this.companyId)
      .or(`name.eq.${unitName},code.eq.${unitName}`)
      .maybeSingle();

    if (exactMatch) {
      console.log(`   ✅ Found existing unit: ${exactMatch.name} (${exactMatch.id})`);
      this.unitCache.set(unitName.toLowerCase(), exactMatch.id);
      return exactMatch.id;
    }

    // Try case-insensitive match
    const { data: fuzzyMatch } = await supabase
      .from('units')
      .select('id, name')
      .eq('company_id', this.companyId)
      .ilike('name', unitName)
      .maybeSingle();

    if (fuzzyMatch) {
      console.log(`   ✅ Found existing unit (fuzzy): ${fuzzyMatch.name} (${fuzzyMatch.id})`);
      this.unitCache.set(unitName.toLowerCase(), fuzzyMatch.id);
      return fuzzyMatch.id;
    }

    console.log(`   ➕ Creating new unit: "${unitName}"`);

    // Create new unit
    const { data: newUnit, error } = await supabase
      .from('units')
      .insert({
        name: unitName,
        code: unitName.substring(0, 10).toUpperCase(),
        company_id: this.companyId,
        status: 'active'
      })
      .select('id, name')
      .single();

    if (error) {
      console.error(`   ❌ Failed to create unit:`, error);
      throw error;
    }
    
    console.log(`   ✅ Created unit: ${newUnit.name} (${newUnit.id})`);
    this.unitCache.set(unitName.toLowerCase(), newUnit.id);
    return newUnit.id;
  }

  private async findFlockId(flockNumber: number): Promise<string> {
    const { data: flock } = await supabase
      .from('flocks')
      .select('id')
      .eq('flock_number', flockNumber)
      .eq('company_id', this.companyId)
      .maybeSingle();

    if (!flock) throw new Error(`Flock #${flockNumber} not found`);
    return flock.id;
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}
