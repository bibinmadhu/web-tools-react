// Java Code Obfuscator & De-Obfuscator Engine

export interface ObfuscatorOptions {
  namingStyle: 'alphabetical' | 'hexadecimal' | 'customPrefix' | 'numeric';
  customClassPrefix?: string;
  customVarPrefix?: string;
  customMethodPrefix?: string;
  obfuscateClasses: boolean;
  obfuscateVariables: boolean;
  obfuscateMethods: boolean;
  obfuscatePackages: boolean;
  encryptStrings: boolean;
  stripComments: boolean;
  preserveMain: boolean;
  preserveGettersSetters: boolean;
  preserveAnnotated: boolean;
  excludedPackages: string[];
  customExclusions: string[];
}

export interface JavaObfuscationMapping {
  classes: Record<string, string>; // Original -> Obfuscated
  variables: Record<string, string>;
  methods: Record<string, string>;
  packages: Record<string, string>;
  reverseMapping: Record<string, string>; // Obfuscated -> Original
}

export interface JavaObfuscationResult {
  obfuscatedCode: string;
  mapping: JavaObfuscationMapping;
  stats: {
    originalSize: number;
    obfuscatedSize: number;
    classesRenamed: number;
    variablesRenamed: number;
    methodsRenamed: number;
    packagesRenamed: number;
  };
}

export const DEFAULT_EXCLUDED_PACKAGES = [
  'java.',
  'javax.',
  'jakarta.',
  'org.springframework.',
  'android.',
  'androidx.',
  'org.junit.',
  'com.fasterxml.jackson.',
  'org.slf4j.',
  'com.google.',
  'org.apache.',
  'lombok.',
];

export const DEFAULT_JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'record', 'sealed', 'non-sealed', 'permits', 'var', 'yield', 'true',
  'false', 'null', 'String', 'Object', 'Integer', 'Long', 'Boolean', 'Double', 'Float', 'Byte',
  'Short', 'Character', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Collection',
  'Arrays', 'Collections', 'Optional', 'Stream', 'System', 'Math', 'Exception', 'RuntimeException',
  'Throwable', 'Override', 'Deprecated', 'SuppressWarnings', 'main', 'args', 'toString', 'equals',
  'hashCode', 'clone', 'getClass', 'notify', 'notifyAll', 'wait'
]);

