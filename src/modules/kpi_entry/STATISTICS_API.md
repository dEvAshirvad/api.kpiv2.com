# KPI Statistics API

This module provides comprehensive statistics and ranking endpoints for KPI performance analysis.

## API Endpoints

### 1. Employee Rankings

```
GET /api/v1/kpi-entries/statistics/rankings
```

**Query Parameters:**

- `month` (optional): Filter by month (1-12)
- `year` (optional): Filter by year
- `departments` (optional): Array of department slugs to include
- `roles` (optional): Array of role prefixes to include
- `excludeDepartments` (optional): Array of department slugs to exclude
- `excludeRoles` (optional): Array of role prefixes to exclude
- `limit` (optional): Number of results per page (default: 50)
- `page` (optional): Page number (default: 1)

**Default Filters:**

- `departments`: `['collector-office']`
- `roles`: `[]` (includes all roles starting with 'nodalOfficer')

**Response:**

```json
{
  "data": {
    "rankings": [
      {
        "employeeId": "string",
        "createdFor": "string",
        "departmentSlug": "string",
        "role": "string",
        "totalScore": 85,
        "maxPossibleScore": 100,
        "percentageScore": 85.0,
        "rank": 1,
        "kpiEntries": [
          {
            "templateId": "string",
            "templateName": "string",
            "totalScore": 85,
            "maxPossibleScore": 100,
            "percentageScore": 85.0,
            "status": "generated"
          }
        ]
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "message": "Employee rankings fetched successfully"
}
```

### 2. Department Statistics

```
GET /api/v1/kpi-entries/statistics/departments
```

**Query Parameters:** Same as rankings endpoint

**Response:**

```json
{
  "data": [
    {
      "departmentSlug": "collector-office",
      "totalEmployees": 25,
      "averageScore": 78.5,
      "rankings": [...], // All employees ranked from top to bottom
      "top5Percent": {
        "count": 1,
        "performers": [...],
        "cutoffScore": 85.5,
        "averageScore": 88.2
      },
      "bottom5Percent": {
        "count": 1,
        "performers": [...],
        "cutoffScore": 45.2,
        "averageScore": 42.1
      },
      "scoreDistribution": {
        "excellent": 5,   // 90-100%
        "good": 10,       // 70-89%
        "average": 8,     // 50-69%
        "poor": 2         // 0-49%
      },
      "roles": [
        {
          "role": "sdm",
          "totalEmployees": 15,
          "averageScore": 82.1,
          "rankings": [...], // All employees in this role ranked from top to bottom
          "top5Percent": {...},
          "bottom5Percent": {...},
          "scoreDistribution": {...}
        }
      ]
    }
  ],
  "message": "Department statistics fetched successfully"
}
```

### 3. Role Statistics

```
GET /api/v1/kpi-entries/statistics/roles
```

**Query Parameters:** Same as rankings endpoint

**Response:** Similar to department statistics but grouped by role

### 4. Overall Statistics

```
GET /api/v1/kpi-entries/statistics/overall
```

**Query Parameters:** Same as rankings endpoint

**Response:**

```json
{
  "data": {
    "overall": {
      "totalEmployees": 100,
      "averageScore": 75.2,
      "scoreDistribution": {
        "excellent": 15,
        "good": 35,
        "average": 40,
        "poor": 10
      },
      "rankings": [...], // All employees ranked from top to bottom
      "top5Percent": {
        "count": 5,
        "performers": [...],
        "cutoffScore": 85.5,
        "averageScore": 88.2
      },
      "bottom5Percent": {
        "count": 5,
        "performers": [...],
        "cutoffScore": 45.2,
        "averageScore": 42.1
      }
    },
    "departments": [
      {
        "departmentSlug": "revenue-department",
        "totalEmployees": 50,
        "averageScore": 78.5,
        "rankings": [...], // All employees in this department ranked from top to bottom
        "top5Percent": {...},
        "bottom5Percent": {...},
        "scoreDistribution": {...},
        "roles": [
          {
            "role": "sdm",
            "totalEmployees": 25,
            "averageScore": 82.1,
            "rankings": [...], // All employees in this role ranked from top to bottom
            "top5Percent": {...},
            "bottom5Percent": {...},
            "scoreDistribution": {...}
          }
        ]
      }
    ]
  },
  "message": "Overall statistics fetched successfully"
}
```

## Filtering Examples

### 1. Get rankings for specific departments

```
GET /api/v1/kpi-entries/statistics/rankings?departments=collector-office&departments=revenue-department
```

### 2. Exclude specific roles

```
GET /api/v1/kpi-entries/statistics/rankings?excludeRoles=admin&excludeRoles=supervisor
```

### 3. Filter by month and year

```
GET /api/v1/kpi-entries/statistics/rankings?month=7&year=2025
```

### 4. Get only nodal officers

```
GET /api/v1/kpi-entries/statistics/rankings?roles=nodalOfficer
```

### 5. Complex filtering

```
GET /api/v1/kpi-entries/statistics/rankings?departments=collector-office&roles=nodalOfficer&excludeRoles=admin&month=7&year=2025&limit=20&page=2
```

## Score Categories

- **Excellent**: 90-100%
- **Good**: 70-89%
- **Average**: 50-69%
- **Poor**: 0-49%

## Default Behavior

- **Default Department**: `collector-office`
- **Default Roles**: All roles starting with `nodalOfficer`
- **Default Pagination**: 50 items per page
- **Default Period**: All available data (no month/year filter)

## Performance Features

- **Pagination**: Large datasets are paginated
- **Flexible Filtering**: Include/exclude departments and roles
- **Score Calculation**: Automatic percentage calculation
- **Ranking**: Automatic ranking by performance
- **Top/Bottom Performers**: Top 5 and bottom 5 for each category
