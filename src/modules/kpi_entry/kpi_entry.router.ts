import { createRouter } from '@/configs/server.config';
import { KpiEntryHandler } from './kpi_entry.handler';
import { validateRequest } from '@/middlewares/zod-validate-request';
import z from 'zod';
import { KpiEntryStatisticsHandler } from './kpi_entry.statistics.handler';
import { MonthlyReportHandler } from './kpi_entry.monthly-report.handler';
import { KpiMigrationHandler } from './kpi_entry.migration.handler';

// Custom validation schema for KPI entry creation (without scores)
const zKpiEntryCreateWithoutScores = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  templateId: z.string().min(1),
  createdFor: z.string().min(1),
  values: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.union([z.number(), z.string()]),
      })
    )
    .optional(),
});

// Custom validation schema for KPI entry updates (without scores)
const zKpiEntryUpdateWithoutScores = zKpiEntryCreateWithoutScores
  .omit({
    createdFor: true,
    templateId: true,
    month: true,
    year: true,
  })
  .partial();

const router = createRouter();

// Create KPI entry
router.post(
  '/',
  validateRequest({ body: zKpiEntryCreateWithoutScores }),
  KpiEntryHandler.createKpiEntry
);

// Get all KPI entries with filters
router.get('/', KpiEntryHandler.getKpiEntries);

// Get specific KPI entry
router.get('/:id', KpiEntryHandler.getKpiEntry);

// Update KPI entry
router.put(
  '/:id',
  validateRequest({ body: zKpiEntryUpdateWithoutScores }),
  KpiEntryHandler.updateKpiEntry
);

// Update individual KPI values
router.patch(
  '/:id/values',
  validateRequest({
    body: z.object({
      values: z.array(
        z.object({
          name: z.string().min(1),
          value: z.union([z.number(), z.string()]),
        })
      ),
    }),
  }),
  KpiEntryHandler.updateKpiValues
);

// Update KPI entry status
router.patch(
  '/:id/status',
  validateRequest({
    body: z.object({
      status: z.enum(['created', 'initiated', 'generated']),
    }),
  }),
  KpiEntryHandler.updateKpiEntryStatus
);

// Delete KPI entry
router.delete('/:id', KpiEntryHandler.deleteKpiEntry);

// Get employee KPI entries
router.get('/employee/:createdFor', KpiEntryHandler.getEmployeeKpiEntries);

// Get KPI entries by status
router.get('/status/:status', KpiEntryHandler.getKpiEntriesByStatus);

// Bulk update status
router.patch(
  '/bulk/status',
  validateRequest({
    body: z.object({
      ids: z.array(z.string()),
      status: z.enum(['created', 'initiated', 'generated']),
    }),
  }),
  KpiEntryHandler.bulkUpdateStatus
);

// Statistics routes
// Get employee rankings
router.get(
  '/statistics/rankings',
  KpiEntryStatisticsHandler.getEmployeeRankings
);

// Get department statistics
router.get(
  '/statistics/departments',
  KpiEntryStatisticsHandler.getDepartmentStatistics
);

// Get role statistics
router.get('/statistics/roles', KpiEntryStatisticsHandler.getRoleStatistics);

// Get overall statistics
router.get(
  '/statistics/overall',
  KpiEntryStatisticsHandler.getOverallStatistics
);

// Get filter options
router.get(
  '/statistics/filter-options',
  KpiEntryStatisticsHandler.getFilterOptions
);

// Get top 5% performers
router.get(
  '/statistics/top-5-percent',
  KpiEntryStatisticsHandler.getTop5Percent
);

// Get bottom 5% performers
router.get(
  '/statistics/bottom-5-percent',
  KpiEntryStatisticsHandler.getBottom5Percent
);

// Generate monthly report
router.post(
  '/monthly-report/generate',
  validateRequest({
    body: z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2020).max(2030),
      department: z.string().optional(),
    }),
  }),
  MonthlyReportHandler.generateMonthlyReport
);

// Get monthly report summary
router.get(
  '/monthly-report/summary',
  MonthlyReportHandler.getMonthlyReportSummary
);

// Migration routes

// Migrate CSV data to KPI entries
router.post(
  '/migration/csv',
  validateRequest({
    body: z.object({
      csvContent: z.string().min(1),
      month: z.number().min(1).max(12),
      year: z.number().min(2020).max(2030),
      templateId: z.string().min(1),
      departmentSlug: z.string().min(1),
      role: z.string().min(1),
    }),
  }),
  KpiMigrationHandler.migrateCsvData
);

// Parse CSV data for preview
router.post(
  '/migration/parse-csv',
  validateRequest({
    body: z.object({
      csvContent: z.string().min(1),
      departmentSlug: z.string().min(1),
      role: z.string().min(1),
    }),
  }),
  KpiMigrationHandler.parseCsvData
);

// Debug CSV parsing
router.post(
  '/migration/debug-csv',
  validateRequest({
    body: z.object({
      csvContent: z.string().min(1),
    }),
  }),
  KpiMigrationHandler.debugCsvParsing
);

// Test member lookup by name
router.get('/migration/test-member', KpiMigrationHandler.testMemberLookup);

// Test header mapping for CSV parsing
router.post(
  '/migration/test-header-mapping',
  validateRequest({
    body: z.object({
      csvContent: z.string().min(1),
      departmentSlug: z.string().min(1),
      role: z.string().min(1),
    }),
  }),
  KpiMigrationHandler.testHeaderMapping
);

export default router;
