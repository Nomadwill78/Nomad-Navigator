import { jsPDF } from 'jspdf';
import { Grant, Program } from '../../types';
import { checkOverspend, computePace, formatYmd, todayYmd } from './overview';
import { checkBudgetLines, BUDGET_CATEGORY_LABELS, computeMatch, listOutcomes, rollUpProgram, Outcome } from './programs';
import { aggregateBreakdown, changeFromBaseline } from './kpiHistory';
import { resolveKpiStatus } from './kpiStatus';
import { computeRisks, Risk } from './risks';
import { reportStatus } from './reporting';

/**
 * Funder report (one grant) and board summary (one program). Each is built in two steps:
 * a pure function that turns entered data into plain lines, and a renderer that draws them.
 * Colors are the Nomad brand: Navy for headers, Midnight for text, Sand for panels, Gold sparingly.
 */

const NAVY: [number, number, number] = [0, 55, 102];
const MIDNIGHT: [number, number, number] = [0, 23, 44];
const GOLD: [number, number, number] = [255, 179, 0];
const SAND: [number, number, number] = [244, 241, 234];
const MUTED: [number, number, number] = [92, 107, 124];

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number) => `${Math.round(n)}%`;
const num = (n: number) => n.toLocaleString('en-US');

// --- Drawing helper -----------------------------------------------------------

class Canvas {
  doc = new jsPDF({ unit: 'mm', format: 'a4' });
  readonly margin = 18;
  readonly width = this.doc.internal.pageSize.getWidth();
  readonly height = this.doc.internal.pageSize.getHeight();
  y = 0;
  constructor(private footerLabel: string) {}

  get inner() { return this.width - this.margin * 2; }

  header(kicker: string, title: string, subtitle: string) {
    const d = this.doc;
    d.setFillColor(...NAVY);
    d.rect(0, 0, this.width, 36, 'F');
    d.setFillColor(...GOLD);
    d.rect(0, 36, this.width, 1.2, 'F');
    d.setTextColor(255, 255, 255);
    d.setFont('helvetica', 'normal'); d.setFontSize(8.5);
    d.text(kicker.toUpperCase(), this.margin, 12);
    d.setFont('helvetica', 'bold'); d.setFontSize(19);
    d.text(title, this.margin, 22, { maxWidth: this.inner });
    d.setFont('helvetica', 'normal'); d.setFontSize(10);
    d.text(subtitle, this.margin, 30, { maxWidth: this.inner });
    this.y = 46;
  }

  private ensure(h: number) {
    if (this.y + h > this.height - 20) {
      this.doc.addPage();
      this.y = 20;
    }
  }

