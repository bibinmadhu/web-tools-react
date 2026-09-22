// ============================================================================
// Database Category Matcher Utility Module
// Provides rule parsing, PostgreSQL SQL query generation, pg8000 Python script
// generation, in-memory validation simulation, and import/export capabilities.
// ============================================================================

export type MetricType = 'integer' | 'bigint' | 'numeric' | 'text' | 'date';
export type RuleOperator = '<=' | '<' | '>=' | '>' | '=' | '!=' | 'BETWEEN';
export type RuleLogicType = 'sme_compound' | 'all_and' | 'any_or';

export interface MetricColumnConfig {
  id: string;
  key: string;            // unique identifier matching criteria keys, e.g. "emp", "turnover", "balance"
  name: string;           // column name in target table, e.g. "no_of_employees"
  label: string;          // human-readable label, e.g. "No of Employees"
  type: MetricType;       // data type for SQL casting and formatting
  group: 'primary' | 'secondary'; // for SME compound: primary = AND, secondary = OR group
}

export interface CategoryCriterion {
  columnKey: string;
  operator: RuleOperator;
  value: string;
  secondaryValue?: string; // used for BETWEEN
  enabled: boolean;
}

export interface CategoryRule {
  id: string | number;
  categoryName: string;
  priority: number;        // 1 = evaluated first
  description?: string;
  criteria: Record<string, CategoryCriterion>; // columnKey -> criterion
}

export interface TargetTableConfig {
  tableName: string;
  tableAlias: string;
  idColumn: string;
  nameColumn?: string;
  categoryColumn?: string;     // existing recorded category in target table (for discrepancy checking)
  newCategoryColumn?: string;  // target column for UPDATE queries, defaults to categoryColumn
}

export interface RuleLogicConfig {
  type: RuleLogicType;
  primaryGroupOperator: 'AND' | 'OR';
  secondaryGroupOperator: 'OR' | 'AND';
  fallbackCategory: string;   // e.g. "Large Enterprise" or "Unclassified"
  treatBlankAs: 'unbounded';  // blank threshold = no restriction on that metric
}

export interface Pg8000ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  useEnvVars: boolean;
  ssl: boolean;
  schema: string;
}

export interface CategoryMatcherConfig {
  version: string;
  metadata: {
    name: string;
    description: string;
    createdAt?: string;
    updatedAt?: string;
  };
  targetTable: TargetTableConfig;
  metricColumns: MetricColumnConfig[];
  categories: CategoryRule[];
  ruleLogic: RuleLogicConfig;
  pgConnection: Pg8000ConnectionConfig;
}

export interface TestSampleRow {
  id: string;
  name?: string;
  recordedCategory?: string;
  metrics: Record<string, string | number>;
}

export interface RowValidationResult {
  id: string;
  name?: string;
  recordedCategory?: string;
  expectedCategory: string;
  matchedRuleId?: string | number;
  status: 'MATCH' | 'MISMATCH' | 'UNCLASSIFIED';
  reason: string;
  triggeredConditionText: string;
  metrics: Record<string, string | number>;
}

// ==========================================
// Default SME Configuration (User's Exact Specification)
// ==========================================
export const DEFAULT_SME_METRIC_COLUMNS: MetricColumnConfig[] = [
  {
    id: 'col-emp',
    key: 'no_of_employees',
    name: 'no_of_employees',
    label: 'No of Employees',
    type: 'integer',
    group: 'primary',
  },
  {
    id: 'col-turnover',
    key: 'annual_turnover',
    name: 'annual_turnover',
    label: 'Annual Turnover',
    type: 'numeric',
    group: 'secondary',
  },
  {
    id: 'col-balance',
    key: 'balance_sheet',
    name: 'balance_sheet',
    label: 'Balance Sheet',
    type: 'numeric',
    group: 'secondary',
  },
];

export const DEFAULT_SME_CATEGORIES: CategoryRule[] = [
  {
    id: 1,
    categoryName: 'Micro SME',
    priority: 1,
    description: 'Employees <= 9 and (Turnover <= 2M or Balance Sheet <= 2M)',
    criteria: {
      no_of_employees: {
        columnKey: 'no_of_employees',
        operator: '<=',
        value: '9',
        enabled: true,
      },
      annual_turnover: {
        columnKey: 'annual_turnover',
        operator: '<=',
        value: '2000000',
        enabled: true,
      },
      balance_sheet: {
        columnKey: 'balance_sheet',
        operator: '<=',
        value: '2000000',
        enabled: true,
      },
    },
  },
  {
    id: 2,
    categoryName: 'SME',
    priority: 2,
    description: 'Employees <= 249 and (Turnover <= 50M or Balance Sheet <= 43M)',
    criteria: {
      no_of_employees: {
        columnKey: 'no_of_employees',
        operator: '<=',
        value: '249',
        enabled: true,
      },
      annual_turnover: {
        columnKey: 'annual_turnover',
        operator: '<=',
        value: '50000000',
        enabled: true,
      },
      balance_sheet: {
        columnKey: 'balance_sheet',
        operator: '<=',
        value: '43000000',
        enabled: true,
      },
    },
  },
  {
    id: 3,
    categoryName: 'Small Midcap',
    priority: 3,
    description: 'Employees <= 499 (Turnover and Balance Sheet unconstrained)',
    criteria: {
      no_of_employees: {
        columnKey: 'no_of_employees',
        operator: '<=',
        value: '499',
        enabled: true,
      },
      annual_turnover: {
        columnKey: 'annual_turnover',
        operator: '<=',
        value: '',
        enabled: false,
      },
      balance_sheet: {
        columnKey: 'balance_sheet',
        operator: '<=',
        value: '',
        enabled: false,
      },
    },
  },
];

export const DEFAULT_MATCHER_CONFIG: CategoryMatcherConfig = {
  version: '1.0.0',
  metadata: {
    name: 'EU/UK SME Business Classification & Validation',
    description:
      'Categorizes business entities as Micro SME, SME, or Small Midcap based on employee headcount and financial turnover/balance thresholds with automated discrepancy detection.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  targetTable: {
    tableName: 'business_entities',
    tableAlias: 'b',
    idColumn: 'id',
    nameColumn: 'business_name',
    categoryColumn: 'current_category',
    newCategoryColumn: 'current_category',
  },
  metricColumns: DEFAULT_SME_METRIC_COLUMNS,
  categories: DEFAULT_SME_CATEGORIES,
  ruleLogic: {
    type: 'sme_compound',
    primaryGroupOperator: 'AND',
    secondaryGroupOperator: 'OR',
    fallbackCategory: 'Large Enterprise',
    treatBlankAs: 'unbounded',
  },
  pgConnection: {
    host: 'localhost',
    port: 5432,
    database: 'production_db',
    user: 'postgres',
    password: '',
    useEnvVars: true,
    ssl: false,
    schema: 'public',
  },
};

// ==========================================
// Sample Target Table Data for Testing & Simulation
// ==========================================
export const DEFAULT_SAMPLE_ROWS: TestSampleRow[] = [
  {
    id: '101',
    name: 'Apex Artisan Bakery Ltd',
    recordedCategory: 'Micro SME',
    metrics: {
      no_of_employees: 6,
      annual_turnover: 1200000,
      balance_sheet: 950000,
    },
  },
  {
    id: '102',
    name: 'Beacon Cloud Solutions',
    recordedCategory: 'SME', // Mismatch! Should be Micro SME (8 employees <= 9 and turnover 1.8M <= 2M)
    metrics: {
      no_of_employees: 8,
      annual_turnover: 1800000,
      balance_sheet: 1600000,
    },
  },
  {
    id: '103',
    name: 'Crestline Precision Tools',
    recordedCategory: 'SME',
    metrics: {
      no_of_employees: 145,
      annual_turnover: 28000000,
      balance_sheet: 22000000,
    },
  },
  {
    id: '104',
    name: 'Delta Logistics Global',
    recordedCategory: 'Small Midcap', // Mismatch! Has 320 employees <= 499, but turnover 52M exceeds SME turnover limit 50M yet balance 41M <= 43M so it is actually SME!
    metrics: {
      no_of_employees: 190,
      annual_turnover: 52000000,
      balance_sheet: 41000000, // <= 43M makes it SME!
    },
  },
  {
    id: '105',
    name: 'Epsilon Advanced BioTech',
    recordedCategory: 'Small Midcap',
    metrics: {
      no_of_employees: 380,
      annual_turnover: 85000000,
      balance_sheet: 72000000,
    },
  },
  {
    id: '106',
    name: 'Titanium Aerospace Group',
    recordedCategory: 'Small Midcap', // Mismatch! 620 employees > 499, should be Large Enterprise
    metrics: {
      no_of_employees: 620,
      annual_turnover: 240000000,
      balance_sheet: 190000000,
    },
  },
  {
    id: '107',
    name: 'Zenith Micro Robotics',
    recordedCategory: 'Micro SME',
    metrics: {
      no_of_employees: 9,
      annual_turnover: 3500000, // > 2M, but balance sheet 1.9M <= 2M fulfills the OR condition!
      balance_sheet: 1900000,
    },
  },
  {
    id: '108',
    name: 'Vanguard Industrial Holdings',
    recordedCategory: '', // Unassigned in DB
    metrics: {
      no_of_employees: 1200,
      annual_turnover: 650000000,
      balance_sheet: 480000000,
    },
  },
];

