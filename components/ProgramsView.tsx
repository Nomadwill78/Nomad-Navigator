import React, { useMemo, useState } from 'react';
import { Layers, Plus, Trash2, Edit2, AlertTriangle, Users, Link2 } from 'lucide-react';
import { Grant, Program } from '../types';
import { rollUpProgram, Outcome } from '../src/lib/programs';
import { formatYmd, todayYmd } from '../src/lib/overview';

interface Props {
  programs: Program[];
  grants: Grant[];
  canEdit: boolean;
  canDelete: boolean;
  onCreate: (program: Omit<Program, 'id'>) => Promise<string>;
  onUpdate: (programId: string, changes: Partial<Omit<Program, 'id'>>) => Promise<void>;
  onDelete: (programId: string) => void;
  onOpenGrants: () => void;
}

type Draft = { name: string; description: string; populationServed: string; startDate: string; endDate: string; budgetNeed: string };
const EMPTY_DRAFT: Draft = { name: '', description: '', populationServed: '', startDate: '', endDate: '', budgetNeed: '' };

const money = (v: number) => `$${v.toLocaleString()}`;
const field =
  'w-full px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment placeholder:text-inkfaint outline-none focus:ring-2 focus:ring-teal/40';
const labelCls = 'flex flex-col gap-1 text-xs text-inkfaint';

const HEALTH_TEXT = { on_track: 'On track', at_risk: 'At risk', off_track: 'Off track' } as const;
const HEALTH_STYLE = {
  on_track: 'text-teal bg-teal/10 border-teal/25',
  at_risk: 'text-brassbright bg-brass/10 border-brass/30',
  off_track: 'text-parchment bg-abyss border-hairline',
} as const;

const OutcomeRow: React.FC<{ outcome: Outcome }> = ({ outcome }) => (
  <div className="p-3 rounded-xl bg-ink/50 border border-hairline/60 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-semibold text-parchment">{outcome.name}</p>
      {outcome.shared && (
        <span className="inline-flex items-center gap-1 text-[10px] text-teal whitespace-nowrap">
          <Link2 size={11} /> Counted once
        </span>
      )}
    </div>
    <p className="text-xs text-inkmute">
      {outcome.current.toLocaleString()} {outcome.unit} so far
    </p>
    {outcome.targets.length === 0 ? (
      <p className="text-xs text-inkfaint">No target set.</p>
    ) : (
      outcome.targets.map((t) => (
        <div key={t.grantId} className="space-y-1">
          <div className="flex justify-between text-xs gap-2">
            <span className="text-inkmute">{t.funder}: target {t.target.toLocaleString()}</span>
            <span className={`px-1.5 rounded-md border text-[10px] font-bold ${HEALTH_STYLE[t.health]}`}>
              {Math.round(t.progressPercent)}% · {HEALTH_TEXT[t.health]}
            </span>
          </div>
          <div className="h-1.5 bg-abyss rounded-full overflow-hidden">
            <div className="h-full bg-teal rounded-full" style={{ width: `${Math.min(t.progressPercent, 100)}%` }} />
          </div>
        </div>
      ))
    )}
  </div>
);

