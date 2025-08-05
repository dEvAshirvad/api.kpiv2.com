# KPI Seeder

This seeder allows you to seed KPI templates and entries from JSON files into the database.

## Overview

The KPI seeder reads data from two JSON files:

- `src/seeders/mongo/authv2.tbl_kpi_templates.json` - Contains KPI template definitions
- `src/seeders/mongo/authv2.tbl_kpi_entries.json` - Contains KPI entry data

## Usage

### Basic Commands

```bash
# Show help
npm run seed:kpi

# Seed all KPI data (templates + entries)
npm run seed:kpi seed

# Seed only KPI templates
npm run seed:kpi seed templates

# Seed only KPI entries
npm run seed:kpi seed entries

# Clear all KPI data
npm run seed:kpi clear

# Clear only KPI templates
npm run seed:kpi clear templates

# Clear only KPI entries
npm run seed:kpi clear entries

# Reset (clear + seed all data)
npm run seed:kpi reset

# Show statistics
npm run seed:kpi stats
```

### Command Reference

| Command | Subcommand  | Description                             |
| ------- | ----------- | --------------------------------------- |
| `seed`  | (none)      | Seed all KPI data (templates + entries) |
| `seed`  | `templates` | Seed only KPI templates                 |
| `seed`  | `entries`   | Seed only KPI entries                   |
| `clear` | (none)      | Clear all KPI data                      |
| `clear` | `templates` | Clear only KPI templates                |
| `clear` | `entries`   | Clear only KPI entries                  |
| `reset` | (none)      | Clear and seed all KPI data             |
| `stats` | (none)      | Show KPI data statistics                |

## Data Structure

### KPI Templates

The seeder expects KPI templates in the following format:

```json
{
  "_id": { "$oid": "template_id" },
  "name": "Template Name",
  "description": "Template Description",
  "departmentSlug": "department-slug",
  "role": "role-name",
  "frequency": "monthly",
  "template": [
    {
      "name": "KPI Name",
      "description": "KPI Description",
      "maxMarks": 10,
      "kpiType": "percentage",
      "kpiUnit": "%",
      "isDynamic": false,
      "scoringRules": [
        {
          "score": 10,
          "value": 100
        }
      ]
    }
  ],
  "createdBy": "user_id",
  "createdAt": { "$date": "2025-01-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T00:00:00.000Z" }
}
```

### KPI Entries

The seeder expects KPI entries in the following format:

```json
{
  "_id": { "$oid": "entry_id" },
  "month": 7,
  "year": 2025,
  "templateId": "template_id",
  "kpiRef": {
    "label": "area",
    "value": "raipur"
  },
  "values": [
    {
      "name": "KPI Name",
      "value": 95.33,
      "score": 9
    }
  ],
  "status": "generated",
  "totalScore": 90,
  "createdBy": "user_id",
  "createdFor": "member_id",
  "createdAt": { "$date": "2025-01-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T00:00:00.000Z" }
}
```

## Features

### Duplicate Prevention

The seeder checks for existing records before inserting new ones:

- For templates: Checks by `_id`
- For entries: Checks by `_id`

If a record already exists, it will be skipped and logged.

### Error Handling

- Comprehensive error logging for each operation
- Graceful handling of malformed JSON data
- Detailed statistics on seeded/skipped records

### Logging

The seeder provides detailed logging:

- ✅ Success messages for each seeded record
- ⏭️ Skip messages for existing records
- ❌ Error messages for failed operations
- 📊 Statistics summary

## Integration with Main Seeder

The KPI seeder is automatically discovered by the main seeder system and can be used with the general seeder commands:

```bash
# Seed all modules (including KPI)
npm run seed

# Seed only KPI module
npm run seed kpi_entry
```

## Database Models

The seeder works with the following models:

- `KpiTemplateModel` - For KPI template data
- `KpiEntryModel` - For KPI entry data

## File Locations

- **Seeder Class**: `src/modules/kpi_entry/kpi_entry.seeder.ts`
- **CLI Script**: `src/seeders/kpi-seeder.ts`
- **JSON Data**: `src/seeders/mongo/`
- **Documentation**: `src/seeders/KPI_SEEDER_README.md`

## Troubleshooting

### Common Issues

1. **File not found**: Ensure JSON files exist in `src/seeders/mongo/`
2. **Database connection**: Make sure MongoDB is running and accessible
3. **Permission errors**: Check file permissions for JSON files
4. **Schema validation**: Ensure JSON data matches expected schema

### Debug Mode

To see more detailed logging, you can modify the logger level in `src/configs/logger.ts`:

```typescript
categories: {
  default: {
    appenders: ['out', 'errorlogs', 'warnlogs', 'debuglogs', 'fatallogs', 'infologs'],
    level: 'debug', // Change to 'debug' for more verbose logging
  },
},
```

## Examples

### Complete Reset

```bash
# Clear all data and reseed
npm run seed:kpi reset
```

### Selective Seeding

```bash
# Only seed templates (useful for development)
npm run seed:kpi seed templates

# Only seed entries (after templates are seeded)
npm run seed:kpi seed entries
```

### Check Current State

```bash
# See what's in the database
npm run seed:kpi stats
```
