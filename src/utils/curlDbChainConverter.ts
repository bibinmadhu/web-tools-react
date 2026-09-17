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

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  useEnvVars: boolean;
  connectionMode: 'shared' | 'per_step';
  interfaceStyle: 'dbapi' | 'native';
  autoCommit: boolean;
  returnAsDict: boolean;
}

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

export const DEFAULT_POSTGRES_CONFIG: PostgresConfig = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '',
  ssl: false,
  useEnvVars: true,
  connectionMode: 'shared',
  interfaceStyle: 'dbapi',
  autoCommit: true,
  returnAsDict: true,
};

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
 * Generates the Python code for configuring and connecting to PostgreSQL via pg8000
 */
function renderPostgresConfigBlock(pgConfig: PostgresConfig): string[] {
  const lines: string[] = [];
  lines.push('# ==============================================================================');
  lines.push('# PostgreSQL Database Configuration (pg8000)');
  lines.push('# ==============================================================================');

  if (pgConfig.useEnvVars) {
    lines.push(`PG_HOST = os.environ.get("PGHOST", "${pyEscape(pgConfig.host || 'localhost')}")`);
    lines.push(`PG_PORT = int(os.environ.get("PGPORT", "${pgConfig.port || 5432}"))`);
    lines.push(`PG_DATABASE = os.environ.get("PGDATABASE", "${pyEscape(pgConfig.database || 'postgres')}")`);
    lines.push(`PG_USER = os.environ.get("PGUSER", "${pyEscape(pgConfig.user || 'postgres')}")`);
    lines.push(`PG_PASSWORD = os.environ.get("PGPASSWORD", "${pyEscape(pgConfig.password || '')}")`);
  } else {
    lines.push(`PG_HOST = "${pyEscape(pgConfig.host || 'localhost')}"`);
    lines.push(`PG_PORT = ${pgConfig.port || 5432}`);
    lines.push(`PG_DATABASE = "${pyEscape(pgConfig.database || 'postgres')}"`);
    lines.push(`PG_USER = "${pyEscape(pgConfig.user || 'postgres')}"`);
    lines.push(`PG_PASSWORD = "${pyEscape(pgConfig.password || '')}"`);
  }

  if (pgConfig.ssl) {
    lines.push('PG_SSL_CONTEXT = ssl.create_default_context()');
  }

  lines.push('');
  return lines;
}

/**
 * Generates database connection helper function
 */
