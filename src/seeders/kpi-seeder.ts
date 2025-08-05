#!/usr/bin/env node

import { KpiEntrySeeder } from '../modules/kpi_entry/kpi_entry.seeder';
import connectDB from '@/configs/db/mongodb';
import logger from '@/configs/logger';

async function main() {
  const command = process.argv[2];
  const subCommand = process.argv[3];

  // Set timeout for the entire operation
  const timeout = setTimeout(() => {
    logger.error('❌ Seeder operation timed out after 30 seconds');
    process.exit(1);
  }, 30000);

  try {
    // Connect to database with timeout
    await Promise.race([
      connectDB(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Database connection timeout')),
          10000
        )
      ),
    ]);
    logger.info('Database connected for KPI seeding');

    switch (command) {
      case 'seed':
        if (subCommand === 'templates') {
          logger.info('🌱 Seeding KPI templates only...');
          await KpiEntrySeeder.seedKpiTemplates();
        } else if (subCommand === 'entries') {
          logger.info('🌱 Seeding KPI entries only...');
          await KpiEntrySeeder.seedKpiEntries();
        } else {
          logger.info('🌱 Seeding all KPI data...');
          await KpiEntrySeeder.seedKpiData();
        }
        break;

      case 'clear':
        if (subCommand === 'templates') {
          logger.info('🧹 Clearing KPI templates only...');
          await KpiEntrySeeder.clearKpiTemplates();
        } else if (subCommand === 'entries') {
          logger.info('🧹 Clearing KPI entries only...');
          await KpiEntrySeeder.clearKpiEntries();
        } else {
          logger.info('🧹 Clearing all KPI data...');
          await KpiEntrySeeder.clearKpiData();
        }
        break;

      case 'reset':
        logger.info('🔄 Resetting KPI data (clear + seed)...');
        await KpiEntrySeeder.clearKpiData();
        await KpiEntrySeeder.seedKpiData();
        break;

      case 'stats':
        const stats = await KpiEntrySeeder.getSeedingStats();
        logger.info('📊 KPI Data Statistics:');
        logger.info(`   Templates: ${stats.templates}`);
        logger.info(`   Entries: ${stats.entries}`);
        logger.info(`   Total: ${stats.total}`);
        break;

      default:
        console.log(`
🌱 KPI Seeder CLI

Usage:
  npm run seed:kpi [command] [subcommand]

Commands:
  seed [templates|entries]  - Seed KPI data
    templates               - Seed only KPI templates
    entries                 - Seed only KPI entries
    (no subcommand)         - Seed all KPI data

  clear [templates|entries] - Clear KPI data
    templates               - Clear only KPI templates
    entries                 - Clear only KPI entries
    (no subcommand)         - Clear all KPI data

  reset                     - Clear and seed all KPI data
  stats                     - Show KPI data statistics

Examples:
  npm run seed:kpi seed
  npm run seed:kpi seed templates
  npm run seed:kpi clear entries
  npm run seed:kpi reset
  npm run seed:kpi stats
        `);
        break;
    }

    // Clear timeout on success
    clearTimeout(timeout);
    logger.info('✅ Seeder operation completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeder command failed:', error);
    clearTimeout(timeout);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('👋 Seeder interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Seeder terminated');
  process.exit(0);
});

// Run the CLI
main();
