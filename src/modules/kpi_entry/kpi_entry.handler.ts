import { NextFunction, Request, Response } from 'express';
import { KpiEntryService } from './kpi_entry.services';
import { User } from '@/lib/api-client';
import Respond from '@/lib/respond';
import logger from '@/configs/logger';

export class KpiEntryHandler {
  static async createKpiEntry(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const user = request.user as User;
      const body = request.body;

      // Create a new KPI entry
      const kpiEntry = await KpiEntryService.createKpiEntry({
        ...body,
        createdBy: user.id,
        req: request,
      });

      return Respond(
        response,
        {
          message: 'KPI entry created successfully',
          data: kpiEntry,
        },
        201
      );
    } catch (error) {
      throw error;
    }
  }

  static async getKpiEntry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const kpiEntry = await KpiEntryService.getKpiEntry(id);

      if (!kpiEntry) {
        return Respond(res, { message: 'KPI entry not found' }, 404);
      }

      Respond(
        res,
        { data: kpiEntry, message: 'KPI entry fetched successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async getKpiEntries(req: Request, res: Response) {
    try {
      const {
        page,
        limit,
        month,
        year,
        templateId,
        status,
        createdBy,
        createdFor,
      } = req.query;

      const kpiEntries = await KpiEntryService.getKpiEntries({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        templateId: templateId as string,
        status: status as string,
        createdBy: createdBy as string,
        createdFor: createdFor as string,
      });

      Respond(
        res,
        { data: kpiEntries, message: 'KPI entries fetched successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateKpiEntry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const body = req.body;

      const kpiEntry = await KpiEntryService.updateKpiEntry(id, body);

      if (!kpiEntry) {
        return Respond(res, { message: 'KPI entry not found' }, 404);
      }

      Respond(
        res,
        { data: kpiEntry, message: 'KPI entry updated successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateKpiValues(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { values } = req.body;

      const kpiEntry = await KpiEntryService.updateKpiEntry(id, { values });

      if (!kpiEntry) {
        return Respond(res, { message: 'KPI entry not found' }, 404);
      }

      Respond(
        res,
        { data: kpiEntry, message: 'KPI values updated successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateKpiEntryStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['created', 'initiated', 'generated'].includes(status)) {
        return Respond(
          res,
          {
            message:
              'Invalid status. Must be one of: created, initiated, generated',
          },
          400
        );
      }

      const kpiEntry = await KpiEntryService.updateKpiEntryStatus(id, status);

      if (!kpiEntry) {
        return Respond(res, { message: 'KPI entry not found' }, 404);
      }

      Respond(
        res,
        { data: kpiEntry, message: 'KPI entry status updated successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async deleteKpiEntry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedKpiEntry = await KpiEntryService.deleteKpiEntry(id);

      if (!deletedKpiEntry) {
        return Respond(res, { message: 'KPI entry not found' }, 404);
      }

      Respond(res, { message: 'KPI entry deleted successfully' }, 200);
    } catch (error) {
      throw error;
    }
  }

  static async getEmployeeKpiEntries(req: Request, res: Response) {
    try {
      const { createdFor } = req.params;
      const { month, year } = req.query;

      const kpiEntries = await KpiEntryService.getEmployeeKpiEntries(
        createdFor,
        month ? Number(month) : undefined,
        year ? Number(year) : undefined
      );

      Respond(
        res,
        {
          data: kpiEntries,
          message: 'Employee KPI entries fetched successfully',
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async getKpiEntriesByStatus(req: Request, res: Response) {
    try {
      const { status } = req.params;

      if (!['created', 'initiated', 'generated'].includes(status)) {
        return Respond(
          res,
          {
            message:
              'Invalid status. Must be one of: created, initiated, generated',
          },
          400
        );
      }

      const kpiEntries = await KpiEntryService.getKpiEntriesByStatus(
        status as any
      );

      Respond(
        res,
        {
          data: kpiEntries,
          message: `KPI entries with status '${status}' fetched successfully`,
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async bulkUpdateStatus(req: Request, res: Response) {
    try {
      const { ids, status } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return Respond(
          res,
          { message: 'IDs array is required and must not be empty' },
          400
        );
      }

      if (!['created', 'initiated', 'generated'].includes(status)) {
        return Respond(
          res,
          {
            message:
              'Invalid status. Must be one of: created, initiated, generated',
          },
          400
        );
      }

      const result = await KpiEntryService.bulkUpdateStatus(ids, status);

      Respond(
        res,
        {
          data: result,
          message: `Successfully updated ${result.modifiedCount} KPI entries to status '${status}'`,
        },
        200
      );
    } catch (error) {
      throw error;
    }
  }
}
