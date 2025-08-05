import { NextFunction, Request, Response } from 'express';
import { KpiMigrationService } from './kpi_entry.migration';
import { HateoasService } from './kpi_entry.hateoas';
import Respond from '@/lib/respond';
import logger from '@/configs/logger';

export class KpiMigrationHandler {
  /**
   * Migrate CSV data to KPI entries
   */
  static async migrateCsvData(req: Request, res: Response) {
    try {
      const { csvContent, month, year, templateId, departmentSlug, role } =
        req.body;

      const createdBy = req.user?.id;

      // Validate required parameters
      if (
        !csvContent ||
        !month ||
        !year ||
        !templateId ||
        !departmentSlug ||
        !role
      ) {
        return Respond(
          res,
          {
            message:
              'CSV content, month, year, templateId, departmentSlug, and role are required',
          },
          400
        );
      }

      // Validate month range
      if (month < 1 || month > 12) {
        return Respond(
          res,
          {
            message: 'Month must be between 1 and 12',
          },
          400
        );
      }

      // Validate year
      if (year < 2020 || year > 2030) {
        return Respond(
          res,
          {
            message: 'Year must be between 2020 and 2030',
          },
          400
        );
      }

      // Validate CSV content
      if (typeof csvContent !== 'string' || csvContent.trim().length === 0) {
        return Respond(
          res,
          {
            message: 'CSV content must be a non-empty string',
          },
          400
        );
      }

      const result = await KpiMigrationService.migrateCsvData(
        csvContent,
        Number(month),
        Number(year),
        templateId,
        departmentSlug,
        role,
        createdBy || 'system'
      );

      const hateoasResponse = HateoasService.createResponse(
        req,
        result,
        undefined,
        undefined,
        undefined
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'CSV migration completed successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in migrateCsvData:', error);
      throw error;
    }
  }

  /**
   * Parse CSV data without creating entries (for preview)
   */
  static async parseCsvData(req: Request, res: Response) {
    try {
      const { csvContent, departmentSlug, role } = req.body;

      // Validate CSV content
      if (
        !csvContent ||
        typeof csvContent !== 'string' ||
        csvContent.trim().length === 0
      ) {
        return Respond(
          res,
          {
            message: 'CSV content must be a non-empty string',
          },
          400
        );
      }

      // Validate department and role
      if (!departmentSlug || !role) {
        return Respond(
          res,
          {
            message: 'Department slug and role are required',
          },
          400
        );
      }

      const parsedData = KpiMigrationService.parseCsvData(
        csvContent,
        departmentSlug,
        role
      );

      const hateoasResponse = HateoasService.createResponse(
        req,
        {
          totalRecords: parsedData.length,
          records: parsedData,
        },
        undefined,
        undefined,
        undefined
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'CSV data parsed successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in parseCsvData:', error);
      throw error;
    }
  }

  /**
   * Debug CSV parsing
   */
  static async debugCsvParsing(req: Request, res: Response) {
    try {
      const { csvContent } = req.body;

      if (!csvContent || typeof csvContent !== 'string') {
        return Respond(
          res,
          {
            message: 'CSV content is required',
          },
          400
        );
      }

      const debugResult = KpiMigrationService.debugCsvParsing(csvContent);

      Respond(
        res,
        {
          message: 'CSV debug completed',
          data: debugResult,
        },
        200
      );
    } catch (error) {
      logger.error('Error in debugCsvParsing:', error);
      throw error;
    }
  }

  /**
   * Test member lookup by name
   */
  static async testMemberLookup(req: Request, res: Response) {
    try {
      const { name } = req.query;

      if (!name || typeof name !== 'string') {
        return Respond(
          res,
          {
            message: 'Name parameter is required',
          },
          400
        );
      }

      const member = await KpiMigrationService.fetchMemberByName(name);

      const hateoasResponse = HateoasService.createResponse(
        req,
        {
          name,
          found: !!member,
          member: member || null,
        },
        undefined,
        undefined,
        undefined
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: member ? 'Member found successfully' : 'Member not found',
        },
        200
      );
    } catch (error) {
      logger.error('Error in testMemberLookup:', error);
      throw error;
    }
  }

  /**
   * Test header mapping for CSV parsing
   */
  static async testHeaderMapping(req: Request, res: Response) {
    try {
      const { csvContent, departmentSlug, role } = req.body;

      if (!csvContent || typeof csvContent !== 'string') {
        return Respond(
          res,
          {
            message: 'CSV content is required',
          },
          400
        );
      }

      if (!departmentSlug || !role) {
        return Respond(
          res,
          {
            message: 'Department slug and role are required',
          },
          400
        );
      }

      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return Respond(
          res,
          {
            message: 'CSV must have at least 2 lines (headers and sub-headers)',
          },
          400
        );
      }

      const headers = lines[0].split(',');
      const subHeaders = lines[1].split(',');

      // Test header mapping
      const headerMapping = KpiMigrationService['createHeaderMapping'](
        headers,
        subHeaders,
        departmentSlug,
        role
      );

      // Analyze mapping quality
      const mappingAnalysis = {
        totalHeaders: headers.length,
        mappedHeaders: Object.keys(headerMapping).length,
        officerNameFound: !!headerMapping['officerName'],
        kpiMappings: Object.entries(headerMapping)
          .filter(([key]) => key !== 'officerName')
          .map(([kpiName, mapping]) => ({
            kpiName,
            originalHeader: mapping.originalHeader,
            normalizedHeader: mapping.normalizedHeader,
            confidence: mapping.confidence,
            status:
              mapping.confidence > 0.8
                ? 'high'
                : mapping.confidence > 0.6
                  ? 'medium'
                  : 'low',
          })),
        unmappedHeaders: headers.filter(
          (header) =>
            !Object.values(headerMapping).some(
              (mapping) => mapping.originalHeader === header.trim()
            )
        ),
      };

      const hateoasResponse = HateoasService.createResponse(
        req,
        {
          departmentSlug,
          role,
          headers,
          subHeaders,
          headerMapping,
          mappingAnalysis,
        },
        undefined,
        undefined,
        undefined
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Header mapping analysis completed',
        },
        200
      );
    } catch (error) {
      logger.error('Error in testHeaderMapping:', error);
      throw error;
    }
  }
}
