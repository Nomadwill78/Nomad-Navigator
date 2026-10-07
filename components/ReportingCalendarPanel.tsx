import React from 'react';
import { CalendarClock, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Grant, ReportDue, ReportStatus } from '../types';
import { describeDue, daysUntil, reportStatus } from '../src/lib/reporting';
import { formatYmd, todayYmd } from '../src/lib/overview';
import { generateId } from '../src/lib/id';

interface Props {
  grant: Grant;
  canEdit: boolean;
  onChange: (changes: Partial<Grant>) => void;
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  upcoming: 'text-teal bg-teal/10 border-teal/25',
  submitted: 'text-inkmute bg-abyss border-hairline',
  late: 'text-brassbright bg-brass/15 border-brass/40',
};
const STATUS_LABEL: Record<ReportStatus, string> = { upcoming: 'Upcoming', submitted: 'Submitted', late: 'Late' };

const field =
  'px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment placeholder:text-inkfaint outline-none focus:ring-2 focus:ring-teal/40 disabled:opacity-60 disabled:cursor-not-allowed';

/** Every report this funder expects, with a due date, an owner and whether it has gone out. */
export const ReportingCalendarPanel: React.FC<Props> = ({ grant, canEdit, onChange }) => {
  const today = todayYmd();
  const reports = [...(grant.reports ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const update = (id: string, changes: Partial<ReportDue>) =>
    onChange({ reports: (grant.reports ?? []).map((r) => (r.id === id ? { ...r, ...changes } : r)) });
  const add = () =>
    onChange({ reports: [...(grant.reports ?? []), { id: generateId(), title: 'Progress report', dueDate: today, owner: '' }] });
  const remove = (id: string) => onChange({ reports: (grant.reports ?? []).filter((r) => r.id !== id) });

  return (
    <div className="mb-6 p-5 bg-surface rounded-2xl border border-hairline/80 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-inkfaint flex items-center gap-1.5">
            <CalendarClock size={14} className="text-teal" /> Reporting calendar
          </h4>
          <p className="text-xs text-inkmute mt-1">
            Reminders are emailed 14 days and 3 days before each due date until you mark the report submitted.
          </p>
        </div>
        {canEdit && (
          <button onClick={add} className="text-xs font-bold text-teal flex items-center gap-1 shrink-0">
            <Plus size={14} /> Add report
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <p className="text-xs text-inkmute">No reports on the calendar yet. Add each report this funder expects.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const status = reportStatus(r, today);
            const d = daysUntil(r.dueDate, today);
            return (
              <div key={r.id} className="p-3 rounded-xl bg-ink/50 border border-hairline/60 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    disabled={!canEdit}
                    value={r.title}
                    onChange={(e) => update(r.id, { title: e.target.value })}
                    className={`${field} flex-1 min-w-[10rem] font-semibold`}
                    aria-label="Report title"
                  />
                  <span className={`px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  {canEdit && (
                    <button onClick={() => remove(r.id)} title="Remove report" className="p-1.5 text-inkfaint hover:text-alert rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1 text-[10px] text-inkfaint uppercase font-bold">
                    Due date
                    <input
                      disabled={!canEdit}
                      type="date"
                      value={r.dueDate}
                      onChange={(e) => e.target.value && update(r.id, { dueDate: e.target.value })}
                      className={field}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-inkfaint uppercase font-bold">
                    Owner
                    <input
                      disabled={!canEdit}
                      value={r.owner}
                      onChange={(e) => update(r.id, { owner: e.target.value })}
                      placeholder="Who is responsible"
                      className={field}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-inkfaint uppercase font-bold">
                    Owner email (for reminders)
                    <input
                      disabled={!canEdit}
                      type="email"
                      value={r.ownerEmail ?? ''}
                      onChange={(e) => update(r.id, { ownerEmail: e.target.value || undefined })}
                      placeholder="Blank: reminders go to admins"
                      className={field}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-inkmute">
                  <span>
                    {r.submittedDate
                      ? `Submitted ${formatYmd(r.submittedDate)}`
                      : d === null ? 'Set a valid due date' : `${describeDue(d)} (${formatYmd(r.dueDate)})`}
                  </span>
                  {canEdit && (
                    r.submittedDate ? (
                      <button onClick={() => update(r.id, { submittedDate: undefined })} className="underline hover:text-parchment">
                        Mark as not submitted
                      </button>
                    ) : (
                      <button
                        onClick={() => update(r.id, { submittedDate: today })}
                        className="inline-flex items-center gap-1 font-bold text-teal"
                      >
                        <CheckCircle2 size={13} /> Mark submitted today
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
