export type TargetShell = 'bash' | 'cmd' | 'powershell' | 'preserve';
export type PayloadNewlineMode = 'compact_json' | 'escape_literal' | 'space' | 'preserve';

export interface CurlFlattenerOptions {
  // Line continuation handling
  removeTrailingBackslashes: boolean;
  removeCmdCarets: boolean;
  removePowershellBackticks: boolean;

  // Whitespace handling
  collapseMultipleSpaces: boolean;
  trimLineWhitespace: boolean;
  removeEmptyLines: boolean;
  removeCarriageReturns: boolean;

  // Comments
  stripComments: boolean;

  // Payload & Newline handling inside arguments
  payloadNewlineMode: PayloadNewlineMode;
  minifyJsonPayloads: boolean;

  // Smart character & dash normalization (e.g. from docs/blogs)
  normalizeSmartQuotes: boolean;
  normalizeSmartDashes: boolean;

  // Target Shell formatting
  targetShell: TargetShell;
  ensureCurlPrefix: boolean;
}

export const defaultFlattenerOptions: CurlFlattenerOptions = {
  removeTrailingBackslashes: true,
  removeCmdCarets: true,
  removePowershellBackticks: true,
  collapseMultipleSpaces: true,
  trimLineWhitespace: true,
  removeEmptyLines: true,
  removeCarriageReturns: true,
  stripComments: true,
  payloadNewlineMode: 'compact_json',
  minifyJsonPayloads: true,
  normalizeSmartQuotes: true,
  normalizeSmartDashes: true,
  targetShell: 'bash',
  ensureCurlPrefix: true,
};

export interface FlattenStats {
  originalLines: number;
  flattenedLines: number;
  originalChars: number;
  flattenedChars: number;
  charDifference: number;
  percentReduction: number;
  backslashesRemoved: number;
  caretsRemoved: number;
  backticksRemoved: number;
  commentsStripped: number;
  jsonPayloadsMinified: number;
  detectedDialect: 'Bash / Zsh' | 'Windows CMD' | 'PowerShell' | 'Single-line';
}

export interface CurlBeautifyOptions {
  continuationChar: '\\' | '^' | '`';
  indentSize: 2 | 4 | 'tab';
  alignFlags: boolean;
  quoteType: 'preserve' | 'single' | 'double';
  breakFlags: string[];
}

export const defaultBeautifyOptions: CurlBeautifyOptions = {
  continuationChar: '\\',
  indentSize: 2,
  alignFlags: true,
  quoteType: 'preserve',
  breakFlags: [
    '-X', '--request',
    '-H', '--header',
    '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '--json',
    '-F', '--form',
    '-u', '--user',
    '-b', '--cookie',
    '-c', '--cookie-jar',
    '-o', '--output',
    '-m', '--max-time',
    '-k', '--insecure',
    '-L', '--location',
    '-s', '--silent',
    '-v', '--verbose',
    '-A', '--user-agent',
    '-e', '--referer',
    '-x', '--proxy',
    '--compressed',
    '--connect-timeout',
  ],
};

/**
 * Detect the dialect/format of input cURL command
 */
