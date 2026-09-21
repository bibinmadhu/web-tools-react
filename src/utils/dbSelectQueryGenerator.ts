/**
 * Database Select Query Generator for PostgreSQL
 * 
 * Supports generating high-performance batch SELECT queries, IN / Tuple-IN clauses,
 * CTE-based joins, individual statements, and UNION ALL queries for PostgreSQL.
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

export type SelectStrategy =
  | 'batch_values' // SELECT ... FROM table AS t JOIN (VALUES (...), (...)) AS v(...) ON ... WHERE ...
  | 'in_clause'    // SELECT ... FROM table WHERE col IN (...) or (col1, col2) IN ((...), (...))
  | 'cte'          // WITH lookup_keys (...) AS (VALUES (...)) SELECT ... FROM table AS t JOIN lookup_keys ...
  | 'individual'   // Multiple individual SELECT ... FROM table WHERE ...;
  | 'union_all';   // SELECT ... WHERE ... UNION ALL SELECT ... WHERE ...

export interface MatchColumn {
  id: string;
  name: string;
  type: ColumnType;
  operator?: string;     // '=', 'LIKE', 'ILIKE', '>=', '<=', '<>', 'IN' (default '=')
  valueMode?: ValueMode; // 'single' (constant filter for all rows) or 'list' (per-row matched values)
  singleValue?: string;  // value used when valueMode === 'single'
  values: string[];      // list of values used when valueMode === 'list'
}

export interface SelectColumn {
  id: string;
  name: string;
  alias?: string;
  expression?: string;
}

export interface SelectQueryOptions {
  tableName: string;
  schema?: string;
  matchColumns: MatchColumn[];
  selectColumns: SelectColumn[];
  selectAllColumns?: boolean;       // if true, generates SELECT *
  customSelectClause?: string;      // raw string like "id, name, status" or custom fields
  executionMode?: QueryExecutionMode; // 'batch' (single query) or 'individual' (separate statements)
  strategy: SelectStrategy;
  isDistinct?: boolean;
  orderBy?: string;
  limit?: number | string;
  offset?: number | string;
  includeTypeCasts?: boolean;
  tableAlias?: string;
  valuesAlias?: string;
  includeRowComments?: boolean;     // include '-- Row N' comments in queries
}

export interface SelectQueryResult {
  sql: string;
  rowCount: number;
  selectColumnCount: number;
  matchColumnCount: number;
  singleMatchCount: number;
  listMatchCount: number;
  warnings: string[];
  executionMode: QueryExecutionMode;
  strategy: SelectStrategy;
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
  if (!trimmed) return 'item';
  if (trimmed.includes('.')) {
    return trimmed
      .split('.')
      .map((part) => sanitizeIdentifier(part))
      .join('.');
  }
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  return `"${trimmed.replace(/"/g, '""')}"`;
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

  if (val.toUpperCase() === 'NULL') {
    return 'NULL';
  }

  if (type === 'raw') {
    return val;
  }

  const escapeString = (str: string): string => {
    return `'${str.replace(/'/g, "''")}'`;
  };

  switch (type) {
    case 'integer': {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        return forceCast ? `'0'::int` : '0';
      }
      return forceCast ? `${parsed}::int` : `${parsed}`;
    }

    case 'numeric': {
      const cleaned = val.replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleaned);
      if (isNaN(num)) {
        return forceCast ? `'0'::numeric` : '0';
      }
      return forceCast ? `${cleaned}::numeric` : cleaned;
    }

    case 'boolean': {
      const lower = val.toLowerCase();
      if (['true', 't', 'yes', '1'].includes(lower)) {
        return forceCast ? `TRUE::boolean` : 'TRUE';
      }
      if (['false', 'f', 'no', '0'].includes(lower)) {
        return forceCast ? `FALSE::boolean` : 'FALSE';
      }
      return forceCast ? `TRUE::boolean` : 'TRUE';
    }

    case 'timestamp': {
      const sanitized = escapeString(val);
      return forceCast ? `${sanitized}::timestamp` : sanitized;
    }

    case 'date': {
      const sanitized = escapeString(val);
      return forceCast ? `${sanitized}::date` : sanitized;
    }

    case 'jsonb': {
      const sanitized = escapeString(val);
      return forceCast ? `${sanitized}::jsonb` : sanitized;
    }

    case 'uuid': {
      const sanitized = escapeString(val);
      return forceCast ? `${sanitized}::uuid` : sanitized;
    }

    case 'text':
    default: {
      const sanitized = escapeString(val);
      return forceCast ? `${sanitized}::text` : sanitized;
    }
  }
}

/**
 * Returns PostgreSQL type name for explicit casting in VALUES or SELECT clauses
 */
