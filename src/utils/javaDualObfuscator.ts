// Java Class & Test Dual-File Obfuscator and De-Obfuscator Engine
import {
  JavaObfuscationMapping,
  ObfuscatorOptions,
  DEFAULT_EXCLUDED_PACKAGES,
  DEFAULT_JAVA_KEYWORDS,
  deobfuscateJavaCode,
} from './javaObfuscator';
import { formatJavaCode } from './javaFormatter';

export interface DualJavaFile {
  fileName: string;
  code: string;
}

export interface DualJavaFilesInput {
  mainClassFile: DualJavaFile;
  testClassFile: DualJavaFile;
}

export interface DualJavaObfuscatorOptions extends ObfuscatorOptions {
  preserveTestMethods: boolean;
  preserveAssertionCalls: boolean;
  syncClassFileNames: boolean;
  preserveFormatting: boolean;
  autoFormatOutput: boolean;
}

export const DEFAULT_DUAL_OBFUSCATOR_OPTIONS: DualJavaObfuscatorOptions = {
  namingStyle: 'alphabetical',
  customClassPrefix: 'Cls',
  customVarPrefix: 'v',
  customMethodPrefix: 'mth',
  obfuscateClasses: true,
  obfuscateVariables: true,
  obfuscateMethods: true,
  obfuscatePackages: true,
  encryptStrings: false,
  stripComments: false, // Default false to keep comments & documentation formatting intact
  preserveMain: true,
  preserveGettersSetters: true,
  preserveAnnotated: true,
  preserveTestMethods: true,
  preserveAssertionCalls: true,
  syncClassFileNames: true,
  preserveFormatting: true,
  autoFormatOutput: false,
  excludedPackages: [...DEFAULT_EXCLUDED_PACKAGES],
  customExclusions: ['toString', 'equals', 'hashCode'],
};

// Additional testing framework reserved keywords, assertions, and mock helpers
export const TESTING_FRAMEWORK_KEYWORDS = new Set([
  // JUnit 4 & 5 Annotations
  'Test', 'BeforeEach', 'AfterEach', 'BeforeAll', 'AfterAll', 'DisplayName',
  'Disabled', 'Nested', 'Tag', 'Timeout', 'ExtendWith', 'ParameterizedTest',
  'ValueSource', 'CsvSource', 'MethodSource', 'EnumSource', 'NullSource',
  'EmptySource', 'NullAndEmptySource', 'TempDir', 'RepeatedTest', 'TestFactory',
  'Before', 'After', 'BeforeClass', 'AfterClass', 'Ignore', 'Rule', 'ClassRule',
  'RunWith',
  // Mocking Annotations & Classes
  'Mock', 'InjectMocks', 'Spy', 'Captor', 'MockBean', 'SpyBean', 'MockitoExtension',
  'SpringExtension', 'Mockito', 'ArgumentCaptor', 'InOrder',
  // Common Assertions (JUnit / AssertJ / TestNG)
  'assertEquals', 'assertNotEquals', 'assertTrue', 'assertFalse', 'assertNull',
  'assertNotNull', 'assertSame', 'assertNotSame', 'assertArrayEquals',
  'assertIterableEquals', 'assertLinesMatch', 'assertThrows', 'assertThrowsExactly',
  'assertDoesNotThrow', 'assertTimeout', 'assertTimeoutPreemptively', 'assertAll',
  'fail', 'assertThat', 'describedAs', 'isEqualTo', 'isNotEqualTo', 'isTrue',
  'isFalse', 'hasSize', 'contains', 'containsExactly', 'isEmpty', 'isNotEmpty',
  'matches',
  // Mockito BDD / Standard Mock Verifications
  'when', 'verify', 'verifyNoInteractions', 'verifyNoMoreInteractions', 'doReturn',
  'doThrow', 'doNothing', 'doAnswer', 'any', 'anyString', 'anyInt', 'anyLong',
  'anyDouble', 'anyBoolean', 'anyList', 'anySet', 'anyMap', 'eq', 'same',
  'isA', 'argThat', 'mock', 'spy', 'times', 'never', 'atLeastOnce', 'atLeast',
  'atMost', 'inOrder', 'reset', 'given', 'then', 'willReturn', 'willThrow'
]);

