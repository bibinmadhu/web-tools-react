/**
 * Multiple JS/TS & HTML Obfuscator and De-Obfuscator Engine
 * 
 * Provides synchronized obfuscation and lossless de-obfuscation across multiple
 * pairs of TypeScript/JavaScript and HTML files.
 * Preserves structural tags, DOM fundamentals, language keywords, while mangling
 * custom identifiers, classes, element IDs, strings, and text nodes with unified mapping.
 */

export type NamingStyle = 'hex' | 'alphabetical' | 'mangled_latin' | 'base58' | 'prefixed';

export interface MultiObfuscatorOptions {
  namingStyle: NamingStyle;
  obfuscateVariables: boolean;
  obfuscateFunctions: boolean;
  obfuscateClassesAndInterfaces: boolean;
  obfuscateHtmlIds: boolean;
  obfuscateHtmlClasses: boolean;
  obfuscateStrings: boolean;
  obfuscateHtmlText: boolean;
  stripComments: boolean;
  compactWhitespace: boolean;
  injectDeadCode: boolean;
  preserveGlobals: boolean;
  customExclusions: string[]; // Identifiers/IDs/Classes to preserve
}

export interface CodeSetInput {
  id: string;
  name: string;
  scriptCode: string;
  scriptLanguage: 'typescript' | 'javascript';
  htmlCode: string;
}

export interface CodeSetOutput {
  id: string;
  name: string;
  obfuscatedScript: string;
  obfuscatedHtml: string;
  originalScriptSize: number;
  obfuscatedScriptSize: number;
  originalHtmlSize: number;
  obfuscatedHtmlSize: number;
}

export interface MultiObfuscationMapping {
  version: string;
  timestamp: string;
  namingStyle: NamingStyle;
  identifiers: Record<string, string>; // original -> obfuscated
  htmlIds: Record<string, string>;      // original -> obfuscated
  htmlClasses: Record<string, string>;  // original -> obfuscated
  strings: Record<string, string>;      // original -> obfuscated
  htmlText: Record<string, string>;     // original -> obfuscated
  reverseMapping: Record<string, string>; // obfuscated -> original
}

export interface MultiObfuscationResult {
  sets: CodeSetOutput[];
  mapping: MultiObfuscationMapping;
  stats: {
    totalIdentifiersMangled: number;
    totalIdsMangled: number;
    totalClassesMangled: number;
    totalStringsObfuscated: number;
    totalHtmlTextNodesObfuscated: number;
    totalOriginalSize: number;
    totalObfuscatedSize: number;
    compressionRatio: number;
  };
}

export const DEFAULT_MULTI_OBFUSCATOR_OPTIONS: MultiObfuscatorOptions = {
  namingStyle: 'hex',
  obfuscateVariables: true,
  obfuscateFunctions: true,
  obfuscateClassesAndInterfaces: true,
  obfuscateHtmlIds: true,
  obfuscateHtmlClasses: true,
  obfuscateStrings: true,
  obfuscateHtmlText: true,
  stripComments: true,
  compactWhitespace: false,
  injectDeadCode: false,
  preserveGlobals: true,
  customExclusions: [
    'window',
    'document',
    'console',
    'Math',
    'JSON',
    'Promise',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean',
    'Date',
    'RegExp',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval',
    'addEventListener',
    'removeEventListener',
    'dispatchEvent',
    'fetch',
    'localStorage',
    'sessionStorage',
    'navigator',
    'location',
    'history',
    'HTMLElement',
    'Element',
    'Event',
    'CustomEvent',
    'React',
    'useState',
    'useEffect',
    'useMemo',
    'useCallback',
    'useRef',
    'root',
    'app',
  ],
};

// Standard JavaScript & TypeScript language reserved keywords
const JS_TS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
  'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
  'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  'enum', 'implements', 'interface', 'let', 'package', 'private', 'protected',
  'public', 'static', 'await', 'async', 'abstract', 'as', 'any', 'boolean',
  'constructor', 'declare', 'get', 'is', 'keyof', 'module', 'namespace',
  'never', 'readonly', 'require', 'number', 'set', 'string', 'symbol', 'type',
  'from', 'of', 'undefined', 'null', 'true', 'false', 'unknown', 'void',
  'bigint', 'override', 'satisfies', 'infer', 'intrinsic', 'unique'
]);