export function getPostgresTypeName(type: ColumnType): string {
  switch (type) {
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

  if (raw.includes('\n')) {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line, idx, arr) => line !== '' || idx < arr.length - 1);
  }

  if (raw.includes(',')) {
    return raw.split(',').map((item) => item.trim());
  }

  if (raw.includes('\t')) {
    return raw.split('\t').map((item) => item.trim());
  }

  return [raw.trim()];
}

/**
 * Infers likely ColumnType from an array of sample values
 */
export function inferColumnType(values: string[]): ColumnType {
  const nonEmpties = values.map((v) => v.trim()).filter((v) => v !== '' && v.toUpperCase() !== 'NULL');
  if (nonEmpties.length === 0) return 'text';

  const allBool = nonEmpties.every((v) => ['true', 'false', 't', 'f', '1', '0'].includes(v.toLowerCase()));
  if (allBool) return 'boolean';

  const allInt = nonEmpties.every((v) => /^-?\d+$/.test(v));
  if (allInt) return 'integer';

  const allNumeric = nonEmpties.every((v) => /^-?\d+(\.\d+)?$/.test(v));
  if (allNumeric) return 'numeric';

  const allUuid = nonEmpties.every((v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
  if (allUuid) return 'uuid';

  const allTimestamp = nonEmpties.every((v) =>
    /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/.test(v)
  );
  if (allTimestamp) {
    const hasTime = nonEmpties.some((v) => v.includes(':'));
    return hasTime ? 'timestamp' : 'date';
  }

  const allJson = nonEmpties.every(
    (v) => (v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))
  );
  if (allJson) return 'jsonb';

  return 'text';
}

/**
 * Formats select columns into a SQL projection clause
 */
function buildSelectProjection(
  selectCols: SelectColumn[],
  selectAll: boolean,
  customClause?: string,
  tableAlias?: string
): string {
  if (customClause && customClause.trim()) {
    return customClause.trim();
  }

  if (selectAll) {
    return tableAlias ? `${tableAlias}.*` : '*';
  }

  if (!selectCols || selectCols.length === 0) {
    return tableAlias ? `${tableAlias}.*` : '*';
  }

  return selectCols
    .map((col) => {
      const colExpr = col.expression
        ? col.expression
        : tableAlias
        ? `${tableAlias}.${sanitizeIdentifier(col.name)}`
        : sanitizeIdentifier(col.name);
      if (col.alias && col.alias.trim()) {
        return `${colExpr} AS ${sanitizeIdentifier(col.alias)}`;
      }
      return colExpr;
    })
    .join(',\n  ');
}

/**
 * Generates the PostgreSQL select query based on the specified options
 */
export function generatePostgresSelectQuery(options: SelectQueryOptions): SelectQueryResult {
  const warnings: string[] = [];
  const rawTable = options.tableName.trim();

  const executionMode: QueryExecutionMode =
    options.executionMode || (options.strategy === 'individual' ? 'individual' : 'batch');

  if (!rawTable) {
    return {
      sql: '-- Warning: Please specify a target table name to generate the SELECT query.',
      rowCount: 0,
      selectColumnCount: 0,
      matchColumnCount: 0,
      singleMatchCount: 0,
      listMatchCount: 0,
      warnings: ['Table name is required.'],
      executionMode,
      strategy: options.strategy,
      pythonSnippet: '# Specify a table name to generate Python execution code.',
    };
  }

  const tableName = sanitizeIdentifier(rawTable);
  const tableAlias = options.tableAlias?.trim() || 't';
  const valuesAlias = options.valuesAlias?.trim() || 'v';
  const includeTypeCasts = options.includeTypeCasts !== false;
  const isDistinct = !!options.isDistinct;

  const matchCols = (options.matchColumns || []).filter((c) => c.name && c.name.trim());
  const selectCols = (options.selectColumns || []).filter((c) => c.name && c.name.trim());

  if (matchCols.length === 0) {
    warnings.push('No match / filter columns provided. Generating query without WHERE filtering.');
  }

  const singleMatchCols = matchCols.filter((c) => c.valueMode === 'single');
  const listMatchCols = matchCols.filter((c) => c.valueMode !== 'single');

  // Compute total list row count
  let listRowCount = 0;
  listMatchCols.forEach((col) => {
    if (col.values.length > listRowCount) {
      listRowCount = col.values.length;
    }
  });

  const totalRowCount = listRowCount > 0 ? listRowCount : (singleMatchCols.length > 0 ? 1 : 0);

  // Helper for modifiers (ORDER BY, LIMIT, OFFSET)
  const buildModifiers = (indent = ''): string => {
    const parts: string[] = [];
    if (options.orderBy && options.orderBy.trim()) {
      parts.push(`${indent}ORDER BY ${options.orderBy.trim()}`);
    }
    if (options.limit !== undefined && String(options.limit).trim() !== '') {
      const lim = parseInt(String(options.limit), 10);
      if (!isNaN(lim) && lim >= 0) {
        parts.push(`${indent}LIMIT ${lim}`);
      }
    }
    if (options.offset !== undefined && String(options.offset).trim() !== '') {
      const off = parseInt(String(options.offset), 10);
      if (!isNaN(off) && off >= 0) {
        parts.push(`${indent}OFFSET ${off}`);
      }
    }
    return parts.length > 0 ? '\n' + parts.join('\n') : '';
  };

  let sql = '';
  const distinctKeyword = isDistinct ? 'DISTINCT ' : '';

  // STRATEGY 1: INDIVIDUAL QUERIES
  if (executionMode === 'individual' || options.strategy === 'individual') {
    const statements: string[] = [];
    const effectiveCount = totalRowCount > 0 ? totalRowCount : 1;

    for (let r = 0; r < effectiveCount; r++) {
      const whereParts: string[] = [];

      // Single match filters
      singleMatchCols.forEach((col) => {
        const val = getMatchColumnValue(col, r);
        const op = col.operator || '=';
        whereParts.push(`${sanitizeIdentifier(col.name)} ${op} ${formatPostgresValue(val, col.type, false)}`);
      });

      // List match filters
      listMatchCols.forEach((col) => {
        const val = getMatchColumnValue(col, r);
        const op = col.operator || '=';
        whereParts.push(`${sanitizeIdentifier(col.name)} ${op} ${formatPostgresValue(val, col.type, false)}`);
      });

      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
      const projection = buildSelectProjection(selectCols, !!options.selectAllColumns, options.customSelectClause);
      const modifiers = buildModifiers('  ');

      let comment = '';
      if (options.includeRowComments !== false) {
        const summary = matchCols
          .map((c) => `${c.name}=${getMatchColumnValue(c, r)}`)
          .join(', ');
        comment = `-- Query ${r + 1} (${summary || 'All'})\n`;
      }

      statements.push(`${comment}SELECT ${distinctKeyword}${projection}\nFROM ${tableName}${whereClause ? '\n' + whereClause : ''}${modifiers};`);
    }

    sql = statements.join('\n\n');
  }
  // STRATEGY 2: IN / TUPLE-IN CLAUSE
  else if (options.strategy === 'in_clause') {
    const projection = buildSelectProjection(selectCols, !!options.selectAllColumns, options.customSelectClause, tableAlias);
    const whereConditions: string[] = [];

    // Constant single match columns
    singleMatchCols.forEach((col) => {
      const val = getMatchColumnValue(col, 0);
      const op = col.operator || '=';
      whereConditions.push(`${tableAlias}.${sanitizeIdentifier(col.name)} ${op} ${formatPostgresValue(val, col.type, false)}`);
    });

    // List match columns
    if (listMatchCols.length === 1) {
      const col = listMatchCols[0];
      const items = Array.from({ length: totalRowCount }).map((_, r) => {
        const val = getMatchColumnValue(col, r);
        return formatPostgresValue(val, col.type, false);
      });
      whereConditions.push(`${tableAlias}.${sanitizeIdentifier(col.name)} IN (\n    ${items.join(',\n    ')}\n  )`);
    } else if (listMatchCols.length > 1) {
      // Multi-column tuple IN: (col1, col2) IN ((v1, v2), (v3, v4))
      const colTuple = `(${listMatchCols.map((c) => `${tableAlias}.${sanitizeIdentifier(c.name)}`).join(', ')})`;
      const tupleRows = Array.from({ length: totalRowCount }).map((_, r) => {
        const rowVals = listMatchCols.map((c) => formatPostgresValue(getMatchColumnValue(c, r), c.type, false));
        return `    (${rowVals.join(', ')})`;
      });
      whereConditions.push(`${colTuple} IN (\n${tupleRows.join(',\n')}\n  )`);
    }

    const whereClause = whereConditions.length > 0 ? `\nWHERE ${whereConditions.join('\n  AND ')}` : '';
    const modifiers = buildModifiers('');

    sql = `-- Batch SELECT using IN / Tuple-IN clause\n-- Target Table: ${rawTable} | Total Rows: ${totalRowCount}\n` +
      `SELECT ${distinctKeyword}\n  ${projection}\n` +
      `FROM ${tableName} AS ${tableAlias}${whereClause}${modifiers};`;
  }
  // STRATEGY 3: COMMON TABLE EXPRESSION (CTE)
  else if (options.strategy === 'cte') {
    const projection = buildSelectProjection(selectCols, !!options.selectAllColumns, options.customSelectClause, tableAlias);

    if (listMatchCols.length === 0) {
      // Fallback if only single match or no list
      const whereParts = singleMatchCols.map((col) => {
        const val = getMatchColumnValue(col, 0);
        return `${tableAlias}.${sanitizeIdentifier(col.name)} = ${formatPostgresValue(val, col.type, false)}`;
      });
      const whereClause = whereParts.length > 0 ? `\nWHERE ${whereParts.join(' AND ')}` : '';
      const modifiers = buildModifiers('');
      sql = `SELECT ${distinctKeyword}\n  ${projection}\nFROM ${tableName} AS ${tableAlias}${whereClause}${modifiers};`;
    } else {
      const cteName = 'lookup_keys';
      const cteColNames = listMatchCols.map((c) => sanitizeIdentifier(c.name)).join(', ');

      const rows: string[] = [];
      for (let r = 0; r < totalRowCount; r++) {
        const rowVals: string[] = [];
        listMatchCols.forEach((col) => {
          const val = getMatchColumnValue(col, r);
          const forceCast = r === 0 && includeTypeCasts;
          rowVals.push(formatPostgresValue(val, col.type, forceCast));
        });
        rows.push(`    (${rowVals.join(', ')})`);
      }

      const joinConditions = listMatchCols.map((c) => {
        const id = sanitizeIdentifier(c.name);
        return `${tableAlias}.${id} = ${cteName}.${id}`;
      });

      const whereConditions: string[] = [];
      singleMatchCols.forEach((c) => {
        const val = getMatchColumnValue(c, 0);
        whereConditions.push(`${tableAlias}.${sanitizeIdentifier(c.name)} = ${formatPostgresValue(val, c.type, false)}`);
      });

      const whereClause = whereConditions.length > 0 ? `\nWHERE ${whereConditions.join(' AND ')}` : '';
      const modifiers = buildModifiers('');

      sql = `-- Batch SELECT using CTE (WITH ... VALUES)\n-- Target Table: ${rawTable} | Total Rows: ${totalRowCount}\n` +
        `WITH ${cteName} (${cteColNames}) AS (\n  VALUES\n${rows.join(',\n')}\n)\n` +
        `SELECT ${distinctKeyword}\n  ${projection}\n` +
        `FROM ${tableName} AS ${tableAlias}\n` +
        `JOIN ${cteName}\n  ON ${joinConditions.join('\n AND ')}${whereClause}${modifiers};`;
    }
  }
  // STRATEGY 4: UNION ALL QUERY
  else if (options.strategy === 'union_all') {
    const statements: string[] = [];
    const effectiveCount = totalRowCount > 0 ? totalRowCount : 1;
    const baseProjection = buildSelectProjection(selectCols, !!options.selectAllColumns, options.customSelectClause);

    for (let r = 0; r < effectiveCount; r++) {
      const whereParts: string[] = [];
      singleMatchCols.forEach((col) => {
        const val = getMatchColumnValue(col, r);
        const op = col.operator || '=';
        whereParts.push(`${sanitizeIdentifier(col.name)} ${op} ${formatPostgresValue(val, col.type, false)}`);
      });
      listMatchCols.forEach((col) => {
        const val = getMatchColumnValue(col, r);
        const op = col.operator || '=';
        whereParts.push(`${sanitizeIdentifier(col.name)} ${op} ${formatPostgresValue(val, col.type, false)}`);
      });

      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
      const queryLabel = `${r + 1} AS query_index`;
      const projectionWithIndex = `${baseProjection},\n  ${queryLabel}`;

      statements.push(`SELECT ${distinctKeyword}${projectionWithIndex}\nFROM ${tableName}${whereClause ? '\n' + whereClause : ''}`);
    }

    const modifiers = buildModifiers('');
    sql = `-- Batch SELECT using UNION ALL\n-- Target Table: ${rawTable} | Total Rows: ${totalRowCount}\n` +
      statements.join('\n\nUNION ALL\n\n') + `${modifiers};`;
  }
  // STRATEGY 5 (DEFAULT): BATCH VALUES JOIN
  else {
    const projection = buildSelectProjection(selectCols, !!options.selectAllColumns, options.customSelectClause, tableAlias);

    if (listMatchCols.length === 0) {
      // Single matches only or empty
      const whereParts = singleMatchCols.map((col) => {
        const val = getMatchColumnValue(col, 0);
        return `${tableAlias}.${sanitizeIdentifier(col.name)} = ${formatPostgresValue(val, col.type, false)}`;
      });
      const whereClause = whereParts.length > 0 ? `\nWHERE ${whereParts.join(' AND ')}` : '';
      const modifiers = buildModifiers('');
      sql = `SELECT ${distinctKeyword}\n  ${projection}\nFROM ${tableName} AS ${tableAlias}${whereClause}${modifiers};`;
    } else {
      const valuesColList = listMatchCols.map((c) => sanitizeIdentifier(c.name)).join(', ');

      const rows: string[] = [];
      for (let r = 0; r < totalRowCount; r++) {
        const rowVals: string[] = [];
        listMatchCols.forEach((col) => {
          const val = getMatchColumnValue(col, r);
          const forceCast = r === 0 && includeTypeCasts;
          rowVals.push(formatPostgresValue(val, col.type, forceCast));
        });
        rows.push(`    (${rowVals.join(', ')})`);
      }

      const joinConditions = listMatchCols.map((c) => {
        const id = sanitizeIdentifier(c.name);
        return `${tableAlias}.${id} = ${valuesAlias}.${id}`;
      });

      const whereConditions: string[] = [];
      singleMatchCols.forEach((c) => {
        const val = getMatchColumnValue(c, 0);
        whereConditions.push(`${tableAlias}.${sanitizeIdentifier(c.name)} = ${formatPostgresValue(val, c.type, false)}`);
      });

      const whereClause = whereConditions.length > 0 ? `\nWHERE ${whereConditions.join('\n  AND ')}` : '';
      const modifiers = buildModifiers('');

      sql = `-- Batch SELECT for PostgreSQL using JOIN (VALUES ...)\n` +
        `-- Total Rows: ${totalRowCount} | Target Table: ${rawTable} | Match: ${listMatchCols.length} list key(s), ${singleMatchCols.length} constant filter(s)\n` +
        `SELECT ${distinctKeyword}\n  ${projection}\n` +
        `FROM ${tableName} AS ${tableAlias}\n` +
        `JOIN (\n  VALUES\n${rows.join(',\n')}\n) AS ${valuesAlias}(${valuesColList})\n` +
        `  ON ${joinConditions.join('\n AND ')}${whereClause}${modifiers};`;
    }
  }

  // PYTHON SNIPPET GENERATION
  const pythonSnippet = generatePythonSelectSnippet(rawTable, sql, executionMode, options.strategy);

  return {
    sql,
    rowCount: totalRowCount,
    selectColumnCount: selectCols.length,
    matchColumnCount: matchCols.length,
    singleMatchCount: singleMatchCols.length,
    listMatchCount: listMatchCols.length,
    warnings,
    executionMode,
    strategy: options.strategy,
    pythonSnippet,
  };
}

/**
 * Generates an executable Python script using pg8000
 */
function generatePythonSelectSnippet(
  tableName: string,
  sql: string,
  executionMode: QueryExecutionMode,
  strategy: SelectStrategy
): string {
  const cleanSql = sql.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
  return `"""
Automated PostgreSQL SELECT Query Execution Script
Table: ${tableName}
Strategy: ${strategy} (Mode: ${executionMode})
Generated via DevHub Database Select Query Generator
"""
import os
import time
import pg8000.native

# Connect to database via environment variables
db_host = os.getenv("DB_HOST", "localhost")
db_port = int(os.getenv("DB_PORT", "5432"))
db_user = os.getenv("DB_USER", "postgres")
db_pass = os.getenv("DB_PASSWORD", "postgres")
db_name = os.getenv("DB_NAME", "postgres")

print(f"Connecting to {db_name} on {db_host}:{db_port}...")
conn = pg8000.native.Connection(
    host=db_host,
    port=db_port,
    user=db_user,
    password=db_pass,
    database=db_name
)

sql_query = """
${cleanSql}
"""

print("Executing query...")
t0 = time.perf_counter()
results = conn.run(sql_query)
elapsed = (time.perf_counter() - t0) * 1000

print(f"Query completed in {elapsed:.2f} ms")
print(f"Retrieved {len(results)} row(s)")

# Display preview of results
for i, row in enumerate(results[:5]):
    print(f"Row {i + 1}: {row}")

if len(results) > 5:
    print(f"... and {len(results) - 5} more rows.")

conn.close()
print("Connection closed.")
`;
}

/**
 * Parses raw CSV or TSV string into columns with automatic header detection
 */
export function parseCsvOrTsv(
  rawText: string,
  leadingMatchCount = 1
): {
  matchColumns: MatchColumn[];
  selectColumns: SelectColumn[];
  rowCount: number;
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      matchColumns: [
        { id: 'match-1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: [] },
      ],
      selectColumns: [
        { id: 'sel-1', name: 'name' },
        { id: 'sel-2', name: 'status' },
      ],
      rowCount: 0,
    };
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const splitRow = (line: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    }
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    const row: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      row.push((match[1] !== undefined ? match[1] : match[2]).trim());
    }
    return row;
  };

  const headerRow = splitRow(lines[0]);
  const hasHeader = headerRow.some((h) => isNaN(Number(h)) && h.length > 0);

  const columnNames = hasHeader
    ? headerRow
    : headerRow.map((_, idx) => (idx < leadingMatchCount ? `key_${idx + 1}` : `col_${idx - leadingMatchCount + 1}`));

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const colValues: Record<number, string[]> = {};
  headerRow.forEach((_, idx) => {
    colValues[idx] = [];
  });

  dataLines.forEach((line) => {
    const row = splitRow(line);
    headerRow.forEach((_, idx) => {
      colValues[idx].push(row[idx] || '');
    });
  });

  const effectiveMatchCount = Math.max(1, Math.min(leadingMatchCount, columnNames.length - 1 || 1));

  const matchColumns: MatchColumn[] = [];
  for (let i = 0; i < effectiveMatchCount; i++) {
    const name = columnNames[i] || `match_${i + 1}`;
    const vals = colValues[i] || [];
    const type = inferColumnType(vals);
    matchColumns.push({
      id: `match-${i + 1}-${Date.now()}`,
      name,
      type,
      valueMode: 'list',
      singleValue: '',
      values: vals,
    });
  }

  const selectColumns: SelectColumn[] = [];
  for (let i = effectiveMatchCount; i < columnNames.length; i++) {
    const name = columnNames[i] || `col_${i + 1}`;
    selectColumns.push({
      id: `sel-${i + 1}-${Date.now()}`,
      name,
    });
  }

  if (selectColumns.length === 0) {
    selectColumns.push({ id: `sel-1-${Date.now()}`, name: '*' });
  }

  return {
    matchColumns,
    selectColumns,
    rowCount: dataLines.length,
  };
}

