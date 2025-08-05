import { NextFunction, Request, Response } from 'express';
import { KpiTemplateService } from './kpi_template.services';
import { User } from '@/lib/api-client';
import Respond from '@/lib/respond';
import logger from '@/configs/logger';

export class KpiTemplateHandler {
  static async createKpiTemplate(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const user = request.user as User;
      const body = request.body;
      // Create a new kpi template
      const kpiTemplate = await KpiTemplateService.createKpiTemplate({
        ...body,
        createdBy: user.id,
      });

      return Respond(
        response,
        {
          message: 'KPI template created successfully',
          data: kpiTemplate,
        },
        201
      );
    } catch (error) {
      throw error;
    }
  }

  static async getKpiTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const kpiTemplate = await KpiTemplateService.getKpiTemplate(id);
      Respond(
        res,
        { kpiTemplate, message: 'KPI template fetched successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async getKpiTemplates(req: Request, res: Response) {
    try {
      const { page, limit, search, departmentSlug, role } = req.query;
      const kpiTemplates = await KpiTemplateService.getKpiTemplates({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        departmentSlug: departmentSlug as string,
        role: role as string,
      });
      Respond(
        res,
        { kpiTemplates, message: 'KPI templates fetched successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateKpiTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const body = req.body;
      const kpiTemplate = await KpiTemplateService.updateKpiTemplate(id, body);
      Respond(
        res,
        { kpiTemplate, message: 'KPI template updated successfully' },
        200
      );
    } catch (error) {
      throw error;
    }
  }
}
