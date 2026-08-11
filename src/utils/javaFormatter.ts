export interface JavaFormatterOptions {
  indentType: 'spaces' | 'tabs';
  indentSize: number; // 2, 4, 8
  braceStyle: 'same-line' | 'next-line'; // K&R vs Allman
  sortImports: boolean;
  groupImports: boolean; // Group java/javax, org/com, 3rd party
  removeDuplicateImports: boolean;
  spaceBeforeControlParentheses: boolean; // if (...) vs if(...)
  spaceAroundOperators: boolean; // a + b vs a+b
  spaceInsideParentheses: boolean; // ( x ) vs (x)
  maxConsecutiveBlankLines: number; // 1, 2
  blankLinesBetweenMethods: number; // 1, 2
  normalizeModifiers: boolean; // public static final
  alignSingleLineComments: boolean;
  trimTrailingWhitespace: boolean;
  ensureFinalNewline: boolean;
}

export const defaultJavaFormatterOptions: JavaFormatterOptions = {
  indentType: 'spaces',
  indentSize: 4,
  braceStyle: 'same-line',
  sortImports: true,
  groupImports: true,
  removeDuplicateImports: true,
  spaceBeforeControlParentheses: true,
  spaceAroundOperators: true,
  spaceInsideParentheses: false,
  maxConsecutiveBlankLines: 1,
  blankLinesBetweenMethods: 1,
  normalizeModifiers: true,
  alignSingleLineComments: false,
  trimTrailingWhitespace: true,
  ensureFinalNewline: true,
};

export const googleJavaStyleOptions: JavaFormatterOptions = {
  indentType: 'spaces',
  indentSize: 2,
  braceStyle: 'same-line',
  sortImports: true,
  groupImports: true,
  removeDuplicateImports: true,
  spaceBeforeControlParentheses: true,
  spaceAroundOperators: true,
  spaceInsideParentheses: false,
  maxConsecutiveBlankLines: 1,
  blankLinesBetweenMethods: 1,
  normalizeModifiers: true,
  alignSingleLineComments: false,
  trimTrailingWhitespace: true,
  ensureFinalNewline: true,
};

export const sunJavaStyleOptions: JavaFormatterOptions = {
  indentType: 'spaces',
  indentSize: 4,
  braceStyle: 'same-line',
  sortImports: true,
  groupImports: false,
  removeDuplicateImports: true,
  spaceBeforeControlParentheses: true,
  spaceAroundOperators: true,
  spaceInsideParentheses: false,
  maxConsecutiveBlankLines: 2,
  blankLinesBetweenMethods: 1,
  normalizeModifiers: true,
  alignSingleLineComments: false,
  trimTrailingWhitespace: true,
  ensureFinalNewline: true,
};

export const allmanStyleOptions: JavaFormatterOptions = {
  indentType: 'spaces',
  indentSize: 4,
  braceStyle: 'next-line',
  sortImports: true,
  groupImports: true,
  removeDuplicateImports: true,
  spaceBeforeControlParentheses: true,
  spaceAroundOperators: true,
  spaceInsideParentheses: false,
  maxConsecutiveBlankLines: 1,
  blankLinesBetweenMethods: 1,
  normalizeModifiers: true,
  alignSingleLineComments: false,
  trimTrailingWhitespace: true,
  ensureFinalNewline: true,
};

/**
 * Standard Java modifier order according to Java Language Specification section 8.1.1
 */
const STANDARD_MODIFIER_ORDER = [
  'public',
  'protected',
  'private',
  'abstract',
  'default',
  'static',
  'final',
  'transient',
  'volatile',
  'synchronized',
  'native',
  'strictfp',
];

/**
 * Reorders Java declaration modifiers to match standard Java convention.
 * e.g., "final public static" -> "public static final"
 */
function reorderModifiers(line: string): string {
  // Regex matching class/method/field declaration lines
  const modifierRegex = /^\s*(?:(?:public|protected|private|abstract|default|static|final|transient|volatile|synchronized|native|strictfp)\s+)+/;
  const match = line.match(modifierRegex);
  if (!match) return line;

  const matchedStr = match[0];
  const indentMatch = matchedStr.match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : '';

  const modifiersFound = matchedStr
    .trim()
    .split(/\s+/)
    .filter((m) => STANDARD_MODIFIER_ORDER.includes(m));

  if (modifiersFound.length <= 1) return line;

  // Sort modifiers by standard hierarchy
  modifiersFound.sort(
    (a, b) => STANDARD_MODIFIER_ORDER.indexOf(a) - STANDARD_MODIFIER_ORDER.indexOf(b)
  );

  const reorderedStr = indent + modifiersFound.join(' ') + ' ';
  return line.replace(modifierRegex, reorderedStr);
}

