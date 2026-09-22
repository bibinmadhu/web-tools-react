/**
 * Data Grid Converter Utility
 * Robust parsing for CSV, TSV, Space-separated, Pipe, Semicolon and custom delimited data.
 * Supports auto-detection of delimiters, quote escaping, grid transformations,
 * column-level data extraction, and multi-format exports (CSV, TSV, JSON, Markdown, SQL, HTML, LaTeX, ASCII, YAML).
 */

export type DelimiterType = 'auto' | 'comma' | 'tab' | 'space' | 'semicolon' | 'pipe' | 'colon' | 'custom';

export interface DataGridParseOptions {
  delimiter: DelimiterType;
  customDelimiter?: string;
  hasHeader: boolean;
  trimCells: boolean;
  collapseSpaces: boolean;
  skipEmptyLines: boolean;
  ignoreComments: boolean;
  commentPrefix?: string;
}

export interface ColumnStats {
  name: string;
  index: number;
  type: 'integer' | 'decimal' | 'boolean' | 'date' | 'text';
  totalCount: number;
  nonEmptyCount: number;
  uniqueCount: number;
  emptyCount: number;
  numericStats?: {
    sum: number;
    avg: number;
    min: number;
    max: number;
  };
}

export interface DataGridModel {
  headers: string[];
  rows: string[][];
  detectedDelimiter?: string;
  totalRows: number;
  totalCols: number;
}

export type ExportFormat =
  | 'grid'
  | 'csv'
  | 'tsv'
  | 'json_objects'
  | 'json_arrays'
  | 'markdown'
  | 'sql_insert'
  | 'html'
  | 'latex'
  | 'ascii'
  | 'yaml';

export type ColumnCopyFormat =
  | 'newline'
  | 'comma'
  | 'comma_space'
  | 'single_quote_sql'
  | 'double_quote'
  | 'json_array'
  | 'unique_newline'
  | 'unique_comma';

/**
 * Auto-detect the most probable delimiter in tabular text.
 */
export function detectDelimiter(text: string): { delimiter: string; type: DelimiterType; name: string } {
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

  // Candidate delimiters
  const candidates: { delimiter: string; type: DelimiterType; name: string }[] = [
    { delimiter: '\t', type: 'tab', name: 'Tab (\\t)' },
    { delimiter: ',', type: 'comma', name: 'Comma (,)' },
    { delimiter: ';', type: 'semicolon', name: 'Semicolon (;)' },
    { delimiter: '|', type: 'pipe', name: 'Pipe (|)' },
    { delimiter: ':', type: 'colon', name: 'Colon (:)' },
  ];

  let bestScore = -1;
  let bestCandidate = candidates[1]; // default comma

  for (const cand of candidates) {
    const counts = lines.map((line) => {
      // count occurrences outside of double quotes
      let inQuote = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (!inQuote && ch === cand.delimiter) {
          count++;
        }
      }
      return count;
    });

    const firstCount = counts[0];
    if (firstCount > 0) {
      // Check consistency across sampled lines
      const isConsistent = counts.every((c) => c === firstCount);
      const average = counts.reduce((a, b) => a + b, 0) / counts.length;
      const score = (isConsistent ? 100 : 20) + average * 2;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }
  }

  // If no standard delimiter scored well or line has spaces
  if (bestScore < 10) {
    const spaceCounts = lines.map((line) => {
      const parts = line.split(/\s+/).filter((s) => s.length > 0);
      return parts.length;
    });
    if (spaceCounts.length > 0 && spaceCounts[0] > 1 && spaceCounts.every((c) => Math.abs(c - spaceCounts[0]) <= 1)) {
      return { delimiter: '\\s+', type: 'space', name: 'Space / Whitespace (\\s+)' };
    }
  }

  return bestCandidate;
}

/**
 * Parses raw text into rows and columns based on options.
 */
