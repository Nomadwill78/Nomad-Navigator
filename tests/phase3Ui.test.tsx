import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Grant } from '../types';

const exportSpy = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/reportPdf', async (orig) => ({ ...(await orig<typeof import('../src/lib/reportPdf')>()), exportFunderReportPDF: exportSpy }));

import { DueSoonCard } from '../components/DueSoonCard';
import { ReportingCalendarPanel } from '../components/ReportingCalendarPanel';
import { KpiDetailsPanel } from '../components/KpiDetailsPanel';
import { FunderReportModal } from '../components/FunderReportModal';
import { todayYmd } from '../src/lib/overview';

const plusDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const grant = (over: Partial<Grant> = {}): Grant => ({
  id: 'g', name: 'Youth Workforce', funder: 'Plough Foundation', amount: 150000, startDate: '2026-01-01', endDate: '2036-12-31', status: 'active', kpis: [], ...over,
});

describe('Due Soon card', () => {
  it('lists a report due in 14 days and one that is late', () => {
    render(<DueSoonCard onOpenGrants={() => {}} grants={[grant({ reports: [
      { id: 'a', title: 'Q3 report', dueDate: plusDays(14), owner: 'Dana' },
      { id: 'b', title: 'Annual report', dueDate: plusDays(-2), owner: '' },
    ] })]} />);
    expect(screen.getByText('Q3 report')).toBeTruthy();
    expect(screen.getByText('Due in 14 days')).toBeTruthy();
    expect(screen.getByText('2 days late')).toBeTruthy();
  });
  it('points to Grants when no reports exist', () => {
    render(<DueSoonCard onOpenGrants={() => {}} grants={[grant()]} />);
    expect(screen.getByText(/No reports on the calendar yet/)).toBeTruthy();
  });
});

describe('Reporting calendar panel', () => {
  it('adds a report and marks one submitted', () => {
    const onChange = vi.fn();
    const g = grant({ reports: [{ id: 'a', title: 'Q3 report', dueDate: plusDays(5), owner: 'Dana' }] });
    render(<ReportingCalendarPanel grant={g} canEdit onChange={onChange} />);
    fireEvent.click(screen.getByText('Mark submitted today'));
    expect(onChange.mock.calls[0][0].reports[0].submittedDate).toBe(todayYmd());
    fireEvent.click(screen.getByText('Add report'));
    expect(onChange.mock.calls[1][0].reports).toHaveLength(2);
  });
  it('is read-only for roles that cannot edit', () => {
    render(<ReportingCalendarPanel grant={grant({ reports: [{ id: 'a', title: 'Q3', dueDate: plusDays(5), owner: '' }] })} canEdit={false} onChange={() => {}} />);
    expect(screen.queryByText('Add report')).toBeNull();
    expect(screen.queryByText('Mark submitted today')).toBeNull();
  });
});

describe('KPI details panel', () => {
  const kpi = { id: 'k', name: 'Youth placed', target: 100, current: 0, unit: 'youth' };
  it('adding a history entry sets the current value', () => {
    const onChange = vi.fn();
    render(<KpiDetailsPanel kpi={kpi} canEdit onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/^Value/), { target: { value: '74' } });
    fireEvent.click(screen.getByText('Add entry'));
    const call = onChange.mock.calls[0][0];
    expect(call.current).toBe(74);
    expect(call.history[0].value).toBe(74);
  });
  it('warns when the age counts do not add up to the KPI', () => {
    render(<KpiDetailsPanel kpi={{ ...kpi, current: 74, ageBreakdown: [{ id: 'a', label: '16-24', count: 70 }] }} canEdit onChange={() => {}} />);
    expect(screen.getByRole('alert').textContent).toMatch(/70.*74/);
  });
  it('does not add an entry without a value', () => {
    const onChange = vi.fn();
    render(<KpiDetailsPanel kpi={kpi} canEdit onChange={onChange} />);
    fireEvent.click(screen.getByText('Add entry'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Funder report modal', () => {
  it('downloads with the narrative the user typed', () => {
    render(<FunderReportModal grant={grant()} orgName="Nomad Test Org" programName="Youth Program" onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/What happened this period/), { target: { value: 'Great year.' } });
    fireEvent.click(screen.getByText('Download PDF'));
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(exportSpy.mock.calls[0][0]).toMatchObject({ orgName: 'Nomad Test Org', narrative: 'Great year.', program: { name: 'Youth Program' } });
  });
  it('shows an error instead of crashing if the PDF fails', () => {
    exportSpy.mockImplementationOnce(() => { throw new Error('boom'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<FunderReportModal grant={grant()} orgName="O" onClose={() => {}} />);
    fireEvent.click(screen.getByText('Download PDF'));
    expect(screen.getByRole('alert').textContent).toMatch(/Could not build the PDF/);
  });
});
