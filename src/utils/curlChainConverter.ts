import { parseCurlCommand, ParsedCurlRequest } from './curlParser';
import { toPythonLiteral } from './curlToCode';

export type PythonClientLibrary = 'requests' | 'httpx_sync' | 'httpx_async' | 'aiohttp';
export type ScriptStructure = 'session' | 'functions' | 'sequential' | 'class_client';
export type TokenSource = 'json_body' | 'response_header' | 'cookie';
export type TokenPlacement = 'header' | 'query' | 'body_json' | 'cookie';

export interface SubsequentRequest {
  id: string;
  name: string;
  curl: string;
  enabled: boolean;
  customHeaderOverride?: string;
}

export interface TokenExtractionConfig {
  source: TokenSource;
  keyPath: string; // e.g. "token", "access_token", "data.token", "accessToken"
  variableName: string; // e.g. "token" or "auth_token"
  headerName?: string; // e.g. "Authorization" if source is 'response_header'
}

export interface TokenInjectionConfig {
  placement: TokenPlacement;
  headerName: string; // e.g. "Authorization" or "token" or "X-Auth-Token"
  headerFormat: string; // e.g. "Bearer {token}" or "{token}" or "Token {token}"
  queryParamName: string; // e.g. "token" or "access_token"
  bodyFieldName: string; // e.g. "token"
}

export interface PythonChainGenOptions {
  library: PythonClientLibrary;
  structure: ScriptStructure;
  includeErrorHandling: boolean;
  extractEnv: boolean;
  timeoutSeconds: number;
  printResponses: boolean;
  useTypeHints: boolean;
  baseUrlVariable: boolean;
}

export const COMMON_RESPONSE_TOKENS: { label: string; value: string; description: string }[] = [
  { label: 'token', value: 'token', description: 'Generic token field (Default / Common)' },
  { label: 'access_token', value: 'access_token', description: 'OAuth 2.0 & RFC 6749 Standard' },
  { label: 'accessToken', value: 'accessToken', description: 'CamelCase JSON Standard' },
  { label: 'id_token', value: 'id_token', description: 'OpenID Connect (OIDC) Standard' },
  { label: 'jwt', value: 'jwt', description: 'JSON Web Token payload' },
  { label: 'auth_token', value: 'auth_token', description: 'Auth token convention' },
  { label: 'bearer_token', value: 'bearer_token', description: 'Bearer credential' },
  { label: 'session_token', value: 'session_token', description: 'Session credential' },
  { label: 'data.token', value: 'data.token', description: 'Nested in data object' },
  { label: 'data.access_token', value: 'data.access_token', description: 'Nested OAuth2 data object' },
  { label: 'result.token', value: 'result.token', description: 'Nested in result object' },
];

export const COMMON_TOKEN_HEADERS: { label: string; header: string; format: string; description: string }[] = [
  { label: 'Authorization: Bearer <token>', header: 'Authorization', format: 'Bearer {token}', description: 'Standard Bearer Authorization' },
  { label: 'token: <token>', header: 'token', format: '{token}', description: 'Custom raw token header (User requested)' },
  { label: 'X-Auth-Token: <token>', header: 'X-Auth-Token', format: '{token}', description: 'Common REST & OpenStack header' },
  { label: 'X-Access-Token: <token>', header: 'X-Access-Token', format: '{token}', description: 'Common API access token' },
  { label: 'X-API-Key: <token>', header: 'X-API-Key', format: '{token}', description: 'API Key authentication' },
  { label: 'Authorization: Token <token>', header: 'Authorization', format: 'Token {token}', description: 'Django REST / Token format' },
  { label: 'Authorization: JWT <token>', header: 'Authorization', format: 'JWT {token}', description: 'Django / Flask JWT format' },
  { label: 'Session-Token: <token>', header: 'Session-Token', format: '{token}', description: 'Custom session token' },
  { label: 'apikey: <token>', header: 'apikey', format: '{token}', description: 'Supabase / PostgREST header' },
];

export const DEFAULT_EXTRACTION_CONFIG: TokenExtractionConfig = {
  source: 'json_body',
  keyPath: 'token',
  variableName: 'token',
  headerName: 'Authorization',
};

export const DEFAULT_INJECTION_CONFIG: TokenInjectionConfig = {
  placement: 'header',
  headerName: 'Authorization',
  headerFormat: 'Bearer {token}',
  queryParamName: 'token',
  bodyFieldName: 'token',
};

export const DEFAULT_OPTIONS: PythonChainGenOptions = {
  library: 'requests',
  structure: 'session',
  includeErrorHandling: true,
  extractEnv: false,
  timeoutSeconds: 30,
  printResponses: true,
  useTypeHints: true,
  baseUrlVariable: false,
};