// Standard DOM properties & methods that must not be randomly mangled unless safely contextual
const STANDARD_DOM_MEMBERS = new Set([
  'getElementById', 'getElementsByClassName', 'getElementsByTagName', 'getElementsByName',
  'querySelector', 'querySelectorAll', 'createElement', 'createTextNode', 'appendChild',
  'removeChild', 'replaceChild', 'insertBefore', 'cloneNode', 'contains', 'hasChildNodes',
  'setAttribute', 'getAttribute', 'removeAttribute', 'hasAttribute', 'getAttributeNames',
  'classList', 'add', 'remove', 'toggle', 'replace', 'className', 'id', 'innerHTML',
  'outerHTML', 'innerText', 'textContent', 'style', 'dataset', 'value', 'checked',
  'disabled', 'href', 'src', 'type', 'name', 'target', 'rel', 'title', 'alt',
  'width', 'height', 'top', 'left', 'display', 'visibility', 'opacity', 'color',
  'backgroundColor', 'fontSize', 'fontFamily', 'margin', 'padding', 'border',
  'addEventListener', 'removeEventListener', 'dispatchEvent', 'preventDefault',
  'stopPropagation', 'stopImmediatePropagation', 'target', 'currentTarget',
  'clientX', 'clientY', 'pageX', 'pageY', 'key', 'code', 'keyCode', 'which',
  'length', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'indexOf',
  'lastIndexOf', 'includes', 'forEach', 'map', 'filter', 'reduce', 'reduceRight',
  'some', 'every', 'find', 'findIndex', 'fill', 'sort', 'reverse', 'join',
  'concat', 'flat', 'flatMap', 'keys', 'values', 'entries', 'toString', 'valueOf',
  'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'split', 'replace',
  'replaceAll', 'match', 'matchAll', 'search', 'substring', 'substr', 'charAt',
  'charCodeAt', 'padStart', 'padEnd', 'startsWith', 'endsWith', 'repeat',
  'log', 'warn', 'error', 'info', 'debug', 'table', 'clear', 'time', 'timeEnd',
  'parse', 'stringify', 'then', 'catch', 'finally', 'all', 'race', 'allSettled', 'any',
  'now', 'floor', 'ceil', 'round', 'abs', 'min', 'max', 'random', 'sqrt', 'pow'
]);

// Standard HTML tags
const HTML_TAGS = new Set([
  'html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script', 'noscript',
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'video',
  'audio', 'source', 'canvas', 'svg', 'path', 'g', 'circle', 'rect', 'line',
  'polygon', 'polyline', 'text', 'button', 'input', 'textarea', 'select', 'option',
  'optgroup', 'form', 'label', 'fieldset', 'legend', 'table', 'thead', 'tbody',
  'tfoot', 'tr', 'th', 'td', 'caption', 'col', 'colgroup', 'ul', 'ol', 'li',
  'dl', 'dt', 'dd', 'header', 'nav', 'main', 'footer', 'article', 'section',
  'aside', 'figure', 'figcaption', 'blockquote', 'hr', 'br', 'b', 'strong',
  'i', 'em', 'u', 's', 'small', 'mark', 'code', 'pre', 'kbd', 'samp', 'var',
  'sub', 'sup', 'time', 'details', 'summary', 'dialog', 'iframe', 'object', 'embed'
]);

/**
 * Generates an obfuscated identifier based on the selected naming style and counter.
 */
