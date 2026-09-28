// Project-wide Java Obfuscation Mapping Manager
// Enables persistence, incremental accumulation, import/export, and collision-free reusability over time

import { JavaObfuscationMapping } from './javaObfuscator';

export interface ProjectMappingProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  mapping: JavaObfuscationMapping;
  history?: Array<{
    id: string;
    timestamp: string;
    mainFile: string;
    testFile: string;
    addedClasses: number;
    addedMethods: number;
    addedVariables: number;
    addedPackages: number;
  }>;
}

export interface MappingParseStats {
  classesCount: number;
  methodsCount: number;
  variablesCount: number;
  packagesCount: number;
  totalCount: number;
}

export interface MappingConflictItem {
  category: 'class' | 'method' | 'variable' | 'package';
  identifier: string;
  currentObfuscated: string;
  importedObfuscated: string;
}

export interface MappingParseResult {
  success: boolean;
  format: 'project-bundle' | 'standard-mapping' | 'flat-dictionary' | 'proguard' | 'unknown';
  projectName?: string;
  mapping: JavaObfuscationMapping;
  stats: MappingParseStats;
  error?: string;
}

export interface MergeResult {
  merged: JavaObfuscationMapping;
  addedCount: number;
  updatedCount: number;
  preservedCount: number;
  conflicts: MappingConflictItem[];
}

export const STORAGE_KEY_PROFILES = 'devhub_java_project_profiles';
export const STORAGE_KEY_ACTIVE_PROJECT_ID = 'devhub_java_active_project_id';

/**
 * Creates an empty, clean JavaObfuscationMapping object.
 */
export function createEmptyMapping(): JavaObfuscationMapping {
  return {
    classes: {},
    variables: {},
    methods: {},
    packages: {},
    reverseMapping: {},
  };
}

/**
 * Deep-clones a mapping to prevent shared object reference mutations.
 */
export function cloneMapping(mapping: JavaObfuscationMapping): JavaObfuscationMapping {
  return {
    classes: { ...mapping.classes },
    variables: { ...mapping.variables },
    methods: { ...mapping.methods },
    packages: { ...mapping.packages },
    reverseMapping: { ...mapping.reverseMapping },
  };
}

/**
 * Ensures reverseMapping has complete Obfuscated -> Original pairs for all categories.
 */
export function rebuildReverseMapping(mapping: JavaObfuscationMapping): void {
  mapping.reverseMapping = {};
  for (const [orig, obf] of Object.entries(mapping.classes)) {
    if (obf) mapping.reverseMapping[obf] = orig;
  }
  for (const [orig, obf] of Object.entries(mapping.methods)) {
    if (obf) mapping.reverseMapping[obf] = orig;
  }
  for (const [orig, obf] of Object.entries(mapping.variables)) {
    if (obf) mapping.reverseMapping[obf] = orig;
  }
  for (const [orig, obf] of Object.entries(mapping.packages)) {
    if (obf) mapping.reverseMapping[obf] = orig;
  }
}

/**
 * Counts non-empty symbols in a mapping.
 */
export function computeMappingStats(mapping: JavaObfuscationMapping): MappingParseStats {
  const classesCount = Object.keys(mapping.classes).length;
  const methodsCount = Object.keys(mapping.methods).length;
  const variablesCount = Object.keys(mapping.variables).length;
  const packagesCount = Object.keys(mapping.packages).length;
  return {
    classesCount,
    methodsCount,
    variablesCount,
    packagesCount,
    totalCount: classesCount + methodsCount + variablesCount + packagesCount,
  };
}

/**
 * Detects conflicts between a base mapping and an incoming mapping.
 */
