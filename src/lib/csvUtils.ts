/**
 * Shared CSV utilities. The parser is the robust client-side implementation
 * previously local to DataManagementView: it correctly handles quoted values,
 * escaped quotes (""), commas and newlines inside quoted fields, and both
 * Windows (\r\n) and Unix (\n) line endings.
 */

/** Parse CSV text into rows of cell strings. First row is the header row. */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (row.length > 0 || currentVal !== '') {
    row.push(currentVal.trim());
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
  }
  return lines;
}

/** Strip currency symbols, commas and whitespace so " $12,500.00 " -> 12500. */
export function parseMoneyCell(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** True when `value` looks like a YYYY-MM-DD calendar date. */
export function isValidYmd(value: string | undefined | null): boolean {
  if (!value) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const [, y, mo, d] = m;
  const date = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() + 1 === Number(mo) &&
    date.getUTCDate() === Number(d)
  );
}

/**
 * Try to read a date the way people actually type it in spreadsheets and
 * normalize it to YYYY-MM-DD. Accepts YYYY-MM-DD, MM/DD/YYYY and M/D/YY(YY).
 * Returns null when the value cannot be understood as a date.
 */
export function normalizeDateCell(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (isValidYmd(value)) return value;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value);
  if (slash) {
    let [, mo, d, y] = slash;
    if (y.length === 2) y = `20${y}`;
    const mm = mo.padStart(2, '0');
    const dd = d.padStart(2, '0');
    const candidate = `${y}-${mm}-${dd}`;
    return isValidYmd(candidate) ? candidate : null;
  }
  return null;
}

/** Download a small CSV file built from header + row arrays. */
export function downloadCSV(headers: string[], rows: (string | number)[][], filename: string): void {
  const escape = (v: string | number): string => {
    const s = String(v ?? '');
    const escaped = s.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };
  const csvContent = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
