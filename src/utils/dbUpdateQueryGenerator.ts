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
  values: string[];
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
  strategy: UpdateStrategy;
  transactionMode: TransactionMode;
  returningClause?: string;
  includeTypeCasts?: boolean;
  tableAlias?: string;
  valuesAlias?: string;
}

export interface UpdateQueryResult {
  sql: string;
  rowCount: number;
  columnCount: number;
  warnings: string[];
  strategy: UpdateStrategy;
  pythonSnippet: string;
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
      const escaped = val.replace(/'/g, "''");
      return `'${escaped}'::timestamp`;
    }

    case 'date': {
      const escaped = val.replace(/'/g, "''");
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

  // Check Date/Timestamp (ISO format)
  const allTimestamp = nonEmpties.every((v) =>
    /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/.test(v)
  );
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

  if (!rawTable) {
    return {
      sql: '-- Error: Target table name is required.',
      rowCount: 0,
      columnCount: 0,
      warnings: ['Target table name is required.'],
      strategy: options.strategy,
      pythonSnippet: '',
    };
  }

  const tableName = sanitizeIdentifier(rawTable);
  const tableAlias = options.tableAlias?.trim() || 't';
  const valuesAlias = options.valuesAlias?.trim() || 'v';
  const matchCols = options.matchColumns.filter((c) => c.name.trim().length > 0);
  const updateCols = options.updateColumns.filter((c) => c.name.trim().length > 0);

  if (matchCols.length === 0) {
    return {
      sql: '-- Error: At least one match column (WHERE condition) is required.',
      rowCount: 0,
      columnCount: updateCols.length,
      warnings: ['At least one match column (WHERE condition) is required.'],
      strategy: options.strategy,
      pythonSnippet: '',
    };
  }

  if (updateCols.length === 0) {
    return {
      sql: '-- Error: At least one column to update (SET condition) is required.',
      rowCount: 0,
      columnCount: 0,
      warnings: ['At least one column to update is required.'],
      strategy: options.strategy,
      pythonSnippet: '',
    };
  }

  // Determine total row count from longest match or update column list
  let maxRowCount = 0;
  matchCols.forEach((col) => {
    if (col.values.length > maxRowCount) maxRowCount = col.values.length;
  });
  updateCols.forEach((col) => {
    if (col.values.length > maxRowCount) maxRowCount = col.values.length;
  });

  if (maxRowCount === 0) {
    return {
      sql: '-- Warning: No row values provided to update.',
      rowCount: 0,
      columnCount: updateCols.length,
      warnings: ['No row values were provided.'],
      strategy: options.strategy,
      pythonSnippet: '',
    };
  }

  // Check for value count mismatches
  matchCols.forEach((col) => {
    if (col.values.length < maxRowCount) {
      warnings.push(`Match column "${col.name}" has ${col.values.length} values, but total rows is ${maxRowCount}. Remaining rows will default to NULL.`);
    }
  });
  updateCols.forEach((col) => {
    if (col.values.length < maxRowCount) {
      warnings.push(`Update column "${col.name}" has ${col.values.length} values, but total rows is ${maxRowCount}. Remaining rows will default to NULL.`);
    }
  });

  // Check for duplicate match keys if single match column
  if (matchCols.length === 1) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    matchCols[0].values.forEach((v) => {
      const trimmed = v.trim();
      if (trimmed && seen.has(trimmed)) {
        duplicates.add(trimmed);
      }
      seen.add(trimmed);
    });
    if (duplicates.size > 0) {
      warnings.push(`Found duplicate match key(s) in "${matchCols[0].name}": ${Array.from(duplicates).slice(0, 5).join(', ')}${duplicates.size > 5 ? '...' : ''}. In batch updates, duplicate keys will overwrite each other.`);
    }
  }

  let generatedSql = '';

  // 1. STRATEGY: BATCH VALUES (UPDATE ... FROM (VALUES ...) AS v(...) WHERE ...)
  if (options.strategy === 'batch_values') {
    // All columns in the VALUES list: Match columns first, then Update columns
    const allCols = [...matchCols, ...updateCols];

    const setClauses = updateCols
      .map((col) => {
        const sanitizedCol = sanitizeIdentifier(col.name);
        const castStr = options.includeTypeCasts && col.type !== 'raw' ? `::${getPostgresTypeCast(col.type)}` : '';
        return `  ${sanitizedCol} = ${valuesAlias}.${sanitizedCol}${castStr}`;
      })
      .join(',\n');

    const whereClauses = matchCols
      .map((col) => {
        const sanitizedCol = sanitizeIdentifier(col.name);
        return `${tableAlias}.${sanitizedCol} = ${valuesAlias}.${sanitizedCol}`;
      })
      .join(' AND ');

    const valueColNames = allCols.map((col) => sanitizeIdentifier(col.name)).join(', ');

    // Build rows of VALUES (...), (...)
    const valueTuples: string[] = [];
    for (let r = 0; r < maxRowCount; r++) {
      const rowValues = allCols.map((col, idx) => {
        const raw = col.values[r];
        // In the first row of PostgreSQL VALUES, type casting is often necessary to avoid "unknown" type errors
        const isFirstRow = r === 0;
        const forceCast = isFirstRow || (options.includeTypeCasts && (col.type === 'timestamp' || col.type === 'date' || col.type === 'jsonb' || col.type === 'uuid'));
        return formatPostgresValue(raw, col.type, forceCast);
      });
      valueTuples.push(`    (${rowValues.join(', ')})`);
    }

    const returningStr = options.returningClause && options.returningClause.trim()
      ? `\nRETURNING ${options.returningClause.trim().replace(/^RETURNING\s+/i, '')};`
      : ';';

    generatedSql = [
      `-- Batch UPDATE for PostgreSQL using FROM (VALUES ...)`,
      `-- Total Rows: ${maxRowCount} | Target Table: ${tableName}`,
      `UPDATE ${tableName} AS ${tableAlias}`,
      `SET`,
      setClauses,
      `FROM (`,
      `  VALUES`,
      valueTuples.join(',\n'),
      `) AS ${valuesAlias}(${valueColNames})`,
      `WHERE ${whereClauses}${returningStr}`,
    ].join('\n');
  }

  // 2. STRATEGY: INDIVIDUAL UPDATE STATEMENTS
  else if (options.strategy === 'individual') {
    const statements: string[] = [];

    for (let r = 0; r < maxRowCount; r++) {
      const setParts = updateCols.map((col) => {
        const valStr = formatPostgresValue(col.values[r], col.type, options.includeTypeCasts);
        return `${sanitizeIdentifier(col.name)} = ${valStr}`;
      });

      const whereParts = matchCols.map((col) => {
        const valStr = formatPostgresValue(col.values[r], col.type, false);
        return `${sanitizeIdentifier(col.name)} = ${valStr}`;
      });

      const returningStr = options.returningClause && options.returningClause.trim()
        ? ` RETURNING ${options.returningClause.trim().replace(/^RETURNING\s+/i, '')}`
        : '';

      statements.push(
        `UPDATE ${tableName} SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}${returningStr};`
      );
    }

    generatedSql = [
      `-- Individual UPDATE Statements for PostgreSQL`,
      `-- Total Rows: ${maxRowCount} | Target Table: ${tableName}`,
      statements.join('\n'),
    ].join('\n');
  }

  // 3. STRATEGY: CASE-WHEN CONDITIONAL UPDATE
  else if (options.strategy === 'case_when') {
    const primaryMatch = matchCols[0];
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

    // Build IN (...) list for primary match
    const inValues = primaryMatch.values
      .slice(0, maxRowCount)
      .map((v) => formatPostgresValue(v, primaryMatch.type, false));

    const extraWhere = matchCols.slice(1).map((col) => {
      // For composite keys with CASE-WHEN, note in warning
      warnings.push(`Note: CASE-WHEN strategy primarily pivots on first match column "${primaryMatch.name}".`);
      return '';
    });

    const returningStr = options.returningClause && options.returningClause.trim()
      ? `\nRETURNING ${options.returningClause.trim().replace(/^RETURNING\s+/i, '')};`
      : ';';

    generatedSql = [
      `-- Single UPDATE with CASE-WHEN for PostgreSQL`,
      `-- Total Rows: ${maxRowCount} | Target Table: ${tableName}`,
      `UPDATE ${tableName}`,
      `SET`,
      setClauses,
      `WHERE ${sanitizedPrimaryMatch} IN (`,
      `  ${inValues.join(', ')}`,
      `)${returningStr}`,
    ].join('\n');
  }

  // 4. STRATEGY: CTE (WITH updates AS ...)
  else if (options.strategy === 'cte') {
    const allCols = [...matchCols, ...updateCols];
    const valueColNames = allCols.map((col) => sanitizeIdentifier(col.name)).join(', ');

    const setClauses = updateCols
      .map((col) => {
        const sanitizedCol = sanitizeIdentifier(col.name);
        return `  ${sanitizedCol} = updates.${sanitizedCol}`;
      })
      .join(',\n');

    const whereClauses = matchCols
      .map((col) => {
        const sanitizedCol = sanitizeIdentifier(col.name);
        return `${tableAlias}.${sanitizedCol} = updates.${sanitizedCol}`;
      })
      .join(' AND ');

    const valueTuples: string[] = [];
    for (let r = 0; r < maxRowCount; r++) {
      const rowValues = allCols.map((col, idx) => {
        const raw = col.values[r];
        const isFirstRow = r === 0;
        const forceCast = isFirstRow || (options.includeTypeCasts && (col.type === 'timestamp' || col.type === 'date' || col.type === 'jsonb' || col.type === 'uuid'));
        return formatPostgresValue(raw, col.type, forceCast);
      });
      valueTuples.push(`    (${rowValues.join(', ')})`);
    }

    const returningStr = options.returningClause && options.returningClause.trim()
      ? `\nRETURNING ${options.returningClause.trim().replace(/^RETURNING\s+/i, '')};`
      : ';';

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
      `WHERE ${whereClauses}${returningStr}`,
    ].join('\n');
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
    warnings,
    strategy: options.strategy,
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
        print(f"Executing batch update on '{tableName}' (${rowCount} rows)...")
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
  strategy: UpdateStrategy;
  transactionMode: TransactionMode;
  returningClause?: string;
}

export const DB_UPDATE_PRESETS: DbUpdatePreset[] = [
  {
    id: 'users-status-role',
    name: 'User Accounts Status & Roles Batch',
    description: 'Bulk update user status, assigned role, and updated_at timestamp matching by user ID',
    tableName: 'users',
    strategy: 'batch_values',
    transactionMode: 'commit',
    returningClause: 'id, status, role, updated_at',
    matchColumns: [
      {
        id: 'match-1',
        name: 'id',
        type: 'integer',
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
    id: 'product-price-stock',
    name: 'Product Catalog Prices & Inventory Adjustment',
    description: 'Update e-commerce product unit price, stock quantity, and availability matching by SKU',
    tableName: 'products',
    strategy: 'batch_values',
    transactionMode: 'none',
    returningClause: 'sku, price, stock_quantity',
    matchColumns: [
      {
        id: 'match-sku',
        name: 'sku',
        type: 'text',
        values: ['PROD-A100', 'PROD-B200', 'PROD-C300', 'PROD-D400'],
      },
    ],
    updateColumns: [
      {
        id: 'upd-price',
        name: 'price',
        type: 'numeric',
        values: ['29.99', '49.50', '119.00', '14.25'],
      },
      {
        id: 'upd-stock',
        name: 'stock_quantity',
        type: 'integer',
        values: ['150', '0', '42', '800'],
      },
      {
        id: 'upd-avail',
        name: 'is_in_stock',
        type: 'boolean',
        values: ['true', 'false', 'true', 'true'],
      },
    ],
  },
  {
    id: 'subscription-tier-expiry',
    name: 'Subscription Plan Tier & Quota Upgrade',
    description: 'Migrate customer subscription plans, monthly quota, and expiration dates matching account ID',
    tableName: 'subscriptions',
    strategy: 'cte',
    transactionMode: 'commit',
    returningClause: '*',
    matchColumns: [
      {
        id: 'match-acc',
        name: 'account_id',
        type: 'uuid',
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
];
