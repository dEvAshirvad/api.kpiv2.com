import logger from '@/configs/logger';
import { KpiEntryModel } from './kpi_entry.model';
import { KpiTemplateModel } from '../kpi_template/kpi_template.model';

export interface MonthlyReportFilters {
  month: number;
  year: number;
  department?: string;
}

export interface MonthlyReportResult {
  totalEntries: number;
  updatedEntries: number;
  skippedEntries: number;
  department?: string;
  month: number;
  year: number;
  details: {
    created: number;
    initiated: number;
    generated: number;
  };
}

export class MonthlyReportService {
  /**
   * Generate monthly report and update status to generated
   */
  static async generateMonthlyReport(
    filters: MonthlyReportFilters
  ): Promise<MonthlyReportResult> {
    try {
      const { month, year, department } = filters;

      // Build query
      const query: any = {
        month,
        year,
        status: { $in: ['created', 'initiated'] }, // Only update non-generated entries
      };

      // Add department filter if provided
      if (department) {
        // Get templates for the department
        const templates = await KpiTemplateModel.find({
          departmentSlug: department,
        }).lean();
        const templateIds = templates.map((t) => t._id.toString());
        query.templateId = { $in: templateIds };
      }

      // Find all entries that need to be updated
      const entriesToUpdate = await KpiEntryModel.find(query).lean();

      if (entriesToUpdate.length === 0) {
        return {
          totalEntries: 0,
          updatedEntries: 0,
          skippedEntries: 0,
          department,
          month,
          year,
          details: {
            created: 0,
            initiated: 0,
            generated: 0,
          },
        };
      }

      // Get template data for validation
      const templateIds = [
        ...new Set(entriesToUpdate.map((entry) => entry.templateId)),
      ];
      const templates = await KpiTemplateModel.find({
        _id: { $in: templateIds },
      }).lean();
      const templateMap = new Map(templates.map((t) => [t._id.toString(), t]));

      let updatedEntries = 0;
      let skippedEntries = 0;
      const details = {
        created: 0,
        initiated: 0,
        generated: 0,
      };

      // Process each entry
      for (const entry of entriesToUpdate) {
        const template = templateMap.get(entry.templateId.toString());

        if (!template) {
          logger.warn(`Template not found for entry ${entry._id}`);
          skippedEntries++;
          continue;
        }

        // Check if entry has values and can be marked as generated
        if (entry.values && entry.values.length > 0) {
          // Update status to generated
          await KpiEntryModel.findByIdAndUpdate(entry._id, {
            status: 'generated',
          });
          updatedEntries++;

          // Update details based on original status
          if (entry.status === 'created') details.created++;
          else if (entry.status === 'initiated') details.initiated++;
        } else {
          // Skip entries without values
          skippedEntries++;
          logger.info(`Skipping entry ${entry._id} - no values provided`);
        }
      }

      // Get final counts
      const finalStats = await KpiEntryModel.aggregate([
        { $match: { month, year } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      finalStats.forEach((stat) => {
        if (stat._id === 'created') details.created = stat.count;
        else if (stat._id === 'initiated') details.initiated = stat.count;
        else if (stat._id === 'generated') details.generated = stat.count;
      });

      const result: MonthlyReportResult = {
        totalEntries: entriesToUpdate.length,
        updatedEntries,
        skippedEntries,
        department,
        month,
        year,
        details,
      };

      logger.info(`Monthly report generated: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error('Error generating monthly report:', error);
      throw error;
    }
  }

  /**
   * Get monthly report summary
   */
  static async getMonthlyReportSummary(
    filters: MonthlyReportFilters
  ): Promise<MonthlyReportResult> {
    try {
      const { month, year, department } = filters;

      // Build query
      const query: any = { month, year };

      // Add department filter if provided
      if (department) {
        const templates = await KpiTemplateModel.find({
          departmentSlug: department,
        }).lean();
        const templateIds = templates.map((t) => t._id.toString());
        query.templateId = { $in: templateIds };
      }

      // Get status counts
      const statusStats = await KpiEntryModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const details = {
        created: 0,
        initiated: 0,
        generated: 0,
      };

      statusStats.forEach((stat) => {
        if (stat._id === 'created') details.created = stat.count;
        else if (stat._id === 'initiated') details.initiated = stat.count;
        else if (stat._id === 'generated') details.generated = stat.count;
      });

      const totalEntries =
        details.created + details.initiated + details.generated;

      return {
        totalEntries,
        updatedEntries: 0, // Not applicable for summary
        skippedEntries: 0, // Not applicable for summary
        department,
        month,
        year,
        details,
      };
    } catch (error) {
      logger.error('Error getting monthly report summary:', error);
      throw error;
    }
  }
}