function pyEscape(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Generate Python code to extract a token from the login response.
 * Handles nested dot paths like 'data.token' or 'auth.accessToken' safely with dict.get()
 */
export function generateTokenExtractionCode(
  config: TokenExtractionConfig,
  responseVar: string = 'login_res',
  indent: string = '    '
): string {
  const varName = config.variableName || 'token';

  if (config.source === 'response_header') {
    const headerName = config.headerName || 'Authorization';
    return [
      `${indent}# Extract token from response headers`,
      `${indent}${varName} = ${responseVar}.headers.get("${pyEscape(headerName)}")`,
      `${indent}if not ${varName}:`,
      `${indent}    raise ValueError("Failed to extract '${pyEscape(headerName)}' header from login response")`,
    ].join('\n');
  }

  if (config.source === 'cookie') {
    const cookieName = config.keyPath || 'token';
    return [
      `${indent}# Extract token from response cookies`,
      `${indent}${varName} = ${responseVar}.cookies.get("${pyEscape(cookieName)}")`,
      `${indent}if not ${varName}:`,
      `${indent}    raise ValueError("Failed to extract cookie '${pyEscape(cookieName)}' from login response")`,
    ].join('\n');
  }

  // JSON body extraction (handles dot-notation like data.tokens.access)
  const pathParts = config.keyPath.split('.').map((p) => p.trim()).filter(Boolean);
  if (pathParts.length === 0) pathParts.push('token');

  const lines: string[] = [
    `${indent}# Parse JSON response and extract token ('${pyEscape(config.keyPath)}')`,
    `${indent}login_data = ${responseVar}.json()`,
  ];

  if (pathParts.length === 1) {
    lines.push(`${indent}${varName} = login_data.get("${pyEscape(pathParts[0])}")`);
  } else {
    // Nested traversal
    let current = 'login_data';
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      current = `${current}.get("${pyEscape(part)}", {})`;
    }
    const lastPart = pathParts[pathParts.length - 1];
    lines.push(`${indent}${varName} = ${current}.get("${pyEscape(lastPart)}")`);
  }

  lines.push(`${indent}if not ${varName}:`);
  lines.push(`${indent}    raise ValueError("Token not found at path '${pyEscape(config.keyPath)}' in login response: " + str(login_data))`);

  return lines.join('\n');
}

/**
 * Transforms subsequent request headers by removing existing hardcoded auth tokens
 * and replacing or ensuring the configured token header is present
 */
export function prepareSubsequentRequest(
  req: ParsedCurlRequest,
  injection: TokenInjectionConfig,
  tokenVar: string
): {
  headers: Record<string, string>;
  headerValueExpression?: string;
  queryParams: Record<string, string>;
  queryParamExpression?: string;
  bodyPayload?: any;
  replacedExistingAuth: boolean;
} {
  const headers = { ...req.headers };
  delete headers['Host'];
  delete headers['host'];
  delete headers['Content-Length'];
  delete headers['content-length'];

  let replacedExistingAuth = false;
  const targetHeaderLower = injection.headerName.toLowerCase();

  // Check if any existing header matches target or generic auth headers
  const authHeaderKeys = Object.keys(headers).filter(
    (k) =>
      k.toLowerCase() === targetHeaderLower ||
      k.toLowerCase() === 'authorization' ||
      k.toLowerCase() === 'token' ||
      k.toLowerCase() === 'x-auth-token' ||
      k.toLowerCase() === 'x-access-token'
  );

  if (injection.placement === 'header') {
    // Remove conflicting old headers
    for (const k of authHeaderKeys) {
      delete headers[k];
      replacedExistingAuth = true;
    }
  }

  const queryParams = { ...req.queryParams };
  if (injection.placement === 'query') {
    if (queryParams[injection.queryParamName]) {
      delete queryParams[injection.queryParamName];
      replacedExistingAuth = true;
    }
  }

  return {
    headers,
    queryParams,
    replacedExistingAuth,
  };
}

/**
 * Builds formatted Python header expression for injection
 */
export function getHeaderValuePythonExpr(injection: TokenInjectionConfig, tokenVar: string): string {
  const fmt = injection.headerFormat.trim();
  if (fmt === '{token}') {
    return tokenVar;
  }
  if (fmt.includes('{token}')) {
    const formatted = fmt.replace('{token}', `{${tokenVar}}`);
    return `f"${formatted}"`;
  }
  return `f"${fmt} {${tokenVar}}"`;
}

/**
 * Converts a parsed cURL into Python request invocation snippet
 */