// ==========================================
// Parsing Raw Category Metadata (TSV, CSV, Space, Text)
// ==========================================

/**
 * Parses user-pasted category metadata text into structured MetricColumns and CategoryRules.
 * Handles the user's sample data format:
 *   1	"Micro SME"	9	2000000	2000000
 *   2	"SME"	249	50000000	43000000
 *   3	"Small Midcap"	499
 * Or with headers.
 */
export function parseCategoryMetadataInput(
  rawText: string,
  existingColumns?: MetricColumnConfig[]
): {
  columns: MetricColumnConfig[];
  categories: CategoryRule[];
  detectedDelimiter: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('Input text is empty. Please provide category metadata.');
  }

  // Detect delimiter: tab, comma, semicolon, pipe, or multiple whitespace
  const firstLine = lines[0];
  let delimiter = '\t';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  } else if (firstLine.includes(';')) {
    delimiter = ';';
  } else if (firstLine.includes('|')) {
    delimiter = '|';
  } else {
    delimiter = /\s{2,}|\t/.source; // fallback multiple spaces
  }

  // Helper to split a line safely respecting quotes
  const splitLine = (line: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((token) => cleanToken(token));
    }
    if (delimiter === ',') {
      // standard CSV regex
      const matches: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          matches.push(cleanToken(current));
          current = '';
          continue;
        }
        current += char;
      }
      matches.push(cleanToken(current));
      return matches;
    }
    if (delimiter === ';' || delimiter === '|') {
      return line.split(delimiter).map((token) => cleanToken(token));
    }
    // multiple whitespace
    return line.split(/\s{2,}|\t/).map((token) => cleanToken(token));
  };

  const cleanToken = (str: string): string => {
    let t = str.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      t = t.slice(1, -1).trim();
    }
    return t;
  };

  // Inspect first line to see if it's a header
  const parsedRows: string[][] = lines.map(splitLine);
  let headerRow: string[] | null = null;
  let dataRows = parsedRows;

  const firstTokens = parsedRows[0];
  const isFirstRowHeader =
    firstTokens.some((tok) => {
      const lower = tok.toLowerCase();
      return (
        lower.includes('category') ||
        lower.includes('employee') ||
        lower.includes('turnover') ||
        lower.includes('balance') ||
        lower.includes('name') ||
        lower.includes('id')
      );
    }) && isNaN(Number(firstTokens[0]));

  if (isFirstRowHeader) {
    headerRow = firstTokens;
    dataRows = parsedRows.slice(1);
  }

  // Derive metric columns
  let columns: MetricColumnConfig[] = [];
  if (existingColumns && existingColumns.length > 0) {
    columns = existingColumns;
  } else if (headerRow && headerRow.length >= 3) {
    // Columns after id and category name
    const rawMetricNames = headerRow.slice(2);
    columns = rawMetricNames.map((name, idx) => {
      const sanitizedKey = name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || `metric_${idx + 1}`;
      return {
        id: `col-${sanitizedKey}-${idx}`,
        key: sanitizedKey,
        name: sanitizedKey,
        label: name || `Metric ${idx + 1}`,
        type: idx === 0 ? 'integer' : 'numeric',
        group: idx === 0 ? 'primary' : 'secondary',
      };
    });
  } else {
    // Default columns matching user example: No of employees, annual turnover, balance sheet
    columns = [
      {
        id: 'col-emp',
        key: 'no_of_employees',
        name: 'no_of_employees',
        label: 'No of Employees',
        type: 'integer',
        group: 'primary',
      },
      {
        id: 'col-turnover',
        key: 'annual_turnover',
        name: 'annual_turnover',
        label: 'Annual Turnover',
        type: 'numeric',
        group: 'secondary',
      },
      {
        id: 'col-balance',
        key: 'balance_sheet',
        name: 'balance_sheet',
        label: 'Balance Sheet',
        type: 'numeric',
        group: 'secondary',
      },
    ];
  }

  // Build categories
  const categories: CategoryRule[] = [];
  dataRows.forEach((row, index) => {
    if (row.length < 2) return;

    let idVal = row[0] || String(index + 1);
    let categoryName = row[1] || `Category ${index + 1}`;

    // If row starts with category name directly and has no leading numeric ID
    if (isNaN(Number(row[0])) && row[0].length > 0 && isNaN(Number(row[1]))) {
      categoryName = row[0];
      idVal = String(index + 1);
    }

    const metricValues = row.slice(2);
    const criteria: Record<string, CategoryCriterion> = {};

    columns.forEach((col, cIdx) => {
      const rawVal = metricValues[cIdx] !== undefined ? metricValues[cIdx].trim() : '';
      const hasValue = rawVal.length > 0 && rawVal !== '-' && rawVal.toUpperCase() !== 'NULL';

      criteria[col.key] = {
        columnKey: col.key,
        operator: '<=',
        value: hasValue ? rawVal : '',
        enabled: hasValue,
      };
    });

    categories.push({
      id: idVal,
      categoryName,
      priority: index + 1,
      description: `Rule for ${categoryName}`,
      criteria,
    });
  });

  if (categories.length === 0) {
    warnings.push('Could not detect any valid category rows. Please check data format.');
  }

  return {
    columns,
    categories,
    detectedDelimiter: delimiter === '\t' ? 'Tab' : delimiter === ',' ? 'Comma' : 'Space/Custom',
    warnings,
  };
}

// ==========================================
// SQL Condition Generation Helper
// ==========================================

/**
 * Formats a value for SQL condition based on metric type
 */
function formatSqlMetricValue(val: string, type: MetricType): string {
  const trimmed = val.trim();
  if (type === 'integer' || type === 'bigint') {
    const num = parseInt(trimmed.replace(/,/g, ''), 10);
    return isNaN(num) ? trimmed : String(num);
  }
  if (type === 'numeric') {
    const num = parseFloat(trimmed.replace(/,/g, ''));
    return isNaN(num) ? trimmed : String(num);
  }
  // Text or Date
  return `'${trimmed.replace(/'/g, "''")}'`;
}

/**
 * Builds the SQL boolean condition for a single CategoryRule.
 * Implements SME compound logic:
 *   Primary conditions (joined by AND) AND (Secondary conditions joined by OR)
 * or pure AND / OR.
 */
export function buildRuleSqlCondition(
  rule: CategoryRule,
  columns: MetricColumnConfig[],
  tableAlias: string,
  ruleLogic: RuleLogicConfig
): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';

  const activeCriteria = Object.values(rule.criteria).filter(
    (c) => c.enabled && c.value !== undefined && c.value.trim().length > 0
  );

  if (activeCriteria.length === 0) {
    return 'TRUE';
  }

  // Partition criteria by column group
  const primaryClauses: string[] = [];
  const secondaryClauses: string[] = [];

  activeCriteria.forEach((crit) => {
    const colDef = columns.find((c) => c.key === crit.columnKey);
    const colName = colDef ? colDef.name : crit.columnKey;
    const colType = colDef ? colDef.type : 'numeric';
    const valFormatted = formatSqlMetricValue(crit.value, colType);
    const colExpr = `${prefix}"${colName}"`;

    let clause = '';
    if (crit.operator === 'BETWEEN' && crit.secondaryValue) {
      const secFormatted = formatSqlMetricValue(crit.secondaryValue, colType);
      clause = `${colExpr} BETWEEN ${valFormatted} AND ${secFormatted}`;
    } else {
      clause = `${colExpr} ${crit.operator} ${valFormatted}`;
    }

    if (ruleLogic.type === 'sme_compound') {
      if (colDef && colDef.group === 'secondary') {
        secondaryClauses.push(clause);
      } else {
        primaryClauses.push(clause);
      }
    } else if (ruleLogic.type === 'any_or') {
      primaryClauses.push(clause);
    } else {
      // all_and
      primaryClauses.push(clause);
    }
  });

  if (ruleLogic.type === 'sme_compound') {
    const primaryPart = primaryClauses.length > 0 ? primaryClauses.join(' AND ') : '';
    let secondaryPart = '';
    if (secondaryClauses.length > 0) {
      const secJoined = secondaryClauses.join(` ${ruleLogic.secondaryGroupOperator || 'OR'} `);
      secondaryPart = secondaryClauses.length > 1 ? `(${secJoined})` : secJoined;
    }

    if (primaryPart && secondaryPart) {
      return `${primaryPart} AND ${secondaryPart}`;
    }
    if (primaryPart) return primaryPart;
    if (secondaryPart) return secondaryPart;
    return 'TRUE';
  }

  if (ruleLogic.type === 'any_or') {
    return primaryClauses.join(' OR ');
  }

  // default all_and
  return primaryClauses.join(' AND ');
}

// ==========================================
// SQL Query Generators for PostgreSQL
// ==========================================

export interface GeneratedQueriesResult {
  discrepancySelectQuery: string;
  classificationSelectQuery: string;
  updateTargetTableQuery: string;
  categoryDistributionQuery: string;
  createPostgresViewQuery: string;
  cteRulesJoinQuery: string;
  caseWhenExpression: string;
}

