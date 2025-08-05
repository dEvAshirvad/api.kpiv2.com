import axios from 'axios';
import logger from '@/configs/logger';
import env from '@/configs/env';

export interface Department {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  _id: string;
  userId: string;
  departmentSlug: string;
  role: string;
  metadata?: {
    kpiRef?: Array<{ label: string; value: string }>;
  };
  createdAt: string;
  updatedAt: string;
  user: {
    _id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    role: string;
  };
}

export interface ExternalDataResponse<T> {
  docs: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  message: string;
  success: boolean;
  status: number;
  timestamp: string;
  cache: boolean;
}

export class ExternalDataService {
  private static authUrl = env.AUTH_URL;

  /**
   * Fetch all departments from auth service
   */
  static async getDepartments(): Promise<Department[]> {
    try {
      const response = await axios.get<ExternalDataResponse<Department>>(
        `${this.authUrl}/api/v1/departments`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        return response.data.docs;
      } else {
        logger.error('Failed to fetch departments:', response.data.message);
        return [];
      }
    } catch (error) {
      logger.error('Error fetching departments:', error);
      return [];
    }
  }

  /**
   * Fetch all members from auth service
   */
  static async getMembers(): Promise<Member[]> {
    try {
      const response = await axios.get<ExternalDataResponse<Member>>(
        `${this.authUrl}/api/v1/members`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        return response.data.docs;
      } else {
        logger.error('Failed to fetch members:', response.data.message);
        return [];
      }
    } catch (error) {
      logger.error('Error fetching members:', error);
      return [];
    }
  }

  /**
   * Get unique roles from members
   */
  static async getUniqueRoles(): Promise<string[]> {
    try {
      const members = await this.getMembers();
      const roles = members.map((member) => member.role);
      return [...new Set(roles)].sort();
    } catch (error) {
      logger.error('Error getting unique roles:', error);
      return [];
    }
  }

  /**
   * Get filter options for statistics
   */
  static async getFilterOptions() {
    try {
      const [departments, members, roles] = await Promise.all([
        this.getDepartments(),
        this.getMembers(),
        this.getUniqueRoles(),
      ]);

      // Get department slugs as array of strings
      const departmentSlugs = departments.map((dept) => dept.slug);

      // Get roles excluding defaults (nodalOfficer roles)
      const nonDefaultRoles = roles.filter(
        (role) => !role.startsWith('nodalOfficer')
      );

      return {
        departments: departmentSlugs, // Array of department slugs
        roles: nonDefaultRoles, // Array of roles excluding defaults
      };
    } catch (error) {
      logger.error('Error getting filter options:', error);
      return {
        departments: [],
        roles: [],
      };
    }
  }
}