  /** `keepWith` is the height of what follows, so a heading is never left alone at the bottom of a page. */
  heading(text: string, keepWith = 0) {
    this.ensure(14 + keepWith);
    this.y += 3;
    this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(11.5);
    this.doc.setTextColor(...NAVY);
    this.doc.text(text, this.margin, this.y);
    this.doc.setDrawColor(...NAVY); this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.y + 1.8, this.width - this.margin, this.y + 1.8);
    this.y += 7;
  }

  paragraph(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {}) {
    const { size = 9.5, bold = false, color = MIDNIGHT, indent = 0 } = opts;
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal'); this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(text, this.inner - indent) as string[];
    for (const line of lines) {
      this.ensure(size * 0.5 + 1);
      this.doc.text(line, this.margin + indent, this.y);
      this.y += size * 0.5 + 0.8;
    }
  }

  /** A sand-colored row of big numbers with small labels under them. */
  stats(items: { label: string; value: string }[]) {
    this.ensure(22);
    const h = 18;
    this.doc.setFillColor(...SAND);
    this.doc.roundedRect(this.margin, this.y, this.inner, h, 2, 2, 'F');
    const colW = this.inner / items.length;
    items.forEach((it, i) => {
      const x = this.margin + colW * i + 4;
      this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(13); this.doc.setTextColor(...NAVY);
      this.doc.text(it.value, x, this.y + 8, { maxWidth: colW - 6 });
      this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(7.5); this.doc.setTextColor(...MUTED);
      this.doc.text(it.label.toUpperCase(), x, this.y + 14, { maxWidth: colW - 6 });
    });
    this.y += h + 4;
  }

  /** A simple table: header row in navy, rows in plain text. */
  table(columns: { title: string; width: number; align?: 'left' | 'right' }[], rows: string[][]) {
    const total = columns.reduce((a, c) => a + c.width, 0);
    const scale = this.inner / total;
    const rowH = 6;
    const drawRow = (cells: string[], head: boolean) => {
      this.ensure(rowH + 1);
      if (head) { this.doc.setFillColor(...NAVY); this.doc.rect(this.margin, this.y - 4, this.inner, rowH, 'F'); }
      let x = this.margin;
      cells.forEach((cell, i) => {
        const w = columns[i].width * scale;
        this.doc.setFont('helvetica', head ? 'bold' : 'normal'); this.doc.setFontSize(8.5);
        this.doc.setTextColor(...(head ? ([255, 255, 255] as [number, number, number]) : MIDNIGHT));
        const text = this.doc.splitTextToSize(cell, w - 3)[0] ?? '';
        if (columns[i].align === 'right') this.doc.text(text, x + w - 2, this.y, { align: 'right' });
        else this.doc.text(text, x + 2, this.y);
        x += w;
      });
      this.y += rowH;
    };
    drawRow(columns.map((c) => c.title), true);
    rows.forEach((r, i) => {
      if (i % 2 === 1) { this.doc.setFillColor(...SAND); this.doc.rect(this.margin, this.y - 4, this.inner, rowH, 'F'); }
      drawRow(r, false);
    });
    this.y += 2;
  }

  box(title: string, text: string, minHeight: number) {
    this.ensure(minHeight + 8);
    this.doc.setDrawColor(...NAVY); this.doc.setLineWidth(0.4);
    const lines = text.trim() ? (this.doc.splitTextToSize(text, this.inner - 8) as string[]) : [];
    const h = Math.max(minHeight, lines.length * 4.6 + 10);
    this.ensure(h + 4);
    this.doc.roundedRect(this.margin, this.y, this.inner, h, 2, 2, 'S');
    this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(8); this.doc.setTextColor(...MUTED);
    this.doc.text(title.toUpperCase(), this.margin + 4, this.y + 5);
    this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(9.5); this.doc.setTextColor(...MIDNIGHT);
    lines.forEach((l, i) => this.doc.text(l, this.margin + 4, this.y + 11 + i * 4.6));
    this.y += h + 4;
  }

  finish(): jsPDF {
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i);
      this.doc.setDrawColor(...SAND); this.doc.setLineWidth(0.4);
      this.doc.line(this.margin, this.height - 14, this.width - this.margin, this.height - 14);
      this.doc.setFont('helvetica', 'normal'); this.doc.setFontSize(7.5); this.doc.setTextColor(...MUTED);
      this.doc.text(this.footerLabel, this.margin, this.height - 9);
      const label = `Page ${i} of ${pages}`;
      this.doc.text(label, this.width - this.margin, this.height - 9, { align: 'right' });
    }
    return this.doc;
  }
}

// --- Funder report ------------------------------------------------------------

export interface FunderReportInput {
  grant: Grant;
  orgName: string;
  program?: Pick<Program, 'name'> | null;
  narrative?: string;
  today?: string;
}

export function buildFunderReport(input: FunderReportInput) {
  const { grant: g, orgName, program, narrative = '' } = input;
  const today = input.today ?? todayYmd();
  const spent = g.spentAmount ?? 0;
  const pace = computePace(g, today);
  const over = checkOverspend(g);
  const match = computeMatch([g]);
  const budget = checkBudgetLines(g);

  const kpis = g.kpis.map((k) => {
    const info = resolveKpiStatus(k.current, k.target);
    const change = changeFromBaseline(k);
    const outcome = listOutcomes([{ ...g, kpis: [k] }], today)[0];
    const health = outcome?.targets[0]?.health;
    return {
      name: k.name,
      result: `${num(k.current)} of ${num(k.target)} ${k.unit}`.trim(),
      progress: info.status === 'no_target' ? 'No target set' : `${pct(info.progressPercent)} of target`,
      health: health === 'off_track' ? 'Off track' : health === 'at_risk' ? 'At risk' : info.status === 'no_target' ? '' : 'On track',
      baseline: change ? `Baseline ${num(k.baseline!)}, change ${change.change >= 0 ? '+' : ''}${num(change.change)}${change.percent !== null ? ` (${change.percent >= 0 ? '+' : ''}${change.percent}%)` : ''}` : '',
      definition: k.definition ?? '',
      dataSource: k.dataSource ?? '',
    };
  });

  return {
    orgName,
    title: g.name,
    funder: g.funder,
    programName: program?.name ?? '',
    period: `${formatYmd(g.startDate)} to ${formatYmd(g.endDate)}`,
    asOf: formatYmd(today),
    awarded: g.amount,
    spent,
    remaining: g.amount - spent,
    percentSpent: g.amount > 0 ? (spent / g.amount) * 100 : 0,
    percentElapsed: pace.elapsedPercent,
    paceStatus: pace.status,
    overspend: over,
    terms: {
      restriction: g.restriction === 'restricted' ? 'Restricted' : g.restriction === 'unrestricted' ? 'Unrestricted' : '',
      allowedUses: g.allowedUses ?? '',
      match: match.status === 'none' ? '' : `${money(match.secured)} of ${money(match.required)} required match secured`,
    },
    budgetRows: (g.budgetLines ?? []).map((l) => [BUDGET_CATEGORY_LABELS[l.category], money(l.budgeted), money(l.spent)]),
    budgetMismatch: budget.mismatch ? `Budget lines total ${money(budget.budgetedTotal)}, which differs from the ${money(g.amount)} award.` : '',
    kpis,
    ageServed: aggregateBreakdown([g], 'age'),
    ethnicityServed: aggregateBreakdown([g], 'ethnicity'),
    partners: (g.subgrantees ?? []).map((s) => [
      s.name,
      money(s.allocatedAmount),
      money(s.drawnAmount ?? 0),
      s.reportingStatus === 'late' ? 'Late' : s.reportingStatus === 'current' ? 'Up to date' : s.reportingStatus === 'not_started' ? 'Not started' : 'Not set',
    ]),
    reports: (g.reports ?? []).map((r) => {
      const st = reportStatus(r, today);
      return [r.title, formatYmd(r.dueDate), st === 'submitted' ? `Submitted ${formatYmd(r.submittedDate!)}` : st === 'late' ? 'Late' : 'Upcoming'];
    }),
    narrative,
  };
}

