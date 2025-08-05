# Database Seeder System

This directory contains the centralized database seeding system for all modules in the application.

## Structure

```
src/seeders/
├── index.ts          # Main seeder class that manages all modules
├── cli.ts           # CLI interface for seeding commands
├── template.ts      # Template for creating new module seeders
└── README.md        # This documentation
```

## Available Commands

### Basic Commands

```bash
# Seed all modules
npm run seed seed

# Seed specific module
npm run seed seed inventory

# Clear all modules
npm run seed clear

# Clear specific module
npm run seed clear inventory

# Reset all modules (clear + seed)
npm run seed reset

# Reset specific module (clear + seed)
npm run seed reset inventory

# List available modules
npm run seed list

# Show help
npm run seed help
```

### Environment-Specific Commands

```bash
# Development environment
npm run seed:dev seed

# Production environment
npm run seed:prod seed
```

## Adding New Modules

### 1. Create Module Seeder

Create a seeder file in your module directory following the template:

```typescript
// src/modules/your-module/your-module.seeder.ts
import { YourModel } from './your-module.model';
import { YourService } from './your-module.service';

export class YourModuleSeeder {
  static async seedInitialData() {
    try {
      await this.clear();

      const seedData = [
        // Your seed data here
      ];

      console.log('🌱 Starting your-module seeding...');

      for (const data of seedData) {
        try {
          const createdItem = await YourService.createItem(data);
          console.log(`✅ Created item: ${createdItem.name}`);
        } catch (error) {
          console.error(`❌ Failed to create item "${data.name}":`, error);
        }
      }

      console.log('🎉 Your-module seeding completed!');
    } catch (error) {
      console.error('❌ Your-module seeding failed:', error);
      throw error;
    }
  }

  static async clear() {
    try {
      console.log('🧹 Clearing all your-module data...');
      await YourModel.deleteMany({});
      console.log('✅ Your-module data cleared!');
    } catch (error) {
      console.error('❌ Failed to clear your-module data:', error);
      throw error;
    }
  }
}
```

### 2. Register Module in Main Seeder

Add your module to the main seeder in `src/seeders/index.ts`:

```typescript
import { YourModuleSeeder } from '@/modules/your-module/your-module.seeder';

export class MainSeeder {
  private static modules: SeederModule[] = [
    // ... existing modules
    {
      name: 'your-module',
      seed: YourModuleSeeder.seedInitialData,
      clear: YourModuleSeeder.clear,
    },
  ];
}
```

### 3. Test Your Module

```bash
# Test seeding
npm run seed seed your-module

# Test clearing
npm run seed clear your-module

# Test reset
npm run seed reset your-module
```

## Best Practices

### 1. Data Validation

- Always validate your seed data before inserting
- Use your service layer for creating items to ensure business logic is applied
- Handle errors gracefully and provide meaningful error messages

### 2. Idempotency

- Check for existing data before creating new items
- Use unique identifiers (slugs, IDs) to prevent duplicates
- Consider using upsert operations when appropriate

### 3. Environment Awareness

- Use different seed data for different environments
- Be careful with sensitive data in production
- Consider using environment variables for configuration

### 4. Performance

- Use bulk operations when possible
- Consider using transactions for related data
- Monitor seeding performance for large datasets

## Example Usage

### Development Setup

```bash
# Clear and seed all modules for fresh development environment
npm run seed reset

# Or seed only specific modules
npm run seed seed inventory
npm run seed seed users
```

### Production Setup

```bash
# Seed production data
npm run seed:prod seed

# Clear production data (use with caution!)
npm run seed:prod clear
```

### Testing

```bash
# Reset specific module for testing
npm run seed reset inventory
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure your database is running
   - Check your environment variables
   - Verify database credentials

2. **Module Not Found**
   - Check if the module is registered in `src/seeders/index.ts`
   - Verify the import path is correct
   - Ensure the seeder class exists

3. **Validation Errors**
   - Check your seed data against the model schema
   - Ensure required fields are provided
   - Verify data types match the schema

4. **Duplicate Key Errors**
   - Check for existing data before seeding
   - Use unique identifiers
   - Consider using upsert operations

### Debug Mode

For debugging, you can add more verbose logging:

```typescript
// In your seeder
console.log('Debug: Attempting to create item:', data);
```

## Contributing

When adding new modules:

1. Follow the template structure
2. Add proper error handling
3. Include meaningful console output
4. Test your seeder thoroughly
5. Update this documentation if needed
