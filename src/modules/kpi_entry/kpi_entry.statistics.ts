import logger from '@/configs/logger';
import { KpiEntryModel } from './kpi_entry.model';
import { KpiTemplateModel } from '../kpi_template/kpi_template.model';

export interface StatisticsFilters {
  month?: number;
  year?: number;
  departments?: string[];
  roles?: string[];
  excludeDepartments?: string[];
  excludeRoles?: string[];
  limit?: number;
  page?: number;
}

export interface EmployeeRanking {
  employeeId: string;
  createdFor: string;
  departmentSlug: string;
  role: string;
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  kpiEntries: Array<{
    templateId: string;
    templateName: string;
    totalScore: number;
    maxPossibleScore: number;
    percentageScore: number;
    status: string;
  }>;
  rank: number;
}

export interface DepartmentStatistics {
  departmentSlug: string;
  totalEmployees: number;
  averageScore: number;
  rankings: EmployeeRanking[]; // All employees ranked from top to bottom
  top5Percent: {
    count: number;
    performers: EmployeeRanking[];
    cutoffScore: number;
    averageScore: number;
  };
  bottom5Percent: {
    count: number;
    performers: EmployeeRanking[];
    cutoffScore: number;
    averageScore: number;
  };
  scoreDistribution: {
    excellent: number; // 90-100%
    good: number; // 70-89%
    average: number; // 50-69%
    poor: number; // 0-49%
  };
  roles: RoleStatistics[]; // Roles within this department
}

export interface RoleStatistics {
  role: string;
  totalEmployees: number;
  averageScore: number;
  rankings: EmployeeRanking[]; // All employees ranked from top to bottom
  top5Percent: {
    count: number;
    performers: EmployeeRanking[];
    cutoffScore: number;
    averageScore: number;
  };
  bottom5Percent: {
    count: number;
    performers: EmployeeRanking[];
    cutoffScore: number;
    averageScore: number;
  };
  scoreDistribution: {
    excellent: number; // 90-100%
    good: number; // 70-89%
    average: number; // 50-69%
    poor: number; // 0-49%
  };
}

