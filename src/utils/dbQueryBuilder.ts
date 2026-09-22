/**
 * PostgreSQL Query Builder with Single Conditions & Excel/Spreadsheet List Conditions
 * Supports date/time conversions, CTE bulk joins, parameterized scripts, and import/export.
 */

export type ColumnType = 'auto' | 'text' | 'integer' | 'numeric' | 'boolean' | 'date' | 'timestamp' | 'uuid';

export type SingleOperator =
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'LIKE'
  | 'ILIKE'
  | 'NOT LIKE'
  | 'NOT ILIKE'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'IS TRUE'
  | 'IS FALSE'
  | 'BETWEEN'
  | 'NOT BETWEEN'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'CONTAINS';

export type ListOperator = 'IN' | 'NOT IN' | '= ANY' | '!= ALL' | 'VALUES_JOIN';

export type QueryType = 'SELECT' | 'UPDATE' | 'DELETE' | 'COUNT' | 'EXPLAIN';

export interface SingleCondition {
  id: string;
  column: string;
  operator: SingleOperator;
  value: string;
  secondaryValue?: string; // For BETWEEN operators
  type: ColumnType;
  dateFormat?: string; // 'auto' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'
  enabled: boolean;
  logic: 'AND' | 'OR';
}

export interface ListCondition {
  id: string;
  column: string;
  operator: ListOperator;
  rawInput: string; // The pasted text from Excel (newlines, tabs, commas, etc.)
  delimiter: 'auto' | 'newline' | 'tab' | 'comma' | 'whitespace';
  type: ColumnType;
  deduplicate: boolean;
  trimQuotes: boolean;
  castTypeInSql: boolean;
  enabled: boolean;
  logic: 'AND' | 'OR';
}

export interface UpdateAssignment {
  id: string;
  column: string;
  value: string;
  type: ColumnType;
  mode: 'literal' | 'expression';
}

export interface OrderByClause {
  id: string;
  column: string;
  direction: 'ASC' | 'DESC';
  nulls?: 'FIRST' | 'LAST';
}