// Helper to generate obfuscated names
function generateName(
  idx: number,
  category: 'class' | 'variable' | 'method' | 'package',
  style: ObfuscatorOptions['namingStyle'],
  customPrefix?: string
): string {
  if (style === 'customPrefix') {
    const prefix = customPrefix || (category === 'class' ? 'Cls' : category === 'method' ? 'mth' : category === 'package' ? 'pkg' : 'var');
    return `${prefix}_${idx + 1}`;
  }

  if (style === 'hexadecimal') {
    return `_0x${(idx + 1).toString(16)}`;
  }

  if (style === 'numeric') {
    return `v${idx + 1}`;
  }

  // Default: Alphabetical (A, B, C... for classes; a, b, c... for vars/methods)
  if (category === 'class') {
    let name = '';
    let n = idx;
    while (n >= 0) {
      name = String.fromCharCode(65 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    }
    return name;
  } else {
    let name = '';
    let n = idx;
    while (n >= 0) {
      name = String.fromCharCode(97 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    }
    return name;
  }
}

export function obfuscateJavaCode(
  input: string,
  options: Partial<ObfuscatorOptions> = {},
  existingMapping?: JavaObfuscationMapping
): JavaObfuscationResult {
  const opts: ObfuscatorOptions = {
    namingStyle: options.namingStyle || 'alphabetical',
    customClassPrefix: options.customClassPrefix || 'Cls',
    customVarPrefix: options.customVarPrefix || 'v',
    customMethodPrefix: options.customMethodPrefix || 'm',
    obfuscateClasses: options.obfuscateClasses !== false,
    obfuscateVariables: options.obfuscateVariables !== false,
    obfuscateMethods: options.obfuscateMethods !== false,
    obfuscatePackages: options.obfuscatePackages !== false,
    encryptStrings: Boolean(options.encryptStrings),
    stripComments: options.stripComments !== false,
    preserveMain: options.preserveMain !== false,
    preserveGettersSetters: options.preserveGettersSetters !== false,
    preserveAnnotated: options.preserveAnnotated !== false,
    excludedPackages: options.excludedPackages || DEFAULT_EXCLUDED_PACKAGES,
    customExclusions: options.customExclusions || [],
  };

  const originalSize = new Blob([input]).size;
  if (!input.trim()) {
    return {
      obfuscatedCode: '',
      mapping: { classes: {}, variables: {}, methods: {}, packages: {}, reverseMapping: {} },
      stats: {
        originalSize: 0,
        obfuscatedSize: 0,
        classesRenamed: 0,
        variablesRenamed: 0,
        methodsRenamed: 0,
        packagesRenamed: 0,
      },
    };
  }

  let code = input;

  // 1. Strip comments if configured
  if (opts.stripComments) {
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    code = code.replace(/\/\/.*$/gm, '');
  }

  // Mask string literals to prevent token replacement inside strings
  const stringLiterals: string[] = [];
  const stringPlaceholderPrefix = '___STR_PLACEHOLDER_';
  code = code.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    const placeholder = `${stringPlaceholderPrefix}${stringLiterals.length}___`;
    stringLiterals.push(match);
    return placeholder;
  });

  const exclusionSet = new Set([
    ...DEFAULT_JAVA_KEYWORDS,
    ...(opts.customExclusions || []),
  ]);

  const mapping: JavaObfuscationMapping = existingMapping
    ? { ...existingMapping, reverseMapping: { ...existingMapping.reverseMapping } }
    : { classes: {}, variables: {}, methods: {}, packages: {}, reverseMapping: {} };

  let classCount = Object.keys(mapping.classes).length;
  let varCount = Object.keys(mapping.variables).length;
  let methodCount = Object.keys(mapping.methods).length;
  let pkgCount = Object.keys(mapping.packages).length;

  // 2. Package Obfuscation
  if (opts.obfuscatePackages) {
    code = code.replace(/(package\s+)([\w.]+)(;)/g, (match, prefix, pkgName, suffix) => {
      const isExcluded = opts.excludedPackages.some((p) => pkgName.startsWith(p));
      if (isExcluded) return match;

      const parts = pkgName.split('.');
      const obfuscatedParts = parts.map((part: string) => {
        if (exclusionSet.has(part)) return part;
        if (!mapping.packages[part]) {
          const newPkg = generateName(pkgCount++, 'package', opts.namingStyle, opts.customVarPrefix);
          mapping.packages[part] = newPkg;
          mapping.reverseMapping[newPkg] = part;
        }
        return mapping.packages[part];
      });

      return `${prefix}${obfuscatedParts.join('.')}${suffix}`;
    });
  }

  // 3. Class/Interface/Enum/Record Obfuscation
  if (opts.obfuscateClasses) {
    const classRegex = /\b(class|interface|enum|record)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let match: RegExpExecArray | null;
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[2];
      if (!exclusionSet.has(className) && !mapping.classes[className]) {
        const newClass = generateName(classCount++, 'class', opts.namingStyle, opts.customClassPrefix);
        mapping.classes[className] = newClass;
        mapping.reverseMapping[newClass] = className;
      }
    }
  }

  // 4. Method Obfuscation
  if (opts.obfuscateMethods) {
    // Collect annotated lines if preserveAnnotated is set
    const annotatedLines = new Set<number>();
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
      if (/@(Override|Test|GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping|Autowired|JsonProperty|Value|Column|Id|NotNull|NotBlank)/.test(line)) {
        annotatedLines.add(idx + 1); // target next line
      }
    });

    // Match method declarations: [modifiers] [ReturnType] methodName([params])
    const methodRegex = /\b(public|protected|private|static|final|synchronized|native|\s)+[\w<>\[\]]+\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(code)) !== null) {
      const methodName = match[2];

      // Check if preserved
      if (exclusionSet.has(methodName)) continue;
      if (opts.preserveMain && methodName === 'main') continue;
      if (opts.preserveGettersSetters && /^(get|set|is)[A-Z]/.test(methodName)) continue;

      // Check line index for annotations
      const lineNum = code.substring(0, match.index).split('\n').length;
      if (opts.preserveAnnotated && (annotatedLines.has(lineNum) || annotatedLines.has(lineNum - 1))) {
        continue;
      }

      if (!mapping.methods[methodName]) {
        const newMethod = generateName(methodCount++, 'method', opts.namingStyle, opts.customMethodPrefix);
        mapping.methods[methodName] = newMethod;
        mapping.reverseMapping[newMethod] = methodName;
      }
    }
  }

  // 5. Variable Obfuscation (fields, local variables, parameters)
  if (opts.obfuscateVariables) {
    // Match declarations like: Type varName = or Type varName; or (Type varName, Type var2)
    const varRegex = /\b([A-Z][A-Za-z0-9_<>,]*|int|long|boolean|double|float|char|byte|short|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([=;,)]|\b)/g;
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(code)) !== null) {
      const varName = match[2];
      if (!exclusionSet.has(varName) && !mapping.methods[varName] && !mapping.classes[varName]) {
        if (!mapping.variables[varName]) {
          const newVar = generateName(varCount++, 'variable', opts.namingStyle, opts.customVarPrefix);
          mapping.variables[varName] = newVar;
          mapping.reverseMapping[newVar] = varName;
        }
      }
    }
  }

  // 6. Apply Replacements to Code
  // Replace Classes first
  Object.entries(mapping.classes).forEach(([orig, obfuscated]) => {
    const regex = new RegExp(`\\b${orig}\\b`, 'g');
    code = code.replace(regex, obfuscated);
  });

  // Replace Methods
  Object.entries(mapping.methods).forEach(([orig, obfuscated]) => {
    const regex = new RegExp(`\\b${orig}\\b`, 'g');
    code = code.replace(regex, obfuscated);
  });

  // Replace Variables
  Object.entries(mapping.variables).forEach(([orig, obfuscated]) => {
    const regex = new RegExp(`\\b${orig}\\b`, 'g');
    code = code.replace(regex, obfuscated);
  });

  // Replace Packages inside imports/qualified names
  if (opts.obfuscatePackages) {
    Object.entries(mapping.packages).forEach(([orig, obfuscated]) => {
      const regex = new RegExp(`\\b${orig}\\b`, 'g');
      code = code.replace(regex, obfuscated);
    });
  }

  // 7. Unmask / Encrypt String Literals
  stringLiterals.forEach((literal, idx) => {
    const placeholder = `${stringPlaceholderPrefix}${idx}___`;
    if (opts.encryptStrings) {
      const rawString = literal.substring(1, literal.length - 1);
      const b64 = btoa(rawString);
      const encryptedExpr = `new String(java.util.Base64.getDecoder().decode("${b64}"))`;
      code = code.replace(placeholder, encryptedExpr);
    } else {
      code = code.replace(placeholder, literal);
    }
  });

  const obfuscatedSize = new Blob([code]).size;

  return {
    obfuscatedCode: code,
    mapping,
    stats: {
      originalSize,
      obfuscatedSize,
      classesRenamed: Object.keys(mapping.classes).length,
      variablesRenamed: Object.keys(mapping.variables).length,
      methodsRenamed: Object.keys(mapping.methods).length,
      packagesRenamed: Object.keys(mapping.packages).length,
    },
  };
}

