/**
 * Data Set Matcher & Comparator Utility
 * Compares two distinct sets of tabular data (CSV, TSV, space-separated, custom delimited).
 * Supports scrambled/reordered headers, extra/missing columns in either dataset,
 * single or composite key comparison, value tolerance/normalization rules,
 * cell-level discrepancy highlighting, and automated SQL reconciliation generators.
 */

export type DelimiterChoice = 'auto' | 'comma' | 'tab' | 'space' | 'semicolon' | 'pipe';

export type RowMatchStatus = 'EXACT_MATCH' | 'VALUE_MISMATCH' | 'ONLY_IN_A' | 'ONLY_IN_B' | 'DUPLICATE_KEY';

export interface ColumnMapping {
  key: string;              // Normalized canonical column identifier
  headerA: string | null;   // Header as written in Dataset A (or null if missing in A)
  headerB: string | null;   // Header as written in Dataset B (or null if missing in B)
  indexA: number;           // Column index in A (-1 if missing)
  indexB: number;           // Column index in B (-1 if missing)
  isKey: boolean;           // Whether this column is part of the comparison Primary Key
  isCompared: boolean;      // Whether this column should be compared for values
}

export interface CellDiff {
  columnKey: string;
  headerName: string;
  valueA: string | null;
  valueB: string | null;
  isEqual: boolean;
  reason?: string;
}

export interface MatchedRow {
  rowId: string;
  keyValue: string;
  status: RowMatchStatus;
  rowNumberA: number | null; // 1-based original row index in A
  rowNumberB: number | null; // 1-based original row index in B
  dataA: Record<string, string> | null;
  dataB: Record<string, string> | null;
  cellDiffs: Record<string, CellDiff>;
  mismatchCount: number;
}

export interface ColumnMismatchStat {
  columnKey: string;
  headerName: string;
  mismatchCount: number;
  matchCount: number;
  missingInACount: number;
  missingInBCount: number;
}

export interface DataSetMatcherConfig {
  keyColumns: string[];               // Canonical keys chosen for primary key comparison
  ignoredColumns: string[];           // Columns explicitly excluded from value comparison
  delimiterA: DelimiterChoice;
  delimiterB: DelimiterChoice;
  caseSensitiveHeaders: boolean;      // Case sensitivity when matching header names
  normalizeHeaderNames: boolean;      // Strip underscores/spaces (e.g. "cust_id" matches "Cust Id")
  ignoreValueCase: boolean;           // Case insensitive value comparison ('Active' == 'active')
  trimValues: boolean;                // Trim whitespace (' foo ' == 'foo')
  numericTolerance: boolean;          // Numeric comparison (10.00 == 10.0)
  numericEpsilon: number;             // E.g. 0.0001
  normalizeDates: boolean;            // Auto-detect & normalize DD/MM/YYYY vs YYYY-MM-DD
  treatNullAndEmptyAsEqual: boolean;  // "" == NULL == null == N/A
  tableNameForSql: string;            // Table name used when generating reconciliation SQL
}

export interface DataSetComparisonResult {
  summary: {
    totalRecordsEvaluated: number;
    totalRowsA: number;
    totalRowsB: number;
    exactMatches: number;
    valueMismatches: number;
    onlyInA: number;
    onlyInB: number;
    duplicateKeysA: number;
    duplicateKeysB: number;
    matchPercentage: number;
    detectedDelimiterA: string;
    detectedDelimiterB: string;
  };
  columnMappings: ColumnMapping[];
  commonColumns: string[];
  onlyInAColumns: string[];
  onlyInBColumns: string[];
  rows: MatchedRow[];
  columnStats: ColumnMismatchStat[];
  warnings: string[];
}

export const DEFAULT_DATA_SET_MATCHER_CONFIG: DataSetMatcherConfig = {
  keyColumns: [],
  ignoredColumns: [],
  delimiterA: 'auto',
  delimiterB: 'auto',
  caseSensitiveHeaders: false,
  normalizeHeaderNames: true,
  ignoreValueCase: false,
  trimValues: true,
  numericTolerance: true,
  numericEpsilon: 0.0001,
  normalizeDates: true,
  treatNullAndEmptyAsEqual: true,
  tableNameForSql: 'target_table',
};