function generateObfuscatedIdentifier(
  index: number,
  categoryPrefix: string,
  style: NamingStyle
): string {
  switch (style) {
    case 'hex': {
      const hexVal = (0x1000 + index * 17 + (categoryPrefix.charCodeAt(0) || 7)).toString(16);
      return `_0x${categoryPrefix}${hexVal}`;
    }
    case 'alphabetical': {
      let str = '';
      let n = index;
      while (n >= 0) {
        str = String.fromCharCode(97 + (n % 26)) + str;
        n = Math.floor(n / 26) - 1;
      }
      return `${categoryPrefix}_${str}`;
    }
    case 'mangled_latin': {
      const patterns = ['_0xI1l', '_0xllI', '_0x1Il', '_0xIl1', '_0xO0o', '_0xoO0', '_0x0Oo'];
      const pat = patterns[index % patterns.length];
      const suffix = (index + 1).toString(16);
      return `${pat}_${categoryPrefix}${suffix}`;
    }
    case 'base58': {
      const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let str = '';
      let n = index + 15;
      while (n > 0) {
        str = chars[n % chars.length] + str;
        n = Math.floor(n / chars.length);
      }
      return `_${categoryPrefix}${str}`;
    }
    case 'prefixed':
    default: {
      return `_${categoryPrefix}_${index + 1}`;
    }
  }
}

/**
 * Obfuscates a string literal using hex escapes or token replacement.
 */
export function obfuscateStringLiteral(str: string): string {
  if (!str) return '""';
  // Hex escape representation
  let hexResult = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128 && /[a-zA-Z0-9 _\-.,!?:;()[\]{}]/.test(str[i])) {
      hexResult += `\\x${code.toString(16).padStart(2, '0')}`;
    } else {
      hexResult += `\\u${code.toString(16).padStart(4, '0')}`;
    }
  }
  return `"${hexResult}"`;
}

/**
 * Collects custom identifiers from JS/TS code.
 */
function extractJsTsIdentifiers(code: string): {
  variables: Set<string>;
  functions: Set<string>;
  classesAndTypes: Set<string>;
  strings: Set<string>;
} {
  const variables = new Set<string>();
  const functions = new Set<string>();
  const classesAndTypes = new Set<string>();
  const strings = new Set<string>();

  // 1. Extract string literals ("...", '...', `...`)
  const stringRegex = /(["'`])((?:\\.|[^\\])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = stringRegex.exec(code)) !== null) {
    const rawVal = match[2];
    if (rawVal.trim().length > 1 && !rawVal.includes('\n')) {
      strings.add(rawVal);
    }
  }

  // 2. Extract function declarations & methods
  // function myFunc(...)
  const fnDeclRegex = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = fnDeclRegex.exec(code)) !== null) {
    functions.add(match[1]);
  }

  // const/let/var myFunc = (...) => or function(...)
  const arrowFnRegex = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;
  while ((match = arrowFnRegex.exec(code)) !== null) {
    functions.add(match[1]);
  }

  // 3. Extract Classes, Interfaces, Types
  const classTypeRegex = /\b(?:class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = classTypeRegex.exec(code)) !== null) {
    classesAndTypes.add(match[1]);
  }

  // 4. Extract Variables (const, let, var, parameter names)
  const varDeclRegex = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = varDeclRegex.exec(code)) !== null) {
    if (!functions.has(match[1])) {
      variables.add(match[1]);
    }
  }

  // Object destructuring: const { a, b, c } = ...
  const destructureRegex = /\b(?:const|let|var)\s+\{([^}]+)\}\s*=/g;
  while ((match = destructureRegex.exec(code)) !== null) {
    const inner = match[1];
    inner.split(',').forEach((part) => {
      const trimmed = part.trim().split(':')[0].trim();
      if (trimmed && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
        variables.add(trimmed);
      }
    });
  }

  return { variables, functions, classesAndTypes, strings };
}

/**
 * Extracts IDs, CSS classes, inline event callbacks, and text content from HTML markup.
 */