export function parseToDataGrid(rawText: string, options: DataGridParseOptions): DataGridModel {
  if (!rawText || !rawText.trim()) {
    return {
      headers: [],
      rows: [],
      detectedDelimiter: ',',
      totalRows: 0,
      totalCols: 0,
    };
  }

  let effectiveDelimStr = ',';
  let isSpaceMode = false;
  let detectedLabel = 'Comma (,)';

  if (options.delimiter === 'auto') {
    const detected = detectDelimiter(rawText);
    effectiveDelimStr = detected.delimiter;
    isSpaceMode = detected.type === 'space';
    detectedLabel = detected.name;
  } else if (options.delimiter === 'space') {
    effectiveDelimStr = '\\s+';
    isSpaceMode = true;
    detectedLabel = 'Space (\\s+)';
  } else if (options.delimiter === 'tab') {
    effectiveDelimStr = '\t';
    detectedLabel = 'Tab (\\t)';
  } else if (options.delimiter === 'semicolon') {
    effectiveDelimStr = ';';
    detectedLabel = 'Semicolon (;)';
  } else if (options.delimiter === 'pipe') {
    effectiveDelimStr = '|';
    detectedLabel = 'Pipe (|)';
  } else if (options.delimiter === 'colon') {
    effectiveDelimStr = ':';
    detectedLabel = 'Colon (:)';
  } else if (options.delimiter === 'custom') {
    effectiveDelimStr = options.customDelimiter && options.customDelimiter.length > 0 ? options.customDelimiter : ',';
    detectedLabel = `Custom ("${effectiveDelimStr}")`;
  } else {
    effectiveDelimStr = ',';
    detectedLabel = 'Comma (,)';
  }

  let rawLines = rawText.split(/\r?\n/);

  // Filter lines
  if (options.skipEmptyLines) {
    rawLines = rawLines.filter((l) => l.trim().length > 0);
  }

  if (options.ignoreComments) {
    const prefix = options.commentPrefix || '#';
    rawLines = rawLines.filter((l) => !l.trim().startsWith(prefix) && !l.trim().startsWith('//'));
  }

  if (rawLines.length === 0) {
    return {
      headers: [],
      rows: [],
      detectedDelimiter: detectedLabel,
      totalRows: 0,
      totalCols: 0,
    };
  }

  let parsedRecords: string[][] = [];

  if (isSpaceMode) {
    // Space-separated or multi-space separated (e.g. ps aux or terminal tables)
    for (const line of rawLines) {
      if (!line.trim() && options.skipEmptyLines) continue;
      // If line has quotes, we parse quotes cautiously, else simple regex split
      const tokens: string[] = [];
      let current = '';
      let inQuotes = false;
      const trimmed = line.trim();

      for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (ch === '"' || ch === "'") {
          inQuotes = !inQuotes;
        } else if (!inQuotes && /\s/.test(ch)) {
          if (current.length > 0) {
            tokens.push(options.trimCells ? current.trim() : current);
            current = '';
          }
        } else {
          current += ch;
        }
      }
      if (current.length > 0) {
        tokens.push(options.trimCells ? current.trim() : current);
      }
      parsedRecords.push(tokens);
    }
  } else {
    // Standard delimiter parsing with full RFC 4180 quote support
    const delimChar = effectiveDelimStr;
    const fullText = rawLines.join('\n');
    parsedRecords = parseCsvString(fullText, delimChar, options.trimCells);
  }

  if (options.skipEmptyLines) {
    parsedRecords = parsedRecords.filter((row) => row.some((c) => c.trim().length > 0));
  }

  if (parsedRecords.length === 0) {
    return {
      headers: [],
      rows: [],
      detectedDelimiter: detectedLabel,
      totalRows: 0,
      totalCols: 0,
    };
  }

  // Determine max column count
  const maxCols = Math.max(...parsedRecords.map((r) => r.length), 1);

  // Normalize row lengths
  const normalizedRecords = parsedRecords.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) {
      padded.push('');
    }
    return padded;
  });

  let headers: string[] = [];
  let rows: string[][] = [];

  if (options.hasHeader && normalizedRecords.length > 0) {
    const rawHeaderRow = normalizedRecords[0];
    headers = rawHeaderRow.map((h, idx) => {
      const clean = h.trim();
      return clean.length > 0 ? clean : `Column_${idx + 1}`;
    });
    rows = normalizedRecords.slice(1);
  } else {
    // Generate default headers
    headers = Array.from({ length: maxCols }, (_, idx) => `Column_${idx + 1}`);
    rows = normalizedRecords;
  }

  return {
    headers,
    rows,
    detectedDelimiter: detectedLabel,
    totalRows: rows.length,
    totalCols: headers.length,
  };
}