export function deobfuscateJavaCode(
  inputCode: string,
  mapping: JavaObfuscationMapping | Record<string, string>
): string {
  if (!inputCode.trim()) return '';

  let reverseMap: Record<string, string> = {};

  if ('reverseMapping' in mapping && mapping.reverseMapping) {
    reverseMap = mapping.reverseMapping as Record<string, string>;
  } else {
    // Build reverse mapping from dictionary if flat or nested
    const flatMap = mapping as any;
    if (flatMap.classes || flatMap.variables || flatMap.methods || flatMap.packages) {
      const allMaps = [
        flatMap.classes || {},
        flatMap.variables || {},
        flatMap.methods || {},
        flatMap.packages || {},
      ];
      allMaps.forEach((map) => {
        Object.entries(map).forEach(([orig, obf]) => {
          reverseMap[obf as string] = orig;
        });
      });
    } else {
      // It's a simple key-value where key is obfuscated or original
      Object.entries(flatMap).forEach(([k, v]) => {
        reverseMap[k] = v as string;
      });
    }
  }

  let code = inputCode;

  // Sort obfuscated keys by length descending so longer tokens get replaced first
  const keys = Object.keys(reverseMap).sort((a, b) => b.length - a.length);

  keys.forEach((obfKey) => {
    const origValue = reverseMap[obfKey];
    if (origValue) {
      const regex = new RegExp(`\\b${obfKey}\\b`, 'g');
      code = code.replace(regex, origValue);
    }
  });

  return code;
}
