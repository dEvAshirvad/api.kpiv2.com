import { Request } from 'express';

export interface HateoasLink {
  href: string;
  rel: string;
  method: string;
  title?: string;
}

export interface HateoasResponse<T> {
  data: T;
  links: HateoasLink[];
  filters?: {
    departments: string[]; // Array of department slugs
    roles: string[]; // Array of roles excluding defaults
  };
}

export class HateoasService {
  private static baseUrl = 'http://localhost:3002/api/v1';

  /**
   * Generate base URL from request
   */
  private static getBaseUrl(req: Request): string {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    return `${protocol}://${host}/api/v1`;
  }

  /**
   * Generate statistics links
   */
  static generateStatisticsLinks(req: Request): HateoasLink[] {
    const baseUrl = this.getBaseUrl(req);

    return [
      {
        href: `${baseUrl}/kpi-entries/statistics/rankings`,
        rel: 'rankings',
        method: 'GET',
        title: 'Get employee rankings',
      },
      {
        href: `${baseUrl}/kpi-entries/statistics/departments`,
        rel: 'departments',
        method: 'GET',
        title: 'Get department statistics',
      },
      {
        href: `${baseUrl}/kpi-entries/statistics/roles`,
        rel: 'roles',
        method: 'GET',
        title: 'Get role statistics',
      },
      {
        href: `${baseUrl}/kpi-entries/statistics/overall`,
        rel: 'overall',
        method: 'GET',
        title: 'Get overall statistics',
      },
      {
        href: `${baseUrl}/kpi-entries/statistics/filter-options`,
        rel: 'filter-options',
        method: 'GET',
        title: 'Get available filter options',
      },
    ];
  }

  /**
   * Generate pagination links
   */
  static generatePaginationLinks(
    req: Request,
    currentPage: number,
    totalPages: number,
    limit: number
  ): HateoasLink[] {
    const baseUrl = this.getBaseUrl(req);
    const currentPath = req.path;
    const queryParams = new URLSearchParams(
      req.query as Record<string, string>
    );

    const links: HateoasLink[] = [];

    // Self link
    links.push({
      href: `${baseUrl}${currentPath}?${queryParams.toString()}`,
      rel: 'self',
      method: 'GET',
    });

    // First page
    if (currentPage > 1) {
      queryParams.set('page', '1');
      links.push({
        href: `${baseUrl}${currentPath}?${queryParams.toString()}`,
        rel: 'first',
        method: 'GET',
        title: 'First page',
      });
    }

    // Previous page
    if (currentPage > 1) {
      queryParams.set('page', String(currentPage - 1));
      links.push({
        href: `${baseUrl}${currentPath}?${queryParams.toString()}`,
        rel: 'prev',
        method: 'GET',
        title: 'Previous page',
      });
    }

    // Next page
    if (currentPage < totalPages) {
      queryParams.set('page', String(currentPage + 1));
      links.push({
        href: `${baseUrl}${currentPath}?${queryParams.toString()}`,
        rel: 'next',
        method: 'GET',
        title: 'Next page',
      });
    }

    // Last page
    if (currentPage < totalPages) {
      queryParams.set('page', String(totalPages));
      links.push({
        href: `${baseUrl}${currentPath}?${queryParams.toString()}`,
        rel: 'last',
        method: 'GET',
        title: 'Last page',
      });
    }

    return links;
  }

  /**
   * Generate filter links
   */
  static generateFilterLinks(req: Request): HateoasLink[] {
    const baseUrl = this.getBaseUrl(req);
    const currentPath = req.path;
    const queryParams = new URLSearchParams(
      req.query as Record<string, string>
    );

    const links: HateoasLink[] = [];

    // Clear filters
    const clearParams = new URLSearchParams();
    clearParams.set('page', '1');
    links.push({
      href: `${baseUrl}${currentPath}?${clearParams.toString()}`,
      rel: 'clear-filters',
      method: 'GET',
      title: 'Clear all filters',
    });

    // Example filter links
    const departments = ['collector-office', 'revenue-department'];
    departments.forEach((dept) => {
      const deptParams = new URLSearchParams(
        req.query as Record<string, string>
      );
      deptParams.set('departments', dept);
      deptParams.set('page', '1');
      links.push({
        href: `${baseUrl}${currentPath}?${deptParams.toString()}`,
        rel: 'filter',
        method: 'GET',
        title: `Filter by department: ${dept}`,
      });
    });

    return links;
  }

  /**
   * Create HATEOAS response
   */
  static createResponse<T>(
    req: Request,
    data: T,
    currentPage?: number,
    totalPages?: number,
    limit?: number,
    filters?: any
  ): HateoasResponse<T> {
    const links = [
      ...this.generateStatisticsLinks(req),
      ...this.generateFilterLinks(req),
    ];

    if (currentPage && totalPages && limit) {
      links.push(
        ...this.generatePaginationLinks(req, currentPage, totalPages, limit)
      );
    }

    return {
      data,
      links,
      filters,
    };
  }
}
