/**
 * DevHub SQL Query Obfuscator & De-obfuscator Engine
 * 
 * Provides bi-directional obfuscation of SQL queries, replacing table and column names
 * with anonymized identifiers while strictly preserving SQL syntax, keywords, operators,
 * comments, and data types across PostgreSQL, MySQL, SQL Server, SQLite, and ANSI SQL.
 */

export type SqlDialect = 'generic' | 'postgres' | 'mysql' | 'sqlserver' | 'sqlite';

export type ObfuscationNamingStyle = 'prefixed' | 'random_hex' | 'pseudonym' | 'short';

export interface QueryObfuscationOptions {
  dialect: SqlDialect;
  namingStyle: ObfuscationNamingStyle;
  obfuscateTables: boolean;
  obfuscateColumns: boolean;
  obfuscateAliases: boolean;
  maskLiterals: boolean;
  tablePrefix: string;
  columnPrefix: string;
  excludedIdentifiers: string[];
  preserveCasing: boolean;
}

export interface QueryObfuscationMapping {
  format: 'devhub-sql-obfuscator-mapping';
  version: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tables: Record<string, string>;
  columns: Record<string, string>;
  aliases?: Record<string, string>;
  literals?: Record<string, string>;
  reverseMapping: Record<string, string>;
  stats: {
    tablesCount: number;
    columnsCount: number;
    literalsCount: number;
    totalReplacements: number;
  };
}

export interface ObfuscateResult {
  obfuscatedSql: string;
  mapping: QueryObfuscationMapping;
  detectedTables: string[];
  detectedColumns: string[];
  replacementsCount: number;
}

export interface DeobfuscateResult {
  deobfuscatedSql: string;
  restoredCount: number;
  unrecognizedTokens: string[];
}

export const DEFAULT_OBFUSCATION_OPTIONS: QueryObfuscationOptions = {
  dialect: 'generic',
  namingStyle: 'prefixed',
  obfuscateTables: true,
  obfuscateColumns: true,
  obfuscateAliases: true,
  maskLiterals: false,
  tablePrefix: 'tbl_',
  columnPrefix: 'col_',
  excludedIdentifiers: ['id', 'created_at', 'updated_at', 'status', 'type'],
  preserveCasing: true,
};

// Reserved standard SQL keywords & clauses (case-insensitive)
export const SQL_RESERVED_KEYWORDS = new Set([
  'SELECT', 'DISTINCT', 'ALL', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
  'FULL', 'OUTER', 'CROSS', 'NATURAL', 'ON', 'USING', 'GROUP', 'BY', 'HAVING',
  'ORDER', 'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST', 'LIMIT', 'OFFSET', 'FETCH',
  'NEXT', 'ROWS', 'ONLY', 'UNION', 'INTERSECT', 'EXCEPT', 'WITH', 'RECURSIVE',
  'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'IN', 'IS',
  'NULL', 'LIKE', 'ILIKE', 'SIMILAR', 'BETWEEN', 'EXISTS', 'ANY', 'SOME', 'IF',
  'UPDATE', 'SET', 'INSERT', 'INTO', 'VALUES', 'DELETE', 'TRUNCATE', 'RETURNING',
  'CREATE', 'TABLE', 'VIEW', 'INDEX', 'DROP', 'ALTER', 'ADD', 'CONSTRAINT',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CHECK', 'DEFAULT', 'UNIQUE',
  'TEMPORARY', 'TEMP', 'CASCADE', 'RESTRICT', 'BEGIN', 'TRANSACTION', 'COMMIT',
  'ROLLBACK', 'START', 'SAVEPOINT', 'RELEASE', 'LOCK', 'SHARE', 'EXCLUSIVE',
  'OVER', 'PARTITION', 'WINDOW', 'ROW', 'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING',
  'CURRENT', 'CAST', 'CONVERT', 'COLLATE', 'TRUE', 'FALSE', 'COALESCE', 'NULLIF', 'GREATEST',
  'LEAST', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STDDEV', 'VARIANCE', 'ARRAY_AGG',
  'STRING_AGG', 'GROUP_CONCAT', 'CONCAT', 'LOWER', 'UPPER', 'TRIM', 'SUBSTRING',
  'LENGTH', 'REPLACE', 'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
  'LOCALTIME', 'LOCALTIMESTAMP', 'DATE_TRUNC', 'EXTRACT', 'ROUND', 'FLOOR', 'CEIL',
  'CEILING', 'ABS', 'MOD', 'POWER', 'SQRT', 'ROW_NUMBER', 'RANK', 'DENSE_RANK',
  'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
  // SQL Server / Oracle / MySQL specific keywords & functions
  'MERGE', 'MATCHED', 'TARGET', 'SOURCE', 'OUTPUT', 'INSERTED', 'DELETED',
  'GETDATE', 'GETUTCDATE', 'DATEADD', 'DATEDIFF', 'DATEPART', 'ISNULL', 'NVL',
  'SYSDATE', 'SYS_GUID', 'NEWID', 'TOP',
  // Data types
  'INT', 'INTEGER', 'SMALLINT', 'BIGINT', 'TINYINT', 'MEDIUMINT', 'NUMERIC', 'DECIMAL',
  'FLOAT', 'DOUBLE', 'PRECISION', 'REAL', 'VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR',
  'TEXT', 'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ', 'BOOLEAN', 'BOOL', 'BLOB',
  'BYTEA', 'CLOB', 'JSON', 'JSONB', 'UUID', 'SERIAL', 'BIGSERIAL', 'SERIAL4', 'SERIAL8',
  'MONEY', 'XML', 'INTERVAL', 'DATETIME', 'DATETIME2', 'YEAR'
]);

