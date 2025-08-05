import { NextFunction, Request, Response } from 'express';
import {
  MonthlyReportService,
  MonthlyReportFilters,
} from './kpi_entry.monthly-report';
import { HateoasService } from './kpi_entry.hateoas';
import Respond from '@/lib/respond';
import logger from '@/configs/logger';

export class MonthlyReportHandler {
  /**
   * Generate monthly report and update status to generated
   */
  static async generateMonthlyReport(req: Request, res: Response) {
    try {
      const { month, year, department } = req.body;

      // Validate required parameters
      if (!month || !year) {
        return Respond(
          res,
          {
            message: 'Month and year are required',
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

      const filters: MonthlyReportFilters = {
        month: Number(month),
        year: Number(year),
        department: department || undefined,
      };

      const result = await MonthlyReportService.generateMonthlyReport(filters);

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
          message: 'Monthly report generated successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in generateMonthlyReport:', error);
      throw error;
    }
  }

  /**
   * Get monthly report summary
   */
  static async getMonthlyReportSummary(req: Request, res: Response) {
    try {
      const { month, year, department } = req.query;

      // Validate required parameters
      if (!month || !year) {
        return Respond(
          res,
          {
            message: 'Month and year are required',
          },
          400
        );
      }

      // Validate month range
      if (Number(month) < 1 || Number(month) > 12) {
        return Respond(
          res,
          {
            message: 'Month must be between 1 and 12',
          },
          400
        );
      }

      // Validate year
      if (Number(year) < 2020 || Number(year) > 2030) {
        return Respond(
          res,
          {
            message: 'Year must be between 2020 and 2030',
          },
          400
        );
      }

      const filters: MonthlyReportFilters = {
        month: Number(month),
        year: Number(year),
        department: department ? String(department) : undefined,
      };

      const result =
        await MonthlyReportService.getMonthlyReportSummary(filters);

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
          message: 'Monthly report summary fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getMonthlyReportSummary:', error);
      throw error;
    }
  }
}