export function detectCurlDialect(input: string): 'Bash / Zsh' | 'Windows CMD' | 'PowerShell' | 'Single-line' {
  if (!input.includes('\n') && !input.includes('\r')) {
    return 'Single-line';
  }
  if (/\^[ \t]*(\r?\n|$)/.test(input) || /curl\.exe\b/i.test(input) || /""[^"]+""/.test(input)) {
    return 'Windows CMD';
  }
  if (/`[ \t]*(\r?\n|$)/.test(input)) {
    return 'PowerShell';
  }
  return 'Bash / Zsh';
}

/**
 * Normalizes smart typography characters like curly quotes and en/em dashes
 */
export function normalizeSmartChars(
  input: string,
  options: { quotes: boolean; dashes: boolean }
): string {
  let result = input;
  if (options.quotes) {
    result = result
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u00AB\u00BB]/g, '"');
  }
  if (options.dashes) {
    // Replace em-dash, en-dash, figure dash, horizontal bar
    // If it's a double dash typed as em-dash, turn into --
    result = result
      .replace(/[\u2014\u2015]/g, '--')
      .replace(/[\u2013\u2012\u2212]/g, '-');
  }
  return result;
}

/**
 * Helper to compact and minify JSON payload inside a string if it is valid JSON
 */
function tryMinifyJsonString(raw: string): { minified: string; success: boolean } {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      return { minified: JSON.stringify(parsed), success: true };
    } catch {
      // Try loose single-quote conversion
      try {
        const looseConverted = trimmed.replace(/'/g, '"');
        const parsed = JSON.parse(looseConverted);
        return { minified: JSON.stringify(parsed), success: true };
      } catch {
        // Not valid JSON
      }
    }
  }
  return { minified: raw, success: false };
}

/**
 * Core function: Flattens a multiline cURL command to a single line with rich configurable rules
 */
export function flattenCurlCommand(
  rawInput: string,
  userOptions: Partial<CurlFlattenerOptions> = {}
): { singleLine: string; stats: FlattenStats } {
  const opts: CurlFlattenerOptions = { ...defaultFlattenerOptions, ...userOptions };
  const detectedDialect = detectCurlDialect(rawInput);

  let processed = rawInput;
  let backslashesRemoved = 0;
  let caretsRemoved = 0;
  let backticksRemoved = 0;
  let commentsStripped = 0;
  let jsonPayloadsMinified = 0;

  // 1. Remove carriage returns if enabled
  if (opts.removeCarriageReturns) {
    processed = processed.replace(/\r/g, '');
  }

  // 2. Normalize smart quotes and dashes from documentation
  if (opts.normalizeSmartQuotes || opts.normalizeSmartDashes) {
    processed = normalizeSmartChars(processed, {
      quotes: opts.normalizeSmartQuotes,
      dashes: opts.normalizeSmartDashes,
    });
  }

  // 3. Strip shell comments (lines starting with # outside quotes)
  if (opts.stripComments) {
    const lines = processed.split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        commentsStripped++;
        return false;
      }
      return true;
    });
    processed = filteredLines.join('\n');
  }

  // 4. Token-aware parser state machine to accurately strip continuations and handle quotes & payloads
  let out = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inAnsiQuote = false;
  let currentQuoteContent = '';
  let currentQuoteChar: "'" | '"' | '$' | null = null;

  let i = 0;
  const len = processed.length;

  while (i < len) {
    const ch = processed[i];
    const nextCh = i + 1 < len ? processed[i + 1] : '';

    // Handle quote entries / exits
    if (!inSingleQuote && !inDoubleQuote && !inAnsiQuote) {
      if (ch === '$' && nextCh === "'") {
        inAnsiQuote = true;
        currentQuoteChar = '$';
        currentQuoteContent = '';
        out += "$'";
        i += 2;
        continue;
      } else if (ch === "'") {
        inSingleQuote = true;
        currentQuoteChar = "'";
        currentQuoteContent = '';
        i++;
        continue;
      } else if (ch === '"') {
        inDoubleQuote = true;
        currentQuoteChar = '"';
        currentQuoteContent = '';
        i++;
        continue;
      }

      // OUTSIDE of quotes: check for line continuations
      // Unix/Bash line continuation: \ followed by optional whitespace and \n
      if (opts.removeTrailingBackslashes && ch === '\\') {
        let j = i + 1;
        while (j < len && (processed[j] === ' ' || processed[j] === '\t')) {
          j++;
        }
        if (j < len && (processed[j] === '\n' || processed[j] === '\r')) {
          // Found trailing backslash before newline!
          backslashesRemoved++;
          i = j + (processed[j] === '\r' && j + 1 < len && processed[j + 1] === '\n' ? 2 : 1);
          if (opts.collapseMultipleSpaces && !out.endsWith(' ')) {
            out += ' ';
          }
          continue;
        }
      }

      // Windows CMD line continuation: ^ followed by optional whitespace and \n
      if (opts.removeCmdCarets && ch === '^') {
        let j = i + 1;
        while (j < len && (processed[j] === ' ' || processed[j] === '\t')) {
          j++;
        }
        if (j < len && (processed[j] === '\n' || processed[j] === '\r')) {
          caretsRemoved++;
          i = j + (processed[j] === '\r' && j + 1 < len && processed[j + 1] === '\n' ? 2 : 1);
          if (opts.collapseMultipleSpaces && !out.endsWith(' ')) {
            out += ' ';
          }
          continue;
        }
      }

      // PowerShell line continuation: ` followed by optional whitespace and \n
      if (opts.removePowershellBackticks && ch === '`') {
        let j = i + 1;
        while (j < len && (processed[j] === ' ' || processed[j] === '\t')) {
          j++;
        }
        if (j < len && (processed[j] === '\n' || processed[j] === '\r')) {
          backticksRemoved++;
          i = j + (processed[j] === '\r' && j + 1 < len && processed[j + 1] === '\n' ? 2 : 1);
          if (opts.collapseMultipleSpaces && !out.endsWith(' ')) {
            out += ' ';
          }
          continue;
        }
      }

      // Newlines outside quotes -> replace with single space
      if (ch === '\n' || ch === '\r') {
        if (opts.collapseMultipleSpaces) {
          if (!out.endsWith(' ')) {
            out += ' ';
          }
        } else {
          out += ' ';
        }
        i++;
        continue;
      }

      // Whitespace outside quotes
      if (ch === ' ' || ch === '\t') {
        if (opts.collapseMultipleSpaces) {
          if (!out.endsWith(' ') && out.length > 0) {
            out += ' ';
          }
        } else {
          out += ch;
        }
        i++;
        continue;
      }

      out += ch;
      i++;
    } else if (inSingleQuote) {
      // INSIDE single quote '...'
      if (ch === "'") {
        // Closing single quote
        inSingleQuote = false;
        // Process collected quote content
        let finalContent = currentQuoteContent;

        if (opts.minifyJsonPayloads) {
          const { minified, success } = tryMinifyJsonString(finalContent);
          if (success) {
            finalContent = minified;
            jsonPayloadsMinified++;
          }
        }

        if (opts.payloadNewlineMode === 'compact_json') {
          finalContent = finalContent.replace(/\r?\n\s*/g, ' ');
        } else if (opts.payloadNewlineMode === 'escape_literal') {
          finalContent = finalContent.replace(/\r?\n/g, '\\n');
        } else if (opts.payloadNewlineMode === 'space') {
          finalContent = finalContent.replace(/\r?\n/g, ' ');
        }

        out += `'${finalContent}'`;
        currentQuoteContent = '';
        currentQuoteChar = null;
        i++;
      } else {
        currentQuoteContent += ch;
        i++;
      }
    } else if (inDoubleQuote) {
      // INSIDE double quote "..."
      if (ch === '\\' && nextCh === '"') {
        currentQuoteContent += '\\"';
        i += 2;
      } else if (ch === '"') {
        // Closing double quote
        inDoubleQuote = false;
        let finalContent = currentQuoteContent;

        if (opts.minifyJsonPayloads) {
          const { minified, success } = tryMinifyJsonString(finalContent);
          if (success) {
            finalContent = minified;
            jsonPayloadsMinified++;
          }
        }

        if (opts.payloadNewlineMode === 'compact_json') {
          finalContent = finalContent.replace(/\r?\n\s*/g, ' ');
        } else if (opts.payloadNewlineMode === 'escape_literal') {
          finalContent = finalContent.replace(/\r?\n/g, '\\n');
        } else if (opts.payloadNewlineMode === 'space') {
          finalContent = finalContent.replace(/\r?\n/g, ' ');
        }

        out += `"${finalContent}"`;
        currentQuoteContent = '';
        currentQuoteChar = null;
        i++;
      } else {
        currentQuoteContent += ch;
        i++;
      }
    } else if (inAnsiQuote) {
      // INSIDE ANSI-C quote $'...'
      if (ch === '\\' && nextCh === "'") {
        currentQuoteContent += "\\'";
        i += 2;
      } else if (ch === "'") {
        inAnsiQuote = false;
        out += `${currentQuoteContent}'`;
        currentQuoteContent = '';
        currentQuoteChar = null;
        i++;
      } else {
        currentQuoteContent += ch;
        i++;
      }
    }
  }

  // If quote remained unclosed at end of input
  if (inSingleQuote || inDoubleQuote || inAnsiQuote) {
    if (inSingleQuote) out += `'${currentQuoteContent}'`;
    else if (inDoubleQuote) out += `"${currentQuoteContent}"`;
    else if (inAnsiQuote) out += `${currentQuoteContent}'`;
  }

  let finalSingleLine = out.trim();

  // 5. Target Shell Transformations if requested
  if (opts.targetShell === 'cmd') {
    // Windows CMD: Convert single quotes to escaped double quotes where needed
    finalSingleLine = convertBashToCmd(finalSingleLine);
    if (opts.ensureCurlPrefix && !finalSingleLine.toLowerCase().startsWith('curl')) {
      finalSingleLine = `curl.exe ${finalSingleLine}`;
    }
  } else if (opts.targetShell === 'powershell') {
    finalSingleLine = convertBashToPowershell(finalSingleLine);
    if (opts.ensureCurlPrefix && !finalSingleLine.toLowerCase().startsWith('curl')) {
      finalSingleLine = `curl.exe ${finalSingleLine}`;
    }
  } else if (opts.targetShell === 'bash') {
    if (opts.ensureCurlPrefix && !finalSingleLine.toLowerCase().startsWith('curl')) {
      finalSingleLine = `curl ${finalSingleLine}`;
    }
  }

  // Calculate statistics
  const originalLines = rawInput.split(/\r?\n/).length;
  const flattenedLines = finalSingleLine ? finalSingleLine.split(/\r?\n/).length : 0;
  const originalChars = rawInput.length;
  const flattenedChars = finalSingleLine.length;
  const charDifference = originalChars - flattenedChars;
  const percentReduction = originalChars > 0 ? Math.round((charDifference / originalChars) * 1000) / 10 : 0;

  const stats: FlattenStats = {
    originalLines,
    flattenedLines,
    originalChars,
    flattenedChars,
    charDifference,
    percentReduction,
    backslashesRemoved,
    caretsRemoved,
    backticksRemoved,
    commentsStripped,
    jsonPayloadsMinified,
    detectedDialect,
  };

  return { singleLine: finalSingleLine, stats };
}