export function generatePostgresCategoryQueries(config: CategoryMatcherConfig): GeneratedQueriesResult {
  const { targetTable, metricColumns, categories, ruleLogic } = config;
  const tName = `"${targetTable.tableName}"`;
  const tAlias = targetTable.tableAlias || 't';
  const idCol = `${tAlias}."${targetTable.idColumn}"`;
  const nameCol = targetTable.nameColumn ? `${tAlias}."${targetTable.nameColumn}"` : null;
  const currentCatCol = targetTable.categoryColumn ? `${tAlias}."${targetTable.categoryColumn}"` : null;
  const metricColExpressions = metricColumns.map((c) => `${tAlias}."${c.name}"`).join(', ');

  // Sort categories by priority ascending
  const sortedCategories = [...categories].sort((a, b) => a.priority - b.priority);

  // 1. Build CASE WHEN ladder
  const caseBranches = sortedCategories.map((rule) => {
    const cond = buildRuleSqlCondition(rule, metricColumns, tAlias, ruleLogic);
    return `    WHEN ${cond} THEN '${rule.categoryName.replace(/'/g, "''")}'`;
  });

  const fallbackStr = `'${(ruleLogic.fallbackCategory || 'Unclassified').replace(/'/g, "''")}'`;
  const caseWhenExpression = `CASE\n${caseBranches.join('\n')}\n    ELSE ${fallbackStr}\n  END`;

  // 2. Discrepancy & Validation Query
  let discrepancySelectQuery = '';
  if (currentCatCol) {
    discrepancySelectQuery = `-- ============================================================================
-- 1. Category Discrepancy & Validation Query
-- Identifies records where the recorded category does NOT match the calculated category.
-- Includes rule explanation, discrepancy flag, and metrics audit.
-- ============================================================================
WITH evaluated_data AS (
  SELECT
    ${idCol} AS entity_id,
${nameCol ? `    ${nameCol} AS entity_name,\n` : ''}    ${currentCatCol} AS recorded_category,
    ${caseWhenExpression.replace(/\n/g, '\n  ')} AS expected_category,
    ${metricColExpressions}
  FROM ${tName} AS ${tAlias}
)
SELECT
  entity_id,
${nameCol ? `  entity_name,\n` : ''}  recorded_category,
  expected_category,
  CASE
    WHEN recorded_category IS NULL OR TRIM(recorded_category) = '' THEN 'UNCLASSIFIED'
    WHEN recorded_category = expected_category THEN 'MATCH'
    ELSE 'MISMATCH'
  END AS validation_status,
  CASE
    WHEN recorded_category IS NULL OR TRIM(recorded_category) = '' 
      THEN 'Record has no assigned category (should be ' || expected_category || ')'
    WHEN recorded_category = expected_category 
      THEN 'Valid: recorded category matches business metrics criteria'
    ELSE 'Defect: recorded as ' || recorded_category || ' but metrics qualify for ' || expected_category
  END AS validation_reason,
  ${metricColumns.map((c) => `"${c.name}"`).join(', ')}
FROM evaluated_data
-- Filter to show defects only by un-commenting the line below:
-- WHERE recorded_category IS DISTINCT FROM expected_category
ORDER BY 
  CASE 
    WHEN recorded_category IS DISTINCT FROM expected_category THEN 0 
    ELSE 1 
  END,
  entity_id ASC;`;
  } else {
    discrepancySelectQuery = `-- (Target table does not have an existing category column configured for comparison)
-- Running classification calculation:
SELECT
  ${idCol} AS entity_id,
${nameCol ? `  ${nameCol} AS entity_name,\n` : ''}  ${caseWhenExpression} AS computed_category,
  ${metricColExpressions}
FROM ${tName} AS ${tAlias};`;
  }

  // 3. Classification SELECT Query
  const classificationSelectQuery = `-- ============================================================================
-- 2. Business Entity Classification Query
-- Computes category for all rows in ${tName} using the configured multi-rule ladder.
-- ============================================================================
SELECT
  ${idCol} AS entity_id,
${nameCol ? `  ${nameCol} AS entity_name,\n` : ''}${currentCatCol ? `  ${currentCatCol} AS current_category,\n` : ''}  ${caseWhenExpression} AS computed_category,
  ${metricColExpressions}
FROM ${tName} AS ${tAlias}
ORDER BY entity_id ASC;`;

  // 4. Update Target Table Query
  const updateTargetCol = targetTable.newCategoryColumn || targetTable.categoryColumn || 'category';
  const targetColClean = `"${updateTargetCol}"`;
  const updateCaseLadder = sortedCategories.map((rule) => {
    // in UPDATE, reference table without alias if preferred or with target column
    const cond = buildRuleSqlCondition(rule, metricColumns, '', ruleLogic);
    return `      WHEN ${cond} THEN '${rule.categoryName.replace(/'/g, "''")}'`;
  });
  const updateCaseExpr = `CASE\n${updateCaseLadder.join('\n')}\n      ELSE ${fallbackStr}\n    END`;

  const updateTargetTableQuery = `-- ============================================================================
-- 3. Target Table Category Synchronization UPDATE Query
-- Synchronizes ${tName}.${targetColClean} with the computed category.
-- Safe: only updates rows where the category actually differs.
-- ============================================================================
BEGIN;

UPDATE ${tName}
SET ${targetColClean} = 
    ${updateCaseExpr}
WHERE 
  ${targetColClean} IS DISTINCT FROM (
    ${updateCaseExpr}
  );

-- Inspect updated rows or commit
SELECT count(*) AS rows_updated FROM ${tName};
COMMIT;`;

  // 5. Category Distribution Breakdown Query
  const categoryDistributionQuery = `-- ============================================================================
-- 4. Category Distribution & Metric Aggregates Summary
-- Aggregates entity counts, percentages, and average metrics across categories.
-- ============================================================================
WITH classified AS (
  SELECT
    ${idCol} AS id,
    ${caseWhenExpression} AS computed_category,
    ${metricColExpressions}
  FROM ${tName} AS ${tAlias}
)
SELECT
  computed_category,
  COUNT(*) AS entity_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct_of_total,
  ${metricColumns
    .filter((c) => c.type === 'integer' || c.type === 'bigint' || c.type === 'numeric')
    .map((c) => `ROUND(AVG("${c.name}"), 0) AS "avg_${c.name}"`)
    .join(',\n  ')}
FROM classified
GROUP BY computed_category
ORDER BY entity_count DESC;`;

  // 6. PostgreSQL VIEW Definition
  const viewName = `"v_classified_${targetTable.tableName}"`;
  const createPostgresViewQuery = `-- ============================================================================
-- 5. PostgreSQL Live Classification VIEW
-- Creates an automatic view that always presents real-time category classifications.
-- ============================================================================
CREATE OR REPLACE VIEW ${viewName} AS
SELECT
  ${idCol} AS entity_id,
${nameCol ? `  ${nameCol} AS entity_name,\n` : ''}${currentCatCol ? `  ${currentCatCol} AS recorded_category,\n` : ''}  ${caseWhenExpression} AS computed_category,
  ${metricColExpressions}
FROM ${tName} AS ${tAlias};

-- Query the view:
-- SELECT * FROM ${viewName} WHERE computed_category = 'Micro SME';`;

  // 7. CTE Rules Join Query (Reference Table)
  // Constructs an inline VALUES table representing category meta rules
  const cteValues = sortedCategories.map((rule) => {
    const vals = metricColumns.map((col) => {
      const crit = rule.criteria[col.key];
      if (crit && crit.enabled && crit.value) {
        return formatSqlMetricValue(crit.value, col.type);
      }
      return 'NULL';
    });
    return `    (${rule.id}, '${rule.categoryName.replace(/'/g, "''")}', ${rule.priority}, ${vals.join(', ')})`;
  });

  const cteRulesJoinQuery = `-- ============================================================================
-- 6. CTE / Lateral Join Category Rules Matcher Query
-- Demonstrates dynamic matching against an inline reference rules table.
-- ============================================================================
WITH category_metadata_rules (
  rule_id,
  category_name,
  priority,
  ${metricColumns.map((c) => `"max_${c.name}"`).join(', ')}
) AS (
  VALUES
${cteValues.join(',\n')}
)
SELECT 
  ${idCol} AS entity_id,
${nameCol ? `  ${nameCol} AS entity_name,\n` : ''}${currentCatCol ? `  ${currentCatCol} AS recorded_category,\n` : ''}  COALESCE(matched.category_name, ${fallbackStr}) AS computed_category,
  ${metricColExpressions}
FROM ${tName} AS ${tAlias}
LEFT JOIN LATERAL (
  SELECT r.category_name
  FROM category_metadata_rules r
  WHERE 
    ${sortedCategories.length > 0 ? '(/* Evaluation condition */ TRUE)' : 'TRUE'}
  ORDER BY r.priority ASC
  LIMIT 1
) matched ON TRUE;`;

  return {
    discrepancySelectQuery,
    classificationSelectQuery,
    updateTargetTableQuery,
    categoryDistributionQuery,
    createPostgresViewQuery,
    cteRulesJoinQuery,
    caseWhenExpression,
  };
}

// ==========================================
// Category Mismatch Fix Queries Generator
// Generates dedicated, production-grade UPDATE queries specifically to fix
// discrepancies between recorded categories and calculated categories.
// ==========================================