export function detectMappingConflicts(
  current: JavaObfuscationMapping,
  incoming: JavaObfuscationMapping
): MappingConflictItem[] {
  const conflicts: MappingConflictItem[] = [];

  const checkCategory = (
    cat: 'class' | 'method' | 'variable' | 'package',
    currMap: Record<string, string>,
    inMap: Record<string, string>
  ) => {
    for (const [k, inVal] of Object.entries(inMap)) {
      const currVal = currMap[k];
      if (currVal && currVal !== inVal) {
        conflicts.push({
          category: cat,
          identifier: k,
          currentObfuscated: currVal,
          importedObfuscated: inVal,
        });
      }
    }
  };

  checkCategory('class', current.classes, incoming.classes);
  checkCategory('method', current.methods, incoming.methods);
  checkCategory('variable', current.variables, incoming.variables);
  checkCategory('package', current.packages, incoming.packages);

  return conflicts;
}

/**
 * Merges two mappings with chosen strategy for conflicts ('preserve' or 'overwrite').
 */
export function mergeProjectMappings(
  current: JavaObfuscationMapping,
  incoming: JavaObfuscationMapping,
  strategy: 'preserve' | 'overwrite' = 'preserve'
): MergeResult {
  const conflicts = detectMappingConflicts(current, incoming);
  const merged: JavaObfuscationMapping = cloneMapping(current);

  let addedCount = 0;
  let updatedCount = 0;
  let preservedCount = 0;

  const mergeCategory = (
    mergedMap: Record<string, string>,
    inMap: Record<string, string>
  ) => {
    for (const [k, v] of Object.entries(inMap)) {
      if (!mergedMap[k]) {
        mergedMap[k] = v;
        addedCount++;
      } else if (mergedMap[k] !== v) {
        if (strategy === 'overwrite') {
          mergedMap[k] = v;
          updatedCount++;
        } else {
          preservedCount++;
        }
      }
    }
  };

  mergeCategory(merged.classes, incoming.classes);
  mergeCategory(merged.methods, incoming.methods);
  mergeCategory(merged.variables, incoming.variables);
  mergeCategory(merged.packages, incoming.packages);

  rebuildReverseMapping(merged);

  return {
    merged,
    addedCount,
    updatedCount,
    preservedCount,
    conflicts,
  };
}

/**
 * Parses ProGuard-style mapping file text:
 * com.example.MyClass -> com.example.Cls_1:
 *     int myField -> v_1
 *     void myMethod(int) -> mth_1
 */
function parseProGuardMappingText(text: string): JavaObfuscationMapping {
  const mapping = createEmptyMapping();
  const lines = text.split(/\r?\n/);
  let currentClassOrig = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Class header line: original.Class -> obfuscated.Class:
    const classMatch = line.match(/^([\w$.]+)\s*->\s*([\w$.]+):$/);
    if (classMatch) {
      const origFull = classMatch[1];
      const obfFull = classMatch[2];
      const origSimple = origFull.split('.').pop() || origFull;
      const obfSimple = obfFull.split('.').pop() || obfFull;
      currentClassOrig = origSimple;
      mapping.classes[origSimple] = obfSimple;

      // Check package prefix
      const origPkg = origFull.substring(0, origFull.lastIndexOf('.'));
      const obfPkg = obfFull.substring(0, obfFull.lastIndexOf('.'));
      if (origPkg && obfPkg && origPkg !== obfPkg) {
        origPkg.split('.').forEach((part, i) => {
          const obfPart = obfPkg.split('.')[i];
          if (part && obfPart && part !== obfPart) {
            mapping.packages[part] = obfPart;
          }
        });
      }
      continue;
    }

    // Member line (indented or with ->)
    const memberMatch = line.match(/^(?:[\d:]+)?(?:[\w$<>[\],]+\s+)+([\w$]+)(?:\(.*?\))?\s*->\s*([\w$]+)$/);
    if (memberMatch) {
      const origName = memberMatch[1];
      const obfName = memberMatch[2];
      const isMethod = line.includes('(') && line.includes(')');
      if (isMethod) {
        mapping.methods[origName] = obfName;
      } else {
        mapping.variables[origName] = obfName;
      }
    }
  }

  rebuildReverseMapping(mapping);
  return mapping;
}

/**
 * Parses a flat dictionary { "Original": "Obfuscated" }
 */