// Pseudonym word bank for realistic, anonymized SQL names
const PSEUDO_TABLES = [
  'alpha_entity', 'bravo_records', 'charlie_ledger', 'delta_registry',
  'echo_store', 'foxtrot_vault', 'golf_dataset', 'hotel_entries',
  'india_journal', 'juliet_archive', 'kilo_matrix', 'lima_catalog'
];

const PSEUDO_COLUMNS = [
  'item_code', 'metric_val', 'segment_tag', 'category_ref',
  'status_flag', 'timestamp_val', 'amount_total', 'factor_ratio',
  'source_hash', 'counter_val', 'priority_idx', 'group_token',
  'geo_region', 'payload_data', 'reference_num', 'lifecycle_stage'
];

/**
 * Token types produced by the SQL tokenizer
 */
export type SqlTokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'QUOTED_IDENTIFIER'
  | 'STRING_LITERAL'
  | 'DOLLAR_STRING'
  | 'NUMERIC_LITERAL'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'COMMENT_LINE'
  | 'COMMENT_BLOCK'
  | 'WHITESPACE';

export interface SqlToken {
  type: SqlTokenType;
  value: string;
  quoteChar?: '"' | '`' | '[' | "'";
  normalized: string; // unquoted, lowercase for matching
  start: number;
  end: number;
}

/**
 * Tokenizes SQL code preserving every byte, whitespace, and comment.
 */