export type SupportedSqlDialect = 'postgres' | 'mysql' | 'sqlserver' | 'sqlite';

export interface CategoryMismatchFixOptions {
  targetColumn?: string;
  includeUnclassified?: boolean; // if true, updates NULL / empty categories as well
  transactionMode?: 'commit' | 'dry_run' | 'none';
  includeReturning?: boolean;
  dialect?: SupportedSqlDialect;
  mismatchedRows?: Array<{
    id: string;
    name?: string;
    recordedCategory?: string;
    expectedCategory: string;
  }>;
}

export interface CategoryMismatchFixResult {
  dynamicFullTableUpdateSql: string;
  perCategoryUpdateSql: string;
  sampleKeyBasedUpdateSql: string;
  safeAuditBackupUpdateSql: string;
  verificationSelectSql: string;
  summary: {
    targetTable: string;
    targetColumn: string;
    dialect: SupportedSqlDialect;
    categoryCount: number;
    mismatchedRowsCount: number;
  };
}

/**
 * Escapes an identifier based on target SQL dialect
 */
function escapeSqlIdentifier(name: string, dialect: SupportedSqlDialect): string {
  const clean = name.replace(/["`\[\]]/g, '');
  if (dialect === 'mysql') return `\`${clean}\``;
  if (dialect === 'sqlserver') return `[${clean}]`;
  // postgres and sqlite
  return `"${clean}"`;
}

/**
 * Generates an inequality expression between a column and a CASE expression
 * handling NULL / UNCLASSIFIED appropriately for each dialect.
 */
function buildMismatchWhereClause(
  columnExpr: string,
  caseExpr: string,
  dialect: SupportedSqlDialect,
  includeUnclassified: boolean
): string {
  if (dialect === 'postgres') {
    if (includeUnclassified) {
      return `${columnExpr} IS DISTINCT FROM (\n${caseExpr}\n)`;
    }
    return `${columnExpr} IS NOT NULL AND TRIM(${columnExpr}::text) <> '' AND ${columnExpr} IS DISTINCT FROM (\n${caseExpr}\n)`;
  }

  if (dialect === 'sqlite') {
    if (includeUnclassified) {
      return `${columnExpr} IS NOT (\n${caseExpr}\n)`;
    }
    return `${columnExpr} IS NOT NULL AND TRIM(${columnExpr}) <> '' AND ${columnExpr} IS NOT (\n${caseExpr}\n)`;
  }

  if (dialect === 'mysql') {
    if (includeUnclassified) {
      return `NOT (${columnExpr} <=> (\n${caseExpr}\n))`;
    }
    return `${columnExpr} IS NOT NULL AND TRIM(${columnExpr}) <> '' AND ${columnExpr} <> (\n${caseExpr}\n)`;
  }

  // sqlserver (T-SQL)
  if (includeUnclassified) {
    return `(\n    ${columnExpr} <> (\n${caseExpr}\n    )\n    OR (${columnExpr} IS NULL)\n    OR (${columnExpr} IS NOT NULL AND (\n${caseExpr}\n    ) IS NULL)\n  )`;
  }
  return `${columnExpr} IS NOT NULL AND RTRIM(LTRIM(${columnExpr})) <> '' AND ${columnExpr} <> (\n${caseExpr}\n)`;
}

/**
 * Wraps SQL statements with transaction controls based on dialect and mode
 */
function wrapTransaction(
  statements: string,
  mode: 'commit' | 'dry_run' | 'none',
  dialect: SupportedSqlDialect
): string {
  if (mode === 'none') {
    return statements;
  }

  let beginStmt = 'BEGIN;';
  let commitStmt = 'COMMIT;';
  let rollbackStmt = 'ROLLBACK;';

  if (dialect === 'mysql') {
    beginStmt = 'START TRANSACTION;';
    commitStmt = 'COMMIT;';
    rollbackStmt = 'ROLLBACK;';
  } else if (dialect === 'sqlserver') {
    beginStmt = 'BEGIN TRANSACTION;';
    commitStmt = 'COMMIT TRANSACTION;';
    rollbackStmt = 'ROLLBACK TRANSACTION;';
  } else if (dialect === 'sqlite') {
    beginStmt = 'BEGIN TRANSACTION;';
    commitStmt = 'COMMIT;';
    rollbackStmt = 'ROLLBACK;';
  }

  if (mode === 'dry_run') {
    return `${beginStmt}\n\n${statements}\n\n-- ============================================================================\n-- DRY-RUN SAFETY: Rollback prevents any permanent changes to the database\n-- ============================================================================\n${rollbackStmt}`;
  }

  return `${beginStmt}\n\n${statements}\n\n${commitStmt}`;
}

/**
 * Main generator for category mismatch fix queries
 */
export function generateCategoryMismatchFixQueries(
  config: CategoryMatcherConfig,
  options: CategoryMismatchFixOptions = {}
): CategoryMismatchFixResult {
  const { targetTable, metricColumns, categories, ruleLogic } = config;
  const dialect = options.dialect || 'postgres';
  const targetColName =
    options.targetColumn || targetTable.newCategoryColumn || targetTable.categoryColumn || 'current_category';
  const includeUnclassified = options.includeUnclassified !== false; // default true
  const transactionMode = options.transactionMode || 'commit';
  const includeReturning = options.includeReturning !== false;
  const mismatchedRows = options.mismatchedRows || [];

  const tName = escapeSqlIdentifier(targetTable.tableName, dialect);
  const targetCol = escapeSqlIdentifier(targetColName, dialect);
  const idCol = escapeSqlIdentifier(targetTable.idColumn, dialect);

  // Sort categories by priority ascending
  const sortedCategories = [...categories].sort((a, b) => a.priority - b.priority);

  // Format CASE ladder for UPDATE (without table alias prefix)
  const caseBranches = sortedCategories.map((rule) => {
    const cond = buildRuleSqlCondition(rule, metricColumns, '', ruleLogic);
    return `    WHEN ${cond} THEN '${rule.categoryName.replace(/'/g, "''")}'`;
  });
  const fallbackStr = `'${(ruleLogic.fallbackCategory || 'Unclassified').replace(/'/g, "''")}'`;
  const caseWhenExpr = `  CASE\n${caseBranches.join('\n')}\n    ELSE ${fallbackStr}\n  END`;

  // 1. Dynamic Full-Table UPDATE Query
  const mismatchWhere = buildMismatchWhereClause(targetCol, caseWhenExpr, dialect, includeUnclassified);
  
  let returningClause = '';
  if (includeReturning) {
    if (dialect === 'postgres' || dialect === 'sqlite') {
      returningClause = `\nRETURNING ${idCol}, ${targetCol} AS new_category;`;
    } else if (dialect === 'sqlserver') {
      // In T-SQL, OUTPUT is placed before WHERE
    } else if (dialect === 'mysql') {
      returningClause = `\n-- Note: MySQL does not support RETURNING; inspect ROW_COUNT() or run the verification SELECT below.`;
    }
  }

  let updateCoreStmt = '';
  if (dialect === 'sqlserver' && includeReturning) {
    updateCoreStmt = `UPDATE ${tName}
SET ${targetCol} = 
${caseWhenExpr}
OUTPUT inserted.${idCol}, inserted.${targetCol} AS new_category
WHERE 
  ${mismatchWhere};`;
  } else {
    updateCoreStmt = `UPDATE ${tName}
SET ${targetCol} = 
${caseWhenExpr}
WHERE 
  ${mismatchWhere};${returningClause}`;
  }

  const dynamicFullTableUpdateSql = `-- ============================================================================
-- 1. Full-Table Dynamic Category Mismatch Fix UPDATE
-- Target Table:  ${tName}
-- Target Column: ${targetCol}
-- Scope:         ${includeUnclassified ? 'Fixes all mismatches + unclassified/null categories' : 'Fixes recorded mismatches only (excludes blank/null)'}
-- Dialect:       ${dialect.toUpperCase()}
-- ============================================================================
${wrapTransaction(updateCoreStmt, transactionMode, dialect)}`;

  // 2. Category-by-Category Targeted UPDATEs
  const perCategoryStatements: string[] = [];
  const accumulatedConditions: string[] = [];

  sortedCategories.forEach((rule, idx) => {
    const currentRuleCond = buildRuleSqlCondition(rule, metricColumns, '', ruleLogic);
    const catLiteral = `'${rule.categoryName.replace(/'/g, "''")}'`;

    let whereCond = `${targetCol} IS DISTINCT FROM ${catLiteral}\n    AND (${currentRuleCond})`;
    if (dialect === 'mysql') {
      whereCond = `NOT (${targetCol} <=> ${catLiteral})\n    AND (${currentRuleCond})`;
    } else if (dialect === 'sqlserver') {
      whereCond = `(${targetCol} <> ${catLiteral} OR ${targetCol} IS NULL)\n    AND (${currentRuleCond})`;
    } else if (dialect === 'sqlite') {
      whereCond = `${targetCol} IS NOT ${catLiteral}\n    AND (${currentRuleCond})`;
    }

    // Exclude prior higher-priority matches if needed
    if (accumulatedConditions.length > 0) {
      const priorExclusions = accumulatedConditions.map((c) => `NOT (${c})`).join('\n    AND ');
      whereCond += `\n    AND ${priorExclusions}`;
    }
    accumulatedConditions.push(currentRuleCond);

    perCategoryStatements.push(`-- Priority ${rule.priority}: Fix records qualifying for '${rule.categoryName}'
UPDATE ${tName}
SET ${targetCol} = ${catLiteral}
WHERE 
  ${whereCond};`);
  });

  // Fallback category statement
  if (accumulatedConditions.length > 0) {
    const allExclusions = accumulatedConditions.map((c) => `NOT (${c})`).join('\n    AND ');
    let fallbackWhere = `${targetCol} IS DISTINCT FROM ${fallbackStr}\n    AND ${allExclusions}`;
    if (dialect === 'mysql') {
      fallbackWhere = `NOT (${targetCol} <=> ${fallbackStr})\n    AND ${allExclusions}`;
    } else if (dialect === 'sqlserver') {
      fallbackWhere = `(${targetCol} <> ${fallbackStr} OR ${targetCol} IS NULL)\n    AND ${allExclusions}`;
    } else if (dialect === 'sqlite') {
      fallbackWhere = `${targetCol} IS NOT ${fallbackStr}\n    AND ${allExclusions}`;
    }

    perCategoryStatements.push(`-- Priority ${sortedCategories.length + 1} (Default): Fix records qualifying for Fallback '${ruleLogic.fallbackCategory}'
UPDATE ${tName}
SET ${targetCol} = ${fallbackStr}
WHERE 
  ${fallbackWhere};`);
  }

  const perCategoryUpdateSql = `-- ============================================================================
-- 2. Targeted Category-by-Category UPDATE Queries
-- Executes atomic corrections category by category in strict priority order.
-- Recommended for large datasets to monitor progress and maintain index isolation.
-- ============================================================================
${wrapTransaction(perCategoryStatements.join('\n\n'), transactionMode, dialect)}`;

  // 3. Sample Key-Based UPDATE Query (from detected mismatches or passed IDs)
  let sampleKeyBasedUpdateSql = '';
  if (mismatchedRows.length > 0) {
    const valuesRows = mismatchedRows.map((r) => {
      const idLiteral = isNaN(Number(r.id)) ? `'${r.id.replace(/'/g, "''")}'` : r.id;
      const expectedLiteral = `'${r.expectedCategory.replace(/'/g, "''")}'`;
      const nameComment = r.name ? ` -- ${r.name} (recorded: "${r.recordedCategory || 'NULL'}")` : '';
      return `    (${idLiteral}, ${expectedLiteral})${nameComment}`;
    });

    const individualStatements = mismatchedRows.map((r) => {
      const idLiteral = isNaN(Number(r.id)) ? `'${r.id.replace(/'/g, "''")}'` : r.id;
      const expectedLiteral = `'${r.expectedCategory.replace(/'/g, "''")}'`;
      const recordedComment = r.recordedCategory ? ` (was: "${r.recordedCategory}")` : '';
      return `UPDATE ${tName} SET ${targetCol} = ${expectedLiteral} WHERE ${idCol} = ${idLiteral};${recordedComment}`;
    });

    let bulkJoinSql = '';
    if (dialect === 'postgres') {
      bulkJoinSql = `-- Method A: High-Performance PostgreSQL VALUES Table Join Update
UPDATE ${tName} AS t
SET ${targetCol} = v.new_category
FROM (
  VALUES
${valuesRows.join(',\n')}
) AS v(entity_id, new_category)
WHERE t.${idCol}::text = v.entity_id::text;\n\n`;
    } else if (dialect === 'mysql') {
      bulkJoinSql = `-- Method A: MySQL Bulk JOIN Update
UPDATE ${tName} AS t
JOIN (
  SELECT 'sample_id' AS entity_id, 'sample_cat' AS new_category
  -- Populate with detected IDs or use the individual statements below
) AS v ON t.${idCol} = v.entity_id
SET t.${targetCol} = v.new_category;\n\n`;
    }

    const keyBasedCore = `${bulkJoinSql}-- Method B: Explicit Individual UPDATE Statements (${mismatchedRows.length} entities)
${individualStatements.join('\n')}`;

    sampleKeyBasedUpdateSql = `-- ============================================================================
-- 3. Targeted Entity Key-Based UPDATE for Detected Mismatches
-- Specifically fixes the ${mismatchedRows.length} entities identified with category defects.
-- ============================================================================
${wrapTransaction(keyBasedCore, transactionMode, dialect)}`;
  } else {
    sampleKeyBasedUpdateSql = `-- ============================================================================
-- 3. Targeted Entity Key-Based UPDATE (Template)
-- (No specific mismatches currently selected or detected in sample data)
-- Use this template to fix specific primary key IDs directly:
-- ============================================================================
${wrapTransaction(
  `UPDATE ${tName} 
SET ${targetCol} = 'TargetCategory' 
WHERE ${idCol} IN ('ENTITY_ID_1', 'ENTITY_ID_2');`,
  transactionMode,
  dialect
)}`;
  }

  // 4. Safe Staging & Audit Backup Table UPDATE
  const auditTableName = escapeSqlIdentifier(`${targetTable.tableName}_category_fix_audit`, dialect);
  let safeAuditCore = '';

  if (dialect === 'postgres') {
    safeAuditCore = `-- Step 1: Snapshot defective rows into an audit backup table before making changes
CREATE TABLE IF NOT EXISTS ${auditTableName} (
  audit_id SERIAL PRIMARY KEY,
  entity_id VARCHAR(255),
  old_category VARCHAR(255),
  new_category VARCHAR(255),
  fixed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ${auditTableName} (entity_id, old_category, new_category)
SELECT
  ${idCol}::text,
  ${targetCol}::text,
${caseWhenExpr}
FROM ${tName}
WHERE 
  ${mismatchWhere};

-- Step 2: Apply the category fix safely
UPDATE ${tName}
SET ${targetCol} = 
${caseWhenExpr}
WHERE ${idCol}::text IN (
  SELECT entity_id FROM ${auditTableName}
  WHERE fixed_at >= CURRENT_DATE
);

-- Step 3: Verify zero discrepancies remaining
SELECT COUNT(*) AS remaining_mismatches
FROM ${tName}
WHERE 
  ${mismatchWhere};`;
  } else {
    safeAuditCore = `-- Step 1: Create backup snapshot of mismatched rows
CREATE TABLE IF NOT EXISTS ${auditTableName} AS
SELECT
  ${idCol} AS entity_id,
  ${targetCol} AS old_category,
${caseWhenExpr} AS new_category
FROM ${tName}
WHERE 
  ${mismatchWhere};

-- Step 2: Apply the correction
UPDATE ${tName}
SET ${targetCol} = 
${caseWhenExpr}
WHERE 
  ${mismatchWhere};`;
  }

  const safeAuditBackupUpdateSql = `-- ============================================================================
-- 4. Safe Staging & Audit Backup Table UPDATE
-- Pre-creates a backup audit snapshot before applying corrections to live data.
-- Allows instant rollbacks or post-fix verification.
-- ============================================================================
${wrapTransaction(safeAuditCore, transactionMode, dialect)}`;

  // 5. Pre/Post Verification SELECT Query
  const verificationSelectSql = `-- ============================================================================
-- 5. Category Verification & Discrepancy Audit SELECT Query
-- Run this BEFORE fixing to count defects, and AFTER fixing to confirm zero mismatches.
-- ============================================================================
WITH evaluated_audit AS (
  SELECT
    ${idCol} AS entity_id,
    ${targetCol} AS recorded_category,
${caseWhenExpr} AS expected_category
  FROM ${tName}
)
SELECT
  COUNT(*) AS total_records,
  COUNT(CASE WHEN recorded_category = expected_category THEN 1 END) AS verified_matches,
  COUNT(CASE WHEN recorded_category IS DISTINCT FROM expected_category AND recorded_category IS NOT NULL AND TRIM(recorded_category::text) <> '' THEN 1 END) AS active_mismatches,
  COUNT(CASE WHEN recorded_category IS NULL OR TRIM(recorded_category::text) = '' THEN 1 END) AS unclassified_blank,
  ROUND(COUNT(CASE WHEN recorded_category = expected_category THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS category_accuracy_pct
FROM evaluated_audit;`;

  return {
    dynamicFullTableUpdateSql,
    perCategoryUpdateSql,
    sampleKeyBasedUpdateSql,
    safeAuditBackupUpdateSql,
    verificationSelectSql,
    summary: {
      targetTable: targetTable.tableName,
      targetColumn: targetColName,
      dialect,
      categoryCount: categories.length,
      mismatchedRowsCount: mismatchedRows.length,
    },
  };
}

// ==========================================
// Python Script Generator using pg8000
// ==========================================

export function generatePg8000PythonScript(config: CategoryMatcherConfig): string {
  const { targetTable, metricColumns, categories, ruleLogic, pgConnection } = config;
  const queries = generatePostgresCategoryQueries(config);

  const tName = targetTable.tableName;
  const idCol = targetTable.idColumn;
  const nameCol = targetTable.nameColumn || '';
  const currentCatCol = targetTable.categoryColumn || '';

  // Build Python rule definition dictionaries for local verification
  const pyRules = [...categories]
    .sort((a, b) => a.priority - b.priority)
    .map((r) => {
      const criteriaEntries = Object.entries(r.criteria)
        .filter(([, crit]) => crit.enabled && crit.value)
        .map(([k, crit]) => `"${k}": {"op": "${crit.operator}", "val": ${isNaN(Number(crit.value)) ? `"${crit.value}"` : crit.value}}`)
        .join(', ');
      return `    {
        "id": ${typeof r.id === 'number' ? r.id : `"${r.id}"`},
        "name": "${r.categoryName}",
        "priority": ${r.priority},
        "criteria": {${criteriaEntries}},
    }`;
    })
    .join(',\n');

  return `#!/usr/bin/env python3
"""
================================================================================
PostgreSQL Category Matcher & Data Validation Script (via pg8000)
================================================================================
Generated for: ${config.metadata.name}
Target Table:  ${tName}
Rule Logic:    ${ruleLogic.type.toUpperCase()} (Fallback: "${ruleLogic.fallbackCategory}")

Features:
- Connects to PostgreSQL using pg8000 (pure-Python DB-API / native driver)
- Executes server-side category evaluation & discrepancy detection
- Audits and highlights mismatches between recorded and expected categories
- Prints an elegant terminal summary with color highlights
- Exports validation report to JSON / CSV
- Optional --fix mode to automatically update mismatched records in the database

Requirements:
    pip install pg8000 tabulate (optional for pretty table output)

Usage:
    python validate_categories.py
    python validate_categories.py --host localhost --dbname production_db
    python validate_categories.py --only-mismatches --export-json results.json
    python validate_categories.py --fix --dry-run
================================================================================
"""

import sys
import os
import argparse
import json
import csv
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    import pg8000.native
    HAS_PG8000_NATIVE = True
except ImportError:
    try:
        import pg8000
        HAS_PG8000_NATIVE = False
    except ImportError:
        print("ERROR: pg8000 is not installed. Please run: pip install pg8000", file=sys.stderr)
        sys.exit(1)

# ANSI Terminal Colors
class Colors:
    HEADER = '\\033[95m'
    BLUE = '\\033[94m'
    CYAN = '\\033[96m'
    GREEN = '\\033[92m'
    WARNING = '\\033[93m'
    FAIL = '\\033[91m'
    BOLD = '\\033[1m'
    UNDERLINE = '\\033[4m'
    RESET = '\\033[0m'

# Configuration Constants
DEFAULT_DB_CONFIG = {
    "host": "${pgConnection.host || 'localhost'}",
    "port": ${pgConnection.port || 5432},
    "database": "${pgConnection.database || 'postgres'}",
    "user": "${pgConnection.user || 'postgres'}",
    "password": "${pgConnection.password || ''}",
    "schema": "${pgConnection.schema || 'public'}",
}

TABLE_NAME = "${tName}"
ID_COLUMN = "${idCol}"
NAME_COLUMN = "${nameCol}"
RECORDED_CAT_COLUMN = "${currentCatCol}"
METRIC_COLUMNS = ${JSON.stringify(metricColumns.map((c) => ({ key: c.key, name: c.name, type: c.type, group: c.group })), null, 4)}

FALLBACK_CATEGORY = "${ruleLogic.fallbackCategory}"
RULE_LOGIC_TYPE = "${ruleLogic.type}"

# Category Rules Definition
CATEGORY_RULES = [
${pyRules}
]

# Validation Query
VALIDATION_SQL = """
${queries.discrepancySelectQuery.replace(/"""/g, '\\"\\"\\"')}
"""

UPDATE_SQL = """
${queries.updateTargetTableQuery.replace(/"""/g, '\\"\\"\\"')}
"""

def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Validate business entity categories in PostgreSQL using pg8000"
    )
    parser.add_argument("--host", default=os.getenv("PGHOST", DEFAULT_DB_CONFIG["host"]), help="Database host")
    parser.add_argument("--port", type=int, default=int(os.getenv("PGPORT", DEFAULT_DB_CONFIG["port"])), help="Database port")
    parser.add_argument("--dbname", default=os.getenv("PGDATABASE", DEFAULT_DB_CONFIG["database"]), help="Database name")
    parser.add_argument("--user", default=os.getenv("PGUSER", DEFAULT_DB_CONFIG["user"]), help="Database user")
    parser.add_argument("--password", default=os.getenv("PGPASSWORD", DEFAULT_DB_CONFIG["password"]), help="Database password")
    parser.add_argument("--ssl", action="store_true", help="Enable SSL connection")
    parser.add_argument("--only-mismatches", action="store_true", help="Display and export only rows with category mismatches")
    parser.add_argument("--export-json", metavar="FILE", help="Save validation results to a JSON file")
    parser.add_argument("--export-csv", metavar="FILE", help="Save validation results to a CSV file")
    parser.add_argument("--fix", action="store_true", help="Update mismatched categories in the target table")
    parser.add_argument("--dry-run", action="store_true", help="Preview fixes without committing changes")
    return parser.parse_args()


def connect_postgres(args):
    """Establishes connection to PostgreSQL using pg8000.native."""
    print(f"{Colors.CYAN}Connecting to PostgreSQL at {args.host}:{args.port}/{args.dbname} as {args.user}...{Colors.RESET}")
    try:
        conn = pg8000.native.Connection(
            user=args.user,
            password=args.password if args.password else None,
            host=args.host,
            port=args.port,
            database=args.dbname,
            ssl_context=True if args.ssl else None,
        )
        print(f"{Colors.GREEN}✓ Connected successfully via pg8000!{Colors.RESET}\\n")
        return conn
    except Exception as e:
        print(f"{Colors.FAIL}Connection failed: {e}{Colors.RESET}", file=sys.stderr)
        print("Please check your database credentials or environment variables.", file=sys.stderr)
        sys.exit(1)


def run_category_validation(conn, args):
    """Executes the validation query and analyzes results."""
    print(f"{Colors.BOLD}Executing Category Validation Analysis...{Colors.RESET}")
    try:
        # Execute query
        results = conn.run(VALIDATION_SQL)
        columns = [col["name"] for col in conn.columns]
    except Exception as e:
        print(f"{Colors.FAIL}Error executing validation query: {e}{Colors.RESET}", file=sys.stderr)
        conn.close()
        sys.exit(1)

    records: List[Dict[str, Any]] = []
    for row in results:
        records.append(dict(zip(columns, row)))

    # Statistics
    total_rows = len(records)
    matches = [r for r in records if r.get("validation_status") == "MATCH"]
    mismatches = [r for r in records if r.get("validation_status") == "MISMATCH"]
    unclassified = [r for r in records if r.get("validation_status") == "UNCLASSIFIED"]

    print("\\n" + "=" * 80)
    print(f"{Colors.HEADER}{Colors.BOLD}CATEGORY VALIDATION SUMMARY REPORT{Colors.RESET}")
    print("=" * 80)
    print(f"Target Table:        {Colors.BOLD}{TABLE_NAME}{Colors.RESET}")
    print(f"Total Rows Checked:  {total_rows}")
    print(f"Valid Matches:       {Colors.GREEN}{len(matches)} ({len(matches)/total_rows*100:.1f}%){Colors.RESET}" if total_rows else "0")
    print(f"Category Mismatches: {Colors.FAIL}{len(mismatches)} ({len(mismatches)/total_rows*100:.1f}%){Colors.RESET}" if total_rows else "0")
    print(f"Unclassified / Null: {Colors.WARNING}{len(unclassified)} ({len(unclassified)/total_rows*100:.1f}%){Colors.RESET}" if total_rows else "0")
    print("=" * 80 + "\\n")

    # Display Table
    display_rows = mismatches if args.only_mismatches else records

    # Format output rows
    header = f"{'ID':<10} {'Name':<26} {'Recorded':<16} {'Expected':<16} {'Status':<12}"
    print(Colors.BOLD + header + Colors.RESET)
    print("-" * 84)

    for r in display_rows[:50]:  # preview top 50
        status = r.get("validation_status", "UNKNOWN")
        color = Colors.GREEN if status == "MATCH" else (Colors.FAIL if status == "MISMATCH" else Colors.WARNING)
        r_id = str(r.get("entity_id", ""))[:9]
        r_name = str(r.get("entity_name", ""))[:25]
        r_rec = str(r.get("recorded_category") or "<None>")[:15]
        r_exp = str(r.get("expected_category", ""))[:15]
        
        row_str = f"{r_id:<10} {r_name:<26} {r_rec:<16} {r_exp:<16} {color}{status:<12}{Colors.RESET}"
        print(row_str)

    if len(display_rows) > 50:
        print(f"{Colors.CYAN}... and {len(display_rows) - 50} more records.{Colors.RESET}")

    # Export to JSON
    if args.export_json:
        with open(args.export_json, "w", encoding="utf-8") as f:
            json.dump({
                "generated_at": datetime.now().isoformat(),
                "summary": {
                    "total": total_rows,
                    "matches": len(matches),
                    "mismatches": len(mismatches),
                    "unclassified": len(unclassified),
                },
                "records": display_rows,
            }, f, indent=2, default=str)
        print(f"\\n{Colors.GREEN}✓ Exported results to JSON: {args.export_json}{Colors.RESET}")

    # Export to CSV
    if args.export_csv and display_rows:
        with open(args.export_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(display_rows[0].keys()))
            writer.writeheader()
            writer.writerows(display_rows)
        print(f"{Colors.GREEN}✓ Exported results to CSV: {args.export_csv}{Colors.RESET}")

    # Fix mode
    if args.fix:
        if args.dry_run:
            print(f"\\n{Colors.WARNING}[DRY-RUN] Found {len(mismatches) + len(unclassified)} rows needing updates. No changes written.{Colors.RESET}")
        else:
            print(f"\\n{Colors.CYAN}Applying category fixes to table {TABLE_NAME}...{Colors.RESET}")
            try:
                conn.run(UPDATE_SQL)
                print(f"{Colors.GREEN}✓ Successfully synchronized categories in {TABLE_NAME}!{Colors.RESET}")
            except Exception as e:
                print(f"{Colors.FAIL}Failed to apply updates: {e}{Colors.RESET}", file=sys.stderr)


def main():
    args = parse_arguments()
    conn = connect_postgres(args)
    try:
        run_category_validation(conn, args)
    finally:
        conn.close()
        print(f"\\n{Colors.CYAN}Database connection closed.{Colors.RESET}")

if __name__ == "__main__":
    main()
`;
}

// ==========================================
// In-Memory Evaluator for Live Simulation
// ==========================================

export function evaluateLocalRow(
  row: TestSampleRow,
  columns: MetricColumnConfig[],
  categories: CategoryRule[],
  ruleLogic: RuleLogicConfig
): RowValidationResult {
  const sortedCategories = [...categories].sort((a, b) => a.priority - b.priority);

  let matchedRule: CategoryRule | null = null;
  let triggeredExplanation = '';

  for (const rule of sortedCategories) {
    const activeCriteria = Object.values(rule.criteria).filter(
      (c) => c.enabled && c.value !== undefined && c.value.trim().length > 0
    );

    if (activeCriteria.length === 0) {
      matchedRule = rule;
      triggeredExplanation = 'All criteria unconstrained (matched default)';
      break;
    }

    let isMatch = false;

    if (ruleLogic.type === 'sme_compound') {
      const primaryCriteria = activeCriteria.filter((crit) => {
        const colDef = columns.find((c) => c.key === crit.columnKey);
        return !colDef || colDef.group === 'primary';
      });

      const secondaryCriteria = activeCriteria.filter((crit) => {
        const colDef = columns.find((c) => c.key === crit.columnKey);
        return colDef && colDef.group === 'secondary';
      });

      const primaryPass =
        primaryCriteria.length === 0 ||
        primaryCriteria.every((crit) => testCriterion(crit, row.metrics[crit.columnKey]));

      let secondaryPass = true;
      if (secondaryCriteria.length > 0) {
        if (ruleLogic.secondaryGroupOperator === 'AND') {
          secondaryPass = secondaryCriteria.every((crit) => testCriterion(crit, row.metrics[crit.columnKey]));
        } else {
          // OR
          secondaryPass = secondaryCriteria.some((crit) => testCriterion(crit, row.metrics[crit.columnKey]));
        }
      }

      isMatch = primaryPass && secondaryPass;
      if (isMatch) {
        const pDesc = primaryCriteria
          .map((c) => `${c.columnKey} (${row.metrics[c.columnKey]}) ${c.operator} ${c.value}`)
          .join(' AND ');
        const sDesc = secondaryCriteria
          .map((c) => `${c.columnKey} (${row.metrics[c.columnKey]}) ${c.operator} ${c.value}`)
          .join(' OR ');
        triggeredExplanation = pDesc && sDesc ? `${pDesc} AND (${sDesc})` : pDesc || sDesc;
      }
    } else if (ruleLogic.type === 'any_or') {
      isMatch = activeCriteria.some((crit) => testCriterion(crit, row.metrics[crit.columnKey]));
      if (isMatch) {
        triggeredExplanation = 'Matched OR criterion';
      }
    } else {
      // all_and
      isMatch = activeCriteria.every((crit) => testCriterion(crit, row.metrics[crit.columnKey]));
      if (isMatch) {
        triggeredExplanation = activeCriteria
          .map((c) => `${c.columnKey} (${row.metrics[c.columnKey]}) ${c.operator} ${c.value}`)
          .join(' AND ');
      }
    }

    if (isMatch) {
      matchedRule = rule;
      break;
    }
  }

  const expectedCategory = matchedRule ? matchedRule.categoryName : ruleLogic.fallbackCategory || 'Unclassified';
  const recordedCategory = row.recordedCategory ? row.recordedCategory.trim() : '';

  let status: 'MATCH' | 'MISMATCH' | 'UNCLASSIFIED' = 'MATCH';
  let reason = '';

  if (!recordedCategory) {
    status = 'UNCLASSIFIED';
    reason = `Row has no recorded category in table. Expected: "${expectedCategory}".`;
  } else if (recordedCategory.toLowerCase() === expectedCategory.toLowerCase()) {
    status = 'MATCH';
    reason = `Recorded category "${recordedCategory}" matches metrics qualification.`;
  } else {
    status = 'MISMATCH';
    reason = `Recorded as "${recordedCategory}" but metrics evaluate to "${expectedCategory}".`;
  }

  return {
    id: row.id,
    name: row.name,
    recordedCategory: row.recordedCategory,
    expectedCategory,
    matchedRuleId: matchedRule ? matchedRule.id : undefined,
    status,
    reason,
    triggeredConditionText: triggeredExplanation || `Defaulted to ${expectedCategory}`,
    metrics: row.metrics,
  };
}

function testCriterion(criterion: CategoryCriterion, rawValue: string | number | undefined): boolean {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return false;
  }

  const numVal = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue).replace(/,/g, ''));
  const targetNum = parseFloat(criterion.value.replace(/,/g, ''));

  if (!isNaN(numVal) && !isNaN(targetNum)) {
    switch (criterion.operator) {
      case '<=':
        return numVal <= targetNum;
      case '<':
        return numVal < targetNum;
      case '>=':
        return numVal >= targetNum;
      case '>':
        return numVal > targetNum;
      case '=':
        return numVal === targetNum;
      case '!=':
        return numVal !== targetNum;
      case 'BETWEEN':
        if (criterion.secondaryValue) {
          const secNum = parseFloat(criterion.secondaryValue.replace(/,/g, ''));
          return numVal >= targetNum && numVal <= secNum;
        }
        return numVal >= targetNum;
      default:
        return false;
    }
  }

  // String comparison
  const strVal = String(rawValue).trim().toLowerCase();
  const targetStr = criterion.value.trim().toLowerCase();
  switch (criterion.operator) {
    case '=':
      return strVal === targetStr;
    case '!=':
      return strVal !== targetStr;
    case '<=':
      return strVal <= targetStr;
    case '>=':
      return strVal >= targetStr;
    default:
      return strVal === targetStr;
  }
}