/**
 * Converts single quotes to Windows CMD escaped double quotes for CLI execution
 */
function convertBashToCmd(command: string): string {
  // In CMD, single-quoted JSON or parameters '-d {"key":"val"}' should become -d "{\"key\":\"val\"}"
  let result = '';
  let inSingleQuote = false;
  let current = '';

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (ch === "'") {
      if (!inSingleQuote) {
        inSingleQuote = true;
        current = '';
      } else {
        inSingleQuote = false;
        // Escape internal double quotes for CMD
        const escaped = current.replace(/"/g, '\\"');
        result += `"${escaped}"`;
      }
    } else if (inSingleQuote) {
      current += ch;
    } else {
      result += ch;
    }
  }

  if (inSingleQuote) {
    result += `"${current.replace(/"/g, '\\"')}"`;
  }

  return result;
}

/**
 * Converts bash curl parameters for PowerShell safety
 */
function convertBashToPowershell(command: string): string {
  // In PowerShell, ensure variables like $var inside double quotes don't expand inadvertently
  let result = command;
  // If command starts with standard curl on Windows PowerShell, alias curl to curl.exe
  if (result.startsWith('curl ')) {
    result = result.replace(/^curl\s+/, 'curl.exe ');
  }
  return result;
}

/**
 * Beautifies a single-line or unformatted cURL command into aligned, readable multi-line command with line continuations
 */