export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  const len = sql.length;
  let i = 0;

  while (i < len) {
    const char = sql[i];
    const nextChar = i + 1 < len ? sql[i + 1] : '';

    // 1. Whitespace
    if (/\s/.test(char)) {
      const start = i;
      while (i < len && /\s/.test(sql[i])) i++;
      tokens.push({
        type: 'WHITESPACE',
        value: sql.slice(start, i),
        normalized: ' ',
        start,
        end: i,
      });
      continue;
    }

    // 2. Line comment: --
    if (char === '-' && nextChar === '-') {
      const start = i;
      while (i < len && sql[i] !== '\n') i++;
      tokens.push({
        type: 'COMMENT_LINE',
        value: sql.slice(start, i),
        normalized: '',
        start,
        end: i,
      });
      continue;
    }

    // 3. Block comment: /* ... */
    if (char === '/' && nextChar === '*') {
      const start = i;
      i += 2;
      while (i < len && !(sql[i] === '*' && i + 1 < len && sql[i + 1] === '/')) {
        i++;
      }
      i = Math.min(len, i + 2);
      tokens.push({
        type: 'COMMENT_BLOCK',
        value: sql.slice(start, i),
        normalized: '',
        start,
        end: i,
      });
      continue;
    }

    // 4. PostgreSQL dollar-quoted string: $$...$$ or $tag$...$tag$
    if (char === '$') {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        const start = i;
        i += tag.length;
        const closeIdx = sql.indexOf(tag, i);
        if (closeIdx !== -1) {
          i = closeIdx + tag.length;
        } else {
          i = len;
        }
        tokens.push({
          type: 'DOLLAR_STRING',
          value: sql.slice(start, i),
          normalized: '',
          start,
          end: i,
        });
        continue;
      }
    }

    // 5. Standard single-quoted string literal: '...' (escaped with '' or \')
    if (char === "'") {
      const start = i;
      i++;
      while (i < len) {
        if (sql[i] === "'") {
          if (i + 1 < len && sql[i + 1] === "'") {
            i += 2; // escaped quote
            continue;
          }
          i++;
          break;
        } else if (sql[i] === '\\' && i + 1 < len) {
          i += 2; // escape sequence
        } else {
          i++;
        }
      }
      const raw = sql.slice(start, i);
      tokens.push({
        type: 'STRING_LITERAL',
        value: raw,
        quoteChar: "'",
        normalized: raw.slice(1, -1).replace(/''/g, "'"),
        start,
        end: i,
      });
      continue;
    }

    // 6. Double-quoted identifiers: "tbl" or "col"
    if (char === '"') {
      const start = i;
      i++;
      while (i < len) {
        if (sql[i] === '"') {
          if (i + 1 < len && sql[i + 1] === '"') {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      const raw = sql.slice(start, i);
      const inner = raw.slice(1, raw.endsWith('"') ? -1 : undefined);
      tokens.push({
        type: 'QUOTED_IDENTIFIER',
        value: raw,
        quoteChar: '"',
        normalized: inner.toLowerCase(),
        start,
        end: i,
      });
      continue;
    }

    // 7. MySQL Backtick quoted identifiers: `tbl` or `col`
    if (char === '`') {
      const start = i;
      i++;
      while (i < len && sql[i] !== '`') {
        if (sql[i] === '\\' && i + 1 < len) i++;
        i++;
      }
      if (i < len && sql[i] === '`') i++;
      const raw = sql.slice(start, i);
      const inner = raw.slice(1, raw.endsWith('`') ? -1 : undefined);
      tokens.push({
        type: 'QUOTED_IDENTIFIER',
        value: raw,
        quoteChar: '`',
        normalized: inner.toLowerCase(),
        start,
        end: i,
      });
      continue;
    }

    // 8. SQL Server Square Bracket quoted identifiers: [tbl] or [col]
    if (char === '[') {
      const start = i;
      i++;
      while (i < len && sql[i] !== ']') i++;
      if (i < len && sql[i] === ']') i++;
      const raw = sql.slice(start, i);
      const inner = raw.slice(1, raw.endsWith(']') ? -1 : undefined);
      tokens.push({
        type: 'QUOTED_IDENTIFIER',
        value: raw,
        quoteChar: '[',
        normalized: inner.toLowerCase(),
        start,
        end: i,
      });
      continue;
    }

    // 9. Numeric literals
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(nextChar))) {
      const start = i;
      let hasDot = char === '.';
      if (hasDot) i++;
      while (i < len && (/[0-9]/.test(sql[i]) || (sql[i] === '.' && !hasDot))) {
        if (sql[i] === '.') hasDot = true;
        i++;
      }
      tokens.push({
        type: 'NUMERIC_LITERAL',
        value: sql.slice(start, i),
        normalized: sql.slice(start, i),
        start,
        end: i,
      });
      continue;
    }

    // 10. Multi-character operators
    const twoChars = sql.slice(i, i + 2);
    if (['::', '<=', '>=', '<>', '!=', '||', '->', '=>'].includes(twoChars)) {
      tokens.push({
        type: 'OPERATOR',
        value: twoChars,
        normalized: twoChars,
        start: i,
        end: i + 2,
      });
      i += 2;
      continue;
    }

    // 11. Single character operators and punctuation
    if (/[=<>+\-*/%^&|~]/.test(char)) {
      tokens.push({
        type: 'OPERATOR',
        value: char,
        normalized: char,
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    if (/[,;().:[\]{}]/.test(char)) {
      tokens.push({
        type: 'PUNCTUATION',
        value: char,
        normalized: char,
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // 12. Standard Unquoted Words (Keywords or Identifiers)
    if (/[a-zA-Z_#$]/.test(char)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_#$]/.test(sql[i])) i++;
      const word = sql.slice(start, i);
      const upper = word.toUpperCase();
      const isKeyword = SQL_RESERVED_KEYWORDS.has(upper);

      tokens.push({
        type: isKeyword ? 'KEYWORD' : 'IDENTIFIER',
        value: word,
        normalized: word.toLowerCase(),
        start,
        end: i,
      });
      continue;
    }

    // Fallback single character
    tokens.push({
      type: 'PUNCTUATION',
      value: char,
      normalized: char,
      start: i,
      end: i + 1,
    });
    i++;
  }

  return tokens;
}

/**
 * Strips quotes from an identifier
 */
export function unquoteIdentifier(raw: string): string {
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (raw.startsWith('`') && raw.endsWith('`')) return raw.slice(1, -1);
  if (raw.startsWith('[') && raw.endsWith(']')) return raw.slice(1, -1);
  return raw;
}

/**
 * Wraps an identifier with appropriate quotes matching the original token style or target dialect
 */
export function quoteIdentifier(name: string, quoteChar?: '"' | '`' | '[' | "'"): string {
  if (quoteChar === '"') return `"${name}"`;
  if (quoteChar === '`') return `\`${name}\``;
  if (quoteChar === '[') return `[${name}]`;
  return name;
}

/**
 * Generates an obfuscated identifier based on naming style and index
 */
function generateObfuscatedName(
  prefix: string,
  index: number,
  originalName: string,
  style: ObfuscationNamingStyle,
  isTable: boolean
): string {
  switch (style) {
    case 'random_hex': {
      // Deterministic hash-based hex string based on original name
      let hash = 0;
      for (let i = 0; i < originalName.length; i++) {
        hash = (hash << 5) - hash + originalName.charCodeAt(i);
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
      return `${prefix}${hex}`;
    }
    case 'pseudonym': {
      const bank = isTable ? PSEUDO_TABLES : PSEUDO_COLUMNS;
      const base = bank[index % bank.length];
      const suffix = Math.floor(index / bank.length) > 0 ? `_${Math.floor(index / bank.length) + 1}` : '';
      return `${base}${suffix}`;
    }
    case 'short': {
      const code = String.fromCharCode(97 + (index % 26)); // a, b, c...
      const num = Math.floor(index / 26) > 0 ? `${Math.floor(index / 26)}` : '';
      return `${isTable ? 't' : 'c'}_${code}${num}`;
    }
    case 'prefixed':
    default: {
      const padded = String(index + 1).padStart(2, '0');
      return `${prefix}${padded}`;
    }
  }
}

/**
 * Analyzes token stream with SQL grammar context to categorize identifiers
 * into Table names vs Column names vs Aliases.
 */
interface AnalyzedTokens {
  tableTokens: Set<number>;
  columnTokens: Set<number>;
  aliasTokens: Set<number>;
  tableNames: Set<string>;
  columnNames: Set<string>;
  aliasNames: Set<string>;
}

export function analyzeSqlTokens(tokens: SqlToken[]): AnalyzedTokens {
  const tableTokens = new Set<number>();
  const columnTokens = new Set<number>();
  const aliasTokens = new Set<number>();

  const tableNames = new Set<string>();
  const columnNames = new Set<string>();
  const aliasNames = new Set<string>();

  // Filter out pure whitespace and comments for grammatical lookahead/lookbehind
  const meaningfulIndices: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (
      tokens[i].type !== 'WHITESPACE' &&
      tokens[i].type !== 'COMMENT_LINE' &&
      tokens[i].type !== 'COMMENT_BLOCK'
    ) {
      meaningfulIndices.push(i);
    }
  }

  const mLen = meaningfulIndices.length;

  for (let m = 0; m < mLen; m++) {
    const rawIdx = meaningfulIndices[m];
    const tok = tokens[rawIdx];

    if (tok.type !== 'IDENTIFIER' && tok.type !== 'QUOTED_IDENTIFIER') {
      continue;
    }

    const unquoted = unquoteIdentifier(tok.value);
    const unquotedLower = unquoted.toLowerCase();

    // Look at previous meaningful token
    const prevMIdx = m > 0 ? meaningfulIndices[m - 1] : -1;
    const prevTok = prevMIdx !== -1 ? tokens[prevMIdx] : null;
    const prevValUpper = prevTok?.value.toUpperCase();

    // Look at 2nd previous meaningful token
    const prev2MIdx = m > 1 ? meaningfulIndices[m - 2] : -1;
    const prev2Tok = prev2MIdx !== -1 ? tokens[prev2MIdx] : null;

    // Look at next meaningful token
    const nextMIdx = m + 1 < mLen ? meaningfulIndices[m + 1] : -1;
    const nextTok = nextMIdx !== -1 ? tokens[nextMIdx] : null;

    // Check if followed by '(' -> function invocation (e.g. COUNT(), GETDATE(), COALESCE())
    if (nextTok?.value === '(') {
      continue;
    }

    // A. Dot qualification: schema.table.column or table.column or alias.column
    // If followed by a dot '.' and then another identifier
    if (nextTok?.value === '.') {
      const next2MIdx = m + 2 < mLen ? meaningfulIndices[m + 2] : -1;
      const next2Tok = next2MIdx !== -1 ? tokens[next2MIdx] : null;

      if (next2Tok?.type === 'IDENTIFIER' || next2Tok?.type === 'QUOTED_IDENTIFIER') {
        // e.g. "users"."email" -> users is table/alias, email is column
        // or "public"."users"."email"
        const next3MIdx = m + 3 < mLen ? meaningfulIndices[m + 3] : -1;
        const next3Tok = next3MIdx !== -1 ? tokens[next3MIdx] : null;

        if (next3Tok?.value === '.') {
          // Schema qualifier: tok is schema, next2Tok is table
          tableTokens.add(meaningfulIndices[m + 2]);
          tableNames.add(unquoteIdentifier(next2Tok.value));
        } else {
          // tok is table/alias, next2Tok is column
          tableTokens.add(rawIdx);
          tableNames.add(unquoted);

          columnTokens.add(next2MIdx);
          columnNames.add(unquoteIdentifier(next2Tok.value));
        }
      }
      continue;
    }

    // If preceded by a dot '.', it was already classified or is a column/sub-property
    if (prevTok?.value === '.') {
      columnTokens.add(rawIdx);
      columnNames.add(unquoted);
      continue;
    }

    // B. Direct Table contexts:
    // UPDATE <table> [AS <alias>]
    // FROM <table> [AS <alias>]
    // JOIN <table> [AS <alias>]
    // INTO <table> [(cols)]
    // TABLE <table>
    // CREATE TABLE [IF NOT EXISTS] <table>
    // TRUNCATE <table>
    const isTableIfNotExist =
      prevValUpper === 'EXISTS' &&
      m >= 3 &&
      tokens[meaningfulIndices[m - 2]]?.value.toUpperCase() === 'NOT' &&
      tokens[meaningfulIndices[m - 3]]?.value.toUpperCase() === 'IF' &&
      tokens[meaningfulIndices[m - 4]]?.value.toUpperCase() === 'TABLE';

    const isDirectTableContext =
      isTableIfNotExist ||
      prevValUpper === 'UPDATE' ||
      prevValUpper === 'FROM' ||
      prevValUpper === 'JOIN' ||
      prevValUpper === 'INTO' ||
      (prevValUpper === 'TABLE' && !SQL_RESERVED_KEYWORDS.has(tok.value.toUpperCase())) ||
      prevValUpper === 'TRUNCATE' ||
      (prevValUpper === 'ONLY' && prev2Tok?.value.toUpperCase() === 'FROM');

    if (isDirectTableContext) {
      tableTokens.add(rawIdx);
      tableNames.add(unquoted);

      // Check if followed by an alias: FROM users u or FROM users AS u
      if (nextTok?.type === 'IDENTIFIER' || nextTok?.type === 'QUOTED_IDENTIFIER') {
        const nextValUpper = nextTok.value.toUpperCase();
        if (nextValUpper === 'AS') {
          const next2MIdx = m + 2 < mLen ? meaningfulIndices[m + 2] : -1;
          const next2Tok = next2MIdx !== -1 ? tokens[next2MIdx] : null;
          if (next2Tok && (next2Tok.type === 'IDENTIFIER' || next2Tok.type === 'QUOTED_IDENTIFIER')) {
            aliasTokens.add(next2MIdx);
            aliasNames.add(unquoteIdentifier(next2Tok.value));
          }
        } else if (!SQL_RESERVED_KEYWORDS.has(nextValUpper)) {
          // Implicit alias: FROM users u
          aliasTokens.add(nextMIdx);
          aliasNames.add(unquoteIdentifier(nextTok.value));
        }
      }
      continue;
    }

    // C. Explicit AS alias in SELECT: SELECT col AS alias
    if (prevValUpper === 'AS') {
      aliasTokens.add(rawIdx);
      aliasNames.add(unquoted);
      continue;
    }

    // D. Column contexts:
    // SET col = val
    // WHERE col = val
    // SELECT col, ...
    // ORDER BY col
    // GROUP BY col
    // RETURNING col
    // ON tbl1.id = tbl2.id
    // Inside function arguments: SUM(amount)
    // If not a known table, default identifier in SQL statements is a column
    columnTokens.add(rawIdx);
    columnNames.add(unquoted);
  }

  // Cross-check: If an identifier is firmly registered as a table name, remove from columns
  for (const t of tableNames) {
    const lower = t.toLowerCase();
    for (const c of columnNames) {
      if (c.toLowerCase() === lower && !columnTokens.has(Array.from(tableTokens)[0])) {
        columnNames.delete(c);
      }
    }
  }

  return {
    tableTokens,
    columnTokens,
    aliasTokens,
    tableNames,
    columnNames,
    aliasNames,
  };
}

/**
 * Obfuscates a SQL query string, generating or updating a mapping dictionary.
 * 
 * If existingMapping is supplied, identifiers already in the mapping will retain
 * their previous obfuscated name to guarantee consistency across multi-query workflows.
 */
export function obfuscateSqlQuery(
  sql: string,
  options: Partial<QueryObfuscationOptions> = {},
  existingMapping?: QueryObfuscationMapping | null
): ObfuscateResult {
  const opts: QueryObfuscationOptions = {
    ...DEFAULT_OBFUSCATION_OPTIONS,
    ...options,
  };

  const tokens = tokenizeSql(sql);
  const analysis = analyzeSqlTokens(tokens);

  const excluded = new Set((opts.excludedIdentifiers || []).map((s) => s.trim().toLowerCase()));

  // Active mappings
  const tables: Record<string, string> = { ...(existingMapping?.tables || {}) };
  const columns: Record<string, string> = { ...(existingMapping?.columns || {}) };
  const aliases: Record<string, string> = { ...(existingMapping?.aliases || {}) };
  const literals: Record<string, string> = { ...(existingMapping?.literals || {}) };
  const reverseMapping: Record<string, string> = { ...(existingMapping?.reverseMapping || {}) };

  let tableIndex = Object.keys(tables).length;
  let columnIndex = Object.keys(columns).length;
  let aliasIndex = Object.keys(aliases).length;
  let literalIndex = Object.keys(literals).length;

  let replacementsCount = 0;
  const detectedTablesList = Array.from(analysis.tableNames);
  const detectedColumnsList = Array.from(analysis.columnNames);

  // Pre-populate tables in mapping
  if (opts.obfuscateTables) {
    for (const tableName of detectedTablesList) {
      const lower = tableName.toLowerCase();
      if (excluded.has(lower)) continue;

      if (!tables[tableName]) {
        // Check case-insensitive existing
        const existingKey = Object.keys(tables).find((k) => k.toLowerCase() === lower);
        if (existingKey) {
          tables[tableName] = tables[existingKey];
        } else {
          const obfuscated = generateObfuscatedName(opts.tablePrefix, tableIndex++, tableName, opts.namingStyle, true);
          tables[tableName] = obfuscated;
          reverseMapping[obfuscated] = tableName;
        }
      }
    }
  }

  // Pre-populate columns in mapping
  if (opts.obfuscateColumns) {
    for (const colName of detectedColumnsList) {
      const lower = colName.toLowerCase();
      if (excluded.has(lower)) continue;

      if (!columns[colName]) {
        const existingKey = Object.keys(columns).find((k) => k.toLowerCase() === lower);
        if (existingKey) {
          columns[colName] = columns[existingKey];
        } else {
          const obfuscated = generateObfuscatedName(opts.columnPrefix, columnIndex++, colName, opts.namingStyle, false);
          columns[colName] = obfuscated;
          reverseMapping[obfuscated] = colName;
        }
      }
    }
  }

  // Pre-populate aliases in mapping
  if (opts.obfuscateAliases) {
    for (const alias of analysis.aliasNames) {
      const lower = alias.toLowerCase();
      if (excluded.has(lower)) continue;

      if (!aliases[alias] && !tables[alias]) {
        const existingKey = Object.keys(aliases).find((k) => k.toLowerCase() === lower);
        if (existingKey) {
          aliases[alias] = aliases[existingKey];
        } else {
          const obfuscated = generateObfuscatedName('a_', aliasIndex++, alias, 'short', false);
          aliases[alias] = obfuscated;
          reverseMapping[obfuscated] = alias;
        }
      }
    }
  }

  // Rebuild the SQL query token by token
  const outputTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // String literals masking (if enabled)
    if (tok.type === 'STRING_LITERAL' && opts.maskLiterals) {
      const unquoted = tok.normalized;
      if (!literals[unquoted]) {
        const mask = `MASKED_VAL_${++literalIndex}`;
        literals[unquoted] = mask;
        reverseMapping[mask] = unquoted;
      }
      outputTokens.push(`'${literals[unquoted]}'`);
      replacementsCount++;
      continue;
    }

    if (tok.type !== 'IDENTIFIER' && tok.type !== 'QUOTED_IDENTIFIER') {
      outputTokens.push(tok.value);
      continue;
    }

    const rawUnquoted = unquoteIdentifier(tok.value);
    const lower = rawUnquoted.toLowerCase();

    if (excluded.has(lower)) {
      outputTokens.push(tok.value);
      continue;
    }

    let replacement: string | null = null;

    // Check if it's an alias token
    if (opts.obfuscateAliases && (analysis.aliasTokens.has(i) || aliases[rawUnquoted])) {
      replacement = aliases[rawUnquoted] || null;
    }

    // Check if it's a table token or mapped table
    if (!replacement && opts.obfuscateTables && (analysis.tableTokens.has(i) || tables[rawUnquoted])) {
      replacement = tables[rawUnquoted] || null;
      if (!replacement) {
        const found = Object.entries(tables).find(([k]) => k.toLowerCase() === lower);
        if (found) replacement = found[1];
      }
    }

    // Check if it's a column token or mapped column
    if (!replacement && opts.obfuscateColumns && (analysis.columnTokens.has(i) || columns[rawUnquoted])) {
      replacement = columns[rawUnquoted] || null;
      if (!replacement) {
        const found = Object.entries(columns).find(([k]) => k.toLowerCase() === lower);
        if (found) replacement = found[1];
      }
    }

    // Fallback: If it matches any existing table or column in mapping
    if (!replacement) {
      if (tables[rawUnquoted]) replacement = tables[rawUnquoted];
      else if (columns[rawUnquoted]) replacement = columns[rawUnquoted];
    }

    if (replacement) {
      replacementsCount++;
      outputTokens.push(quoteIdentifier(replacement, tok.quoteChar));
    } else {
      outputTokens.push(tok.value);
    }
  }

  const mappingResult: QueryObfuscationMapping = {
    format: 'devhub-sql-obfuscator-mapping',
    version: '1.0',
    id: existingMapping?.id || `mapping-${Date.now()}`,
    name: existingMapping?.name || 'SQL Obfuscation Mapping',
    createdAt: existingMapping?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tables,
    columns,
    aliases,
    literals,
    reverseMapping,
    stats: {
      tablesCount: Object.keys(tables).length,
      columnsCount: Object.keys(columns).length,
      literalsCount: Object.keys(literals).length,
      totalReplacements: replacementsCount,
    },
  };

  return {
    obfuscatedSql: outputTokens.join(''),
    mapping: mappingResult,
    detectedTables: detectedTablesList,
    detectedColumns: detectedColumnsList,
    replacementsCount,
  };
}

/**
 * De-obfuscates an obfuscated SQL query using an active or imported mapping.
 * Faithfully restores original table names, column names, and masked literals.
 */
export function deobfuscateSqlQuery(
  obfuscatedSql: string,
  mapping: QueryObfuscationMapping
): DeobfuscateResult {
  const reverseMap = mapping.reverseMapping || {};
  let restoredCount = 0;
  const unrecognizedTokens: string[] = [];

  // Build a lookup map of obfuscated name -> original name (case-insensitive fallback)
  const lookup: Record<string, string> = { ...reverseMap };

  // Also index from tables, columns, literals in case reverseMapping is missing some keys
  if (mapping.tables) {
    for (const [orig, obf] of Object.entries(mapping.tables)) {
      lookup[obf] = orig;
      lookup[obf.toLowerCase()] = orig;
    }
  }
  if (mapping.columns) {
    for (const [orig, obf] of Object.entries(mapping.columns)) {
      lookup[obf] = orig;
      lookup[obf.toLowerCase()] = orig;
    }
  }
  if (mapping.aliases) {
    for (const [orig, obf] of Object.entries(mapping.aliases)) {
      lookup[obf] = orig;
      lookup[obf.toLowerCase()] = orig;
    }
  }
  if (mapping.literals) {
    for (const [orig, obf] of Object.entries(mapping.literals)) {
      lookup[obf] = orig;
      lookup[obf.toLowerCase()] = orig;
    }
  }

  const tokens = tokenizeSql(obfuscatedSql);
  const outputTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // String literal restore (if masked)
    if (tok.type === 'STRING_LITERAL') {
      const val = tok.normalized;
      if (lookup[val]) {
        outputTokens.push(`'${lookup[val].replace(/'/g, "''")}'`);
        restoredCount++;
        continue;
      }
      outputTokens.push(tok.value);
      continue;
    }

    if (tok.type !== 'IDENTIFIER' && tok.type !== 'QUOTED_IDENTIFIER') {
      outputTokens.push(tok.value);
      continue;
    }

    const unquoted = unquoteIdentifier(tok.value);
    const original = lookup[unquoted] || lookup[unquoted.toLowerCase()];

    if (original) {
      outputTokens.push(quoteIdentifier(original, tok.quoteChar));
      restoredCount++;
    } else {
      outputTokens.push(tok.value);
      if (unquoted.startsWith('tbl_') || unquoted.startsWith('col_') || unquoted.startsWith('a_')) {
        unrecognizedTokens.push(unquoted);
      }
    }
  }

  return {
    deobfuscatedSql: outputTokens.join(''),
    restoredCount,
    unrecognizedTokens: Array.from(new Set(unrecognizedTokens)),
  };
}

/**
 * Validates and normalizes an imported JSON mapping
 */
export function validateImportedMapping(jsonString: string): {
  success: boolean;
  mapping?: QueryObfuscationMapping;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'JSON mapping must be a valid JSON object' };
    }

    // Support flexible imports: either standard schema or simple { tables: {}, columns: {} }
    const tables: Record<string, string> = {};
    const columns: Record<string, string> = {};
    const aliases: Record<string, string> = {};
    const literals: Record<string, string> = {};
    const reverseMapping: Record<string, string> = {};

    if (parsed.tables && typeof parsed.tables === 'object') {
      for (const [k, v] of Object.entries(parsed.tables)) {
        if (typeof v === 'string') {
          tables[k] = v;
          reverseMapping[v] = k;
        }
      }
    }

    if (parsed.columns && typeof parsed.columns === 'object') {
      for (const [k, v] of Object.entries(parsed.columns)) {
        if (typeof v === 'string') {
          columns[k] = v;
          reverseMapping[v] = k;
        }
      }
    }

    if (parsed.aliases && typeof parsed.aliases === 'object') {
      for (const [k, v] of Object.entries(parsed.aliases)) {
        if (typeof v === 'string') {
          aliases[k] = v;
          reverseMapping[v] = k;
        }
      }
    }

    if (parsed.literals && typeof parsed.literals === 'object') {
      for (const [k, v] of Object.entries(parsed.literals)) {
        if (typeof v === 'string') {
          literals[k] = v;
          reverseMapping[v] = k;
        }
      }
    }

    // Direct reverseMapping override if present
    if (parsed.reverseMapping && typeof parsed.reverseMapping === 'object') {
      for (const [k, v] of Object.entries(parsed.reverseMapping)) {
        if (typeof v === 'string') reverseMapping[k] = v;
      }
    }

    if (Object.keys(tables).length === 0 && Object.keys(columns).length === 0 && Object.keys(reverseMapping).length === 0) {
      return { success: false, error: 'Mapping file contains no valid table, column, or reverse mapping entries' };
    }

    const mapping: QueryObfuscationMapping = {
      format: 'devhub-sql-obfuscator-mapping',
      version: parsed.version || '1.0',
      id: parsed.id || `mapping-${Date.now()}`,
      name: parsed.name || 'Imported SQL Mapping',
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tables,
      columns,
      aliases,
      literals,
      reverseMapping,
      stats: {
        tablesCount: Object.keys(tables).length,
        columnsCount: Object.keys(columns).length,
        literalsCount: Object.keys(literals).length,
        totalReplacements: parsed.stats?.totalReplacements || (Object.keys(tables).length + Object.keys(columns).length),
      },
    };

    return { success: true, mapping };
  } catch (err: any) {
    return { success: false, error: `Invalid JSON syntax: ${err.message}` };
  }
}

/**
 * Rich presets for SQL Query Obfuscation
 */
export interface QueryPreset {
  id: string;
  name: string;
  dialect: SqlDialect;
  description: string;
  badge: string;
  sql: string;
}

export const SQL_QUERY_PRESETS: QueryPreset[] = [
  {
    id: 'update-sme-mismatch',
    name: 'SME Category Mismatch UPDATE with CASE',
    dialect: 'postgres',
    description: 'Real-world business entities category correction UPDATE query with CASE condition',
    badge: 'UPDATE / PostgreSQL',
    sql: `-- Fix business entities category classification based on financial metrics
UPDATE "business_entities"
SET "current_category" = 
  CASE
    WHEN "no_of_employees" <= 9 AND ("annual_turnover" <= 2000000 OR "balance_sheet" <= 2000000) THEN 'Micro SME'
    WHEN "no_of_employees" <= 249 AND ("annual_turnover" <= 50000000 OR "balance_sheet" <= 43000000) THEN 'SME'
    WHEN "no_of_employees" <= 499 THEN 'Small Midcap'
    ELSE 'Large Enterprise'
  END,
  "updated_at" = CURRENT_TIMESTAMP
WHERE 
  "current_category" IS DISTINCT FROM (
    CASE
      WHEN "no_of_employees" <= 9 AND ("annual_turnover" <= 2000000 OR "balance_sheet" <= 2000000) THEN 'Micro SME'
      WHEN "no_of_employees" <= 249 AND ("annual_turnover" <= 50000000 OR "balance_sheet" <= 43000000) THEN 'SME'
      WHEN "no_of_employees" <= 499 THEN 'Small Midcap'
      ELSE 'Large Enterprise'
    END
  );`,
  },
  {
    id: 'safe-audit-staging-update',
    name: 'Safe Staging & Audit Backup Table UPDATE',
    dialect: 'postgres',
    description: 'Creates audit table with snapshot of mismatched rows and metrics, then runs UPDATE',
    badge: 'Staging & Audit / DDL',
    sql: `-- Step 1: Snapshot defective rows and all metric values into an audit backup table
CREATE TABLE IF NOT EXISTS "business_entities_category_fix_audit" (
  audit_id SERIAL PRIMARY KEY,
  entity_id VARCHAR(255),
  entity_name VARCHAR(255),
  old_category VARCHAR(255),
  new_category VARCHAR(255),
  "no_of_employees" INTEGER,
  "annual_turnover" NUMERIC,
  "balance_sheet" NUMERIC,
  fixed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "business_entities_category_fix_audit" (
  entity_id, entity_name, old_category, new_category, "no_of_employees", "annual_turnover", "balance_sheet"
)
SELECT
  "id"::text,
  "business_name"::text,
  "current_category"::text,
  'SME',
  "no_of_employees",
  "annual_turnover",
  "balance_sheet"
FROM "business_entities"
WHERE "current_category" != 'SME';

-- Step 2: Apply the category fix safely
UPDATE "business_entities"
SET "current_category" = 'SME'
WHERE "id"::text IN (
  SELECT entity_id FROM "business_entities_category_fix_audit"
  WHERE fixed_at >= CURRENT_DATE
);`,
  },
  {
    id: 'complex-multi-join-select',
    name: 'E-Commerce Analytics CTE & Multi-Table JOIN',
    dialect: 'generic',
    description: 'Complex analytics query joining customers, orders, order_items, and products with aggregations',
    badge: 'Analytics / SELECT',
    sql: `WITH customer_spending AS (
  SELECT 
    c.customer_id,
    c.full_name,
    c.email_address,
    COUNT(o.order_id) AS total_orders,
    SUM(oi.quantity * oi.unit_price) AS lifetime_value
  FROM customers c
  INNER JOIN orders o ON o.customer_id = c.customer_id
  INNER JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.order_status = 'COMPLETED'
    AND o.order_date >= '2025-01-01'
  GROUP BY c.customer_id, c.full_name, c.email_address
)
SELECT 
  cs.customer_id,
  cs.full_name,
  cs.lifetime_value,
  p.product_name,
  p.sku_code,
  p.inventory_count
FROM customer_spending cs
LEFT JOIN product_recommendations pr ON pr.customer_id = cs.customer_id
LEFT JOIN products p ON p.product_id = pr.recommended_product_id
ORDER BY cs.lifetime_value DESC
LIMIT 100;`,
  },
  {
    id: 'mysql-cross-table-update',
    name: 'MySQL Multi-Table UPDATE with Backticks',
    dialect: 'mysql',
    description: 'Multi-table UPDATE syntax updating pricing and discount columns using MySQL backticks',
    badge: 'UPDATE / MySQL',
    sql: `UPDATE \`products\` p
JOIN \`supplier_discounts\` sd ON sd.\`product_id\` = p.\`id\`
JOIN \`suppliers\` s ON s.\`id\` = sd.\`supplier_id\`
SET 
  p.\`unit_cost\` = sd.\`discounted_cost\`,
  p.\`margin_rate\` = (p.\`retail_price\` - sd.\`discounted_cost\`) / p.\`retail_price\`,
  p.\`last_audited\` = CURRENT_TIMESTAMP
WHERE s.\`rating_tier\` = 'TIER_1'
  AND sd.\`effective_date\` <= CURRENT_DATE;`,
  },
  {
    id: 'sqlserver-merge-upsert',
    name: 'SQL Server T-SQL MERGE with Square Brackets',
    dialect: 'sqlserver',
    description: 'SQL Server MERGE statement synchronizing staging records to master tables with [brackets]',
    badge: 'MERGE / SQL Server',
    sql: `MERGE INTO [Production].[CustomerAccounts] AS [Target]
USING [Staging].[IncomingAccounts] AS [Source]
ON [Target].[AccountNumber] = [Source].[AccountNumber]
WHEN MATCHED AND [Source].[BalanceAmount] <> [Target].[BalanceAmount] THEN
  UPDATE SET 
    [Target].[BalanceAmount] = [Source].[BalanceAmount],
    [Target].[CreditScore] = [Source].[CreditScore],
    [Target].[ModifiedDate] = GETDATE()
WHEN NOT MATCHED BY TARGET THEN
  INSERT ([AccountNumber], [AccountHolder], [BalanceAmount], [CreditScore], [CreatedDate])
  VALUES ([Source].[AccountNumber], [Source].[AccountHolder], [Source].[BalanceAmount], [Source].[CreditScore], GETDATE());`,
  },
];
