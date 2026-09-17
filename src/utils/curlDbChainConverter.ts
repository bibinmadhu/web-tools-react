import { parseCurlCommand, ParsedCurlRequest } from './curlParser';
import { toPythonLiteral } from './curlToCode';
import {
  BaseUrlConstant,
  extractBaseUrls,
  formatPythonUrl,
  generateSingleCallSnippet,
  generateTokenExtractionCode,
  getHeaderValuePythonExpr,
  PythonClientLibrary,
  ScriptStructure,
  TokenExtractionConfig,
  TokenInjectionConfig,
  DEFAULT_EXTRACTION_CONFIG,
  DEFAULT_INJECTION_CONFIG,
} from './curlChainConverter';

export type ChainStepType = 'curl' | 'database';

export interface CurlChainStep {
  id: string;
  type: 'curl';
  name: string;
  curl: string;
  enabled: boolean;
  customHeaderOverride?: string;
  extractVariable?: {
    variableName: string;
    keyPath: string;
    source: 'json_body' | 'response_header';
  };
}

export interface DatabaseChainStep {
  id: string;
  type: 'database';
  name: string;
  query: string;
  params: string; // Python parameter expression e.g. "(token,)" or "('active', token)" or ""
  fetchMode: 'fetchall' | 'fetchone' | 'execute';
  enabled: boolean;
  description?: string;
  assertRowCount?: boolean;
  assertCondition?: string; // e.g. "len(rows) > 0" or "row['id'] is not None"
  storeResultVariable?: string; // e.g. "user_record"
}

export type AnyChainStep = CurlChainStep | DatabaseChainStep;

export type SupportedDatabaseType = 'postgresql' | 'sqlserver' | 'oracle';
export type SqlServerDriver = 'pymssql' | 'pyodbc';

export interface DatabaseConfig {
  dbType: SupportedDatabaseType;
  host: string;
  port: number;
  database: string; // Database name, or service name/SID for Oracle
  user: string;
  password: string;

  // PostgreSQL specific
  interfaceStyle?: 'dbapi' | 'native'; // pg8000.dbapi vs pg8000.native

  // SQL Server specific
  sqlServerDriver?: SqlServerDriver;
  sqlServerOdbcDriverName?: string; // e.g. 'ODBC Driver 18 for SQL Server'
  trustServerCertificate?: boolean;

  // Oracle specific
  oracleServiceName?: string;
  oracleConnectionType?: 'service_name' | 'sid' | 'dsn';
  oracleSid?: string;

  // Common flags
  ssl: boolean;
  useEnvVars: boolean;
  connectionMode: 'shared' | 'per_step';
  autoCommit: boolean;
  returnAsDict: boolean;
}

// Backward compatibility alias for PostgreSQL
export type PostgresConfig = DatabaseConfig;

export interface PythonDbChainOptions {
  httpLibrary: PythonClientLibrary;
  structure: ScriptStructure;
  includeErrorHandling: boolean;
  includeAssertions: boolean;
  timeoutSeconds: number;
  printResponses: boolean;
  printDbResults: boolean;
  useTypeHints: boolean;
  baseUrlVariable: boolean;
  modularMethods: boolean;
}

export const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  dbType: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '',
  ssl: false,
  useEnvVars: true,
  connectionMode: 'shared',
  interfaceStyle: 'dbapi',
  sqlServerDriver: 'pymssql',
  sqlServerOdbcDriverName: 'ODBC Driver 18 for SQL Server',
  trustServerCertificate: true,
  oracleServiceName: 'XEPDB1',
  oracleConnectionType: 'service_name',
  oracleSid: 'ORCL',
  autoCommit: true,
  returnAsDict: true,
};

export const DEFAULT_POSTGRES_CONFIG: PostgresConfig = DEFAULT_DATABASE_CONFIG;

export const DEFAULT_DB_CHAIN_OPTIONS: PythonDbChainOptions = {
  httpLibrary: 'requests',
  structure: 'session',
  includeErrorHandling: true,
  includeAssertions: true,
  timeoutSeconds: 30,
  printResponses: true,
  printDbResults: true,
  useTypeHints: true,
  baseUrlVariable: true,
  modularMethods: true,
};

export function getDatabaseMeta(dbType: SupportedDatabaseType, config?: Partial<DatabaseConfig>) {
  switch (dbType) {
    case 'sqlserver':
      const isOdbc = config?.sqlServerDriver === 'pyodbc';
      return {
        type: 'sqlserver' as const,
        name: 'Microsoft SQL Server',
        shortName: 'SQL Server',
        defaultPort: 1433,
        defaultUser: 'sa',
        defaultDb: 'master',
        driverPackage: isOdbc ? 'pyodbc' : 'pymssql',
        pipPackage: isOdbc ? 'pyodbc' : 'pymssql',
        envPrefix: 'MSSQL',
        paramStyle: isOdbc ? '?' : '%s',
        badge: isOdbc ? 'SQL Server (pyodbc)' : 'SQL Server (pymssql)',
        description: 'Enterprise T-SQL database connected via pure-python DB-API pymssql or pyodbc',
      };
    case 'oracle':
      return {
        type: 'oracle' as const,
        name: 'Oracle Database',
        shortName: 'Oracle DB',
        defaultPort: 1521,
        defaultUser: 'SYSTEM',
        defaultDb: 'XEPDB1',
        driverPackage: 'oracledb',
        pipPackage: 'oracledb',
        envPrefix: 'ORACLE',
        paramStyle: ':1 or :name',
        badge: 'Oracle (oracledb thin)',
        description: 'Oracle enterprise database connected in zero-client Thin Mode via modern oracledb',
      };
    case 'postgresql':
    default:
      return {
        type: 'postgresql' as const,
        name: 'PostgreSQL',
        shortName: 'PostgreSQL',
        defaultPort: 5432,
        defaultUser: 'postgres',
        defaultDb: 'postgres',
        driverPackage: 'pg8000',
        pipPackage: 'pg8000',
        envPrefix: 'PG',
        paramStyle: '%s',
        badge: 'PostgreSQL (pg8000)',
        description: 'Pure-python PostgreSQL driver with DB-API 2.0 and native interfaces',
      };
  }
}