function parseFlatDictionary(dict: Record<string, string>): JavaObfuscationMapping {
  const mapping = createEmptyMapping();
  for (const [orig, obf] of Object.entries(dict)) {
    if (!orig || !obf || typeof orig !== 'string' || typeof obf !== 'string') continue;
    if (orig.includes('.')) {
      mapping.packages[orig] = obf;
    } else if (/^[A-Z]/.test(orig)) {
      mapping.classes[orig] = obf;
    } else if (obf.startsWith('m') || obf.startsWith('mth_')) {
      mapping.methods[orig] = obf;
    } else if (obf.startsWith('v') || obf.startsWith('v_')) {
      mapping.variables[orig] = obf;
    } else {
      // Default guess: if camelCase with verbs -> method, else variable
      mapping.methods[orig] = obf;
    }
  }
  rebuildReverseMapping(mapping);
  return mapping;
}

/**
 * Robustly parses and normalizes any mapping input:
 * JSON string, JSON object, ProGuard text, or flat dictionary.
 */
export function parseAndNormalizeMapping(rawInput: string | any): MappingParseResult {
  if (!rawInput) {
    return {
      success: false,
      format: 'unknown',
      mapping: createEmptyMapping(),
      stats: computeMappingStats(createEmptyMapping()),
      error: 'Empty mapping input provided.',
    };
  }

  // 1. If it's a string, try JSON first, then ProGuard text
  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return {
        success: false,
        format: 'unknown',
        mapping: createEmptyMapping(),
        stats: computeMappingStats(createEmptyMapping()),
        error: 'Empty mapping file content.',
      };
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        return parseAndNormalizeMapping(parsedJson);
      } catch (e: any) {
        return {
          success: false,
          format: 'unknown',
          mapping: createEmptyMapping(),
          stats: computeMappingStats(createEmptyMapping()),
          error: `Invalid JSON syntax: ${e.message}`,
        };
      }
    }

    // Check for ProGuard text pattern (contains '->')
    if (trimmed.includes('->')) {
      try {
        const pgMapping = parseProGuardMappingText(trimmed);
        const stats = computeMappingStats(pgMapping);
        if (stats.totalCount > 0) {
          return {
            success: true,
            format: 'proguard',
            mapping: pgMapping,
            stats,
          };
        }
      } catch {
        // Continue to fallback error
      }
    }

    return {
      success: false,
      format: 'unknown',
      mapping: createEmptyMapping(),
      stats: computeMappingStats(createEmptyMapping()),
      error: 'Unrecognized mapping format. Please provide valid JSON or ProGuard .txt mapping.',
    };
  }

  // 2. Parsed object input
  if (typeof rawInput === 'object' && rawInput !== null) {
    // A. Project Bundle: { projectName, mapping: { classes: ... } }
    if (rawInput.mapping && typeof rawInput.mapping === 'object') {
      const inner = rawInput.mapping;
      const normalized: JavaObfuscationMapping = {
        classes: { ...(inner.classes || {}) },
        methods: { ...(inner.methods || {}) },
        variables: { ...(inner.variables || {}) },
        packages: { ...(inner.packages || {}) },
        reverseMapping: { ...(inner.reverseMapping || {}) },
      };
      rebuildReverseMapping(normalized);
      const stats = computeMappingStats(normalized);
      return {
        success: true,
        format: 'project-bundle',
        projectName: rawInput.projectName || rawInput.name,
        mapping: normalized,
        stats,
      };
    }

    // B. Standard JavaObfuscationMapping: has classes / methods / variables / packages keys
    if (
      'classes' in rawInput ||
      'methods' in rawInput ||
      'variables' in rawInput ||
      'packages' in rawInput
    ) {
      const normalized: JavaObfuscationMapping = {
        classes: { ...(rawInput.classes || {}) },
        methods: { ...(rawInput.methods || {}) },
        variables: { ...(rawInput.variables || {}) },
        packages: { ...(rawInput.packages || {}) },
        reverseMapping: { ...(rawInput.reverseMapping || {}) },
      };
      rebuildReverseMapping(normalized);
      const stats = computeMappingStats(normalized);
      return {
        success: true,
        format: 'standard-mapping',
        mapping: normalized,
        stats,
      };
    }

    // C. Flat Dictionary: { "Orig": "Obf", ... }
    const flatDict = parseFlatDictionary(rawInput);
    const stats = computeMappingStats(flatDict);
    if (stats.totalCount > 0) {
      return {
        success: true,
        format: 'flat-dictionary',
        mapping: flatDict,
        stats,
      };
    }
  }

  return {
    success: false,
    format: 'unknown',
    mapping: createEmptyMapping(),
    stats: computeMappingStats(createEmptyMapping()),
    error: 'Unrecognized mapping data structure.',
  };
}