function generateSingleCallSnippet(
  req: ParsedCurlRequest,
  stepIndex: number,
  clientVar: string, // e.g. 'session' or 'requests' or 'client'
  isAsync: boolean,
  injection: TokenInjectionConfig,
  tokenVar: string,
  applyTokenDirectly: boolean,
  options: PythonChainGenOptions,
  indent: string
): string {
  const method = req.method.toUpperCase();
  const prep = prepareSubsequentRequest(req, injection, tokenVar);
  const lines: string[] = [];

  // URL
  const url = req.baseUrl || req.url || 'https://api.example.com';
  const urlVar = `url_${stepIndex}`;
  lines.push(`${indent}${urlVar} = "${pyEscape(url)}"`);

  // Headers
  const headersDict = { ...prep.headers };
  const headersVar = `headers_${stepIndex}`;

  if (applyTokenDirectly && injection.placement === 'header') {
    const headerExpr = getHeaderValuePythonExpr(injection, tokenVar);
    const headerDictEntries = Object.entries(headersDict)
      .map(([k, v]) => `"${pyEscape(k)}": "${pyEscape(v)}"`)
      .join(',\n' + indent + '    ');

    const injectionEntry = `"${pyEscape(injection.headerName)}": ${headerExpr}`;

    if (Object.keys(headersDict).length > 0) {
      lines.push(`${indent}${headersVar} = {`);
      lines.push(`${indent}    ${headerDictEntries},`);
      lines.push(`${indent}    ${injectionEntry},`);
      lines.push(`${indent}}`);
    } else {
      lines.push(`${indent}${headersVar} = {${injectionEntry}}`);
    }
  } else if (Object.keys(headersDict).length > 0) {
    lines.push(`${indent}${headersVar} = {`);
    for (const [k, v] of Object.entries(headersDict)) {
      lines.push(`${indent}    "${pyEscape(k)}": "${pyEscape(v)}",`);
    }
    lines.push(`${indent}}`);
  }

  // Query Params
  const queryParams = { ...prep.queryParams };
  const paramsVar = `params_${stepIndex}`;
  let hasParams = false;

  if (applyTokenDirectly && injection.placement === 'query') {
    hasParams = true;
    lines.push(`${indent}${paramsVar} = {`);
    for (const [k, v] of Object.entries(queryParams)) {
      lines.push(`${indent}    "${pyEscape(k)}": "${pyEscape(v)}",`);
    }
    lines.push(`${indent}    "${pyEscape(injection.queryParamName)}": ${tokenVar},`);
    lines.push(`${indent}}`);
  } else if (Object.keys(queryParams).length > 0) {
    hasParams = true;
    lines.push(`${indent}${paramsVar} = {`);
    for (const [k, v] of Object.entries(queryParams)) {
      lines.push(`${indent}    "${pyEscape(k)}": "${pyEscape(v)}",`);
    }
    lines.push(`${indent}}`);
  }

  // Body payload
  let bodyArg = '';
  if (req.body) {
    if (req.body.type === 'json' && req.body.jsonData !== undefined) {
      const dataVar = `payload_${stepIndex}`;
      const jsonLiteral = toPythonLiteral(req.body.jsonData, 4, Math.floor(indent.length / 4));
      lines.push(`${indent}${dataVar} = ${jsonLiteral}`);
      bodyArg = `json=${dataVar}`;
    } else if (req.body.type === 'form-urlencoded' && req.body.formData) {
      const dataVar = `data_${stepIndex}`;
      const formLiteral = toPythonLiteral(req.body.formData, 4, Math.floor(indent.length / 4));
      lines.push(`${indent}${dataVar} = ${formLiteral}`);
      bodyArg = `data=${dataVar}`;
    } else if (req.body.rawText) {
      const dataVar = `data_${stepIndex}`;
      lines.push(`${indent}${dataVar} = """${pyEscape(req.body.rawText)}"""`);
      bodyArg = `data=${dataVar}`;
    }
  }

  // Build arguments list for request
  const callArgs: string[] = [`${urlVar}`];
  if (Object.keys(headersDict).length > 0 || (applyTokenDirectly && injection.placement === 'header')) {
    callArgs.push(`headers=${headersVar}`);
  }
  if (hasParams) {
    callArgs.push(`params=${paramsVar}`);
  }
  if (bodyArg) {
    callArgs.push(bodyArg);
  }
  if (options.timeoutSeconds > 0) {
    callArgs.push(`timeout=${options.timeoutSeconds}`);
  }

  const resVar = `res_${stepIndex}`;
  const awaitPrefix = isAsync ? 'await ' : '';
  const methodLower = method.toLowerCase();

  lines.push(`${indent}${resVar} = ${awaitPrefix}${clientVar}.${methodLower}(${callArgs.join(', ')})`);

  if (options.includeErrorHandling) {
    lines.push(`${indent}${resVar}.raise_for_status()`);
  }

  if (options.printResponses) {
    lines.push(`${indent}print(f"[${pyEscape(method)}] {${urlVar}} -> Status {${resVar}.status_code}")`);
    lines.push(`${indent}try:`);
    lines.push(`${indent}    print(json.dumps(${resVar}.json(), indent=2))`);
    lines.push(`${indent}except Exception:`);
    lines.push(`${indent}    print(${resVar}.text[:500])`);
  }

  return lines.join('\n');
}

