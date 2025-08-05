import { model, Schema, Types } from 'mongoose';
import z from 'zod';

const zKpiEntry = z.object({
  id: z.string().min(1),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  templateId: z.string().min(1),
  kpiRef: z.object({
    label: z.string().min(1),
    value: z.string().min(1),
  }),
  values: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.union([z.number(), z.string()]), // Can be number or string based on KPI type
      })
    )
    .optional(),
  status: z.enum(['created', 'initiated', 'generated']).default('created'),
  totalScore: z.number(),
  createdBy: z.string().min(1),
  createdFor: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const zKpiEntryCreate = zKpiEntry.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const zKpiEntryUpdate = zKpiEntryCreate.partial();

export type KpiEntry = z.infer<typeof zKpiEntry>;
export type KpiEntryCreate = z.infer<typeof zKpiEntryCreate>;
export type KpiEntryUpdate = z.infer<typeof zKpiEntryUpdate>;

// Define sub-schema for KPI reference
const kpiRefSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

// Define sub-schema for KPI values
const kpiValueSchema = new Schema(
  {
    name: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true }, // Can be number or string
    score: { type: Number, required: true }, // Calculated score
  },
  { _id: false }
);

const kpiEntrySchema = new Schema<KpiEntry>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2020 },
    templateId: { type: String, required: true },
    kpiRef: { type: kpiRefSchema, required: true },
    values: { type: [kpiValueSchema], required: false, default: [] },
    status: {
      type: String,
      enum: ['created', 'initiated', 'generated'],
      default: 'created',
      required: true,
    },
    totalScore: { type: Number, required: true, default: 0 },
    createdBy: { type: String, required: true },
    createdFor: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Create indexes
kpiEntrySchema.index({ createdFor: 1, month: 1, year: 1, templateId: 1 });
kpiEntrySchema.index({ status: 1 });
kpiEntrySchema.index({ createdBy: 1 });
kpiEntrySchema.index({ createdFor: 1 });

export const KpiEntryModel = model<KpiEntry>('tbl_kpi_entries', kpiEntrySchema);

// Utility functions for KPI validation and scoring
export class KpiEntryValidation {
  /**
   * Validates KPI values against template and calculates scores
   */
  static validateAndCalculateScores(
    template: any,
    values: Array<{ name: string; value: number | string }>
  ): Array<{ name: string; value: number | string; score: number }> {
    const validatedValues: Array<{
      name: string;
      value: number | string;
      score: number;
    }> = [];

    for (const value of values) {
      // Find corresponding template item
      const templateItem = template.template.find(
        (item: any) => item.name === value.name
      );

      if (!templateItem) {
        throw new Error(`KPI item '${value.name}' not found in template`);
      }

      // Validate value based on KPI type
      this.validateValueByType(templateItem, value.value);

      // Calculate score based on scoring rules
      const score = this.calculateScore(templateItem, value.value);

      validatedValues.push({
        name: value.name,
        value: value.value,
        score,
      });
    }

    return validatedValues;
  }

  /**
   * Validates value based on KPI type
   */
  private static validateValueByType(
    templateItem: any,
    value: number | string
  ): void {
    const { kpiType, maxMarks } = templateItem;

    switch (kpiType) {
      case 'quantitative':
        if (typeof value !== 'number') {
          throw new Error(`KPI '${templateItem.name}' expects a numeric value`);
        }
        if (value < 0) {
          throw new Error(
            `KPI '${templateItem.name}' value cannot be negative`
          );
        }
        break;

      case 'percentage':
        if (typeof value !== 'number') {
          throw new Error(`KPI '${templateItem.name}' expects a numeric value`);
        }
        if (value < 0 || value > 100) {
          throw new Error(
            `KPI '${templateItem.name}' percentage must be between 0 and 100`
          );
        }
        break;

      case 'binary':
        if (typeof value !== 'string') {
          throw new Error(
            `KPI '${templateItem.name}' expects a string value (yes/no, true/false, etc.)`
          );
        }
        break;

      case 'qualitative':
        if (typeof value !== 'string') {
          throw new Error(`KPI '${templateItem.name}' expects a string value`);
        }
        break;

      case 'score':
        if (typeof value !== 'number') {
          throw new Error(`KPI '${templateItem.name}' expects a numeric value`);
        }
        if (value < 0 || value > maxMarks) {
          throw new Error(
            `KPI '${templateItem.name}' score must be between 0 and ${maxMarks}`
          );
        }
        break;

      default:
        throw new Error(`Unknown KPI type: ${kpiType}`);
    }
  }

