// Pure helper utilities for developer tools

export function beautifyJson(input: string, indent: number = 2): { output: string; error?: string; isValid: boolean } {
  if (!input.trim()) {
    return { output: '', isValid: false };
  }
  try {
    const parsed = JSON.parse(input);
    const output = JSON.stringify(parsed, null, indent);
    return { output, isValid: true };
  } catch (err: any) {
    return { output: input, error: err.message || 'Invalid JSON syntax', isValid: false };
  }
}

export function obfuscateCode(input: string, options: { mangleVars?: boolean; hexEncodeStrings?: boolean; compact?: boolean } = {}): {
  obfuscated: string;
  originalSize: number;
  obfuscatedSize: number;
} {
  const originalSize = new Blob([input]).size;
  if (!input.trim()) {
    return { obfuscated: '', originalSize: 0, obfuscatedSize: 0 };
  }

  let code = input;

  // Simple safe JS/TS transformation
  if (options.compact !== false) {
    // Strip single line comments and multi-line comments
    code = code.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
  }

  if (options.hexEncodeStrings) {
    // Replace simple string literals with hex escapes
    code = code.replace(/"([^"\\]*)"/g, (_, str) => {
      const hex = Array.from(str as string)
        .map((c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
      return `"${hex}"`;
    });
  }

  if (options.mangleVars) {
    // Map common variables var1, var2, etc.
    const varMap = new Map<string, string>();
    let counter = 0;
    const generateShortName = (idx: number) => '_' + String.fromCharCode(97 + (idx % 26)) + (idx > 25 ? Math.floor(idx / 26) : '');

    code = code.replace(/\b(let|const|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, kw, name) => {
      if (['window', 'document', 'console', 'return', 'if', 'else', 'for', 'while'].includes(name)) return match;
      if (!varMap.has(name)) {
        varMap.set(name, generateShortName(counter++));
      }
      return `${kw} ${varMap.get(name)}`;
    });

    varMap.forEach((shortName, origName) => {
      const regex = new RegExp(`\\b${origName}\\b`, 'g');
      code = code.replace(regex, shortName);
    });
  }

  if (options.compact !== false) {
    // Minify whitespace
    code = code
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ');
  }

  const obfuscatedSize = new Blob([code]).size;

  return {
    obfuscated: code,
    originalSize,
    obfuscatedSize,
  };
}

export function base64Encode(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)))
    );
  } catch (e) {
    return 'Error encoding to Base64';
  }
}

export function base64Decode(str: string): { decoded: string; error?: string } {
  try {
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(str.trim()), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return { decoded };
  } catch (e: any) {
    return { decoded: '', error: 'Invalid Base64 payload' };
  }
}

export interface RegexMatch {
  index: number;
  match: string;
  groups: string[];
}

export function testRegex(pattern: string, flags: string, text: string): { matches: RegexMatch[]; error?: string } {
  if (!pattern) return { matches: [] };
  try {
    const regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    const matches: RegexMatch[] = [];
    let match: RegExpExecArray | null;

    let safetyCount = 0;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        match: match[0],
        groups: match.slice(1),
      });
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      safetyCount++;
      if (safetyCount > 1000) break;
    }
    return { matches };
  } catch (err: any) {
    return { matches: [], error: err.message };
  }
}

export function decodeJwt(token: string): { header?: any; payload?: any; signature?: string; error?: string } {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { error: 'JWT must consist of 3 dot-separated parts (Header, Payload, Signature)' };
  }
  try {
    const headerStr = base64Decode(parts[0].replace(/-/g, '+').replace(/_/g, '/')).decoded;
    const payloadStr = base64Decode(parts[1].replace(/-/g, '+').replace(/_/g, '/')).decoded;

    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);

    return {
      header,
      payload,
      signature: parts[2],
    };
  } catch (e: any) {
    return { error: 'Failed to decode JWT payload: ' + e.message };
  }
}

export function convertColor(hex: string): { hex: string; rgb: string; hsl: string; cmyk: string; isValid: boolean } {
  let cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return { hex: '#' + cleanHex, rgb: 'N/A', hsl: 'N/A', cmyk: 'N/A', isValid: false };
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const rgb = `rgb(${r}, ${g}, ${b})`;

  // HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  const hsl = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

  // CMYK
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  const c = k === 1 ? 0 : (1 - rNorm - k) / (1 - k);
  const m = k === 1 ? 0 : (1 - gNorm - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - bNorm - k) / (1 - k);
  const cmyk = `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;

  return {
    hex: '#' + cleanHex.toUpperCase(),
    rgb,
    hsl,
    cmyk,
    isValid: true,
  };
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function generateHash(text: string, algo: 'SHA-256' | 'SHA-512' | 'SHA-1'): Promise<string> {
  if (!text) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algo, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `[${algo} hash simulated]`;
}

export function parseCron(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return 'Invalid cron expression (must contain 5 fields: min hour day month weekday)';
  }

  const [min, hour, day, month, weekday] = parts;
  if (min === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every minute';
  }
  if (min === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every hour, on the hour';
  }
  if (min === '0' && hour === '0' && day === '*' && month === '*' && weekday === '*') {
    return 'Every day at midnight (00:00)';
  }
  if (min.startsWith('*/')) {
    const interval = min.replace('*/', '');
    return `Every ${interval} minutes`;
  }
  return `At minute ${min}, hour ${hour}, day ${day}, month ${month}, weekday ${weekday}`;
}
