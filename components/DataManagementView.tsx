import React from 'react';
import { 
  Save, 
  Info, 
  Database, 
  ChevronRight, 
  Users, 
  DollarSign, 
  Target, 
  ShieldCheck,
  TrendingUp,
  MapPin,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { DashboardStats, ProgramMetric, ROLE_PERMISSIONS } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { exportToCSV, exportToJSON } from '../src/lib/exportUtils';

// Robust client-side CSV parser that correctly handles quoted values, escaped quotes, and newlines.
function parseCSV(text: string): string[][] {
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

/** Returns a copy of `obj` with `path` set to `value`, without mutating `obj`. */
function setIn(obj: any, path: string[], value: any): any {
  const [head, ...rest] = path;
  if (rest.length === 0) return { ...obj, [head]: value };
  return { ...obj, [head]: setIn(obj?.[head] ?? {}, rest, value) };
}

/**
 * These two components MUST live at module scope. They used to be declared
 * inside DataManagementView, so every keystroke created a brand-new component
 * type, React unmounted and remounted every input, and the focused field lost
 * focus after one character (typing "540" kept only "5").
 */
const FieldContext = React.createContext<{
  stats: DashboardStats;
  canEdit: boolean;
  onChange: (path: string, value: any) => void;
}>({ stats: undefined as unknown as DashboardStats, canEdit: false, onChange: () => {} });

const FieldGroup: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-surface rounded-2xl border border-hairline shadow-sm overflow-hidden mb-6">
    <div className="p-4 border-b border-hairline/60 bg-ink/50 flex items-center gap-3">
      <div className="p-2 bg-surface rounded-lg shadow-sm text-teal">
        {icon}
      </div>
      <h4 className="font-bold text-parchment">{title}</h4>
    </div>
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  </div>
);

const InputField: React.FC<{
  label: string;
  path: string;
  type?: string;
  tooltip: string;
  placeholder?: string;
}> = ({ label, path, type = 'text', tooltip, placeholder }) => {
  const { stats, canEdit, onChange } = React.useContext(FieldContext);
  const value = path.split('.').reduce((obj: any, key) => obj?.[key], stats as any);
  // A cleared number field is 0, never NaN (parseFloat('') is NaN, which would be
  // saved to the database and shown as "NaN" on the dashboard).
  const display = typeof value === 'number' && Number.isNaN(value) ? '' : value ?? '';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-bold text-inkmute uppercase tracking-wider">{label}</label>
        <div className="group relative">
          <Info size={14} className="text-inkfaint cursor-help hover:text-teal transition-colors" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-abyss text-ivory text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-abyss"></div>
          </div>
        </div>
      </div>
      <input
        type={type}
        disabled={!canEdit}
        value={display}
        onChange={(e) => {
          if (type !== 'number') return onChange(path, e.target.value);
          const parsed = parseFloat(e.target.value);
          onChange(path, Number.isFinite(parsed) ? parsed : 0);
        }}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 bg-ink/50 border border-hairline rounded-xl text-sm focus:ring-2 focus:ring-teal/40 focus:bg-surface outline-none transition-all ${!canEdit && 'opacity-60 cursor-not-allowed'}`}
      />
    </div>
  );
};

interface DataManagementViewProps {
  stats: DashboardStats;
  onUpdate: (newStats: DashboardStats) => void;
  // Lets the parent know a CSV import is mid-flight (file loaded, not yet confirmed)
  // so it can warn the user before navigating away and silently discarding it.
  onPendingImportChange?: (pending: boolean) => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({ stats, onUpdate, onPendingImportChange }) => {
  const { role } = useAuth();
  const permissions = role ? ROLE_PERMISSIONS[role] : null;

  // CSV Import States
  const [dragActive, setDragActive] = React.useState(false);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [csvRows, setCsvRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState({
    name: '',
    month: '',
    peopleServed: '',
    totalCost: '',
    costPerPerson: ''
  });
  const [parsedPreview, setParsedPreview] = React.useState<ProgramMetric[]>([]);
  const [importMode, setImportMode] = React.useState<'append' | 'replace'>('append');
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [showMappingUI, setShowMappingUI] = React.useState(false);
  const [selectedFileName, setSelectedFileName] = React.useState<string>('');
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Tell the parent app whether an import is in progress, so it can confirm before
  // switching views (otherwise the mapped data is silently lost on navigation).
  React.useEffect(() => {
    onPendingImportChange?.(showMappingUI);
    return () => onPendingImportChange?.(false);
  }, [showMappingUI, onPendingImportChange]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        processFile(droppedFile);
      } else {
        setUploadError("Invalid file type. Please select a .csv file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setSelectedFileName(selectedFile.name);
    setSuccessMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleCSVText(text);
      }
    };
    reader.onerror = () => {
      setUploadError("Error reading file.");
    };
    reader.readAsText(selectedFile);
  };

  const handleCSVText = (text: string) => {
    try {
      const parsedLines = parseCSV(text);
      if (parsedLines.length < 2) {
        throw new Error("CSV file must have a header row and at least one data row.");
      }

      const fileHeaders = parsedLines[0].map(h => h.trim());
      setHeaders(fileHeaders);
      setCsvRows(parsedLines.slice(1));

      // Attempt fuzzy auto-mapping
      const newMapping = {
        name: '',
        month: '',
        peopleServed: '',
        totalCost: '',
        costPerPerson: ''
      };

      fileHeaders.forEach(header => {
        const lower = header.toLowerCase();
        if (!newMapping.name && (lower.includes('name') || lower.includes('program') || lower.includes('title') || lower.includes('project') || lower.includes('label'))) {
          newMapping.name = header;
        } else if (!newMapping.month && (lower.includes('month') || lower.includes('date') || lower.includes('period') || lower.includes('time') || lower.includes('jan') || lower.includes('feb'))) {
          newMapping.month = header;
        } else if (!newMapping.peopleServed && (lower.includes('people') || lower.includes('served') || lower.includes('beneficiaries') || lower.includes('count') || lower.includes('reach') || lower.includes('population') || lower.includes('outcomes'))) {
          newMapping.peopleServed = header;
        } else if (!newMapping.totalCost && (lower.includes('cost') || lower.includes('budget') || lower.includes('spent') || lower.includes('expense') || lower.includes('financial') || lower.includes('amount'))) {
          if (!lower.includes('per')) {
            newMapping.totalCost = header;
          }
        } else if (!newMapping.costPerPerson && (lower.includes('per') || lower.includes('capita') || lower.includes('roi') || lower.includes('each') || lower.includes('unit') || lower.includes('ratio') || lower.includes('efficiency'))) {
          newMapping.costPerPerson = header;
        }
      });

      // fallback defaults if no match found
      if (!newMapping.name && fileHeaders.length > 0) newMapping.name = fileHeaders[0];
      if (!newMapping.month && fileHeaders.length > 1) newMapping.month = fileHeaders[1];
      if (!newMapping.peopleServed && fileHeaders.length > 2) newMapping.peopleServed = fileHeaders[2];
      if (!newMapping.totalCost && fileHeaders.length > 3) newMapping.totalCost = fileHeaders[3];

      setMapping(newMapping);
      setUploadError(null);
      setShowMappingUI(true);
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse CSV file.");
    }
  };

  React.useEffect(() => {
    if (!showMappingUI || csvRows.length === 0) return;

    const nameIdx = headers.indexOf(mapping.name);
    const monthIdx = headers.indexOf(mapping.month);
    const servedIdx = headers.indexOf(mapping.peopleServed);
    const costIdx = headers.indexOf(mapping.totalCost);
    const perPersonIdx = headers.indexOf(mapping.costPerPerson);

    const tempMetrics: ProgramMetric[] = csvRows.map((row, idx) => {
      const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : `Program ${idx + 1}`;
      const month = monthIdx !== -1 && row[monthIdx] ? row[monthIdx] : 'N/A';
      
      const rawServed = servedIdx !== -1 ? row[servedIdx] : '';
      const peopleServed = parseInt(rawServed.replace(/[^0-9.-]/g, '')) || 0;

      const rawCost = costIdx !== -1 ? row[costIdx] : '';
      const totalCost = parseFloat(rawCost.replace(/[^0-9.-]/g, '')) || 0;

      let costPerPerson = 0;
      if (perPersonIdx !== -1 && row[perPersonIdx]) {
        const rawPer = row[perPersonIdx];
        costPerPerson = parseFloat(rawPer.replace(/[^0-9.-]/g, '')) || 0;
      } else if (peopleServed > 0) {
        costPerPerson = parseFloat((totalCost / peopleServed).toFixed(2));
      }

      return {
        id: `csv-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        month,
        peopleServed,
        totalCost,
        costPerPerson
      };
    });

    setParsedPreview(tempMetrics);
  }, [mapping, csvRows, headers, showMappingUI]);

  const handleImport = () => {
    if (parsedPreview.length === 0) return;

    const existingPrograms = stats.programs || [];
    let updatedPrograms = [];

    if (importMode === 'append') {
      updatedPrograms = [...existingPrograms, ...parsedPreview];
    } else {
      updatedPrograms = [...parsedPreview];
    }

    const updatedStats = {
      ...stats,
      programs: updatedPrograms
    };

    onUpdate(updatedStats);
    setSuccessMessage(`Successfully imported ${parsedPreview.length} program metrics!`);
    resetImporter();
  };

  const resetImporter = () => {
    setHeaders([]);
    setCsvRows([]);
    setMapping({
      name: '',
      month: '',
      peopleServed: '',
      totalCost: '',
      costPerPerson: ''
    });
    setParsedPreview([]);
    setShowMappingUI(false);
    setSelectedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ["Program Name", "Month", "Beneficiaries Served", "Total Budget Spent", "Cost Per Capita"],
      ["Community Clean Water", "Jan", "1500", "18000", "12.0"],
      ["Sanitation Training", "Feb", "1200", "14000", "11.66"],
      ["Hygiene Education Outreach", "Mar", "2000", "19500", "9.75"],
      ["Village Well Refurbishment", "Apr", "800", "12000", "15.0"]
    ];
    const csvContent = sampleData.map(row => row.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'nomad-compass-sample-metrics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChange = (path: string, value: any) => {
    if (!permissions?.canEditMetrics) return;
    onUpdate(setIn(stats, path.split('.'), value));
  };

  const fieldContext = { stats, canEdit: !!permissions?.canEditMetrics, onChange: handleChange };

  return (
    <FieldContext.Provider value={fieldContext}>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ivory">Manage Metrics</h2>
          <p className="text-inkmute">Update your nonprofit's core impact and financial data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {permissions?.canExportData && (
            <div className="flex items-center gap-2 bg-surface border border-hairline rounded-xl p-1 shadow-sm">
              <button 
                onClick={() => exportToCSV(stats, 'nomad-compass-metrics')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-inkmute hover:text-teal hover:bg-ink/50 rounded-lg transition-all"
                title="Export metrics as CSV"
              >
                <Download size={14} />
                CSV
              </button>
              <button 
                onClick={() => exportToJSON(stats, 'nomad-compass-metrics')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-inkmute hover:text-teal hover:bg-ink/50 rounded-lg transition-all"
                title="Export metrics as JSON"
              >
                <Download size={14} />
                JSON
              </button>
            </div>
          )}
          {permissions?.canEditMetrics && (
            <div className="flex items-center gap-1.5 text-xs text-inkfaint font-medium px-1" title="Changes save automatically a moment after you stop typing">
              <Save size={14} />
              Autosaves as you type
            </div>
          )}
        </div>
      </div>

      {/* CSV Import Section */}
      {permissions?.canEditMetrics && (
        <div className="bg-surface rounded-2xl border border-hairline shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-hairline/60 bg-ink/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface rounded-lg shadow-sm text-brassbright">
                <Upload size={18} />
              </div>
              <div>
                <h4 className="font-bold text-parchment">CSV Data Stream Integration</h4>
                <p className="text-xs text-inkmute">Import program metrics from any database or CSV report</p>
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
                <span className="font-medium">{successMessage}</span>
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
                  dragActive 
                    ? 'border-brass bg-brass/10 scale-[0.99]' 
                    : 'border-hairline hover:border-brass/50 hover:bg-ink/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div className="p-4 bg-ink/50 rounded-full text-inkfaint group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={32} className="text-brass" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-parchment">Drag & drop your CSV file here</p>
                  <p className="text-xs text-inkfaint mt-1">or click to browse from your device</p>
                </div>
                <div className="text-[10px] bg-abyss text-inkmute px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider">
                  Supports UTF-8 CSV
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-400">
                {/* Mapping Controls */}
                <div className="p-5 bg-ink/50 rounded-2xl border border-hairline/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                    <div>
                      <h5 className="font-bold text-parchment text-sm">Header Mapping Configuration</h5>
                      <p className="text-xs text-inkmute mt-0.5">We found headers. Match them to the required Program Metric fields.</p>
                    </div>
                    <div className="text-xs font-semibold bg-brass/10 text-brassbright px-2.5 py-1 rounded-lg border border-brass/25">
                      File: {selectedFileName}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Name mapping */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-inkmute uppercase tracking-wider flex items-center gap-1">
                        Name Field <span className="text-brass">*</span>
                      </label>
                      <select 
                        value={mapping.name}
                        onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal/40 outline-none"
                      >
                        <option value="">-- Choose CSV Column --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Month mapping */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-inkmute uppercase tracking-wider">
                        Month / Timeline Field
                      </label>
                      <select 
                        value={mapping.month}
                        onChange={(e) => setMapping({ ...mapping, month: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal/40 outline-none"
                      >
                        <option value="">-- Choose CSV Column --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* People Served mapping */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-inkmute uppercase tracking-wider flex items-center gap-1">
                        People Served <span className="text-brass">*</span>
                      </label>
                      <select 
                        value={mapping.peopleServed}
                        onChange={(e) => setMapping({ ...mapping, peopleServed: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal/40 outline-none"
                      >
                        <option value="">-- Choose CSV Column --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Total Cost mapping */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-inkmute uppercase tracking-wider flex items-center gap-1">
                        Total Cost Spent <span className="text-brass">*</span>
                      </label>
                      <select 
                        value={mapping.totalCost}
                        onChange={(e) => setMapping({ ...mapping, totalCost: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal/40 outline-none"
                      >
                        <option value="">-- Choose CSV Column --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Cost Per Person mapping */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-inkmute uppercase tracking-wider">
                        Cost Per Person (ROI)
                      </label>
                      <select 
                        value={mapping.costPerPerson}
                        onChange={(e) => setMapping({ ...mapping, costPerPerson: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-hairline rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal/40 outline-none"
                      >
                        <option value="">-- Auto-calculate from cost/people --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Import mode */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-inkmute uppercase tracking-wider">
                        Import Strategy
                      </label>
                      <div className="flex bg-surface rounded-xl border border-hairline p-0.5 w-full">
                        <button 
                          type="button"
                          onClick={() => setImportMode('append')}
                          className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition-all ${importMode === 'append' ? 'bg-gradient-to-b from-brassbright to-brass text-[#26200e]' : 'text-inkmute hover:bg-ink/50'}`}
                        >
                          Append
                        </button>
                        <button 
                          type="button"
                          onClick={() => setImportMode('replace')}
                          className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition-all ${importMode === 'replace' ? 'bg-gradient-to-b from-brassbright to-brass text-[#26200e]' : 'text-inkmute hover:bg-ink/50'}`}
                        >
                          Overwrite
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Preview */}
                {parsedPreview.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-parchment text-xs uppercase tracking-wider">Mapped Stream Preview ({parsedPreview.length} records)</h5>
                    <div className="overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm max-h-60 overflow-y-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-ink/50 border-b border-hairline/60 font-bold text-inkmute">
                            <th className="px-4 py-2.5">Name</th>
                            <th className="px-4 py-2.5">Month</th>
                            <th className="px-4 py-2.5 text-right">Beneficiaries Served</th>
                            <th className="px-4 py-2.5 text-right">Total Cost Spent</th>
                            <th className="px-4 py-2.5 text-right">Cost Per Person</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline/60 font-medium text-parchment">
                          {parsedPreview.slice(0, 10).map((m, i) => (
                            <tr key={i} className="hover:bg-ink/50">
                              <td className="px-4 py-2.5 font-bold text-parchment">{m.name}</td>
                              <td className="px-4 py-2.5 text-inkmute">{m.month}</td>
                              <td className="px-4 py-2.5 text-right">{m.peopleServed.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right">${m.totalCost.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-brassbright">${m.costPerPerson.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import Action Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-hairline/60 pt-4">
                  <button 
                    onClick={resetImporter}
                    className="px-4 py-2 border border-hairline text-inkmute rounded-xl text-xs font-bold hover:bg-ink/50 transition-all"
                  >
                    Cancel / Discard
                  </button>
                  <button 
                    onClick={handleImport}
                    disabled={!mapping.name || !mapping.peopleServed || !mapping.totalCost}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      (!mapping.name || !mapping.peopleServed || !mapping.totalCost)
                        ? 'bg-surface2 text-inkfaint border border-hairline cursor-not-allowed'
                        : 'bg-gradient-to-b from-brassbright to-brass text-[#26200e] shadow-lg shadow-brass/25 hover:brightness-105 active:scale-[0.98]'
                    }`}
                  >
                    Confirm & Stream Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <FieldGroup icon={<Target />} title="Theory of Change & Impact">
        <InputField 
          label="Activities" 
          path="theoryOfChange.activities" 
          tooltip="Summary of recurring high-level activities (e.g., '100 Wells Drilled')"
        />
        <InputField 
          label="Key Outputs" 
          path="theoryOfChange.outputs" 
          tooltip="Measurable immediate results (e.g., '50,000 Gallons Clean Water')"
        />
        <InputField 
          label="Key Outcomes" 
          path="theoryOfChange.outcomes" 
          tooltip="Intermediate effects on beneficiaries (e.g., '30% drop in illness')"
        />
        <InputField 
          label="Ultimate Impact" 
          path="theoryOfChange.impact" 
          tooltip="Long-term systemic change being sought"
        />
        <InputField 
          label="SROI Ratio" 
          path="sroi" 
          type="number"
          tooltip="Social Return on Investment. Social value generated per $1 invested."
        />
        <InputField 
          label="Benchmark Comparison" 
          path="benchmarkComparison" 
          tooltip="How your efficiency compares to the sector average"
        />
      </FieldGroup>

      <FieldGroup icon={<Users />} title="Beneficiary Data">
        <InputField 
          label="Total People Served" 
          path="totalPeopleServed" 
          type="number"
          tooltip="Unduplicated count of unique individuals reached this fiscal year"
        />
        <InputField 
          label="Disability %" 
          path="demographics.disabilityPercent" 
          type="number"
          tooltip="Percentage of beneficiaries identifying with a disability"
        />
        <InputField 
          label="Water Access Count" 
          path="outcomesDetails.householdsWaterAccess" 
          type="number"
          tooltip="Total households with new or improved water access"
        />
        <InputField 
          label="Health Improvements" 
          path="outcomesDetails.healthImprovements" 
          type="number"
          tooltip="Documented cases of significant health improvement"
        />
        <InputField 
          label="Behavioral Gains" 
          path="outcomesDetails.behaviorChanges" 
          type="number"
          tooltip="Individuals showing positive sanitation behavior change"
        />
      </FieldGroup>

      <FieldGroup icon={<DollarSign />} title="Financial Metrics">
        <InputField 
          label="Total Budget Spent" 
          path="totalBudgetSpent" 
          type="number"
          tooltip="Cumulative program spending for the period"
        />
        <InputField 
          label="Operating Reserve" 
          path="financials.operatingReserveMonths" 
          type="number"
          tooltip="Months of operations covered by cash reserves"
        />
        <InputField 
          label="Avg Cost Per Person" 
          path="avgCostPerPerson" 
          type="number"
          tooltip="Total Budget / Total People Served"
        />
      </FieldGroup>

      <FieldGroup icon={<ShieldCheck />} title="Verification & Methodology">
        <InputField 
          label="Quality Level" 
          path="dataQuality.level" 
          tooltip="Level of data maturity (e.g., Low, Medium, High, Audited)"
        />
        <InputField 
          label="Methodology" 
          path="dataQuality.method" 
          tooltip="How data was collected (e.g., Surveys, RCT, Site Audits)"
        />
        <InputField 
          label="Last Update" 
          path="dataQuality.lastUpdated" 
          tooltip="The date when this data was last verified"
        />
      </FieldGroup>

      <FieldGroup icon={<TrendingUp />} title="Key Performance Indicators (SaaS KPIs)">
        {(stats.saasKpis || []).map((kpi, idx) => (
          <div key={kpi.id} className="p-5 rounded-2xl border border-hairline/60 bg-ink/50 space-y-4 col-span-1 md:col-span-2 lg:col-span-3">
            <h5 className="font-bold text-parchment text-sm border-b border-hairline/60 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal"></span>
              {kpi.name}
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-inkmute uppercase tracking-wider">Current Value</label>
                <input
                  type="text"
                  disabled={!permissions?.canEditMetrics}
                  value={kpi.value}
                  onChange={(e) => {
                    const newStats = { ...stats };
                    const newKpis = [...(newStats.saasKpis || [])];
                    newKpis[idx] = { ...newKpis[idx], value: e.target.value };
                    newStats.saasKpis = newKpis;
                    onUpdate(newStats);
                  }}
                  className={`w-full px-4 py-2.5 bg-surface border border-hairline rounded-xl text-sm focus:ring-2 focus:ring-teal/40 outline-none transition-all ${!permissions?.canEditMetrics && 'opacity-60 cursor-not-allowed'}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-inkmute uppercase tracking-wider">Percentage Change (%)</label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!permissions?.canEditMetrics}
                  value={kpi.changePercent}
                  onChange={(e) => {
                    const newStats = { ...stats };
                    const newKpis = [...(newStats.saasKpis || [])];
                    newKpis[idx] = { ...newKpis[idx], changePercent: parseFloat(e.target.value) || 0 };
                    newStats.saasKpis = newKpis;
                    onUpdate(newStats);
                  }}
                  className={`w-full px-4 py-2.5 bg-surface border border-hairline rounded-xl text-sm focus:ring-2 focus:ring-teal/40 outline-none transition-all ${!permissions?.canEditMetrics && 'opacity-60 cursor-not-allowed'}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-inkmute uppercase tracking-wider">Brief Explanation</label>
                <input
                  type="text"
                  disabled={!permissions?.canEditMetrics}
                  value={kpi.explanation}
                  onChange={(e) => {
                    const newStats = { ...stats };
                    const newKpis = [...(newStats.saasKpis || [])];
                    newKpis[idx] = { ...newKpis[idx], explanation: e.target.value };
                    newStats.saasKpis = newKpis;
                    onUpdate(newStats);
                  }}
                  className={`w-full px-4 py-2.5 bg-surface border border-hairline rounded-xl text-sm focus:ring-2 focus:ring-teal/40 outline-none transition-all ${!permissions?.canEditMetrics && 'opacity-60 cursor-not-allowed'}`}
                />
              </div>
            </div>
          </div>
        ))}
      </FieldGroup>

      <div className="bg-teal/10 border border-teal/25 rounded-2xl p-6 flex gap-4">
        <div className="bg-teal text-abyss p-3 rounded-xl h-fit">
          <Database size={24} />
        </div>
        <div>
          <h4 className="font-bold text-ivory mb-1">Data Entry Checklist</h4>
          <p className="text-sm text-parchment leading-relaxed max-w-2xl">
            To generate a high-quality <strong className="font-bold text-ivory">Grant Readiness Report</strong>, ensure you have entered verified outcomes and financial efficiency ratios. AI analysis performs best when 'Outcomes' and 'Benchmark' fields match your internal audit documents.
          </p>
        </div>
      </div>
    </div>
    </FieldContext.Provider>
  );
};
