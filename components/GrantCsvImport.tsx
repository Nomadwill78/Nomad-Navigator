import React from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Grant, Program } from '../types';
import { parseCSV, downloadCSV } from '../src/lib/csvUtils';
import {
  GRANT_CSV_COLUMNS,
  GRANT_CSV_SAMPLE_ROWS,
  GrantFieldMapping,
  autoMapGrantHeaders,
  emptyGrantMapping,
  parseGrantCsvRows,
} from '../src/lib/grantCsvImport';
import { formatMoney } from '../src/lib/money';

interface GrantCsvImportProps {
  grants: Grant[];
  programs: Program[];
  onCreateGrant: (grant: Omit<Grant, 'id'>) => Promise<string>;
  /** Warn the parent while an import is mid-flight so navigation can be confirmed. */
  onPendingImportChange?: (pending: boolean) => void;
}

export const GrantCsvImport: React.FC<GrantCsvImportProps> = ({
  grants,
  programs,
  onCreateGrant,
  onPendingImportChange,
}) => {
  const [dragActive, setDragActive] = React.useState(false);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [csvRows, setCsvRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<GrantFieldMapping>(emptyGrantMapping());
  const [showMappingUI, setShowMappingUI] = React.useState(false);
  const [selectedFileName, setSelectedFileName] = React.useState('');
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [importSummary, setImportSummary] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState({ done: 0, total: 0 });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parsed = React.useMemo(() => {
    if (!showMappingUI || csvRows.length === 0) return null;
    return parseGrantCsvRows(csvRows, headers, mapping, programs, grants);
  }, [showMappingUI, csvRows, headers, mapping, programs, grants]);

  const mappingComplete =
    !!mapping.name && !!mapping.funder && !!mapping.amount;

  // Warn before the tab closes/refreshes while a mapped CSV hasn't been confirmed yet.
  React.useEffect(() => {
    if (!showMappingUI) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [showMappingUI]);

  React.useEffect(() => {
    onPendingImportChange?.(showMappingUI || importing);
    return () => onPendingImportChange?.(false);
  }, [showMappingUI, importing, onPendingImportChange]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.csv')) processFile(file);
    else setUploadError('Invalid file type. Please select a .csv file.');
  };

  const processFile = (file: File) => {
    setSelectedFileName(file.name);
    setSuccessMessage(null);
    setImportSummary(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) handleCSVText(text);
    };
    reader.onerror = () => setUploadError('Error reading file.');
    reader.readAsText(file);
  };

  const handleCSVText = (text: string) => {
    try {
      const lines = parseCSV(text);
      if (lines.length < 2) {
        throw new Error('CSV file must have a header row and at least one data row.');
      }
      const fileHeaders = lines[0].map((h) => h.trim());
      setHeaders(fileHeaders);
      setCsvRows(lines.slice(1));
      setMapping(autoMapGrantHeaders(fileHeaders));
      setUploadError(null);
      setShowMappingUI(true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse CSV file.');
    }
  };

  const resetImporter = () => {
    setHeaders([]);
    setCsvRows([]);
    setMapping(emptyGrantMapping());
    setShowMappingUI(false);
    setSelectedFileName('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleCSV = () => {
    downloadCSV(
      GRANT_CSV_COLUMNS.map((c) => c.label),
      GRANT_CSV_SAMPLE_ROWS,
      'nomad-compass-sample-grants.csv',
    );
  };

  const handleImport = async () => {
    if (!parsed || parsed.grants.length === 0 || importing) return;
    setImporting(true);
    setImportProgress({ done: 0, total: parsed.grants.length });
    let created = 0;
    const failed: number[] = [];
    for (let i = 0; i < parsed.grants.length; i++) {
      try {
        await onCreateGrant(parsed.grants[i].grant);
        created++;
      } catch {
        failed.push(parsed.grants[i].rowNumber);
      }
      setImportProgress({ done: i + 1, total: parsed.grants.length });
    }
    setImporting(false);
    const skipped = parsed.errors.length;
    const parts = [`Imported ${created} grant${created === 1 ? '' : 's'}.`];
    if (failed.length > 0) parts.push(`${failed.length} failed to save (rows ${failed.join(', ')}).`);
    if (skipped > 0) parts.push(`${skipped} row${skipped === 1 ? '' : 's'} skipped for invalid data.`);
    setImportSummary(parts.join(' '));
    setSuccessMessage(created > 0 ? `Successfully imported ${created} grant${created === 1 ? '' : 's'}!` : null);
    resetImporter();
  };

  const duplicateSet = new Set(parsed?.duplicateRows ?? []);

  return (
    <div className="bg-surface rounded-2xl border border-hairline shadow-sm overflow-hidden mb-6">
      <div className="p-4 border-b border-hairline/60 bg-ink/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface rounded-lg shadow-sm text-brassbright">
            <Upload size={18} />
          </div>
          <div>
            <h4 className="font-bold text-parchment">Bulk Grant Upload</h4>
            <p className="text-xs text-inkmute">Import grants from a CSV file — one row per grant</p>
          </div>
        </div>
        <button
          onClick={downloadSampleCSV}
          className="flex items-center gap-1 text-xs font-semibold text-teal hover:text-teal bg-teal/10 hover:bg-teal/10 px-2.5 py-1.5 rounded-lg transition-all"
        >
          <Download size={13} />
          Sample CSV
        </button>
      </div>

      <div className="p-6">
        {successMessage && (
          <div className="mb-6 p-4 bg-teal/10 border border-teal/25 text-teal text-sm rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
            <CheckCircle size={18} className="text-teal shrink-0" />
            <span className="font-medium">{successMessage}{importSummary ? ` ${importSummary.replace(/^Imported \d+ grants?\. /, '')}` : ''}</span>
          </div>
        )}
        {importSummary && !successMessage && (
          <div className="mb-6 p-4 bg-brass/10 border border-brass/25 text-brassbright text-sm rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="font-medium">{importSummary}</span>
          </div>
        )}
        {uploadError && (
          <div className="mb-6 p-4 bg-alert/15 border border-alert/35 text-alerttext text-sm rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
            <AlertCircle size={18} className="text-alert shrink-0" />
            <span className="font-medium">{uploadError}</span>
          </div>
        )}

        {!showMappingUI ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
              dragActive ? 'border-brass bg-brass/10 scale-[0.99]' : 'border-hairline hover:border-brass/50 hover:bg-ink/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
              accept=".csv"
              className="hidden"
            />
            <div className="p-4 bg-ink/50 rounded-full">
              <FileSpreadsheet size={32} className="text-brass" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-parchment">Drag &amp; drop your grants CSV here</p>
              <p className="text-xs text-inkfaint mt-1">or click to browse from your device</p>
            </div>
            <div className="text-[10px] bg-abyss text-inkmute px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider">
              Supports UTF-8 CSV
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-400">
            <div className="p-5 bg-ink/50 rounded-2xl border border-hairline/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                <div>
                  <h5 className="font-bold text-parchment text-sm">Header Mapping Configuration</h5>
                  <p className="text-xs text-inkmute mt-0.5">Match your CSV columns to the grant fields. KPIs and subgrantees are added after import, in each grant's detail view.</p>
                </div>
                <div className="text-xs font-semibold bg-brass/10 text-brassbright px-2.5 py-1 rounded-lg border border-brass/25">
                  File: {selectedFileName}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {GRANT_CSV_COLUMNS.map((col) => (
                  <div key={col.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-inkmute uppercase tracking-wider flex items-center gap-1">
                      {col.label} {col.required && <span className="text-brass">*</span>}
                    </label>
                    <select
                      value={mapping[col.key]}
                      onChange={(e) => setMapping({ ...mapping, [col.key]: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal/40 outline-none"
                    >
                      <option value="">-- Choose CSV Column --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <p className="text-[10px] text-inkfaint">{col.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            {parsed && (
              <div className="space-y-2">
                <h5 className="font-bold text-parchment text-xs uppercase tracking-wider">
                  Preview ({parsed.grants.length} valid grant{parsed.grants.length === 1 ? '' : 's'}
                  {parsed.errors.length > 0 && `, ${parsed.errors.length} row${parsed.errors.length === 1 ? '' : 's'} with errors`})
                </h5>
                {parsed.errors.length > 0 && (
                  <div className="p-4 bg-alert/10 border border-alert/30 rounded-xl space-y-1.5 max-h-40 overflow-y-auto">
                    {parsed.errors.map((e) => (
                      <p key={e.rowNumber} className="text-xs text-alerttext">
                        <span className="font-bold">Row {e.rowNumber}:</span> {e.message} It will be skipped.
                      </p>
                    ))}
                  </div>
                )}
                {parsed.unmatchedPrograms.length > 0 && (
                  <div className="p-4 bg-brass/10 border border-brass/25 rounded-xl">
                    <p className="text-xs text-brassbright">
                      <span className="font-bold">Program not matched:</span> {parsed.unmatchedPrograms.join(', ')} — no program with {parsed.unmatchedPrograms.length === 1 ? 'this name' : 'these names'} exists yet, so {parsed.unmatchedPrograms.length === 1 ? 'the grant' : 'those grants'} will import unassigned. Create the program first, or assign it after import.
                    </p>
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm max-h-60 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-ink/50 border-b border-hairline/60 font-bold text-inkmute">
                        <th className="px-4 py-2.5">Grant</th>
                        <th className="px-4 py-2.5">Funder</th>
                        <th className="px-4 py-2.5 text-right">Award</th>
                        <th className="px-4 py-2.5">Dates</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline/60 font-medium text-parchment">
                      {parsed.grants.slice(0, 10).map(({ grant: g, rowNumber }) => (
                        <tr key={rowNumber} className="hover:bg-ink/50">
                          <td className="px-4 py-2.5 font-bold text-parchment">{g.name}</td>
                          <td className="px-4 py-2.5 text-inkmute">{g.funder}</td>
                          <td className="px-4 py-2.5 text-right">{formatMoney(g.amount)}</td>
                          <td className="px-4 py-2.5 text-inkmute text-[11px]">
                            {[g.startDate, g.endDate].filter(Boolean).join(' → ') || '—'}
                          </td>
                          <td className="px-4 py-2.5 capitalize">{g.status}</td>
                          <td className="px-4 py-2.5">
                            {duplicateSet.has(rowNumber) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brassbright bg-brass/10 border border-brass/30 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={10} /> Possible duplicate
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsed.grants.length > 10 && (
                  <p className="text-[11px] text-inkfaint">Showing first 10 of {parsed.grants.length} valid grants.</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-hairline/60 pt-4">
              <button
                onClick={resetImporter}
                disabled={importing}
                className="px-4 py-2 border border-hairline text-inkmute rounded-xl text-xs font-bold hover:bg-ink/50 transition-all disabled:opacity-50"
              >
                Cancel / Discard
              </button>
              <button
                onClick={handleImport}
                disabled={!mappingComplete || !parsed || parsed.grants.length === 0 || importing}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  (!mappingComplete || !parsed || parsed.grants.length === 0 || importing)
                    ? 'bg-surface2 text-inkfaint border border-hairline cursor-not-allowed'
                    : 'bg-gradient-to-b from-brassbright to-brass text-[#26200e] shadow-lg shadow-brass/25 hover:brightness-105 active:scale-[0.98]'
                }`}
              >
                {importing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Importing {importProgress.done} of {importProgress.total}…
                  </>
                ) : (
                  <>Import {parsed?.grants.length ?? 0} Grant{(parsed?.grants.length ?? 0) === 1 ? '' : 's'}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