export interface DualJavaObfuscationResult {
  mainClassFile: {
    fileName: string;
    obfuscatedCode: string;
    originalName: string;
    obfuscatedClassName: string;
  };
  testClassFile: {
    fileName: string;
    obfuscatedCode: string;
    originalName: string;
    obfuscatedClassName: string;
  };
  mapping: JavaObfuscationMapping;
  sharedIdentifiers: {
    classes: string[];
    methods: string[];
    variables: string[];
    packages: string[];
  };
  stats: {
    mainOriginalSize: number;
    mainObfuscatedSize: number;
    testOriginalSize: number;
    testObfuscatedSize: number;
    totalOriginalSize: number;
    totalObfuscatedSize: number;
    totalClassesRenamed: number;
    totalMethodsRenamed: number;
    totalVariablesRenamed: number;
    totalPackagesRenamed: number;
    crossFileTokensCount: number;
  };
}

// Helper to generate obfuscated names adhering to selected namingStyle
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
    const pfx = category === 'class' ? '_0xC' : category === 'method' ? '_0xm' : category === 'package' ? '_0xp' : '_0xv';
    return `${pfx}${(idx + 1).toString(16)}`;
  }

  if (style === 'numeric') {
    const pfx = category === 'class' ? 'C' : category === 'method' ? 'm' : category === 'package' ? 'pkg' : 'v';
    return `${pfx}${idx + 1}`;
  }

  // Default: Alphabetical
  if (category === 'class') {
    let name = '';
    let n = idx;
    while (n >= 0) {
      name = String.fromCharCode(65 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    }
    return name;
  } else if (category === 'package') {
    let name = '';
    let n = idx;
    while (n >= 0) {
      name = String.fromCharCode(97 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    }
    return `pkg_${name}`;
  } else if (category === 'method') {
    let name = '';
    let n = idx;
    while (n >= 0) {
      name = String.fromCharCode(97 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    }
    return name;
  } else {
    // variable
    let name = '';
    let n = idx;
    while (n >= 0) {
      name = String.fromCharCode(97 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    }
    return `v_${name}`;
  }
}

// Extract primary public or top-level class name from Java source
export function extractPrimaryClassName(code: string, fallbackName: string): string {
  const publicClassMatch = code.match(/\bpublic\s+(?:final\s+|abstract\s+)?(?:class|interface|enum|record)\s+([A-Za-z0-9_$]+)/);
  if (publicClassMatch) {
    return publicClassMatch[1];
  }
  const anyClassMatch = code.match(/\b(?:class|interface|enum|record)\s+([A-Za-z0-9_$]+)/);
  if (anyClassMatch) {
    return anyClassMatch[1];
  }
  return fallbackName.replace(/\.java$/i, '');
}

/**
 * Obfuscates both a Java class file and its companion unit/integration test file
 * using a single, unified, synchronized mapping key registry.
 */
export function obfuscateDualJavaFiles(
  input: DualJavaFilesInput,
  options: Partial<DualJavaObfuscatorOptions> = {},
  existingMapping?: JavaObfuscationMapping
): DualJavaObfuscationResult {
  const opts: DualJavaObfuscatorOptions = {
    ...DEFAULT_DUAL_OBFUSCATOR_OPTIONS,
    ...options,
  };

  const mainOriginalSize = new Blob([input.mainClassFile.code]).size;
  const testOriginalSize = new Blob([input.testClassFile.code]).size;

  let mainCode = input.mainClassFile.code;
  let testCode = input.testClassFile.code;

  // 1. Comments: Preserve formatting & documentation or strip cleanly
  const mainComments: string[] = [];
  const testComments: string[] = [];
  const mainCommentPrefix = '___CMT_MAIN_';
  const testCommentPrefix = '___CMT_TEST_';

  if (opts.stripComments) {
    // Strip block comments
    mainCode = mainCode.replace(/\/\*[\s\S]*?\*\//g, '');
    testCode = testCode.replace(/\/\*[\s\S]*?\*\//g, '');
    // Strip single-line comments
    mainCode = mainCode.replace(/\/\/.*$/gm, '');
    testCode = testCode.replace(/\/\/.*$/gm, '');
    // Clean up empty lines that only contained comments without destroying indentation
    mainCode = mainCode.replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
    testCode = testCode.replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
  } else {
    // Mask comments completely so token replacements never alter or distort comments,
    // and all comment blocks, JavaDocs, indentation, and blank lines are kept 100% intact
    mainCode = mainCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, (match) => {
      const placeholder = `${mainCommentPrefix}${mainComments.length}___`;
      mainComments.push(match);
      return placeholder;
    });

    testCode = testCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, (match) => {
      const placeholder = `${testCommentPrefix}${testComments.length}___`;
      testComments.push(match);
      return placeholder;
    });
  }

  // 2. Mask string literals in both files
  const mainStringLiterals: string[] = [];
  const testStringLiterals: string[] = [];

  const mainPlaceholderPrefix = '___STR_MAIN_';
  mainCode = mainCode.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    const placeholder = `${mainPlaceholderPrefix}${mainStringLiterals.length}___`;
    mainStringLiterals.push(match);
    return placeholder;
  });

  const testPlaceholderPrefix = '___STR_TEST_';
  testCode = testCode.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    const placeholder = `${testPlaceholderPrefix}${testStringLiterals.length}___`;
    testStringLiterals.push(match);
    return placeholder;
  });

  // 3. Build Exclusion Set
  const exclusionSet = new Set([
    ...DEFAULT_JAVA_KEYWORDS,
    ...(opts.preserveAssertionCalls ? Array.from(TESTING_FRAMEWORK_KEYWORDS) : []),
    ...(opts.customExclusions || []),
  ]);

  // Unified shared mapping registry
  const mapping: JavaObfuscationMapping = existingMapping
    ? {
        classes: { ...existingMapping.classes },
        variables: { ...existingMapping.variables },
        methods: { ...existingMapping.methods },
        packages: { ...existingMapping.packages },
        reverseMapping: { ...existingMapping.reverseMapping },
      }
    : { classes: {}, variables: {}, methods: {}, packages: {}, reverseMapping: {} };

  let classCount = Object.keys(mapping.classes).length;
  let varCount = Object.keys(mapping.variables).length;
  let methodCount = Object.keys(mapping.methods).length;
  let pkgCount = Object.keys(mapping.packages).length;

  // 4. DISCOVERY: Packages across both files
  if (opts.obfuscatePackages) {
    const pkgRegex = /(package\s+)([\w.]+)(;)/g;

    const processPackages = (codeToScan: string) => {
      let match: RegExpExecArray | null;
      while ((match = pkgRegex.exec(codeToScan)) !== null) {
        const pkgName = match[2];
        const isExcluded = opts.excludedPackages.some((p) => pkgName.startsWith(p));
        if (isExcluded) continue;

        const parts = pkgName.split('.');
        parts.forEach((part: string) => {
          if (!exclusionSet.has(part) && !mapping.packages[part]) {
            const newPkg = generateName(pkgCount++, 'package', opts.namingStyle, opts.customVarPrefix);
            mapping.packages[part] = newPkg;
            mapping.reverseMapping[newPkg] = part;
          }
        });
      }
    };

    processPackages(mainCode);
    processPackages(testCode);
  }

  // 5. DISCOVERY: Classes / Interfaces / Records / Types across both files
  if (opts.obfuscateClasses) {
    // 5a. Primary and inner classes declared in Main and Test files
    const classDeclRegex = /\b(class|interface|enum|record)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    const registerDeclaredClasses = (codeToScan: string) => {
      let match: RegExpExecArray | null;
      while ((match = classDeclRegex.exec(codeToScan)) !== null) {
        const className = match[2];
        if (!exclusionSet.has(className) && !mapping.classes[className]) {
          const newClass = generateName(classCount++, 'class', opts.namingStyle, opts.customClassPrefix);
          mapping.classes[className] = newClass;
          mapping.reverseMapping[newClass] = className;
        }
      }
    };

    registerDeclaredClasses(mainCode);
    registerDeclaredClasses(testCode);

    // 5b. Single import statements (e.g. Test importing Main class: import com.acme.service.OrderService;)
    const importRegex = /\bimport\s+([\w.]+)\.([A-Za-z_$][A-Za-z0-9_$]*)\s*;/g;
    const registerImports = (codeToScan: string) => {
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(codeToScan)) !== null) {
        const pkgPath = match[1] + '.';
        const className = match[2];

        const isExcludedPkg = opts.excludedPackages.some((p) => pkgPath.startsWith(p));
        if (!isExcludedPkg && !exclusionSet.has(className) && !mapping.classes[className]) {
          const newClass = generateName(classCount++, 'class', opts.namingStyle, opts.customClassPrefix);
          mapping.classes[className] = newClass;
          mapping.reverseMapping[newClass] = className;
        }
      }
    };

    registerImports(mainCode);
    registerImports(testCode);

    // 5c. Scan referenced custom types (fields, generics, instantiations: new OrderService())
    const customTypeRegex = /\b([A-Z][A-Za-z0-9_$]*)\b/g;
    const registerCustomTypes = (codeToScan: string) => {
      let match: RegExpExecArray | null;
      while ((match = customTypeRegex.exec(codeToScan)) !== null) {
        const className = match[1];
        if (exclusionSet.has(className) || mapping.classes[className]) continue;

        // Check if preceded by @ (annotation)
        const prevCharIndex = match.index - 1;
        let isAnnotation = false;
        for (let i = prevCharIndex; i >= 0; i--) {
          const ch = codeToScan[i];
          if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') continue;
          if (ch === '@') {
            isAnnotation = true;
          }
          break;
        }

        if (isAnnotation) continue;

        const newClass = generateName(classCount++, 'class', opts.namingStyle, opts.customClassPrefix);
        mapping.classes[className] = newClass;
        mapping.reverseMapping[newClass] = className;
      }
    };

    registerCustomTypes(mainCode);
    registerCustomTypes(testCode);
  }

  // 6. DISCOVERY: Methods across both files
  if (opts.obfuscateMethods) {
    const scanMethods = (codeToScan: string, isTestFile: boolean) => {
      // Find annotated lines
      const annotatedLines = new Set<number>();
      const testAnnotatedLines = new Set<number>();
      const lines = codeToScan.split('\n');

      lines.forEach((line, idx) => {
        if (/@(Override|GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping|Autowired|JsonProperty|Value|Column|Id|NotNull|NotBlank)/.test(line)) {
          annotatedLines.add(idx + 1);
        }
        if (/@(Test|ParameterizedTest|RepeatedTest|TestFactory|BeforeEach|AfterEach|BeforeAll|AfterAll|Before|After|BeforeClass|AfterClass)/.test(line)) {
          testAnnotatedLines.add(idx + 1);
        }
      });

      // Match method declarations: [modifiers] [ReturnType] methodName([params])
      const methodRegex = /\b(public|protected|private|static|final|synchronized|native|\s)+[\w<>\[\],\s]+\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
      let match: RegExpExecArray | null;
      while ((match = methodRegex.exec(codeToScan)) !== null) {
        const methodName = match[2];

        if (exclusionSet.has(methodName)) continue;
        if (opts.preserveMain && methodName === 'main') continue;
        if (opts.preserveGettersSetters && /^(get|set|is)[A-Z]/.test(methodName)) continue;

        const lineNum = codeToScan.substring(0, match.index).split('\n').length;
        if (opts.preserveAnnotated && (annotatedLines.has(lineNum) || annotatedLines.has(lineNum - 1))) {
          continue;
        }

        // Test method preservation
        if (isTestFile && opts.preserveTestMethods) {
          if (testAnnotatedLines.has(lineNum) || testAnnotatedLines.has(lineNum - 1) || /^test[A-Z0-9_]/.test(methodName)) {
            continue;
          }
        }

        if (!mapping.methods[methodName]) {
          const newMethod = generateName(methodCount++, 'method', opts.namingStyle, opts.customMethodPrefix);
          mapping.methods[methodName] = newMethod;
          mapping.reverseMapping[newMethod] = methodName;
        }
      }
    };

    scanMethods(mainCode, false);
    scanMethods(testCode, true);
  }

  // 7. DISCOVERY: Variables / Fields / Parameters across both files
  if (opts.obfuscateVariables) {
    const varRegex = /\b([A-Z][A-Za-z0-9_<>,]*|int|long|boolean|double|float|char|byte|short|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([=;,)]|\b)/g;

    const scanVariables = (codeToScan: string) => {
      let match: RegExpExecArray | null;
      while ((match = varRegex.exec(codeToScan)) !== null) {
        const varName = match[2];
        if (
          !exclusionSet.has(varName) &&
          !mapping.methods[varName] &&
          !mapping.classes[varName] &&
          !mapping.variables[varName]
        ) {
          const newVar = generateName(varCount++, 'variable', opts.namingStyle, opts.customVarPrefix);
          mapping.variables[varName] = newVar;
          mapping.reverseMapping[newVar] = varName;
        }
      }
    };

    scanVariables(mainCode);
    scanVariables(testCode);
  }

  // 8. APPLY REPLACEMENTS WITH SHARED MAPPING
  const applyReplacements = (codeToTransform: string) => {
    let result = codeToTransform;

    // 8a. Scoped Package Obfuscation (ONLY in package and import declarations to protect code tokens)
    if (opts.obfuscatePackages && Object.keys(mapping.packages).length > 0) {
      result = result.replace(/(package\s+)([\w.]+)(;)/g, (match, prefix, pkgName, suffix) => {
        const isExcluded = opts.excludedPackages.some((p) => pkgName.startsWith(p));
        if (isExcluded) return match;
        const parts = pkgName.split('.');
        const obfParts = parts.map((part) => mapping.packages[part] || part);
        return `${prefix}${obfParts.join('.')}${suffix}`;
      });

      result = result.replace(/(import\s+(?:static\s+)?)([\w.]+)(\.[A-Za-z0-9_*]+;)/g, (match, prefix, pkgPath, suffix) => {
        const isExcluded = opts.excludedPackages.some((p) => pkgPath.startsWith(p));
        if (isExcluded) return match;
        const parts = pkgPath.split('.');
        const obfParts = parts.map((part) => mapping.packages[part] || part);
        return `${prefix}${obfParts.join('.')}${suffix}`;
      });
    }

    // 8b. Unified Single-Pass Identifier Replacement (Classes, Methods, Variables)
    // Combining into a single dictionary sorted longest-first guarantees exact preservation
    // of whitespace/formatting and completely prevents re-replacement collisions.
    const identifierMap: Record<string, string> = {};
    if (opts.obfuscateClasses) {
      Object.assign(identifierMap, mapping.classes);
    }
    if (opts.obfuscateMethods) {
      Object.assign(identifierMap, mapping.methods);
    }
    if (opts.obfuscateVariables) {
      Object.assign(identifierMap, mapping.variables);
    }

    const validKeys = Object.keys(identifierMap)
      .filter((k) => k && identifierMap[k] && k !== identifierMap[k])
      .sort((a, b) => b.length - a.length);

    if (validKeys.length > 0) {
      const escapedKeys = validKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp(`(?<![a-zA-Z0-9_$])(?:${escapedKeys.join('|')})(?![a-zA-Z0-9_$])`, 'g');
      result = result.replace(regex, (matched) => identifierMap[matched] || matched);
    }

    return result;
  };

  mainCode = applyReplacements(mainCode);
  testCode = applyReplacements(testCode);

  // 9. UNMASK / ENCRYPT STRING LITERALS
  const restoreStrings = (codeWithPlaceholders: string, literals: string[], prefix: string) => {
    let result = codeWithPlaceholders;
    literals.forEach((literal, idx) => {
      const placeholder = `${prefix}${idx}___`;
      if (opts.encryptStrings) {
        const rawString = literal.substring(1, literal.length - 1);
        const b64 = btoa(rawString);
        const encryptedExpr = `new String(java.util.Base64.getDecoder().decode("${b64}"))`;
        result = result.replace(placeholder, () => encryptedExpr);
      } else {
        result = result.replace(placeholder, () => literal);
      }
    });
    return result;
  };

  mainCode = restoreStrings(mainCode, mainStringLiterals, mainPlaceholderPrefix);
  testCode = restoreStrings(testCode, testStringLiterals, testPlaceholderPrefix);

  // 10. UNMASK COMMENTS (Keeps original formatting, indentation & documentation intact)
  if (!opts.stripComments) {
    mainComments.forEach((cmt, idx) => {
      mainCode = mainCode.replace(`${mainCommentPrefix}${idx}___`, () => cmt);
    });
    testComments.forEach((cmt, idx) => {
      testCode = testCode.replace(`${testCommentPrefix}${idx}___`, () => cmt);
    });
  }

  // 11. AUTO-FORMAT OUTPUT IF REQUESTED
  if (opts.autoFormatOutput) {
    try {
      mainCode = formatJavaCode(mainCode, { indentSize: 4 });
      testCode = formatJavaCode(testCode, { indentSize: 4 });
    } catch {
      // Retain formatted code if parser encounters non-standard syntax
    }
  }

  // 10. SYNCHRONIZED FILE NAMES & CROSS-FILE SHARED TOKENS
  const mainOriginalClassName = extractPrimaryClassName(input.mainClassFile.code, input.mainClassFile.fileName);
  const testOriginalClassName = extractPrimaryClassName(input.testClassFile.code, input.testClassFile.fileName);

  const mainObfuscatedClassName = mapping.classes[mainOriginalClassName] || mainOriginalClassName;
  const testObfuscatedClassName = mapping.classes[testOriginalClassName] || testOriginalClassName;

  const mainObfuscatedFileName = opts.syncClassFileNames
    ? `${mainObfuscatedClassName}.java`
    : input.mainClassFile.fileName;

  const testObfuscatedFileName = opts.syncClassFileNames
    ? `${testObfuscatedClassName}.java`
    : input.testClassFile.fileName;

  // Identify shared tokens cross-referenced in BOTH files
  const sharedClasses = Object.keys(mapping.classes).filter(
    (cls) => input.mainClassFile.code.includes(cls) && input.testClassFile.code.includes(cls)
  );

  const sharedMethods = Object.keys(mapping.methods).filter(
    (mth) => input.mainClassFile.code.includes(mth) && input.testClassFile.code.includes(mth)
  );

  const sharedVariables = Object.keys(mapping.variables).filter(
    (v) => input.mainClassFile.code.includes(v) && input.testClassFile.code.includes(v)
  );

  const sharedPackages = Object.keys(mapping.packages).filter(
    (pkg) => input.mainClassFile.code.includes(pkg) && input.testClassFile.code.includes(pkg)
  );

  const mainObfuscatedSize = new Blob([mainCode]).size;
  const testObfuscatedSize = new Blob([testCode]).size;

  return {
    mainClassFile: {
      fileName: mainObfuscatedFileName,
      obfuscatedCode: mainCode,
      originalName: mainOriginalClassName,
      obfuscatedClassName: mainObfuscatedClassName,
    },
    testClassFile: {
      fileName: testObfuscatedFileName,
      obfuscatedCode: testCode,
      originalName: testOriginalClassName,
      obfuscatedClassName: testObfuscatedClassName,
    },
    mapping,
    sharedIdentifiers: {
      classes: sharedClasses,
      methods: sharedMethods,
      variables: sharedVariables,
      packages: sharedPackages,
    },
    stats: {
      mainOriginalSize,
      mainObfuscatedSize,
      testOriginalSize,
      testObfuscatedSize,
      totalOriginalSize: mainOriginalSize + testOriginalSize,
      totalObfuscatedSize: mainObfuscatedSize + testObfuscatedSize,
      totalClassesRenamed: Object.keys(mapping.classes).length,
      totalMethodsRenamed: Object.keys(mapping.methods).length,
      totalVariablesRenamed: Object.keys(mapping.variables).length,
      totalPackagesRenamed: Object.keys(mapping.packages).length,
      crossFileTokensCount: sharedClasses.length + sharedMethods.length + sharedVariables.length + sharedPackages.length,
    },
  };
}

/**
 * De-obfuscates both modified Java class code and modified companion test code
 * using the shared mapping (or reverse mapping dict), restoring original class,
 * method, variable, and package names while preserving all user modifications.
 */
export function deobfuscateDualJavaFiles(
  mainObfuscatedCode: string,
  testObfuscatedCode: string,
  mapping: JavaObfuscationMapping | Record<string, string>
): {
  restoredMainCode: string;
  restoredTestCode: string;
} {
  const restoredMainCode = deobfuscateJavaCode(mainObfuscatedCode, mapping);
  const restoredTestCode = deobfuscateJavaCode(testObfuscatedCode, mapping);

  return {
    restoredMainCode,
    restoredTestCode,
  };
}
