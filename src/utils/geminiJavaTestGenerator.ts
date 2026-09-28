import { GoogleGenAI } from '@google/genai';
import { JavaObfuscationMapping, deobfuscateJavaCode } from './javaObfuscator';
import { formatJavaCode } from './javaFormatter';

export interface ParsedJavaMethod {
  id: string;
  name: string;
  originalName?: string;
  returnType: string;
  parameters: string;
  annotations: string[];
  isTestMethod: boolean;
  isPrivate?: boolean;
  startLine: number;
  endLine: number;
  rawDeclaration: string;
  body: string;
  sourceClassType: 'test' | 'main';
}

export interface GenerateTestsOptions {
  apiKey: string;
  model?: string;
  selectedMethods: ParsedJavaMethod[];
  obfuscatedClassCode: string;
  obfuscatedTestCode: string;
  fullObfuscatedTestCode?: string;
  mainClassName?: string;
  testClassName?: string;
  coverageGoal?: 'all_lines_and_branches' | 'boundary_and_exceptions' | 'edge_cases';
  testFramework?: 'junit5' | 'junit4' | 'testng';
  mapping?: JavaObfuscationMapping;
}

export interface GeneratedMethodDetail {
  name: string;
  code: string;
  targetMethod: string;
  branchDescription?: string;
}

export interface GeneratedTestsResult {
  success: boolean;
  generatedTestsCode: string;
  individualMethods: GeneratedMethodDetail[];
  newImports: string[];
  mergedObfuscatedTestCode: string;
  deobfuscatedMergedTestCode: string;
  error?: string;
  stats: {
    methodsGenerated: number;
    linesAdded: number;
    selectedMethodsCount: number;
  };
}

/**
 * Parses methods from Java source code using bracket-depth tracking and regex tokenization.
 */
