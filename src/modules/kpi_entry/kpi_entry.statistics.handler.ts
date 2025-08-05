import { NextFunction, Request, Response } from 'express';
import { KpiEntryStatistics, StatisticsFilters } from './kpi_entry.statistics';
import { ExternalDataService } from './kpi_entry.external-data';
import { HateoasService } from './kpi_entry.hateoas';
import Respond from '@/lib/respond';
import logger from '@/configs/logger';

// Helper function to parse array query parameters
function parseArrayParam(param: any): string[] {
  if (!param) return [];
  return Array.isArray(param) ? param.map((p) => String(p)) : [String(param)];
}

export class KpiEntryStatisticsHandler {
  /**
   * Get employee rankings with filters
   */
  static async getEmployeeRankings(req: Request, res: Response) {
    try {
      const {
        month,
        year,
        departments,
        roles,
        excludeDepartments,
        excludeRoles,
        limit,
        page,
      } = req.query;

      const filters: StatisticsFilters = {};

      if (month) filters.month = Number(month);
      if (year) filters.year = Number(year);
      if (limit) filters.limit = Number(limit);
      if (page) filters.page = Number(page);

      // Parse array parameters using helper function
      filters.departments = parseArrayParam(departments);
      filters.roles = parseArrayParam(roles);
      filters.excludeDepartments = parseArrayParam(excludeDepartments);
      filters.excludeRoles = parseArrayParam(excludeRoles);

      const rankings = await KpiEntryStatistics.getEmployeeRankings(filters);
      const filterOptions = await ExternalDataService.getFilterOptions();

      const hateoasResponse = HateoasService.createResponse(
        req,
        rankings,
        rankings.page,
        rankings.totalPages,
        rankings.limit,
        filterOptions
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Employee rankings fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getEmployeeRankings:', error);
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStatistics(req: Request, res: Response) {
    try {
      const {
        month,
        year,
        departments,
        roles,
        excludeDepartments,
        excludeRoles,
      } = req.query;

      const filters: StatisticsFilters = {};

      if (month) filters.month = Number(month);
      if (year) filters.year = Number(year);

      // Parse array parameters using helper function
      filters.departments = parseArrayParam(departments);
      filters.roles = parseArrayParam(roles);
      filters.excludeDepartments = parseArrayParam(excludeDepartments);
      filters.excludeRoles = parseArrayParam(excludeRoles);

      const departmentStats =
        await KpiEntryStatistics.getDepartmentStatistics(filters);
      const filterOptions = await ExternalDataService.getFilterOptions();

      const hateoasResponse = HateoasService.createResponse(
        req,
        departmentStats,
        undefined,
        undefined,
        undefined,
        filterOptions
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Department statistics fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getDepartmentStatistics:', error);
      throw error;
    }
  }

  /**
   * Get role statistics
   */
  static async getRoleStatistics(req: Request, res: Response) {
    try {
      const {
        month,
        year,
        departments,
        roles,
        excludeDepartments,
        excludeRoles,
      } = req.query;

      const filters: StatisticsFilters = {};

      if (month) filters.month = Number(month);
      if (year) filters.year = Number(year);

      // Parse array parameters using helper function
      filters.departments = parseArrayParam(departments);
      filters.roles = parseArrayParam(roles);
      filters.excludeDepartments = parseArrayParam(excludeDepartments);
      filters.excludeRoles = parseArrayParam(excludeRoles);

      const roleStats = await KpiEntryStatistics.getRoleStatistics(filters);
      const filterOptions = await ExternalDataService.getFilterOptions();

      const hateoasResponse = HateoasService.createResponse(
        req,
        roleStats,
        undefined,
        undefined,
        undefined,
        filterOptions
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Role statistics fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getRoleStatistics:', error);
      throw error;
    }
  }

  /**
   * Get overall statistics
   */
  static async getOverallStatistics(req: Request, res: Response) {
    try {
      const {
        month,
        year,
        departments,
        roles,
        excludeDepartments,
        excludeRoles,
      } = req.query;

      const filters: StatisticsFilters = {};

      if (month) filters.month = Number(month);
      if (year) filters.year = Number(year);

      // Parse array parameters using helper function
      filters.departments = parseArrayParam(departments);
      filters.roles = parseArrayParam(roles);
      filters.excludeDepartments = parseArrayParam(excludeDepartments);
      filters.excludeRoles = parseArrayParam(excludeRoles);

      const overallStats =
        await KpiEntryStatistics.getOverallStatistics(filters);
      const filterOptions = await ExternalDataService.getFilterOptions();

      const hateoasResponse = HateoasService.createResponse(
        req,
        overallStats,
        undefined,
        undefined,
        undefined,
        filterOptions
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Overall statistics fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getOverallStatistics:', error);
      throw error;
    }
  }

  /**
   * Get filter options for statistics
   */
  static async getFilterOptions(req: Request, res: Response) {
    try {
      const filterOptions = await ExternalDataService.getFilterOptions();

      const hateoasResponse = HateoasService.createResponse(
        req,
        filterOptions,
        undefined,
        undefined,
        undefined
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Filter options fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getFilterOptions:', error);
      throw error;
    }
  }

  /**
   * Get top 5% performers
   */
  static async getTop5Percent(req: Request, res: Response) {
    try {
      const {
        month,
        year,
        departments,
        roles,
        excludeDepartments,
        excludeRoles,
      } = req.query;

      const filters: StatisticsFilters = {};

      if (month) filters.month = Number(month);
      if (year) filters.year = Number(year);

      // Parse array parameters using helper function
      filters.departments = parseArrayParam(departments);
      filters.roles = parseArrayParam(roles);
      filters.excludeDepartments = parseArrayParam(excludeDepartments);
      filters.excludeRoles = parseArrayParam(excludeRoles);

      const top5Percent = await KpiEntryStatistics.getTop5Percent(filters);
      const filterOptions = await ExternalDataService.getFilterOptions();

      const hateoasResponse = HateoasService.createResponse(
        req,
        top5Percent,
        undefined,
        undefined,
        undefined,
        filterOptions
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Top 5% performers fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getTop5Percent:', error);
      throw error;
    }
  }

  /**
   * Get bottom 5% performers
   */
  static async getBottom5Percent(req: Request, res: Response) {
    try {
      const {
        month,
        year,
        departments,
        roles,
        excludeDepartments,
        excludeRoles,
      } = req.query;

      const filters: StatisticsFilters = {};

      if (month) filters.month = Number(month);
      if (year) filters.year = Number(year);

      // Parse array parameters using helper function
      filters.departments = parseArrayParam(departments);
      filters.roles = parseArrayParam(roles);
      filters.excludeDepartments = parseArrayParam(excludeDepartments);
      filters.excludeRoles = parseArrayParam(excludeRoles);

      const bottom5Percent =
        await KpiEntryStatistics.getBottom5Percent(filters);
      const filterOptions = await ExternalDataService.getFilterOptions();

      const hateoasResponse = HateoasService.createResponse(
        req,
        bottom5Percent,
        undefined,
        undefined,
        undefined,
        filterOptions
      );

      Respond(
        res,
        {
          ...hateoasResponse,
          message: 'Bottom 5% performers fetched successfully',
        },
        200
      );
    } catch (error) {
      logger.error('Error in getBottom5Percent:', error);
      throw error;
    }
  }
}
