import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BreakdownRow, GrantKPI, KpiReportingPeriod } from '../types';
import {
  withEntry, withoutEntry, sortedHistory, trendPoints, changeFromBaseline, breakdownProblem,
  AGE_SUGGESTIONS, ETHNICITY_SUGGESTIONS,
} from '../src/lib/kpiHistory';
import { formatYmd, todayYmd } from '../src/lib/overview';
import { generateId } from '../src/lib/id';

interface Props {
  kpi: GrantKPI;
  canEdit: boolean;
  onChange: (updates: Partial<GrantKPI>) => void;
}

const PERIODS: Record<KpiReportingPeriod, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', semiannual: 'Twice a year', annual: 'Yearly', cumulative: 'Running total',
};

const field =
  'w-full px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment placeholder:text-inkfaint outline-none focus:ring-2 focus:ring-teal/40 disabled:opacity-60 disabled:cursor-not-allowed';
const lab = 'flex flex-col gap-1 text-[10px] text-inkfaint uppercase font-bold';

const BreakdownEditor: React.FC<{
  title: string;
  listId: string;
  suggestions: string[];
  rows: BreakdownRow[];
  canEdit: boolean;
  problem: string | null;
  onChange: (rows: BreakdownRow[]) => void;
}> = ({ title, listId, suggestions, rows, canEdit, problem, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h6 className="text-[10px] uppercase font-bold tracking-wider text-inkfaint">{title}</h6>
      {canEdit && (
        <button onClick={() => onChange([...rows, { id: generateId(), label: '', count: 0 }])} className="text-xs font-bold text-teal flex items-center gap-1">
          <Plus size={12} /> Add group
        </button>
      )}
    </div>
    <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
    {rows.map((r) => (
      <div key={r.id} className="grid grid-cols-[1fr_6rem_auto] gap-2 items-center">
        <input
          disabled={!canEdit}
          list={listId}
          value={r.label}
          onChange={(e) => onChange(rows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
          placeholder="Group"
          className={field}
          aria-label={`${title} group`}
        />
        <input
          disabled={!canEdit}
          type="number"
          min={0}
          value={r.count}
          onChange={(e) => onChange(rows.map((x) => (x.id === r.id ? { ...x, count: Math.max(0, parseInt(e.target.value) || 0) } : x)))}
          className={field}
          aria-label={`${title} count`}
        />
        {canEdit ? (
          <button onClick={() => onChange(rows.filter((x) => x.id !== r.id))} title="Remove group" className="p-1.5 text-inkfaint hover:text-alert rounded-lg">
            <Trash2 size={14} />
          </button>
        ) : <span />}
      </div>
    ))}
    {problem && (
      <p role="alert" className="flex items-start gap-2 text-xs text-parchment bg-brass/15 border border-brass/40 px-3 py-2 rounded-xl">
        <AlertTriangle size={14} className="text-brassbright shrink-0 mt-0.5" /> {problem}
      </p>
    )}
  </div>
);

/** Baseline, period, source, definition, history with a trend line, and who was served. All entered by the user. */
export const KpiDetailsPanel: React.FC<Props> = ({ kpi, canEdit, onChange }) => {
  const [entryDate, setEntryDate] = useState(todayYmd());
  const [entryValue, setEntryValue] = useState('');
  const history = sortedHistory(kpi);
  const trend = trendPoints(kpi);
  const change = changeFromBaseline(kpi);

  const addEntry = () => {
    const value = Number(entryValue);
    if (entryValue.trim() === '' || !Number.isFinite(value) || value < 0 || !entryDate) return;
    const next = withEntry(kpi, { id: generateId(), date: entryDate, value });
    onChange({ history: next.history, current: next.current });
    setEntryValue('');
  };
  const removeEntry = (id: string) => {
    const next = withoutEntry(kpi, id);
    onChange({ history: next.history, current: next.current });
  };

  return (
    <details className="group/details">
      <summary className="cursor-pointer list-none flex items-center gap-1 text-xs font-bold text-inkmute hover:text-parchment select-none">
        <ChevronDown size={14} className="transition-transform group-open/details:rotate-180" />
        Details, history and who was served
      </summary>

      <div className="mt-4 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={lab}>
            Baseline (where it started)
            <input
              disabled={!canEdit}
              type="number"
              value={kpi.baseline ?? ''}
              onChange={(e) => onChange({ baseline: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              className={field}
            />
          </label>
          <label className={lab}>
            Reporting period
            <select
              disabled={!canEdit}
              value={kpi.reportingPeriod ?? ''}
              onChange={(e) => onChange({ reportingPeriod: (e.target.value || undefined) as KpiReportingPeriod | undefined })}
              className={field}
            >
              <option value="">Not set</option>
              {(Object.keys(PERIODS) as KpiReportingPeriod[]).map((p) => <option key={p} value={p}>{PERIODS[p]}</option>)}
            </select>
          </label>
          <label className={lab}>
            Data source
            <input disabled={!canEdit} value={kpi.dataSource ?? ''} onChange={(e) => onChange({ dataSource: e.target.value })} placeholder="For example: intake forms, payroll records" className={field} />
          </label>
          <label className={lab}>
            Required by which funder
            <input disabled={!canEdit} value={kpi.requiredBy ?? ''} onChange={(e) => onChange({ requiredBy: e.target.value })} className={field} />
          </label>
          <label className={`${lab} sm:col-span-2`}>
            Definition (what counts)
            <textarea disabled={!canEdit} rows={2} value={kpi.definition ?? ''} onChange={(e) => onChange({ definition: e.target.value })} placeholder="For example: a youth who stayed in an unsubsidized job for 90 days" className={field} />
          </label>
        </div>
        {change && (
          <p className="text-xs text-parchment">
            Change from baseline: <strong>{change.change >= 0 ? '+' : ''}{change.change.toLocaleString()}</strong>
            {change.percent !== null ? ` (${change.percent >= 0 ? '+' : ''}${change.percent}%)` : ''} since {kpi.baseline!.toLocaleString()}.
          </p>
        )}

        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-inkfaint">History</h5>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <label className={lab}>
                Period ends
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={field} />
              </label>
              <label className={lab}>
                Value
                <input type="number" min={0} value={entryValue} onChange={(e) => setEntryValue(e.target.value)} className={`${field} w-32`} />
              </label>
              <button onClick={addEntry} className="px-3 py-2 bg-teal text-abyss rounded-lg text-xs font-bold hover:brightness-105">Add entry</button>
            </div>
          )}
          {history.length === 0 ? (
            <p className="text-xs text-inkmute">No entries yet. Add one per period to see a trend. The latest entry becomes the current value.</p>
          ) : (
            <ul className="text-xs text-parchment space-y-1">
              {history.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 bg-ink/50 border border-hairline/60 rounded-lg px-3 py-1.5">
                  <span>{formatYmd(e.date)}: <strong>{e.value.toLocaleString()}</strong> {kpi.unit}</span>
                  {canEdit && (
                    <button onClick={() => removeEntry(e.id)} title="Remove entry" className="text-inkfaint hover:text-alert"><Trash2 size={13} /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {trend ? (
            <div className="h-36" aria-label={`Trend of ${kpi.name}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.map((p) => ({ ...p, label: formatYmd(p.date) }))}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#93a6c2' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#93a6c2' }} width={40} />
                  <Tooltip contentStyle={{ background: '#0b1c33', borderRadius: '10px', border: '1px solid #24405f' }} />
                  <Line type="monotone" dataKey="value" name={kpi.name} stroke="#4fc4d3" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : history.length === 1 ? (
            <p className="text-xs text-inkmute">Add one more entry to draw a trend line.</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-inkfaint">Who was served</h5>
          <BreakdownEditor
            title="By age"
            listId={`age-${kpi.id}`}
            suggestions={AGE_SUGGESTIONS}
            rows={kpi.ageBreakdown ?? []}
            canEdit={canEdit}
            problem={breakdownProblem(kpi, 'age')}
            onChange={(rows) => onChange({ ageBreakdown: rows })}
          />
          <BreakdownEditor
            title="By ethnicity"
            listId={`eth-${kpi.id}`}
            suggestions={ETHNICITY_SUGGESTIONS}
            rows={kpi.ethnicityBreakdown ?? []}
            canEdit={canEdit}
            problem={breakdownProblem(kpi, 'ethnicity')}
            onChange={(rows) => onChange({ ethnicityBreakdown: rows })}
          />
        </div>
      </div>
    </details>
  );
};