function renderGetDbConnectionFunction(pgConfig: PostgresConfig, options: PythonDbChainOptions): string[] {
  const lines: string[] = [];
  const ind = '    ';
  const sslArg = pgConfig.ssl ? ', ssl_context=PG_SSL_CONTEXT' : '';

  if (pgConfig.interfaceStyle === 'native') {
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
  lines.push('');
  return lines;
}

/**
 * Generates an individual database operation function
 */
function renderDatabaseStepFunction(
  step: DatabaseChainStep,
  stepNum: number,
  pgConfig: PostgresConfig,
  options: PythonDbChainOptions,
  tokenVar: string
): string[] {
  const lines: string[] = [];
  const ind = '    ';
  const fnName = sanitizeDbMethodName(step.name || `db_query_${stepNum}`, stepNum);
  const connType = options.useTypeHints
    ? pgConfig.interfaceStyle === 'native'
      ? 'db_conn: pg8000.native.Connection'
      : 'db_conn: pg8000.dbapi.Connection'
    : 'db_conn';

  // Parameters list for method
  // If params expression references tokenVar or other vars, include tokenVar in signature
  const needsToken = step.params.includes(tokenVar) || step.query.includes('%s') || step.query.includes(':');
  const tokenParam = needsToken ? (options.useTypeHints ? `, ${tokenVar}: str = ""` : `, ${tokenVar}=""`) : '';
  const returnType = options.useTypeHints ? (step.fetchMode === 'execute' ? ' -> int' : ' -> list') : '';

  lines.push(`def ${fnName}(${connType}${tokenParam})${returnType}:`);
  lines.push(`${ind}"""[Step ${stepNum} - PostgreSQL DB] ${step.name || 'Execute Query'}"""`);
  lines.push(`${ind}print(f"\\n[{stepNum}/DB] Executing query: ${pyEscape(step.name || 'Database Operation')}...")`);

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
    } else {
      paramsExpr = ifNotTuple(rawParams);
    }
  }

  if (pgConfig.interfaceStyle === 'native') {
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
      lines.push(`${ind}${ind}assert ${cond}, f"PostgreSQL Assertion failed on step ${stepNum}: condition '{${pyEscape(cond)}}' was false"`);
      lines.push(`${ind}${ind}print(f"  ✓ Assertion passed: {${pyEscape(cond)}}")`);
    }
    lines.push(`${ind}${ind}return results`);
    lines.push(`${ind}except Exception as e:`);
    lines.push(`${ind}${ind}print(f"  ✗ PostgreSQL Error on step ${stepNum}: {e}")`);
    lines.push(`${ind}${ind}raise`);
  } else {
    // Standard DBAPI (cursor pattern)
    lines.push(`${ind}cursor = db_conn.cursor()`);
    lines.push(`${ind}try:`);
    if (paramsExpr !== '()') {
      lines.push(`${ind}${ind}cursor.execute(query, ${paramsExpr})`);
    } else {
      lines.push(`${ind}${ind}cursor.execute(query)`);
    }

    if (step.fetchMode === 'fetchall') {
      if (pgConfig.returnAsDict) {
        lines.push(`${ind}${ind}columns = [desc[0] for desc in cursor.description] if cursor.description else []`);
        lines.push(`${ind}${ind}raw_rows = cursor.fetchall()`);
        lines.push(`${ind}${ind}rows = [dict(zip(columns, row)) for row in raw_rows]`);
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
        lines.push(`${ind}${ind}assert ${cond}, f"PostgreSQL Assertion failed on step ${stepNum}: condition '{${pyEscape(cond)}}' was false"`);
        lines.push(`${ind}${ind}print(f"  ✓ Assertion passed: {${pyEscape(cond)}}")`);
      }

      lines.push(`${ind}${ind}return rows`);
    } else if (step.fetchMode === 'fetchone') {
      if (pgConfig.returnAsDict) {
        lines.push(`${ind}${ind}columns = [desc[0] for desc in cursor.description] if cursor.description else []`);
        lines.push(`${ind}${ind}raw_row = cursor.fetchone()`);
        lines.push(`${ind}${ind}row = dict(zip(columns, raw_row)) if raw_row else None`);
      } else {
        lines.push(`${ind}${ind}row = cursor.fetchone()`);
      }

      if (options.printDbResults) {
        lines.push(`${ind}${ind}print(f"  ✓ DB query returned single row: {row}")`);
      }

      if (options.includeAssertions && step.assertRowCount) {
        const cond = step.assertCondition || 'row is not None';
        lines.push(`${ind}${ind}assert ${cond}, f"PostgreSQL Assertion failed on step ${stepNum}: condition '{${pyEscape(cond)}}' was false"`);
        lines.push(`${ind}${ind}print(f"  ✓ Assertion passed: {${pyEscape(cond)}}")`);
      }

      lines.push(`${ind}${ind}return row`);
    } else {
      // DML (execute, commit)
      if (pgConfig.autoCommit) {
        lines.push(`${ind}${ind}db_conn.commit()`);
      }
      lines.push(`${ind}${ind}rowcount = cursor.rowcount`);
      if (options.printDbResults) {
        lines.push(`${ind}${ind}print(f"  ✓ DB mutation executed. Affected rows: {rowcount}")`);
      }
      lines.push(`${ind}${ind}return rowcount`);
    }

    lines.push(`${ind}except Exception as e:`);
    if (pgConfig.autoCommit) {
      lines.push(`${ind}${ind}db_conn.rollback()`);
    }
    lines.push(`${ind}${ind}print(f"  ✗ PostgreSQL Error on step ${stepNum}: {e}")`);
    lines.push(`${ind}${ind}raise`);
    lines.push(`${ind}finally:`);
    lines.push(`${ind}${ind}cursor.close()`);
  }

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
  pgConfig: PostgresConfig = DEFAULT_POSTGRES_CONFIG,
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
        pgConfig,
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
        pgConfig,
        options,
        isAsync,
        tokenVar,
        baseUrlConstants,
        originToConstantMap
      );
  }
}