function pyEscape(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function sanitizeDbMethodName(name: string, stepIndex: number): string {
  const clean = name
    .toLowerCase()
    .replace(/^step\s*\d+\s*[:\-]?\s*/i, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `db_step_${stepIndex}_${clean || 'query'}`;
}

export function sanitizeApiMethodName(name: string, stepIndex: number): string {
  const clean = name
    .toLowerCase()
    .replace(/^step\s*\d+\s*[:\-]?\s*/i, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `step_${stepIndex}_${clean || 'api_call'}`;
}

/**
 * Generates the Python code for database connection configuration
 */
function renderDatabaseConfigBlock(dbConfig: DatabaseConfig): string[] {
  const lines: string[] = [];
  const meta = getDatabaseMeta(dbConfig.dbType, dbConfig);

  lines.push('# ==============================================================================');
  lines.push(`# ${meta.name} Configuration (${meta.driverPackage})`);
  lines.push('# ==============================================================================');

  if (dbConfig.dbType === 'postgresql') {
    if (dbConfig.useEnvVars) {
      lines.push(`PG_HOST = os.environ.get("PGHOST", "${pyEscape(dbConfig.host || 'localhost')}")`);
      lines.push(`PG_PORT = int(os.environ.get("PGPORT", "${dbConfig.port || 5432}"))`);
      lines.push(`PG_DATABASE = os.environ.get("PGDATABASE", "${pyEscape(dbConfig.database || 'postgres')}")`);
      lines.push(`PG_USER = os.environ.get("PGUSER", "${pyEscape(dbConfig.user || 'postgres')}")`);
      lines.push(`PG_PASSWORD = os.environ.get("PGPASSWORD", "${pyEscape(dbConfig.password || '')}")`);
    } else {
      lines.push(`PG_HOST = "${pyEscape(dbConfig.host || 'localhost')}"`);
      lines.push(`PG_PORT = ${dbConfig.port || 5432}`);
      lines.push(`PG_DATABASE = "${pyEscape(dbConfig.database || 'postgres')}"`);
      lines.push(`PG_USER = "${pyEscape(dbConfig.user || 'postgres')}"`);
      lines.push(`PG_PASSWORD = "${pyEscape(dbConfig.password || '')}"`);
    }

    if (dbConfig.ssl) {
      lines.push('PG_SSL_CONTEXT = ssl.create_default_context()');
    }
  } else if (dbConfig.dbType === 'sqlserver') {
    const isOdbc = dbConfig.sqlServerDriver === 'pyodbc';
    if (dbConfig.useEnvVars) {
      lines.push(`MSSQL_HOST = os.environ.get("MSSQL_HOST", "${pyEscape(dbConfig.host || 'localhost')}")`);
      lines.push(`MSSQL_PORT = int(os.environ.get("MSSQL_PORT", "${dbConfig.port || 1433}"))`);
      lines.push(`MSSQL_DATABASE = os.environ.get("MSSQL_DATABASE", "${pyEscape(dbConfig.database || 'master')}")`);
      lines.push(`MSSQL_USER = os.environ.get("MSSQL_USER", "${pyEscape(dbConfig.user || 'sa')}")`);
      lines.push(`MSSQL_PASSWORD = os.environ.get("MSSQL_PASSWORD", "${pyEscape(dbConfig.password || '')}")`);
      if (isOdbc) {
        lines.push(`MSSQL_ODBC_DRIVER = os.environ.get("MSSQL_ODBC_DRIVER", "${pyEscape(dbConfig.sqlServerOdbcDriverName || 'ODBC Driver 18 for SQL Server')}")`);
      }
    } else {
      lines.push(`MSSQL_HOST = "${pyEscape(dbConfig.host || 'localhost')}"`);
      lines.push(`MSSQL_PORT = ${dbConfig.port || 1433}`);
      lines.push(`MSSQL_DATABASE = "${pyEscape(dbConfig.database || 'master')}"`);
      lines.push(`MSSQL_USER = "${pyEscape(dbConfig.user || 'sa')}"`);
      lines.push(`MSSQL_PASSWORD = "${pyEscape(dbConfig.password || '')}"`);
      if (isOdbc) {
        lines.push(`MSSQL_ODBC_DRIVER = "${pyEscape(dbConfig.sqlServerOdbcDriverName || 'ODBC Driver 18 for SQL Server')}"`);
      }
    }
    if (isOdbc && dbConfig.trustServerCertificate) {
      lines.push('MSSQL_TRUST_CERT = True');
    }
  } else if (dbConfig.dbType === 'oracle') {
    const serviceOrSid = dbConfig.oracleServiceName || dbConfig.database || 'XEPDB1';
    if (dbConfig.useEnvVars) {
      lines.push(`ORACLE_HOST = os.environ.get("ORACLE_HOST", "${pyEscape(dbConfig.host || 'localhost')}")`);
      lines.push(`ORACLE_PORT = int(os.environ.get("ORACLE_PORT", "${dbConfig.port || 1521}"))`);
      lines.push(`ORACLE_SERVICE_NAME = os.environ.get("ORACLE_SERVICE_NAME", "${pyEscape(serviceOrSid)}")`);
      lines.push(`ORACLE_USER = os.environ.get("ORACLE_USER", "${pyEscape(dbConfig.user || 'SYSTEM')}")`);
      lines.push(`ORACLE_PASSWORD = os.environ.get("ORACLE_PASSWORD", "${pyEscape(dbConfig.password || '')}")`);
    } else {
      lines.push(`ORACLE_HOST = "${pyEscape(dbConfig.host || 'localhost')}"`);
      lines.push(`ORACLE_PORT = ${dbConfig.port || 1521}`);
      lines.push(`ORACLE_SERVICE_NAME = "${pyEscape(serviceOrSid)}"`);
      lines.push(`ORACLE_USER = "${pyEscape(dbConfig.user || 'SYSTEM')}"`);
      lines.push(`ORACLE_PASSWORD = "${pyEscape(dbConfig.password || '')}"`);
    }
  }

  lines.push('');
  return lines;
}

/**
 * Generates database connection helper function
 */
function renderGetDbConnectionFunction(dbConfig: DatabaseConfig, options: PythonDbChainOptions): string[] {
  const lines: string[] = [];
  const ind = '    ';

  if (dbConfig.dbType === 'postgresql') {
    const sslArg = dbConfig.ssl ? ', ssl_context=PG_SSL_CONTEXT' : '';
    if (dbConfig.interfaceStyle === 'native') {
      const retType = options.useTypeHints ? ' -> pg8000.native.Connection' : '';
      lines.push(`def get_db_connection()${retType}:`);
      lines.push(`${ind}"""Establishes native connection to PostgreSQL via pg8000.native"""`);
      lines.push(`${ind}return pg8000.native.Connection(`);
      lines.push(`${ind}${ind}host=PG_HOST,`);
      lines.push(`${ind}${ind}port=PG_PORT,`);
      lines.push(`${ind}${ind}database=PG_DATABASE,`);
      lines.push(`${ind}${ind}user=PG_USER,`);
      lines.push(`${ind}${ind}password=PG_PASSWORD${sslArg}`);
      lines.push(`${ind})`);
    } else {
      const retType = options.useTypeHints ? ' -> pg8000.dbapi.Connection' : '';
      lines.push(`def get_db_connection()${retType}:`);
      lines.push(`${ind}"""Establishes DB-API 2.0 connection to PostgreSQL via pg8000.dbapi"""`);
      lines.push(`${ind}return pg8000.dbapi.connect(`);
      lines.push(`${ind}${ind}host=PG_HOST,`);
      lines.push(`${ind}${ind}port=PG_PORT,`);
      lines.push(`${ind}${ind}database=PG_DATABASE,`);
      lines.push(`${ind}${ind}user=PG_USER,`);
      lines.push(`${ind}${ind}password=PG_PASSWORD${sslArg}`);
      lines.push(`${ind})`);
    }
  } else if (dbConfig.dbType === 'sqlserver') {
    if (dbConfig.sqlServerDriver === 'pyodbc') {
      const retType = options.useTypeHints ? ' -> pyodbc.Connection' : '';
      lines.push(`def get_db_connection()${retType}:`);
      lines.push(`${ind}"""Establishes connection to Microsoft SQL Server via pyodbc"""`);
      lines.push(`${ind}conn_str = (`);
      lines.push(`${ind}${ind}f"DRIVER={{{MSSQL_ODBC_DRIVER}}};"`);
      lines.push(`${ind}${ind}f"SERVER={MSSQL_HOST},{MSSQL_PORT};"`);
      lines.push(`${ind}${ind}f"DATABASE={MSSQL_DATABASE};"`);
      lines.push(`${ind}${ind}f"UID={MSSQL_USER};"`);
      lines.push(`${ind}${ind}f"PWD={MSSQL_PASSWORD};"`);
      if (dbConfig.trustServerCertificate) {
        lines.push(`${ind}${ind}"TrustServerCertificate=yes;"`);
      }
      lines.push(`${ind})`);
      lines.push(`${ind}return pyodbc.connect(conn_str, autocommit=${dbConfig.autoCommit ? 'True' : 'False'})`);
    } else {
      // pymssql
      const retType = options.useTypeHints ? ' -> pymssql.Connection' : '';
      lines.push(`def get_db_connection()${retType}:`);
      lines.push(`${ind}"""Establishes connection to Microsoft SQL Server via pymssql"""`);
      lines.push(`${ind}return pymssql.connect(`);
      lines.push(`${ind}${ind}server=MSSQL_HOST,`);
      lines.push(`${ind}${ind}port=MSSQL_PORT,`);
      lines.push(`${ind}${ind}database=MSSQL_DATABASE,`);
      lines.push(`${ind}${ind}user=MSSQL_USER,`);
      lines.push(`${ind}${ind}password=MSSQL_PASSWORD,`);
      lines.push(`${ind}${ind}as_dict=${dbConfig.returnAsDict ? 'True' : 'False'},`);
      lines.push(`${ind}${ind}autocommit=${dbConfig.autoCommit ? 'True' : 'False'}`);
      lines.push(`${ind})`);
    }
  } else if (dbConfig.dbType === 'oracle') {
    const retType = options.useTypeHints ? ' -> oracledb.Connection' : '';
    lines.push(`def get_db_connection()${retType}:`);
    lines.push(`${ind}"""Establishes connection to Oracle Database in Thin Mode via oracledb"""`);
    lines.push(`${ind}conn = oracledb.connect(`);
    lines.push(`${ind}${ind}user=ORACLE_USER,`);
    lines.push(`${ind}${ind}password=ORACLE_PASSWORD,`);
    lines.push(`${ind}${ind}host=ORACLE_HOST,`);
    lines.push(`${ind}${ind}port=ORACLE_PORT,`);
    lines.push(`${ind}${ind}service_name=ORACLE_SERVICE_NAME`);
    lines.push(`${ind})`);
    if (dbConfig.autoCommit) {
      lines.push(`${ind}conn.autocommit = True`);
    }
    lines.push(`${ind}return conn`);
  }

  lines.push('');
  return lines;
}

/**
 * Generates an individual database operation function
 */
function renderDatabaseStepFunction(
  step: DatabaseChainStep,
  stepNum: number,
  dbConfig: DatabaseConfig,
  options: PythonDbChainOptions,
  tokenVar: string
): string[] {
  const lines: string[] = [];
  const ind = '    ';
  const meta = getDatabaseMeta(dbConfig.dbType, dbConfig);
  const fnName = sanitizeDbMethodName(step.name || `db_query_${stepNum}`, stepNum);

  let connType = 'db_conn';
  if (options.useTypeHints) {
    if (dbConfig.dbType === 'postgresql') {
      connType = dbConfig.interfaceStyle === 'native' ? 'db_conn: pg8000.native.Connection' : 'db_conn: pg8000.dbapi.Connection';
    } else if (dbConfig.dbType === 'sqlserver') {
      connType = dbConfig.sqlServerDriver === 'pyodbc' ? 'db_conn: pyodbc.Connection' : 'db_conn: pymssql.Connection';
    } else if (dbConfig.dbType === 'oracle') {
      connType = 'db_conn: oracledb.Connection';
    }
  }

  // Parameters list for method
  const needsToken = step.params.includes(tokenVar) || step.query.includes('%s') || step.query.includes(':') || step.query.includes('?');
  const tokenParam = needsToken ? (options.useTypeHints ? `, ${tokenVar}: str = ""` : `, ${tokenVar}=""`) : '';
  const returnType = options.useTypeHints ? (step.fetchMode === 'execute' ? ' -> int' : ' -> list') : '';

  lines.push(`def ${fnName}(${connType}${tokenParam})${returnType}:`);
  lines.push(`${ind}"""[Step ${stepNum} - ${meta.shortName}] ${step.name || 'Execute Query'}"""`);
  lines.push(`${ind}print(f"\\n[{stepNum}/DB] Executing ${meta.shortName} query: ${pyEscape(step.name || 'Database Operation')}...")`);

  const cleanQuery = step.query.trim().replace(/\r\n/g, '\n');
  lines.push(`${ind}query = """${cleanQuery}"""`);

  // Format parameters
  let paramsExpr = '()';
  if (step.params && step.params.trim().length > 0) {
    const rawParams = step.params.trim();
    if (rawParams.startsWith('(') && rawParams.endsWith(')')) {
      paramsExpr = rawParams;
    } else if (rawParams.startsWith('[') && rawParams.endsWith(']')) {
      paramsExpr = rawParams;
    } else if (rawParams.startsWith('{') && rawParams.endsWith('}')) {
      paramsExpr = rawParams;
    } else {
      paramsExpr = ifNotTuple(rawParams);
    }
  }

  // PostgreSQL Native mode
  if (dbConfig.dbType === 'postgresql' && dbConfig.interfaceStyle === 'native') {
    lines.push(`${ind}try:`);
    if (paramsExpr !== '()') {
      lines.push(`${ind}${ind}results = db_conn.run(query, ${paramsExpr})`);
    } else {
      lines.push(`${ind}${ind}results = db_conn.run(query)`);
    }
    if (options.printDbResults) {
      lines.push(`${ind}${ind}print(f"  ✓ DB query executed successfully. Returned {len(results)} row(s):")`);
      lines.push(`${ind}${ind}for idx, r in enumerate(results[:5]):`);
      lines.push(`${ind}${ind}    print(f"    [{idx + 1}] {r}")`);
    }
    if (options.includeAssertions && step.assertRowCount) {
      const cond = step.assertCondition || 'len(results) > 0';
      lines.push(`${ind}${ind}assert ${cond}, f"${meta.shortName} Assertion failed on step ${stepNum}: condition '{${pyEscape(cond)}}' was false"`);
      lines.push(`${ind}${ind}print(f"  ✓ Assertion passed: {${pyEscape(cond)}}")`);
    }
    lines.push(`${ind}${ind}return results`);
    lines.push(`${ind}except Exception as e:`);
    lines.push(`${ind}${ind}print(f"  ✗ ${meta.shortName} Error on step ${stepNum}: {e}")`);
    lines.push(`${ind}${ind}raise`);
    lines.push('');
    return lines;
  }

  // Standard DB-API cursor pattern (PostgreSQL pg8000.dbapi, SQL Server pymssql/pyodbc, Oracle oracledb)
  if (dbConfig.dbType === 'sqlserver' && dbConfig.sqlServerDriver !== 'pyodbc' && dbConfig.returnAsDict) {
    lines.push(`${ind}cursor = db_conn.cursor(as_dict=True)`);
  } else {
    lines.push(`${ind}cursor = db_conn.cursor()`);
  }

  lines.push(`${ind}try:`);
  if (paramsExpr !== '()') {
    lines.push(`${ind}${ind}cursor.execute(query, ${paramsExpr})`);
  } else {
    lines.push(`${ind}${ind}cursor.execute(query)`);
  }

  if (step.fetchMode === 'fetchall') {
    if (dbConfig.dbType === 'sqlserver' && dbConfig.sqlServerDriver !== 'pyodbc' && dbConfig.returnAsDict) {
      // pymssql with as_dict=True directly yields dictionary rows
      lines.push(`${ind}${ind}rows = cursor.fetchall()`);
    } else if (dbConfig.dbType === 'oracle') {
      lines.push(`${ind}${ind}columns = [desc[0].lower() for desc in cursor.description] if cursor.description else []`);
      lines.push(`${ind}${ind}raw_rows = cursor.fetchall()`);
      lines.push(`${ind}${ind}rows = [dict(zip(columns, row)) for row in raw_rows] if columns else raw_rows`);
    } else if (dbConfig.returnAsDict) {
      lines.push(`${ind}${ind}columns = [desc[0] for desc in cursor.description] if cursor.description else []`);
      lines.push(`${ind}${ind}raw_rows = cursor.fetchall()`);
      lines.push(`${ind}${ind}rows = [dict(zip(columns, row)) for row in raw_rows] if columns else raw_rows`);
    } else {
      lines.push(`${ind}${ind}rows = cursor.fetchall()`);
    }

    if (options.printDbResults) {
      lines.push(`${ind}${ind}print(f"  ✓ DB query returned {len(rows)} row(s):")`);
      lines.push(`${ind}${ind}for idx, r in enumerate(rows[:5]):`);
      lines.push(`${ind}${ind}    print(f"    [{idx + 1}] {r}")`);
    }

    if (options.includeAssertions && step.assertRowCount) {
      const cond = step.assertCondition || 'len(rows) > 0';
      lines.push(`${ind}${ind}assert ${cond}, f"${meta.shortName} Assertion failed on step ${stepNum}: condition '{${pyEscape(cond)}}' was false"`);
      lines.push(`${ind}${ind}print(f"  ✓ Assertion passed: {${pyEscape(cond)}}")`);
    }

    lines.push(`${ind}${ind}return rows`);
  } else if (step.fetchMode === 'fetchone') {
    if (dbConfig.dbType === 'sqlserver' && dbConfig.sqlServerDriver !== 'pyodbc' && dbConfig.returnAsDict) {
      lines.push(`${ind}${ind}row = cursor.fetchone()`);
    } else if (dbConfig.dbType === 'oracle') {
      lines.push(`${ind}${ind}columns = [desc[0].lower() for desc in cursor.description] if cursor.description else []`);
      lines.push(`${ind}${ind}raw_row = cursor.fetchone()`);
      lines.push(`${ind}${ind}row = dict(zip(columns, raw_row)) if raw_row and columns else raw_row`);
    } else if (dbConfig.returnAsDict) {
      lines.push(`${ind}${ind}columns = [desc[0] for desc in cursor.description] if cursor.description else []`);
      lines.push(`${ind}${ind}raw_row = cursor.fetchone()`);
      lines.push(`${ind}${ind}row = dict(zip(columns, raw_row)) if raw_row and columns else raw_row`);
    } else {
      lines.push(`${ind}${ind}row = cursor.fetchone()`);
    }

    if (options.printDbResults) {
      lines.push(`${ind}${ind}print(f"  ✓ DB query returned single row: {row}")`);
    }

    if (options.includeAssertions && step.assertRowCount) {
      const cond = step.assertCondition || 'row is not None';
      lines.push(`${ind}${ind}assert ${cond}, f"${meta.shortName} Assertion failed on step ${stepNum}: condition '{${pyEscape(cond)}}' was false"`);
      lines.push(`${ind}${ind}print(f"  ✓ Assertion passed: {${pyEscape(cond)}}")`);
    }

    lines.push(`${ind}${ind}return row`);
  } else {
    // DML (execute, commit)
    if (dbConfig.autoCommit) {
      lines.push(`${ind}${ind}if not getattr(db_conn, 'autocommit', False):`);
      lines.push(`${ind}${ind}    db_conn.commit()`);
    }
    lines.push(`${ind}${ind}rowcount = cursor.rowcount`);
    if (options.printDbResults) {
      lines.push(`${ind}${ind}print(f"  ✓ DB mutation executed. Affected rows: {rowcount}")`);
    }
    lines.push(`${ind}${ind}return rowcount`);
  }

  lines.push(`${ind}except Exception as e:`);
  if (dbConfig.autoCommit) {
    lines.push(`${ind}${ind}try:`);
    lines.push(`${ind}${ind}    db_conn.rollback()`);
    lines.push(`${ind}${ind}except Exception:`);
    lines.push(`${ind}${ind}    pass`);
  }
  lines.push(`${ind}${ind}print(f"  ✗ ${meta.shortName} Error on step ${stepNum}: {e}")`);
  lines.push(`${ind}${ind}raise`);
  lines.push(`${ind}finally:`);
  lines.push(`${ind}${ind}cursor.close()`);

  lines.push('');
  return lines;
}

function ifNotTuple(raw: string): string {
  if (raw.includes(',')) {
    return `(${raw})`;
  }
  return `(${raw},)`;
}

/**
 * Main Generator for cURL & Database Chain to Python
 */
export function generateCurlAndDatabaseScript(
  loginCurl: string,
  steps: AnyChainStep[],
  extraction: TokenExtractionConfig = DEFAULT_EXTRACTION_CONFIG,
  injection: TokenInjectionConfig = DEFAULT_INJECTION_CONFIG,
  dbConfig: DatabaseConfig = DEFAULT_DATABASE_CONFIG,
  options: PythonDbChainOptions = DEFAULT_DB_CHAIN_OPTIONS
): string {
  const parsedLogin = parseCurlCommand(loginCurl);
  const enabledSteps = steps.filter((s) => s.enabled);

  // Separate cURL steps for base URL extraction
  const curlSteps = enabledSteps
    .filter((s): s is CurlChainStep => s.type === 'curl')
    .map((s) => ({
      ...s,
      parsed: parseCurlCommand(s.curl),
    }));

  const { constants: baseUrlConstants, originToConstantMap } = options.baseUrlVariable
    ? extractBaseUrls(parsedLogin, curlSteps)
    : { constants: [], originToConstantMap: new Map<string, string>() };

  const isAsync = options.httpLibrary === 'httpx_async' || options.httpLibrary === 'aiohttp';
  const tokenVar = extraction.variableName || 'token';

  switch (options.structure) {
    case 'class_client':
      return generateClassClientScript(
        parsedLogin,
        enabledSteps,
        curlSteps,
        extraction,
        injection,
        dbConfig,
        options,
        isAsync,
        tokenVar,
        baseUrlConstants,
        originToConstantMap
      );
    case 'functions':
    case 'sequential':
    case 'session':
    default:
      return generateModularSessionScript(
        parsedLogin,
        enabledSteps,
        curlSteps,
        extraction,
        injection,
        dbConfig,
        options,
        isAsync,
        tokenVar,
        baseUrlConstants,
        originToConstantMap
      );
  }
}

/**
 * Session & Modular Functions generator combining HTTP requests & Database operations
 */
function generateModularSessionScript(
  loginReq: ParsedCurlRequest,
  allSteps: AnyChainStep[],
  curlSteps: (CurlChainStep & { parsed: ParsedCurlRequest })[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  dbConfig: DatabaseConfig,
  options: PythonDbChainOptions,
  isAsync: boolean,
  tokenVar: string,
  baseUrlConstants: BaseUrlConstant[],
  originToConstantMap: Map<string, string>
): string {
  const lines: string[] = [];
  const ind = '    ';
  const asyncPrefix = isAsync ? 'async ' : '';
  const awaitPref = isAsync ? 'await ' : '';
  const meta = getDatabaseMeta(dbConfig.dbType, dbConfig);

  // Imports
  lines.push('import json');
  lines.push('import os');
  if (isAsync) lines.push('import asyncio');
  if (dbConfig.ssl && dbConfig.dbType === 'postgresql') lines.push('import ssl');

  if (dbConfig.dbType === 'postgresql') {
    if (dbConfig.interfaceStyle === 'native') {
      lines.push('import pg8000.native');
    } else {
      lines.push('import pg8000.dbapi');
    }
  } else if (dbConfig.dbType === 'sqlserver') {
    if (dbConfig.sqlServerDriver === 'pyodbc') {
      lines.push('import pyodbc');
    } else {
      lines.push('import pymssql');
    }
  } else if (dbConfig.dbType === 'oracle') {
    lines.push('import oracledb');
  }

  if (options.httpLibrary === 'requests') {
    lines.push('import requests');
  } else if (options.httpLibrary === 'httpx_sync' || options.httpLibrary === 'httpx_async') {
    lines.push('import httpx');
  } else if (options.httpLibrary === 'aiohttp') {
    lines.push('import aiohttp');
  }
  lines.push('');

  // Base URL Constants
  if (baseUrlConstants.length > 0) {
    lines.push('# ==============================================================================');
    lines.push('# Base URL Configuration (Extracted from cURL commands)');
    lines.push('# ==============================================================================');
    for (const c of baseUrlConstants) {
      lines.push(`${c.name} = "${pyEscape(c.origin)}"`);
    }
    lines.push('');
  }

  // Database Config Block
  lines.push(...renderDatabaseConfigBlock(dbConfig));

  // Database Connection Function
  lines.push(...renderGetDbConnectionFunction(dbConfig, options));

  lines.push('# ==============================================================================');
  lines.push(`# Authenticated cURL & ${meta.name} Integration Chain`);
  lines.push(`# Token extracted from '${extraction.keyPath}' and injected into subsequent API calls & DB queries`);
  lines.push('# ==============================================================================\n');

  // Type Hint for session
  let sessionType = '';
  if (options.useTypeHints) {
    if (options.httpLibrary === 'requests') sessionType = ': requests.Session';
    else if (options.httpLibrary === 'httpx_sync') sessionType = ': httpx.Client';
    else if (options.httpLibrary === 'httpx_async') sessionType = ': httpx.AsyncClient';
    else if (options.httpLibrary === 'aiohttp') sessionType = ': aiohttp.ClientSession';
  }

  // 1. Modular Login Method
  lines.push(`${asyncPrefix}def login(session${sessionType})${options.useTypeHints ? ' -> str' : ''}:`);
  lines.push(`${ind}"""[Step 1 - Auth] Authenticates against API endpoint and returns extracted ${tokenVar}"""`);
  lines.push(`${ind}print("[1/AUTH] Authenticating to login endpoint...")`);

  const loginUrl = loginReq.baseUrl || loginReq.url || 'https://api.example.com/login';
  const formattedLoginUrl = formatPythonUrl(loginUrl, originToConstantMap);
  lines.push(`${ind}login_url = ${formattedLoginUrl}`);

  const loginHeaders = { ...loginReq.headers };
  delete loginHeaders['Host'];
  delete loginHeaders['host'];
  delete loginHeaders['Content-Length'];
  delete loginHeaders['content-length'];

  if (Object.keys(loginHeaders).length > 0) {
    lines.push(`${ind}login_headers = {`);
    for (const [k, v] of Object.entries(loginHeaders)) {
      lines.push(`${ind}    "${pyEscape(k)}": "${pyEscape(v)}",`);
    }
    lines.push(`${ind}}`);
  }

  let loginBodyArg = '';
  if (loginReq.body) {
    if (loginReq.body.type === 'json' && loginReq.body.jsonData !== undefined) {
      const jsonLit = toPythonLiteral(loginReq.body.jsonData, 4, 1);
      lines.push(`${ind}login_payload = ${jsonLit}`);
      loginBodyArg = 'json=login_payload';
    } else if (loginReq.body.type === 'form-urlencoded' && loginReq.body.formData) {
      const formLit = toPythonLiteral(loginReq.body.formData, 4, 1);
      lines.push(`${ind}login_data = ${formLit}`);
      loginBodyArg = 'data=login_data';
    } else if (loginReq.body.rawText) {
      lines.push(`${ind}login_data = """${pyEscape(loginReq.body.rawText)}"""`);
      loginBodyArg = 'data=login_data';
    }
  }

  const loginArgs = ['login_url'];
  if (Object.keys(loginHeaders).length > 0) loginArgs.push('headers=login_headers');
  if (loginBodyArg) loginArgs.push(loginBodyArg);
  if (options.timeoutSeconds > 0) loginArgs.push(`timeout=${options.timeoutSeconds}`);

  const loginMethod = loginReq.method.toLowerCase();
  lines.push(`${ind}login_res = ${awaitPref}session.${loginMethod}(${loginArgs.join(', ')})`);

  if (options.includeErrorHandling) {
    lines.push(`${ind}login_res.raise_for_status()`);
  }

  lines.push('');
  lines.push(generateTokenExtractionCode(extraction, 'login_res', ind));
  lines.push(`${ind}print(f"✓ Authentication successful! Retrieved token: {${tokenVar}[:12]}... (len={len(${tokenVar})})")`);

  lines.push(`\n${ind}# Configure session defaults with the authentication token`);
  if (injection.placement === 'header') {
    const headerExpr = getHeaderValuePythonExpr(injection, tokenVar);
    lines.push(`${ind}session.headers.update({`);
    lines.push(`${ind}    "${pyEscape(injection.headerName)}": ${headerExpr}`);
    lines.push(`${ind}})`);
  } else if (injection.placement === 'cookie') {
    lines.push(`${ind}session.cookies.set("${pyEscape(injection.headerName || 'token')}", ${tokenVar})`);
  }

  lines.push(`${ind}return ${tokenVar}\n`);

  // 2. Individual Methods for Subsequent Steps (cURL or Database)
  let curlIndex = 0;
  allSteps.forEach((step, index) => {
    const stepNum = index + 2;

    if (step.type === 'database') {
      const dbSnippet = renderDatabaseStepFunction(step, stepNum, dbConfig, options, tokenVar);
      lines.push(...dbSnippet);
    } else {
      // cURL Step
      const curlItem = curlSteps[curlIndex++];
      const fnName = sanitizeApiMethodName(step.name || `api_call_${stepNum}`, stepNum);
      const retType = options.useTypeHints ? ' -> dict' : '';

      lines.push(`\n${asyncPrefix}def ${fnName}(session${sessionType})${retType}:`);
      lines.push(`${ind}"""[Step ${stepNum} - HTTP API] ${step.name || 'Subsequent Request'}"""`);
      lines.push(`${ind}print(f"\\n[{stepNum}/API] Requesting endpoint: ${pyEscape(step.name || 'API Call')}...")`);

      const applyDirectly = injection.placement === 'query' || injection.placement === 'body_json';
      const snippet = generateSingleCallSnippet(
        curlItem.parsed,
        stepNum,
        'session',
        isAsync,
        injection,
        tokenVar,
        applyDirectly,
        {
          library: options.httpLibrary,
          structure: options.structure,
          includeErrorHandling: options.includeErrorHandling,
          extractEnv: false,
          timeoutSeconds: options.timeoutSeconds,
          printResponses: options.printResponses,
          useTypeHints: options.useTypeHints,
          baseUrlVariable: options.baseUrlVariable,
          modularMethods: options.modularMethods,
        },
        ind,
        originToConstantMap
      );
      lines.push(snippet);

      if (options.includeAssertions) {
        lines.push(`${ind}assert res_${stepNum}.status_code < 400, f"API call failed with status {res_${stepNum}.status_code}"`);
      }

      lines.push(`${ind}try:`);
      lines.push(`${ind}    return res_${stepNum}.json()`);
      lines.push(`${ind}except Exception:`);
      lines.push(`${ind}    return res_${stepNum}.text`);
    }
  });

  // 3. Main Runner Function orchestrating both HTTP and Database calls
  const mainFunc = isAsync ? 'async def run_chain():' : 'def run_chain():';
  lines.push(`\n\n${mainFunc}`);
  lines.push(`${ind}"""Executes the full auth, API & database workflow sequentially."""`);
  lines.push(`${ind}print("=== Starting cURL & ${meta.name} Test Execution Chain ===")`);

  // Initialize HTTP session
  if (options.httpLibrary === 'requests') {
    lines.push(`${ind}session = requests.Session()`);
  } else if (options.httpLibrary === 'httpx_sync') {
    lines.push(`${ind}session = httpx.Client()`);
  } else if (options.httpLibrary === 'httpx_async') {
    lines.push(`${ind}async with httpx.AsyncClient() as session:`);
  } else if (options.httpLibrary === 'aiohttp') {
    lines.push(`${ind}async with aiohttp.ClientSession() as session:`);
  }

  const runBlockInd = (options.httpLibrary === 'httpx_async' || options.httpLibrary === 'aiohttp') ? ind + ind : ind;

  // Initialize DB Connection
  lines.push(`\n${runBlockInd}# Connect to ${meta.name} via ${meta.driverPackage}`);
  lines.push(`${runBlockInd}print("[DB] Connecting to ${meta.name} database...")`);
  lines.push(`${runBlockInd}db_conn = get_db_connection()`);

  lines.push(`${runBlockInd}try:`);
  const bodyInd = runBlockInd + ind;

  lines.push(`${bodyInd}# ------------------------------------------------------------------`);
  lines.push(`${bodyInd}# Step 1: Authentication & Token Retrieval`);
  lines.push(`${bodyInd}# ------------------------------------------------------------------`);
  lines.push(`${bodyInd}${tokenVar} = ${awaitPref}login(session)`);

  lines.push(`\n${bodyInd}print("\\n--- Executing Subsequent API & Database Operations ---")`);
  lines.push(`${bodyInd}# Tip: Comment out any line below with '#' to skip that specific step:\n`);

  allSteps.forEach((step, index) => {
    const stepNum = index + 2;
    if (step.type === 'database') {
      const fnName = sanitizeDbMethodName(step.name || `db_query_${stepNum}`, stepNum);
      const needsToken = step.params.includes(tokenVar) || step.query.includes('%s') || step.query.includes(':') || step.query.includes('?');
      const callArgs = needsToken ? `db_conn, ${tokenVar}` : 'db_conn';
      lines.push(`${bodyInd}# Step ${stepNum} [${meta.shortName}]: ${step.name || 'Database Query'}`);
      lines.push(`${bodyInd}${fnName}(${callArgs})`);
      lines.push('');
    } else {
      const fnName = sanitizeApiMethodName(step.name || `api_call_${stepNum}`, stepNum);
      lines.push(`${bodyInd}# Step ${stepNum} [HTTP API]: ${step.name || 'API Call'}`);
      lines.push(`${bodyInd}${awaitPref}${fnName}(session)`);
      lines.push('');
    }
  });

  lines.push(`${bodyInd}print("\\n✓ All cURL & ${meta.shortName} operations executed successfully!")`);
  lines.push(`${runBlockInd}finally:`);
  lines.push(`${bodyInd}db_conn.close()`);
  lines.push(`${bodyInd}print("[DB] ${meta.shortName} connection closed.")`);

  // Entry Point
  lines.push('\n\nif __name__ == "__main__":');
  if (isAsync) {
    lines.push('    asyncio.run(run_chain())');
  } else {
    lines.push('    run_chain()');
  }

  return lines.join('\n');
}

/**
 * Class Client Generator for Object-Oriented Testing Suites
 */
function generateClassClientScript(
  loginReq: ParsedCurlRequest,
  allSteps: AnyChainStep[],
  curlSteps: (CurlChainStep & { parsed: ParsedCurlRequest })[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  dbConfig: DatabaseConfig,
  options: PythonDbChainOptions,
  isAsync: boolean,
  tokenVar: string,
  baseUrlConstants: BaseUrlConstant[],
  originToConstantMap: Map<string, string>
): string {
  const lines: string[] = [];
  const ind = '    ';
  const asyncPref = isAsync ? 'async ' : '';
  const awaitPrefix = isAsync ? 'await ' : '';
  const meta = getDatabaseMeta(dbConfig.dbType, dbConfig);

  lines.push('import json');
  lines.push('import os');
  if (isAsync) lines.push('import asyncio');
  if (dbConfig.ssl && dbConfig.dbType === 'postgresql') lines.push('import ssl');

  if (dbConfig.dbType === 'postgresql') {
    if (dbConfig.interfaceStyle === 'native') {
      lines.push('import pg8000.native');
    } else {
      lines.push('import pg8000.dbapi');
    }
  } else if (dbConfig.dbType === 'sqlserver') {
    if (dbConfig.sqlServerDriver === 'pyodbc') {
      lines.push('import pyodbc');
    } else {
      lines.push('import pymssql');
    }
  } else if (dbConfig.dbType === 'oracle') {
    lines.push('import oracledb');
  }

  if (options.httpLibrary === 'requests') lines.push('import requests');
  else if (options.httpLibrary === 'httpx_sync' || options.httpLibrary === 'httpx_async') lines.push('import httpx');
  else if (options.httpLibrary === 'aiohttp') lines.push('import aiohttp');
  lines.push('');

  if (baseUrlConstants.length > 0) {
    lines.push('# Base URL Configuration');
    for (const c of baseUrlConstants) {
      lines.push(`${c.name} = "${pyEscape(c.origin)}"`);
    }
    lines.push('');
  }

  lines.push(...renderDatabaseConfigBlock(dbConfig));

  lines.push('class ApiAndDatabaseTestSuite:');
  lines.push(`${ind}"""Unified Test Client coordinating cURL API requests and ${meta.name} validations"""\n`);

  lines.push(`${ind}def __init__(self):`);
  lines.push(`${ind}${ind}self.${tokenVar} = None`);
  if (options.httpLibrary === 'requests') {
    lines.push(`${ind}${ind}self.session = requests.Session()`);
  } else if (options.httpLibrary === 'httpx_sync') {
    lines.push(`${ind}${ind}self.session = httpx.Client()`);
  }
  lines.push(`${ind}${ind}self.db_conn = None`);
  lines.push('');

  // Connect DB
  lines.push(`${ind}def connect_db(self):`);
  lines.push(`${ind}${ind}"""Establishes connection to ${meta.name} using ${meta.driverPackage}"""`);

  if (dbConfig.dbType === 'postgresql') {
    const sslArg = dbConfig.ssl ? ', ssl_context=PG_SSL_CONTEXT' : '';
    if (dbConfig.interfaceStyle === 'native') {
      lines.push(`${ind}${ind}self.db_conn = pg8000.native.Connection(`);
    } else {
      lines.push(`${ind}${ind}self.db_conn = pg8000.dbapi.connect(`);
    }
    lines.push(`${ind}${ind}${ind}host=PG_HOST, port=PG_PORT, database=PG_DATABASE, user=PG_USER, password=PG_PASSWORD${sslArg}`);
    lines.push(`${ind}${ind})`);
  } else if (dbConfig.dbType === 'sqlserver') {
    if (dbConfig.sqlServerDriver === 'pyodbc') {
      lines.push(`${ind}${ind}conn_str = f"DRIVER={{{MSSQL_ODBC_DRIVER}}};SERVER={MSSQL_HOST},{MSSQL_PORT};DATABASE={MSSQL_DATABASE};UID={MSSQL_USER};PWD={MSSQL_PASSWORD};"`);
      lines.push(`${ind}${ind}self.db_conn = pyodbc.connect(conn_str, autocommit=${dbConfig.autoCommit ? 'True' : 'False'})`);
    } else {
      lines.push(`${ind}${ind}self.db_conn = pymssql.connect(`);
      lines.push(`${ind}${ind}${ind}server=MSSQL_HOST, port=MSSQL_PORT, database=MSSQL_DATABASE, user=MSSQL_USER, password=MSSQL_PASSWORD, as_dict=${dbConfig.returnAsDict ? 'True' : 'False'}, autocommit=${dbConfig.autoCommit ? 'True' : 'False'}`);
      lines.push(`${ind}${ind})`);
    }
  } else if (dbConfig.dbType === 'oracle') {
    lines.push(`${ind}${ind}self.db_conn = oracledb.connect(`);
    lines.push(`${ind}${ind}${ind}user=ORACLE_USER, password=ORACLE_PASSWORD, host=ORACLE_HOST, port=ORACLE_PORT, service_name=ORACLE_SERVICE_NAME`);
    lines.push(`${ind}${ind})`);
    if (dbConfig.autoCommit) {
      lines.push(`${ind}${ind}self.db_conn.autocommit = True`);
    }
  }

  lines.push(`${ind}${ind}return self.db_conn\n`);

  // Close DB
  lines.push(`${ind}def close(self):`);
  lines.push(`${ind}${ind}if self.db_conn:`);
  lines.push(`${ind}${ind}    self.db_conn.close()`);
  lines.push(`${ind}${ind}    print("[DB] ${meta.shortName} connection closed.")\n`);

  // Authenticate
  lines.push(`${ind}${asyncPref}def authenticate(self)${options.useTypeHints ? ' -> str' : ''}:`);
  lines.push(`${ind}${ind}"""Executes login request and caches extracted token"""`);
  lines.push(`${ind}${ind}print("[1/AUTH] Authenticating to login endpoint...")`);

  const loginUrl = loginReq.baseUrl || loginReq.url || 'https://api.example.com/login';
  const formattedLoginUrl = formatPythonUrl(loginUrl, originToConstantMap);
  lines.push(`${ind}${ind}url = ${formattedLoginUrl}`);

  const loginHeaders = { ...loginReq.headers };
  delete loginHeaders['Host'];
  delete loginHeaders['host'];
  delete loginHeaders['Content-Length'];
  delete loginHeaders['content-length'];

  if (Object.keys(loginHeaders).length > 0) {
    lines.push(`${ind}${ind}headers = {`);
    for (const [k, v] of Object.entries(loginHeaders)) {
      lines.push(`${ind}${ind}    "${pyEscape(k)}": "${pyEscape(v)}",`);
    }
    lines.push(`${ind}${ind}}`);
  }

  let loginBodyArg = '';
  if (loginReq.body) {
    if (loginReq.body.type === 'json' && loginReq.body.jsonData !== undefined) {
      const jsonLit = toPythonLiteral(loginReq.body.jsonData, 4, 2);
      lines.push(`${ind}${ind}payload = ${jsonLit}`);
      loginBodyArg = 'json=payload';
    } else if (loginReq.body.rawText) {
      lines.push(`${ind}${ind}payload = """${pyEscape(loginReq.body.rawText)}"""`);
      loginBodyArg = 'data=payload';
    }
  }

  const loginArgs = ['url'];
  if (Object.keys(loginHeaders).length > 0) loginArgs.push('headers=headers');
  if (loginBodyArg) loginArgs.push(loginBodyArg);
  if (options.timeoutSeconds > 0) loginArgs.push(`timeout=${options.timeoutSeconds}`);

  const loginMethod = loginReq.method.toLowerCase();
  lines.push(`${ind}${ind}res = ${awaitPrefix}self.session.${loginMethod}(${loginArgs.join(', ')})`);
  if (options.includeErrorHandling) lines.push(`${ind}${ind}res.raise_for_status()`);

  lines.push('');
  lines.push(generateTokenExtractionCode(extraction, 'res', ind + ind));
  lines.push(`${ind}${ind}self.${tokenVar} = ${tokenVar}`);

  if (injection.placement === 'header') {
    const headerExpr = getHeaderValuePythonExpr(injection, tokenVar);
    lines.push(`${ind}${ind}self.session.headers.update({"${pyEscape(injection.headerName)}": ${headerExpr}})`);
  }

  lines.push(`${ind}${ind}return self.${tokenVar}\n`);

  // Methods for each step
  let curlIdx = 0;
  allSteps.forEach((step, index) => {
    const stepNum = index + 2;

    if (step.type === 'database') {
      const fnName = sanitizeDbMethodName(step.name || `db_query_${stepNum}`, stepNum);
      lines.push(`${ind}def ${fnName}(self):`);
      lines.push(`${ind}${ind}"""[Step ${stepNum} - ${meta.shortName}] ${step.name || 'Database Query'}"""`);
      lines.push(`${ind}${ind}if not self.db_conn:`);
      lines.push(`${ind}${ind}    self.connect_db()`);

      const cleanQuery = step.query.trim().replace(/\r\n/g, '\n');
      lines.push(`${ind}${ind}query = """${cleanQuery}"""`);

      let paramsExpr = '()';
      if (step.params && step.params.trim().length > 0) {
        const rawParams = step.params.trim().replace(new RegExp(`\\b${tokenVar}\\b`, 'g'), `self.${tokenVar}`);
        paramsExpr = ifNotTuple(rawParams);
      }

      if (dbConfig.dbType === 'sqlserver' && dbConfig.sqlServerDriver !== 'pyodbc' && dbConfig.returnAsDict) {
        lines.push(`${ind}${ind}cursor = self.db_conn.cursor(as_dict=True)`);
      } else {
        lines.push(`${ind}${ind}cursor = self.db_conn.cursor()`);
      }

      lines.push(`${ind}${ind}try:`);
      if (paramsExpr !== '()') {
        lines.push(`${ind}${ind}${ind}cursor.execute(query, ${paramsExpr})`);
      } else {
        lines.push(`${ind}${ind}${ind}cursor.execute(query)`);
      }

      if (step.fetchMode === 'fetchall') {
        if (dbConfig.dbType === 'sqlserver' && dbConfig.sqlServerDriver !== 'pyodbc' && dbConfig.returnAsDict) {
          lines.push(`${ind}${ind}${ind}rows = cursor.fetchall()`);
        } else if (dbConfig.dbType === 'oracle') {
          lines.push(`${ind}${ind}${ind}cols = [d[0].lower() for d in cursor.description] if cursor.description else []`);
          lines.push(`${ind}${ind}${ind}rows = [dict(zip(cols, r)) for r in cursor.fetchall()]`);
        } else {
          lines.push(`${ind}${ind}${ind}cols = [d[0] for d in cursor.description] if cursor.description else []`);
          lines.push(`${ind}${ind}${ind}rows = [dict(zip(cols, r)) for r in cursor.fetchall()]`);
        }
        lines.push(`${ind}${ind}${ind}print(f"  ✓ DB query step {${stepNum}} returned {len(rows)} row(s)")`);
        if (options.includeAssertions && step.assertRowCount) {
          lines.push(`${ind}${ind}${ind}assert len(rows) > 0, "${meta.shortName} assertion failed: 0 rows returned"`);
        }
        lines.push(`${ind}${ind}${ind}return rows`);
      } else if (step.fetchMode === 'fetchone') {
        if (dbConfig.dbType === 'sqlserver' && dbConfig.sqlServerDriver !== 'pyodbc' && dbConfig.returnAsDict) {
          lines.push(`${ind}${ind}${ind}row = cursor.fetchone()`);
        } else if (dbConfig.dbType === 'oracle') {
          lines.push(`${ind}${ind}${ind}cols = [d[0].lower() for d in cursor.description] if cursor.description else []`);
          lines.push(`${ind}${ind}${ind}raw = cursor.fetchone()`);
          lines.push(`${ind}${ind}${ind}row = dict(zip(cols, raw)) if raw else None`);
        } else {
          lines.push(`${ind}${ind}${ind}cols = [d[0] for d in cursor.description] if cursor.description else []`);
          lines.push(`${ind}${ind}${ind}raw = cursor.fetchone()`);
          lines.push(`${ind}${ind}${ind}row = dict(zip(cols, raw)) if raw else None`);
        }
        lines.push(`${ind}${ind}${ind}print(f"  ✓ DB query step {${stepNum}} returned: {row}")`);
        lines.push(`${ind}${ind}${ind}return row`);
      } else {
        if (dbConfig.autoCommit) lines.push(`${ind}${ind}${ind}self.db_conn.commit()`);
        lines.push(`${ind}${ind}${ind}return cursor.rowcount`);
      }
      lines.push(`${ind}${ind}finally:`);
      lines.push(`${ind}${ind}${ind}cursor.close()\n`);
    } else {
      const curlItem = curlSteps[curlIdx++];
      const methodName = sanitizeApiMethodName(step.name || `api_call_${stepNum}`, stepNum);
      lines.push(`${ind}${asyncPref}def ${methodName}(self)${options.useTypeHints ? ' -> dict' : ''}:`);
      lines.push(`${ind}${ind}"""[Step ${stepNum} - API Call] ${step.name || 'Request'}"""`);
      lines.push(`${ind}${ind}if not self.${tokenVar}:`);
      lines.push(`${ind}${ind}    ${awaitPrefix}self.authenticate()`);

      const snippet = generateSingleCallSnippet(
        curlItem.parsed,
        stepNum,
        'self.session',
        isAsync,
        injection,
        `self.${tokenVar}`,
        injection.placement !== 'header',
        {
          library: options.httpLibrary,
          structure: options.structure,
          includeErrorHandling: options.includeErrorHandling,
          extractEnv: false,
          timeoutSeconds: options.timeoutSeconds,
          printResponses: options.printResponses,
          useTypeHints: options.useTypeHints,
          baseUrlVariable: options.baseUrlVariable,
          modularMethods: options.modularMethods,
        },
        ind + ind,
        originToConstantMap
      );
      lines.push(snippet);
      lines.push(`${ind}${ind}try:`);
      lines.push(`${ind}${ind}    return res_${stepNum}.json()`);
      lines.push(`${ind}${ind}except Exception:`);
      lines.push(`${ind}${ind}    return res_${stepNum}.text\n`);
    }
  });

  // Runner
  lines.push('\nif __name__ == "__main__":');
  lines.push('    suite = ApiAndDatabaseTestSuite()');
  lines.push('    suite.connect_db()');
  lines.push('    try:');
  lines.push('        print("=== Running Integration Test Suite ===")');
  lines.push(`        suite.authenticate()`);
  lines.push('');
  lines.push('        # Tip: Comment out any line below with \'#\' to skip that specific step:');
  allSteps.forEach((step, index) => {
    const stepNum = index + 2;
    if (step.type === 'database') {
      const fnName = sanitizeDbMethodName(step.name || `db_query_${stepNum}`, stepNum);
      lines.push(`        # Step ${stepNum} [${meta.shortName}]: ${step.name}`);
      lines.push(`        suite.${fnName}()`);
      lines.push('');
    } else {
      const fnName = sanitizeApiMethodName(step.name || `api_call_${stepNum}`, stepNum);
      lines.push(`        # Step ${stepNum} [HTTP API]: ${step.name}`);
      lines.push(`        suite.${fnName}()`);
      lines.push('');
    }
  });
  lines.push('    finally:');
  lines.push('        suite.close()');

  return lines.join('\n');
}