function extractHtmlEntities(html: string): {
  ids: Set<string>;
  classes: Set<string>;
  eventHandlers: Set<string>;
  textNodes: Set<string>;
} {
  const ids = new Set<string>();
  const classes = new Set<string>();
  const eventHandlers = new Set<string>();
  const textNodes = new Set<string>();

  // 1. Extract IDs: id="my-element" or id='my-element'
  const idRegex = /\bid=["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(html)) !== null) {
    const val = match[1].trim();
    if (val) ids.add(val);
  }

  // 2. Extract Classes: class="btn btn-primary active"
  const classRegex = /\bclass=["']([^"']+)["']/g;
  while ((match = classRegex.exec(html)) !== null) {
    const classNames = match[1].trim().split(/\s+/);
    classNames.forEach((cls) => {
      if (cls && !cls.startsWith('dark:') && !cls.startsWith('hover:') && !cls.startsWith('sm:')) {
        classes.add(cls);
      }
    });
  }

  // 3. Extract Inline Event Handlers: onclick="handleClick(event)"
  const eventRegex = /\bon[a-z]+=["']([^"']+)["']/gi;
  while ((match = eventRegex.exec(html)) !== null) {
    const code = match[1];
    const fnCallMatch = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let fnMatch: RegExpExecArray | null;
    while ((fnMatch = fnCallMatch.exec(code)) !== null) {
      eventHandlers.add(fnMatch[1]);
    }
  }

  // 4. Extract Text Content between tags: >Hello World<
  const textNodeRegex = />([^<>&]+)</g;
  while ((match = textNodeRegex.exec(html)) !== null) {
    const text = match[1].trim();
    if (text && text.length > 1 && !/^\d+$/.test(text) && !/^[.\-_:/]+$/.test(text)) {
      textNodes.add(text);
    }
  }

  return { ids, classes, eventHandlers, textNodes };
}

/**
 * Main Obfuscation Orchestrator for 2+ Sets of JS/TS & HTML.
 */