export function beautifyCurlCommand(
  rawInput: string,
  userOptions: Partial<CurlBeautifyOptions> = {}
): string {
  const opts: CurlBeautifyOptions = { ...defaultBeautifyOptions, ...userOptions };
  // First flatten to obtain clean tokens
  const { singleLine } = flattenCurlCommand(rawInput, {
    removeTrailingBackslashes: true,
    removeCmdCarets: true,
    removePowershellBackticks: true,
    collapseMultipleSpaces: true,
    stripComments: true,
  });

  if (!singleLine) return '';

  const indentStr = opts.indentSize === 'tab' ? '\t' : ' '.repeat(opts.indentSize);
  const cont = opts.continuationChar;

  // Split tokens safely respecting quotes
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < singleLine.length; i++) {
    const ch = singleLine[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
    } else if (ch === '"' && !inSingle) {
      if (i > 0 && singleLine[i - 1] === '\\') {
        current += ch;
      } else {
        inDouble = !inDouble;
        current += ch;
      }
    } else if ((ch === ' ' || ch === '\t') && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }

  if (tokens.length === 0) return singleLine;

  const lines: string[] = [];
  let currentLine = tokens[0]; // e.g. "curl" or "curl.exe"

  let idx = 1;
  while (idx < tokens.length) {
    const tok = tokens[idx];
    const isBreakFlag = opts.breakFlags.includes(tok);

    if (isBreakFlag) {
      // Commit previous line with continuation
      lines.push(`${currentLine} ${cont}`);
      currentLine = `${indentStr}${tok}`;
      idx++;

      // If next token is an argument (and not another flag), attach it to this line
      if (idx < tokens.length && !tokens[idx].startsWith('-')) {
        currentLine += ` ${tokens[idx]}`;
        idx++;
      }
    } else if (tok.startsWith('http://') || tok.startsWith('https://') || tok.startsWith('"http') || tok.startsWith("'http")) {
      // Attach URL directly or on its own line
      currentLine += ` ${tok}`;
      idx++;
    } else {
      currentLine += ` ${tok}`;
      idx++;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}