/**
 * Exports project mapping in chosen format:
 * - 'project-bundle': Full JSON with project metadata, timestamps, and stats
 * - 'standard-json': Pure mapping dictionary
 * - 'flat-json': Simple key-value map
 * - 'proguard': Standard ProGuard-compatible text mapping
 */
export function exportMappingContent(
  mapping: JavaObfuscationMapping,
  format: 'project-bundle' | 'standard-json' | 'flat-json' | 'proguard',
  options?: {
    projectName?: string;
    description?: string;
  }
): string {
  const projectName = options?.projectName || 'Java-Project';

  if (format === 'project-bundle') {
    const stats = computeMappingStats(mapping);
    const bundle = {
      version: '2.0',
      generator: 'DevHub Java Class & Test Dual Obfuscator',
      exportedAt: new Date().toISOString(),
      projectName,
      description: options?.description || 'Cumulative synchronized obfuscation mappings for Java classes and tests',
      stats,
      mapping: {
        classes: mapping.classes,
        methods: mapping.methods,
        variables: mapping.variables,
        packages: mapping.packages,
        reverseMapping: mapping.reverseMapping,
      },
    };
    return JSON.stringify(bundle, null, 2);
  }

  if (format === 'standard-json') {
    return JSON.stringify(
      {
        classes: mapping.classes,
        methods: mapping.methods,
        variables: mapping.variables,
        packages: mapping.packages,
        reverseMapping: mapping.reverseMapping,
      },
      null,
      2
    );
  }

  if (format === 'flat-json') {
    const flat: Record<string, string> = {
      ...mapping.packages,
      ...mapping.classes,
      ...mapping.methods,
      ...mapping.variables,
    };
    return JSON.stringify(flat, null, 2);
  }

  // format === 'proguard'
  const lines: string[] = [
    `# ProGuard Compatible Mapping File`,
    `# Project: ${projectName}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Total Symbols: ${computeMappingStats(mapping).totalCount}`,
    '',
  ];

  if (Object.keys(mapping.packages).length > 0) {
    lines.push('# Package Mappings:');
    for (const [orig, obf] of Object.entries(mapping.packages)) {
      lines.push(`# ${orig} -> ${obf}`);
    }
    lines.push('');
  }

  for (const [origCls, obfCls] of Object.entries(mapping.classes)) {
    lines.push(`${origCls} -> ${obfCls}:`);
    for (const [origField, obfField] of Object.entries(mapping.variables)) {
      lines.push(`    Object ${origField} -> ${obfField}`);
    }
    for (const [origMth, obfMth] of Object.entries(mapping.methods)) {
      lines.push(`    void ${origMth}() -> ${obfMth}`);
    }
  }

  return lines.join('\n');
}

/**
 * LocalStorage profile persistence helpers
 */
export function loadStoredProjectProfiles(): ProjectMappingProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => ({
        ...p,
        mapping: {
          classes: p.mapping?.classes || {},
          methods: p.mapping?.methods || {},
          variables: p.mapping?.variables || {},
          packages: p.mapping?.packages || {},
          reverseMapping: p.mapping?.reverseMapping || {},
        },
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredProjectProfiles(profiles: ProjectMappingProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save project profiles to localStorage', e);
  }
}

export function getStoredActiveProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT_ID);
  } catch {
    return null;
  }
}

export function saveStoredActiveProjectId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT_ID, id);
  } catch {
    // Ignore storage errors
  }
}