export function obfuscateMultipleSets(
  sets: CodeSetInput[],
  userOptions: Partial<MultiObfuscatorOptions> = {}
): MultiObfuscationResult {
  const options: MultiObfuscatorOptions = {
    ...DEFAULT_MULTI_OBFUSCATOR_OPTIONS,
    ...userOptions,
  };

  const exclusionSet = new Set(options.customExclusions.map((e) => e.trim()));

  // Unified symbol registries
  const identifiersMap: Record<string, string> = {};
  const htmlIdsMap: Record<string, string> = {};
  const htmlClassesMap: Record<string, string> = {};
  const stringsMap: Record<string, string> = {};
  const htmlTextMap: Record<string, string> = {};
  const reverseMapping: Record<string, string> = {};

  let identCounter = 0;
  let idCounter = 0;
  let classCounter = 0;
  let stringCounter = 0;
  let textCounter = 0;

  // Pass 1: Discover all symbols across all sets to maintain synchronous cross-references
  const allScriptVars = new Set<string>();
  const allScriptFns = new Set<string>();
  const allScriptClasses = new Set<string>();
  const allScriptStrings = new Set<string>();

  const allHtmlIds = new Set<string>();
  const allHtmlClasses = new Set<string>();
  const allHtmlEvents = new Set<string>();
  const allHtmlTexts = new Set<string>();

  sets.forEach((set) => {
    const scriptEntities = extractJsTsIdentifiers(set.scriptCode);
    scriptEntities.variables.forEach((v) => allScriptVars.add(v));
    scriptEntities.functions.forEach((f) => allScriptFns.add(f));
    scriptEntities.classesAndTypes.forEach((c) => allScriptClasses.add(c));
    scriptEntities.strings.forEach((s) => allScriptStrings.add(s));

    const htmlEntities = extractHtmlEntities(set.htmlCode);
    htmlEntities.ids.forEach((i) => allHtmlIds.add(i));
    htmlEntities.classes.forEach((c) => allHtmlClasses.add(c));
    htmlEntities.eventHandlers.forEach((e) => allHtmlEvents.add(e));
    htmlEntities.textNodes.forEach((t) => allHtmlTexts.add(t));
  });

  // Pass 2: Assign Mappings for HTML IDs
  if (options.obfuscateHtmlIds) {
    allHtmlIds.forEach((id) => {
      if (!exclusionSet.has(id) && !htmlIdsMap[id]) {
        const obf = generateObfuscatedIdentifier(idCounter++, 'id', options.namingStyle);
        htmlIdsMap[id] = obf;
        reverseMapping[obf] = id;
      }
    });
  }

  // Pass 3: Assign Mappings for HTML CSS Classes
  if (options.obfuscateHtmlClasses) {
    allHtmlClasses.forEach((cls) => {
      if (!exclusionSet.has(cls) && !htmlClassesMap[cls]) {
        const obf = generateObfuscatedIdentifier(classCounter++, 'cls', options.namingStyle);
        htmlClassesMap[cls] = obf;
        reverseMapping[obf] = cls;
      }
    });
  }

  // Pass 4: Assign Mappings for JS/TS Functions & Event Handlers
  if (options.obfuscateFunctions) {
    const allFunctions = new Set([...allScriptFns, ...allHtmlEvents]);
    allFunctions.forEach((fn) => {
      if (
        !JS_TS_KEYWORDS.has(fn) &&
        !STANDARD_DOM_MEMBERS.has(fn) &&
        !HTML_TAGS.has(fn) &&
        !exclusionSet.has(fn) &&
        !identifiersMap[fn]
      ) {
        const obf = generateObfuscatedIdentifier(identCounter++, 'fn', options.namingStyle);
        identifiersMap[fn] = obf;
        reverseMapping[obf] = fn;
      }
    });
  }

  // Pass 5: Assign Mappings for JS/TS Classes, Interfaces, Types
  if (options.obfuscateClassesAndInterfaces) {
    allScriptClasses.forEach((cls) => {
      if (
        !JS_TS_KEYWORDS.has(cls) &&
        !STANDARD_DOM_MEMBERS.has(cls) &&
        !exclusionSet.has(cls) &&
        !identifiersMap[cls]
      ) {
        const obf = generateObfuscatedIdentifier(identCounter++, 'Cls', options.namingStyle);
        identifiersMap[cls] = obf;
        reverseMapping[obf] = cls;
      }
    });
  }

  // Pass 6: Assign Mappings for JS/TS Variables & Parameters
  if (options.obfuscateVariables) {
    allScriptVars.forEach((v) => {
      if (
        !JS_TS_KEYWORDS.has(v) &&
        !STANDARD_DOM_MEMBERS.has(v) &&
        !HTML_TAGS.has(v) &&
        !exclusionSet.has(v) &&
        !identifiersMap[v]
      ) {
        const obf = generateObfuscatedIdentifier(identCounter++, 'v', options.namingStyle);
        identifiersMap[v] = obf;
        reverseMapping[obf] = v;
      }
    });
  }

  // Pass 7: Assign Mappings for Strings
  if (options.obfuscateStrings) {
    allScriptStrings.forEach((str) => {
      // Don't obfuscate IDs or Classes if they are strings in JS (e.g. getElementById('btn-1'))
      if (!htmlIdsMap[str] && !htmlClassesMap[str] && !stringsMap[str] && str.length > 1) {
        const obf = generateObfuscatedIdentifier(stringCounter++, 's', options.namingStyle);
        stringsMap[str] = obf;
        reverseMapping[obf] = str;
      }
    });
  }

  // Pass 8: Assign Mappings for HTML Text Nodes
  if (options.obfuscateHtmlText) {
    allHtmlTexts.forEach((text) => {
      if (!htmlTextMap[text]) {
        const obf = generateObfuscatedIdentifier(textCounter++, 'txt', options.namingStyle);
        htmlTextMap[text] = obf;
        reverseMapping[obf] = text;
      }
    });
  }

  // Pass 9: Apply Transform to each Set
  const outputs: CodeSetOutput[] = sets.map((set) => {
    let script = set.scriptCode;
    let html = set.htmlCode;

    const originalScriptSize = script.length;
    const originalHtmlSize = html.length;

    // --- SCRIPT TRANSFORM ---
    // 1. Strip Comments if enabled
    if (options.stripComments) {
      script = script.replace(/\/\*[\s\S]*?\*\//g, '');
      script = script.replace(/(?<!:)\/\/.*/g, '');
    }

    // 2. Replace HTML IDs and Classes referenced in script (getElementById("my-id"), querySelector("#my-id"), classList.add("my-class"))
    Object.entries(htmlIdsMap).forEach(([origId, obfId]) => {
      // Match "origId", 'origId', `origId`, #origId
      const idStrRegex = new RegExp(`(["'\`])(#?)${escapeRegex(origId)}\\1`, 'g');
      script = script.replace(idStrRegex, `$1$2${obfId}$1`);
    });

    Object.entries(htmlClassesMap).forEach(([origCls, obfCls]) => {
      // Match "origCls", 'origCls', `origCls`, .origCls
      const clsStrRegex = new RegExp(`(["'\`])(\\.?)${escapeRegex(origCls)}\\1`, 'g');
      script = script.replace(clsStrRegex, `$1$2${obfCls}$1`);
    });

    // 3. Replace Identifiers (Variables, Functions, Classes)
    // Sort identifiers by length descending to prevent sub-string collision
    const sortedIdentifiers = Object.entries(identifiersMap).sort(
      (a, b) => b[0].length - a[0].length
    );

    sortedIdentifiers.forEach(([orig, obf]) => {
      const identRegex = new RegExp(`\\b${escapeRegex(orig)}\\b`, 'g');
      script = script.replace(identRegex, obf);
    });

    // 4. Replace Strings in Script if enabled
    if (options.obfuscateStrings) {
      Object.entries(stringsMap).forEach(([origStr, obfToken]) => {
        const escaped = escapeRegex(origStr);
        const strRegex = new RegExp(`(["'\`])${escaped}\\1`, 'g');
        script = script.replace(strRegex, `"${obfToken}"`);
      });
    }

    // 5. Dead code injection
    if (options.injectDeadCode) {
      const dummyCode = `\n/* Anti-Tamper & Scope Integrity Check */\n(function(){const _0xd_check=function(){try{return !window.__OBF_MUTATED__;}catch(_e){return true;}};if(!_0xd_check())return;})();\n`;
      script = dummyCode + script;
    }

    // 6. Compact Whitespace if enabled
    if (options.compactWhitespace) {
      script = script.replace(/\s+/g, ' ').trim();
    }

    // --- HTML TRANSFORM ---
    // 1. Strip HTML comments
    if (options.stripComments) {
      html = html.replace(/<!--[\s\S]*?-->/g, '');
    }

    // 2. Replace IDs in HTML: id="origId"
    Object.entries(htmlIdsMap).forEach(([origId, obfId]) => {
      const idAttrRegex = new RegExp(`(\\bid=["'])${escapeRegex(origId)}(["'])`, 'g');
      html = html.replace(idAttrRegex, `$1${obfId}$2`);
    });

    // 3. Replace Classes in HTML: class="cls1 cls2"
    Object.entries(htmlClassesMap).forEach(([origCls, obfCls]) => {
      const classAttrRegex = new RegExp(`(\\bclass=["'][^"']*?)\\b${escapeRegex(origCls)}\\b([^"']*?["'])`, 'g');
      html = html.replace(classAttrRegex, `$1${obfCls}$2`);
    });

    // 4. Replace Function calls in inline event handlers: onclick="myFn(event)"
    sortedIdentifiers.forEach(([origFn, obfFn]) => {
      const inlineEventRegex = new RegExp(`(\\bon[a-z]+=["'][^"']*?)\\b${escapeRegex(origFn)}\\b([^"']*?["'])`, 'gi');
      html = html.replace(inlineEventRegex, `$1${obfFn}$2`);
    });

    // 5. Replace Text Content in HTML: >Original Text<
    if (options.obfuscateHtmlText) {
      Object.entries(htmlTextMap).forEach(([origText, obfText]) => {
        const textRegex = new RegExp(`(>\\s*)${escapeRegex(origText)}(\\s*<)`, 'g');
        html = html.replace(textRegex, `$1${obfText}$2`);
      });
    }

    // 6. Compact Whitespace if enabled
    if (options.compactWhitespace) {
      html = html.replace(/>\s+</g, '><').trim();
    }

    return {
      id: set.id,
      name: set.name,
      obfuscatedScript: script,
      obfuscatedHtml: html,
      originalScriptSize,
      obfuscatedScriptSize: script.length,
      originalHtmlSize,
      obfuscatedHtmlSize: html.length,
    };
  });

  const totalOriginal = outputs.reduce((sum, o) => sum + o.originalScriptSize + o.originalHtmlSize, 0);
  const totalObfuscated = outputs.reduce((sum, o) => sum + o.obfuscatedScriptSize + o.obfuscatedHtmlSize, 0);

  const mapping: MultiObfuscationMapping = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    namingStyle: options.namingStyle,
    identifiers: identifiersMap,
    htmlIds: htmlIdsMap,
    htmlClasses: htmlClassesMap,
    strings: stringsMap,
    htmlText: htmlTextMap,
    reverseMapping,
  };

  return {
    sets: outputs,
    mapping,
    stats: {
      totalIdentifiersMangled: Object.keys(identifiersMap).length,
      totalIdsMangled: Object.keys(htmlIdsMap).length,
      totalClassesMangled: Object.keys(htmlClassesMap).length,
      totalStringsObfuscated: Object.keys(stringsMap).length,
      totalHtmlTextNodesObfuscated: Object.keys(htmlTextMap).length,
      totalOriginalSize: totalOriginal,
      totalObfuscatedSize: totalObfuscated,
      compressionRatio: totalOriginal > 0 ? Math.round((totalObfuscated / totalOriginal) * 100) / 100 : 1,
    },
  };
}