/**
 * RFC 4180 Compliant CSV / Delimited parser
 */
function parseCsvString(text: string, delimiter: string, trimCells: boolean): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const dLen = delimiter.length;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      // Check delimiter
      if (text.substring(i, i + dLen) === delimiter) {
        currentRow.push(trimCells ? currentCell.trim() : currentCell);
        currentCell = '';
        i += dLen;
        continue;
      }

      // Check newline
      if (ch === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(trimCells ? currentCell.trim() : currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      } else if (ch === '\n') {
        currentRow.push(trimCells ? currentCell.trim() : currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      }

      currentCell += ch;
      i++;
    }
  }

  // Push final cell and row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(trimCells ? currentCell.trim() : currentCell);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Format a single cell for CSV/TSV export, wrapping in quotes if needed.
 */
function escapeCsvCell(cell: string, delimiter: string): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  const needsQuotes =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.startsWith(' ') ||
    str.endsWith(' ');

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Extract column data in various formats.
 */
export function extractColumnData(
  grid: DataGridModel,
  columnIndex: number,
  format: ColumnCopyFormat
): string {
  if (columnIndex < 0 || columnIndex >= grid.headers.length) {
    return '';
  }

  const values = grid.rows.map((r) => (r[columnIndex] !== undefined ? r[columnIndex] : ''));

  switch (format) {
    case 'newline':
      return values.join('\n');

    case 'comma':
      return values.join(',');

    case 'comma_space':
      return values.join(', ');

    case 'single_quote_sql':
      return values
        .map((v) => `'${String(v).replace(/'/g, "''")}'`)
        .join(', ');

    case 'double_quote':
      return values
        .map((v) => `"${String(v).replace(/"/g, '\\"')}"`)
        .join(', ');

    case 'json_array':
      return JSON.stringify(values, null, 2);

    case 'unique_newline': {
      const set = Array.from(new Set(values));
      return set.join('\n');
    }

    case 'unique_comma': {
      const set = Array.from(new Set(values));
      return set.join(', ');
    }

    default:
      return values.join('\n');
  }
}

/**
 * Calculate column statistics (types, counts, min/max/sum/avg).
 */