// ==========================================
// PRESETS FOR COMMON QUERY SCENARIOS
// ==========================================

export interface SelectPreset {
  id: string;
  name: string;
  description: string;
  tableName: string;
  matchColumns: MatchColumn[];
  selectColumns: SelectColumn[];
  selectAllColumns?: boolean;
  customSelectClause?: string;
  executionMode?: QueryExecutionMode;
  strategy: SelectStrategy;
  isDistinct?: boolean;
  orderBy?: string;
  limit?: number | string;
  offset?: number | string;
  includeRowComments?: boolean;
}

export const DB_SELECT_PRESETS: SelectPreset[] = [
  {
    id: 'users-multi-match',
    name: 'Users Lookup (Tenant ID + User IDs)',
    description: 'Bulk retrieve user records filtering by constant tenant and a list of user IDs',
    tableName: 'users',
    strategy: 'batch_values',
    executionMode: 'batch',
    selectAllColumns: false,
    customSelectClause: 't.id, t.username, t.email, t.role, t.status, t.created_at',
    orderBy: 't.id ASC',
    matchColumns: [
      {
        id: 'm-tenant',
        name: 'tenant_id',
        type: 'text',
        valueMode: 'single',
        singleValue: 'org-acme-corp',
        values: ['org-acme-corp'],
      },
      {
        id: 'm-user',
        name: 'id',
        type: 'integer',
        valueMode: 'list',
        singleValue: '',
        values: ['101', '102', '103', '104', '105'],
      },
    ],
    selectColumns: [
      { id: 's-1', name: 'id' },
      { id: 's-2', name: 'username' },
      { id: 's-3', name: 'email' },
      { id: 's-4', name: 'role' },
      { id: 's-5', name: 'status' },
      { id: 's-6', name: 'created_at' },
    ],
  },
  {
    id: 'orders-tuple-in',
    name: 'Order Line Items (Store ID + SKU Tuple IN)',
    description: 'Query orders by multi-column composite keys using PostgreSQL tuple IN syntax',
    tableName: 'order_items',
    strategy: 'in_clause',
    executionMode: 'batch',
    selectAllColumns: false,
    customSelectClause: 'store_id, sku, order_id, quantity, unit_price, status',
    orderBy: 'store_id ASC, sku ASC',
    matchColumns: [
      {
        id: 'm-store',
        name: 'store_id',
        type: 'text',
        valueMode: 'list',
        singleValue: '',
        values: ['store-east-01', 'store-east-01', 'store-west-02', 'store-west-02'],
      },
      {
        id: 'm-sku',
        name: 'sku',
        type: 'text',
        valueMode: 'list',
        singleValue: '',
        values: ['SKU-MACBOOK-16', 'SKU-DISPLAY-4K', 'SKU-MOUSE-BT', 'SKU-KEYBOARD-MECH'],
      },
    ],
    selectColumns: [
      { id: 's-1', name: 'store_id' },
      { id: 's-2', name: 'sku' },
      { id: 's-3', name: 'order_id' },
      { id: 's-4', name: 'quantity' },
      { id: 's-5', name: 'unit_price' },
      { id: 's-6', name: 'status' },
    ],
  },
  {
    id: 'inventory-stock-cte',
    name: 'Inventory Stock Verification (CTE Values Join)',
    description: 'CTE lookup joining warehouse part numbers against inventory table with stock verification',
    tableName: 'inventory_stock',
    strategy: 'cte',
    executionMode: 'batch',
    selectAllColumns: false,
    customSelectClause: 't.warehouse_id, t.part_number, t.quantity_on_hand, t.reorder_level, t.last_audited_at',
    matchColumns: [
      {
        id: 'm-wh',
        name: 'warehouse_id',
        type: 'text',
        valueMode: 'single',
        singleValue: 'WH-CENTRAL-09',
        values: ['WH-CENTRAL-09'],
      },
      {
        id: 'm-part',
        name: 'part_number',
        type: 'text',
        valueMode: 'list',
        singleValue: '',
        values: ['PN-MOTOR-12V', 'PN-GEARBOX-50', 'PN-SENSOR-OPT', 'PN-BEARING-608'],
      },
    ],
    selectColumns: [
      { id: 's-1', name: 'warehouse_id' },
      { id: 's-2', name: 'part_number' },
      { id: 's-3', name: 'quantity_on_hand' },
      { id: 's-4', name: 'reorder_level' },
      { id: 's-5', name: 'last_audited_at' },
    ],
  },
  {
    id: 'audit-individual-statements',
    name: 'Audit Log Inquiries (Individual SELECTs)',
    description: 'Generate independent standalone queries per record for isolated validation or debugging',
    tableName: 'audit_logs',
    strategy: 'individual',
    executionMode: 'individual',
    selectAllColumns: true,
    includeRowComments: true,
    limit: 10,
    matchColumns: [
      {
        id: 'm-org',
        name: 'organization_id',
        type: 'text',
        valueMode: 'single',
        singleValue: 'org-9912',
        values: ['org-9912'],
      },
      {
        id: 'm-trace',
        name: 'trace_id',
        type: 'uuid',
        valueMode: 'list',
        singleValue: '',
        values: [
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'b1ffcd88-8b0a-3de7-aa5c-5aa8ac270b22',
          'c2eeda77-7a09-2cd6-994b-49979b160c33',
        ],
      },
    ],
    selectColumns: [
      { id: 's-1', name: '*' },
    ],
  },
  {
    id: 'customer-union-all',
    name: 'Customer Profiles (UNION ALL with Index)',
    description: 'Combine multiple lookups via UNION ALL tagging results with origin query index',
    tableName: 'customers',
    strategy: 'union_all',
    executionMode: 'batch',
    selectAllColumns: false,
    customSelectClause: 'id, email, phone, tier, lifetime_spend',
    matchColumns: [
      {
        id: 'm-email',
        name: 'email',
        type: 'text',
        valueMode: 'list',
        singleValue: '',
        values: [
          'alice@example.com',
          'bob@example.com',
          'carol@example.com',
        ],
      },
    ],
    selectColumns: [
      { id: 's-1', name: 'id' },
      { id: 's-2', name: 'email' },
      { id: 's-3', name: 'phone' },
      { id: 's-4', name: 'tier' },
      { id: 's-5', name: 'lifetime_spend' },
    ],
  },
];