export class KpiEntryStatistics {
  /**
   * Get employee rankings with filters
   */
  static async getEmployeeRankings(filters: StatisticsFilters = {}) {
    try {
      const {
        month,
        year,
        departments = ['collector-office', 'revenue-department'],
        roles = [],
        excludeDepartments = [],
        excludeRoles = [],
        limit = 50,
        page = 1,
      } = filters;

      // Ensure we have default departments if none provided
      const finalDepartments =
        departments.length > 0
          ? departments
          : ['collector-office', 'revenue-department'];
      const finalRoles = roles.length > 0 ? roles : [];

      // Build query - only include generated entries
      const query: any = { status: 'generated' };

      if (month) query.month = month;
      if (year) query.year = year;

      // Get all KPI entries for the period
      const kpiEntries = await KpiEntryModel.find(query).lean();
      logger.info(
        `Found ${kpiEntries.length} KPI entries with status 'generated'`
      );

      // Get template data for all entries
      const templateIds = [
        ...new Set(kpiEntries.map((entry) => entry.templateId)),
      ];
      const templates = await KpiTemplateModel.find({
        _id: { $in: templateIds },
      }).lean();
      const templateMap = new Map(templates.map((t) => [t._id.toString(), t]));
      logger.info(
        `Found ${templates.length} templates for ${templateIds.length} unique template IDs`
      );

      // Group by employee and calculate scores
      const employeeScores = new Map<string, any>();

      for (const entry of kpiEntries) {
        const template = templateMap.get(entry.templateId.toString());
        if (!template) continue;

        // Apply department and role filters
        const departmentMatch =
          finalDepartments.includes(template.departmentSlug || '') &&
          !excludeDepartments.includes(template.departmentSlug || '');

        const roleMatch =
          (finalRoles.length === 0 ||
            (template.role &&
              finalRoles.some((role) => template.role.startsWith(role)))) &&
          !excludeRoles.some(
            (role) => template.role && template.role.startsWith(role)
          );

        if (!departmentMatch || !roleMatch) continue;

        const employeeKey = entry.createdFor;

        if (!employeeScores.has(employeeKey)) {
          employeeScores.set(employeeKey, {
            employeeId: entry.createdFor,
            createdFor: entry.createdFor,
            departmentSlug: template.departmentSlug || '',
            role: template.role || '',
            totalScore: 0,
            maxPossibleScore: 0,
            kpiEntries: [],
          });
        }

        const employee = employeeScores.get(employeeKey);
        employee.totalScore += entry.totalScore || 0;

        // Calculate max possible score from template
        const templateMaxScore =
          template.template?.reduce(
            (sum: number, item: any) => sum + item.maxMarks,
            0
          ) || 0;
        employee.maxPossibleScore += templateMaxScore;

        employee.kpiEntries.push({
          templateId: entry.templateId,
          templateName: template.name || '',
          totalScore: entry.totalScore || 0,
          maxPossibleScore: templateMaxScore,
          percentageScore:
            templateMaxScore > 0
              ? ((entry.totalScore || 0) / templateMaxScore) * 100
              : 0,
          status: entry.status,
        });
      }

      // Convert to array and calculate percentages
      const rankings: EmployeeRanking[] = Array.from(employeeScores.values())
        .map((employee) => ({
          ...employee,
          percentageScore:
            employee.maxPossibleScore > 0
              ? (employee.totalScore / employee.maxPossibleScore) * 100
              : 0,
        }))
        .sort((a, b) => b.percentageScore - a.percentageScore);

      logger.info(
        `Processed ${employeeScores.size} employees, created ${rankings.length} rankings`
      );

      // Add ranks
      rankings.forEach((ranking, index) => {
        ranking.rank = index + 1;
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRankings = rankings.slice(startIndex, endIndex);

      return {
        rankings: paginatedRankings,
        total: rankings.length,
        page,
        limit,
        totalPages: Math.ceil(rankings.length / limit),
        hasNextPage: page < Math.ceil(rankings.length / limit),
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      logger.error('Error getting employee rankings:', error);
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStatistics(filters: StatisticsFilters = {}) {
    try {
      const {
        month,
        year,
        departments = ['collector-office'],
        roles = [],
        excludeDepartments = [],
        excludeRoles = [],
      } = filters;

      // Get rankings for all departments
      const allRankings = await this.getEmployeeRankings({
        ...filters,
        limit: 1000, // Get all for statistics
        page: 1,
      });

      const departmentStats = new Map<string, DepartmentStatistics>();

      for (const ranking of allRankings.rankings) {
        if (!departmentStats.has(ranking.departmentSlug)) {
          departmentStats.set(ranking.departmentSlug, {
            departmentSlug: ranking.departmentSlug,
            totalEmployees: 0,
            averageScore: 0,
            rankings: [],
            top5Percent: {
              count: 0,
              performers: [],
              cutoffScore: 0,
              averageScore: 0,
            },
            bottom5Percent: {
              count: 0,
              performers: [],
              cutoffScore: 0,
              averageScore: 0,
            },
            scoreDistribution: {
              excellent: 0,
              good: 0,
              average: 0,
              poor: 0,
            },
            roles: [],
          });
        }

        const dept = departmentStats.get(ranking.departmentSlug)!;
        dept.totalEmployees++;
        dept.averageScore += ranking.percentageScore;

        // Categorize by score
        if (ranking.percentageScore >= 90) dept.scoreDistribution.excellent++;
        else if (ranking.percentageScore >= 70) dept.scoreDistribution.good++;
        else if (ranking.percentageScore >= 50)
          dept.scoreDistribution.average++;
        else dept.scoreDistribution.poor++;

        // Add to rankings array
        dept.rankings.push(ranking);
      }

      // Calculate averages and sort performers
      for (const dept of departmentStats.values()) {
        dept.averageScore =
          dept.totalEmployees > 0 ? dept.averageScore / dept.totalEmployees : 0;

        // Sort all performers by percentage score
        const allPerformers = Array.from(allRankings.rankings)
          .filter((ranking) => ranking.departmentSlug === dept.departmentSlug)
          .sort((a, b) => b.percentageScore - a.percentageScore);

        // Calculate top 5% and bottom 5%
        const top5PercentCount = Math.ceil(dept.totalEmployees * 0.05);
        const bottom5PercentCount = Math.ceil(dept.totalEmployees * 0.05);

        // Get top 5% performers
        const top5Percent = allPerformers.slice(0, top5PercentCount);
        dept.top5Percent = {
          count: top5PercentCount,
          performers: top5Percent,
          cutoffScore:
            top5Percent.length > 0
              ? top5Percent[top5Percent.length - 1].percentageScore
              : 0,
          averageScore:
            top5Percent.length > 0
              ? top5Percent.reduce((sum, r) => sum + r.percentageScore, 0) /
                top5Percent.length
              : 0,
        };

        // Get bottom 5% performers
        const bottom5Percent = allPerformers
          .slice(-bottom5PercentCount)
          .reverse();
        dept.bottom5Percent = {
          count: bottom5PercentCount,
          performers: bottom5Percent,
          cutoffScore:
            bottom5Percent.length > 0
              ? bottom5Percent[bottom5Percent.length - 1].percentageScore
              : 0,
          averageScore:
            bottom5Percent.length > 0
              ? bottom5Percent.reduce((sum, r) => sum + r.percentageScore, 0) /
                bottom5Percent.length
              : 0,
        };

        // Sort rankings from top to bottom
        dept.rankings.sort((a, b) => b.percentageScore - a.percentageScore);
      }

      return Array.from(departmentStats.values());
    } catch (error) {
      logger.error('Error getting department statistics:', error);
      throw error;
    }
  }

  /**
   * Get role-based statistics
   */
  static async getRoleStatistics(filters: StatisticsFilters = {}) {
    try {
      const {
        month,
        year,
        departments = ['collector-office'],
        roles = [],
        excludeDepartments = [],
        excludeRoles = [],
      } = filters;

      // Get rankings
      const allRankings = await this.getEmployeeRankings({
        ...filters,
        limit: 1000,
        page: 1,
      });

      const roleStats = new Map<string, any>();

      for (const ranking of allRankings.rankings) {
        if (!roleStats.has(ranking.role)) {
          roleStats.set(ranking.role, {
            role: ranking.role,
            totalEmployees: 0,
            averageScore: 0,
            rankings: [],
            top5Percent: {
              count: 0,
              performers: [],
              cutoffScore: 0,
              averageScore: 0,
            },
            bottom5Percent: {
              count: 0,
              performers: [],
              cutoffScore: 0,
              averageScore: 0,
            },
            scoreDistribution: {
              excellent: 0,
              good: 0,
              average: 0,
              poor: 0,
            },
          });
        }

        const role = roleStats.get(ranking.role)!;
        role.totalEmployees++;
        role.averageScore += ranking.percentageScore;

        // Categorize by score
        if (ranking.percentageScore >= 90) role.scoreDistribution.excellent++;
        else if (ranking.percentageScore >= 70) role.scoreDistribution.good++;
        else if (ranking.percentageScore >= 50)
          role.scoreDistribution.average++;
        else role.scoreDistribution.poor++;

        // Add to rankings array
        role.rankings.push(ranking);
      }

      // Calculate averages and sort performers
      for (const role of roleStats.values()) {
        role.averageScore =
          role.totalEmployees > 0 ? role.averageScore / role.totalEmployees : 0;

        // Sort all performers by percentage score
        const allPerformers = Array.from(allRankings.rankings)
          .filter((ranking) => ranking.role === role.role)
          .sort((a, b) => b.percentageScore - a.percentageScore);

        // Calculate top 5% and bottom 5%
        const top5PercentCount = Math.ceil(role.totalEmployees * 0.05);
        const bottom5PercentCount = Math.ceil(role.totalEmployees * 0.05);

        // Get top 5% performers
        const top5Percent = allPerformers.slice(0, top5PercentCount);
        role.top5Percent = {
          count: top5PercentCount,
          performers: top5Percent,
          cutoffScore:
            top5Percent.length > 0
              ? top5Percent[top5Percent.length - 1].percentageScore
              : 0,
          averageScore:
            top5Percent.length > 0
              ? top5Percent.reduce((sum, r) => sum + r.percentageScore, 0) /
                top5Percent.length
              : 0,
        };

        // Get bottom 5% performers
        const bottom5Percent = allPerformers
          .slice(-bottom5PercentCount)
          .reverse();
        role.bottom5Percent = {
          count: bottom5PercentCount,
          performers: bottom5Percent,
          cutoffScore:
            bottom5Percent.length > 0
              ? bottom5Percent[bottom5Percent.length - 1].percentageScore
              : 0,
          averageScore:
            bottom5Percent.length > 0
              ? bottom5Percent.reduce((sum, r) => sum + r.percentageScore, 0) /
                bottom5Percent.length
              : 0,
        };

        // Sort rankings from top to bottom
        role.rankings.sort(
          (a: EmployeeRanking, b: EmployeeRanking) =>
            b.percentageScore - a.percentageScore
        );
      }

      return Array.from(roleStats.values());
    } catch (error) {
      logger.error('Error getting role statistics:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive overall statistics
   */
  static async getOverallStatistics(filters: StatisticsFilters = {}) {
    try {
      const { departments } = filters;

      // If no specific department is provided, get comprehensive statistics
      if (!departments || departments.length === 0) {
        return await this.getComprehensiveStatistics(filters);
      }

      // If specific department is provided, get department-wise statistics
      return await this.getDepartmentWiseStatistics(filters);
    } catch (error) {
      logger.error('Error getting overall statistics:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics (department-wise breakdown)
   */
  private static async getComprehensiveStatistics(
    filters: StatisticsFilters = {}
  ) {
    try {
      const rankings = await this.getEmployeeRankings({
        ...filters,
        limit: 1000,
        page: 1,
      });

      const totalEmployees = rankings.total;
      const averageScore =
        totalEmployees > 0
          ? rankings.rankings.reduce((sum, r) => sum + r.percentageScore, 0) /
            totalEmployees
          : 0;

      const scoreDistribution = {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0,
      };

      for (const ranking of rankings.rankings) {
        if (ranking.percentageScore >= 90) scoreDistribution.excellent++;
        else if (ranking.percentageScore >= 70) scoreDistribution.good++;
        else if (ranking.percentageScore >= 50) scoreDistribution.average++;
        else scoreDistribution.poor++;
      }

      const top5PercentCount = Math.ceil(totalEmployees * 0.05);
      const bottom5PercentCount = Math.ceil(totalEmployees * 0.05);

      const top5Percent = rankings.rankings.slice(0, top5PercentCount);
      const bottom5Percent = rankings.rankings
        .slice(-bottom5PercentCount)
        .reverse();

      // Get department-wise breakdown
      const departmentStats = await this.getDepartmentStatistics(filters);

      // Get role-wise breakdown
      const roleStats = await this.getRoleStatistics(filters);

      // Organize roles within departments
      const departmentMap = new Map<string, any>();

      // Initialize departments with their existing data
      for (const dept of departmentStats) {
        departmentMap.set(dept.departmentSlug, {
          ...dept,
          roles: [],
        });
      }

      // Group roles by department and add them to the respective departments
      for (const role of roleStats) {
        // Find employees in this role and get their department
        const roleEmployees = rankings.rankings.filter(
          (r) => r.role === role.role
        );
        if (roleEmployees.length > 0) {
          const departmentSlug = roleEmployees[0].departmentSlug;
          const department = departmentMap.get(departmentSlug);
          if (department) {
            department.roles.push(role);
          }
        }
      }

      return {
        overall: {
          totalEmployees,
          averageScore,
          scoreDistribution,
          rankings: rankings.rankings,
          top5Percent: {
            count: top5PercentCount,
            performers: top5Percent,
            cutoffScore:
              top5Percent.length > 0
                ? top5Percent[top5Percent.length - 1].percentageScore
                : 0,
            averageScore:
              top5Percent.length > 0
                ? top5Percent.reduce((sum, r) => sum + r.percentageScore, 0) /
                  top5Percent.length
                : 0,
          },
          bottom5Percent: {
            count: bottom5PercentCount,
            performers: bottom5Percent,
            cutoffScore:
              bottom5Percent.length > 0
                ? bottom5Percent[bottom5Percent.length - 1].percentageScore
                : 0,
            averageScore:
              bottom5Percent.length > 0
                ? bottom5Percent.reduce(
                    (sum, r) => sum + r.percentageScore,
                    0
                  ) / bottom5Percent.length
                : 0,
          },
        },
        departments: Array.from(departmentMap.values()),
      };
    } catch (error) {
      logger.error('Error getting comprehensive statistics:', error);
      throw error;
    }
  }

  /**
   * Get department-wise statistics when specific department is provided
   */
  private static async getDepartmentWiseStatistics(
    filters: StatisticsFilters = {}
  ) {
    try {
      const departmentStats = await this.getDepartmentStatistics(filters);

      // If only one department is specified, return that department's stats
      if (filters.departments && filters.departments.length === 1) {
        return departmentStats[0] || null;
      }

      // If multiple departments are specified, return all of them
      return {
        departments: departmentStats,
        totalDepartments: departmentStats.length,
      };
    } catch (error) {
      logger.error('Error getting department-wise statistics:', error);
      throw error;
    }
  }

  /**
   * Get top 5% performers
   */
  static async getTop5Percent(filters: StatisticsFilters = {}) {
    try {
      const rankings = await this.getEmployeeRankings({
        ...filters,
        limit: 1000,
        page: 1,
      });

      const totalEmployees = rankings.total;
      const top5PercentCount = Math.ceil(totalEmployees * 0.05); // 5% of total employees

      const top5Percent = rankings.rankings.slice(0, top5PercentCount);

      return {
        totalEmployees,
        top5PercentCount,
        performers: top5Percent,
        cutoffScore:
          top5Percent.length > 0
            ? top5Percent[top5Percent.length - 1].percentageScore
            : 0,
        averageScore:
          top5Percent.length > 0
            ? top5Percent.reduce((sum, r) => sum + r.percentageScore, 0) /
              top5Percent.length
            : 0,
      };
    } catch (error) {
      logger.error('Error getting top 5% performers:', error);
      throw error;
    }
  }

  /**
   * Get bottom 5% performers
   */
  static async getBottom5Percent(filters: StatisticsFilters = {}) {
    try {
      const rankings = await this.getEmployeeRankings({
        ...filters,
        limit: 1000,
        page: 1,
      });

      const totalEmployees = rankings.total;
      const bottom5PercentCount = Math.ceil(totalEmployees * 0.05); // 5% of total employees

      const bottom5Percent = rankings.rankings
        .slice(-bottom5PercentCount)
        .reverse();

      return {
        totalEmployees,
        bottom5PercentCount,
        performers: bottom5Percent,
        cutoffScore:
          bottom5Percent.length > 0
            ? bottom5Percent[bottom5Percent.length - 1].percentageScore
            : 0,
        averageScore:
          bottom5Percent.length > 0
            ? bottom5Percent.reduce((sum, r) => sum + r.percentageScore, 0) /
              bottom5Percent.length
            : 0,
      };
    } catch (error) {
      logger.error('Error getting bottom 5% performers:', error);
      throw error;
    }
  }
}