  /**
   * Calculates score based on template scoring rules
   */
  private static calculateScore(
    templateItem: any,
    value: number | string
  ): number {
    const { scoringRules, maxMarks, kpiType } = templateItem;

    console.log('Calculating score for:', templateItem.name);
    console.log('Value:', value);
    console.log('KPI Type:', kpiType);
    console.log('Scoring Rules:', scoringRules);
    console.log('Max Marks:', maxMarks);

    // For score type, return the value directly if it's within maxMarks
    if (kpiType === 'score') {
      const score = Math.min(value as number, maxMarks);
      console.log('Score type - calculated score:', score);
      return score;
    }

    // For percentage type, find the highest applicable rule
    if (kpiType === 'percentage') {
      const inputValue = value as number;
      let highestScore = 0;

      // Sort rules by value in descending order to find the highest applicable rule
      const sortedRules = [...scoringRules].sort((a, b) => b.value - a.value);

      for (const rule of sortedRules) {
        if (inputValue >= rule.value) {
          console.log(
            `Percentage rule matched: ${inputValue} >= ${rule.value}, score: ${rule.score}`
          );
          return rule.score;
        }
      }

      console.log('No percentage rule matched, returning 0');
      return 0;
    }

    // For other types, use scoring rules
    for (const rule of scoringRules) {
      console.log('Checking rule:', rule);
      if (this.matchesRule(rule, value, kpiType)) {
        console.log('Rule matched! Score:', rule.score);
        return rule.score;
      }
    }

    // If no rule matches, return 0
    console.log('No rule matched, returning 0');
    return 0;
  }

  /**
   * Checks if a value matches a scoring rule
   */
  private static matchesRule(
    rule: any,
    value: number | string,
    kpiType: string
  ): boolean {
    console.log(
      'Matching rule:',
      rule,
      'with value:',
      value,
      'kpiType:',
      kpiType
    );

    if (kpiType === 'binary' || kpiType === 'qualitative') {
      // For string-based KPIs, check exact value match
      const matches = rule.value === value;
      console.log('String-based KPI match:', matches);
      return matches;
    } else {
      // For numeric KPIs, check range or exact value
      if (rule.min !== undefined && rule.max !== undefined) {
        // Range-based rule
        const matches =
          (value as number) >= rule.min && (value as number) <= rule.max;
        console.log(
          'Range-based rule match:',
          matches,
          `(${value} >= ${rule.min} && ${value} <= ${rule.max})`
        );
        return matches;
      } else if (rule.value !== undefined) {
        // For percentage KPIs, use range-based matching
        if (kpiType === 'percentage') {
          // Find the appropriate range for the value
          // For value 96, it should match the rule for 90 (90-99 range)
          const ruleValue = rule.value as number;
          const inputValue = value as number;

          // For percentage, find the closest lower bound
          // 96 should match the rule for 90 (90-99 range)
          if (inputValue >= ruleValue) {
            // Check if this is the highest rule that the value can match
            // We'll implement this logic in calculateScore method
            const matches = inputValue >= ruleValue;
            console.log(
              'Percentage range match:',
              matches,
              `(${inputValue} >= ${ruleValue})`
            );
            return matches;
          }
        } else {
          // Exact value rule for other types
          const matches = rule.value === value;
          console.log('Exact value rule match:', matches);
          return matches;
        }
      }
    }
    console.log('No rule type matched, returning false');
    return false;
  }

  /**
   * Validates that all required template items are provided
   */
  /**
   * Validates that provided values match template items (allows partial updates)
   */
  static validateTemplateItems(
    template: any,
    values: Array<{ name: string; value: number | string }>
  ): void {
    const providedNames = values.map((v) => v.name);
    const templateNames = template.template.map((item: any) => item.name);

    // Check for invalid items (items not in template)
    const invalidItems = providedNames.filter(
      (name: string) => !templateNames.includes(name)
    );

    if (invalidItems.length > 0) {
      throw new Error(`Invalid KPI items: ${invalidItems.join(', ')}`);
    }
  }

  /**
   * Validates that all required template items are provided (for complete validation)
   */
  static validateTemplateCompleteness(
    template: any,
    values: Array<{ name: string; value: number | string }>
  ): void {
    const providedNames = values.map((v) => v.name);
    const requiredNames = template.template.map((item: any) => item.name);

    const missingItems = requiredNames.filter(
      (name: string) => !providedNames.includes(name)
    );

    if (missingItems.length > 0) {
      throw new Error(`Missing required KPI items: ${missingItems.join(', ')}`);
    }

    const extraItems = providedNames.filter(
      (name: string) => !requiredNames.includes(name)
    );

    if (extraItems.length > 0) {
      throw new Error(`Invalid KPI items: ${extraItems.join(', ')}`);
    }
  }
}