// ==========================================
// CONFIGURATION EXPORT & IMPORT UTILITIES
// ==========================================

export interface DbSelectConfig {
  version: 1;
  app: 'devhub-db-select-generator';
  exportedAt: string;
  name?: string;
  description?: string;
  tableName: string;
  matchColumns: MatchColumn[];
  selectColumns: SelectColumn[];
  selectAllColumns?: boolean;
  customSelectClause?: string;
  executionMode: QueryExecutionMode;
  strategy: SelectStrategy;
  isDistinct?: boolean;
  orderBy?: string;
  limit?: number | string;
  offset?: number | string;
  includeTypeCasts: boolean;
  includeRowComments: boolean;
}

export function createDbSelectConfigExport(data: {
  tableName: string;
  matchColumns: MatchColumn[];
  selectColumns: SelectColumn[];
  selectAllColumns?: boolean;
  customSelectClause?: string;
  executionMode?: QueryExecutionMode;
  strategy?: SelectStrategy;
  isDistinct?: boolean;
  orderBy?: string;
  limit?: number | string;
  offset?: number | string;
  includeTypeCasts?: boolean;
  includeRowComments?: boolean;
  name?: string;
  description?: string;
}): DbSelectConfig {
  return {
    version: 1,
    app: 'devhub-db-select-generator',
    exportedAt: new Date().toISOString(),
    name: data.name || `${data.tableName || 'table'}_select_config`,
    description: data.description || '',
    tableName: data.tableName ? data.tableName.trim() : 'my_table',
    matchColumns: (data.matchColumns || []).map((col, idx) => ({
      id: col.id || `match-${idx + 1}-${Date.now()}`,
      name: col.name ? col.name.trim() : `match_${idx + 1}`,
      type: col.type || 'text',
      operator: col.operator || '=',
      valueMode: col.valueMode === 'single' ? 'single' : 'list',
      singleValue: col.singleValue !== undefined ? String(col.singleValue) : '',
      values: Array.isArray(col.values) ? col.values.map(String) : [],
    })),
    selectColumns: (data.selectColumns || []).map((col, idx) => ({
      id: col.id || `sel-${idx + 1}-${Date.now()}`,
      name: col.name ? col.name.trim() : `col_${idx + 1}`,
      alias: col.alias || '',
      expression: col.expression || '',
    })),
    selectAllColumns: !!data.selectAllColumns,
    customSelectClause: data.customSelectClause || '',
    executionMode: data.executionMode === 'individual' ? 'individual' : 'batch',
    strategy: data.strategy || 'batch_values',
    isDistinct: !!data.isDistinct,
    orderBy: data.orderBy || '',
    limit: data.limit !== undefined ? data.limit : '',
    offset: data.offset !== undefined ? data.offset : '',
    includeTypeCasts: data.includeTypeCasts !== false,
    includeRowComments: data.includeRowComments !== false,
  };
}