export function calculateColumnStats(grid: DataGridModel, columnIndex: number): ColumnStats {
  const colName = grid.headers[columnIndex] || `Column_${columnIndex + 1}`;
  const values = grid.rows.map((r) => (r[columnIndex] !== undefined ? r[columnIndex].trim() : ''));

  let nonEmptyCount = 0;
  let emptyCount = 0;
  const uniqueSet = new Set<string>();

  let intCount = 0;
  let floatCount = 0;
  let boolCount = 0;
  let dateCount = 0;

  const numbers: number[] = [];

  for (const val of values) {
    if (val === '') {
      emptyCount++;
    } else {
      nonEmptyCount++;
      uniqueSet.add(val);

      // Check boolean
      if (/^(true|false|yes|no|1|0)$/i.test(val)) {
        boolCount++;
      }

      // Check number
      const cleanNum = val.replace(/[$,]/g, '');
      const num = Number(cleanNum);
      if (!isNaN(num) && cleanNum !== '') {
        numbers.push(num);
        if (Number.isInteger(num)) {
          intCount++;
        } else {
          floatCount++;
        }
      }

      // Check date (including ISO format and DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
      const isDateCandidate = (v: string): boolean => {
        if (!isNaN(Date.parse(v)) && !/^\d+$/.test(v)) return true;
        if (/^\d{1,2}[-/.]\d{1,2}[-/.](\d{4}|\d{2})/.test(v.trim())) return true;
        return false;
      };
      if (isDateCandidate(val)) {
        dateCount++;
      }
    }
  }

  let type: ColumnStats['type'] = 'text';
  if (nonEmptyCount > 0) {
    if (intCount === nonEmptyCount) type = 'integer';
    else if (numbers.length === nonEmptyCount) type = 'decimal';
    else if (boolCount === nonEmptyCount) type = 'boolean';
    else if (dateCount >= nonEmptyCount * 0.8) type = 'date';
  }

  let numericStats: ColumnStats['numericStats'] | undefined;
  if (numbers.length > 0) {
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    const avg = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    numericStats = {
      sum: Math.round(sum * 10000) / 10000,
      avg: Math.round(avg * 100) / 100,
      min,
      max,
    };
  }

  return {
    name: colName,
    index: columnIndex,
    type,
    totalCount: values.length,
    nonEmptyCount,
    uniqueCount: uniqueSet.size,
    emptyCount,
    numericStats,
  };
}

/**
 * Transpose the data grid (rows become columns and columns become rows).
 */
export function transposeDataGrid(grid: DataGridModel): DataGridModel {
  if (grid.headers.length === 0 && grid.rows.length === 0) {
    return grid;
  }

  const allRows = [grid.headers, ...grid.rows];
  const maxCols = Math.max(...allRows.map((r) => r.length), 0);

  const transposedRows: string[][] = [];
  for (let c = 0; c < maxCols; c++) {
    const newRow: string[] = [];
    for (let r = 0; r < allRows.length; r++) {
      newRow.push(allRows[r][c] !== undefined ? allRows[r][c] : '');
    }
    transposedRows.push(newRow);
  }

  if (transposedRows.length === 0) {
    return { headers: [], rows: [], totalRows: 0, totalCols: 0 };
  }

  const newHeaders = transposedRows[0];
  const newBodyRows = transposedRows.slice(1);

  return {
    headers: newHeaders,
    rows: newBodyRows,
    totalRows: newBodyRows.length,
    totalCols: newHeaders.length,
    detectedDelimiter: grid.detectedDelimiter,
  };
}

/**
 * Deduplicate rows in the grid.
 */
export function deduplicateGridRows(grid: DataGridModel): { grid: DataGridModel; removedCount: number } {
  const seen = new Set<string>();
  const uniqueRows: string[][] = [];

  for (const row of grid.rows) {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  }

  const removedCount = grid.rows.length - uniqueRows.length;
  return {
    grid: {
      headers: [...grid.headers],
      rows: uniqueRows,
      totalRows: uniqueRows.length,
      totalCols: grid.headers.length,
      detectedDelimiter: grid.detectedDelimiter,
    },
    removedCount,
  };
}

/**
 * Sort rows by a specific column index.
 */
export function sortGridRows(
  grid: DataGridModel,
  columnIndex: number,
  direction: 'asc' | 'desc'
): DataGridModel {
  if (columnIndex < 0 || columnIndex >= grid.headers.length) {
    return grid;
  }

  const sorted = [...grid.rows].sort((rowA, rowB) => {
    const valA = (rowA[columnIndex] || '').trim();
    const valB = (rowB[columnIndex] || '').trim();

    // Check if both numeric
    const numA = Number(valA.replace(/[$,]/g, ''));
    const numB = Number(valB.replace(/[$,]/g, ''));

    if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
      return direction === 'asc' ? numA - numB : numB - numA;
    }

    // Default string comparison
    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    return direction === 'asc' ? cmp : -cmp;
  });

  return {
    ...grid,
    rows: sorted,
  };
}

/**
 * Filter rows by a global search term across any or all columns.
 */