export const DEFAULT_MATCHER_CONFIG = DEFAULT_DATA_SET_MATCHER_CONFIG;

/**
 * Detect delimiter in text (sample first few non-empty lines).
 */
export function detectDelimiter(text: string): { delimiter: string; type: DelimiterChoice; name: string } {
  if (!text || !text.trim()) {
    return { delimiter: ',', type: 'comma', name: 'Comma (,)' };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'))
    .slice(0, 15);

  if (lines.length === 0) {
    return { delimiter: ',', type: 'comma', name: 'Comma (,)' };
  }

  const candidates: { delimiter: string; type: DelimiterChoice; name: string }[] = [
    { delimiter: '\t', type: 'tab', name: 'Tab (\\t)' },
    { delimiter: ',', type: 'comma', name: 'Comma (,)' },
    { delimiter: ';', type: 'semicolon', name: 'Semicolon (;)' },
    { delimiter: '|', type: 'pipe', name: 'Pipe (|)' },
  ];

  let bestScore = -1;
  let bestCandidate = candidates[1];

  for (const cand of candidates) {
    const counts = lines.map((line) => {
      let inQuote = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuote = !inQuote;
        else if (!inQuote && ch === cand.delimiter) count++;
      }
      return count;
    });

    const firstCount = counts[0];
    if (firstCount > 0) {
      const isConsistent = counts.every((c) => c === firstCount);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const score = (isConsistent ? 100 : 20) + avg * 2;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }
  }

  // Check if whitespace/space-separated
  if (bestScore < 10) {
    const spaceCounts = lines.map((line) => line.split(/\s+/).filter(Boolean).length);
    if (spaceCounts.length > 0 && spaceCounts[0] > 1 && spaceCounts.every((c) => Math.abs(c - spaceCounts[0]) <= 1)) {
      return { delimiter: ' ', type: 'space', name: 'Space / Whitespace' };
    }
  }

  return bestCandidate;
}

/**
 * Parse delimited text lines safely considering quotation marks and delimiters.
 */
export function parseDelimitedText(
  text: string,
  chosenDelimiter: DelimiterChoice
): { headers: string[]; rows: string[][]; detectedDelimiter: string } {
  if (!text || !text.trim()) {
    return { headers: [], rows: [], detectedDelimiter: ',' };
  }

  let delimiterChar = ',';
  if (chosenDelimiter === 'auto') {
    const detected = detectDelimiter(text);
    delimiterChar = detected.delimiter;
  } else if (chosenDelimiter === 'tab') {
    delimiterChar = '\t';
  } else if (chosenDelimiter === 'space') {
    delimiterChar = ' ';
  } else if (chosenDelimiter === 'semicolon') {
    delimiterChar = ';';
  } else if (chosenDelimiter === 'pipe') {
    delimiterChar = '|';
  } else {
    delimiterChar = ',';
  }

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'));
  if (rawLines.length === 0) {
    return { headers: [], rows: [], detectedDelimiter: delimiterChar };
  }

  const parseLine = (line: string): string[] => {
    if (delimiterChar === ' ') {
      // Space separated
      return line.split(/\s+/).map((s) => s.replace(/^"(.*)"$/, '$1'));
    }

    const items: string[] = [];
    let cur = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (!inQuote && ch === delimiterChar) {
        items.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    items.push(cur.trim());
    return items;
  };

  const parsedLines = rawLines.map(parseLine);
  const headers = (parsedLines[0] || []).map((h) => h.replace(/^"(.*)"$/, '$1').trim());
  const rows = parsedLines.slice(1);

  return {
    headers,
    rows,
    detectedDelimiter: delimiterChar === '\t' ? '\\t' : delimiterChar === ' ' ? 'space' : delimiterChar,
  };
}

/**
 * Normalize header name to canonical key.
 * e.g., "Customer_Id" -> "customer_id", or with normalizeHeaderNames -> "customerid".
 */
export function toCanonicalHeaderKey(header: string, caseSensitive: boolean, normalize: boolean): string {
  let res = header.trim();
  if (!caseSensitive) {
    res = res.toLowerCase();
  }
  if (normalize) {
    res = res.replace(/[\s_\-]+/g, '').toLowerCase();
  }
  return res;
}

/**
 * Normalize date strings (DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD) for equivalence checking.
 */
function tryNormalizeDate(val: string): string | null {
  const trimmed = val.trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const time = dmyMatch[4] ? ` ${dmyMatch[4]}` : '';
    return `${year}-${month}-${day}${time}`;
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    const time = isoMatch[4] ? ` ${isoMatch[4]}` : '';
    return `${year}-${month}-${day}${time}`;
  }

  return null;
}

