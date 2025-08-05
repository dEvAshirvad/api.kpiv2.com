import logger from '@/configs/logger';
import {
  KpiEntryCreate,
  KpiEntryUpdate,
  KpiEntryModel,
  KpiEntryValidation,
} from './kpi_entry.model';
import { KpiTemplateModel } from '../kpi_template/kpi_template.model';
import { Member } from '../members/members.model';
import APIError from '@/lib/errors/APIError';
import { Request } from 'express';
import axios from 'axios';

export class KpiEntryService {
  static async createKpiEntry({
    month,
    year,
    templateId,
    createdBy,
    createdFor,
    req,
  }: Partial<KpiEntryCreate> & { req: Request }) {
    try {
      // Validate that the template exists
      const template = await KpiTemplateModel.findById(templateId);
      if (!template) {
        throw new Error('KPI template not found');
      }

      // Check if entry already exists for this employee, month, year, and template
      const existingEntry = await KpiEntryModel.findOne({
        createdFor: createdFor,
        month: month,
        year: year,
        templateId: templateId,
      });

      if (existingEntry) {
        throw new Error(
          'KPI entry already exists for this employee, month, year, and template'
        );
      }

      let member: Member;

      try {
        const directResponse = await axios.get(
          `${process.env.AUTH_URL}/api/v1/members/${createdFor}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Cookie: req.headers.cookie,
            },
            timeout: 30000,
          }
        );

        if (!directResponse.data || !directResponse.data.member) {
          throw new APIError({
            STATUS: 404,
            TITLE: 'Member not found',
            MESSAGE: 'Member not found',
          });
        }

        member = directResponse.data.member;
      } catch (error) {
        logger.error('Direct API call failed:', error);
        throw new APIError({
          STATUS: 500,
          TITLE: 'Failed to fetch member',
          MESSAGE: 'Failed to fetch member from auth service',
        });
      }

      const newKpiEntriesDocs = member.metadata.kpiRef.map((kpi: any) => {
        return {
          month: month,
          year: year,
          templateId: templateId,
          createdBy: createdBy,
          createdFor: createdFor,
          kpiRef: kpi,
        };
      });

      const newKpiEntries = await KpiEntryModel.insertMany(newKpiEntriesDocs);

      return newKpiEntries.map((kpiEntry) => kpiEntry.toObject());
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async getKpiEntry(id: string) {
    try {
      const kpiEntry = await KpiEntryModel.findById(id).lean();
      return kpiEntry;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async getKpiEntries({
    page = 1,
    limit = 10,
    month,
    year,
    templateId,
    status,
    createdBy,
    createdFor,
  }: {
    page?: number;
    limit?: number;
    month?: number;
    year?: number;
    templateId?: string;
    status?: string;
    createdBy?: string;
    createdFor?: string;
  }) {
    try {
      const query: any = {};

      if (month) query.month = month;
      if (year) query.year = year;
      if (templateId) query.templateId = templateId;
      if (status) query.status = status;
      if (createdBy) query.createdBy = createdBy;
      if (createdFor) query.createdFor = createdFor;

      const [kpiEntries, total] = await Promise.all([
        KpiEntryModel.find(query)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        KpiEntryModel.countDocuments(query),
      ]);

      return {
        docs: kpiEntries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async updateKpiEntry(id: string, kpiEntry: KpiEntryUpdate) {
    try {
      // If values are being updated, validate and recalculate scores
      if (kpiEntry.values) {
        // Get the existing entry to access template
        const existingEntry = await KpiEntryModel.findById(id);
        if (!existingEntry) {
          throw new Error('KPI entry not found');
        }

        // Get template for validation
        const template = await KpiTemplateModel.findById(
          existingEntry.templateId
        );
        if (!template) {
          throw new Error('KPI template not found');
        }

        // Merge new values with existing values
        const existingValues = existingEntry.values || [];
        const newValues = kpiEntry.values;

        // Create a map of existing values by name
        const existingValuesMap = new Map(
          existingValues.map((item) => [item.name, item])
        );

        // Update existing values and add new ones
        for (const newValue of newValues) {
          existingValuesMap.set(newValue.name, newValue);
        }

        // Convert back to array
        const mergedValues = Array.from(existingValuesMap.values());

        logger.info(
          'Existing values:',
          JSON.stringify(existingValues, null, 2)
        );
        logger.info('New values:', JSON.stringify(newValues, null, 2));
        logger.info('Merged values:', JSON.stringify(mergedValues, null, 2));

        // Validate that provided values match template items (allows partial updates)
        KpiEntryValidation.validateTemplateItems(template, mergedValues);

        // Add debugging
        logger.info('Template:', JSON.stringify(template, null, 2));

        // Validate values and calculate scores
        const validatedValues = KpiEntryValidation.validateAndCalculateScores(
          template,
          mergedValues
        );

        logger.info(
          'Validated values with scores:',
          JSON.stringify(validatedValues, null, 2)
        );

        // Update the values with calculated scores
        kpiEntry.values = validatedValues;

        // Calculate total score
        kpiEntry.totalScore = validatedValues.reduce(
          (sum, item) => sum + item.score,
          0
        );
      }

      const updatedKpiEntry = await KpiEntryModel.findByIdAndUpdate(
        id,
        {
          ...kpiEntry,
          status: 'initiated',
        },
        {
          new: true,
        }
      );

      return updatedKpiEntry?.toObject();
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async updateKpiEntryStatus(
    id: string,
    status: 'created' | 'initiated' | 'generated'
  ) {
    try {
      const updatedKpiEntry = await KpiEntryModel.findByIdAndUpdate(
        id,
        { status },
        {
          new: true,
        }
      );

      return updatedKpiEntry?.toObject();
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async deleteKpiEntry(id: string) {
    try {
      const deletedKpiEntry = await KpiEntryModel.findByIdAndDelete(id);
      return deletedKpiEntry;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async getEmployeeKpiEntries(
    createdFor: string,
    month?: number,
    year?: number
  ) {
    try {
      const query: any = { createdFor };

      if (month) query.month = month;
      if (year) query.year = year;

      const kpiEntries = await KpiEntryModel.find(query)
        .sort({ createdAt: -1 })
        .lean();

      return kpiEntries;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async getKpiEntriesByStatus(
    status: 'created' | 'initiated' | 'generated'
  ) {
    try {
      const kpiEntries = await KpiEntryModel.find({ status })
        .sort({ createdAt: -1 })
        .lean();

      return kpiEntries;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  static async bulkUpdateStatus(
    ids: string[],
    status: 'created' | 'initiated' | 'generated'
  ) {
    try {
      const result = await KpiEntryModel.updateMany(
        { _id: { $in: ids } },
        { status }
      );

      return result;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}
