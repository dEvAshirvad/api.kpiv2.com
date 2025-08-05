#!/usr/bin/env node

import { MainSeeder } from './index';
import connectDB from '@/configs/db/mongodb';
import logger from '@/configs/logger';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const moduleName = args[1];

async function main() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected for seeding');

    switch (command) {
      case 'seed':
        if (moduleName) {
          await MainSeeder.seedModule(moduleName);
        } else {
          await MainSeeder.seedAll();
        }
        break;

      case 'clear':
        if (moduleName) {
          await MainSeeder.clearModule(moduleName);
        } else {
          await MainSeeder.clearAll();
        }
        break;

      case 'reset':
        if (moduleName) {
          await MainSeeder.resetModule(moduleName);
        } else {
          await MainSeeder.resetAll();
        }
        break;

      case 'list':
        const modules = await MainSeeder.getAvailableModules();
        console.log('📋 Available modules:');
        modules.forEach((module) => console.log(`  - ${module}`));
        break;

      case 'help':
      case '--help':
      case '-h':
        await showHelp();
        break;

      default:
        console.error(
          '❌ Invalid command. Use "help" to see available commands.'
        );
        process.exit(1);
    }

    logger.info('Seeding operation completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding operation failed:', error);
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

async function showHelp() {
  const modules = await MainSeeder.getAvailableModules();
  console.log(`
🌱 Database Seeder CLI

Usage: npm run seed [command] [module]

Commands:
  seed [module]     Seed all modules or specific module
  clear [module]    Clear all modules or specific module
  reset [module]    Reset all modules or specific module (clear + seed)
  list              Show available modules
  help              Show this help message

Examples:
  npm run seed seed              # Seed all modules
  npm run seed seed inventory    # Seed only inventory module
  npm run seed clear inventory   # Clear only inventory module
  npm run seed reset inventory   # Reset only inventory module
  npm run seed list             # Show available modules

Available modules: ${modules.join(', ')}
`);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Seeding interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Seeding terminated');
  process.exit(0);
});

// Run the CLI
main();