export const ProgramsView: React.FC<Props> = ({ programs, grants, canEdit, canDelete, onCreate, onUpdate, onDelete, onOpenGrants }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = programs.find((p) => p.id === selectedId) ?? null;
  const today = todayYmd();
  const unassigned = grants.filter((g) => !g.programId && g.status !== 'pending').length;

  const rollup = useMemo(
    () => (selected ? rollUpProgram(selected, grants.filter((g) => g.programId === selected.id), today) : null),
    [selected, grants, today]
  );

  const startNew = () => {
    setDraft(EMPTY_DRAFT);
    setError(null);
    setEditing('new');
    setSelectedId(null);
  };
  const startEdit = (p: Program) => {
    setDraft({
      name: p.name, description: p.description ?? '', populationServed: p.populationServed ?? '',
      startDate: p.startDate ?? '', endDate: p.endDate ?? '', budgetNeed: p.budgetNeed != null ? String(p.budgetNeed) : '',
    });
    setError(null);
    setEditing(p.id);
  };

  const save = async () => {
    setError(null);
    if (!draft.name.trim()) return setError('Enter a program name before saving.');
    const need = draft.budgetNeed.trim() === '' ? undefined : Number(draft.budgetNeed);
    if (need !== undefined && (!Number.isFinite(need) || need < 0)) return setError('Program cost must be a number that is not negative.');
    const body = {
      name: draft.name.trim(), description: draft.description.trim(), populationServed: draft.populationServed.trim(),
      startDate: draft.startDate, endDate: draft.endDate, ...(need !== undefined ? { budgetNeed: need } : {}),
    };
    setSaving(true);
    try {
      if (editing === 'new') {
        const id = await onCreate(body);
        setSelectedId(id);
      } else if (editing) {
        await onUpdate(editing, { ...body, budgetNeed: need ?? 0 });
      }
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the program.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (p: Program) => {
    const count = grants.filter((g) => g.programId === p.id).length;
    const warn = count > 0 ? ` ${count} grant${count === 1 ? ' is' : 's are'} assigned to it and will become unassigned.` : '';
    if (!confirm(`Delete the program "${p.name}"?${warn} This cannot be undone.`)) return;
    if (selectedId === p.id) setSelectedId(null);
    onDelete(p.id);
  };

  const form = (
    <div className="bg-surface rounded-2xl border border-hairline p-6 space-y-4">
      <h3 className="text-lg font-bold text-ivory">{editing === 'new' ? 'New program' : 'Edit program'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className={`${labelCls} sm:col-span-2`}>Program name
          <input className={field} value={draft.name} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="For example: Youth Workforce and Family Stability" />
        </label>
        <label className={`${labelCls} sm:col-span-2`}>Description
          <textarea className={field} rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </label>
        <label className={labelCls}>Population served
          <input className={field} value={draft.populationServed} onChange={(e) => setDraft({ ...draft, populationServed: e.target.value })} placeholder="For example: youth ages 16 to 24" />
        </label>
        <label className={labelCls}>What it costs to run ($, optional)
          <input className={field} type="number" min={0} value={draft.budgetNeed} onChange={(e) => setDraft({ ...draft, budgetNeed: e.target.value })} placeholder="Used to show the funding gap" />
        </label>
        <label className={labelCls}>Start date
          <input className={field} type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
        </label>
        <label className={labelCls}>End date
          <input className={field} type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
        </label>
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-alert bg-alert/10 border border-alert/25 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-teal text-abyss rounded-lg text-xs font-bold hover:brightness-105 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save program'}
        </button>
        <button onClick={() => setEditing(null)} className="px-4 py-2 bg-white/5 text-inkmute rounded-lg text-xs font-bold hover:bg-white/10">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ivory flex items-center gap-2"><Layers className="text-teal" /> Programs</h2>
          <p className="text-inkmute">A program is what you run. Several funders can pay for the same program.</p>
        </div>
        {canEdit && (
          <button onClick={startNew} className="flex items-center gap-2 bg-teal text-abyss px-4 py-2.5 rounded-lg text-sm font-bold hover:brightness-105">
            <Plus size={16} /> New program
          </button>
        )}
      </div>

      {unassigned > 0 && (
        <div className="flex items-start gap-3 bg-brass/10 border border-brass/25 rounded-2xl p-4 text-xs text-inkmute">
          <AlertTriangle size={16} className="text-brassbright shrink-0 mt-0.5" />
          <p>
            {unassigned} active or completed grant{unassigned === 1 ? ' is' : 's are'} not assigned to a program, so {unassigned === 1 ? 'it does' : 'they do'} not appear in any program rollup.{' '}
            <button onClick={onOpenGrants} className="text-brassbright font-semibold underline">Open Grants to assign {unassigned === 1 ? 'it' : 'them'}</button>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-3">
          {programs.length === 0 && editing !== 'new' ? (
            <div className="py-10 px-6 bg-ink/50 border border-dashed border-hairline rounded-2xl text-center">
              <Layers size={24} className="mx-auto text-inkfaint mb-2" />
              <p className="text-sm text-inkmute">No programs yet. Add your first one, then pick it on each grant that pays for it.</p>
            </div>
          ) : (
            programs.map((p) => {
              const count = grants.filter((g) => g.programId === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setEditing(null); }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedId === p.id ? 'bg-surface border-teal/40' : 'bg-surface/60 border-hairline hover:border-brass/30'}`}
                >
                  <p className="font-bold text-parchment line-clamp-1">{p.name}</p>
                  <p className="text-xs text-inkmute mt-1">{count} {count === 1 ? 'grant' : 'grants'}{p.populationServed ? ` · ${p.populationServed}` : ''}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {editing ? form : selected && rollup ? (
            <>
              <div className="bg-surface rounded-2xl border border-hairline p-6 space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-ivory">{selected.name}</h3>
                    {selected.description && <p className="text-sm text-inkmute mt-1">{selected.description}</p>}
                    <p className="text-xs text-inkfaint mt-2">
                      {[selected.populationServed, selected.startDate && selected.endDate ? `${formatYmd(selected.startDate)} to ${formatYmd(selected.endDate)}` : null].filter(Boolean).join(' · ') || 'No population or dates entered'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && <button onClick={() => startEdit(selected)} title="Edit program" className="p-2 text-inkfaint hover:text-inkmute hover:bg-white/5 rounded-lg"><Edit2 size={18} /></button>}
                    {canDelete && <button onClick={() => remove(selected)} title="Delete program" className="p-2 text-inkfaint hover:text-alert hover:bg-alert/15 rounded-lg"><Trash2 size={18} /></button>}
                  </div>
                </div>
              </div>

              {rollup.grantCount === 0 ? (
                <div className="py-10 px-6 bg-ink/50 border border-dashed border-hairline rounded-2xl text-center text-sm text-inkmute">
                  No active or completed grants in this program yet. Open a grant and choose this program under Grant terms.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-surface border border-hairline rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-inkfaint">Total budget</p>
                      <p className="font-display text-2xl font-semibold text-ivory">{money(rollup.totalBudget)}</p>
                      <p className="text-xs text-inkmute">{rollup.grantCount} {rollup.grantCount === 1 ? 'grant' : 'grants'}</p>
                    </div>
                    <div className="bg-surface border border-hairline rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-inkfaint">Total spent</p>
                      <p className="font-display text-2xl font-semibold text-ivory">{money(rollup.totalSpent)}</p>
                      <p className="text-xs text-inkmute">{rollup.totalBudget > 0 ? `${Math.round((rollup.totalSpent / rollup.totalBudget) * 100)}% of budget` : ''}</p>
                    </div>
                    <div className="bg-surface border border-hairline rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-inkfaint">Funding gap</p>
                      <p className="font-display text-2xl font-semibold text-ivory">{rollup.fundingGap === null ? 'Not set' : money(rollup.fundingGap)}</p>
                      <p className="text-xs text-inkmute">{rollup.fundingGap === null ? 'Enter what the program costs to run' : rollup.fundingGap === 0 ? 'Fully funded' : 'Still to raise'}</p>
                    </div>
                    <div className="bg-surface border border-hairline rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-inkfaint">Match</p>
                      <p className="font-display text-2xl font-semibold text-ivory">
                        {rollup.match.status === 'none' ? 'None required' : rollup.match.status === 'met' ? 'Met' : 'Short'}
                      </p>
                      <p className="text-xs text-inkmute">
                        {rollup.match.status === 'none' ? '' : `${money(rollup.match.secured)} of ${money(rollup.match.required)}`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-inkfaint mb-3">Each funder's requirements, side by side</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rollup.funders.map((f) => (
                        <div key={f.grantId} className="bg-surface border border-hairline rounded-2xl p-4 space-y-3">
                          <div>
                            <p className="font-bold text-parchment">{f.funder}</p>
                            <p className="text-xs text-inkmute">{f.grantName}</p>
                          </div>
                          <p className="text-xs text-inkmute">
                            {money(f.amount)} awarded · {money(f.spent)} spent
                            {f.restriction ? ` · ${f.restriction === 'restricted' ? 'Restricted' : 'Unrestricted'}` : ''}
                            {f.match.status !== 'none' ? ` · Match ${f.match.status === 'met' ? 'met' : `short ${money(f.match.shortfall)}`}` : ''}
                          </p>
                          {f.outcomes.length === 0 ? (
                            <p className="text-xs text-inkfaint">No KPIs entered for this funder.</p>
                          ) : (
                            f.outcomes.map((o) => <OutcomeRow key={o.key} outcome={o} />)
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {rollup.partners.partnerCount > 0 && (
                    <div className="bg-surface border border-hairline rounded-2xl p-4 flex items-start gap-3">
                      <Users size={18} className="text-brassbright mt-0.5" />
                      <p className="text-sm text-parchment/80">
                        {rollup.partners.partnerCount} {rollup.partners.partnerCount === 1 ? 'partner has' : 'partners have'} drawn{' '}
                        <strong className="text-parchment">{money(rollup.partners.drawn)}</strong> of {money(rollup.partners.allocated)} allocated
                        {rollup.partners.drawnPercent !== null ? ` (${rollup.partners.drawnPercent}%)` : ''}.
                        {rollup.partners.late > 0 ? ` ${rollup.partners.late} ${rollup.partners.late === 1 ? 'is' : 'are'} late reporting.` : ''}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="py-16 px-6 bg-ink/50 border border-dashed border-hairline rounded-2xl text-center text-sm text-inkmute">
              Choose a program to see its rollup.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
