import { ParsedCurlRequest } from './curlParser';

export type PythonLibrary = 'requests' | 'httpx_async' | 'httpx_sync' | 'aiohttp' | 'urllib';
export type TypeScriptLibrary = 'fetch' | 'axios' | 'ky';

export interface CodeGenOptions {
  wrapInFunction?: boolean;
  includeErrorHandling?: boolean;
  extractEnv?: boolean;
  includeTypes?: boolean; // TypeScript only
  indentSize?: 2 | 4;
}

/**
 * Format string indentation
 */
function getIndent(level: number, spaces = 2): string {
  return ' '.repeat(level * spaces);
}

/**
 * Helper to escape quotes in strings for Python
 */
function pyEscape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Helper to escape quotes in strings for TypeScript
 */
function tsEscape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Generates Python code for a parsed cURL request
 */
export function generatePythonCode(
  req: ParsedCurlRequest,
  library: PythonLibrary = 'requests',
  options: CodeGenOptions = {}
): string {
  const {
    wrapInFunction = true,
    includeErrorHandling = true,
    extractEnv = false,
    indentSize = 4,
  } = options;

  const ind = (level: number) => getIndent(level, indentSize);
  const baseIndent = wrapInFunction ? 1 : 0;
  const bodyIndent = includeErrorHandling ? baseIndent + 1 : baseIndent;

  const url = req.baseUrl || req.url || 'https://api.example.com';
  const method = req.method.toUpperCase();
  const methodLower = method.toLowerCase();

  // Headers (excluding Host, Content-Length)
  const headers = { ...req.headers };
  delete headers['Host'];
  delete headers['host'];
  delete headers['Content-Length'];
  delete headers['content-length'];

  // Auth processing
  let authCode = '';
  let authEnvVar = '';
  if (req.auth) {
    if (req.auth.type === 'bearer' && req.auth.token) {
      if (extractEnv) {
        authEnvVar = 'API_TOKEN = os.environ.get("API_TOKEN", "your_token_here")\n';
        headers['Authorization'] = `Bearer {API_TOKEN}`;
      } else {
        headers['Authorization'] = `Bearer ${req.auth.token}`;
      }
    } else if (req.auth.type === 'basic' && (req.auth.username || req.auth.password)) {
      if (extractEnv) {
        authEnvVar =
          'BASIC_USER = os.environ.get("BASIC_USER", "' + pyEscape(req.auth.username || '') + '")\n' +
          'BASIC_PASS = os.environ.get("BASIC_PASS", "' + pyEscape(req.auth.password || '') + '")\n';
      }
    }
  }

  // --- 1. Python `requests` library ---
  if (library === 'requests') {
    const lines: string[] = [];
    lines.push('import requests');
    if (extractEnv) lines.push('import os');
    if (req.body?.type === 'json' || req.body?.type === 'graphql') {
      lines.push('import json');
    }
    lines.push('');

    if (authEnvVar) lines.push(authEnvVar);

    if (wrapInFunction) {
      lines.push('def send_request():');
    }

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}try:`);
    }

    // URL & Params
    lines.push(`${ind(bodyIndent)}url = "${pyEscape(url)}"`);

    if (Object.keys(req.queryParams).length > 0) {
      lines.push(`${ind(bodyIndent)}params = {`);
      Object.entries(req.queryParams).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
      });
      lines.push(`${ind(bodyIndent)}}`);
    }

    // Headers
    if (Object.keys(headers).length > 0) {
      lines.push(`${ind(bodyIndent)}headers = {`);
      Object.entries(headers).forEach(([k, v]) => {
        if (extractEnv && v.includes('{API_TOKEN}')) {
          lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": f"Bearer {API_TOKEN}",`);
        } else {
          lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
        }
      });
      lines.push(`${ind(bodyIndent)}}`);
    }

    // Cookies
    if (Object.keys(req.cookies).length > 0) {
      lines.push(`${ind(bodyIndent)}cookies = {`);
      Object.entries(req.cookies).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
      });
      lines.push(`${ind(bodyIndent)}}`);
    }

    // Body
    let reqArgBody = '';
    if (req.body) {
      if (req.body.type === 'json' && req.body.jsonData !== undefined) {
        lines.push(
          `${ind(bodyIndent)}payload = ${JSON.stringify(req.body.jsonData, null, indentSize).replace(
            /\n/g,
            '\n' + ind(bodyIndent)
          )}`
        );
        reqArgBody = ', json=payload';
      } else if (req.body.type === 'graphql' && req.body.graphql) {
        lines.push(`${ind(bodyIndent)}payload = {`);
        lines.push(`${ind(bodyIndent + 1)}"query": """${req.body.graphql.query}""",`);
        if (req.body.graphql.variables) {
          lines.push(
            `${ind(bodyIndent + 1)}"variables": ${JSON.stringify(req.body.graphql.variables)},`
          );
        }
        lines.push(`${ind(bodyIndent)}}`);
        reqArgBody = ', json=payload';
      } else if (req.body.type === 'form-urlencoded' && req.body.formData) {
        lines.push(`${ind(bodyIndent)}data = {`);
        Object.entries(req.body.formData).forEach(([k, v]) => {
          lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(String(v))}",`);
        });
        lines.push(`${ind(bodyIndent)}}`);
        reqArgBody = ', data=data';
      } else if (req.body.type === 'multipart' && req.body.formData) {
        lines.push(`${ind(bodyIndent)}# Multipart files and form data`);
        lines.push(`${ind(bodyIndent)}files = {`);
        Object.entries(req.body.formData).forEach(([k, v]) => {
          if (typeof v === 'object' && v.file) {
            lines.push(
              `${ind(bodyIndent + 1)}"${pyEscape(k)}": open("${pyEscape(v.file)}", "rb"),`
            );
          } else {
            lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": (None, "${pyEscape(String(v))}"),`);
          }
        });
        lines.push(`${ind(bodyIndent)}}`);
        reqArgBody = ', files=files';
      } else if (req.body.rawText) {
        lines.push(`${ind(bodyIndent)}data = "${pyEscape(req.body.rawText)}"`);
        reqArgBody = ', data=data';
      }
    }

    // Call parameters
    const callArgs: string[] = ['url'];
    if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(methodLower)) {
      // standard requests.get/post
    }
    if (Object.keys(req.queryParams).length > 0) callArgs.push('params=params');
    if (Object.keys(headers).length > 0) callArgs.push('headers=headers');
    if (Object.keys(req.cookies).length > 0) callArgs.push('cookies=cookies');
    if (req.auth?.type === 'basic' && (req.auth.username || req.auth.password)) {
      if (extractEnv) {
        callArgs.push('auth=(BASIC_USER, BASIC_PASS)');
      } else {
        callArgs.push(`auth=("${pyEscape(req.auth.username || '')}", "${pyEscape(req.auth.password || '')}")`);
      }
    }
    if (req.options.timeoutSeconds) callArgs.push(`timeout=${req.options.timeoutSeconds}`);
    if (req.options.insecure) callArgs.push('verify=False');
    if (req.options.followRedirects === false) callArgs.push('allow_redirects=False');

    const methodFunc = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(methodLower)
      ? `requests.${methodLower}`
      : `requests.request("${method}",`;

    const fullCall =
      methodFunc.startsWith('requests.request')
        ? `${methodFunc} ${callArgs.join(', ')}${reqArgBody})`
        : `${methodFunc}(${callArgs.join(', ')}${reqArgBody})`;

    lines.push(`${ind(bodyIndent)}response = ${fullCall}`);
    lines.push(`${ind(bodyIndent)}response.raise_for_status()`);
    lines.push(`${ind(bodyIndent)}print(f"Status Code: {response.status_code}")`);
    lines.push(`${ind(bodyIndent)}try:`);
    lines.push(`${ind(bodyIndent + 1)}print("Response JSON:", response.json())`);
    lines.push(`${ind(bodyIndent)}except Exception:`);
    lines.push(`${ind(bodyIndent + 1)}print("Response Text:", response.text)`);
    lines.push(`${ind(bodyIndent)}return response`);

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}except requests.exceptions.RequestException as e:`);
      lines.push(`${ind(baseIndent + 1)}print(f"HTTP Request failed: {e}")`);
      lines.push(`${ind(baseIndent + 1)}raise`);
    }

    if (wrapInFunction) {
      lines.push('');
      lines.push('if __name__ == "__main__":');
      lines.push(`${ind(1)}send_request()`);
    }

    return lines.join('\n');
  }

  // --- 2. Python `httpx` (Async / Sync) ---
  if (library === 'httpx_async' || library === 'httpx_sync') {
    const isAsync = library === 'httpx_async';
    const lines: string[] = [];
    lines.push('import httpx');
    if (isAsync) lines.push('import asyncio');
    if (extractEnv) lines.push('import os');
    lines.push('');

    if (authEnvVar) lines.push(authEnvVar);

    if (wrapInFunction) {
      lines.push(isAsync ? 'async def send_request():' : 'def send_request():');
    }

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}try:`);
    }

    lines.push(`${ind(bodyIndent)}url = "${pyEscape(url)}"`);

    if (Object.keys(req.queryParams).length > 0) {
      lines.push(`${ind(bodyIndent)}params = {`);
      Object.entries(req.queryParams).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
      });
      lines.push(`${ind(bodyIndent)}}`);
    }

    if (Object.keys(headers).length > 0) {
      lines.push(`${ind(bodyIndent)}headers = {`);
      Object.entries(headers).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
      });
      lines.push(`${ind(bodyIndent)}}`);
    }

    let bodyArg = '';
    if (req.body?.type === 'json' && req.body.jsonData) {
      lines.push(
        `${ind(bodyIndent)}payload = ${JSON.stringify(req.body.jsonData, null, indentSize).replace(
          /\n/g,
          '\n' + ind(bodyIndent)
        )}`
      );
      bodyArg = ', json=payload';
    } else if (req.body?.type === 'form-urlencoded' && req.body.formData) {
      lines.push(`${ind(bodyIndent)}data = {`);
      Object.entries(req.body.formData).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(String(v))}",`);
      });
      lines.push(`${ind(bodyIndent)}}`);
      bodyArg = ', data=data';
    } else if (req.body?.rawText) {
      lines.push(`${ind(bodyIndent)}content = "${pyEscape(req.body.rawText)}"`);
      bodyArg = ', content=content';
    }

    const clientClass = isAsync ? 'httpx.AsyncClient' : 'httpx.Client';
    const clientOptions: string[] = [];
    if (req.options.insecure) clientOptions.push('verify=False');
    if (req.options.followRedirects) clientOptions.push('follow_redirects=True');
    if (req.options.timeoutSeconds) clientOptions.push(`timeout=${req.options.timeoutSeconds}`);

    const clientInit = clientOptions.length ? `${clientClass}(${clientOptions.join(', ')})` : `${clientClass}()`;

    if (isAsync) {
      lines.push(`${ind(bodyIndent)}async with ${clientInit} as client:`);
    } else {
      lines.push(`${ind(bodyIndent)}with ${clientInit} as client:`);
    }

    const subIndent = bodyIndent + 1;
    const callArgs = ['url'];
    if (Object.keys(req.queryParams).length > 0) callArgs.push('params=params');
    if (Object.keys(headers).length > 0) callArgs.push('headers=headers');
    if (req.auth?.type === 'basic' && (req.auth.username || req.auth.password)) {
      callArgs.push(`auth=("${pyEscape(req.auth.username || '')}", "${pyEscape(req.auth.password || '')}")`);
    }

    const awaitPrefix = isAsync ? 'await ' : '';
    const verb = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(methodLower)
      ? methodLower
      : 'request';

    if (verb === 'request') {
      lines.push(`${ind(subIndent)}response = ${awaitPrefix}client.request("${method}", ${callArgs.join(', ')}${bodyArg})`);
    } else {
      lines.push(`${ind(subIndent)}response = ${awaitPrefix}client.${verb}(${callArgs.join(', ')}${bodyArg})`);
    }

    lines.push(`${ind(subIndent)}response.raise_for_status()`);
    lines.push(`${ind(subIndent)}print(f"Status: {response.status_code}")`);
    lines.push(`${ind(subIndent)}print(response.json() if "application/json" in response.headers.get("content-type", "") else response.text)`);
    lines.push(`${ind(subIndent)}return response`);

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}except httpx.HTTPStatusError as e:`);
      lines.push(`${ind(baseIndent + 1)}print(f"HTTP error occurred: {e.response.status_code} - {e.response.text}")`);
      lines.push(`${ind(baseIndent)}except httpx.RequestError as e:`);
      lines.push(`${ind(baseIndent + 1)}print(f"An error occurred while requesting: {e}")`);
    }

    if (wrapInFunction) {
      lines.push('');
      lines.push('if __name__ == "__main__":');
      if (isAsync) {
        lines.push(`${ind(1)}asyncio.run(send_request())`);
      } else {
        lines.push(`${ind(1)}send_request()`);
      }
    }

    return lines.join('\n');
  }

  // --- 3. Python `aiohttp` ---
  if (library === 'aiohttp') {
    const lines: string[] = [];
    lines.push('import aiohttp');
    lines.push('import asyncio');
    if (extractEnv) lines.push('import os');
    lines.push('');

    if (authEnvVar) lines.push(authEnvVar);

    lines.push('async def send_request():');
    if (includeErrorHandling) lines.push(`${ind(1)}try:`);

    const inLvl = includeErrorHandling ? 2 : 1;
    lines.push(`${ind(inLvl)}url = "${pyEscape(url)}"`);

    if (Object.keys(req.queryParams).length > 0) {
      lines.push(`${ind(inLvl)}params = {`);
      Object.entries(req.queryParams).forEach(([k, v]) => {
        lines.push(`${ind(inLvl + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
      });
      lines.push(`${ind(inLvl)}}`);
    }

    if (Object.keys(headers).length > 0) {
      lines.push(`${ind(inLvl)}headers = {`);
      Object.entries(headers).forEach(([k, v]) => {
        lines.push(`${ind(inLvl + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
      });
      lines.push(`${ind(inLvl)}}`);
    }

    let payloadArg = '';
    if (req.body?.type === 'json' && req.body.jsonData) {
      lines.push(
        `${ind(inLvl)}payload = ${JSON.stringify(req.body.jsonData, null, indentSize).replace(
          /\n/g,
          '\n' + ind(inLvl)
        )}`
      );
      payloadArg = ', json=payload';
    } else if (req.body?.type === 'form-urlencoded' && req.body.formData) {
      lines.push(`${ind(inLvl)}data = {`);
      Object.entries(req.body.formData).forEach(([k, v]) => {
        lines.push(`${ind(inLvl + 1)}"${pyEscape(k)}": "${pyEscape(String(v))}",`);
      });
      lines.push(`${ind(inLvl)}}`);
      payloadArg = ', data=data';
    }

    lines.push(`${ind(inLvl)}async with aiohttp.ClientSession() as session:`);
    const callArgs = ['url'];
    if (Object.keys(req.queryParams).length > 0) callArgs.push('params=params');
    if (Object.keys(headers).length > 0) callArgs.push('headers=headers');
    if (req.auth?.type === 'basic' && req.auth.username) {
      callArgs.push(
        `auth=aiohttp.BasicAuth("${pyEscape(req.auth.username)}", "${pyEscape(req.auth.password || '')}")`
      );
    }

    const verb = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(methodLower)
      ? methodLower
      : 'request';

    if (verb === 'request') {
      lines.push(`${ind(inLvl + 1)}async with session.request("${method}", ${callArgs.join(', ')}${payloadArg}) as response:`);
    } else {
      lines.push(`${ind(inLvl + 1)}async with session.${verb}(${callArgs.join(', ')}${payloadArg}) as response:`);
    }

    lines.push(`${ind(inLvl + 2)}status = response.status`);
    lines.push(`${ind(inLvl + 2)}print(f"Status: {status}")`);
    lines.push(`${ind(inLvl + 2)}data = await response.json() if response.content_type == "application/json" else await response.text()`);
    lines.push(`${ind(inLvl + 2)}print("Response:", data)`);
    lines.push(`${ind(inLvl + 2)}return data`);

    if (includeErrorHandling) {
      lines.push(`${ind(1)}except aiohttp.ClientError as e:`);
      lines.push(`${ind(2)}print(f"aiohttp error: {e}")`);
      lines.push(`${ind(2)}raise`);
    }

    lines.push('');
    lines.push('if __name__ == "__main__":');
    lines.push(`${ind(1)}asyncio.run(send_request())`);
    return lines.join('\n');
  }

  // --- 4. Python `urllib` (Zero dependency standard library) ---
  const lines: string[] = [];
  lines.push('import urllib.request');
  lines.push('import urllib.parse');
  lines.push('import json');
  if (req.auth?.type === 'basic') lines.push('import base64');
  if (req.options.insecure) lines.push('import ssl');
  lines.push('');

  if (wrapInFunction) lines.push('def send_request():');
  if (includeErrorHandling) lines.push(`${ind(baseIndent)}try:`);

  lines.push(`${ind(bodyIndent)}url = "${pyEscape(url)}"`);

  if (Object.keys(req.queryParams).length > 0) {
    lines.push(`${ind(bodyIndent)}query_params = urllib.parse.urlencode({`);
    Object.entries(req.queryParams).forEach(([k, v]) => {
      lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
    });
    lines.push(`${ind(bodyIndent)}})`);
    lines.push(`${ind(bodyIndent)}url = f"{url}?{query_params}"`);
  }

  let dataBytesInit = '';
  if (req.body?.type === 'json' && req.body.jsonData) {
    lines.push(
      `${ind(bodyIndent)}payload = ${JSON.stringify(req.body.jsonData, null, indentSize).replace(
        /\n/g,
        '\n' + ind(bodyIndent)
      )}`
    );
    lines.push(`${ind(bodyIndent)}data_bytes = json.dumps(payload).encode("utf-8")`);
    dataBytesInit = ', data=data_bytes';
  } else if (req.body?.type === 'form-urlencoded' && req.body.formData) {
    lines.push(`${ind(bodyIndent)}form_data = urllib.parse.urlencode({`);
    Object.entries(req.body.formData).forEach(([k, v]) => {
      lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(String(v))}",`);
    });
    lines.push(`${ind(bodyIndent)}})`);
    lines.push(`${ind(bodyIndent)}data_bytes = form_data.encode("utf-8")`);
    dataBytesInit = ', data=data_bytes';
  }

  lines.push(`${ind(bodyIndent)}headers = {`);
  Object.entries(headers).forEach(([k, v]) => {
    lines.push(`${ind(bodyIndent + 1)}"${pyEscape(k)}": "${pyEscape(v)}",`);
  });
  if (req.auth?.type === 'basic' && req.auth.username) {
    lines.push(
      `${ind(bodyIndent + 1)}"Authorization": f"Basic {base64.b64encode(b'${pyEscape(req.auth.username)}:${pyEscape(req.auth.password || '')}').decode('utf-8')}",`
    );
  }
  lines.push(`${ind(bodyIndent)}}`);

  lines.push(`${ind(bodyIndent)}req = urllib.request.Request(url${dataBytesInit}, headers=headers, method="${method}")`);

  if (req.options.insecure) {
    lines.push(`${ind(bodyIndent)}ctx = ssl.create_default_context()`);
    lines.push(`${ind(bodyIndent)}ctx.check_hostname = False`);
    lines.push(`${ind(bodyIndent)}ctx.verify_mode = ssl.CERT_NONE`);
    lines.push(`${ind(bodyIndent)}with urllib.request.urlopen(req, context=ctx) as response:`);
  } else {
    lines.push(`${ind(bodyIndent)}with urllib.request.urlopen(req) as response:`);
  }

  lines.push(`${ind(bodyIndent + 1)}result = response.read().decode("utf-8")`);
  lines.push(`${ind(bodyIndent + 1)}print(f"Status Code: {response.getcode()}")`);
  lines.push(`${ind(bodyIndent + 1)}try:`);
  lines.push(`${ind(bodyIndent + 2)}parsed = json.loads(result)`);
  lines.push(`${ind(bodyIndent + 2)}print("Response JSON:", parsed)`);
  lines.push(`${ind(bodyIndent + 1)}except json.JSONDecodeError:`);
  lines.push(`${ind(bodyIndent + 2)}print("Response:", result)`);
  lines.push(`${ind(bodyIndent + 1)}return result`);

  if (includeErrorHandling) {
    lines.push(`${ind(baseIndent)}except urllib.error.HTTPError as e:`);
    lines.push(`${ind(baseIndent + 1)}print(f"HTTP Error: {e.code} {e.reason}")`);
    lines.push(`${ind(baseIndent + 1)}print(e.read().decode("utf-8"))`);
    lines.push(`${ind(baseIndent)}except urllib.error.URLError as e:`);
    lines.push(`${ind(baseIndent + 1)}print(f"URL Error: {e.reason}")`);
  }

  if (wrapInFunction) {
    lines.push('');
    lines.push('if __name__ == "__main__":');
    lines.push(`${ind(1)}send_request()`);
  }

  return lines.join('\n');
}

