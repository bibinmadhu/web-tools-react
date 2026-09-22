/**
 * Database Update Query Generator for PostgreSQL
 * 
 * Supports generating high-performance batch UPDATE queries, individual transaction-safe statements,
 * CASE-WHEN conditional updates, and CTE-based updates for PostgreSQL.
 */

export type ColumnType =
  | 'text'
  | 'integer'
  | 'numeric'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'jsonb'
  | 'uuid'
  | 'raw';

export type ValueMode = 'list' | 'single';

export type QueryExecutionMode = 'batch' | 'individual';

export type UpdateStrategy =
  | 'batch_values' // UPDATE ... FROM (VALUES (...), (...)) AS v(...) WHERE ...
  | 'individual'   // Multiple individual UPDATE ... SET ... WHERE ...;
  | 'case_when'    // UPDATE ... SET col = CASE key WHEN ... THEN ... END WHERE key IN (...)
  | 'cte';         // WITH updates (key, col1) AS (VALUES (...)) UPDATE ...

export type TransactionMode = 'none' | 'commit' | 'rollback';

export interface MatchColumn {
  id: string;
  name: string;
  type: ColumnType;
  valueMode?: ValueMode; // 'single' (constant filter for all rows) or 'list' (per-row matched values)
  singleValue?: string;  // value used when valueMode === 'single'
  values: string[];      // list of values used when valueMode === 'list'
}

export interface UpdateColumn {
  id: string;
  name: string;
  type: ColumnType;
  values: string[];
}

export interface UpdateQueryOptions {
  tableName: string;
  schema?: string;
  matchColumns: MatchColumn[];
  updateColumns: UpdateColumn[];
  executionMode?: QueryExecutionMode; // 'batch' (single atomic query) or 'individual' (separate statements)
  strategy: UpdateStrategy;
  transactionMode: TransactionMode;
  returningClause?: string;
  includeTypeCasts?: boolean;
  tableAlias?: string;
  valuesAlias?: string;
  includeRowComments?: boolean; // include '-- Row N' comments in individual statements
}

export interface UpdateQueryResult {
  sql: string;
  rowCount: number;
  columnCount: number;
  matchColumnCount: number;
  singleMatchCount: number;
  listMatchCount: number;
  warnings: string[];
  executionMode: QueryExecutionMode;
  strategy: UpdateStrategy;
  pythonSnippet: string;
}

/**
 * Helper to retrieve the effective value of a match column for a given row
 */
export function getMatchColumnValue(col: MatchColumn, rowIndex = 0): string {
  if (col.valueMode === 'single') {
    if (col.singleValue !== undefined && col.singleValue !== null) {
      return col.singleValue;
    }
    return col.values && col.values.length > 0 ? col.values[0] : '';
  }
  return col.values && col.values[rowIndex] !== undefined ? col.values[rowIndex] : '';
}

/**
 * Clean and normalize SQL identifiers (tables, columns)
 */
export function sanitizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  // If it already has quotes or schema dots, preserve valid parts
  if (trimmed.includes('.')) {
    return trimmed
      .split('.')
      .map((part) => sanitizeIdentifier(part))
      .join('.');
  }
  // If identifier has special chars or uppercase that requires quotes
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  return `"${trimmed.replace(/"/g, '""')}"`;
}

/**
 * Detects if a date string is in non-ISO format (e.g. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, MM/DD/YYYY)
 */
export function isNonIsoDateFormat(rawVal: string | undefined | null): boolean {
  if (!rawVal) return false;
  const trimmed = rawVal.trim().replace(/^['"]|['"]$/g, '').trim();
  // e.g. "24/10/2023", "24-10-2023", "24.10.2023", "24/10/23"
  return /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})/.test(trimmed);
}

/**
 * Normalizes a date string to standard ISO 'YYYY-MM-DD' for PostgreSQL.
 * Seamlessly handles DD/MM/YYYY (e.g., '24/10/2023'), DD-MM-YYYY, DD.MM.YYYY,
 * MM/DD/YYYY (when day > 12), 2-digit years, and strings with timestamps.
 */
export function normalizePostgresDate(rawVal: string): string {
  if (!rawVal) return rawVal;
  const trimmed = rawVal.trim().replace(/^['"]|['"]$/g, '').trim();
  if (!trimmed) return trimmed;

  const upper = trimmed.toUpperCase();
  if (
    upper === 'NULL' ||
    upper === 'NOW()' ||
    upper === 'CURRENT_DATE' ||
    upper === 'CURRENT_TIMESTAMP' ||
    upper === 'DEFAULT'
  ) {
    return trimmed;
  }

  // Split date and time (if any)
  const parts = trimmed.split(/[ T]+/);
  const datePart = parts[0];

  const parsed = parseDateParts(datePart);
  if (!parsed) {
    return trimmed;
  }

  return `${parsed.year}-${parsed.month.padStart(2, '0')}-${parsed.day.padStart(2, '0')}`;
}

/**
 * Normalizes a timestamp string to standard ISO 'YYYY-MM-DD HH:MM:SS' for PostgreSQL.
 * Converts date components like '24/10/2023' to '2023-10-24' and preserves or defaults time components.
 */
export function normalizePostgresTimestamp(rawVal: string): string {
  if (!rawVal) return rawVal;
  const trimmed = rawVal.trim().replace(/^['"]|['"]$/g, '').trim();
  if (!trimmed) return trimmed;

  const upper = trimmed.toUpperCase();
  if (
    upper === 'NULL' ||
    upper === 'NOW()' ||
    upper === 'CURRENT_DATE' ||
    upper === 'CURRENT_TIMESTAMP' ||
    upper === 'DEFAULT'
  ) {
    return trimmed;
  }

  const parts = trimmed.split(/[ T]+/);
  const datePart = parts[0];
  const timePart = parts.length > 1 ? parts.slice(1).join(' ') : '';

  const parsed = parseDateParts(datePart);
  if (!parsed) {
    return trimmed;
  }

  const isoDate = `${parsed.year}-${parsed.month.padStart(2, '0')}-${parsed.day.padStart(2, '0')}`;
  if (!timePart) {
    return `${isoDate} 00:00:00`;
  }

  let cleanTime = timePart;
  if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
    cleanTime = `${cleanTime}:00`;
  }
  return `${isoDate} ${cleanTime}`;
}

function parseDateParts(dateStr: string): { year: string; month: string; day: string } | null {
  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    return {
      year: ymdMatch[1],
      month: ymdMatch[2],
      day: ymdMatch[3],
    };
  }

  // Pattern 2: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or with 2-digit year (e.g. 24/10/2023, 24/10/23)
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    let yearNum = parseInt(dmyMatch[3], 10);

    // Expand 2-digit year (e.g., 23 -> 2023, 99 -> 1999)
    if (yearNum < 100) {
      yearNum = yearNum >= 70 ? 1900 + yearNum : 2000 + yearNum;
    }

    let day = p1;
    let month = p2;
    // If second part > 12 and first part <= 12, it is MM/DD/YYYY (e.g. 10/24/2023)
    if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    }

    return {
      year: String(yearNum),
      month: String(month),
      day: String(day),
    };
  }

  return null;
}

