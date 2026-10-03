import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataManagementView } from '../components/DataManagementView';
import { EMPTY_STATS } from '../src/lib/orgData';
import { DashboardStats } from '../types';

vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));

function Harness({ onStats }: { onStats?: (s: DashboardStats) => void }) {
  const [stats, setStats] = React.useState<DashboardStats>(structuredClone(EMPTY_STATS));
  return (
    <DataManagementView
      stats={stats}
      onUpdate={(s) => {
        setStats(s);
        onStats?.(s);
      }}
    />
  );
}

const field = (label: RegExp) => screen.getByText(label).closest('div')!.parentElement!.querySelector('input')!;

describe('Manage Metrics data entry', () => {
  it('keeps focus and every character while typing a multi-digit number', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = field(/^Water Access Count$/i);
    await user.click(input);
    await user.clear(input);
    await user.type(input, '540');
    expect(field(/^Water Access Count$/i).value).toBe('540');
    expect(document.activeElement).toBe(field(/^Water Access Count$/i));
  });

  it('types a full sentence into a text field without losing characters', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = field(/^Activities$/i);
    await user.click(input);
    await user.clear(input);
    await user.type(input, '240 community workshops');
    expect(field(/^Activities$/i).value).toBe('240 community workshops');
  });

  it('never stores NaN when a number field is cleared', async () => {
    const user = userEvent.setup();
    let last: DashboardStats | undefined;
    render(<Harness onStats={(s) => (last = s)} />);
    const input = field(/^Total People Served$/i);
    await user.type(input, '12');
    await user.clear(input);
    expect(last!.totalPeopleServed).toBe(0);
    expect(Number.isNaN(last!.totalPeopleServed)).toBe(false);
  });

  it('does not mutate the previous stats object', async () => {
    const user = userEvent.setup();
    const seen: DashboardStats[] = [];
    render(<Harness onStats={(s) => seen.push(s)} />);
    await user.type(field(/^Water Access Count$/i), '7');
    await user.type(field(/^Water Access Count$/i), '8');
    expect(seen.length).toBeGreaterThan(1);
    expect(seen[0].outcomesDetails.householdsWaterAccess).toBe(7);
    expect(seen[0].outcomesDetails).not.toBe(seen[1].outcomesDetails);
  });
});