export function validateAndParseDbSelectConfig(input: string | unknown): {
  success: boolean;
  config?: DbSelectConfig;
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

    const tableName = typeof raw.tableName === 'string' && raw.tableName.trim()
      ? raw.tableName.trim()
      : 'my_table';

    const validTypes: ColumnType[] = ['text', 'integer', 'numeric', 'boolean', 'timestamp', 'date', 'jsonb', 'uuid', 'raw'];
    let matchCols: MatchColumn[] = [];

    if (Array.isArray(raw.matchColumns) && raw.matchColumns.length > 0) {
      matchCols = raw.matchColumns.map((mc: any, idx: number) => {
        const id = mc.id || `match-${idx + 1}-${Date.now()}`;
        const name = typeof mc.name === 'string' && mc.name.trim() ? mc.name.trim() : `match_${idx + 1}`;
        const type: ColumnType = validTypes.includes(mc.type) ? mc.type : 'text';
        const operator = typeof mc.operator === 'string' ? mc.operator : '=';
        const valueMode: ValueMode = mc.valueMode === 'single' ? 'single' : 'list';
        const singleValue = mc.singleValue !== undefined && mc.singleValue !== null ? String(mc.singleValue) : (Array.isArray(mc.values) && mc.values[0] ? String(mc.values[0]) : '');
        const values = Array.isArray(mc.values) ? mc.values.map(String) : (singleValue ? [singleValue] : []);
        return { id, name, type, operator, valueMode, singleValue, values };
      });
    } else {
      matchCols = [{ id: 'match-1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: [] }];
    }

    let selectCols: SelectColumn[] = [];
    if (Array.isArray(raw.selectColumns) && raw.selectColumns.length > 0) {
      selectCols = raw.selectColumns.map((sc: any, idx: number) => {
        const id = sc.id || `sel-${idx + 1}-${Date.now()}`;
        const name = typeof sc.name === 'string' && sc.name.trim() ? sc.name.trim() : `col_${idx + 1}`;
        const alias = typeof sc.alias === 'string' ? sc.alias : '';
        const expression = typeof sc.expression === 'string' ? sc.expression : '';
        return { id, name, alias, expression };
      });
    } else {
      selectCols = [{ id: 'sel-1', name: '*' }];
    }

    const executionMode: QueryExecutionMode = raw.executionMode === 'individual' ? 'individual' : 'batch';
    const validStrategies: SelectStrategy[] = ['batch_values', 'in_clause', 'cte', 'individual', 'union_all'];
    const strategy: SelectStrategy = validStrategies.includes(raw.strategy)
      ? raw.strategy
      : (executionMode === 'individual' ? 'individual' : 'batch_values');

    const config: DbSelectConfig = {
      version: 1,
      app: 'devhub-db-select-generator',
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      name: typeof raw.name === 'string' ? raw.name : `${tableName} Select Configuration`,
      description: typeof raw.description === 'string' ? raw.description : '',
      tableName,
      matchColumns: matchCols,
      selectColumns: selectCols,
      selectAllColumns: !!raw.selectAllColumns,
      customSelectClause: typeof raw.customSelectClause === 'string' ? raw.customSelectClause : '',
      executionMode,
      strategy,
      isDistinct: !!raw.isDistinct,
      orderBy: typeof raw.orderBy === 'string' ? raw.orderBy : '',
      limit: raw.limit !== undefined ? raw.limit : '',
      offset: raw.offset !== undefined ? raw.offset : '',
      includeTypeCasts: raw.includeTypeCasts !== false,
      includeRowComments: raw.includeRowComments !== false,
    };

    return { success: true, config };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse configuration: ${err?.message || 'Invalid JSON format.'}`,
    };
  }
}
