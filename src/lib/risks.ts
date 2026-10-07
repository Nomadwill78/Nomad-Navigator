import { Grant } from '../../types';
import { checkOverspend, computePace, formatYmd, PACE_TOLERANCE_POINTS, todayYmd } from './overview';
import { checkBudgetLines, computeMatch, listOutcomes } from './programs';
import { daysUntil } from './reporting';

/**
 * Plain-language risks worked out from entered data, ranked so a board sees the worst first.
 * Every risk names the grant and the numbers behind it. Nothing is guessed.
 */

export interface Risk {
  /** Higher is worse. Only used for ordering. */
  severity: number;
  title: string;
  detail: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function computeRisks(grants: Grant[], today: string = todayYmd(), fundingGap?: number | null): Risk[] {
  const risks: Risk[] = [];
  const live = grants.filter((g) => g.status !== 'pending');

  for (const g of live) {
    const over = checkOverspend(g);
    if (over.over) {
      risks.push({
        severity: 100,
        title: `${g.funder}: spending is over the award`,
        detail: `${money(g.spentAmount ?? 0)} spent against a ${money(g.amount)} award, ${money(over.amount)} over.`,
      });
    }

    for (const r of g.reports ?? []) {
      if (r.submittedDate) continue;
      const d = daysUntil(r.dueDate, today);
      if (d !== null && d < 0) {
        risks.push({
          severity: 90 + Math.min(-d, 9),
          title: `${g.funder}: "${r.title}" is late`,
          detail: `Due ${formatYmd(r.dueDate)}, now ${-d} day${d === -1 ? '' : 's'} late${r.owner ? ` (owner: ${r.owner})` : ''}.`,
        });
      }
    }

    if (g.status === 'active') {
      const pace = computePace(g, today);
      if (pace.status === 'at_risk') {
        const ahead = pace.gap > 0;
        risks.push({
          severity: 60 + Math.min(Math.abs(pace.gap) / 5, 9),
          title: `${g.funder}: spending ${ahead ? 'ahead of' : 'behind'} the timeline`,
          detail: `${Math.round(pace.spentPercent)}% spent with ${Math.round(pace.elapsedPercent)}% of the grant period gone (more than ${PACE_TOLERANCE_POINTS} points apart).`,
        });
      }
    }

    const match = computeMatch([g]);
    if (match.status === 'short') {
      risks.push({
        severity: 70,
        title: `${g.funder}: match not fully secured`,
        detail: `${money(match.secured)} of ${money(match.required)} required, ${money(match.shortfall)} still to find.`,
      });
    }

    if (checkBudgetLines(g).mismatch) {
      risks.push({
        severity: 40,
        title: `${g.funder}: budget lines do not match the award`,
        detail: `Lines total ${money(checkBudgetLines(g).budgetedTotal)} against a ${money(g.amount)} award.`,
      });
    }

    for (const s of g.subgrantees ?? []) {
      if (s.reportingStatus === 'late') {
        risks.push({
          severity: 45,
          title: `${g.funder}: partner ${s.name} is late reporting`,
          detail: `${money(s.drawnAmount ?? 0)} drawn of ${money(s.allocatedAmount)} allocated.`,
        });
      }
    }
  }

  for (const o of listOutcomes(live, today)) {
    for (const t of o.targets) {
      if (t.health === 'on_track') continue;
      risks.push({
        severity: t.health === 'off_track' ? 80 : 50,
        title: `${t.funder}: "${o.name}" is ${t.health === 'off_track' ? 'off track' : 'at risk'}`,
        detail: `${o.current.toLocaleString('en-US')} of ${t.target.toLocaleString('en-US')} ${o.unit} (${Math.round(t.progressPercent)}% of target).`,
      });
    }
  }

  if (typeof fundingGap === 'number' && fundingGap > 0) {
    risks.push({ severity: 55, title: 'The program is not fully funded', detail: `${money(fundingGap)} still to raise to cover its cost.` });
  }

  return risks.sort((a, b) => b.severity - a.severity || a.title.localeCompare(b.title));
}