export interface QueryBuilderConfig {
  version?: string;
  metadata: {
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  targetTable: {
    tableName: string;
    tableAlias: string;
    useTableAlias: boolean;
  };
  queryType: QueryType;
  selectOptions: {
    columns: string[]; // e.g., ['id', 'name', 'status'] or ['*']
    customSelectClause?: string;
    distinct: boolean;
  };
  updateOptions: {
    assignments: UpdateAssignment[];
  };
  singleConditions: SingleCondition[];
  listConditions: ListCondition[];
  orderBy: OrderByClause[];
  limit: string;
  offset: string;
  formatOptions: {
    includeComments: boolean;
    wrapInTransaction: boolean;
    uppercaseKeywords: boolean;
    useCteForLargeLists: boolean;
    cteThreshold: number; // e.g. 50 items
  };
}

// =========================================================================
// DATE & TIME CONVERSION UTILITIES
// =========================================================================

export const DATE_PATTERNS = {
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  dmyDate: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
  // DD/MM/YYYY HH:mm:ss (optional AM/PM)
  dmyDateTime: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i,
  // ISO Date: YYYY-MM-DD
  isoDate: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
  // ISO DateTime: YYYY-MM-DD HH:mm:ss
  isoDateTime: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
};

/**
 * Checks if a string appears to be a date or timestamp format.
 */
export function isLikelyDateOrTime(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim();
  if (
    DATE_PATTERNS.dmyDate.test(s) ||
    DATE_PATTERNS.dmyDateTime.test(s) ||
    DATE_PATTERNS.isoDate.test(s) ||
    DATE_PATTERNS.isoDateTime.test(s)
  ) {
    return true;
  }
  // Check for common SQL date keywords
  const lower = s.toLowerCase();
  return (
    lower === 'current_date' ||
    lower === 'current_timestamp' ||
    lower === 'now()' ||
    lower.startsWith('current_date -') ||
    lower.startsWith('current_date +') ||
    lower.startsWith('now() -') ||
    lower.startsWith('now() +')
  );
}

/**
 * Converts non-standard or user-entered date strings into valid PostgreSQL ISO date / timestamp strings.
 * E.g., '24/10/2023' -> '2023-10-24'
 *       '24/10/2023 15:30:00' -> '2023-10-24 15:30:00'
 */
export function normalizePostgresDate(val: string): { normalized: string; isTimestamp: boolean; isKeyword: boolean } {
  if (!val) return { normalized: '', isTimestamp: false, isKeyword: false };
  const s = val.trim();
  const lower = s.toLowerCase();

  // If already a SQL keyword/expression
  if (
    lower === 'current_date' ||
    lower === 'current_timestamp' ||
    lower === 'now()' ||
    lower.startsWith('current_date -') ||
    lower.startsWith('current_date +') ||
    lower.startsWith('now() -') ||
    lower.startsWith('now() +')
  ) {
    return { normalized: s, isTimestamp: lower.includes('timestamp') || lower.includes('now()'), isKeyword: true };
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(DATE_PATTERNS.dmyDate);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return { normalized: `${year}-${month}-${day}`, isTimestamp: false, isKeyword: false };
  }

  // DD/MM/YYYY HH:mm:ss [AM/PM]
  const dmyTimeMatch = s.match(DATE_PATTERNS.dmyDateTime);
  if (dmyTimeMatch) {
    const day = dmyTimeMatch[1].padStart(2, '0');
    const month = dmyTimeMatch[2].padStart(2, '0');
    const year = dmyTimeMatch[3];
    let hours = parseInt(dmyTimeMatch[4], 10);
    const minutes = dmyTimeMatch[5].padStart(2, '0');
    const seconds = (dmyTimeMatch[6] || '00').padStart(2, '0');
    const ampm = dmyTimeMatch[7]?.toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const formattedHours = String(hours).padStart(2, '0');
    return {
      normalized: `${year}-${month}-${day} ${formattedHours}:${minutes}:${seconds}`,
      isTimestamp: true,
      isKeyword: false,
    };
  }

  // ISO DateTime or ISO Date (already YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
  if (DATE_PATTERNS.isoDateTime.test(s)) {
    return { normalized: s.replace('T', ' '), isTimestamp: true, isKeyword: false };
  }
  if (DATE_PATTERNS.isoDate.test(s)) {
    return { normalized: s, isTimestamp: false, isKeyword: false };
  }

  return { normalized: s, isTimestamp: false, isKeyword: false };
}

// =========================================================================
// EXCEL / SPREADSHEET LIST PARSER
// =========================================================================

/**
 * Parses raw copied text from Excel, Google Sheets, or CSV tables into clean tokens.
 * Handles single-column copy, tab-separated rows, quoted values, commas, and deduplication.
 */
export function parseExcelListInput(
  raw: string,
  options: {
    delimiter?: 'auto' | 'newline' | 'tab' | 'comma' | 'whitespace';
    deduplicate?: boolean;
    trimQuotes?: boolean;
  } = {}
): { values: string[]; detectedType: ColumnType; count: number; duplicatesRemoved: number } {
  if (!raw || typeof raw !== 'string') {
    return { values: [], detectedType: 'text', count: 0, duplicatesRemoved: 0 };
  }

  const { delimiter = 'auto', deduplicate = true, trimQuotes = true } = options;

  let tokens: string[] = [];

  // Determine split pattern
  if (delimiter === 'newline') {
    tokens = raw.split(/\r?\n/);
  } else if (delimiter === 'tab') {
    tokens = raw.split(/\t|\r?\n/);
  } else if (delimiter === 'comma') {
    tokens = raw.split(/,|\r?\n/);
  } else if (delimiter === 'whitespace') {
    tokens = raw.split(/\s+/);
  } else {
    // Auto detect: If newline exists, split by lines first; then check if lines contain tabs or commas
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length > 0) {
      const hasTabs = lines.some((l) => l.includes('\t'));
      const hasCommas = lines.some((l) => l.includes(','));

      if (hasTabs && !hasCommas) {
        tokens = raw.split(/\t|\r?\n/);
      } else if (hasCommas && !hasTabs) {
        tokens = raw.split(/,|\r?\n/);
      } else {
        tokens = lines;
      }
    }
  }

  // Clean tokens
  const cleaned: string[] = [];
  for (let token of tokens) {
    let t = token.trim();
    if (!t) continue;

    if (trimQuotes) {
      // Remove wrapping single or double quotes: e.g. "ABC" -> ABC, '123' -> 123
      t = t.replace(/^["']|["']$/g, '').trim();
    }
    if (t.length > 0) {
      cleaned.push(t);
    }
  }

  // Deduplicate
  let finalValues = cleaned;
  let duplicatesRemoved = 0;
  if (deduplicate) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const item of cleaned) {
      if (!seen.has(item)) {
        seen.add(item);
        unique.push(item);
      } else {
        duplicatesRemoved++;
      }
    }
    finalValues = unique;
  }

  // Infer Column Type from values
  const detectedType = inferListColumnType(finalValues);