export function extractJavaMethods(
  code: string,
  sourceClassType: 'test' | 'main',
  mapping?: JavaObfuscationMapping
): ParsedJavaMethod[] {
  const methods: ParsedJavaMethod[] = [];
  if (!code || !code.trim()) return methods;

  const lines = code.split('\n');
  const reverseMap = mapping?.reverseMapping || {};

  // Method declaration regex: matches annotations + modifier + returnType + methodName + (params)
  // e.g. void testCreateOrder_Success() or public Order mth_1(String v_1, double v_2)
  const methodRegex = /^(?:@[a-zA-Z0-9_$.()"\s=,]+\s+)*(?:(?:public|protected|private|static|final|synchronized|abstract|default)\s+)*([a-zA-Z0-9_<>[\]?]+)\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)(?:\s+throws\s+[^{]+)?\s*\{?$/;

  let currentAnnotations: string[] = [];
  let annotationStartLine = 1;
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Handle multi-line comments
    if (trimmed.startsWith('/*')) inComment = true;
    if (inComment) {
      if (trimmed.endsWith('*/') || trimmed.includes('*/')) inComment = false;
      continue;
    }
    if (trimmed.startsWith('//')) continue;

    // Collect annotations
    if (trimmed.startsWith('@')) {
      if (currentAnnotations.length === 0) {
        annotationStartLine = i + 1;
      }
      currentAnnotations.push(trimmed);
      continue;
    }

    // Skip control flow statements
    if (/^(if|else|for|while|switch|catch|synchronized|static)\s*\(/.test(trimmed)) {
      currentAnnotations = [];
      continue;
    }

    // Skip class/interface/enum/record declarations
    if (/\b(class|interface|enum|record)\b/.test(trimmed)) {
      currentAnnotations = [];
      continue;
    }

    const match = trimmed.match(methodRegex);
    if (match) {
      const returnType = match[1];
      const methodName = match[2];
      const parameters = match[3] ? match[3].trim() : '';

      // Skip constructor if return type matches class name or void/type keywords
      const isConstructor = !returnType || returnType === methodName;

      if (!isConstructor && methodName !== 'if' && methodName !== 'while' && methodName !== 'for') {
        const isTestMethod =
          currentAnnotations.some((a) => a.includes('@Test') || a.includes('@ParameterizedTest') || a.includes('@RepeatedTest')) ||
          methodName.startsWith('test') ||
          sourceClassType === 'test';

        const isPrivate = /\bprivate\b/.test(trimmed) || currentAnnotations.some((a) => /\bprivate\b/.test(a));

        // Extract method body by matching braces
        let bodyLines: string[] = [];
        let braceCount = 0;
        let foundOpenBrace = false;
        let startLine = currentAnnotations.length > 0 ? annotationStartLine : i + 1;
        let endLine = i + 1;

        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          bodyLines.push(l);

          for (let charIndex = 0; charIndex < l.length; charIndex++) {
            const ch = l[charIndex];
            if (ch === '{') {
              braceCount++;
              foundOpenBrace = true;
            } else if (ch === '}') {
              braceCount--;
            }
          }

          if (foundOpenBrace && braceCount === 0) {
            endLine = j + 1;
            break;
          }
        }

        const originalName = reverseMap[methodName] || (mapping?.methods && mapping.methods[methodName]) || undefined;

        methods.push({
          id: `${sourceClassType}-${methodName}-${i}`,
          name: methodName,
          originalName: originalName && originalName !== methodName ? originalName : undefined,
          returnType,
          parameters,
          annotations: [...currentAnnotations],
          isTestMethod,
          isPrivate,
          startLine,
          endLine,
          rawDeclaration: `${currentAnnotations.join(' ')} ${returnType} ${methodName}(${parameters})`.trim(),
          body: bodyLines.join('\n'),
          sourceClassType,
        });
      }

      currentAnnotations = [];
    } else if (trimmed.length > 0 && !trimmed.startsWith('@')) {
      currentAnnotations = [];
    }
  }

  return methods;
}

export interface ScopedObfuscatedClasses {
  scopedClassCode: string;
  scopedTestCode: string;
  selectedMethods: ParsedJavaMethod[];
  dependentPrivateMethods: ParsedJavaMethod[];
  retainedMainMethods: ParsedJavaMethod[];
  omittedMainMethods: ParsedJavaMethod[];
  setupTestMethods: ParsedJavaMethod[];
  relatedTestMethods: ParsedJavaMethod[];
  omittedTestMethods: ParsedJavaMethod[];
}

/**
 * Creates an updated copy of the production class containing ONLY the selected target methods
 * and their dependent private/helper methods, along with setup methods and related test methods
 * in the companion test class - all in obfuscated code.
 */
export function createScopedObfuscatedJavaClasses(
  obfuscatedClassCode: string,
  obfuscatedTestCode: string,
  selectedMethods: ParsedJavaMethod[],
  mapping?: JavaObfuscationMapping
): ScopedObfuscatedClasses {
  const allMainMethods = extractJavaMethods(obfuscatedClassCode, 'main', mapping);
  const allTestMethods = extractJavaMethods(obfuscatedTestCode, 'test', mapping);

  // 1. Identify selected target methods (from production class or test class)
  const selectedMainMethods = selectedMethods.filter((m) => m.sourceClassType === 'main');
  const selectedTestMethods = selectedMethods.filter((m) => m.sourceClassType === 'test');

  // If user selected test methods only, find the corresponding target methods in the production class
  let targetMainMethods = [...selectedMainMethods];
  if (targetMainMethods.length === 0 && selectedTestMethods.length > 0) {
    for (const testMethod of selectedTestMethods) {
      for (const mainMethod of allMainMethods) {
        const regex = new RegExp(`\\b${mainMethod.name}\\s*\\(`, 'g');
        if (regex.test(testMethod.body) && !targetMainMethods.some((m) => m.id === mainMethod.id)) {
          targetMainMethods.push(mainMethod);
        }
      }
    }
  }

  // If still none selected, default to all main methods
  if (targetMainMethods.length === 0) {
    targetMainMethods = [...allMainMethods];
  }

  // 2. Transitive dependency analysis for dependent private/helper methods in the production class
  const retainedMainMethodIds = new Set<string>(targetMainMethods.map((m) => m.id));
  const dependentPrivateMethods: ParsedJavaMethod[] = [];

  let addedMore = true;
  while (addedMore) {
    addedMore = false;
    const currentRetainedBodies = allMainMethods
      .filter((m) => retainedMainMethodIds.has(m.id))
      .map((m) => m.body)
      .join('\n');

    for (const candidate of allMainMethods) {
      if (!retainedMainMethodIds.has(candidate.id)) {
        // Is candidate called by any retained method?
        const callRegex = new RegExp(`\\b${candidate.name}\\s*\\(`, 'g');
        if (callRegex.test(currentRetainedBodies)) {
          retainedMainMethodIds.add(candidate.id);
          dependentPrivateMethods.push(candidate);
          addedMore = true;
        }
      }
    }
  }

  const retainedMainMethods = allMainMethods.filter((m) => retainedMainMethodIds.has(m.id));
  const omittedMainMethods = allMainMethods.filter((m) => !retainedMainMethodIds.has(m.id));

  // 3. Construct Scoped Obfuscated Production Class Code
  let scopedClassCode = obfuscatedClassCode;
  if (omittedMainMethods.length > 0) {
    const classLines = obfuscatedClassCode.split('\n');
    const linesToOmit = new Set<number>();
    for (const omitted of omittedMainMethods) {
      for (let l = omitted.startLine - 1; l < omitted.endLine; l++) {
        linesToOmit.add(l);
      }
    }

    const filteredLines: string[] = [];
    let inOmittedBlock = false;
    for (let i = 0; i < classLines.length; i++) {
      if (linesToOmit.has(i)) {
        if (!inOmittedBlock) {
          filteredLines.push('    // [DevHub AI Scoping: Unrelated production methods omitted to focus AI generation]');
          inOmittedBlock = true;
        }
      } else {
        inOmittedBlock = false;
        filteredLines.push(classLines[i]);
      }
    }

    scopedClassCode = filteredLines.join('\n');
    try {
      scopedClassCode = formatJavaCode(scopedClassCode, { indentSize: 4 });
    } catch {
      // keep
    }
  }

  // 4. Test Class Scoping: Setup methods + Related test methods
  const setupTestMethods: ParsedJavaMethod[] = [];
  const relatedTestMethods: ParsedJavaMethod[] = [];
  const omittedTestMethods: ParsedJavaMethod[] = [];

  const targetNames = new Set(retainedMainMethods.map((m) => m.name));
  const targetOrigNames = new Set(retainedMainMethods.map((m) => m.originalName).filter(Boolean) as string[]);

  for (const testMethod of allTestMethods) {
    const isSetup =
      testMethod.annotations.some((a) =>
        /@(BeforeEach|Before|BeforeAll|BeforeClass|AfterEach|After|AfterAll|AfterClass)\b/i.test(a)
      ) || /^(setUp|tearDown|init|initMocks|before|after)$/i.test(testMethod.name);

    if (isSetup) {
      setupTestMethods.push(testMethod);
      continue;
    }

    const isExplicitlySelected = selectedTestMethods.some((m) => m.id === testMethod.id);
    let referencesTarget = isExplicitlySelected;

    if (!referencesTarget) {
      for (const tName of targetNames) {
        if (new RegExp(`\\b${tName}\\b`).test(testMethod.body) || testMethod.name.toLowerCase().includes(tName.toLowerCase())) {
          referencesTarget = true;
          break;
        }
      }
    }
    if (!referencesTarget && targetOrigNames.size > 0) {
      for (const oName of targetOrigNames) {
        if (testMethod.name.toLowerCase().includes(oName.toLowerCase()) || testMethod.body.includes(oName)) {
          referencesTarget = true;
          break;
        }
      }
    }

    if (referencesTarget) {
      relatedTestMethods.push(testMethod);
    } else {
      omittedTestMethods.push(testMethod);
    }
  }

  // Construct Scoped Obfuscated Test Class Code
  let scopedTestCode = obfuscatedTestCode;
  if (omittedTestMethods.length > 0) {
    const testLines = obfuscatedTestCode.split('\n');
    const testLinesToOmit = new Set<number>();
    for (const omitted of omittedTestMethods) {
      for (let l = omitted.startLine - 1; l < omitted.endLine; l++) {
        testLinesToOmit.add(l);
      }
    }

    const filteredTestLines: string[] = [];
    let inOmittedTestBlock = false;
    for (let i = 0; i < testLines.length; i++) {
      if (testLinesToOmit.has(i)) {
        if (!inOmittedTestBlock) {
          filteredTestLines.push('    // [DevHub AI Scoping: Unrelated test methods omitted to focus AI generation]');
          inOmittedTestBlock = true;
        }
      } else {
        inOmittedTestBlock = false;
        filteredTestLines.push(testLines[i]);
      }
    }

    scopedTestCode = filteredTestLines.join('\n');
    try {
      scopedTestCode = formatJavaCode(scopedTestCode, { indentSize: 4 });
    } catch {
      // keep
    }
  }

  return {
    scopedClassCode,
    scopedTestCode,
    selectedMethods,
    dependentPrivateMethods,
    retainedMainMethods,
    omittedMainMethods,
    setupTestMethods,
    relatedTestMethods,
    omittedTestMethods,
  };
}

/**
 * Merges newly generated test method blocks and missing imports into an obfuscated test class.
 */
export function mergeGeneratedTestsIntoObfuscatedTest(
  originalObfuscatedTestCode: string,
  generatedTestBlock: string,
  newImports: string[] = []
): string {
  if (!originalObfuscatedTestCode || !originalObfuscatedTestCode.trim()) {
    return generatedTestBlock;
  }
  if (!generatedTestBlock || !generatedTestBlock.trim()) {
    return originalObfuscatedTestCode;
  }

  let code = originalObfuscatedTestCode;

  // 1. Insert missing imports
  if (newImports && newImports.length > 0) {
    const existingImports = new Set(
      code
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('import '))
    );

    const neededImports = newImports.filter((imp) => {
      const trimmed = imp.trim().replace(/^import\s+/, '').replace(/;$/, '');
      const fullImportLine = `import ${trimmed};`;
      return !existingImports.has(fullImportLine) && !existingImports.has(`import static ${trimmed};`);
    });

    if (neededImports.length > 0) {
      const importBlock = neededImports
        .map((imp) => {
          const clean = imp.trim();
          return clean.startsWith('import ') ? (clean.endsWith(';') ? clean : `${clean};`) : `import ${clean};`;
        })
        .join('\n');

      // Insert after last existing import, or after package line
      const lines = code.split('\n');
      let insertIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i + 1;
          break;
        }
      }
      if (insertIndex === -1) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('package ')) {
            insertIndex = i + 1;
            break;
          }
        }
      }

      if (insertIndex !== -1) {
        lines.splice(insertIndex, 0, importBlock);
        code = lines.join('\n');
      } else {
        code = importBlock + '\n\n' + code;
      }
    }
  }

  // 2. Insert test methods right before the closing brace of the test class
  const lastCloseBraceIndex = code.lastIndexOf('}');
  if (lastCloseBraceIndex !== -1) {
    const beforeBrace = code.slice(0, lastCloseBraceIndex);
    const afterBrace = code.slice(lastCloseBraceIndex);

    const formattedTests = generatedTestBlock
      .split('\n')
      .map((line) => (line.trim().length > 0 ? (line.startsWith('    ') ? line : `    ${line}`) : line))
      .join('\n');

    code = `${beforeBrace.trimEnd()}\n\n    // ==========================================================\n    // [AI GENERATED OBFUSCATED TESTS - FULL BRANCH & LINE COVERAGE]\n    // ==========================================================\n${formattedTests}\n${afterBrace}`;
  } else {
    code = `${code}\n\n${generatedTestBlock}`;
  }

  // 3. Format cleanly
  try {
    return formatJavaCode(code, { indentSize: 4 });
  } catch {
    return code;
  }
}