/**
 * Lossless De-Obfuscation Engine
 * Restores original code from obfuscated code using the stored mapping.
 */
export function deobfuscateCode(
  obfuscatedCode: string,
  mapping: MultiObfuscationMapping | Record<string, string>
): string {
  if (!obfuscatedCode) return '';

  let reverseMap: Record<string, string> = {};

  if (typeof mapping === 'object' && mapping !== null && 'reverseMapping' in mapping && (mapping as MultiObfuscationMapping).reverseMapping) {
    reverseMap = (mapping as MultiObfuscationMapping).reverseMapping;
  } else if (typeof mapping === 'object' && mapping !== null && 'identifiers' in mapping) {
    // Rebuild reverse map from sub-maps
    const fullMapping = mapping as MultiObfuscationMapping;
    Object.entries(fullMapping.identifiers || {}).forEach(([k, v]) => (reverseMap[v] = k));
    Object.entries(fullMapping.htmlIds || {}).forEach(([k, v]) => (reverseMap[v] = k));
    Object.entries(fullMapping.htmlClasses || {}).forEach(([k, v]) => (reverseMap[v] = k));
    Object.entries(fullMapping.strings || {}).forEach(([k, v]) => (reverseMap[v] = k));
    Object.entries(fullMapping.htmlText || {}).forEach(([k, v]) => (reverseMap[v] = k));
  } else if (typeof mapping === 'object' && mapping !== null) {
    // Flat map: obfuscated -> original
    reverseMap = mapping as Record<string, string>;
  }

  let restored = obfuscatedCode;

  // Remove any injected anti-tamper boilerplate
  restored = restored.replace(/\/\* Anti-Tamper & Scope Integrity Check \*\/[\s\S]*?\}\)\(\);\n*/g, '');

  // Sort obfuscated keys by length descending to prevent sub-string collision
  const sortedTokens = Object.entries(reverseMap).sort((a, b) => b[0].length - a[0].length);

  for (const [obfToken, originalVal] of sortedTokens) {
    // 1. Text node / string substitution: ">_0xtxt_1<" or "_0xs_1"
    const isSpecialToken = obfToken.startsWith('_0x') || obfToken.startsWith('_');
    if (isSpecialToken) {
      const tokenRegex = new RegExp(`\\b${escapeRegex(obfToken)}\\b`, 'g');
      restored = restored.replace(tokenRegex, originalVal);
    } else {
      const genericRegex = new RegExp(escapeRegex(obfToken), 'g');
      restored = restored.replace(genericRegex, originalVal);
    }
  }

  return restored;
}

/**
 * De-obfuscates an entire multi-set batch.
 */
export function deobfuscateMultipleSets(
  obfuscatedSets: { id: string; name: string; scriptCode: string; htmlCode: string }[],
  mapping: MultiObfuscationMapping
): { id: string; name: string; restoredScript: string; restoredHtml: string }[] {
  return obfuscatedSets.map((s) => ({
    id: s.id,
    name: s.name,
    restoredScript: deobfuscateCode(s.scriptCode, mapping),
    restoredHtml: deobfuscateCode(s.htmlCode, mapping),
  }));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