/**
 * Reorganizes import statements in Java code.
 */
function processImports(
  importLines: string[],
  options: JavaFormatterOptions
): string[] {
  if (importLines.length === 0) return [];

  let imports = [...importLines].map((i) => i.trim());

  if (options.removeDuplicateImports) {
    imports = Array.from(new Set(imports));
  }

  if (options.sortImports) {
    imports.sort((a, b) => {
      const isStaticA = a.startsWith('import static');
      const isStaticB = b.startsWith('import static');
      if (isStaticA && !isStaticB) return 1;
      if (!isStaticA && isStaticB) return -1;
      return a.localeCompare(b);
    });
  }

  if (!options.groupImports) {
    return imports;
  }

  // Group imports: java/javax, org/com, static, others
  const javaImports: string[] = [];
  const orgComImports: string[] = [];
  const staticImports: string[] = [];
  const otherImports: string[] = [];

  for (const imp of imports) {
    if (imp.startsWith('import static ')) {
      staticImports.push(imp);
    } else if (imp.startsWith('import java.') || imp.startsWith('import javax.')) {
      javaImports.push(imp);
    } else if (imp.startsWith('import org.') || imp.startsWith('import com.')) {
      orgComImports.push(imp);
    } else {
      otherImports.push(imp);
    }
  }

  const resultGroups: string[][] = [
    javaImports,
    orgComImports,
    otherImports,
    staticImports,
  ].filter((g) => g.length > 0);

  const groupedLines: string[] = [];
  resultGroups.forEach((group, index) => {
    groupedLines.push(...group);
    if (index < resultGroups.length - 1) {
      groupedLines.push(''); // Blank line separator between groups
    }
  });

  return groupedLines;
}

/**
 * Main Java Formatter Logic.
 */
