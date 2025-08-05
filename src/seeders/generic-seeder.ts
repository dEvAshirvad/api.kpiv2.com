#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import connectDB from '@/configs/db/mongodb';
import logger from '@/configs/logger';
import { model, Schema } from 'mongoose';

// Generic model creator
function createGenericModel(collectionName: string) {
  const genericSchema = new Schema(
    {},
    {
      strict: false,
      timestamps: true,
    }
  );
  return model(collectionName, genericSchema);
}

export class GenericSeeder {
  /**
   * Seed data from JSON file to any collection
   */
  static async seedCollection(collectionName: string, jsonFileName: string) {
    try {
      logger.info(`🌱 Starting ${collectionName} seeding...`);

      const jsonPath = path.join(
        process.cwd(),
        'src',
        'seeders',
        'mongo',
        jsonFileName
      );

      const data = await fs.readFile(jsonPath, 'utf-8');
      const records = JSON.parse(data);

      const Model = createGenericModel(collectionName);

      // Get existing IDs for faster lookup
      const existingIds = await Model.find({}, { _id: 1 })
        .lean()
        .maxTimeMS(5000);
      const existingIdSet = new Set(
        existingIds.map((r: any) => r._id.toString())
      );

      let seededCount = 0;
      let skippedCount = 0;

      // Process records in batches
      const batchSize = 20;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const batchPromises = batch.map(async (record: any) => {
          try {
            if (existingIdSet.has(record._id.$oid)) {
              logger.debug(
                `⏭️  Record ${record._id.$oid} already exists, skipping...`
              );
              skippedCount++;
              return;
            }

            // Transform the record data
            const recordData = {
              ...record,
              _id: record._id.$oid, // Ensure _id is properly set
              createdAt: record.createdAt?.$date
                ? new Date(record.createdAt.$date)
                : new Date(),
              updatedAt: record.updatedAt?.$date
                ? new Date(record.updatedAt.$date)
                : new Date(),
            };

            // Remove the original _id object
            delete recordData._id;

            await Model.create(recordData);
            logger.debug(`✅ Seeded record: ${record._id.$oid}`);
            seededCount++;
          } catch (error) {
            logger.error(`❌ Failed to seed record ${record._id.$oid}:`, error);
            throw error;
          }
        });

        await Promise.all(batchPromises);
        logger.info(
          `📊 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`
        );
      }

      logger.info(
        `✅ ${collectionName} seeding completed: ${seededCount} seeded, ${skippedCount} skipped`
      );
    } catch (error) {
      logger.error(`❌ ${collectionName} seeding failed:`, error);
      throw error;
    }
  }

  /**
   * Clear all data from a collection
   */
  static async clearCollection(collectionName: string) {
    try {
      logger.info(`🧹 Clearing ${collectionName}...`);

      const Model = createGenericModel(collectionName);
      const deletedCount = await Model.deleteMany({}).maxTimeMS(5000);

      logger.info(
        `🗑️  Deleted ${deletedCount.deletedCount} records from ${collectionName}`
      );
      logger.info(`✅ ${collectionName} cleared successfully!`);
    } catch (error) {
      logger.error(`❌ ${collectionName} clearing failed:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about a collection
   */
  static async getCollectionStats(collectionName: string) {
    try {
      const Model = createGenericModel(collectionName);
      const count = await Model.countDocuments().maxTimeMS(3000);
      return count;
    } catch (error) {
      logger.error(`❌ Failed to get ${collectionName} stats:`, error);
      throw error;
    }
  }
}

async function main() {
  const command = process.argv[2];
  const collectionName = process.argv[3];
  const jsonFileName = process.argv[4];

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
    logger.info('Database connected for generic seeding');

    switch (command) {
      case 'seed':
        if (!collectionName || !jsonFileName) {
          logger.error('❌ Missing collection name or JSON file name');
          logger.info(
            'Usage: npm run seed:generic seed <collection_name> <json_file_name>'
          );
          process.exit(1);
        }
        await GenericSeeder.seedCollection(collectionName, jsonFileName);
        break;

      case 'clear':
        if (!collectionName) {
          logger.error('❌ Missing collection name');
          logger.info('Usage: npm run seed:generic clear <collection_name>');
          process.exit(1);
        }
        await GenericSeeder.clearCollection(collectionName);
        break;

      case 'stats':
        if (!collectionName) {
          logger.error('❌ Missing collection name');
          logger.info('Usage: npm run seed:generic stats <collection_name>');
          process.exit(1);
        }
        const count = await GenericSeeder.getCollectionStats(collectionName);
        logger.info(`📊 ${collectionName} Statistics:`);
        logger.info(`   Total Records: ${count}`);
        break;

      default:
        console.log(`
🌱 Generic Seeder CLI

Usage:
  npm run seed:generic [command] [collection_name] [json_file_name]

Commands:
  seed <collection> <json_file>  - Seed data from JSON file to collection
  clear <collection>              - Clear all data from collection
  stats <collection>              - Show collection statistics

Examples:
  npm run seed:generic seed users authv2.tbl_users.json
  npm run seed:generic seed accounts authv2.tbl_accounts.json
  npm run seed:generic seed sessions authv2.tbl_sessions.json
  npm run seed:generic seed departments authv2.tbl_departments.json
  npm run seed:generic seed members authv2.tbl_members.json
  npm run seed:generic clear users
  npm run seed:generic stats users

Available collections:
  - users
  - accounts  
  - sessions
  - departments
  - members
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