/**
 * Formats a value according to its PostgreSQL column data type
 */
export function formatPostgresValue(
  rawVal: string | undefined | null,
  type: ColumnType,
  forceCast = false
): string {
  if (rawVal === undefined || rawVal === null) {
    return 'NULL';
  }

  const val = rawVal.trim();

  // If explicitly null keyword or empty for non-string
  if (val.toUpperCase() === 'NULL' || (val === '' && type !== 'text')) {
    return forceCast && type !== 'raw' ? `NULL::${getPostgresTypeCast(type)}` : 'NULL';
  }

  switch (type) {
    case 'text': {
      // Escape single quotes by doubling them: ' -> ''
      const escaped = val.replace(/'/g, "''");
      const res = `'${escaped}'`;
      return forceCast ? `${res}::text` : res;
    }

    case 'integer': {
      // Parse or sanitize integer
      const cleaned = val.replace(/[^\d-]/g, '');
      const num = parseInt(cleaned, 10);
      if (isNaN(num)) return 'NULL';
      return forceCast ? `${num}::int` : String(num);
    }

    case 'numeric': {
      // Parse decimal number
      const cleaned = val.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      if (isNaN(num)) return 'NULL';
      return forceCast ? `${num}::numeric` : String(num);
    }

    case 'boolean': {
      const lower = val.toLowerCase();
      if (['true', 't', '1', 'yes', 'y'].includes(lower)) return 'TRUE';
      if (['false', 'f', '0', 'no', 'n'].includes(lower)) return 'FALSE';
      return 'NULL';
    }

    case 'timestamp': {
      const upper = val.toUpperCase();
      if (upper === 'NOW()' || upper === 'CURRENT_TIMESTAMP' || upper === 'DEFAULT') {
        return val;
      }
      const normalized = normalizePostgresTimestamp(val);
      const escaped = normalized.replace(/'/g, "''");
      return `'${escaped}'::timestamp`;
    }

    case 'date': {
      const upper = val.toUpperCase();
      if (upper === 'CURRENT_DATE' || upper === 'NOW()' || upper === 'DEFAULT') {
        return val;
      }
      const normalized = normalizePostgresDate(val);
      const escaped = normalized.replace(/'/g, "''");
      return `'${escaped}'::date`;
    }

    case 'jsonb': {
      // Check if valid json or wrap as json string
      const escaped = val.replace(/'/g, "''");
      return `'${escaped}'::jsonb`;
    }

    case 'uuid': {
      const escaped = val.replace(/'/g, "''");
      return `'${escaped}'::uuid`;
    }

    case 'raw': {
      // Raw expression (e.g. NOW(), DEFAULT, price * 1.1)
      return val || 'NULL';
    }

    default: {
      const escaped = val.replace(/'/g, "''");
      return `'${escaped}'`;
    }
  }
}

/**
 * Returns PostgreSQL standard type name for casting
 */
export function getPostgresTypeCast(type: ColumnType): string {
  switch (type) {
    case 'text':
      return 'text';
    case 'integer':
      return 'int';
    case 'numeric':
      return 'numeric';
    case 'boolean':
      return 'boolean';
    case 'timestamp':
      return 'timestamp';
    case 'date':
      return 'date';
    case 'jsonb':
      return 'jsonb';
    case 'uuid':
      return 'uuid';
    case 'raw':
      return '';
    default:
      return 'text';
  }
}

/**
 * Parse multi-line or comma/tab separated strings into array of individual value strings
 */
export function parseDelimitedValues(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  // Check if multiple lines exist
  if (raw.includes('\n')) {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line, idx, arr) => line !== '' || idx < arr.length - 1);
  }

  // Check if comma separated (with no newlines)
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((item) => item.trim());
  }

  // Check if tab separated
  if (raw.includes('\t')) {
    return raw
      .split('\t')
      .map((item) => item.trim());
  }

  return [raw.trim()];
}

/**
 * Infers likely ColumnType from an array of sample values
 */
export function inferColumnType(values: string[]): ColumnType {
  const nonEmpties = values.map((v) => v.trim()).filter((v) => v !== '' && v.toUpperCase() !== 'NULL');
  if (nonEmpties.length === 0) return 'text';

  // Check boolean
  const allBool = nonEmpties.every((v) => ['true', 'false', 't', 'f', '1', '0'].includes(v.toLowerCase()));
  if (allBool) return 'boolean';

  // Check integer
  const allInt = nonEmpties.every((v) => /^-?\d+$/.test(v));
  if (allInt) return 'integer';

  // Check numeric/decimal
  const allNumeric = nonEmpties.every((v) => /^-?\d+(\.\d+)?$/.test(v));
  if (allNumeric) return 'numeric';

  // Check UUID
  const allUuid = nonEmpties.every((v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
  if (allUuid) return 'uuid';

  // Check Date/Timestamp (ISO format and DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, etc.)
  const isDateOrTimestampStr = (v: string) => {
    const trimmed = v.trim().replace(/^['"]|['"]$/g, '').trim();
    if (
      trimmed.toUpperCase() === 'NOW()' ||
      trimmed.toUpperCase() === 'CURRENT_DATE' ||
      trimmed.toUpperCase() === 'CURRENT_TIMESTAMP'
    ) {
      return true;
    }
    // ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?)?/.test(trimmed)) {
      return true;
    }
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY or 2-digit year (e.g. 24/10/2023, 24/10/23)
    if (/^\d{1,2}[-/.]\d{1,2}[-/.](\d{4}|\d{2})([ T]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?)?/.test(trimmed)) {
      return true;
    }
    return false;
  };

  const allTimestamp = nonEmpties.every(isDateOrTimestampStr);
  if (allTimestamp) {
    const hasTime = nonEmpties.some((v) => v.includes(':'));
    return hasTime ? 'timestamp' : 'date';
  }

  // Check JSON
  const allJson = nonEmpties.every((v) => (v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']')));
  if (allJson) return 'jsonb';

  return 'text';
}

/**
 * Generates the PostgreSQL update query based on the specified options
 */
export function generatePostgresUpdateQuery(options: UpdateQueryOptions): UpdateQueryResult {
  const warnings: string[] = [];
  const rawTable = options.tableName.trim();

  // Execution mode: batch (single query) vs individual (separate queries)
  const executionMode: QueryExecutionMode =
    options.executionMode || (options.strategy === 'individual' ? 'individual' : 'batch');

  const effectiveStrategy: UpdateStrategy =
    executionMode === 'individual'
      ? 'individual'
      : options.strategy === 'individual'
      ? 'batch_values'
      : options.strategy;

  if (!rawTable) {
    return {
      sql: '-- Error: Target table name is required.',
      rowCount: 0,
      columnCount: 0,
      matchColumnCount: 0,
      singleMatchCount: 0,
      listMatchCount: 0,
      warnings: ['Target table name is required.'],
      executionMode,
      strategy: effectiveStrategy,
      pythonSnippet: '',
    };
  }

  const tableName = sanitizeIdentifier(rawTable);
  const tableAlias = options.tableAlias?.trim() || 't';
  const valuesAlias = options.valuesAlias?.trim() || 'v';

  const matchCols = options.matchColumns.filter((c) => c.name.trim().length > 0);
  const updateCols = options.updateColumns.filter((c) => c.name.trim().length > 0);

  const singleMatchCols = matchCols.filter((c) => c.valueMode === 'single');
  const listMatchCols = matchCols.filter((c) => c.valueMode !== 'single');

  if (matchCols.length === 0) {
    return {
      sql: '-- Error: At least one match column (WHERE condition) is required.',
      rowCount: 0,
      columnCount: updateCols.length,
      matchColumnCount: 0,
      singleMatchCount: 0,
      listMatchCount: 0,
      warnings: ['At least one match column (WHERE condition) is required.'],
      executionMode,
      strategy: effectiveStrategy,
      pythonSnippet: '',
    };
  }

  if (updateCols.length === 0) {
    return {
      sql: '-- Error: At least one column to update (SET condition) is required.',
      rowCount: 0,
      columnCount: 0,
      matchColumnCount: matchCols.length,
      singleMatchCount: singleMatchCols.length,
      listMatchCount: listMatchCols.length,
      warnings: ['At least one column to update is required.'],
      executionMode,
      strategy: effectiveStrategy,
      pythonSnippet: '',
    };
  }

  // Determine total row count from longest list match column or update column list
  let maxRowCount = 0;
  listMatchCols.forEach((col) => {
    if (col.values.length > maxRowCount) maxRowCount = col.values.length;
  });
  updateCols.forEach((col) => {
    if (col.values.length > maxRowCount) maxRowCount = col.values.length;
  });

  // If there are no list match columns, check if updateCols or singleMatchCols provide rows
  if (listMatchCols.length === 0) {
    if (maxRowCount === 0) {
      const hasAnySingleVal = singleMatchCols.some((c) => getMatchColumnValue(c, 0).trim().length > 0);
      if (hasAnySingleVal) {
        maxRowCount = 1;
      }
    }
  }

  if (maxRowCount === 0) {
    return {
      sql: '-- Warning: No row values provided to update.',
      rowCount: 0,
      columnCount: updateCols.length,
      matchColumnCount: matchCols.length,
      singleMatchCount: singleMatchCols.length,
      listMatchCount: listMatchCols.length,
      warnings: ['No row values were provided.'],
      executionMode,
      strategy: effectiveStrategy,
      pythonSnippet: '',
    };
  }

  // Check warnings
  singleMatchCols.forEach((col) => {
    const val = getMatchColumnValue(col, 0);
    if (!val || val.trim().length === 0) {
      warnings.push(`Match column "${col.name}" is set to "Single Value" mode, but no value has been specified.`);
    }
  });

  listMatchCols.forEach((col) => {
    if (col.values.length < maxRowCount) {
      warnings.push(
        `Match column "${col.name}" (List mode) has ${col.values.length} values, but total rows is ${maxRowCount}. Remaining rows will default to NULL.`
      );
    }
  });

  updateCols.forEach((col) => {
    if (col.values.length < maxRowCount) {
      warnings.push(
        `Update column "${col.name}" has ${col.values.length} values, but total rows is ${maxRowCount}. Remaining rows will default to NULL.`
      );
    }
  });

  if (listMatchCols.length === 0 && maxRowCount > 1) {
    warnings.push(
      `All match columns (${singleMatchCols.map((c) => c.name).join(', ')}) are in "Single Value" mode with ${maxRowCount} update rows. Every row will target the same record(s). Switch at least one match key (e.g. ID, SKU) to "List of Values" mode to update separate records.`
    );
  }

  // Duplicate match check for list match columns
  if (listMatchCols.length === 1) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    listMatchCols[0].values.forEach((v) => {
      const trimmed = v.trim();
      if (trimmed && seen.has(trimmed)) {
        duplicates.add(trimmed);
      }
      seen.add(trimmed);
    });
    if (duplicates.size > 0) {
      warnings.push(
        `Found duplicate match key(s) in "${listMatchCols[0].name}": ${Array.from(duplicates).slice(0, 5).join(', ')}${duplicates.size > 5 ? '...' : ''}. In batch updates, duplicate keys will overwrite each other.`
      );
    }
  }

  // Check for non-ISO date formats (e.g. DD/MM/YYYY) and notify user of safe conversion
  const convertedDateCols: string[] = [];
  matchCols.forEach((col) => {
    if (col.type === 'date' || col.type === 'timestamp') {
      const vals = col.valueMode === 'single' ? [col.singleValue || ''] : col.values;
      if (vals.some((v) => isNonIsoDateFormat(v))) {
        convertedDateCols.push(col.name);
      }
    }
  });
  updateCols.forEach((col) => {
    if (col.type === 'date' || col.type === 'timestamp') {
      if (col.values.some((v) => isNonIsoDateFormat(v))) {
        convertedDateCols.push(col.name);
      }
    }
  });
  if (convertedDateCols.length > 0) {
    warnings.push(
      `Detected DD/MM/YYYY date format in column(s) ${convertedDateCols.map((c) => `"${c}"`).join(', ')}. Values (e.g. "24/10/2023") have been safely converted to standard PostgreSQL ISO format ("2023-10-24") to prevent "date/time field value out of range" errors.`
    );
  }

  let generatedSql = '';

  const returningStr =
    options.returningClause && options.returningClause.trim()
      ? `\nRETURNING ${options.returningClause.trim().replace(/^RETURNING\s+/i, '')};`
      : ';';

  // Format single match column WHERE clauses: e.g. "tableAlias.col = 'val'" or "col = 'val'"
  const formatSingleMatchClauses = (aliasPrefix?: string) => {
    return singleMatchCols.map((col) => {
      const sanitizedCol = sanitizeIdentifier(col.name);
      const prefix = aliasPrefix ? `${aliasPrefix}.` : '';
      const formattedVal = formatPostgresValue(getMatchColumnValue(col, 0), col.type, false);
      return `${prefix}${sanitizedCol} = ${formattedVal}`;
    });
  };

  // 1. STRATEGY: BATCH VALUES (UPDATE ... FROM (VALUES ...) AS v(...) WHERE ...)
  if (effectiveStrategy === 'batch_values') {
    if (listMatchCols.length > 0) {
      const allCols = [...listMatchCols, ...updateCols];

      const setClauses = updateCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          const castStr =
            options.includeTypeCasts && col.type !== 'raw'
              ? `::${getPostgresTypeCast(col.type)}`
              : '';
          return `  ${sanitizedCol} = ${valuesAlias}.${sanitizedCol}${castStr}`;
        })
        .join(',\n');

      const joinClauses = listMatchCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          return `${tableAlias}.${sanitizedCol} = ${valuesAlias}.${sanitizedCol}`;
        })
        .join(' AND ');

      const constantClauses = formatSingleMatchClauses(tableAlias);
      const allWhereConditions = [joinClauses, ...constantClauses].filter(Boolean).join('\n  AND ');
      const valueColNames = allCols.map((col) => sanitizeIdentifier(col.name)).join(', ');

      const valueTuples: string[] = [];
      for (let r = 0; r < maxRowCount; r++) {
        const rowValues = allCols.map((col) => {
          const raw = col.values[r];
          const isFirstRow = r === 0;
          const forceCast =
            isFirstRow ||
            (options.includeTypeCasts &&
              (col.type === 'timestamp' ||
                col.type === 'date' ||
                col.type === 'jsonb' ||
                col.type === 'uuid'));
          return formatPostgresValue(raw, col.type, forceCast);
        });
        valueTuples.push(`    (${rowValues.join(', ')})`);
      }

      const matchDesc = [
        listMatchCols.length > 0 ? `${listMatchCols.length} list key(s)` : '',
        singleMatchCols.length > 0 ? `${singleMatchCols.length} constant filter(s)` : '',
      ]
        .filter(Boolean)
        .join(', ');

      generatedSql = [
        `-- Batch UPDATE for PostgreSQL using FROM (VALUES ...)`,
        `-- Total Rows: ${maxRowCount} | Target Table: ${tableName} | Match: ${matchDesc}`,
        `UPDATE ${tableName} AS ${tableAlias}`,
        `SET`,
        setClauses,
        `FROM (`,
        `  VALUES`,
        valueTuples.join(',\n'),
        `) AS ${valuesAlias}(${valueColNames})`,
        `WHERE ${allWhereConditions}${returningStr}`,
      ].join('\n');
    } else {
      // All match columns are single values
      const setClauses = updateCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          const val = formatPostgresValue(col.values[0], col.type, options.includeTypeCasts);
          return `  ${sanitizedCol} = ${val}`;
        })
        .join(',\n');

      const whereClauses = formatSingleMatchClauses().join(' AND ');

      generatedSql = [
        `-- Targeted Single UPDATE for PostgreSQL (All Match Keys Constant)`,
        `-- Target Table: ${tableName} | Match Columns: ${singleMatchCols.length}`,
        `UPDATE ${tableName}`,
        `SET`,
        setClauses,
        `WHERE ${whereClauses}${returningStr}`,
      ].join('\n');
    }
  }

  // 2. STRATEGY: INDIVIDUAL UPDATE STATEMENTS
  else if (effectiveStrategy === 'individual') {
    const statements: string[] = [];
    const inlineReturning =
      options.returningClause && options.returningClause.trim()
        ? ` RETURNING ${options.returningClause.trim().replace(/^RETURNING\s+/i, '')}`
        : '';

    for (let r = 0; r < maxRowCount; r++) {
      const setParts = updateCols.map((col) => {
        const valStr = formatPostgresValue(col.values[r], col.type, options.includeTypeCasts);
        return `${sanitizeIdentifier(col.name)} = ${valStr}`;
      });

      const whereParts = [
        ...listMatchCols.map((col) => {
          const valStr = formatPostgresValue(col.values[r], col.type, false);
          return `${sanitizeIdentifier(col.name)} = ${valStr}`;
        }),
        ...singleMatchCols.map((col) => {
          const valStr = formatPostgresValue(getMatchColumnValue(col, r), col.type, false);
          return `${sanitizeIdentifier(col.name)} = ${valStr}`;
        }),
      ];

      if (options.includeRowComments) {
        const keyParts = [
          ...listMatchCols.map((c) => `${c.name}=${c.values[r] || 'NULL'}`),
          ...singleMatchCols.map((c) => `${c.name}=${getMatchColumnValue(c, r)}`),
        ];
        statements.push(`-- Row ${r + 1}: ${keyParts.join(', ')}`);
      }

      statements.push(
        `UPDATE ${tableName} SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}${inlineReturning};`
      );
    }

    generatedSql = [
      `-- Individual UPDATE Statements for PostgreSQL`,
      `-- Total Queries: ${maxRowCount} | Target Table: ${tableName} | Match Columns: ${matchCols.length}`,
      statements.join('\n'),
    ].join('\n');
  }

  // 3. STRATEGY: CASE-WHEN CONDITIONAL UPDATE
  else if (effectiveStrategy === 'case_when') {
    if (listMatchCols.length > 0) {
      const primaryMatch = listMatchCols[0];
      const sanitizedPrimaryMatch = sanitizeIdentifier(primaryMatch.name);

      const setClauses = updateCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          const whenClauses = [];

          for (let r = 0; r < maxRowCount; r++) {
            const matchVal = formatPostgresValue(primaryMatch.values[r], primaryMatch.type, false);
            const updateVal = formatPostgresValue(col.values[r], col.type, options.includeTypeCasts);
            whenClauses.push(`      WHEN ${matchVal} THEN ${updateVal}`);
          }

          return [
            `  ${sanitizedCol} = CASE ${sanitizedPrimaryMatch}`,
            ...whenClauses,
            `      ELSE ${sanitizedCol}`,
            `    END`,
          ].join('\n');
        })
        .join(',\n');

      const inValues = primaryMatch.values
        .slice(0, maxRowCount)
        .map((v) => formatPostgresValue(v, primaryMatch.type, false));

      const whereConditions: string[] = [
        `${sanitizedPrimaryMatch} IN (\n  ${inValues.join(', ')}\n)`,
      ];

      listMatchCols.slice(1).forEach((col) => {
        warnings.push(
          `Note: CASE-WHEN strategy primarily pivots on first list match column "${primaryMatch.name}". Secondary list match column "${col.name}" is filtered via IN clause.`
        );
        const colInVals = col.values.slice(0, maxRowCount).map((v) => formatPostgresValue(v, col.type, false));
        whereConditions.push(`${sanitizeIdentifier(col.name)} IN (${colInVals.join(', ')})`);
      });

      singleMatchCols.forEach((col) => {
        const formattedVal = formatPostgresValue(getMatchColumnValue(col, 0), col.type, false);
        whereConditions.push(`${sanitizeIdentifier(col.name)} = ${formattedVal}`);
      });

      generatedSql = [
        `-- Single UPDATE with CASE-WHEN for PostgreSQL`,
        `-- Total Rows: ${maxRowCount} | Target Table: ${tableName}`,
        `UPDATE ${tableName}`,
        `SET`,
        setClauses,
        `WHERE ${whereConditions.join('\n  AND ')}${returningStr}`,
      ].join('\n');
    } else {
      const setClauses = updateCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          const val = formatPostgresValue(col.values[0], col.type, options.includeTypeCasts);
          return `  ${sanitizedCol} = ${val}`;
        })
        .join(',\n');

      const whereClauses = formatSingleMatchClauses().join(' AND ');

      generatedSql = [
        `-- Targeted Single UPDATE with CASE-WHEN for PostgreSQL`,
        `-- Target Table: ${tableName}`,
        `UPDATE ${tableName}`,
        `SET`,
        setClauses,
        `WHERE ${whereClauses}${returningStr}`,
      ].join('\n');
    }
  }

  // 4. STRATEGY: CTE (WITH updates AS ...)
  else if (effectiveStrategy === 'cte') {
    if (listMatchCols.length > 0) {
      const allCols = [...listMatchCols, ...updateCols];
      const valueColNames = allCols.map((col) => sanitizeIdentifier(col.name)).join(', ');

      const setClauses = updateCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          return `  ${sanitizedCol} = updates.${sanitizedCol}`;
        })
        .join(',\n');

      const joinClauses = listMatchCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          return `${tableAlias}.${sanitizedCol} = updates.${sanitizedCol}`;
        })
        .join(' AND ');

      const constantClauses = formatSingleMatchClauses(tableAlias);
      const allWhereConditions = [joinClauses, ...constantClauses].filter(Boolean).join('\n  AND ');

      const valueTuples: string[] = [];
      for (let r = 0; r < maxRowCount; r++) {
        const rowValues = allCols.map((col) => {
          const raw = col.values[r];
          const isFirstRow = r === 0;
          const forceCast =
            isFirstRow ||
            (options.includeTypeCasts &&
              (col.type === 'timestamp' ||
                col.type === 'date' ||
                col.type === 'jsonb' ||
                col.type === 'uuid'));
          return formatPostgresValue(raw, col.type, forceCast);
        });
        valueTuples.push(`    (${rowValues.join(', ')})`);
      }

      generatedSql = [
        `-- CTE (WITH updates AS ...) for PostgreSQL`,
        `-- Total Rows: ${maxRowCount} | Target Table: ${tableName}`,
        `WITH updates (${valueColNames}) AS (`,
        `  VALUES`,
        valueTuples.join(',\n'),
        `)`,
        `UPDATE ${tableName} AS ${tableAlias}`,
        `SET`,
        setClauses,
        `FROM updates`,
        `WHERE ${allWhereConditions}${returningStr}`,
      ].join('\n');
    } else {
      const setClauses = updateCols
        .map((col) => {
          const sanitizedCol = sanitizeIdentifier(col.name);
          const val = formatPostgresValue(col.values[0], col.type, options.includeTypeCasts);
          return `  ${sanitizedCol} = ${val}`;
        })
        .join(',\n');

      const whereClauses = formatSingleMatchClauses().join(' AND ');

      generatedSql = [
        `-- Targeted Single UPDATE with CTE for PostgreSQL`,
        `-- Target Table: ${tableName}`,
        `UPDATE ${tableName}`,
        `SET`,
        setClauses,
        `WHERE ${whereClauses}${returningStr}`,
      ].join('\n');
    }
  }

  // Wrap in transaction if requested
  if (options.transactionMode === 'commit') {
    generatedSql = `BEGIN;\n\n${generatedSql}\n\nCOMMIT;`;
  } else if (options.transactionMode === 'rollback') {
    generatedSql = `-- DRY RUN / ROLLBACK TEST MODE\nBEGIN;\n\n${generatedSql}\n\nROLLBACK;\n-- Changes safely rolled back.`;
  }

  // Generate runnable Python test script snippet
  const pythonSnippet = generatePythonExecutionSnippet(tableName, generatedSql, maxRowCount);

  return {
    sql: generatedSql,
    rowCount: maxRowCount,
    columnCount: updateCols.length,
    matchColumnCount: matchCols.length,
    singleMatchCount: singleMatchCols.length,
    listMatchCount: listMatchCols.length,
    warnings,
    executionMode,
    strategy: effectiveStrategy,
    pythonSnippet,
  };
}