/**
 * Calls Gemini API using @google/genai to generate branch and line coverage unit tests
 * targeting the selected obfuscated methods in the test class.
 */
export async function generateJavaTestsWithGemini(
  options: GenerateTestsOptions
): Promise<GeneratedTestsResult> {
  const {
    apiKey,
    model = 'gemini-3.8-flash',
    selectedMethods,
    obfuscatedClassCode,
    obfuscatedTestCode,
    mainClassName = 'TargetClass',
    testClassName = 'TargetClassTest',
    coverageGoal = 'all_lines_and_branches',
    testFramework = 'junit5',
    mapping,
  } = options;

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      generatedTestsCode: '',
      individualMethods: [],
      newImports: [],
      mergedObfuscatedTestCode: obfuscatedTestCode,
      deobfuscatedMergedTestCode: '',
      error: 'Google AI Studio / Gemini API key is missing. Please provide your API key to generate unit tests.',
      stats: { methodsGenerated: 0, linesAdded: 0, selectedMethodsCount: selectedMethods.length },
    };
  }

  if (!selectedMethods || selectedMethods.length === 0) {
    return {
      success: false,
      generatedTestsCode: '',
      individualMethods: [],
      newImports: [],
      mergedObfuscatedTestCode: obfuscatedTestCode,
      deobfuscatedMergedTestCode: '',
      error: 'No obfuscated methods selected. Please select at least one method to generate branch tests for.',
      stats: { methodsGenerated: 0, linesAdded: 0, selectedMethodsCount: 0 },
    };
  }

  try {
    const methodDescriptions = selectedMethods
      .map((m, idx) => {
        const origNote = m.originalName ? ` (Original identifier before obfuscation: ${m.originalName})` : '';
        return `Method #${idx + 1}:
  Name: ${m.name}${origNote}
  Declaration: ${m.rawDeclaration}
  Source: ${m.sourceClassType === 'test' ? 'Test Class Method' : 'Production Class Target Method'}
  Code body:
${m.body}`;
      })
      .join('\n\n');

    const frameworkInstructions =
      testFramework === 'junit5'
        ? 'Use JUnit 5 annotations (@Test, @DisplayName, @ParameterizedTest, assertThrows, assertEquals, assertTrue, etc.).'
        : testFramework === 'junit4'
        ? 'Use JUnit 4 annotations (@Test(expected = ...), org.junit.Assert.assertEquals, etc.).'
        : 'Use TestNG annotations (@Test, org.testng.Assert, etc.).';

    const coverageGoalInstructions =
      coverageGoal === 'boundary_and_exceptions'
        ? 'Focus heavily on boundary conditions (0, -1, MAX_VALUE, MIN_VALUE), invalid parameter formats, and assertThrows/expected exceptions for error branches.'
        : coverageGoal === 'edge_cases'
        ? 'Focus heavily on null checks, NullPointerException guards, empty collections, empty strings, and malformed arguments.'
        : 'Achieve 100% full line and branch coverage across all execution paths, loop boundaries, if/else branches, switch cases, and exception paths.';

    const prompt = `You are a Principal Java Testing Architect and JUnit/Mockito verification specialist.
Your mission is to generate comprehensive unit tests to achieve 100% LINE COVERAGE and 100% BRANCH COVERAGE for the specified methods in an OBFUSCATED Java codebase.

COVERAGE GOAL:
${coverageGoalInstructions}

CRITICAL RULES:
1. STRICT OBFUSCATED IDENTIFIERS: You MUST write the test methods USING THE EXACT OBFUSCATED NAMES present in the obfuscated class and test class (e.g. Cls_1, mth_1, v_2, etc.). DO NOT rename them or invent non-obfuscated names. The generated tests must compile directly inside the provided obfuscated test class!
2. COMPLETE BRANCH COVERAGE:
   - Positive execution paths and standard valid inputs.
   - Negative branches, boundary values (0, 1, -1, MAX_VALUE, MIN_VALUE, empty strings, nulls).
   - If/else branches, switch cases, ternary checks, and loop conditions.
   - Exception handling branches (use assertThrows / expected exceptions for thrown errors).
3. TARGET METHODS SELECTED FOR TEST GENERATION:
${methodDescriptions}

4. TESTING FRAMEWORK:
${frameworkInstructions}
Adhere to the existing mocking setup (Mockito mocks, @InjectMocks, @Mock, when(...).thenReturn(...), verify(...)) seen in the companion test class.

5. OUTPUT FORMAT:
Return a valid JSON object with the following structure:
{
  "newImports": [
    "org.junit.jupiter.api.DisplayName",
    "static org.junit.jupiter.api.Assertions.assertThrows"
  ],
  "tests": [
    {
      "name": "test_mth_1_BoundaryValue_Success",
      "targetMethod": "${selectedMethods[0].name}",
      "branchDescription": "Covers boundary condition when value is zero",
      "code": "    @Test\\n    @DisplayName(\\\"...\\\")\\n    void test_mth_1_BoundaryValue_Success() {\\n        ...\\n    }"
    }
  ]
}

DO NOT wrap the response in markdown code blocks if possible, or use standard \`\`\`json block. Provide ONLY valid JSON.`;

    let outputText = '';

    // First attempt: use @google/genai SDK
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
      });

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            text: `Here is the OBFUSCATED Production Class (${mainClassName}):
\`\`\`java
${obfuscatedClassCode}
\`\`\`

Here is the companion OBFUSCATED Test Class (${testClassName}):
\`\`\`java
${obfuscatedTestCode}
\`\`\`

${prompt}`,
          },
        ],
        config: {
          systemInstruction:
            'You are an expert Java developer specializing in high-coverage unit testing, mutation testing, and JUnit 5/Mockito. You write clean, robust unit tests with full line and branch coverage using the provided obfuscated identifiers.',
          temperature: 0.1,
        },
      });

      outputText = response.text || '';
    } catch (sdkErr: unknown) {
      // Second attempt: direct REST API fallback to guarantee browser compatibility
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

        const restBody = {
          contents: [
            {
              parts: [
                {
                  text: `Here is the OBFUSCATED Production Class (${mainClassName}):
\`\`\`java
${obfuscatedClassCode}
\`\`\`

Here is the companion OBFUSCATED Test Class (${testClassName}):
\`\`\`java
${obfuscatedTestCode}
\`\`\`

${prompt}`,
                },
              ],
            },
          ],
          systemInstruction: {
            parts: [
              {
                text: 'You are an expert Java developer specializing in high-coverage unit testing, mutation testing, and JUnit 5/Mockito. You write clean, robust unit tests with full line and branch coverage using the provided obfuscated identifiers.',
              },
            ],
          },
          generationConfig: {
            temperature: 0.1,
          },
        };

        const restRes = await fetch(restUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(restBody),
        });

        if (!restRes.ok) {
          const errData = await restRes.json().catch(() => null);
          const errMsg = errData?.error?.message || `HTTP ${restRes.status} ${restRes.statusText}`;
          throw new Error(errMsg);
        }

        const data = await restRes.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          outputText = candidateText;
        } else {
          throw new Error(sdkErr instanceof Error ? sdkErr.message : 'Failed to generate content from Gemini API');
        }
      } catch (restErr: unknown) {
        const finalMsg =
          restErr instanceof Error
            ? restErr.message
            : sdkErr instanceof Error
            ? sdkErr.message
            : 'Gemini API call failed.';
        throw new Error(finalMsg);
      }
    }

    if (!outputText.trim()) {
      throw new Error('Gemini API returned an empty response. Please verify your prompt or API key.');
    }

    // Parse JSON from response
    let parsedJson: {
      newImports?: string[];
      tests?: Array<{
        name?: string;
        targetMethod?: string;
        branchDescription?: string;
        code?: string;
      }>;
    } | null = null;

    try {
      const cleanJson = outputText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsedJson = JSON.parse(cleanJson);
    } catch {
      // Fallback: extract JSON with regex
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {
          // If still fails, handle raw Java test code
        }
      }
    }

    let individualMethods: GeneratedMethodDetail[] = [];
    let newImports: string[] = [];
    let generatedTestsCode = '';

    if (parsedJson && Array.isArray(parsedJson.tests) && parsedJson.tests.length > 0) {
      newImports = Array.isArray(parsedJson.newImports) ? parsedJson.newImports : [];
      individualMethods = parsedJson.tests.map((t, idx) => ({
        name: t.name || `testGenerated_${idx + 1}`,
        targetMethod: t.targetMethod || selectedMethods[0].name,
        branchDescription: t.branchDescription || 'Branch coverage test',
        code: t.code || '',
      }));
      generatedTestsCode = individualMethods.map((m) => m.code).join('\n\n');
    } else {
      // Fallback: Gemini returned raw Java method code directly
      const cleanCode = outputText
        .replace(/^```java\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      generatedTestsCode = cleanCode;
      individualMethods = [
        {
          name: 'generatedBranchCoverageTests',
          targetMethod: selectedMethods.map((m) => m.name).join(', '),
          branchDescription: 'Comprehensive line and branch coverage tests',
          code: cleanCode,
        },
      ];
      newImports = [
        'org.junit.jupiter.api.Test',
        'org.junit.jupiter.api.DisplayName',
        'static org.junit.jupiter.api.Assertions.*',
      ];
    }

    // Merge generated tests into the obfuscated test class (using full test code if provided)
    const baseTestCodeForMerge = options.fullObfuscatedTestCode || obfuscatedTestCode;
    const mergedObfuscatedTestCode = mergeGeneratedTestsIntoObfuscatedTest(
      baseTestCodeForMerge,
      generatedTestsCode,
      newImports
    );

    // De-obfuscate the merged test class if mapping is available
    let deobfuscatedMergedTestCode = '';
    if (mapping) {
      try {
        deobfuscatedMergedTestCode = deobfuscateJavaCode(mergedObfuscatedTestCode, mapping);
        deobfuscatedMergedTestCode = formatJavaCode(deobfuscatedMergedTestCode, { indentSize: 4 });
      } catch {
        deobfuscatedMergedTestCode = deobfuscateJavaCode(mergedObfuscatedTestCode, mapping);
      }
    }

    const linesAdded = generatedTestsCode.split('\n').length;

    return {
      success: true,
      generatedTestsCode,
      individualMethods,
      newImports,
      mergedObfuscatedTestCode,
      deobfuscatedMergedTestCode,
      stats: {
        methodsGenerated: individualMethods.length,
        linesAdded,
        selectedMethodsCount: selectedMethods.length,
      },
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : 'An error occurred while generating unit tests with the Gemini API.';
    return {
      success: false,
      generatedTestsCode: '',
      individualMethods: [],
      newImports: [],
      mergedObfuscatedTestCode: obfuscatedTestCode,
      deobfuscatedMergedTestCode: '',
      error: errorMsg,
      stats: { methodsGenerated: 0, linesAdded: 0, selectedMethodsCount: selectedMethods.length },
    };
  }
}