/**
 * Compare two cell values based on user configuration.
 */
export function areValuesEqual(
  valA: string | null | undefined,
  valB: string | null | undefined,
  config: DataSetMatcherConfig
): { isEqual: boolean; reason?: string } {
  let a = valA ?? '';
  let b = valB ?? '';

  if (config.trimValues) {
    a = a.trim();
    b = b.trim();
  }

  // Null/Empty equivalence
  if (config.treatNullAndEmptyAsEqual) {
    const isNullLike = (s: string) => {
      const lower = s.toLowerCase();
      return lower === '' || lower === 'null' || lower === 'none' || lower === 'n/a' || lower === 'undefined' || lower === 'nil';
    };
    if (isNullLike(a) && isNullLike(b)) {
      return { isEqual: true, reason: 'both null/empty' };
    }
  }

  // Exact string match
  if (a === b) {
    return { isEqual: true };
  }

  // Case-insensitive check
  if (config.ignoreValueCase) {
    if (a.toLowerCase() === b.toLowerCase()) {
      return { isEqual: true, reason: 'case-insensitive match' };
    }
  }

  // Numeric tolerance comparison
  if (config.numericTolerance) {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB) && a !== '' && b !== '') {
      if (Math.abs(numA - numB) <= config.numericEpsilon) {
        return { isEqual: true, reason: 'numeric match within tolerance' };
      }
    }
  }

  // Date normalization comparison
  if (config.normalizeDates) {
    const dateA = tryNormalizeDate(a);
    const dateB = tryNormalizeDate(b);
    if (dateA && dateB && dateA === dateB) {
      return { isEqual: true, reason: 'date normalized match' };
    }
  }

  return { isEqual: false, reason: 'value difference' };
}

/**
 * Build column mappings between Dataset A and Dataset B.
 */
export function buildColumnMappings(
  headersA: string[],
  headersB: string[],
  config: DataSetMatcherConfig
): {
  mappings: ColumnMapping[];
  commonKeys: string[];
  onlyInAKeys: string[];
  onlyInBKeys: string[];
} {
  const mapA = new Map<string, { header: string; index: number }>();
  headersA.forEach((h, idx) => {
    const canon = toCanonicalHeaderKey(h, config.caseSensitiveHeaders, config.normalizeHeaderNames);
    if (!mapA.has(canon)) {
      mapA.set(canon, { header: h, index: idx });
    }
  });

  const mapB = new Map<string, { header: string; index: number }>();
  headersB.forEach((h, idx) => {
    const canon = toCanonicalHeaderKey(h, config.caseSensitiveHeaders, config.normalizeHeaderNames);
    if (!mapB.has(canon)) {
      mapB.set(canon, { header: h, index: idx });
    }
  });

  const allCanonKeys = Array.from(new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]));

  const mappings: ColumnMapping[] = [];
  const commonKeys: string[] = [];
  const onlyInAKeys: string[] = [];
  const onlyInBKeys: string[] = [];

  for (const canon of allCanonKeys) {
    const entryA = mapA.get(canon);
    const entryB = mapB.get(canon);

    const isCommon = Boolean(entryA && entryB);
    const isKey = config.keyColumns.includes(canon);
    const isIgnored = config.ignoredColumns.includes(canon);

    if (entryA && entryB) {
      commonKeys.push(canon);
    } else if (entryA && !entryB) {
      onlyInAKeys.push(canon);
    } else if (!entryA && entryB) {
      onlyInBKeys.push(canon);
    }

    mappings.push({
      key: canon,
      headerA: entryA ? entryA.header : null,
      headerB: entryB ? entryB.header : null,
      indexA: entryA ? entryA.index : -1,
      indexB: entryB ? entryB.index : -1,
      isKey,
      isCompared: isCommon && !isKey && !isIgnored,
    });
  }

  // Sort mappings so keys come first, then common columns, then only in A, then only in B
  mappings.sort((a, b) => {
    if (a.isKey && !b.isKey) return -1;
    if (!a.isKey && b.isKey) return 1;
    const aCommon = a.headerA && a.headerB;
    const bCommon = b.headerA && b.headerB;
    if (aCommon && !bCommon) return -1;
    if (!aCommon && bCommon) return 1;
    return (a.headerA || a.headerB || '').localeCompare(b.headerA || b.headerB || '');
  });

  return {
    mappings,
    commonKeys,
    onlyInAKeys,
    onlyInBKeys,
  };
}

