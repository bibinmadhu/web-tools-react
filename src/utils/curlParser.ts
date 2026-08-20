export interface ParsedCurlRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | string;
  url: string;
  baseUrl: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  auth?: {
    type: 'basic' | 'bearer' | 'digest' | 'custom';
    username?: string;
    password?: string;
    token?: string;
    raw?: string;
  };
  body?: {
    type: 'json' | 'form-urlencoded' | 'multipart' | 'raw' | 'graphql';
    rawText?: string;
    jsonData?: any;
    formData?: Record<string, string | { file: string; type?: string }>;
    graphql?: { query: string; variables?: any };
  };
  options: {
    insecure?: boolean;
    followRedirects?: boolean;
    timeoutSeconds?: number;
    proxy?: string;
    compressed?: boolean;
    outputFile?: string;
    userAgent?: string;
  };
  rawCommand: string;
}

/**
 * Tokenizes a bash/curl command respecting single, double quotes and escape characters
 */
export function tokenizeCurlCommand(command: string): string[] {
  const tokens: string[] = [];
  let currentToken = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inAnsiQuote = false;
  let isEscaped = false;

  // Normalize Windows line continuations and unescaped newlines
  const cleaned = command
    .replace(/\\\r?\n/g, ' ')
    .replace(/\^\r?\n/g, ' ')
    .trim();

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (isEscaped) {
      if (inDoubleQuote || inAnsiQuote) {
        // In double quotes, escape sequences like \n, \t, \", \\
        if (char === 'n') currentToken += '\n';
        else if (char === 'r') currentToken += '\r';
        else if (char === 't') currentToken += '\t';
        else currentToken += char;
      } else {
        currentToken += char;
      }
      isEscaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      isEscaped = true;
      continue;
    }

    // Check ANSI C quoting: $'...'
    if (char === '$' && nextChar === "'" && !inSingleQuote && !inDoubleQuote) {
      inAnsiQuote = true;
      i++; // skip '$'
      continue;
    }

    if (char === "'" && inAnsiQuote) {
      inAnsiQuote = false;
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inAnsiQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote && !inAnsiQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote && !inAnsiQuote) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
      continue;
    }

    currentToken += char;
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return tokens;
}

/**
 * Parses a cURL command into a structured REST request object
 */