export function renderFunderReport(input: FunderReportInput): jsPDF {
  const r = buildFunderReport(input);
  const c = new Canvas(`${r.orgName} | Funder report for ${r.funder} | ${r.title}`);
  c.header(`${r.orgName} | Funder report`, r.title, `${r.funder}${r.programName ? ` | ${r.programName}` : ''} | Grant period ${r.period} | As of ${r.asOf}`);

  c.stats([
    { label: 'Awarded', value: money(r.awarded) },
    { label: 'Spent', value: money(r.spent) },
    { label: 'Remaining', value: money(r.remaining) },
    { label: `Spent vs ${pct(r.percentElapsed)} of time gone`, value: pct(r.percentSpent) },
  ]);
  if (r.overspend.over) {
    c.paragraph(`Spending is ${money(r.overspend.amount)} over the award.`, { bold: true });
  } else if (r.paceStatus === 'at_risk') {
    c.paragraph(`Spending and elapsed time are more than 10 points apart (${pct(r.percentSpent)} spent, ${pct(r.percentElapsed)} of the period gone).`, { color: MUTED });
  }

  const terms = [r.terms.restriction, r.terms.match].filter(Boolean);
  if (terms.length > 0 || r.terms.allowedUses) {
    c.heading('Grant terms');
    if (terms.length > 0) c.paragraph(terms.join(' | '));
    if (r.terms.allowedUses) c.paragraph(`Allowed uses: ${r.terms.allowedUses}`);
  }

  if (r.budgetRows.length > 0) {
    c.heading('Budget and spending by line');
    c.table([{ title: 'Category', width: 3 }, { title: 'Budgeted', width: 2, align: 'right' }, { title: 'Spent', width: 2, align: 'right' }], r.budgetRows);
    if (r.budgetMismatch) c.paragraph(r.budgetMismatch, { color: MUTED });
  }

  c.heading('Results against targets');
  if (r.kpis.length === 0) {
    c.paragraph('No KPIs have been entered for this grant.', { color: MUTED });
  } else {
    for (const k of r.kpis) {
      c.paragraph(k.name, { bold: true });
      c.paragraph(`${k.result} | ${k.progress}${k.health ? ` | ${k.health}` : ''}`, { indent: 3 });
      if (k.baseline) c.paragraph(k.baseline, { indent: 3, color: MUTED, size: 8.5 });
      if (k.definition) c.paragraph(`Definition: ${k.definition}`, { indent: 3, color: MUTED, size: 8.5 });
      if (k.dataSource) c.paragraph(`Data source: ${k.dataSource}`, { indent: 3, color: MUTED, size: 8.5 });
    }
  }

  if (r.ageServed.length > 0 || r.ethnicityServed.length > 0) {
    c.heading('Who was served');
    if (r.ageServed.length > 0) c.paragraph(`By age: ${r.ageServed.map((s) => `${s.name} ${s.value}% (${num(s.count)})`).join(', ')}`);
    if (r.ethnicityServed.length > 0) c.paragraph(`By ethnicity: ${r.ethnicityServed.map((s) => `${s.name} ${s.value}% (${num(s.count)})`).join(', ')}`);
  }

  if (r.partners.length > 0) {
    c.heading('Partners');
    c.table([{ title: 'Partner', width: 4 }, { title: 'Allocated', width: 2, align: 'right' }, { title: 'Drawn', width: 2, align: 'right' }, { title: 'Reporting', width: 2 }], r.partners);
  }

  if (r.reports.length > 0) {
    c.heading('Reporting calendar');
    c.table([{ title: 'Report', width: 4 }, { title: 'Due', width: 2 }, { title: 'Status', width: 3 }], r.reports);
  }

  c.heading('Narrative', 50);
  c.box('Progress, challenges and next steps', r.narrative, 45);
  return c.finish();
}