/**
 * Session & Modular Functions generator combining HTTP requests & pg8000 PostgreSQL operations
 */
function generateModularSessionScript(
  loginReq: ParsedCurlRequest,
  allSteps: AnyChainStep[],
  curlSteps: (CurlChainStep & { parsed: ParsedCurlRequest })[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  pgConfig: PostgresConfig,
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

  // Imports
  lines.push('import json');
  lines.push('import os');
  if (isAsync) lines.push('import asyncio');
  if (pgConfig.ssl) lines.push('import ssl');

  if (pgConfig.interfaceStyle === 'native') {
    lines.push('import pg8000.native');
  } else {
    lines.push('import pg8000.dbapi');
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

  // PostgreSQL Config Block
  lines.push(...renderPostgresConfigBlock(pgConfig));

  // PostgreSQL Connection Function
  lines.push(...renderGetDbConnectionFunction(pgConfig, options));

  lines.push('# ==============================================================================');
  lines.push('# Authenticated cURL & PostgreSQL Integration Chain');
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
      const dbSnippet = renderDatabaseStepFunction(step, stepNum, pgConfig, options, tokenVar);
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
  lines.push(`${ind}print("=== Starting cURL & PostgreSQL Test Execution Chain ===")`);

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
  lines.push(`\n${runBlockInd}# Connect to PostgreSQL via pg8000`);
  lines.push(`${runBlockInd}print("[DB] Connecting to PostgreSQL database...")`);
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
      const needsToken = step.params.includes(tokenVar) || step.query.includes('%s') || step.query.includes(':');
      const callArgs = needsToken ? `db_conn, ${tokenVar}` : 'db_conn';
      lines.push(`${bodyInd}# Step ${stepNum} [PostgreSQL DB]: ${step.name || 'Database Query'}`);
      lines.push(`${bodyInd}${fnName}(${callArgs})`);
      lines.push('');
    } else {
      const fnName = sanitizeApiMethodName(step.name || `api_call_${stepNum}`, stepNum);
      lines.push(`${bodyInd}# Step ${stepNum} [HTTP API]: ${step.name || 'API Call'}`);
      lines.push(`${bodyInd}${awaitPref}${fnName}(session)`);
      lines.push('');
    }
  });

  lines.push(`${bodyInd}print("\\n✓ All cURL & PostgreSQL operations executed successfully!")`);
  lines.push(`${runBlockInd}finally:`);
  if (pgConfig.interfaceStyle === 'native') {
    lines.push(`${bodyInd}db_conn.close()`);
  } else {
    lines.push(`${bodyInd}db_conn.close()`);
  }
  lines.push(`${bodyInd}print("[DB] PostgreSQL connection closed.")`);

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
  pgConfig: PostgresConfig,
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

  lines.push('import json');
  lines.push('import os');
  if (isAsync) lines.push('import asyncio');
  if (pgConfig.ssl) lines.push('import ssl');

  if (pgConfig.interfaceStyle === 'native') {
    lines.push('import pg8000.native');
  } else {
    lines.push('import pg8000.dbapi');
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

  lines.push(...renderPostgresConfigBlock(pgConfig));

  lines.push('class ApiAndDatabaseTestSuite:');
  lines.push(`${ind}"""Unified Test Client coordinating cURL API requests and PostgreSQL validations"""\n`);

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
  lines.push(`${ind}${ind}"""Establishes connection to PostgreSQL using pg8000"""`);
  const sslArg = pgConfig.ssl ? ', ssl_context=PG_SSL_CONTEXT' : '';
  if (pgConfig.interfaceStyle === 'native') {
    lines.push(`${ind}${ind}self.db_conn = pg8000.native.Connection(`);
  } else {
    lines.push(`${ind}${ind}self.db_conn = pg8000.dbapi.connect(`);
  }
  lines.push(`${ind}${ind}${ind}host=PG_HOST, port=PG_PORT, database=PG_DATABASE, user=PG_USER, password=PG_PASSWORD${sslArg}`);
  lines.push(`${ind}${ind})`);
  lines.push(`${ind}${ind}return self.db_conn\n`);

  // Close DB
  lines.push(`${ind}def close(self):`);
  lines.push(`${ind}${ind}if self.db_conn:`);
  lines.push(`${ind}${ind}    self.db_conn.close()`);
  lines.push(`${ind}${ind}    print("[DB] PostgreSQL connection closed.")\n`);

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
      lines.push(`${ind}${ind}"""[Step ${stepNum} - PostgreSQL DB] ${step.name || 'Database Query'}"""`);
      lines.push(`${ind}${ind}if not self.db_conn:`);
      lines.push(`${ind}${ind}    self.connect_db()`);

      const cleanQuery = step.query.trim().replace(/\r\n/g, '\n');
      lines.push(`${ind}${ind}query = """${cleanQuery}"""`);

      let paramsExpr = '()';
      if (step.params && step.params.trim().length > 0) {
        const rawParams = step.params.trim().replace(new RegExp(`\\b${tokenVar}\\b`, 'g'), `self.${tokenVar}`);
        paramsExpr = ifNotTuple(rawParams);
      }

      lines.push(`${ind}${ind}cursor = self.db_conn.cursor()`);
      lines.push(`${ind}${ind}try:`);
      if (paramsExpr !== '()') {
        lines.push(`${ind}${ind}${ind}cursor.execute(query, ${paramsExpr})`);
      } else {
        lines.push(`${ind}${ind}${ind}cursor.execute(query)`);
      }

      if (step.fetchMode === 'fetchall') {
        lines.push(`${ind}${ind}${ind}cols = [d[0] for d in cursor.description] if cursor.description else []`);
        lines.push(`${ind}${ind}${ind}rows = [dict(zip(cols, r)) for r in cursor.fetchall()]`);
        lines.push(`${ind}${ind}${ind}print(f"  ✓ DB query step {${stepNum}} returned {len(rows)} row(s)")`);
        if (options.includeAssertions && step.assertRowCount) {
          lines.push(`${ind}${ind}${ind}assert len(rows) > 0, "PostgreSQL assertion failed: 0 rows returned"`);
        }
        lines.push(`${ind}${ind}${ind}return rows`);
      } else if (step.fetchMode === 'fetchone') {
        lines.push(`${ind}${ind}${ind}cols = [d[0] for d in cursor.description] if cursor.description else []`);
        lines.push(`${ind}${ind}${ind}raw = cursor.fetchone()`);
        lines.push(`${ind}${ind}${ind}row = dict(zip(cols, raw)) if raw else None`);
        lines.push(`${ind}${ind}${ind}print(f"  ✓ DB query step {${stepNum}} returned: {row}")`);
        lines.push(`${ind}${ind}${ind}return row`);
      } else {
        if (pgConfig.autoCommit) lines.push(`${ind}${ind}${ind}self.db_conn.commit()`);
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
      lines.push(`        # Step ${stepNum} [PostgreSQL DB]: ${step.name}`);
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