/**
 * Generate Python test script using pg8000 / psycopg2 to execute the query
 */
function generatePythonExecutionSnippet(tableName: string, sqlQuery: string, rowCount: number): string {
  const escapedSql = sqlQuery.replace(/"""/g, '\\"\\"\\"');

  return `"""
Python PostgreSQL Update Execution Script
Executes the generated batch update query safely using pg8000 or psycopg2.
"""

import os
import sys

# Configure database credentials via environment variables or defaults
DB_HOST = os.getenv("PG_HOST", "localhost")
DB_PORT = int(os.getenv("PG_PORT", "5432"))
DB_NAME = os.getenv("PG_DATABASE", "postgres")
DB_USER = os.getenv("PG_USER", "postgres")
DB_PASSWORD = os.getenv("PG_PASSWORD", "postgres")

UPDATE_SQL = """${escapedSql}"""

def run_update():
    print(f"Connecting to PostgreSQL {DB_HOST}:{DB_PORT}/{DB_NAME}...")
    try:
        import pg8000.native
        con = pg8000.native.Connection(
            user=DB_USER,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            password=DB_PASSWORD
        )
        print(f"Executing update on '{tableName}' (${rowCount} rows)...")
        result = con.run(UPDATE_SQL)
        con.close()
        print("Update executed successfully!")
        return result
    except ImportError:
        # Fallback to psycopg2 if pg8000 is not installed
        import psycopg2
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        with conn.cursor() as cur:
            cur.execute(UPDATE_SQL)
            conn.commit()
            print("Update executed successfully via psycopg2!")
        conn.close()

if __name__ == "__main__":
    run_update()
`;
}

/**
 * Parses raw CSV or TSV text into headers and row values
 */
export function parseCsvOrTsv(text: string): { headers: string[]; rows: string[][] } {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], rows: [] };

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  // Parse headers
  const headers = parseCsvLine(lines[0], delimiter);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCsvLine(lines[i], delimiter);
    rows.push(rowValues);
  }

  return { headers, rows };
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Pre-defined sample presets
 */
export interface DbUpdatePreset {
  id: string;
  name: string;
  description: string;
  tableName: string;
  matchColumns: MatchColumn[];
  updateColumns: UpdateColumn[];
  executionMode?: QueryExecutionMode;
  strategy: UpdateStrategy;
  transactionMode: TransactionMode;
  returningClause?: string;
  includeRowComments?: boolean;
}

export const DB_UPDATE_PRESETS: DbUpdatePreset[] = [
  {
    id: 'users-status-role',
    name: 'User Accounts Status & Roles (Batch VALUES)',
    description: 'Bulk update user status, assigned role, and updated_at timestamp matching by user ID in batch mode',
    tableName: 'users',
    executionMode: 'batch',
    strategy: 'batch_values',
    transactionMode: 'commit',
    returningClause: 'id, status, role, updated_at',
    matchColumns: [
      {
        id: 'match-1',
        name: 'id',
        type: 'integer',
        valueMode: 'list',
        values: ['101', '102', '103', '104', '105'],
      },
    ],
    updateColumns: [
      {
        id: 'upd-1',
        name: 'status',
        type: 'text',
        values: ['active', 'inactive', 'suspended', 'active', 'pending_verification'],
      },
      {
        id: 'upd-2',
        name: 'role',
        type: 'text',
        values: ['admin', 'editor', 'viewer', 'moderator', 'member'],
      },
      {
        id: 'upd-3',
        name: 'updated_at',
        type: 'timestamp',
        values: [
          '2026-09-18 10:00:00',
          '2026-09-18 10:00:00',
          '2026-09-18 10:00:00',
          '2026-09-18 10:00:00',
          '2026-09-18 10:00:00',
        ],
      },
    ],
  },
  {
    id: 'tenant-multi-match-catalog',
    name: 'Multi-Match Columns: Tenant & Store Catalog (Mixed Single & List)',
    description: 'Multiple match columns: single-value constant tenant_id & store_id combined with list of SKUs',
    tableName: 'store_inventory',
    executionMode: 'batch',
    strategy: 'batch_values',
    transactionMode: 'commit',
    returningClause: 'sku, stock_quantity, reorder_threshold',
    matchColumns: [
      {
        id: 'match-tenant',
        name: 'tenant_id',
        type: 'text',
        valueMode: 'single',
        singleValue: 'tenant_us_east',
        values: ['tenant_us_east'],
      },
      {
        id: 'match-store',
        name: 'store_id',
        type: 'text',
        valueMode: 'single',
        singleValue: 'STORE-882',
        values: ['STORE-882'],
      },
      {
        id: 'match-sku',
        name: 'sku',
        type: 'text',
        valueMode: 'list',
        values: ['SKU-1001', 'SKU-1002', 'SKU-1003', 'SKU-1004'],
      },
    ],
    updateColumns: [
      {
        id: 'upd-stock',
        name: 'stock_quantity',
        type: 'integer',
        values: ['120', '45', '0', '350'],
      },
      {
        id: 'upd-reorder',
        name: 'reorder_threshold',
        type: 'integer',
        values: ['25', '10', '15', '50'],
      },
      {
        id: 'upd-audit',
        name: 'last_audit_date',
        type: 'date',
        values: ['2026-09-18', '2026-09-18', '2026-09-18', '2026-09-18'],
      },
    ],
  },
  {
    id: 'individual-order-items',
    name: 'Individual UPDATE Queries: Order Line Items',
    description: 'Generates separate discrete UPDATE statements with multi-match columns (order_id + line_number) and transaction safety',
    tableName: 'order_line_items',
    executionMode: 'individual',
    strategy: 'individual',
    transactionMode: 'commit',
    returningClause: 'order_id, line_number, fulfillment_status',
    includeRowComments: true,
    matchColumns: [
      {
        id: 'match-order',
        name: 'order_id',
        type: 'integer',
        valueMode: 'list',
        values: ['5001', '5001', '5002', '5003'],
      },
      {
        id: 'match-line',
        name: 'line_number',
        type: 'integer',
        valueMode: 'list',
        values: ['1', '2', '1', '1'],
      },
    ],
    updateColumns: [
      {
        id: 'upd-status',
        name: 'fulfillment_status',
        type: 'text',
        values: ['shipped', 'cancelled', 'processing', 'delivered'],
      },
      {
        id: 'upd-tracking',
        name: 'tracking_code',
        type: 'text',
        values: ['TRK-8812', 'NULL', 'TRK-9921', 'TRK-1104'],
      },
    ],
  },
  {
    id: 'subscription-tier-expiry',
    name: 'Subscription Plan Upgrade (CTE with UUIDs)',
    description: 'Migrate customer subscription plans, monthly quota, and expiration dates matching account UUIDs',
    tableName: 'subscriptions',
    executionMode: 'batch',
    strategy: 'cte',
    transactionMode: 'commit',
    returningClause: '*',
    matchColumns: [
      {
        id: 'match-acc',
        name: 'account_id',
        type: 'uuid',
        valueMode: 'list',
        values: [
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'b1ffcd00-ad1c-4ef9-cc7e-7cc0ce491b22',
          'c2eedd11-be2d-4ffa-dd8f-8dd1df502c33',
        ],
      },
    ],
    updateColumns: [
      {
        id: 'upd-plan',
        name: 'plan_tier',
        type: 'text',
        values: ['enterprise', 'pro_plus', 'scale'],
      },
      {
        id: 'upd-quota',
        name: 'api_quota_monthly',
        type: 'integer',
        values: ['1000000', '250000', '500000'],
      },
      {
        id: 'upd-exp',
        name: 'expires_at',
        type: 'date',
        values: ['2027-12-31', '2027-06-30', '2027-09-30'],
      },
    ],
  },
  {
    id: 'customer-subscriptions-dates',
    name: 'Subscription Renewal & Effective Dates (DD/MM/YYYY Format)',
    description: 'Bulk update customer subscription renewals using DD/MM/YYYY dates (e.g. 24/10/2023) safely converted to PostgreSQL ISO format',
    tableName: 'customer_subscriptions',
    executionMode: 'batch',
    strategy: 'batch_values',
    transactionMode: 'commit',
    returningClause: 'subscription_id, plan_code, effective_date, next_billing_date',
    matchColumns: [
      {
        id: 'match-sub-id',
        name: 'subscription_id',
        type: 'text',
        valueMode: 'list',
        values: ['SUB-2001', 'SUB-2002', 'SUB-2003', 'SUB-2004'],
      },
    ],
    updateColumns: [
      {
        id: 'upd-plan-code',
        name: 'plan_code',
        type: 'text',
        values: ['PREMIUM_ANNUAL', 'GROWTH_MONTHLY', 'ENTERPRISE_ANNUAL', 'STARTER_MONTHLY'],
      },
      {
        id: 'upd-effective-date',
        name: 'effective_date',
        type: 'date',
        values: ['24/10/2023', '05/11/2023', '15/12/2023', '01/01/2024'],
      },
      {
        id: 'upd-billing-date',
        name: 'next_billing_date',
        type: 'date',
        values: ['24/10/2024', '05/12/2023', '15/12/2024', '01/02/2024'],
      },
    ],
  },
];

// ==========================================
// CONFIGURATION EXPORT & IMPORT UTILITIES
// ==========================================

export interface DbUpdateConfig {
  version: 1;
  app: 'devhub-db-update-generator';
  exportedAt: string;
  name?: string;
  description?: string;
  tableName: string;
  matchColumns: MatchColumn[];
  updateColumns: UpdateColumn[];
  executionMode: QueryExecutionMode;
  strategy: UpdateStrategy;
  transactionMode: TransactionMode;
  returningClause: string;
  includeTypeCasts: boolean;
  includeRowComments: boolean;
}

export function createDbUpdateConfigExport(data: {
  tableName: string;
  matchColumns: MatchColumn[];
  updateColumns: UpdateColumn[];
  executionMode?: QueryExecutionMode;
  strategy?: UpdateStrategy;
  transactionMode?: TransactionMode;
  returningClause?: string;
  includeTypeCasts?: boolean;
  includeRowComments?: boolean;
  name?: string;
  description?: string;
}): DbUpdateConfig {
  return {
    version: 1,
    app: 'devhub-db-update-generator',
    exportedAt: new Date().toISOString(),
    name: data.name || `${data.tableName || 'table'}_update_config`,
    description: data.description || '',
    tableName: data.tableName ? data.tableName.trim() : 'my_table',
    matchColumns: (data.matchColumns || []).map((col, idx) => ({
      id: col.id || `match-${idx + 1}-${Date.now()}`,
      name: col.name ? col.name.trim() : `match_${idx + 1}`,
      type: col.type || 'text',
      valueMode: col.valueMode === 'single' ? 'single' : 'list',
      singleValue: col.singleValue !== undefined ? String(col.singleValue) : '',
      values: Array.isArray(col.values) ? col.values.map(String) : [],
    })),
    updateColumns: (data.updateColumns || []).map((col, idx) => ({
      id: col.id || `upd-${idx + 1}-${Date.now()}`,
      name: col.name ? col.name.trim() : `col_${idx + 1}`,
      type: col.type || 'text',
      values: Array.isArray(col.values) ? col.values.map(String) : [],
    })),
    executionMode: data.executionMode === 'individual' ? 'individual' : 'batch',
    strategy: data.strategy || 'batch_values',
    transactionMode: data.transactionMode || 'commit',
    returningClause: data.returningClause !== undefined ? data.returningClause : '*',
    includeTypeCasts: data.includeTypeCasts !== false,
    includeRowComments: data.includeRowComments !== false,
  };
}

export function validateAndParseDbUpdateConfig(input: string | unknown): {
  success: boolean;
  config?: DbUpdateConfig;
  error?: string;
} {
  try {
    let raw: any;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return { success: false, error: 'Configuration string is empty.' };
      }
      raw = JSON.parse(trimmed);
    } else {
      raw = input;
    }

    if (!raw || typeof raw !== 'object') {
      return { success: false, error: 'Invalid configuration format: Root must be a JSON object.' };
    }

    // Determine tableName
    const tableName = typeof raw.tableName === 'string' && raw.tableName.trim()
      ? raw.tableName.trim()
      : 'my_table';

    // Parse matchColumns
    const validTypes: ColumnType[] = ['text', 'integer', 'numeric', 'boolean', 'timestamp', 'date', 'jsonb', 'uuid', 'raw'];
    let matchCols: MatchColumn[] = [];

    if (Array.isArray(raw.matchColumns) && raw.matchColumns.length > 0) {
      matchCols = raw.matchColumns.map((mc: any, idx: number) => {
        const id = mc.id || `match-${idx + 1}-${Date.now()}`;
        const name = typeof mc.name === 'string' && mc.name.trim() ? mc.name.trim() : `match_${idx + 1}`;
        const type: ColumnType = validTypes.includes(mc.type) ? mc.type : 'text';
        const valueMode: ValueMode = mc.valueMode === 'single' ? 'single' : 'list';
        const singleValue = mc.singleValue !== undefined && mc.singleValue !== null ? String(mc.singleValue) : (Array.isArray(mc.values) && mc.values[0] ? String(mc.values[0]) : '');
        const values = Array.isArray(mc.values) ? mc.values.map(String) : (singleValue ? [singleValue] : []);
        return { id, name, type, valueMode, singleValue, values };
      });
    } else if (raw.matchColumn) {
      // Legacy or single matchColumn format
      const mc = raw.matchColumn;
      const name = typeof mc.name === 'string' && mc.name.trim() ? mc.name.trim() : 'id';
      const type: ColumnType = validTypes.includes(mc.type) ? mc.type : 'integer';
      const values = Array.isArray(mc.values) ? mc.values.map(String) : [];
      matchCols = [{ id: 'match-1', name, type, valueMode: 'list', singleValue: '', values }];
    } else {
      // Fallback
      matchCols = [{ id: 'match-1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: [] }];
    }

    // Parse updateColumns
    let updateCols: UpdateColumn[] = [];
    if (Array.isArray(raw.updateColumns) && raw.updateColumns.length > 0) {
      updateCols = raw.updateColumns.map((uc: any, idx: number) => {
        const id = uc.id || `upd-${idx + 1}-${Date.now()}`;
        const name = typeof uc.name === 'string' && uc.name.trim() ? uc.name.trim() : `column_${idx + 1}`;
        const type: ColumnType = validTypes.includes(uc.type) ? uc.type : 'text';
        const values = Array.isArray(uc.values) ? uc.values.map(String) : [];
        return { id, name, type, values };
      });
    } else {
      updateCols = [{ id: 'upd-1', name: 'status', type: 'text', values: [] }];
    }

    // Execution Mode
    const executionMode: QueryExecutionMode = raw.executionMode === 'individual' ? 'individual' : 'batch';

    // Strategy
    const validStrategies: UpdateStrategy[] = ['batch_values', 'individual', 'case_when', 'cte'];
    const strategy: UpdateStrategy = validStrategies.includes(raw.strategy)
      ? raw.strategy
      : (executionMode === 'individual' ? 'individual' : 'batch_values');

    // Transaction Mode
    const validTransactions: TransactionMode[] = ['none', 'commit', 'rollback'];
    const transactionMode: TransactionMode = validTransactions.includes(raw.transactionMode) ? raw.transactionMode : 'commit';

    const returningClause = typeof raw.returningClause === 'string' ? raw.returningClause : '*';
    const includeTypeCasts = raw.includeTypeCasts !== false;
    const includeRowComments = raw.includeRowComments !== false;

    const config: DbUpdateConfig = {
      version: 1,
      app: 'devhub-db-update-generator',
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      name: typeof raw.name === 'string' ? raw.name : `${tableName} Update Configuration`,
      description: typeof raw.description === 'string' ? raw.description : '',
      tableName,
      matchColumns: matchCols,
      updateColumns: updateCols,
      executionMode,
      strategy,
      transactionMode,
      returningClause,
      includeTypeCasts,
      includeRowComments,
    };

    return { success: true, config };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse configuration: ${err?.message || 'Invalid JSON format.'}`,
    };
  }
}