/**
 * Generates TypeScript code for a parsed cURL request
 */
export function generateTypeScriptCode(
  req: ParsedCurlRequest,
  library: TypeScriptLibrary = 'fetch',
  options: CodeGenOptions = {}
): string {
  const {
    wrapInFunction = true,
    includeErrorHandling = true,
    extractEnv = false,
    includeTypes = true,
    indentSize = 2,
  } = options;

  const ind = (level: number) => getIndent(level, indentSize);
  const baseIndent = wrapInFunction ? 1 : 0;
  const bodyIndent = includeErrorHandling ? baseIndent + 1 : baseIndent;

  const url = req.baseUrl || req.url || 'https://api.example.com';
  const method = req.method.toUpperCase();

  // Headers (excluding Host, Content-Length)
  const headers = { ...req.headers };
  delete headers['Host'];
  delete headers['host'];
  delete headers['Content-Length'];
  delete headers['content-length'];

  // Auth Handling
  let envSecretDeclaration = '';
  if (req.auth) {
    if (req.auth.type === 'bearer' && req.auth.token) {
      if (extractEnv) {
        envSecretDeclaration = 'const API_TOKEN = process.env.API_TOKEN || "your_token_here";\n';
        headers['Authorization'] = `Bearer ${"${API_TOKEN}"}`;
      } else {
        headers['Authorization'] = `Bearer ${req.auth.token}`;
      }
    } else if (req.auth.type === 'basic' && (req.auth.username || req.auth.password)) {
      if (extractEnv) {
        envSecretDeclaration =
          'const BASIC_USER = process.env.BASIC_USER || "' + tsEscape(req.auth.username || '') + '";\n' +
          'const BASIC_PASS = process.env.BASIC_PASS || "' + tsEscape(req.auth.password || '') + '";\n';
      }
    }
  }

  // Generate Type Interfaces if requested
  const typeDefinitions: string[] = [];
  if (includeTypes) {
    if (req.body?.type === 'json' && req.body.jsonData && typeof req.body.jsonData === 'object') {
      typeDefinitions.push('export interface RequestPayload {');
      Object.entries(req.body.jsonData).forEach(([key, val]) => {
        const valType = Array.isArray(val)
          ? 'any[]'
          : typeof val === 'object' && val !== null
          ? 'Record<string, any>'
          : typeof val;
        typeDefinitions.push(`${ind(1)}${key}?: ${valType};`);
      });
      typeDefinitions.push('}\n');
    }

    typeDefinitions.push('export interface ApiResponse<T = any> {');
    typeDefinitions.push(`${ind(1)}data?: T;`);
    typeDefinitions.push(`${ind(1)}status: number;`);
    typeDefinitions.push(`${ind(1)}statusText: string;`);
    typeDefinitions.push('}\n');
  }

  // --- 1. TypeScript `fetch` (Standard Web / Node 18+) ---
  if (library === 'fetch') {
    const lines: string[] = [];

    if (includeTypes && typeDefinitions.length > 0) {
      lines.push(...typeDefinitions);
    }

    if (envSecretDeclaration) lines.push(envSecretDeclaration);

    const funcSig = wrapInFunction
      ? `export async function makeRequest<T = any>(): Promise<ApiResponse<T>> {`
      : '';

    if (funcSig) lines.push(funcSig);

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}try {`);
    }

    // URL setup with query params
    if (Object.keys(req.queryParams).length > 0) {
      lines.push(`${ind(bodyIndent)}const url = new URL('${tsEscape(url)}');`);
      lines.push(`${ind(bodyIndent)}const params: Record<string, string> = {`);
      Object.entries(req.queryParams).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 1)}'${tsEscape(k)}': '${tsEscape(v)}',`);
      });
      lines.push(`${ind(bodyIndent)}};`);
      lines.push(`${ind(bodyIndent)}Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));`);
    } else {
      lines.push(`${ind(bodyIndent)}const url = '${tsEscape(url)}';`);
    }

    // Headers setup
    if (Object.keys(headers).length > 0 || (req.auth?.type === 'basic' && req.auth.username)) {
      lines.push(`${ind(bodyIndent)}const headers: HeadersInit = {`);
      Object.entries(headers).forEach(([k, v]) => {
        if (extractEnv && v.includes('${API_TOKEN}')) {
          lines.push(`${ind(bodyIndent + 1)}'${tsEscape(k)}': \`Bearer \${API_TOKEN}\`,`);
        } else {
          lines.push(`${ind(bodyIndent + 1)}'${tsEscape(k)}': '${tsEscape(v)}',`);
        }
      });

      if (req.auth?.type === 'basic' && (req.auth.username || req.auth.password)) {
        if (extractEnv) {
          lines.push(
            `${ind(bodyIndent + 1)}'Authorization': 'Basic ' + Buffer.from(\`\${BASIC_USER}:\${BASIC_PASS}\`).toString('base64'),`
          );
        } else {
          const b64 = btoa(`${req.auth.username || ''}:${req.auth.password || ''}`);
          lines.push(`${ind(bodyIndent + 1)}'Authorization': 'Basic ${b64}',`);
        }
      }
      lines.push(`${ind(bodyIndent)}};`);
    }

    // Body payload setup
    let fetchBodyKey = '';
    if (req.body) {
      if (req.body.type === 'json' && req.body.jsonData) {
        lines.push(
          `${ind(bodyIndent)}const payload${includeTypes ? ': RequestPayload' : ''} = ${JSON.stringify(
            req.body.jsonData,
            null,
            indentSize
          ).replace(/\n/g, '\n' + ind(bodyIndent))};`
        );
        fetchBodyKey = `\n${ind(bodyIndent + 1)}body: JSON.stringify(payload),`;
      } else if (req.body.type === 'graphql' && req.body.graphql) {
        lines.push(`${ind(bodyIndent)}const payload = {`);
        lines.push(`${ind(bodyIndent + 1)}query: \`${req.body.graphql.query}\`,`);
        if (req.body.graphql.variables) {
          lines.push(
            `${ind(bodyIndent + 1)}variables: ${JSON.stringify(req.body.graphql.variables)},`
          );
        }
        lines.push(`${ind(bodyIndent)}};`);
        fetchBodyKey = `\n${ind(bodyIndent + 1)}body: JSON.stringify(payload),`;
      } else if (req.body.type === 'form-urlencoded' && req.body.formData) {
        lines.push(`${ind(bodyIndent)}const formData = new URLSearchParams();`);
        Object.entries(req.body.formData).forEach(([k, v]) => {
          lines.push(`${ind(bodyIndent)}formData.append('${tsEscape(k)}', '${tsEscape(String(v))}');`);
        });
        fetchBodyKey = `\n${ind(bodyIndent + 1)}body: formData.toString(),`;
      } else if (req.body.type === 'multipart' && req.body.formData) {
        lines.push(`${ind(bodyIndent)}const formData = new FormData();`);
        Object.entries(req.body.formData).forEach(([k, v]) => {
          if (typeof v === 'object' && v.file) {
            lines.push(
              `${ind(bodyIndent)}// Note: in Node.js 18+, use fileFromPath or Blob from 'node:fs'`
            );
            lines.push(
              `${ind(bodyIndent)}formData.append('${tsEscape(k)}', new Blob(['file_content']), '${tsEscape(v.file)}');`
            );
          } else {
            lines.push(`${ind(bodyIndent)}formData.append('${tsEscape(k)}', '${tsEscape(String(v))}');`);
          }
        });
        fetchBodyKey = `\n${ind(bodyIndent + 1)}body: formData,`;
      } else if (req.body.rawText) {
        lines.push(`${ind(bodyIndent)}const body = '${tsEscape(req.body.rawText)}';`);
        fetchBodyKey = `\n${ind(bodyIndent + 1)}body,`;
      }
    }

    // Fetch Options object
    lines.push(`${ind(bodyIndent)}const response = await fetch(${Object.keys(req.queryParams).length > 0 ? 'url.toString()' : 'url'}, {`);
    lines.push(`${ind(bodyIndent + 1)}method: '${method}',`);
    if (Object.keys(headers).length > 0 || req.auth?.type === 'basic') {
      lines.push(`${ind(bodyIndent + 1)}headers,`);
    }
    if (fetchBodyKey) {
      lines.push(`${ind(bodyIndent + 1)}${fetchBodyKey.trim()}`);
    }
    if (req.options.followRedirects === false) {
      lines.push(`${ind(bodyIndent + 1)}redirect: 'manual',`);
    }
    lines.push(`${ind(bodyIndent)}});`);

    lines.push('');
    lines.push(`${ind(bodyIndent)}if (!response.ok) {`);
    lines.push(`${ind(bodyIndent + 1)}throw new Error(\`HTTP Error \${response.status}: \${response.statusText}\`);`);
    lines.push(`${ind(bodyIndent)}}`);
    lines.push('');
    lines.push(`${ind(bodyIndent)}const contentType = response.headers.get('content-type') || '';`);
    lines.push(`${ind(bodyIndent)}const data: T = contentType.includes('application/json')`);
    lines.push(`${ind(bodyIndent + 1)}? await response.json()`);
    lines.push(`${ind(bodyIndent + 1)}: (await response.text() as unknown as T);`);
    lines.push('');
    lines.push(`${ind(bodyIndent)}console.log('Response Status:', response.status);`);
    lines.push(`${ind(bodyIndent)}console.log('Response Data:', data);`);
    lines.push(`${ind(bodyIndent)}return { data, status: response.status, statusText: response.statusText };`);

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}} catch (error: any) {`);
      lines.push(`${ind(baseIndent + 1)}console.error('Request failed:', error.message || error);`);
      lines.push(`${ind(baseIndent + 1)}throw error;`);
      lines.push(`${ind(baseIndent)}}`);
    }

    if (wrapInFunction) {
      lines.push('}');
      lines.push('');
      lines.push('// Example execution:');
      lines.push('// makeRequest().then(res => console.log(res)).catch(console.error);');
    }

    return lines.join('\n');
  }

  // --- 2. TypeScript `axios` ---
  if (library === 'axios') {
    const lines: string[] = [];
    lines.push("import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';");
    lines.push('');

    if (includeTypes && typeDefinitions.length > 0) {
      lines.push(...typeDefinitions);
    }

    if (envSecretDeclaration) lines.push(envSecretDeclaration);

    const funcSig = wrapInFunction
      ? `export async function makeRequest<T = any>(): Promise<AxiosResponse<T>> {`
      : '';

    if (funcSig) lines.push(funcSig);

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}try {`);
    }

    // Config object
    lines.push(`${ind(bodyIndent)}const config: AxiosRequestConfig = {`);
    lines.push(`${ind(bodyIndent + 1)}method: '${method.toLowerCase()}',`);
    lines.push(`${ind(bodyIndent + 1)}url: '${tsEscape(url)}',`);

    if (Object.keys(req.queryParams).length > 0) {
      lines.push(`${ind(bodyIndent + 1)}params: {`);
      Object.entries(req.queryParams).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 2)}'${tsEscape(k)}': '${tsEscape(v)}',`);
      });
      lines.push(`${ind(bodyIndent + 1)}},`);
    }

    if (Object.keys(headers).length > 0) {
      lines.push(`${ind(bodyIndent + 1)}headers: {`);
      Object.entries(headers).forEach(([k, v]) => {
        lines.push(`${ind(bodyIndent + 2)}'${tsEscape(k)}': '${tsEscape(v)}',`);
      });
      lines.push(`${ind(bodyIndent + 1)}},`);
    }

    if (req.auth?.type === 'basic' && (req.auth.username || req.auth.password)) {
      lines.push(`${ind(bodyIndent + 1)}auth: {`);
      lines.push(`${ind(bodyIndent + 2)}username: '${tsEscape(req.auth.username || '')}',`);
      lines.push(`${ind(bodyIndent + 2)}password: '${tsEscape(req.auth.password || '')}',`);
      lines.push(`${ind(bodyIndent + 1)}},`);
    }

    if (req.options.timeoutSeconds) {
      lines.push(`${ind(bodyIndent + 1)}timeout: ${req.options.timeoutSeconds * 1000},`);
    }

    if (req.body) {
      if (req.body.type === 'json' && req.body.jsonData) {
        lines.push(
          `${ind(bodyIndent + 1)}data: ${JSON.stringify(req.body.jsonData, null, indentSize).replace(
            /\n/g,
            '\n' + ind(bodyIndent + 1)
          )},`
        );
      } else if (req.body.type === 'form-urlencoded' && req.body.formData) {
        lines.push(`${ind(bodyIndent + 1)}data: new URLSearchParams({`);
        Object.entries(req.body.formData).forEach(([k, v]) => {
          lines.push(`${ind(bodyIndent + 2)}'${tsEscape(k)}': '${tsEscape(String(v))}',`);
        });
        lines.push(`${ind(bodyIndent + 1)}}).toString(),`);
      } else if (req.body.rawText) {
        lines.push(`${ind(bodyIndent + 1)}data: '${tsEscape(req.body.rawText)}',`);
      }
    }

    lines.push(`${ind(bodyIndent)}};`);
    lines.push('');
    lines.push(`${ind(bodyIndent)}const response: AxiosResponse<T> = await axios(config);`);
    lines.push(`${ind(bodyIndent)}console.log('Status:', response.status);`);
    lines.push(`${ind(bodyIndent)}console.log('Data:', response.data);`);
    lines.push(`${ind(bodyIndent)}return response;`);

    if (includeErrorHandling) {
      lines.push(`${ind(baseIndent)}} catch (error: any) {`);
      lines.push(`${ind(baseIndent + 1)}if (axios.isAxiosError(error)) {`);
      lines.push(`${ind(baseIndent + 2)}console.error('Axios Error:', error.response?.status, error.response?.data);`);
      lines.push(`${ind(baseIndent + 1)}} else {`);
      lines.push(`${ind(baseIndent + 2)}console.error('Unexpected Error:', error);`);
      lines.push(`${ind(baseIndent + 1)}}`);
      lines.push(`${ind(baseIndent + 1)}throw error;`);
      lines.push(`${ind(baseIndent)}}`);
    }

    if (wrapInFunction) {
      lines.push('}');
      lines.push('');
      lines.push('// makeRequest().then(r => console.log(r.data)).catch(console.error);');
    }

    return lines.join('\n');
  }

  // --- 3. TypeScript `ky` ---
  const lines: string[] = [];
  lines.push("import ky from 'ky';");
  lines.push('');

  if (includeTypes && typeDefinitions.length > 0) {
    lines.push(...typeDefinitions);
  }

  if (wrapInFunction) {
    lines.push(`export async function makeRequest<T = any>(): Promise<T> {`);
  }

  if (includeErrorHandling) {
    lines.push(`${ind(baseIndent)}try {`);
  }

  lines.push(`${ind(bodyIndent)}const data = await ky.${method.toLowerCase()}<T>('${tsEscape(url)}', {`);

  if (Object.keys(req.queryParams).length > 0) {
    lines.push(`${ind(bodyIndent + 1)}searchParams: {`);
    Object.entries(req.queryParams).forEach(([k, v]) => {
      lines.push(`${ind(bodyIndent + 2)}'${tsEscape(k)}': '${tsEscape(v)}',`);
    });
    lines.push(`${ind(bodyIndent + 1)}},`);
  }

  if (Object.keys(headers).length > 0) {
    lines.push(`${ind(bodyIndent + 1)}headers: {`);
    Object.entries(headers).forEach(([k, v]) => {
      lines.push(`${ind(bodyIndent + 2)}'${tsEscape(k)}': '${tsEscape(v)}',`);
    });
    lines.push(`${ind(bodyIndent + 1)}},`);
  }

  if (req.body?.type === 'json' && req.body.jsonData) {
    lines.push(
      `${ind(bodyIndent + 1)}json: ${JSON.stringify(req.body.jsonData, null, indentSize).replace(
        /\n/g,
        '\n' + ind(bodyIndent + 1)
      )},`
    );
  }

  if (req.options.timeoutSeconds) {
    lines.push(`${ind(bodyIndent + 1)}timeout: ${req.options.timeoutSeconds * 1000},`);
  }

  lines.push(`${ind(bodyIndent)}}).json();`);
  lines.push('');
  lines.push(`${ind(bodyIndent)}console.log('Response:', data);`);
  lines.push(`${ind(bodyIndent)}return data;`);

  if (includeErrorHandling) {
    lines.push(`${ind(baseIndent)}} catch (error: any) {`);
    lines.push(`${ind(baseIndent + 1)}console.error('Ky HTTP Error:', error.message || error);`);
    lines.push(`${ind(baseIndent + 1)}throw error;`);
    lines.push(`${ind(baseIndent)}}`);
  }

  if (wrapInFunction) {
    lines.push('}');
  }

  return lines.join('\n');
}