export function filterGridRows(
  grid: DataGridModel,
  query: string,
  filterColumnIndex?: number
): DataGridModel {
  const cleanQuery = (query || '').trim().toLowerCase();
  if (!cleanQuery) return grid;

  const filtered = grid.rows.filter((row) => {
    if (filterColumnIndex !== undefined && filterColumnIndex >= 0 && filterColumnIndex < row.length) {
      return String(row[filterColumnIndex]).toLowerCase().includes(cleanQuery);
    }
    return row.some((cell) => String(cell).toLowerCase().includes(cleanQuery));
  });

  return {
    ...grid,
    rows: filtered,
    totalRows: filtered.length,
  };
}

/**
 * Export grid to various text formats.
 */
export function exportDataGrid(
  grid: DataGridModel,
  format: ExportFormat,
  options?: {
    tableName?: string;
    prettyJson?: boolean;
    markdownAlignment?: ('left' | 'right' | 'center')[];
  }
): string {
  const { headers, rows } = grid;

  switch (format) {
    case 'csv': {
      const headerLine = headers.map((h) => escapeCsvCell(h, ',')).join(',');
      const rowLines = rows.map((r) => r.map((c) => escapeCsvCell(c, ',')).join(','));
      return [headerLine, ...rowLines].join('\n');
    }

    case 'tsv': {
      const headerLine = headers.map((h) => escapeCsvCell(h, '\t')).join('\t');
      const rowLines = rows.map((r) => r.map((c) => escapeCsvCell(c, '\t')).join('\t'));
      return [headerLine, ...rowLines].join('\n');
    }

    case 'json_objects': {
      const objects = rows.map((r) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          const val = r[idx] !== undefined ? r[idx] : '';
          // Auto-convert numbers / booleans
          if (/^(true|false)$/i.test(val)) {
            obj[h] = val.toLowerCase() === 'true';
          } else if (!isNaN(Number(val)) && val.trim() !== '') {
            obj[h] = Number(val);
          } else {
            obj[h] = val;
          }
        });
        return obj;
      });
      return JSON.stringify(objects, null, options?.prettyJson !== false ? 2 : undefined);
    }

    case 'json_arrays': {
      const data = [headers, ...rows];
      return JSON.stringify(data, null, options?.prettyJson !== false ? 2 : undefined);
    }

    case 'markdown': {
      if (headers.length === 0) return '';
      const colWidths = headers.map((h, idx) => {
        const maxRowLen = rows.reduce((max, r) => Math.max(max, (r[idx] || '').length), 0);
        return Math.max(h.length, maxRowLen, 3);
      });

      const headerRow =
        '| ' +
        headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') +
        ' |';

      const dividerRow =
        '| ' +
        headers.map((_, i) => '-'.repeat(colWidths[i])).join(' | ') +
        ' |';

      const dataRows = rows.map(
        (r) =>
          '| ' +
          headers.map((_, i) => (r[i] || '').padEnd(colWidths[i])).join(' | ') +
          ' |'
      );

      return [headerRow, dividerRow, ...dataRows].join('\n');
    }

    case 'sql_insert': {
      const tbl = (options?.tableName || 'my_table').trim().replace(/[^a-zA-Z0-9_]/g, '');
      const validCols = headers.map((h) => {
        const clean = h.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        return `"${clean || 'column'}"`;
      });

      if (rows.length === 0) return `-- No rows to insert into ${tbl}`;

      const statements = rows.map((r) => {
        const vals = headers.map((_, idx) => {
          const val = r[idx] !== undefined ? r[idx] : '';
          if (val === '' || val === null || val === undefined) return 'NULL';
          if (!isNaN(Number(val)) && val.trim() !== '') return val;
          if (/^(true|false)$/i.test(val)) return val.toUpperCase();
          return `'${val.replace(/'/g, "''")}'`;
        });
        return `INSERT INTO ${tbl} (${validCols.join(', ')}) VALUES (${vals.join(', ')});`;
      });

      return statements.join('\n');
    }

    case 'html': {
      const thead =
        '  <thead>\n    <tr>\n' +
        headers.map((h) => `      <th>${escapeHtml(h)}</th>`).join('\n') +
        '\n    </tr>\n  </thead>';

      const tbody =
        '  <tbody>\n' +
        rows
          .map(
            (r) =>
              '    <tr>\n' +
              headers.map((_, i) => `      <td>${escapeHtml(r[i] || '')}</td>`).join('\n') +
              '\n    </tr>'
          )
          .join('\n') +
        '\n  </tbody>';

      return `<table class="table">\n${thead}\n${tbody}\n</table>`;
    }

    case 'latex': {
      if (headers.length === 0) return '';
      const colSpec = '|' + headers.map(() => 'l').join('|') + '|';
      const headerLine = headers.map((h) => escapeLatex(h)).join(' & ') + ' \\\\ \\hline';
      const bodyLines = rows.map((r) => headers.map((_, i) => escapeLatex(r[i] || '')).join(' & ') + ' \\\\');

      return [
        `\\begin{tabular}{${colSpec}}`,
        '\\hline',
        headerLine,
        ...bodyLines,
        '\\hline',
        '\\end{tabular}',
      ].join('\n');
    }

    case 'ascii': {
      if (headers.length === 0) return '';
      const colWidths = headers.map((h, idx) => {
        const maxRowLen = rows.reduce((max, r) => Math.max(max, (r[idx] || '').length), 0);
        return Math.max(h.length, maxRowLen, 3);
      });

      const topBorder = '+' + colWidths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
      const headerRow =
        '| ' +
        headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') +
        ' |';
      const midBorder = '+' + colWidths.map((w) => '='.repeat(w + 2)).join('+') + '+';
      const bodyRows = rows.map(
        (r) =>
          '| ' +
          headers.map((_, i) => (r[i] || '').padEnd(colWidths[i])).join(' | ') +
          ' |'
      );
      const bottomBorder = topBorder;

      return [topBorder, headerRow, midBorder, ...bodyRows, bottomBorder].join('\n');
    }

    case 'yaml': {
      const lines: string[] = [];
      rows.forEach((r) => {
        lines.push('-');
        headers.forEach((h, idx) => {
          const val = r[idx] !== undefined ? r[idx] : '';
          const escapedVal = val.includes('\n') || val.includes(':') || val.includes('#') ? `"${val.replace(/"/g, '\\"')}"` : val;
          lines.push(`  ${h}: ${escapedVal}`);
        });
      });
      return lines.join('\n');
    }

    default:
      return '';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeLatex(str: string): string {
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}~^]/g, (m) => `\\${m}`);
}

