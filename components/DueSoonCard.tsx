import React from 'react';
import { CalendarClock } from 'lucide-react';
import { Grant } from '../types';
import { listDueSoon, describeDue, DUE_SOON_DAYS } from '../src/lib/reporting';
import { formatYmd } from '../src/lib/overview';

interface Props {
  grants: Grant[];
  onOpenGrants: () => void;
}

/** Reports that are late or due in the next 30 days, across the grants being shown. */
export const DueSoonCard: React.FC<Props> = ({ grants, onOpenGrants }) => {
  const items = listDueSoon(grants);
  const hasAnyReports = grants.some((g) => (g.reports ?? []).length > 0);

  return (
    <div className="bg-surface p-6 rounded-xl border border-hairline hover:border-brass/30 transition-colors duration-300 space-y-4">
      <div className="border-b border-hairline pb-3">
        <h3 className="font-display font-semibold text-ivory text-lg flex items-center gap-2">
          <CalendarClock size={20} className="text-teal" /> Due Soon
        </h3>
        <p className="text-xs text-inkmute mt-1 font-mono2">Reports late or due in {DUE_SOON_DAYS} days</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-inkmute leading-relaxed">
          {hasAnyReports
            ? 'Nothing is late or due soon.'
            : 'No reports on the calendar yet. Open a grant and add the reports each funder expects.'}{' '}
          <button onClick={onOpenGrants} className="text-brassbright font-semibold underline">Open Grants</button>
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={`${i.grantId}-${i.report.id}`} className="p-3 rounded-lg bg-ink/60 border border-hairline/70">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-parchment">{i.report.title}</p>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${
                    i.status === 'late' ? 'text-brassbright bg-brass/15 border-brass/40' : 'text-teal bg-teal/10 border-teal/25'
                  }`}
                >
                  {describeDue(i.daysUntil)}
                </span>
              </div>
              <p className="text-xs text-inkmute mt-1">
                {i.funder} · {formatYmd(i.report.dueDate)}{i.report.owner ? ` · ${i.report.owner}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