export function parseCurlCommand(rawCommand: string): ParsedCurlRequest {
  const result: ParsedCurlRequest = {
    method: 'GET',
    url: '',
    baseUrl: '',
    queryParams: {},
    headers: {},
    cookies: {},
    options: {},
    rawCommand,
  };

  if (!rawCommand || !rawCommand.trim()) {
    return result;
  }

  const tokens = tokenizeCurlCommand(rawCommand);
  if (tokens.length === 0) return result;

  let explicitMethod: string | null = null;
  const dataPayloads: string[] = [];
  const urlEncodedData: Record<string, string> = {};
  const formData: Record<string, string | { file: string; type?: string }> = {};
  let isFormMultipart = false;
  let isGetWithData = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Skip curl command name / curl.exe
    if (i === 0 && /^curl(\.exe)?$/i.test(token)) {
      continue;
    }

    // Method: -X, --request
    if (token === '-X' || token === '--request') {
      const val = tokens[++i];
      if (val) explicitMethod = val.toUpperCase();
      continue;
    }

    // Head request: -I, --head
    if (token === '-I' || token === '--head') {
      explicitMethod = 'HEAD';
      continue;
    }

    // Force GET with data: -G, --get
    if (token === '-G' || token === '--get') {
      isGetWithData = true;
      continue;
    }

    // Headers: -H, --header
    if (token === '-H' || token === '--header') {
      const headerLine = tokens[++i];
      if (headerLine) {
        const colonIdx = headerLine.indexOf(':');
        if (colonIdx > -1) {
          const key = headerLine.slice(0, colonIdx).trim();
          const val = headerLine.slice(colonIdx + 1).trim();
          result.headers[key] = val;
        } else if (headerLine.includes(';')) {
          // Empty header value e.g. -H "X-Custom;"
          const key = headerLine.replace(';', '').trim();
          result.headers[key] = '';
        }
      }
      continue;
    }

    // User Agent: -A, --user-agent
    if (token === '-A' || token === '--user-agent') {
      const ua = tokens[++i];
      if (ua) {
        result.headers['User-Agent'] = ua;
        result.options.userAgent = ua;
      }
      continue;
    }

    // Referer: -e, --referer
    if (token === '-e' || token === '--referer') {
      const ref = tokens[++i];
      if (ref) result.headers['Referer'] = ref;
      continue;
    }

    // Cookie: -b, --cookie
    if (token === '-b' || token === '--cookie') {
      const cookieStr = tokens[++i];
      if (cookieStr) {
        result.headers['Cookie'] = cookieStr;
        cookieStr.split(';').forEach((part) => {
          const eq = part.indexOf('=');
          if (eq > -1) {
            const ck = part.slice(0, eq).trim();
            const cv = part.slice(eq + 1).trim();
            if (ck) result.cookies[ck] = cv;
          }
        });
      }
      continue;
    }

    // User Auth: -u, --user
    if (token === '-u' || token === '--user') {
      const userpass = tokens[++i];
      if (userpass) {
        const colonIdx = userpass.indexOf(':');
        if (colonIdx > -1) {
          result.auth = {
            type: 'basic',
            username: userpass.slice(0, colonIdx),
            password: userpass.slice(colonIdx + 1),
            raw: userpass,
          };
        } else {
          result.auth = {
            type: 'basic',
            username: userpass,
            password: '',
            raw: userpass,
          };
        }
      }
      continue;
    }

    // OAuth2 Bearer: --oauth2-bearer
    if (token === '--oauth2-bearer') {
      const tokenVal = tokens[++i];
      if (tokenVal) {
        result.auth = {
          type: 'bearer',
          token: tokenVal,
        };
      }
      continue;
    }

    // Digest: --digest
    if (token === '--digest') {
      if (result.auth) result.auth.type = 'digest';
      continue;
    }

    // Data flags: -d, --data, --data-raw, --data-binary, --data-ascii, --json
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      const dataVal = tokens[++i];
      if (dataVal !== undefined) {
        dataPayloads.push(dataVal);
      }
      continue;
    }

    // --json flag (sets Content-Type & Accept to application/json)
    if (token === '--json') {
      const jsonVal = tokens[++i];
      if (jsonVal !== undefined) {
        dataPayloads.push(jsonVal);
        if (!result.headers['Content-Type']) {
          result.headers['Content-Type'] = 'application/json';
        }
        if (!result.headers['Accept']) {
          result.headers['Accept'] = 'application/json';
        }
      }
      continue;
    }

    // URL-encoded data: --data-urlencode
    if (token === '--data-urlencode') {
      const val = tokens[++i];
      if (val) {
        const eqIdx = val.indexOf('=');
        if (eqIdx > -1) {
          urlEncodedData[val.slice(0, eqIdx)] = val.slice(eqIdx + 1);
        } else {
          dataPayloads.push(val);
        }
      }
      continue;
    }

    // Multipart Form: -F, --form, --form-string
    if (token === '-F' || token === '--form' || token === '--form-string') {
      isFormMultipart = true;
      const formVal = tokens[++i];
      if (formVal) {
        const eqIdx = formVal.indexOf('=');
        if (eqIdx > -1) {
          const fieldKey = formVal.slice(0, eqIdx);
          const fieldVal = formVal.slice(eqIdx + 1);

          if (fieldVal.startsWith('@')) {
            // File upload: e.g. @/path/to/file.pdf;type=application/pdf
            const typeMatch = fieldVal.match(/;type=([^;]+)/);
            const cleanPath = fieldVal.slice(1).replace(/;type=[^;]+/, '').trim();
            formData[fieldKey] = {
              file: cleanPath,
              type: typeMatch ? typeMatch[1] : undefined,
            };
          } else {
            formData[fieldKey] = fieldVal;
          }
        }
      }
      continue;
    }

    // URL Query: --url-query
    if (token === '--url-query') {
      const qVal = tokens[++i];
      if (qVal) {
        const eqIdx = qVal.indexOf('=');
        if (eqIdx > -1) {
          result.queryParams[qVal.slice(0, eqIdx)] = qVal.slice(eqIdx + 1);
        }
      }
      continue;
    }

    // Options: Follow Redirects (-L, --location)
    if (token === '-L' || token === '--location') {
      result.options.followRedirects = true;
      continue;
    }

    // Insecure SSL (-k, --insecure)
    if (token === '-k' || token === '--insecure') {
      result.options.insecure = true;
      continue;
    }

    // Compressed (--compressed)
    if (token === '--compressed') {
      result.options.compressed = true;
      continue;
    }

    // Timeout: -m, --max-time, --connect-timeout
    if (token === '-m' || token === '--max-time' || token === '--connect-timeout') {
      const sec = parseFloat(tokens[++i]);
      if (!isNaN(sec)) result.options.timeoutSeconds = sec;
      continue;
    }

    // Proxy: -x, --proxy
    if (token === '-x' || token === '--proxy') {
      const proxyVal = tokens[++i];
      if (proxyVal) result.options.proxy = proxyVal;
      continue;
    }

    // Output file: -o, --output
    if (token === '-o' || token === '--output') {
      const outVal = tokens[++i];
      if (outVal) result.options.outputFile = outVal;
      continue;
    }

    // URL flag: --url
    if (token === '--url') {
      const u = tokens[++i];
      if (u) result.url = u;
      continue;
    }

    // Any argument starting with '-' is an unhandled flag, skip value if next token isn't flag
    if (token.startsWith('-')) {
      continue;
    }

    // If it's not a flag and url isn't set, this is the URL
    if (!result.url && (token.startsWith('http://') || token.startsWith('https://') || token.includes('.') || token.startsWith('localhost') || token.startsWith('/'))) {
      result.url = token;
    }
  }

  // If no URL found yet, pick last non-flag token
  if (!result.url) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tok = tokens[i];
      if (!tok.startsWith('-') && !['curl', 'curl.exe'].includes(tok.toLowerCase())) {
        result.url = tok;
        break;
      }
    }
  }

  // Clean URL & parse search query params
  if (result.url) {
    let rawUrl = result.url;
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl;
      result.url = rawUrl;
    }

    try {
      const parsedUrl = new URL(rawUrl);
      result.baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
      parsedUrl.searchParams.forEach((val, key) => {
        result.queryParams[key] = val;
      });
    } catch {
      const qIdx = rawUrl.indexOf('?');
      if (qIdx > -1) {
        result.baseUrl = rawUrl.slice(0, qIdx);
        const search = rawUrl.slice(qIdx + 1);
        search.split('&').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k) result.queryParams[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
        });
      } else {
        result.baseUrl = rawUrl;
      }
    }
  }

  // Check Authorization Header for Bearer or Basic if not explicitly set via -u
  if (!result.auth) {
    const authHeader = Object.entries(result.headers).find(
      ([k]) => k.toLowerCase() === 'authorization'
    );
    if (authHeader) {
      const val = authHeader[1];
      if (/^bearer\s+/i.test(val)) {
        result.auth = {
          type: 'bearer',
          token: val.replace(/^bearer\s+/i, '').trim(),
        };
      } else if (/^basic\s+/i.test(val)) {
        const b64 = val.replace(/^basic\s+/i, '').trim();
        try {
          const decoded = atob(b64);
          const cIdx = decoded.indexOf(':');
          result.auth = {
            type: 'basic',
            username: cIdx > -1 ? decoded.slice(0, cIdx) : decoded,
            password: cIdx > -1 ? decoded.slice(cIdx + 1) : '',
            raw: decoded,
          };
        } catch {
          result.auth = { type: 'custom', raw: val };
        }
      } else {
        result.auth = { type: 'custom', raw: val };
      }
    }
  }

  // Determine Method
  if (explicitMethod) {
    result.method = explicitMethod;
  } else if (isGetWithData) {
    result.method = 'GET';
  } else if (dataPayloads.length > 0 || Object.keys(urlEncodedData).length > 0 || isFormMultipart) {
    result.method = 'POST';
  } else {
    result.method = 'GET';
  }

  // Body Processing
  if (isFormMultipart) {
    result.body = {
      type: 'multipart',
      formData,
    };
  } else if (Object.keys(urlEncodedData).length > 0) {
    result.body = {
      type: 'form-urlencoded',
      formData: urlEncodedData,
      rawText: Object.entries(urlEncodedData)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&'),
    };
  } else if (dataPayloads.length > 0) {
    const combinedData = dataPayloads.join('&');
    const contentType = Object.entries(result.headers).find(
      ([k]) => k.toLowerCase() === 'content-type'
    )?.[1]?.toLowerCase() || '';

    // Check if JSON
    let isJson = contentType.includes('application/json');
    let parsedJson: any = null;

    try {
      parsedJson = JSON.parse(combinedData);
      isJson = true;
    } catch {
      // Try loose JSON parsing if single quotes were used
      const trimmed = combinedData.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const converted = trimmed
            .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
            .replace(/:\s*True\b/g, ': true')
            .replace(/:\s*False\b/g, ': false')
            .replace(/:\s*None\b/g, ': null');
          parsedJson = JSON.parse(converted);
          isJson = true;
        } catch {
          // not direct JSON
        }
      }
    }

    if (isJson && parsedJson !== null) {
      // Check GraphQL
      if (typeof parsedJson === 'object' && parsedJson.query && typeof parsedJson.query === 'string') {
        result.body = {
          type: 'graphql',
          graphql: {
            query: parsedJson.query,
            variables: parsedJson.variables,
          },
          jsonData: parsedJson,
          rawText: combinedData,
        };
      } else {
        result.body = {
          type: 'json',
          jsonData: parsedJson,
          rawText: combinedData,
        };
      }
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      (!contentType && combinedData.includes('=') && !combinedData.startsWith('{'))
    ) {
      // Parse form urlencoded
      const formMap: Record<string, string> = {};
      combinedData.split('&').forEach((part) => {
        const [k, v] = part.split('=');
        if (k) {
          try {
            formMap[decodeURIComponent(k)] = v ? decodeURIComponent(v.replace(/\+/g, ' ')) : '';
          } catch {
            formMap[k] = v || '';
          }
        }
      });
      result.body = {
        type: 'form-urlencoded',
        formData: formMap,
        rawText: combinedData,
      };
    } else {
      result.body = {
        type: 'raw',
        rawText: combinedData,
      };
    }
  }

  return result;
}
