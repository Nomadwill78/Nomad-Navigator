import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProgramsView } from '../components/ProgramsView';
import type { Grant, Program } from '../types';

const program: Program = {
  id: 'p1', name: 'Youth Workforce and Family Stability', description: '', populationServed: 'Youth 16-24',
  startDate: '2026-01-01', endDate: '2026-12-31', budgetNeed: 400000,
};
const grant = (id: string, funder: string, amount: number, spent = 0): Grant => ({
  id, name: `${funder} grant`, funder, amount, spentAmount: spent, startDate: '2026-01-01', endDate: '2026-12-31',
  status: 'active', programId: 'p1', kpis: [],
});
const grants = [
  grant('a', 'Plough Foundation', 150000, 98500), grant('b', 'City of Memphis', 90000),
  grant('c', 'Community bank foundation', 40000), grant('d', 'Individual donors', 35000),
];

const setup = (over: Record<string, unknown> = {}) =>
  render(
    <ProgramsView programs={[program]} grants={grants} canEdit canDelete
      onCreate={vi.fn().mockResolvedValue('new')} onUpdate={vi.fn().mockResolvedValue(undefined)} onDelete={vi.fn()} onOpenGrants={vi.fn()} {...over} />
  );

describe('Programs view', () => {
  it('shows the program with 4 grants and rollup totals equal to the sum', () => {
    setup();
    fireEvent.click(screen.getByText('Youth Workforce and Family Stability'));
    expect(screen.getByText('$315,000')).toBeTruthy();
    expect(screen.getByText('$98,500')).toBeTruthy();
    expect(screen.getByText('$85,000')).toBeTruthy(); // funding gap 400,000 - 315,000
    for (const f of ['Plough Foundation', 'City of Memphis', 'Community bank foundation', 'Individual donors']) {
      expect(screen.getAllByText(f).length).toBeGreaterThan(0);
    }
  });

  it('warns about grants that are not in any program', () => {
    setup({ grants: [...grants, { ...grant('e', 'Loose Funder', 10), programId: undefined }] });
    expect(screen.getByText(/not assigned to a program/i)).toBeTruthy();
  });

  it('refuses to save a program with no name', async () => {
    const onCreate = vi.fn().mockResolvedValue('x');
    setup({ onCreate });
    fireEvent.click(screen.getByText('New program'));
    fireEvent.click(screen.getByText('Save program'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/program name/i));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('hides create and delete controls for read-only roles', () => {
    setup({ canEdit: false, canDelete: false });
    expect(screen.queryByText('New program')).toBeNull();
  });
});