  return {
    values: finalValues,
    detectedType,
    count: finalValues.length,
    duplicatesRemoved,
  };
}

/**
 * Infer the best PostgreSQL type from a sample of items in a list.
 */
export function inferListColumnType(values: string[]): ColumnType {
  if (values.length === 0) return 'text';
  const sample = values.slice(0, 50);

  // Check integer
  const isAllInteger = sample.every((v) => /^-?\d+$/.test(v));
  if (isAllInteger) return 'integer';

  // Check numeric / decimal
  const isAllNumeric = sample.every((v) => /^-?\d+(\.\d+)?$/.test(v));
  if (isAllNumeric) return 'numeric';

  // Check boolean
  const isAllBoolean = sample.every((v) => /^(true|false|t|f|1|0)$/i.test(v));
  if (isAllBoolean) return 'boolean';

  // Check UUID
  const isAllUuid = sample.every((v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
  if (isAllUuid) return 'uuid';

  // Check date or timestamp
  const isAllDate = sample.every((v) => isLikelyDateOrTime(v));
  if (isAllDate) {
    const hasTime = sample.some((v) => v.includes(':') || v.includes('T'));
    return hasTime ? 'timestamp' : 'date';
  }

  return 'text';
}

/**
 * Format a value literal according to its PostgreSQL type.
 */
export function formatSqlValue(val: string, type: ColumnType): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  const trimmed = val.trim();

  // If already SQL keyword
  const lower = trimmed.toLowerCase();
  if (lower === 'null') return 'NULL';
  if (lower === 'true' || lower === 'false') return lower;

  switch (type) {
    case 'integer':
    case 'numeric':
      return isNaN(Number(trimmed)) ? `'${trimmed.replace(/'/g, "''")}'` : trimmed;

    case 'boolean':
      return /^(true|t|1)$/i.test(trimmed) ? 'TRUE' : 'FALSE';

    case 'date': {
      const dateNorm = normalizePostgresDate(trimmed);
      if (dateNorm.isKeyword) return dateNorm.normalized;
      return `'${dateNorm.normalized.replace(/'/g, "''")}'::date`;
    }

    case 'timestamp': {
      const timeNorm = normalizePostgresDate(trimmed);
      if (timeNorm.isKeyword) return timeNorm.normalized;
      return `'${timeNorm.normalized.replace(/'/g, "''")}'::timestamp`;
    }

    case 'uuid':
      return `'${trimmed.replace(/'/g, "''")}'::uuid`;

    case 'text':
    default:
      return `'${trimmed.replace(/'/g, "''")}'`;
  }
}

// =========================================================================
// QUERY GENERATION ENGINE
// =========================================================================

export interface GeneratedQueryBundle {
  mainSql: string;
  selectSql: string;
  updateSql: string;
  deleteSql: string;
  countSql: string;
  explainSql: string;
  cteJoinSql: string;
  pythonScript: string;
  activeConditionsCount: number;
  totalListItemsCount: number;
}

/**
 * Generates all SQL queries and Python code from the current QueryBuilderConfig.
 */
export function generatePostgresQueries(config: QueryBuilderConfig): GeneratedQueryBundle {
  const {
    targetTable,
    queryType,
    selectOptions,
    updateOptions,
    singleConditions,
    listConditions,
    orderBy,
    limit,
    offset,
    formatOptions,
  } = config;

  const tableIdentifier = targetTable.useTableAlias
    ? `${targetTable.tableName} ${targetTable.tableAlias}`
    : targetTable.tableName;

  const prefix = targetTable.useTableAlias ? `${targetTable.tableAlias}.` : '';

  // 1. Build WHERE Clauses
  const whereClauses: { clause: string; logic: 'AND' | 'OR' }[] = [];
  let totalListItems = 0;

  // Single Conditions
  singleConditions
    .filter((sc) => sc.enabled && sc.column.trim())
    .forEach((sc) => {
      const colName = `${prefix}${sc.column.trim()}`;
      let conditionSql = '';

      const effectiveType = sc.type === 'auto' ? (isLikelyDateOrTime(sc.value) ? 'date' : 'text') : sc.type;

      switch (sc.operator) {
        case '=':
        case '!=':
        case '<':
        case '<=':
        case '>':
        case '>=':
          conditionSql = `${colName} ${sc.operator} ${formatSqlValue(sc.value, effectiveType)}`;
          break;

        case 'LIKE':
        case 'ILIKE':
        case 'NOT LIKE':
        case 'NOT ILIKE':
          conditionSql = `${colName} ${sc.operator} '${sc.value.replace(/'/g, "''")}'`;
          break;

        case 'STARTS_WITH':
          conditionSql = `${colName} ILIKE '${sc.value.replace(/'/g, "''")}%'`;
          break;

        case 'ENDS_WITH':
          conditionSql = `${colName} ILIKE '%${sc.value.replace(/'/g, "''")}'`;
          break;

        case 'CONTAINS':
          conditionSql = `${colName} ILIKE '%${sc.value.replace(/'/g, "''")}%'`;
          break;

        case 'IS NULL':
          conditionSql = `${colName} IS NULL`;
          break;

        case 'IS NOT NULL':
          conditionSql = `${colName} IS NOT NULL`;
          break;

        case 'IS TRUE':
          conditionSql = `${colName} IS TRUE`;
          break;

        case 'IS FALSE':
          conditionSql = `${colName} IS FALSE`;
          break;

        case 'BETWEEN':
        case 'NOT BETWEEN': {
          const val1 = formatSqlValue(sc.value, effectiveType);
          const val2 = formatSqlValue(sc.secondaryValue || '', effectiveType);
          conditionSql = `${colName} ${sc.operator} ${val1} AND ${val2}`;
          break;
        }

        default:
          conditionSql = `${colName} = ${formatSqlValue(sc.value, effectiveType)}`;
      }

      if (conditionSql) {
        whereClauses.push({ clause: conditionSql, logic: sc.logic });
      }
    });

  // List Conditions
  listConditions
    .filter((lc) => lc.enabled && lc.column.trim())
    .forEach((lc) => {
      const colName = `${prefix}${lc.column.trim()}`;
      const parsed = parseExcelListInput(lc.rawInput, {
        delimiter: lc.delimiter,
        deduplicate: lc.deduplicate,
        trimQuotes: lc.trimQuotes,
      });

      totalListItems += parsed.values.length;

      if (parsed.values.length === 0) return;

      const effectiveType = lc.type === 'auto' ? parsed.detectedType : lc.type;
      const formattedItems = parsed.values.map((v) => formatSqlValue(v, effectiveType));

      let conditionSql = '';

      if (lc.operator === 'IN' || lc.operator === 'NOT IN') {
        // If items are many (e.g., > 100), format nicely with indent
        if (formattedItems.length > 5) {
          conditionSql = `${colName} ${lc.operator} (\n    ${formattedItems.join(',\n    ')}\n  )`;
        } else {
          conditionSql = `${colName} ${lc.operator} (${formattedItems.join(', ')})`;
        }
      } else if (lc.operator === '= ANY' || lc.operator === '!= ALL') {
        const op = lc.operator === '= ANY' ? '= ANY' : '!= ALL';
        conditionSql = `${colName} ${op}(ARRAY[\n    ${formattedItems.join(',\n    ')}\n  ])`;
      } else if (lc.operator === 'VALUES_JOIN') {
        // Used in CTE join representation
        conditionSql = `${colName} IN (SELECT filter_val FROM _filter_list_${lc.column.replace(/[^a-z0-9_]/gi, '')})`;
      }

      if (conditionSql) {
        whereClauses.push({ clause: conditionSql, logic: lc.logic });
      }
    });

  // Combine WHERE clauses with AND/OR
  let whereSql = '';
  if (whereClauses.length > 0) {
    let combined = whereClauses[0].clause;
    for (let i = 1; i < whereClauses.length; i++) {
      const item = whereClauses[i];
      combined += `\n  ${item.logic} ${item.clause}`;
    }
    whereSql = `WHERE\n  ${combined}`;
  }

  // 2. Build SELECT projection
  let selectProjection = '*';
  if (selectOptions.customSelectClause && selectOptions.customSelectClause.trim()) {
    selectProjection = selectOptions.customSelectClause.trim();
  } else if (selectOptions.columns && selectOptions.columns.length > 0) {
    selectProjection = selectOptions.columns.map((c) => (c.includes('.') ? c : `${prefix}${c}`)).join(', ');
  }

  // Distinct
  const distinctClause = selectOptions.distinct ? 'DISTINCT ' : '';

  // Order By
  let orderBySql = '';
  if (orderBy && orderBy.length > 0) {
    const validOrders = orderBy.filter((o) => o.column.trim());
    if (validOrders.length > 0) {
      const orderItems = validOrders.map((o) => {
        const col = o.column.includes('.') ? o.column : `${prefix}${o.column}`;
        const nulls = o.nulls ? ` NULLS ${o.nulls}` : '';
        return `${col} ${o.direction}${nulls}`;
      });
      orderBySql = `ORDER BY ${orderItems.join(', ')}`;
    }
  }

  // Limit & Offset
  const limitSql = limit && !isNaN(Number(limit)) ? `LIMIT ${limit}` : '';
  const offsetSql = offset && !isNaN(Number(offset)) ? `OFFSET ${offset}` : '';

  // 3. Construct Complete SELECT Query
  const selectQueryParts: string[] = [
    `SELECT ${distinctClause}${selectProjection}`,
    `FROM ${tableIdentifier}`,
  ];
  if (whereSql) selectQueryParts.push(whereSql);
  if (orderBySql) selectQueryParts.push(orderBySql);
  if (limitSql) selectQueryParts.push(limitSql);
  if (offsetSql) selectQueryParts.push(offsetSql);
  const selectSql = selectQueryParts.join('\n') + ';';

  // 4. Construct UPDATE Query
  const updateAssignmentsList = updateOptions.assignments.filter((a) => a.column.trim());
  let updateAssignmentsSql = '';
  if (updateAssignmentsList.length > 0) {
    const assignments = updateAssignmentsList.map((a) => {
      const val =
        a.mode === 'expression'
          ? a.value
          : formatSqlValue(a.value, a.type === 'auto' ? 'text' : a.type);
      return `  ${a.column.trim()} = ${val}`;
    });
    updateAssignmentsSql = assignments.join(',\n');
  } else {
    updateAssignmentsSql = `  updated_at = CURRENT_TIMESTAMP`;
  }

  const updateParts: string[] = [`UPDATE ${targetTable.tableName}`, `SET\n${updateAssignmentsSql}`];
  if (whereSql) {
    // If table alias was used, strip alias from WHERE for simple UPDATE
    const cleanWhere = targetTable.useTableAlias
      ? whereSql.replace(new RegExp(`\\b${targetTable.tableAlias}\\.`, 'g'), '')
      : whereSql;
    updateParts.push(cleanWhere);
  }
  const updateSql = updateParts.join('\n') + ';';

  // 5. Construct DELETE Query
  const deleteParts: string[] = [`DELETE FROM ${targetTable.tableName}`];
  if (whereSql) {
    const cleanWhere = targetTable.useTableAlias
      ? whereSql.replace(new RegExp(`\\b${targetTable.tableAlias}\\.`, 'g'), '')
      : whereSql;
    deleteParts.push(cleanWhere);
  }
  const deleteSql = deleteParts.join('\n') + ';';

  // 6. Construct COUNT Query
  const countParts: string[] = [`SELECT COUNT(*) AS total_matching_records`, `FROM ${tableIdentifier}`];
  if (whereSql) countParts.push(whereSql);
  const countSql = countParts.join('\n') + ';';

  // 7. Construct EXPLAIN Query
  const explainSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)\n${selectSql}`;

  // 8. Construct CTE / Bulk VALUES Join Query (Optimized for 1000s of rows from Excel)
  let cteJoinSql = '';
  const firstList = listConditions.find((lc) => lc.enabled && lc.column.trim());
  if (firstList) {
    const parsed = parseExcelListInput(firstList.rawInput, {
      delimiter: firstList.delimiter,
      deduplicate: firstList.deduplicate,
      trimQuotes: firstList.trimQuotes,
    });
    const effectiveType = firstList.type === 'auto' ? parsed.detectedType : firstList.type;
    const valuesRows = parsed.values.map((v) => `  (${formatSqlValue(v, effectiveType)})`).join(',\n');

    cteJoinSql = `-- High-Performance CTE Join for Bulk Excel Lists (${parsed.values.length} items)
WITH filter_values(filter_key) AS (
  VALUES
${valuesRows}
)
SELECT ${distinctClause}${selectProjection}
FROM ${tableIdentifier}
JOIN filter_values fv ON ${prefix}${firstList.column.trim()} = fv.filter_key`;

    const remainingWheres = whereClauses.filter((w) => !w.clause.includes(firstList.column.trim()));
    if (remainingWheres.length > 0) {
      let combined = remainingWheres[0].clause;
      for (let i = 1; i < remainingWheres.length; i++) {
        combined += `\n  ${remainingWheres[i].logic} ${remainingWheres[i].clause}`;
      }
      cteJoinSql += `\nWHERE\n  ${combined}`;
    }
    if (orderBySql) cteJoinSql += `\n${orderBySql}`;
    if (limitSql) cteJoinSql += `\n${limitSql}`;
    cteJoinSql += ';';
  } else {
    cteJoinSql = `-- Add a list condition to generate a high-performance CTE Bulk Join\n${selectSql}`;
  }

  // 9. Main SQL according to selected queryType
  let mainSql = selectSql;
  if (queryType === 'UPDATE') mainSql = updateSql;
  else if (queryType === 'DELETE') mainSql = deleteSql;
  else if (queryType === 'COUNT') mainSql = countSql;
  else if (queryType === 'EXPLAIN') mainSql = explainSql;

  if (formatOptions.wrapInTransaction && queryType !== 'EXPLAIN' && queryType !== 'COUNT') {
    mainSql = `BEGIN;\n\n${mainSql}\n\nCOMMIT;`;
  }

  // 10. Generate Python Script (using pg8000.native with parameterized execution)
  const pythonScript = generatePythonQueryScript(config, mainSql);

  return {
    mainSql,
    selectSql,
    updateSql,
    deleteSql,
    countSql,
    explainSql,
    cteJoinSql,
    pythonScript,
    activeConditionsCount: whereClauses.length,
    totalListItemsCount: totalListItems,
  };
}

/**
 * Generates a production-ready Python script using pg8000 for parameterized execution.
 */
export function generatePythonQueryScript(config: QueryBuilderConfig, generatedSql: string): string {
  const { targetTable, singleConditions, listConditions } = config;

  return `#!/usr/bin/env python3
"""
PostgreSQL Query Runner & Condition Validator
Generated for Table: "${targetTable.tableName}"
Database Driver: pg8000 (pip install pg8000)
"""

import os
import sys
import json
import argparse
from datetime import datetime

try:
    import pg8000.native
except ImportError:
    print("[ERROR] pg8000 library is required. Install it using:")
    print("        pip install pg8000")
    sys.exit(1)

# Connection Configuration
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = int(os.getenv("PG_PORT", 5432))
PG_DATABASE = os.getenv("PG_DATABASE", "postgres")
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "")
PG_SSL = os.getenv("PG_SSL", "False").lower() in ("true", "1", "yes")