export function exportFunderReportPDF(input: FunderReportInput) {
  const safe = input.grant.funder.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'funder';
  renderFunderReport(input).save(`funder-report-${safe}-${input.today ?? todayYmd()}.pdf`);
}

// --- Board summary ------------------------------------------------------------

export interface BoardSummaryInput {
  /** Program name, or "All grants". */
  title: string;
  orgName: string;
  grants: Grant[];
  program?: Partial<Pick<Program, 'budgetNeed' | 'populationServed' | 'startDate' | 'endDate'>> | null;
  today?: string;
}

export const MAX_BOARD_RISKS = 3;

export function buildBoardSummary(input: BoardSummaryInput) {
  const today = input.today ?? todayYmd();
  const rollup = rollUpProgram(input.program ?? {}, input.grants, today);
  const risks: Risk[] = computeRisks(input.grants, today, rollup.fundingGap).slice(0, MAX_BOARD_RISKS);
  return { today, rollup, risks, outcomes: rollup.outcomes };
}

const MAX_FUNDER_ROWS = 8;
const MAX_OUTCOME_ROWS = 6;

export function renderBoardSummary(input: BoardSummaryInput): jsPDF {
  const { rollup, risks, outcomes, today } = buildBoardSummary(input);
  const c = new Canvas(`${input.orgName} | Board summary | ${input.title}`);
  const p = input.program;
  c.header(`${input.orgName} | Board summary`, input.title, [p?.populationServed, p?.startDate && p?.endDate ? `${formatYmd(p.startDate)} to ${formatYmd(p.endDate)}` : '', `As of ${formatYmd(today)}`].filter(Boolean).join(' | '));

  c.stats([
    { label: 'Total budget', value: money(rollup.totalBudget) },
    { label: 'Spent', value: money(rollup.totalSpent) },
    { label: 'Funding gap', value: rollup.fundingGap === null ? 'Not set' : money(rollup.fundingGap) },
    { label: 'Match', value: rollup.match.status === 'none' ? 'None required' : rollup.match.status === 'met' ? 'Met' : `Short ${money(rollup.match.shortfall)}` },
  ]);

  c.heading('Funders');
  if (rollup.funders.length === 0) {
    c.paragraph('No active or completed grants.', { color: MUTED });
  } else {
    const rows = rollup.funders.slice(0, MAX_FUNDER_ROWS).map((f) => [f.funder, money(f.amount), money(f.spent), f.restriction === 'restricted' ? 'Restricted' : f.restriction === 'unrestricted' ? 'Unrestricted' : '']);
    c.table([{ title: 'Funder', width: 4 }, { title: 'Awarded', width: 2, align: 'right' }, { title: 'Spent', width: 2, align: 'right' }, { title: 'Type', width: 2 }], rows);
    if (rollup.funders.length > MAX_FUNDER_ROWS) c.paragraph(`and ${rollup.funders.length - MAX_FUNDER_ROWS} more funders`, { color: MUTED, size: 8.5 });
  }

  c.heading('Outcomes');
  if (outcomes.length === 0) {
    c.paragraph('No KPIs entered.', { color: MUTED });
  } else {
    const line = (o: Outcome) => {
      const t = o.targets.map((x) => `${x.funder} ${pct(x.progressPercent)} of ${num(x.target)}`).join('; ');
      return `${o.name}: ${num(o.current)} ${o.unit}${o.shared ? ' (counted once)' : ''}${t ? ` | ${t}` : ''}`;
    };
    outcomes.slice(0, MAX_OUTCOME_ROWS).forEach((o) => c.paragraph(line(o), { size: 9 }));
    if (outcomes.length > MAX_OUTCOME_ROWS) c.paragraph(`and ${outcomes.length - MAX_OUTCOME_ROWS} more outcomes`, { color: MUTED, size: 8.5 });
  }

  c.heading('Top risks');
  if (risks.length === 0) {
    c.paragraph('No risks found in the data entered.', { color: MUTED });
  } else {
    risks.forEach((r, i) => {
      c.paragraph(`${i + 1}. ${r.title}`, { bold: true, size: 9.5 });
      c.paragraph(r.detail, { indent: 4, size: 9 });
    });
  }
  return c.finish();
}

export function exportBoardSummaryPDF(input: BoardSummaryInput) {
  const safe = input.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'program';
  renderBoardSummary(input).save(`board-summary-${safe}-${input.today ?? todayYmd()}.pdf`);
}
