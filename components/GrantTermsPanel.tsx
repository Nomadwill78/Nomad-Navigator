import React from 'react';
import { Plus, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { BudgetCategory, BudgetLine, Grant, GrantReportFrequency, Program } from '../types';
import { BUDGET_CATEGORY_LABELS, checkBudgetLines, computeMatch } from '../src/lib/programs';
import { generateId } from '../src/lib/id';

interface Props {
  grant: Grant;
  programs: Program[];
  canEdit: boolean;
  onChange: (changes: Partial<Grant>) => void;
}

const FREQUENCY_LABELS: Record<GrantReportFrequency, string> = {
  none: 'No set schedule',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Twice a year',
  annual: 'Yearly',
};

const field =
  'w-full px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment placeholder:text-inkfaint outline-none focus:ring-2 focus:ring-teal/40 disabled:opacity-60 disabled:cursor-not-allowed';
const label = 'text-[10px] text-inkfaint uppercase font-bold block mb-1';
const money = (v: number) => `$${v.toLocaleString()}`;
const toMoney = (raw: string) => Math.max(0, parseFloat(raw) || 0);

/**
 * The terms a funder attached to a grant (program, restriction, match, report
 * schedule) plus its budget lines. Everything is entered by the user and saved
 * on the grant; nothing is pre-filled.
 */
export const GrantTermsPanel: React.FC<Props> = ({ grant, programs, canEdit, onChange }) => {
  const lines = grant.budgetLines ?? [];
  const check = checkBudgetLines(grant);
  const match = computeMatch([grant]);

  const updateLine = (id: string, changes: Partial<BudgetLine>) =>
    onChange({ budgetLines: lines.map((l) => (l.id === id ? { ...l, ...changes } : l)) });
  const addLine = () =>
    onChange({ budgetLines: [...lines, { id: generateId(), category: 'personnel', budgeted: 0, spent: 0 }] });
  const removeLine = (id: string) => onChange({ budgetLines: lines.filter((l) => l.id !== id) });

  return (
    <div className="mb-6 p-5 bg-surface rounded-2xl border border-hairline/80 shadow-sm space-y-6">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-inkfaint flex items-center gap-1.5">
          <FileText size={14} className="text-teal" /> Grant terms
        </h4>
        <p className="text-xs text-inkmute mt-1">What this funder requires. Leave a field empty if it does not apply.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label>
          <span className={label}>Program</span>
          <select
            disabled={!canEdit}
            value={grant.programId ?? ''}
            onChange={(e) => onChange({ programId: e.target.value || undefined })}
            className={field}
          >
            <option value="">Not assigned to a program</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Restricted or unrestricted</span>
          <select
            disabled={!canEdit}
            value={grant.restriction ?? ''}
            onChange={(e) => onChange({ restriction: (e.target.value || undefined) as Grant['restriction'] })}
            className={field}
          >
            <option value="">Not set</option>
            <option value="restricted">Restricted (limited to specific uses)</option>
            <option value="unrestricted">Unrestricted (general operations)</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className={label}>Allowed uses</span>
          <textarea
            disabled={!canEdit}
            rows={2}
            value={grant.allowedUses ?? ''}
            onChange={(e) => onChange({ allowedUses: e.target.value })}
            placeholder="For example: youth wages and job coaching only, no equipment over $500"
            className={field}
          />
        </label>
        <label>
          <span className={label}>Required match ($)</span>
          <input
            disabled={!canEdit}
            type="number"
            min={0}
            value={grant.matchRequired ?? ''}
            onChange={(e) => onChange({ matchRequired: e.target.value === '' ? undefined : toMoney(e.target.value) })}
            className={field}
            placeholder="0 if none"
          />
        </label>
        <label>
          <span className={label}>Match secured so far ($)</span>
          <input
            disabled={!canEdit}
            type="number"
            min={0}
            value={grant.matchSecured ?? ''}
            onChange={(e) => onChange({ matchSecured: e.target.value === '' ? undefined : toMoney(e.target.value) })}
            className={field}
            placeholder="0"
          />
        </label>
        <label>
          <span className={label}>Report to this funder</span>
          <select
            disabled={!canEdit}
            value={grant.reportFrequency ?? ''}
            onChange={(e) => onChange({ reportFrequency: (e.target.value || undefined) as GrantReportFrequency | undefined })}
            className={field}
          >
            <option value="">Not set</option>
            {(Object.keys(FREQUENCY_LABELS) as GrantReportFrequency[]).map((f) => (
              <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
            ))}
          </select>
        </label>
        {match.status !== 'none' && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs self-end ${
              match.status === 'met' ? 'text-teal bg-teal/10 border-teal/25' : 'text-brassbright bg-brass/10 border-brass/30'
            }`}
          >
            {match.status === 'met'
              ? `Match met: ${money(match.secured)} of ${money(match.required)}`
              : `Match short by ${money(match.shortfall)} (${money(match.secured)} of ${money(match.required)})`}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold uppercase tracking-wider text-inkfaint">Budget lines</h5>
          {canEdit && (
            <button onClick={addLine} className="text-xs font-bold text-teal flex items-center gap-1">
              <Plus size={14} /> Add line
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-xs text-inkmute">No budget lines yet. Add personnel, supplies, partner pass-through and other lines to break the award down.</p>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2 text-[10px] text-inkfaint uppercase font-bold">
              <span>Category</span><span>Budgeted ($)</span><span>Spent ($)</span><span className="w-6" />
            </div>
            {lines.map((l) => (
              <div key={l.id} className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2 items-center">
                <select
                  disabled={!canEdit}
                  value={l.category}
                  onChange={(e) => updateLine(l.id, { category: e.target.value as BudgetCategory })}
                  className={`${field} col-span-2 sm:col-span-1`}
                >
                  {(Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]).map((c) => (
                    <option key={c} value={c}>{BUDGET_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <input
                  disabled={!canEdit}
                  type="number"
                  min={0}
                  value={l.budgeted}
                  onChange={(e) => updateLine(l.id, { budgeted: toMoney(e.target.value) })}
                  className={field}
                  aria-label="Budgeted amount"
                />
                <input
                  disabled={!canEdit}
                  type="number"
                  min={0}
                  value={l.spent}
                  onChange={(e) => updateLine(l.id, { spent: toMoney(e.target.value) })}
                  className={field}
                  aria-label="Spent amount"
                />
                {canEdit ? (
                  <button onClick={() => removeLine(l.id)} title="Remove line" className="p-1.5 text-inkfaint hover:text-alert rounded-lg">
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <span className="w-6" />
                )}
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-hairline/60 text-xs text-parchment font-semibold">
              <span>Lines total {money(check.budgetedTotal)} of {money(grant.amount)} awarded</span>
              <span>Spent on lines {money(check.spentTotal)}</span>
            </div>
          </div>
        )}

        {check.mismatch && (
          <div role="alert" className="flex items-start gap-2 text-xs text-parchment bg-brass/15 border border-brass/40 px-3 py-2 rounded-xl">
            <AlertTriangle size={14} className="text-brassbright shrink-0 mt-0.5" />
            <span>
              Budget lines add up to {money(check.budgetedTotal)}, which is {money(Math.abs(check.difference))}{' '}
              {check.difference > 0 ? 'more' : 'less'} than the {money(grant.amount)} award. Adjust the lines or the award so they match.
            </span>
          </div>
        )}
        {check.spentMismatch && !check.mismatch && (
          <div className="text-xs text-inkmute bg-ink/50 border border-hairline/60 px-3 py-2 rounded-xl">
            Spending on lines ({money(check.spentTotal)}) differs from the grant's spent amount ({money(grant.spentAmount ?? 0)}).
          </div>
        )}
      </div>
    </div>
  );
};