/**
 * Auto-detect likely primary key columns from headers.
 */
export function detectDefaultKeyColumns(headersA: string[], headersB: string[], config: DataSetMatcherConfig): string[] {
  const { mappings } = buildColumnMappings(headersA, headersB, config);
  const common = mappings.filter((m) => m.headerA && m.headerB);

  // Look for columns containing 'id', 'key', 'code', 'uuid', or the first column
  const idCol = common.find((m) => {
    const h = (m.headerA || '').toLowerCase();
    return h === 'id' || h.endsWith('_id') || h.endsWith('id') || h === 'uuid' || h === 'code' || h === 'key';
  });

  if (idCol) {
    return [idCol.key];
  }

  if (common.length > 0) {
    return [common[0].key];
  }

  return [];
}

/**
 * Main Data Set Matcher Engine.
 */
export function matchDataSets(
  rawTextA: string,
  rawTextB: string,
  config: DataSetMatcherConfig
): DataSetComparisonResult {
  const parsedA = parseDelimitedText(rawTextA, config.delimiterA);
  const parsedB = parseDelimitedText(rawTextB, config.delimiterB);

  // Determine column mappings
  const { mappings, commonKeys, onlyInAKeys, onlyInBKeys } = buildColumnMappings(
    parsedA.headers,
    parsedB.headers,
    config
  );

  // Determine active key columns
  let effectiveKeyColumns = config.keyColumns;
  if (effectiveKeyColumns.length === 0) {
    effectiveKeyColumns = detectDefaultKeyColumns(parsedA.headers, parsedB.headers, config);
  }

  const warnings: string[] = [];
  if (effectiveKeyColumns.length === 0) {
    warnings.push('No common key column found between datasets. Select at least one column as the matching key.');
  }

  // Create Key Index for Dataset A
  const rowsByKeyA = new Map<string, { rowNumber: number; data: Record<string, string>; rawRow: string[] }[]>();
  const duplicateKeysA = new Set<string>();

  parsedA.rows.forEach((row, rowIdx) => {
    const rowObj: Record<string, string> = {};
    parsedA.headers.forEach((h, colIdx) => {
      const canon = toCanonicalHeaderKey(h, config.caseSensitiveHeaders, config.normalizeHeaderNames);
      rowObj[canon] = row[colIdx] ?? '';
    });

    const keyVal = effectiveKeyColumns.map((k) => rowObj[k] ?? '').join('::');
    if (!rowsByKeyA.has(keyVal)) {
      rowsByKeyA.set(keyVal, []);
    } else {
      duplicateKeysA.add(keyVal);
    }
    rowsByKeyA.get(keyVal)!.push({ rowNumber: rowIdx + 2, data: rowObj, rawRow: row });
  });

  // Create Key Index for Dataset B
  const rowsByKeyB = new Map<string, { rowNumber: number; data: Record<string, string>; rawRow: string[] }[]>();
  const duplicateKeysB = new Set<string>();

  parsedB.rows.forEach((row, rowIdx) => {
    const rowObj: Record<string, string> = {};
    parsedB.headers.forEach((h, colIdx) => {
      const canon = toCanonicalHeaderKey(h, config.caseSensitiveHeaders, config.normalizeHeaderNames);
      rowObj[canon] = row[colIdx] ?? '';
    });

    const keyVal = effectiveKeyColumns.map((k) => rowObj[k] ?? '').join('::');
    if (!rowsByKeyB.has(keyVal)) {
      rowsByKeyB.set(keyVal, []);
    } else {
      duplicateKeysB.add(keyVal);
    }
    rowsByKeyB.get(keyVal)!.push({ rowNumber: rowIdx + 2, data: rowObj, rawRow: row });
  });

  if (duplicateKeysA.size > 0) {
    warnings.push(`Dataset A contains ${duplicateKeysA.size} duplicate key value(s): ${Array.from(duplicateKeysA).slice(0, 3).join(', ')}${duplicateKeysA.size > 3 ? '...' : ''}`);
  }
  if (duplicateKeysB.size > 0) {
    warnings.push(`Dataset B contains ${duplicateKeysB.size} duplicate key value(s): ${Array.from(duplicateKeysB).slice(0, 3).join(', ')}${duplicateKeysB.size > 3 ? '...' : ''}`);
  }

  const allDistinctKeys = Array.from(new Set([...Array.from(rowsByKeyA.keys()), ...Array.from(rowsByKeyB.keys())]));

  // Comparison columns are common columns that are NOT keys and NOT ignored
  const compareColumns = mappings.filter((m) => m.headerA && m.headerB && !effectiveKeyColumns.includes(m.key) && !config.ignoredColumns.includes(m.key));

  const matchedRows: MatchedRow[] = [];
  const colStatsMap = new Map<string, { mismatchCount: number; matchCount: number; missingInACount: number; missingInBCount: number }>();

  mappings.forEach((m) => {
    colStatsMap.set(m.key, { mismatchCount: 0, matchCount: 0, missingInACount: 0, missingInBCount: 0 });
  });

  let exactMatches = 0;
  let valueMismatches = 0;
  let onlyInACount = 0;
  let onlyInBCount = 0;

  for (const keyVal of allDistinctKeys) {
    const entriesA = rowsByKeyA.get(keyVal);
    const entriesB = rowsByKeyB.get(keyVal);

    if (entriesA && entriesB) {
      // Row exists in both A and B
      const firstA = entriesA[0];
      const firstB = entriesB[0];
      const cellDiffs: Record<string, CellDiff> = {};
      let rowMismatchCount = 0;

      // Check all mapped columns
      for (const m of mappings) {
        const valA = m.headerA ? firstA.data[m.key] : null;
        const valB = m.headerB ? firstB.data[m.key] : null;

        if (m.headerA && !m.headerB) {
          colStatsMap.get(m.key)!.missingInBCount++;
          cellDiffs[m.key] = {
            columnKey: m.key,
            headerName: m.headerA,
            valueA: valA,
            valueB: null,
            isEqual: false,
            reason: 'missing in dataset B',
          };
          continue;
        }

        if (!m.headerA && m.headerB) {
          colStatsMap.get(m.key)!.missingInACount++;
          cellDiffs[m.key] = {
            columnKey: m.key,
            headerName: m.headerB,
            valueA: null,
            valueB: valB,
            isEqual: false,
            reason: 'missing in dataset A',
          };
          continue;
        }

        // Column exists in both
        if (effectiveKeyColumns.includes(m.key)) {
          // Key column always matches by definition of joining on key
          cellDiffs[m.key] = {
            columnKey: m.key,
            headerName: m.headerA || m.headerB || m.key,
            valueA: valA,
            valueB: valB,
            isEqual: true,
          };
          colStatsMap.get(m.key)!.matchCount++;
          continue;
        }

        if (config.ignoredColumns.includes(m.key)) {
          cellDiffs[m.key] = {
            columnKey: m.key,
            headerName: m.headerA || m.headerB || m.key,
            valueA: valA,
            valueB: valB,
            isEqual: true,
            reason: 'ignored column',
          };
          continue;
        }

        // Compare values
        const comparison = areValuesEqual(valA, valB, config);
        cellDiffs[m.key] = {
          columnKey: m.key,
          headerName: m.headerA || m.headerB || m.key,
          valueA: valA,
          valueB: valB,
          isEqual: comparison.isEqual,
          reason: comparison.reason,
        };

        if (comparison.isEqual) {
          colStatsMap.get(m.key)!.matchCount++;
        } else {
          colStatsMap.get(m.key)!.mismatchCount++;
          rowMismatchCount++;
        }
      }

      const status: RowMatchStatus = rowMismatchCount > 0 ? 'VALUE_MISMATCH' : 'EXACT_MATCH';
      if (status === 'EXACT_MATCH') exactMatches++;
      else valueMismatches++;

      matchedRows.push({
        rowId: `row-${matchedRows.length + 1}`,
        keyValue: keyVal,
        status,
        rowNumberA: firstA.rowNumber,
        rowNumberB: firstB.rowNumber,
        dataA: firstA.data,
        dataB: firstB.data,
        cellDiffs,
        mismatchCount: rowMismatchCount,
      });
    } else if (entriesA && !entriesB) {
      // Row only in Dataset A
      onlyInACount++;
      const firstA = entriesA[0];
      const cellDiffs: Record<string, CellDiff> = {};

      for (const m of mappings) {
        const valA = m.headerA ? firstA.data[m.key] : null;
        cellDiffs[m.key] = {
          columnKey: m.key,
          headerName: m.headerA || m.headerB || m.key,
          valueA: valA,
          valueB: null,
          isEqual: false,
          reason: 'row missing in dataset B',
        };
      }

      matchedRows.push({
        rowId: `row-${matchedRows.length + 1}`,
        keyValue: keyVal,
        status: 'ONLY_IN_A',
        rowNumberA: firstA.rowNumber,
        rowNumberB: null,
        dataA: firstA.data,
        dataB: null,
        cellDiffs,
        mismatchCount: compareColumns.length,
      });
    } else if (!entriesA && entriesB) {
      // Row only in Dataset B
      onlyInBCount++;
      const firstB = entriesB[0];
      const cellDiffs: Record<string, CellDiff> = {};

      for (const m of mappings) {
        const valB = m.headerB ? firstB.data[m.key] : null;
        cellDiffs[m.key] = {
          columnKey: m.key,
          headerName: m.headerA || m.headerB || m.key,
          valueA: null,
          valueB: valB,
          isEqual: false,
          reason: 'row missing in dataset A',
        };
      }

      matchedRows.push({
        rowId: `row-${matchedRows.length + 1}`,
        keyValue: keyVal,
        status: 'ONLY_IN_B',
        rowNumberA: null,
        rowNumberB: firstB.rowNumber,
        dataA: null,
        dataB: firstB.data,
        cellDiffs,
        mismatchCount: compareColumns.length,
      });
    }
  }

  const columnStats: ColumnMismatchStat[] = mappings.map((m) => {
    const stat = colStatsMap.get(m.key) || { mismatchCount: 0, matchCount: 0, missingInACount: 0, missingInBCount: 0 };
    return {
      columnKey: m.key,
      headerName: m.headerA || m.headerB || m.key,
      mismatchCount: stat.mismatchCount,
      matchCount: stat.matchCount,
      missingInACount: stat.missingInACount,
      missingInBCount: stat.missingInBCount,
    };
  });

  const totalEvaluated = matchedRows.length;
  const matchPercentage = totalEvaluated > 0 ? Math.round((exactMatches / totalEvaluated) * 1000) / 10 : 100;

  return {
    summary: {
      totalRecordsEvaluated: totalEvaluated,
      totalRowsA: parsedA.rows.length,
      totalRowsB: parsedB.rows.length,
      exactMatches,
      valueMismatches,
      onlyInA: onlyInACount,
      onlyInB: onlyInBCount,
      duplicateKeysA: duplicateKeysA.size,
      duplicateKeysB: duplicateKeysB.size,
      matchPercentage,
      detectedDelimiterA: parsedA.detectedDelimiter,
      detectedDelimiterB: parsedB.detectedDelimiter,
    },
    columnMappings: mappings,
    commonColumns: commonKeys,
    onlyInAColumns: onlyInAKeys,
    onlyInBColumns: onlyInBKeys,
    rows: matchedRows,
    columnStats,
    warnings,
  };
}

