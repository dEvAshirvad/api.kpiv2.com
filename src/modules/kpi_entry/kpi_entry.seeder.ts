import fs from 'fs/promises';
import path from 'path';
import { KpiEntryModel } from './kpi_entry.model';
import { KpiTemplateModel } from '../kpi_template/kpi_template.model';
import logger from '@/configs/logger';

export class KpiEntrySeeder {
  /**
   * Seed KPI templates and entries from JSON files
   */
  static async seedKpiData() {
    try {
      logger.info('🌱 Starting KPI data seeding...');

      // Set timeout for the entire seeding operation
      const seedingPromise = Promise.all([
        this.seedKpiTemplates(),
        this.seedKpiEntries(),
      ]);

      await Promise.race([
        seedingPromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Seeding operation timed out')),
            60000
          )
        ),
      ]);

      logger.info('✅ KPI data seeding completed successfully!');
    } catch (error) {
      logger.error('❌ KPI data seeding failed:', error);
      throw error;
    }
  }

  /**
   * Seed KPI templates from JSON file
   */
  static async seedKpiTemplates() {
    try {
      logger.info('📋 Seeding KPI templates...');

      const templatesPath = path.join(
        process.cwd(),
        'src',
        'seeders',
        'mongo',
        'authv2.tbl_kpi_templates.json'
      );

      const templatesData = await fs.readFile(templatesPath, 'utf-8');
      const templates = JSON.parse(templatesData);

      // Get existing template IDs for faster lookup
      const existingTemplateIds = await KpiTemplateModel.find({}, { _id: 1 })
        .lean()
        .maxTimeMS(5000);
      const existingIds = new Set(
        existingTemplateIds.map((t: any) => t._id.toString())
      );

      let seededCount = 0;
      let skippedCount = 0;

      // Process templates in batches
      const batchSize = 10;
      for (let i = 0; i < templates.length; i += batchSize) {
        const batch = templates.slice(i, i + batchSize);
        const batchPromises = batch.map(async (template: any) => {
          try {
            if (existingIds.has(template._id.$oid)) {
              logger.debug(
                `⏭️  Template ${template.name} already exists, skipping...`
              );
              skippedCount++;
              return;
            }

            // Transform the template data to match our schema
            const templateData = {
              _id: template._id.$oid,
              name: template.name,
              description: template.description,
              departmentSlug: template.departmentSlug,
              role: template.role,
              frequency: template.frequency,
              template: template.template.map((item: any) => ({
                name: item.name,
                description: item.description,
                maxMarks: item.maxMarks,
                kpiType: item.kpiType,
                kpiUnit: item.kpiUnit,
                isDynamic: item.isDynamic,
                scoringRules: item.scoringRules,
              })),
              createdBy: template.createdBy,
              createdAt: new Date(template.createdAt.$date),
              updatedAt: new Date(template.updatedAt.$date),
            };

            await KpiTemplateModel.create(templateData);
            logger.debug(`✅ Seeded template: ${template.name}`);
            seededCount++;
          } catch (error) {
            logger.error(`❌ Failed to seed template ${template.name}:`, error);
            throw error;
          }
        });

        await Promise.all(batchPromises);
        logger.info(
          `📋 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(templates.length / batchSize)}`
        );
      }

      logger.info(
        `📋 KPI Templates seeding completed: ${seededCount} seeded, ${skippedCount} skipped`
      );
    } catch (error) {
      logger.error('❌ KPI templates seeding failed:', error);
      throw error;
    }
  }

  /**
   * Seed KPI entries from JSON file
   */
  static async seedKpiEntries() {
    try {
      logger.info('📊 Seeding KPI entries...');

      const entriesPath = path.join(
        process.cwd(),
        'src',
        'seeders',
        'mongo',
        'authv2.tbl_kpi_entries.json'
      );

      const entriesData = await fs.readFile(entriesPath, 'utf-8');
      const entries = JSON.parse(entriesData);

      // Get existing entry IDs for faster lookup
      const existingEntryIds = await KpiEntryModel.find({}, { _id: 1 })
        .lean()
        .maxTimeMS(5000);
      const existingIds = new Set(
        existingEntryIds.map((e: any) => e._id.toString())
      );

      let seededCount = 0;
      let skippedCount = 0;

      // Process entries in batches
      const batchSize = 20;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const batchPromises = batch.map(async (entry: any) => {
          try {
            if (existingIds.has(entry._id.$oid)) {
              logger.debug(
                `⏭️  Entry ${entry._id.$oid} already exists, skipping...`
              );
              skippedCount++;
              return;
            }

            // Transform the entry data to match our schema
            const entryData = {
              _id: entry._id.$oid,
              month: entry.month,
              year: entry.year,
              templateId: entry.templateId,
              kpiRef: {
                label: entry.kpiRef.label,
                value: entry.kpiRef.value,
              },
              values: entry.values.map((value: any) => ({
                name: value.name,
                value: value.value,
                score: value.score,
              })),
              status: entry.status,
              totalScore: entry.totalScore,
              createdBy: entry.createdBy,
              createdFor: entry.createdFor,
              createdAt: new Date(entry.createdAt.$date),
              updatedAt: new Date(entry.updatedAt.$date),
            };

            await KpiEntryModel.create(entryData);
            logger.debug(`✅ Seeded entry: ${entry._id.$oid}`);
            seededCount++;
          } catch (error) {
            logger.error(`❌ Failed to seed entry ${entry._id.$oid}:`, error);
            throw error;
          }
        });

        await Promise.all(batchPromises);
        logger.info(
          `📊 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`
        );
      }

      logger.info(
        `📊 KPI Entries seeding completed: ${seededCount} seeded, ${skippedCount} skipped`
      );
    } catch (error) {
      logger.error('❌ KPI entries seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clear all KPI templates and entries
   */
  static async clearKpiData() {
    try {
      logger.info('🧹 Clearing KPI data...');

      // Clear KPI entries first (due to foreign key constraints)
      const deletedEntries = await KpiEntryModel.deleteMany({});
      logger.info(`🗑️  Deleted ${deletedEntries.deletedCount} KPI entries`);

      // Clear KPI templates
      const deletedTemplates = await KpiTemplateModel.deleteMany({});
      logger.info(`🗑️  Deleted ${deletedTemplates.deletedCount} KPI templates`);

      logger.info('✅ KPI data cleared successfully!');
    } catch (error) {
      logger.error('❌ KPI data clearing failed:', error);
      throw error;
    }
  }

  /**
   * Clear only KPI entries
   */
  static async clearKpiEntries() {
    try {
      logger.info('🧹 Clearing KPI entries...');

      const deletedEntries = await KpiEntryModel.deleteMany({});
      logger.info(`🗑️  Deleted ${deletedEntries.deletedCount} KPI entries`);

      logger.info('✅ KPI entries cleared successfully!');
    } catch (error) {
      logger.error('❌ KPI entries clearing failed:', error);
      throw error;
    }
  }

  /**
   * Clear only KPI templates
   */
  static async clearKpiTemplates() {
    try {
      logger.info('🧹 Clearing KPI templates...');

      const deletedTemplates = await KpiTemplateModel.deleteMany({});
      logger.info(`🗑️  Deleted ${deletedTemplates.deletedCount} KPI templates`);

      logger.info('✅ KPI templates cleared successfully!');
    } catch (error) {
      logger.error('❌ KPI templates clearing failed:', error);
      throw error;
    }
  }

  /**
   * Get statistics about seeded data
   */
  static async getSeedingStats() {
    try {
      const templatesCount =
        await KpiTemplateModel.countDocuments().maxTimeMS(3000);
      const entriesCount = await KpiEntryModel.countDocuments().maxTimeMS(3000);

      return {
        templates: templatesCount,
        entries: entriesCount,
        total: templatesCount + entriesCount,
      };
    } catch (error) {
      logger.error('❌ Failed to get seeding stats:', error);
      throw error;
    }
  }
}