export function formatJavaCode(
  sourceCode: string,
  options: JavaFormatterOptions = defaultJavaFormatterOptions
): string {
  if (!sourceCode.trim()) return '';

  const singleIndent =
    options.indentType === 'tabs' ? '\t' : ' '.repeat(options.indentSize);

  // Split lines
  const rawLines = sourceCode.split(/\r?\n/);
  const formattedLines: string[] = [];
  const importLines: string[] = [];
  let isInImportBlock = false;
  let hasProcessedImports = false;

  let currentIndentLevel = 0;
  let inBlockComment = false;
  let consecutiveBlankLines = 0;

  for (let idx = 0; idx < rawLines.length; idx++) {
    let line = rawLines[idx];

    if (options.trimTrailingWhitespace) {
      line = line.trimEnd();
    }

    const trimmed = line.trim();

    // Check block comment status
    if (trimmed.startsWith('/*')) {
      inBlockComment = true;
    }

    // Handle Import Statements Grouping
    if (!inBlockComment && (trimmed.startsWith('import ') || trimmed.startsWith('import static '))) {
      importLines.push(trimmed);
      isInImportBlock = true;
      continue;
    } else if (isInImportBlock && trimmed === '') {
      // blank line right after imports
      continue;
    } else if (isInImportBlock && !trimmed.startsWith('import ')) {
      isInImportBlock = false;
      if (!hasProcessedImports && importLines.length > 0) {
        const processed = processImports(importLines, options);
        formattedLines.push(...processed);
        formattedLines.push(''); // Blank line after import section
        hasProcessedImports = true;
      }
    }

    // Handle consecutive blank lines
    if (trimmed === '') {
      consecutiveBlankLines++;
      if (consecutiveBlankLines <= options.maxConsecutiveBlankLines) {
        formattedLines.push('');
      }
      continue;
    } else {
      consecutiveBlankLines = 0;
    }

    // Process line content modifications
    let processedLine = trimmed;

    // 1. Normalize Modifiers order
    if (options.normalizeModifiers && !inBlockComment) {
      processedLine = reorderModifiers(processedLine);
    }

    // 2. Control statement parenthesis spacing: if(...) vs if (...)
    if (options.spaceBeforeControlParentheses && !inBlockComment) {
      processedLine = processedLine.replace(
        /\b(if|for|while|switch|catch)\s*\(/g,
        '$1 ('
      );
    } else if (!options.spaceBeforeControlParentheses && !inBlockComment) {
      processedLine = processedLine.replace(
        /\b(if|for|while|switch|catch)\s+\(/g,
        '$1('
      );
    }

    // 3. Space around operators
    if (options.spaceAroundOperators && !inBlockComment) {
      // Equals, arithmetic, logical (avoiding ++, --, ->, ::)
      processedLine = processedLine
        .replace(/([^=<>!+-/*&|^~%])([=+\-*/%&|^]=?|==|!=|<=|>=|&&|\|\|)([^=<>!+-/*&|^~%])/g, '$1 $2 $3')
        .replace(/\s+/g, ' ');
    }

    // 4. Space inside parentheses: ( x ) vs (x)
    if (options.spaceInsideParentheses && !inBlockComment) {
      processedLine = processedLine
        .replace(/\(([^()\s][^()]*)\)/g, '( $1 )')
        .replace(/\(\s+/g, '( ')
        .replace(/\s+\)/g, ' )');
    }

    // 5. Handle Brace Style (K&R vs Allman)
    if (options.braceStyle === 'next-line' && !inBlockComment) {
      // If line ends with '{' and has code before it, split brace to next line
      if (processedLine.length > 1 && processedLine.endsWith('{') && !processedLine.startsWith('{')) {
        const lineWithoutBrace = processedLine.substring(0, processedLine.length - 1).trimEnd();
        
        // Add line before brace
        let openIndent = currentIndentLevel;
        if (lineWithoutBrace.startsWith('}')) {
          openIndent = Math.max(0, currentIndentLevel - 1);
        }
        formattedLines.push(singleIndent.repeat(openIndent) + lineWithoutBrace);
        
        // Place brace on next line
        const closingCount = (lineWithoutBrace.match(/}/g) || []).length;
        const openingCount = (lineWithoutBrace.match(/{/g) || []).length;
        currentIndentLevel += openingCount - closingCount;

        formattedLines.push(singleIndent.repeat(currentIndentLevel) + '{');
        currentIndentLevel++;
        if (inBlockComment && trimmed.endsWith('*/')) inBlockComment = false;
        continue;
      }
    } else if (options.braceStyle === 'same-line' && !inBlockComment) {
      // If line is just '{', attach to previous line if possible
      if (processedLine === '{' && formattedLines.length > 0) {
        const prevIdx = formattedLines.length - 1;
        if (formattedLines[prevIdx].trim() !== '' && !formattedLines[prevIdx].trim().endsWith('{')) {
          formattedLines[prevIdx] = formattedLines[prevIdx] + ' {';
          currentIndentLevel++;
          continue;
        }
      }
    }

    // Calculate Indentation level adjustment
    const closingBraces = (processedLine.match(/}/g) || []).length;
    const openingBraces = (processedLine.match(/{/g) || []).length;

    // If line starts with closing brace, decrease indent BEFORE printing line
    let effectiveIndent = currentIndentLevel;
    if (processedLine.startsWith('}')) {
      effectiveIndent = Math.max(0, currentIndentLevel - 1);
    }

    // Indent the line
    const indentedLine = singleIndent.repeat(effectiveIndent) + processedLine;
    formattedLines.push(indentedLine);

    // Update indent level for subsequent lines
    currentIndentLevel += openingBraces - closingBraces;
    if (currentIndentLevel < 0) currentIndentLevel = 0;

    if (inBlockComment && trimmed.endsWith('*/')) {
      inBlockComment = false;
    }
  }

  // In case imports were at the end of the file
  if (!hasProcessedImports && importLines.length > 0) {
    const processed = processImports(importLines, options);
    formattedLines.unshift(...processed, '');
  }

  let result = formattedLines.join('\n');

  if (options.ensureFinalNewline && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

/**
 * Sample Java source code for quick demonstration.
 */
export const sampleUnformattedJavaCode = `package com.example.service;

import java.util.List;
import static java.util.Collections.sort;
import java.util.ArrayList;
import com.example.model.User;
import java.util.Map;
import java.util.List; // duplicate

final public class UserService {

private final String serviceName;
private int retryCount=3;

public UserService(String serviceName){
this.serviceName=serviceName;
}

final static public User findUserById(  List<User> users,int id  ){
for(User u:users){
if(u.getId()==id){
return u;
}
}
return null;
}

public void processBatch(List<String> items){
if(items!=null&&!items.isEmpty()){
for(String item:items){
System.out.println("Processing item: "+item);
}
}
}
}
`;