# Target Query
SQL_QUERY = """
${generatedSql.trim()}
"""

def execute_query(dry_run: bool = False, json_output: bool = False):
    print("=" * 70)
    print(f"[*] Connecting to PostgreSQL ({PG_USER}@{PG_HOST}:{PG_PORT}/{PG_DATABASE})")
    print("=" * 70)

    if dry_run:
        print("[DRY RUN MODE] Query will not be executed against server:")
        print(SQL_QUERY)
        return

    try:
        con = pg8000.native.Connection(
            user=PG_USER,
            host=PG_HOST,
            port=PG_PORT,
            database=PG_DATABASE,
            password=PG_PASSWORD,
            ssl_context=PG_SSL
        )
        print("[+] Connected successfully!")
        print(f"[*] Executing SQL query...")

        start_time = datetime.now()
        results = con.run(SQL_QUERY)
        elapsed = (datetime.now() - start_time).total_seconds()

        print(f"[✓] Query executed in {elapsed:.3f}s. Rows returned/affected: {len(results) if isinstance(results, list) else 'N/A'}")

        if isinstance(results, list) and len(results) > 0:
            if json_output:
                print(json.dumps(results, default=str, indent=2))
            else:
                print("-" * 70)
                print(f"First 10 sample results:")
                for idx, row in enumerate(results[:10]):
                    print(f"  Row {idx + 1}: {row}")
                if len(results) > 10:
                    print(f"  ... and {len(results) - 10} more rows.")
                print("-" * 70)

        con.close()
    except Exception as exc:
        print(f"[!] Database Execution Error: {exc}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Execute PostgreSQL generated query")
    parser.add_argument("--dry-run", action="store_true", help="Print SQL without executing")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()

    execute_query(dry_run=args.dry_run, json_output=args.json)