// ==========================================
// Config Validation & Serialization
// ==========================================

export function validateAndParseMatcherConfig(jsonStr: string): {
  success: boolean;
  config?: CategoryMatcherConfig;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Config JSON must be a valid object' };
    }

    if (!parsed.targetTable || !parsed.targetTable.tableName) {
      return { success: false, error: 'Config is missing targetTable.tableName' };
    }

    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      return { success: false, error: 'Config must contain at least one category rule in "categories"' };
    }

    if (!Array.isArray(parsed.metricColumns) || parsed.metricColumns.length === 0) {
      return { success: false, error: 'Config must contain at least one metric column in "metricColumns"' };
    }

    // Fill defaults for any missing optional fields
    const validated: CategoryMatcherConfig = {
      version: parsed.version || '1.0.0',
      metadata: {
        name: parsed.metadata?.name || 'Imported Category Matcher Config',
        description: parsed.metadata?.description || '',
        createdAt: parsed.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetTable: {
        tableName: parsed.targetTable.tableName,
        tableAlias: parsed.targetTable.tableAlias || 't',
        idColumn: parsed.targetTable.idColumn || 'id',
        nameColumn: parsed.targetTable.nameColumn || '',
        categoryColumn: parsed.targetTable.categoryColumn || '',
        newCategoryColumn: parsed.targetTable.newCategoryColumn || parsed.targetTable.categoryColumn || 'category',
      },
      metricColumns: parsed.metricColumns.map((c: any, idx: number) => ({
        id: c.id || `col-${idx}`,
        key: c.key || `metric_${idx}`,
        name: c.name || `metric_${idx}`,
        label: c.label || c.name || `Metric ${idx + 1}`,
        type: c.type || 'numeric',
        group: c.group || (idx === 0 ? 'primary' : 'secondary'),
      })),
      categories: parsed.categories.map((r: any, idx: number) => ({
        id: r.id !== undefined ? r.id : idx + 1,
        categoryName: r.categoryName || `Category ${idx + 1}`,
        priority: typeof r.priority === 'number' ? r.priority : idx + 1,
        description: r.description || '',
        criteria: r.criteria || {},
      })),
      ruleLogic: {
        type: parsed.ruleLogic?.type || 'sme_compound',
        primaryGroupOperator: parsed.ruleLogic?.primaryGroupOperator || 'AND',
        secondaryGroupOperator: parsed.ruleLogic?.secondaryGroupOperator || 'OR',
        fallbackCategory: parsed.ruleLogic?.fallbackCategory || 'Unclassified',
        treatBlankAs: 'unbounded',
      },
      pgConnection: {
        host: parsed.pgConnection?.host || 'localhost',
        port: parsed.pgConnection?.port || 5432,
        database: parsed.pgConnection?.database || 'postgres',
        user: parsed.pgConnection?.user || 'postgres',
        password: parsed.pgConnection?.password || '',
        useEnvVars: parsed.pgConnection?.useEnvVars !== false,
        ssl: Boolean(parsed.pgConnection?.ssl),
        schema: parsed.pgConnection?.schema || 'public',
      },
    };

    return { success: true, config: validated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Invalid JSON format' };
  }
}