/**
 * Generate automated SQL reconciliation script (UPDATE and INSERT) to synchronize target with source.
 */
export function generateReconciliationSql(
  result: DataSetComparisonResult,
  tableName: string = 'target_table',
  direction: 'update_b_to_match_a' | 'update_a_to_match_b' = 'update_b_to_match_a'
): string {
  const lines: string[] = [];
  lines.push(`-- ====================================================================`);
  lines.push(`-- Automated SQL Reconciliation Script`);
  lines.push(`-- Target Table: ${tableName}`);
  lines.push(`-- Direction: ${direction === 'update_b_to_match_a' ? 'Sync Dataset B -> Dataset A (Make B match A)' : 'Sync Dataset A -> Dataset B (Make A match B)'}`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Discrepancies to update: ${result.summary.valueMismatches}`);
  lines.push(`-- Missing records to insert: ${direction === 'update_b_to_match_a' ? result.summary.onlyInA : result.summary.onlyInB}`);
  lines.push(`-- ====================================================================`);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  const keyCols = result.columnMappings.filter((m) => m.isKey);
  const escapeSql = (val: string | null) => {
    if (val === null || val === undefined || val === '') return 'NULL';
    if (!isNaN(Number(val)) && !val.includes('-') && !val.includes('/')) return val;
    return `'${val.replace(/'/g, "''")}'`;
  };

  // Section 1: Updates for Mismatched Rows
  const mismatchRows = result.rows.filter((r) => r.status === 'VALUE_MISMATCH');
  if (mismatchRows.length > 0) {
    lines.push(`-- 1. UPDATE DISCREPANT RECORDS (${mismatchRows.length} rows)`);
    for (const row of mismatchRows) {
      const setClauses: string[] = [];
      for (const [colKey, diff] of Object.entries(row.cellDiffs)) {
        if (!diff.isEqual && diff.valueA !== null && diff.valueB !== null) {
          const colName = diff.headerName;
          const targetVal = direction === 'update_b_to_match_a' ? diff.valueA : diff.valueB;
          setClauses.push(`${colName} = ${escapeSql(targetVal)}`);
        }
      }

      if (setClauses.length > 0) {
        const whereClauses = keyCols.map((k) => {
          const colName = k.headerA || k.headerB || k.key;
          const keyVal = direction === 'update_b_to_match_a' ? row.dataA?.[k.key] : row.dataB?.[k.key];
          return `${colName} = ${escapeSql(keyVal || '')}`;
        });

        lines.push(`UPDATE ${tableName}`);
        lines.push(`SET ${setClauses.join(', ')}`);
        lines.push(`WHERE ${whereClauses.join(' AND ')};`);
      }
    }
    lines.push('');
  }

  // Section 2: Inserts for Missing Records
  const missingRows = direction === 'update_b_to_match_a'
    ? result.rows.filter((r) => r.status === 'ONLY_IN_A')
    : result.rows.filter((r) => r.status === 'ONLY_IN_B');

  if (missingRows.length > 0) {
    lines.push(`-- 2. INSERT MISSING RECORDS (${missingRows.length} rows)`);
    for (const row of missingRows) {
      const data = direction === 'update_b_to_match_a' ? row.dataA : row.dataB;
      if (!data) continue;

      const cols: string[] = [];
      const vals: string[] = [];

      for (const m of result.columnMappings) {
        if (m.headerA && m.headerB) {
          const colName = m.headerA || m.headerB;
          cols.push(colName);
          vals.push(escapeSql(data[m.key] ?? null));
        }
      }

      if (cols.length > 0) {
        lines.push(`INSERT INTO ${tableName} (${cols.join(', ')})`);
        lines.push(`VALUES (${vals.join(', ')});`);
      }
    }
    lines.push('');
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

/**
 * Export Diff to CSV.
 */
export function exportDiffToCsv(result: DataSetComparisonResult): string {
  const keyNames = result.columnMappings.filter((m) => m.isKey).map((m) => m.headerA || m.headerB || m.key).join('::');
  const headers = ['Status', 'Key', 'Row_in_A', 'Row_in_B', 'Mismatched_Columns'];

  const rows = result.rows.map((row) => {
    const mismatchCols = Object.entries(row.cellDiffs)
      .filter(([_, diff]) => !diff.isEqual)
      .map(([_, diff]) => `${diff.headerName} (A: "${diff.valueA ?? 'NULL'}" vs B: "${diff.valueB ?? 'NULL'}")`)
      .join('; ');

    return [
      row.status,
      `"${row.keyValue.replace(/"/g, '""')}"`,
      row.rowNumberA ?? 'N/A',
      row.rowNumberB ?? 'N/A',
      `"${mismatchCols.replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export Diff to Markdown Table.
 */
export function exportDiffToMarkdown(result: DataSetComparisonResult): string {
  const lines: string[] = [];
  lines.push(`### Data Comparison Summary`);
  lines.push(`- **Match Rate:** ${result.summary.matchPercentage}%`);
  lines.push(`- **Exact Matches:** ${result.summary.exactMatches}`);
  lines.push(`- **Value Mismatches:** ${result.summary.valueMismatches}`);
  lines.push(`- **Only in Dataset A:** ${result.summary.onlyInA}`);
  lines.push(`- **Only in Dataset B:** ${result.summary.onlyInB}`);
  lines.push('');
  lines.push('| Status | Key | Row A | Row B | Discrepancies |');
  lines.push('| :--- | :--- | :--- | :--- | :--- |');

  for (const row of result.rows) {
    const diffs = Object.entries(row.cellDiffs)
      .filter(([_, d]) => !d.isEqual)
      .map(([_, d]) => `\`${d.headerName}\`: A=\`${d.valueA ?? 'NULL'}\` | B=\`${d.valueB ?? 'NULL'}\``)
      .join('<br>');

    lines.push(`| **${row.status}** | \`${row.keyValue}\` | ${row.rowNumberA ?? '-'} | ${row.rowNumberB ?? '-'} | ${diffs || '*(Identical)*'} |`);
  }

  return lines.join('\n');
}

/**
 * Built-in Sample Datasets for Testing & Instant Demos.
 */
export const SAMPLE_DATASETS = {
  ecommerce: {
    name: 'E-Commerce Orders (Scrambled Headers & Mismatches)',
    description: 'Dataset A is CSV from PostgreSQL, Dataset B is TSV from Warehouse with different header order and missing columns.',
    dataA: `order_id,customer_name,email,order_status,total_amount,order_date
1001,Alice Smith,alice@example.com,DELIVERED,150.00,24/10/2023
1002,Bob Jones,bob@example.com,SHIPPED,49.99,25/10/2023
1003,Carol White,carol@example.com,PENDING,210.50,26/10/2023
1004,David Brown,david@example.com,CANCELLED,0.00,27/10/2023
1005,Emma Wilson,emma@example.com,DELIVERED,88.20,28/10/2023`,
    dataB: `total_amount\torder_id\torder_status\tcustomer_name\tcarrier\temail
150.0\t1001\tdelivered\tAlice Smith\tFedEx\talice@example.com
49.99\t1002\tSHIPPED\tBob Jones\tUPS\tbob@example.com
199.00\t1003\tPROCESSING\tCarol White\tDHL\tcarol@example.com
0\t1004\tCANCELLED\tDavid Brown\tN/A\tdavid@example.com
320.00\t1006\tSHIPPED\tFrank Green\tUSPS\tfrank@example.com`,
  },
  userAccounts: {
    name: 'User Database vs Authentication Log (CSV vs Space)',
    description: 'Comparing user profile database records with external active directory extract.',
    dataA: `user_id,full_name,role,department,is_active
USR-101,John Doe,Admin,Engineering,true
USR-102,Jane Roe,Developer,Engineering,true
USR-103,Sam Smith,Manager,Sales,false
USR-104,Kelly Green,Analyst,Finance,true`,
    dataB: `department role is_active full_name user_id
Engineering Admin true John Doe USR-101
Engineering Lead true Jane Roe USR-102
Sales Manager true Sam Smith USR-103
Marketing Specialist true Lucas Vance USR-105`,
  },
};