/**
 * Built-in Sample Datasets for quick user onboarding and testing.
 */
export interface DataGridPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  delimiter: DelimiterType;
  hasHeader: boolean;
  data: string;
}

export const DATA_GRID_PRESETS: DataGridPreset[] = [
  {
    id: 'csv-ecommerce',
    name: 'E-Commerce Orders (CSV)',
    category: 'CSV Format',
    description: 'Standard comma-separated order export with quoted customer names, SKUs, and monetary amounts',
    delimiter: 'comma',
    hasHeader: true,
    data: `order_id,customer_name,email,product_sku,quantity,unit_price,status,order_date
1001,"Acme Corp, LLC",billing@acme.com,PRO-SaaS-01,5,49.99,Completed,2026-03-15
1002,"Jane Doe",jane.doe@example.org,DEV-TOOL-X,1,129.00,Completed,2026-03-16
1003,"Vertex Systems",ops@vertex.io,CLOUD-NODE-4,12,89.50,Processing,2026-03-17
1004,"O'Connor & Sons",contact@oconnor.com,SECURITY-SHIELD,2,199.00,Refunded,2026-03-18
1005,"CyberNetics",finance@cyber.net,API-GATEWAY-1,100,0.15,Completed,2026-03-19
1006,"Global Logistics",dispatch@globallog.com,DISPATCH-PRO,3,249.99,Pending,2026-03-20`,
  },
  {
    id: 'tsv-employees',
    name: 'User Directory (Tab-Separated TSV)',
    category: 'TSV Format',
    description: 'Tab-separated directory data typical of spreadsheet copy-paste or LDAP/Active Directory dumps',
    delimiter: 'tab',
    hasHeader: true,
    data: `user_id\tusername\tdepartment\trole\tsalary\tactive\tjoin_date
U-8491\talex.turner\tEngineering\tLead Architect\t165000\ttrue\t2023-01-10
U-8492\tsarah.connor\tDevOps\tSRE Lead\t152000\ttrue\t2023-04-18
U-8493\tmichael.scott\tSales\tRegional Manager\t98000\tfalse\t2022-08-01
U-8494\tpriya.patel\tSecurity\tSecOps Engineer\t145000\ttrue\t2024-02-14
U-8495\tdavid.kim\tEngineering\tStaff Engineer\t172000\ttrue\t2022-11-30
U-8496\temma.watson\tProduct\tSenior PM\t138000\ttrue\t2023-09-05`,
  },
  {
    id: 'space-processes',
    name: 'Server Process Table (Space-Separated)',
    category: 'Space Format',
    description: 'CLI / Terminal output with multi-space alignment (like ps aux or docker ps)',
    delimiter: 'space',
    hasHeader: true,
    data: `PID    USER      CPU%   MEM%   VSZ      RSS     STAT  COMMAND
1      root      0.0    0.2    168540   11240   Ss    /sbin/init
412    systemd   0.1    0.3    89400    15400   Ssl   /lib/systemd/systemd-resolved
1024   postgres  1.4    4.8    2145000  245000  S     /usr/lib/postgresql/bin/postgres
1450   nginx     0.3    1.1    142000   58000   S     nginx: worker process
2190   node      4.2    6.5    1850000  334000  Sl    node server.js
3102   redis     0.8    2.1    128000   96000   Ssl   redis-server *:6379`,
  },
  {
    id: 'pipe-audit-logs',
    name: 'Audit Security Log (Pipe-Separated)',
    category: 'Pipe Format',
    description: 'Pipe-delimited security events with timestamp, severity, IP and action message',
    delimiter: 'pipe',
    hasHeader: true,
    data: `timestamp|event_id|severity|source_ip|actor|action|result
2026-09-20T08:12:44Z|SEC-0192|INFO|192.168.1.100|admin|LOGIN|SUCCESS
2026-09-20T08:14:02Z|SEC-0193|WARNING|10.0.0.54|guest|API_KEY_REVOKE|DENIED
2026-09-20T08:21:19Z|SEC-0194|CRITICAL|45.33.32.156|unknown|BRUTE_FORCE_DETECTED|BLOCKED
2026-09-20T08:35:50Z|SEC-0195|INFO|192.168.1.102|developer|SCHEMA_MIGRATION|APPLIED
2026-09-20T09:01:11Z|SEC-0196|NOTICE|172.16.0.4|backup-job|DB_SNAPSHOT_CREATED|SUCCESS`,
  },
  {
    id: 'semicolon-financial',
    name: 'Financial Ledger (Semicolon-Separated)',
    category: 'Semicolon Format',
    description: 'European accounting export using semicolons as separator and comma decimals',
    delimiter: 'semicolon',
    hasHeader: true,
    data: `AccountCode;AccountName;Currency;Debit;Credit;FiscalPeriod
1010;Cash and Bank;EUR;145200.50;0.00;2026-Q1
1200;Accounts Receivable;EUR;38400.00;1200.00;2026-Q1
2000;Accounts Payable;EUR;0.00;24800.75;2026-Q1
4000;SaaS Revenue;EUR;0.00;158800.00;2026-Q1
5100;Cloud Hosting Expenses;EUR;12450.25;0.00;2026-Q1
5200;Payroll Salaries;EUR;84500.00;0.00;2026-Q1`,
  },
];