export function createMatcherConfigExport(config: CategoryMatcherConfig): string {
  const exportPayload = {
    $schema: 'https://devhub.internal/schemas/db-category-matcher-v1.json',
    tool: 'db-category-matcher',
    exportedAt: new Date().toISOString(),
    ...config,
  };
  return JSON.stringify(exportPayload, null, 2);
}

// ==========================================
// Built-in Presets for Ready Use
// ==========================================

export interface CategoryMatcherPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  config: CategoryMatcherConfig;
  sampleRows: TestSampleRow[];
}

export const CATEGORY_MATCHER_PRESETS: CategoryMatcherPreset[] = [
  {
    id: 'eu-uk-sme',
    name: 'EU/UK SME Business Classification (Standard)',
    description:
      'Categorizes companies as Micro SME (employees <= 9 and [turnover <= 2M or balance <= 2M]), SME (employees <= 249 and [turnover <= 50M or balance <= 43M]), or Small Midcap (employees <= 499).',
    badge: 'Enterprise SME',
    config: DEFAULT_MATCHER_CONFIG,
    sampleRows: DEFAULT_SAMPLE_ROWS,
  },
  {
    id: 'credit-risk-tiers',
    name: 'Credit Risk & Loan Underwriting Tiers',
    description:
      'Classifies borrower creditworthiness into Prime, Near Prime, and Subprime based on FICO credit score, debt-to-income (DTI) ratio, and missed payments.',
    badge: 'Financial Risk',
    config: {
      version: '1.0.0',
      metadata: {
        name: 'Credit Risk & Underwriting Classification',
        description: 'Tiers loan applicants into risk brackets for interest pricing and credit approval validation.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetTable: {
        tableName: 'borrower_accounts',
        tableAlias: 'ba',
        idColumn: 'borrower_id',
        nameColumn: 'applicant_name',
        categoryColumn: 'credit_tier',
        newCategoryColumn: 'credit_tier',
      },
      metricColumns: [
        {
          id: 'col-fico',
          key: 'credit_score',
          name: 'credit_score',
          label: 'Credit Score (FICO)',
          type: 'integer',
          group: 'primary',
        },
        {
          id: 'col-dti',
          key: 'dti_ratio',
          name: 'dti_ratio',
          label: 'Debt-to-Income (DTI %)',
          type: 'numeric',
          group: 'secondary',
        },
        {
          id: 'col-delinq',
          key: 'delinquency_count',
          name: 'delinquency_count',
          label: 'Delinquencies (24 mo)',
          type: 'integer',
          group: 'secondary',
        },
      ],
      categories: [
        {
          id: 1,
          categoryName: 'Tier 1 - Super Prime',
          priority: 1,
          description: 'FICO >= 750, DTI <= 30% and 0 delinquencies',
          criteria: {
            credit_score: { columnKey: 'credit_score', operator: '>=', value: '750', enabled: true },
            dti_ratio: { columnKey: 'dti_ratio', operator: '<=', value: '30', enabled: true },
            delinquency_count: { columnKey: 'delinquency_count', operator: '<=', value: '0', enabled: true },
          },
        },
        {
          id: 2,
          categoryName: 'Tier 2 - Prime',
          priority: 2,
          description: 'FICO >= 680, DTI <= 40% and <= 1 delinquency',
          criteria: {
            credit_score: { columnKey: 'credit_score', operator: '>=', value: '680', enabled: true },
            dti_ratio: { columnKey: 'dti_ratio', operator: '<=', value: '40', enabled: true },
            delinquency_count: { columnKey: 'delinquency_count', operator: '<=', value: '1', enabled: true },
          },
        },
        {
          id: 3,
          categoryName: 'Tier 3 - Near Prime',
          priority: 3,
          description: 'FICO >= 620, DTI <= 48%',
          criteria: {
            credit_score: { columnKey: 'credit_score', operator: '>=', value: '620', enabled: true },
            dti_ratio: { columnKey: 'dti_ratio', operator: '<=', value: '48', enabled: true },
            delinquency_count: { columnKey: 'delinquency_count', operator: '<=', value: '', enabled: false },
          },
        },
      ],
      ruleLogic: {
        type: 'all_and',
        primaryGroupOperator: 'AND',
        secondaryGroupOperator: 'AND',
        fallbackCategory: 'Tier 4 - Subprime',
        treatBlankAs: 'unbounded',
      },
      pgConnection: {
        host: 'localhost',
        port: 5432,
        database: 'risk_db',
        user: 'risk_analyst',
        password: '',
        useEnvVars: true,
        ssl: true,
        schema: 'underwriting',
      },
    },
    sampleRows: [
      { id: 'BOR-101', name: 'Eleanor Vance', recordedCategory: 'Tier 1 - Super Prime', metrics: { credit_score: 790, dti_ratio: 24, delinquency_count: 0 } },
      { id: 'BOR-102', name: 'Marcus Brody', recordedCategory: 'Tier 1 - Super Prime', metrics: { credit_score: 710, dti_ratio: 35, delinquency_count: 1 } }, // Mismatch! Should be Tier 2
      { id: 'BOR-103', name: 'Sophia Chen', recordedCategory: 'Tier 2 - Prime', metrics: { credit_score: 695, dti_ratio: 38, delinquency_count: 0 } },
      { id: 'BOR-104', name: 'David Miller', recordedCategory: 'Tier 3 - Near Prime', metrics: { credit_score: 640, dti_ratio: 45, delinquency_count: 2 } },
      { id: 'BOR-105', name: 'Rachel Green', recordedCategory: 'Tier 4 - Subprime', metrics: { credit_score: 580, dti_ratio: 52, delinquency_count: 4 } },
    ],
  },
  {
    id: 'saas-pricing-tiers',
    name: 'SaaS Customer Subscription Tiers',
    description:
      'Categorizes B2B accounts into Starter, Pro, and Enterprise based on active user seats and monthly recurring spend.',
    badge: 'SaaS / B2B',
    config: {
      version: '1.0.0',
      metadata: {
        name: 'SaaS Account Tier Classification',
        description: 'Validates customer plan assignments against usage metrics.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetTable: {
        tableName: 'organization_subscriptions',
        tableAlias: 'org',
        idColumn: 'org_id',
        nameColumn: 'organization_name',
        categoryColumn: 'plan_tier',
        newCategoryColumn: 'plan_tier',
      },
      metricColumns: [
        {
          id: 'col-seats',
          key: 'active_seats',
          name: 'active_seats',
          label: 'Active Seats',
          type: 'integer',
          group: 'primary',
        },
        {
          id: 'col-mrr',
          key: 'monthly_spend',
          name: 'monthly_spend',
          label: 'Monthly Spend ($)',
          type: 'numeric',
          group: 'secondary',
        },
      ],
      categories: [
        {
          id: 1,
          categoryName: 'Starter',
          priority: 1,
          description: 'Seats <= 10 and Monthly Spend <= 500',
          criteria: {
            active_seats: { columnKey: 'active_seats', operator: '<=', value: '10', enabled: true },
            monthly_spend: { columnKey: 'monthly_spend', operator: '<=', value: '500', enabled: true },
          },
        },
        {
          id: 2,
          categoryName: 'Professional',
          priority: 2,
          description: 'Seats <= 100 and Monthly Spend <= 5000',
          criteria: {
            active_seats: { columnKey: 'active_seats', operator: '<=', value: '100', enabled: true },
            monthly_spend: { columnKey: 'monthly_spend', operator: '<=', value: '5000', enabled: true },
          },
        },
      ],
      ruleLogic: {
        type: 'all_and',
        primaryGroupOperator: 'AND',
        secondaryGroupOperator: 'AND',
        fallbackCategory: 'Enterprise Custom',
        treatBlankAs: 'unbounded',
      },
      pgConnection: {
        host: 'localhost',
        port: 5432,
        database: 'billing_db',
        user: 'billing_app',
        password: '',
        useEnvVars: true,
        ssl: false,
        schema: 'public',
      },
    },
    sampleRows: [
      { id: 'ORG-01', name: 'Acme Studio', recordedCategory: 'Starter', metrics: { active_seats: 5, monthly_spend: 250 } },
      { id: 'ORG-02', name: 'Globex Corp', recordedCategory: 'Starter', metrics: { active_seats: 45, monthly_spend: 2200 } }, // Mismatch! Should be Professional
      { id: 'ORG-03', name: 'Initech Systems', recordedCategory: 'Professional', metrics: { active_seats: 80, monthly_spend: 4100 } },
      { id: 'ORG-04', name: 'Omni Consumer Tech', recordedCategory: 'Enterprise Custom', metrics: { active_seats: 450, monthly_spend: 32000 } },
    ],
  },
];
