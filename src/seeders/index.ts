import fs from 'fs/promises';
import path from 'path';

export interface SeederModule {
  name: string;
  seed: () => Promise<void>;
  clear: () => Promise<void>;
}

interface SeederClass {
  [key: string]: any;
  clear: () => Promise<void>;
}

export class MainSeeder {
  private static modules: SeederModule[] = [];

  /**
   * Dynamically discover and load all seeder modules
   */
  static async discoverModules(): Promise<SeederModule[]> {
    if (this.modules.length > 0) {
      return this.modules;
    }

    try {
      const modulesPath = path.join(process.cwd(), 'src', 'modules');
      const moduleDirs = await fs.readdir(modulesPath, { withFileTypes: true });

      const discoveredModules: SeederModule[] = [];

      for (const dir of moduleDirs) {
        if (!dir.isDirectory()) continue;

        const moduleName = dir.name;
        const seederPath = path.join(
          modulesPath,
          moduleName,
          `${moduleName}.seeder.ts`
        );

        // Check if seeder file exists
        if (await this.fileExists(seederPath)) {
          try {
            // Dynamic import of the seeder module
            const seederModule = await import(
              `@/modules/${moduleName}/${moduleName}.seeder`
            );
            const seederClass = Object.values(seederModule)[0] as any; // Get the first exported class

            if (seederClass && typeof seederClass === 'function') {
              // For static methods, check the class itself
              const seedMethod = Object.getOwnPropertyNames(seederClass).find(
                (prop) =>
                  typeof seederClass[prop] === 'function' &&
                  prop !== 'clear' &&
                  prop.startsWith('seed')
              );

              // Check if the seeder class has the required methods
              if (seedMethod && typeof seederClass.clear === 'function') {
                discoveredModules.push({
                  name: moduleName,
                  seed: seederClass[seedMethod].bind(seederClass),
                  clear: seederClass.clear.bind(seederClass),
                });

                console.log(`✅ Discovered seeder for module: ${moduleName}`);
              } else {
                console.warn(
                  `⚠️  Seeder for module "${moduleName}" missing required methods (seed method starting with 'seed' and clear method)`
                );
              }
            } else {
              console.warn(
                `⚠️  Invalid seeder class found in module "${moduleName}"`
              );
            }
          } catch (error) {
            console.warn(
              `⚠️  Failed to load seeder for module "${moduleName}":`,
              error
            );
          }
        } else {
          console.log(`ℹ️  No seeder found for module: ${moduleName}`);
        }
      }

      this.modules = discoveredModules;
      return discoveredModules;
    } catch (error) {
      console.error('❌ Failed to discover modules:', error);
      return [];
    }
  }

  /**
   * Check if a file exists
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Seed all modules
   */
  static async seedAll() {
    const modules = await this.discoverModules();
    console.log('🚀 Starting seeding for all modules...\n');

    for (const module of modules) {
      try {
        console.log(`🌱 Seeding ${module.name}...`);
        await module.seed();
        console.log(`✅ ${module.name} seeding completed!\n`);
      } catch (error) {
        console.error(`❌ ${module.name} seeding failed:`, error);
        throw error;
      }
    }

    console.log('🎉 All modules seeded successfully!');
  }

  /**
   * Seed specific module
   */
  static async seedModule(moduleName: string) {
    const modules = await this.discoverModules();
    const module = modules.find((m) => m.name === moduleName);

    if (!module) {
      throw new Error(
        `Module "${moduleName}" not found. Available modules: ${modules.map((m) => m.name).join(', ')}`
      );
    }

    console.log(`🌱 Seeding ${module.name}...`);
    await module.seed();
    console.log(`✅ ${module.name} seeding completed!`);
  }

  /**
   * Clear all modules
   */
  static async clearAll() {
    const modules = await this.discoverModules();
    console.log('🧹 Clearing all modules...\n');

    for (const module of modules) {
      try {
        console.log(`🧹 Clearing ${module.name}...`);
        await module.clear();
        console.log(`✅ ${module.name} cleared!\n`);
      } catch (error) {
        console.error(`❌ ${module.name} clearing failed:`, error);
        throw error;
      }
    }

    console.log('🎉 All modules cleared successfully!');
  }

  /**
   * Clear specific module
   */
  static async clearModule(moduleName: string) {
    const modules = await this.discoverModules();
    const module = modules.find((m) => m.name === moduleName);

    if (!module) {
      throw new Error(
        `Module "${moduleName}" not found. Available modules: ${modules.map((m) => m.name).join(', ')}`
      );
    }

    console.log(`🧹 Clearing ${module.name}...`);
    await module.clear();
    console.log(`✅ ${module.name} cleared!`);
  }

  /**
   * Get list of available modules
   */
  static async getAvailableModules(): Promise<string[]> {
    const modules = await this.discoverModules();
    return modules.map((m) => m.name);
  }

  /**
   * Reset all modules (clear + seed)
   */
  static async resetAll() {
    console.log('🔄 Resetting all modules...\n');
    await this.clearAll();
    console.log('\n');
    await this.seedAll();
  }

  /**
   * Reset specific module (clear + seed)
   */
  static async resetModule(moduleName: string) {
    const modules = await this.discoverModules();
    const module = modules.find((m) => m.name === moduleName);

    if (!module) {
      throw new Error(
        `Module "${moduleName}" not found. Available modules: ${modules.map((m) => m.name).join(', ')}`
      );
    }

    console.log(`🔄 Resetting ${module.name}...`);
    await module.clear();
    await module.seed();
    console.log(`✅ ${module.name} reset completed!`);
  }
}