/**
 * Main function to generate the complete chained Python script
 */
export function generateChainedPythonScript(
  loginCurl: string,
  subsequentRequests: SubsequentRequest[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  options: PythonChainGenOptions = DEFAULT_OPTIONS
): string {
  const parsedLogin = parseCurlCommand(loginCurl);
  const activeSubsequent = subsequentRequests.filter((r) => r.enabled);
  const parsedSubsequent = activeSubsequent.map((r) => ({
    ...r,
    parsed: parseCurlCommand(r.curl),
  }));

  const isAsync = options.library === 'httpx_async' || options.library === 'aiohttp';
  const tokenVar = extraction.variableName || 'token';

  switch (options.structure) {
    case 'session':
      return generateSessionScript(parsedLogin, parsedSubsequent, extraction, injection, options, isAsync, tokenVar);
    case 'functions':
      return generateFunctionsScript(parsedLogin, parsedSubsequent, extraction, injection, options, isAsync, tokenVar);
    case 'class_client':
      return generateClassClientScript(parsedLogin, parsedSubsequent, extraction, injection, options, isAsync, tokenVar);
    case 'sequential':
    default:
      return generateSequentialScript(parsedLogin, parsedSubsequent, extraction, injection, options, isAsync, tokenVar);
  }
}

/**
 * 1. SESSION-BASED SCRIPT (requests.Session / httpx.Client)
 * Authenticates, stores the token on the session headers/cookies, and runs subsequent calls
 */
function generateSessionScript(
  loginReq: ParsedCurlRequest,
  subsequent: { id: string; name: string; parsed: ParsedCurlRequest }[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  options: PythonChainGenOptions,
  isAsync: boolean,
  tokenVar: string
): string {
  const lines: string[] = [];

  // Imports
  lines.push('import json');
  if (options.extractEnv) {
    lines.push('import os');
  }
  if (isAsync) {
    lines.push('import asyncio');
  }

  if (options.library === 'requests') {
    lines.push('import requests');
  } else if (options.library === 'httpx_sync' || options.library === 'httpx_async') {
    lines.push('import httpx');
  } else if (options.library === 'aiohttp') {
    lines.push('import aiohttp');
  }

  lines.push('');
  lines.push('# ==============================================================================');
  lines.push('# Authenticated API Execution Chain (Session-Based)');
  lines.push(`# Generated with Token: '${extraction.keyPath}' -> Injected into '${injection.headerName}'`);
  lines.push('# ==============================================================================\n');

  const mainFunc = isAsync ? 'async def run_api_chain():' : 'def run_api_chain():';
  lines.push(mainFunc);
  const ind = '    ';

  // Initialize session
  if (options.library === 'requests') {
    lines.push(`${ind}session = requests.Session()`);
  } else if (options.library === 'httpx_sync') {
    lines.push(`${ind}session = httpx.Client()`);
  } else if (options.library === 'httpx_async') {
    lines.push(`${ind}async with httpx.AsyncClient() as session:`);
  } else if (options.library === 'aiohttp') {
    lines.push(`${ind}async with aiohttp.ClientSession() as session:`);
  }

  const blockInd = (options.library === 'httpx_async' || options.library === 'aiohttp') ? ind + ind : ind;

  // Step 1: Login Request
  lines.push(`\n${blockInd}# ----------------------------------------------------------------------`);
  lines.push(`${blockInd}# Step 1: Authentication & Token Retrieval`);
  lines.push(`${blockInd}# ----------------------------------------------------------------------`);

  const loginUrl = loginReq.baseUrl || loginReq.url || 'https://api.example.com/login';
  lines.push(`${blockInd}login_url = "${pyEscape(loginUrl)}"`);

  // Headers for login
  const loginHeaders = { ...loginReq.headers };
  delete loginHeaders['Host'];
  delete loginHeaders['host'];
  delete loginHeaders['Content-Length'];
  delete loginHeaders['content-length'];

  if (Object.keys(loginHeaders).length > 0) {
    lines.push(`${blockInd}login_headers = {`);
    for (const [k, v] of Object.entries(loginHeaders)) {
      lines.push(`${blockInd}    "${pyEscape(k)}": "${pyEscape(v)}",`);
    }
    lines.push(`${blockInd}}`);
  }

  // Body for login
  let loginBodyArg = '';
  if (loginReq.body) {
    if (loginReq.body.type === 'json' && loginReq.body.jsonData !== undefined) {
      const jsonLit = toPythonLiteral(loginReq.body.jsonData, 4, Math.floor(blockInd.length / 4));
      lines.push(`${blockInd}login_payload = ${jsonLit}`);
      loginBodyArg = 'json=login_payload';
    } else if (loginReq.body.type === 'form-urlencoded' && loginReq.body.formData) {
      const formLit = toPythonLiteral(loginReq.body.formData, 4, Math.floor(blockInd.length / 4));
      lines.push(`${blockInd}login_data = ${formLit}`);
      loginBodyArg = 'data=login_data';
    } else if (loginReq.body.rawText) {
      lines.push(`${blockInd}login_data = """${pyEscape(loginReq.body.rawText)}"""`);
      loginBodyArg = 'data=login_data';
    }
  }

  const loginArgs = ['login_url'];
  if (Object.keys(loginHeaders).length > 0) loginArgs.push('headers=login_headers');
  if (loginBodyArg) loginArgs.push(loginBodyArg);
  if (options.timeoutSeconds > 0) loginArgs.push(`timeout=${options.timeoutSeconds}`);

  const awaitPref = isAsync ? 'await ' : '';
  const loginMethod = loginReq.method.toLowerCase();
  lines.push(`${blockInd}print("[1/AUTH] Authenticating to login endpoint...")`);
  lines.push(`${blockInd}login_res = ${awaitPref}session.${loginMethod}(${loginArgs.join(', ')})`);

  if (options.includeErrorHandling) {
    lines.push(`${blockInd}login_res.raise_for_status()`);
  }

  // Token extraction
  lines.push('');
  lines.push(generateTokenExtractionCode(extraction, 'login_res', blockInd));
  lines.push(`${blockInd}print(f"✓ Authentication successful! Retrieved token: {${tokenVar}[:12]}... (len={len(${tokenVar})})")`);

  // Configure session headers / cookies with the extracted token
  lines.push(`\n${blockInd}# Configure session defaults with the authentication token`);
  if (injection.placement === 'header') {
    const headerExpr = getHeaderValuePythonExpr(injection, tokenVar);
    lines.push(`${blockInd}session.headers.update({`);
    lines.push(`${blockInd}    "${pyEscape(injection.headerName)}": ${headerExpr}`);
    lines.push(`${blockInd}})`);
  } else if (injection.placement === 'cookie') {
    lines.push(`${blockInd}session.cookies.set("${pyEscape(injection.headerName || 'token')}", ${tokenVar})`);
  }

  // Subsequent requests
  subsequent.forEach((item, index) => {
    const stepNum = index + 2;
    lines.push(`\n${blockInd}# ----------------------------------------------------------------------`);
    lines.push(`${blockInd}# Step ${stepNum}: ${item.name || 'Subsequent Request ' + (index + 1)}`);
    lines.push(`${blockInd}# ----------------------------------------------------------------------`);

    // In session mode with headers, session already carries the token header,
    // but if placement is query or custom override, apply directly.
    const applyDirectly = injection.placement === 'query' || injection.placement === 'body_json';
    const snippet = generateSingleCallSnippet(
      item.parsed,
      stepNum,
      'session',
      isAsync,
      injection,
      tokenVar,
      applyDirectly,
      options,
      blockInd
    );
    lines.push(snippet);
  });

  lines.push(`\n${blockInd}print("\\nAll API requests in chain executed successfully!")`);

  // Runner block
  lines.push('\n\nif __name__ == "__main__":');
  if (isAsync) {
    lines.push('    asyncio.run(run_api_chain())');
  } else {
    lines.push('    run_api_chain()');
  }

  return lines.join('\n');
}

/**
 * 2. MODULAR FUNCTIONS SCRIPT
 * def login() -> str, def step_1(token), def main()
 */
function generateFunctionsScript(
  loginReq: ParsedCurlRequest,
  subsequent: { id: string; name: string; parsed: ParsedCurlRequest }[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  options: PythonChainGenOptions,
  isAsync: boolean,
  tokenVar: string
): string {
  const lines: string[] = [];
  const ind = '    ';

  lines.push('import json');
  if (options.extractEnv) lines.push('import os');
  if (isAsync) lines.push('import asyncio');
  if (options.library === 'requests') lines.push('import requests');
  else if (options.library === 'httpx_sync' || options.library === 'httpx_async') lines.push('import httpx');
  else if (options.library === 'aiohttp') lines.push('import aiohttp');

  lines.push('');
  lines.push('# ==============================================================================');
  lines.push('# Modular Authenticated Functions');
  lines.push('# ==============================================================================\n');

  // Login function
  const asyncPrefix = isAsync ? 'async ' : '';
  const returnType = options.useTypeHints ? ' -> str' : '';
  lines.push(`${asyncPrefix}def login()${returnType}:`);
  lines.push(`${ind}"""Authenticates against the login endpoint and returns the extracted ${tokenVar}"""`);

  const loginUrl = loginReq.baseUrl || loginReq.url || 'https://api.example.com/login';
  lines.push(`${ind}url = "${pyEscape(loginUrl)}"`);

  // Headers
  const loginHeaders = { ...loginReq.headers };
  delete loginHeaders['Host'];
  delete loginHeaders['host'];
  delete loginHeaders['Content-Length'];
  delete loginHeaders['content-length'];

  if (Object.keys(loginHeaders).length > 0) {
    lines.push(`${ind}headers = {`);
    for (const [k, v] of Object.entries(loginHeaders)) {
      lines.push(`${ind}    "${pyEscape(k)}": "${pyEscape(v)}",`);
    }
    lines.push(`${ind}}`);
  }

  let bodyArg = '';
  if (loginReq.body) {
    if (loginReq.body.type === 'json' && loginReq.body.jsonData !== undefined) {
      const jsonLit = toPythonLiteral(loginReq.body.jsonData, 4, 1);
      lines.push(`${ind}payload = ${jsonLit}`);
      bodyArg = 'json=payload';
    } else if (loginReq.body.type === 'form-urlencoded' && loginReq.body.formData) {
      const formLit = toPythonLiteral(loginReq.body.formData, 4, 1);
      lines.push(`${ind}data = ${formLit}`);
      bodyArg = 'data=data';
    } else if (loginReq.body.rawText) {
      lines.push(`${ind}data = """${pyEscape(loginReq.body.rawText)}"""`);
      bodyArg = 'data=data';
    }
  }

  const callArgs = ['url'];
  if (Object.keys(loginHeaders).length > 0) callArgs.push('headers=headers');
  if (bodyArg) callArgs.push(bodyArg);
  if (options.timeoutSeconds > 0) callArgs.push(`timeout=${options.timeoutSeconds}`);

  const clientName = options.library === 'requests' ? 'requests' : options.library === 'httpx_sync' ? 'httpx' : 'client';
  const awaitPrefix = isAsync ? 'await ' : '';
  const methodLower = loginReq.method.toLowerCase();

  if (options.library === 'httpx_async') {
    lines.push(`${ind}async with httpx.AsyncClient() as client:`);
    lines.push(`${ind}    res = await client.${methodLower}(${callArgs.join(', ')})`);
    if (options.includeErrorHandling) lines.push(`${ind}    res.raise_for_status()`);
    lines.push(generateTokenExtractionCode(extraction, 'res', ind + ind));
    lines.push(`${ind}    return ${tokenVar}`);
  } else {
    lines.push(`${ind}res = ${awaitPrefix}${clientName}.${methodLower}(${callArgs.join(', ')})`);
    if (options.includeErrorHandling) lines.push(`${ind}res.raise_for_status()`);
    lines.push(generateTokenExtractionCode(extraction, 'res', ind));
    lines.push(`${ind}return ${tokenVar}`);
  }

  // Subsequent functions
  subsequent.forEach((item, index) => {
    const fnName = `step_${index + 1}_${sanitizeIdentifier(item.name || 'request')}`;
    const tokenParam = options.useTypeHints ? `${tokenVar}: str` : `${tokenVar}`;
    const retType = options.useTypeHints ? ' -> dict' : '';

    lines.push(`\n\n${asyncPrefix}def ${fnName}(${tokenParam})${retType}:`);
    lines.push(`${ind}"""${item.name || 'Subsequent request ' + (index + 1)}"""`);

    const snippet = generateSingleCallSnippet(
      item.parsed,
      index + 1,
      options.library === 'requests' ? 'requests' : options.library === 'httpx_sync' ? 'httpx' : 'client',
      isAsync,
      injection,
      tokenVar,
      true,
      options,
      options.library === 'httpx_async' ? ind + ind : ind
    );

    if (options.library === 'httpx_async') {
      lines.push(`${ind}async with httpx.AsyncClient() as client:`);
      lines.push(snippet);
      lines.push(`${ind}    return res_${index + 1}.json()`);
    } else {
      lines.push(snippet);
      lines.push(`${ind}return res_${index + 1}.json()`);
    }
  });

  // Main orchestrator
  lines.push(`\n\n${asyncPrefix}def main():`);
  lines.push(`${ind}print("[*] Starting authenticated execution chain...")`);
  lines.push(`${ind}${tokenVar} = ${awaitPrefix}login()`);
  lines.push(`${ind}print(f"✓ Retrieved token: {${tokenVar}[:10]}...")\n`);

  subsequent.forEach((item, index) => {
    const fnName = `step_${index + 1}_${sanitizeIdentifier(item.name || 'request')}`;
    lines.push(`${ind}print(f"\\n--- Executing ${item.name || 'Step ' + (index + 1)} ---")`);
    lines.push(`${ind}${awaitPrefix}${fnName}(${tokenVar})`);
  });

  lines.push(`\n${ind}print("\\nAll steps completed successfully!")`);

  lines.push('\n\nif __name__ == "__main__":');
  if (isAsync) lines.push('    asyncio.run(main())');
  else lines.push('    main()');

  return lines.join('\n');
}

/**
 * 3. SEQUENTIAL PROCEDURAL SCRIPT
 * Linear, easy to read and copy/paste into a notebook or standalone runner
 */
function generateSequentialScript(
  loginReq: ParsedCurlRequest,
  subsequent: { id: string; name: string; parsed: ParsedCurlRequest }[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  options: PythonChainGenOptions,
  isAsync: boolean,
  tokenVar: string
): string {
  const lines: string[] = [];

  lines.push('import json');
  if (options.extractEnv) lines.push('import os');
  if (isAsync) lines.push('import asyncio');
  if (options.library === 'requests') lines.push('import requests');
  else if (options.library === 'httpx_sync' || options.library === 'httpx_async') lines.push('import httpx');
  else if (options.library === 'aiohttp') lines.push('import aiohttp');

  lines.push('');
  lines.push('# ==============================================================================');
  lines.push('# Sequential cURL Chain to Python Script');
  lines.push('# ==============================================================================\n');

  const mainWrapper = isAsync ? 'async def main():' : 'def main():';
  lines.push(mainWrapper);
  const ind = '    ';

  // Step 1: Login
  lines.push(`${ind}# ==========================================`);
  lines.push(`${ind}# 1. Login Request`);
  lines.push(`${ind}# ==========================================`);

  const loginUrl = loginReq.baseUrl || loginReq.url || 'https://api.example.com/login';
  lines.push(`${ind}login_url = "${pyEscape(loginUrl)}"`);

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

  let bodyArg = '';
  if (loginReq.body) {
    if (loginReq.body.type === 'json' && loginReq.body.jsonData !== undefined) {
      const jsonLit = toPythonLiteral(loginReq.body.jsonData, 4, 1);
      lines.push(`${ind}login_payload = ${jsonLit}`);
      bodyArg = 'json=login_payload';
    } else if (loginReq.body.type === 'form-urlencoded' && loginReq.body.formData) {
      const formLit = toPythonLiteral(loginReq.body.formData, 4, 1);
      lines.push(`${ind}login_data = ${formLit}`);
      bodyArg = 'data=login_data';
    } else if (loginReq.body.rawText) {
      lines.push(`${ind}login_data = """${pyEscape(loginReq.body.rawText)}"""`);
      bodyArg = 'data=login_data';
    }
  }

  const callArgs = ['login_url'];
  if (Object.keys(loginHeaders).length > 0) callArgs.push('headers=login_headers');
  if (bodyArg) callArgs.push(bodyArg);
  if (options.timeoutSeconds > 0) callArgs.push(`timeout=${options.timeoutSeconds}`);

  const clientName = options.library === 'requests' ? 'requests' : options.library === 'httpx_sync' ? 'httpx' : 'client';
  const awaitPrefix = isAsync ? 'await ' : '';
  const methodLower = loginReq.method.toLowerCase();

  lines.push(`${ind}login_res = ${awaitPrefix}${clientName}.${methodLower}(${callArgs.join(', ')})`);
  if (options.includeErrorHandling) lines.push(`${ind}login_res.raise_for_status()`);

  lines.push('');
  lines.push(generateTokenExtractionCode(extraction, 'login_res', ind));
  lines.push(`${ind}print(f"Token obtained: {${tokenVar}}")\n`);

  // Subsequent requests
  subsequent.forEach((item, index) => {
    const stepNum = index + 2;
    lines.push(`${ind}# ==========================================`);
    lines.push(`${ind}# ${stepNum}. ${item.name || 'Subsequent Request ' + (index + 1)}`);
    lines.push(`${ind}# ==========================================`);

    const snippet = generateSingleCallSnippet(
      item.parsed,
      stepNum,
      clientName,
      isAsync,
      injection,
      tokenVar,
      true,
      options,
      ind
    );
    lines.push(snippet);
    lines.push('');
  });

  lines.push('\nif __name__ == "__main__":');
  if (isAsync) lines.push('    asyncio.run(main())');
  else lines.push('    main()');

  return lines.join('\n');
}

/**
 * 4. CLASS-BASED CLIENT (ApiClient)
 * Production-ready OOP client class with session management & endpoint methods
 */
function generateClassClientScript(
  loginReq: ParsedCurlRequest,
  subsequent: { id: string; name: string; parsed: ParsedCurlRequest }[],
  extraction: TokenExtractionConfig,
  injection: TokenInjectionConfig,
  options: PythonChainGenOptions,
  isAsync: boolean,
  tokenVar: string
): string {
  const lines: string[] = [];
  const ind = '    ';

  lines.push('import json');
  if (options.extractEnv) lines.push('import os');
  if (isAsync) lines.push('import asyncio');
  if (options.library === 'requests') lines.push('import requests');
  else if (options.library === 'httpx_sync' || options.library === 'httpx_async') lines.push('import httpx');
  else if (options.library === 'aiohttp') lines.push('import aiohttp');

  lines.push('');
  lines.push('class AuthenticatedApiClient:');
  lines.push(`${ind}"""Production-ready API client managing login auth token & subsequent requests"""\n`);

  // __init__
  lines.push(`${ind}def __init__(self, base_url: str = ""):`);
  lines.push(`${ind}${ind}self.base_url = base_url`);
  lines.push(`${ind}${ind}self.${tokenVar} = None`);
  if (options.library === 'requests') {
    lines.push(`${ind}${ind}self.session = requests.Session()`);
  } else if (options.library === 'httpx_sync') {
    lines.push(`${ind}${ind}self.session = httpx.Client()`);
  }
  lines.push('');

  // authenticate method
  const asyncPref = isAsync ? 'async ' : '';
  lines.push(`${ind}${asyncPref}def authenticate(self)${options.useTypeHints ? ' -> str' : ''}:`);
  lines.push(`${ind}${ind}"""Executes login request and caches extracted token"""`);

  const loginUrl = loginReq.baseUrl || loginReq.url || 'https://api.example.com/login';
  lines.push(`${ind}${ind}url = f"{self.base_url}${pyEscape(loginUrl)}" if self.base_url else "${pyEscape(loginUrl)}"`);

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

  let bodyArg = '';
  if (loginReq.body) {
    if (loginReq.body.type === 'json' && loginReq.body.jsonData !== undefined) {
      const jsonLit = toPythonLiteral(loginReq.body.jsonData, 4, 2);
      lines.push(`${ind}${ind}payload = ${jsonLit}`);
      bodyArg = 'json=payload';
    } else if (loginReq.body.type === 'form-urlencoded' && loginReq.body.formData) {
      const formLit = toPythonLiteral(loginReq.body.formData, 4, 2);
      lines.push(`${ind}${ind}data = ${formLit}`);
      bodyArg = 'data=data';
    } else if (loginReq.body.rawText) {
      lines.push(`${ind}${ind}data = """${pyEscape(loginReq.body.rawText)}"""`);
      bodyArg = 'data=data';
    }
  }

  const callArgs = ['url'];
  if (Object.keys(loginHeaders).length > 0) callArgs.push('headers=headers');
  if (bodyArg) callArgs.push(bodyArg);
  if (options.timeoutSeconds > 0) callArgs.push(`timeout=${options.timeoutSeconds}`);

  const clientName = 'self.session';
  const awaitPrefix = isAsync ? 'await ' : '';
  const methodLower = loginReq.method.toLowerCase();

  lines.push(`${ind}${ind}res = ${awaitPrefix}${clientName}.${methodLower}(${callArgs.join(', ')})`);
  if (options.includeErrorHandling) lines.push(`${ind}${ind}res.raise_for_status()`);
  lines.push(generateTokenExtractionCode(extraction, 'res', ind + ind));
  lines.push(`${ind}${ind}self.${tokenVar} = ${tokenVar}`);

  if (injection.placement === 'header') {
    const headerExpr = getHeaderValuePythonExpr(injection, `self.${tokenVar}`);
    lines.push(`${ind}${ind}self.session.headers.update({"${pyEscape(injection.headerName)}": ${headerExpr}})`);
  }

  lines.push(`${ind}${ind}return self.${tokenVar}\n`);

  // Methods for each subsequent request
  subsequent.forEach((item, index) => {
    const methodName = sanitizeIdentifier(item.name || `request_${index + 1}`);
    lines.push(`${ind}${asyncPref}def ${methodName}(self)${options.useTypeHints ? ' -> dict' : ''}:`);
    lines.push(`${ind}${ind}"""${item.name || 'Request ' + (index + 1)}"""`);
    lines.push(`${ind}${ind}if not self.${tokenVar}:`);
    lines.push(`${ind}${ind}    ${awaitPrefix}self.authenticate()`);

    const snippet = generateSingleCallSnippet(
      item.parsed,
      index + 1,
      'self.session',
      isAsync,
      injection,
      `self.${tokenVar}`,
      injection.placement !== 'header',
      options,
      ind + ind
    );
    lines.push(snippet);
    lines.push(`${ind}${ind}return res_${index + 1}.json()\n`);
  });

  // Runner
  lines.push('if __name__ == "__main__":');
  lines.push('    client = AuthenticatedApiClient()');
  lines.push('    client.authenticate()');
  subsequent.forEach((item, index) => {
    const methodName = sanitizeIdentifier(item.name || `request_${index + 1}`);
    lines.push(`    client.${methodName}()`);
  });

  return lines.join('\n');
}

function sanitizeIdentifier(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'step';
}