`;
}

// =========================================================================
// CONFIGURATION IMPORT / EXPORT & PRESETS
// =========================================================================

export const DEFAULT_QUERY_BUILDER_CONFIG: QueryBuilderConfig = {
  version: '1.0.0',
  metadata: {
    name: 'Customer Orders Multi-Condition Query',
    description: 'Filter orders by status, date range, and a bulk pasted list of customer IDs copied from Excel',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  targetTable: {
    tableName: 'customer_orders',
    tableAlias: 'o',
    useTableAlias: true,
  },
  queryType: 'SELECT',
  selectOptions: {
    columns: ['id', 'customer_id', 'order_status', 'total_amount', 'currency', 'created_at'],
    distinct: false,
  },
  updateOptions: {
    assignments: [
      { id: 'u1', column: 'order_status', value: 'PROCESSING', type: 'text', mode: 'literal' },
      { id: 'u2', column: 'updated_at', value: 'CURRENT_TIMESTAMP', type: 'timestamp', mode: 'expression' },
    ],
  },
  singleConditions: [
    {
      id: 'sc-1',
      column: 'order_status',
      operator: '=',
      value: 'PAID',
      type: 'text',
      enabled: true,
      logic: 'AND',
    },
    {
      id: 'sc-2',
      column: 'created_at',
      operator: '>=',
      value: '24/10/2023', // Testing date format DD/MM/YYYY
      type: 'date',
      enabled: true,
      logic: 'AND',
    },
    {
      id: 'sc-3',
      column: 'total_amount',
      operator: '>',
      value: '50.00',
      type: 'numeric',
      enabled: true,
      logic: 'AND',
    },
  ],
  listConditions: [
    {
      id: 'lc-1',
      column: 'customer_id',
      operator: 'IN',
      rawInput: `1001\n1005\n1020\n1045\n1089\n1112\n1150\n1200`,
      delimiter: 'auto',
      type: 'integer',
      deduplicate: true,
      trimQuotes: true,
      castTypeInSql: false,
      enabled: true,
      logic: 'AND',
    },
  ],
  orderBy: [
    { id: 'ob-1', column: 'created_at', direction: 'DESC', nulls: 'LAST' },
  ],
  limit: '100',
  offset: '',
  formatOptions: {
    includeComments: true,
    wrapInTransaction: false,
    uppercaseKeywords: true,
    useCteForLargeLists: true,
    cteThreshold: 50,
  },
};

export interface QueryBuilderPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  config: QueryBuilderConfig;
}

export const QUERY_BUILDER_PRESETS: QueryBuilderPreset[] = [
  {
    id: 'orders-audit',
    name: 'Customer Orders Filter',
    badge: 'E-Commerce / ERP',
    description: 'Filter orders by status, date range, and pasted customer ID list',
    config: DEFAULT_QUERY_BUILDER_CONFIG,
  },
  {
    id: 'financial-transactions',
    name: 'Financial Transactions Audit',
    badge: 'Banking & Ledger',
    description: 'Audit high-value ledger transactions matching pasted account numbers with BETWEEN date range',
    config: {
      version: '1.0.0',
      metadata: {
        name: 'Financial Transactions Audit',
        description: 'Audit high-value ledger transactions matching pasted account numbers',
      },
      targetTable: {
        tableName: 'financial_transactions',
        tableAlias: 't',
        useTableAlias: true,
      },
      queryType: 'SELECT',
      selectOptions: {
        columns: ['transaction_id', 'account_no', 'amount', 'currency', 'status', 'value_date'],
        distinct: false,
      },
      updateOptions: { assignments: [] },
      singleConditions: [
        {
          id: 'ft-1',
          column: 'amount',
          operator: '>=',
          value: '10000.00',
          type: 'numeric',
          enabled: true,
          logic: 'AND',
        },
        {
          id: 'ft-2',
          column: 'value_date',
          operator: 'BETWEEN',
          value: '01/01/2024',
          secondaryValue: '31/03/2024',
          type: 'date',
          enabled: true,
          logic: 'AND',
        },
        {
          id: 'ft-3',
          column: 'status',
          operator: '!=',
          value: 'REVERSED',
          type: 'text',
          enabled: true,
          logic: 'AND',
        },
      ],
      listConditions: [
        {
          id: 'ft-lc-1',
          column: 'account_no',
          operator: 'IN',
          rawInput: `ACC-9001\nACC-9002\nACC-9005\nACC-9010\nACC-9022`,
          delimiter: 'auto',
          type: 'text',
          deduplicate: true,
          trimQuotes: true,
          castTypeInSql: false,
          enabled: true,
          logic: 'AND',
        },
      ],
      orderBy: [{ id: 'ft-ob', column: 'value_date', direction: 'DESC' }],
      limit: '500',
      offset: '',
      formatOptions: {
        includeComments: true,
        wrapInTransaction: false,
        uppercaseKeywords: true,
        useCteForLargeLists: true,
        cteThreshold: 50,
      },
    },
  },
  {
    id: 'user-access-security',
    name: 'User Security & Access Audit',
    badge: 'Security & Auth',
    description: 'Find active users with email lists from spreadsheet needing 2FA or password resets',
    config: {
      version: '1.0.0',
      metadata: {
        name: 'User Security & Access Audit',
        description: 'Verify security statuses for email batches copied from corporate directory',
      },
      targetTable: {
        tableName: 'users',
        tableAlias: 'u',
        useTableAlias: true,
      },
      queryType: 'SELECT',
      selectOptions: {
        columns: ['id', 'email', 'role', 'is_active', 'last_login_at', 'failed_attempts'],
        distinct: false,
      },
      updateOptions: { assignments: [] },
      singleConditions: [
        {
          id: 'usr-1',
          column: 'is_active',
          operator: 'IS TRUE',
          value: '',
          type: 'boolean',
          enabled: true,
          logic: 'AND',
        },
        {
          id: 'usr-2',
          column: 'last_login_at',
          operator: '<',
          value: '01/01/2023 00:00:00',
          type: 'timestamp',
          enabled: true,
          logic: 'AND',
        },
      ],
      listConditions: [
        {
          id: 'usr-lc-1',
          column: 'email',
          operator: 'IN',
          rawInput: `"sarah@company.com"\n"david@company.com"\n"alex@company.com"\n"elena@company.com"`,
          delimiter: 'auto',
          type: 'text',
          deduplicate: true,
          trimQuotes: true,
          castTypeInSql: false,
          enabled: true,
          logic: 'AND',
        },
      ],
      orderBy: [{ id: 'usr-ob', column: 'last_login_at', direction: 'ASC' }],
      limit: '',
      offset: '',
      formatOptions: {
        includeComments: true,
        wrapInTransaction: false,
        uppercaseKeywords: true,
        useCteForLargeLists: true,
        cteThreshold: 50,
      },
    },
  },
];

/**
 * Creates exportable JSON string for QueryBuilderConfig.
 */
export function createDbQueryBuilderExport(config: QueryBuilderConfig): string {
  const payload = {
    ...config,
    metadata: {
      ...config.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and parses a JSON string into a valid QueryBuilderConfig.
 */
export function validateAndParseDbQueryBuilderConfig(jsonStr: string): {
  success: boolean;
  config?: QueryBuilderConfig;
  error?: string;
} {
  try {
    if (!jsonStr || !jsonStr.trim()) {
      return { success: false, error: 'Input is empty.' };
    }
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Configuration must be a valid JSON object.' };
    }

    if (!parsed.targetTable || typeof parsed.targetTable.tableName !== 'string' || !parsed.targetTable.tableName.trim()) {
      return { success: false, error: 'Missing or invalid targetTable.tableName in configuration.' };
    }

    // Ensure array integrity
    const singleConditions = Array.isArray(parsed.singleConditions) ? parsed.singleConditions : [];
    const listConditions = Array.isArray(parsed.listConditions) ? parsed.listConditions : [];
    const orderBy = Array.isArray(parsed.orderBy) ? parsed.orderBy : [];

    const config: QueryBuilderConfig = {
      version: parsed.version || '1.0.0',
      metadata: {
        name: parsed.metadata?.name || `${parsed.targetTable.tableName} Query Config`,
        description: parsed.metadata?.description || '',
        createdAt: parsed.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetTable: {
        tableName: parsed.targetTable.tableName.trim(),
        tableAlias: parsed.targetTable.tableAlias || '',
        useTableAlias: parsed.targetTable.useTableAlias ?? (parsed.targetTable.tableAlias?.trim() !== ''),
      },
      queryType: parsed.queryType || 'SELECT',
      selectOptions: {
        columns: Array.isArray(parsed.selectOptions?.columns) ? parsed.selectOptions.columns : ['*'],
        customSelectClause: parsed.selectOptions?.customSelectClause || '',
        distinct: Boolean(parsed.selectOptions?.distinct),
      },
      updateOptions: {
        assignments: Array.isArray(parsed.updateOptions?.assignments) ? parsed.updateOptions.assignments : [],
      },
      singleConditions,
      listConditions,
      orderBy,
      limit: parsed.limit !== undefined ? String(parsed.limit) : '100',
      offset: parsed.offset !== undefined ? String(parsed.offset) : '',
      formatOptions: {
        includeComments: parsed.formatOptions?.includeComments ?? true,
        wrapInTransaction: parsed.formatOptions?.wrapInTransaction ?? false,
        uppercaseKeywords: parsed.formatOptions?.uppercaseKeywords ?? true,
        useCteForLargeLists: parsed.formatOptions?.useCteForLargeLists ?? true,
        cteThreshold: parsed.formatOptions?.cteThreshold || 50,
      },
    };

    return { success: true, config };
  } catch (err: any) {
    return { success: false, error: `Invalid JSON syntax: ${err.message}` };
  }
}
