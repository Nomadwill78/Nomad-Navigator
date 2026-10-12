import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  auth: {} as any,
  members: [] as any[],
  invitations: [] as any[],
  fetch: vi.fn(),
}));

vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => h.auth, inviteId: (e: string) => e.trim().toLowerCase() }));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: any, path: string) => ({ path }),
  query: (c: any) => c,
  where: () => ({}),
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false }),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: (ref: any, next: (snap: any) => void) => {
    const rows = ref.path.includes('/members') ? h.members : h.invitations;
    next({ docs: rows.map((r, i) => ({ id: r.userId ?? r.email ?? String(i), data: () => r })) });
    return () => {};
  },
}));

import { BillingView } from '../components/BillingView';
import { TeamManagementView } from '../components/TeamManagementView';
import { SalesPageView } from '../components/SalesPageView';

const user = { getIdToken: async () => 'tok' };
const setAuth = (billing: any, over: any = {}, memberCount = 2) => {
  h.auth = { user: { ...user, uid: 'owner' }, role: 'admin', organization: { id: 'org1', name: 'Org', creatorId: 'owner', memberCount }, billing, ...over };
};
const makeMembers = (n: number) => Array.from({ length: n }, (_, i) => ({ userId: i === 0 ? 'owner' : `m${i}`, email: `m${i}@x.org`, role: i === 0 ? 'admin' : 'viewer', joinedAt: '2026-01-01' }));

beforeEach(() => {
  h.members = []; h.invitations = [];
  h.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://checkout.test' }) }));
  (globalThis as any).fetch = h.fetch;
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('Growth is unlimited everywhere', () => {
  it('Billing shows Unlimited seats for a Growth org even when the stored seatLimit is null or wrong', () => {
    for (const seatLimit of [null, 8, 20, undefined]) {
      setAuth({ plan: 'growth', status: 'active', seatLimit });
      const { unmount } = render(<BillingView />);
      expect(screen.getByText(/Unlimited seats/)).toBeTruthy();
      expect(screen.queryByText(/Up to 8 seats/)).toBeNull();
      unmount();
    }
  });
  it('the plan cards say Starter 3, Growth and Pro unlimited, and never "8" or "20"', () => {
    setAuth({ plan: 'starter', status: 'active', seatLimit: 3 });
    render(<BillingView />);
    expect(screen.getByText('3 team members')).toBeTruthy();
    expect(screen.getAllByText('Unlimited team members')).toHaveLength(2);
    expect(screen.queryByText(/20 team members/)).toBeNull();
    expect(screen.queryByText(/\b8 team members/)).toBeNull();
  });
  it('the public pricing page agrees', () => {
    render(<SalesPageView onGetStarted={() => {}} onLogin={() => {}} onSignUp={() => {}} {...({} as any)} />);
    expect(screen.getByText('3 team members')).toBeTruthy();
    expect(screen.getAllByText('Unlimited team members').length).toBe(2);
    expect(screen.queryByText('8 team members')).toBeNull();
    expect(screen.queryByText('20 team members')).toBeNull();
  });
  it('Team screen: a Growth org with 25 members shows 25 / ∞ and can still invite', () => {
    setAuth({ plan: 'growth', status: 'active', seatLimit: null }, {}, 25);
    h.members = makeMembers(25);
    render(<TeamManagementView />);
    expect(screen.getByText(/∞/)).toBeTruthy();
    expect(screen.getByText(/Unlimited seats/)).toBeTruthy();
    expect(screen.getByText('Invite Colleague')).toBeTruthy();
  });
  it('Team screen: the old bug (null seatLimit turning into 8) cannot come back', () => {
    setAuth({ plan: 'growth', status: 'active', seatLimit: null }, {}, 9);
    h.members = makeMembers(9);
    render(<TeamManagementView />);
    expect(screen.getByText('Invite Colleague')).toBeTruthy(); // 9 members, above the old wrong limit of 8
    expect(screen.queryByText(/All 8 seats/)).toBeNull();
  });
});

describe('exact limits in the Team screen', () => {
  it('Starter with 2 members and 0 invites can invite; with 3 it cannot', () => {
    setAuth({ plan: 'starter', status: 'active', seatLimit: 3 });
    h.members = makeMembers(2);
    const first = render(<TeamManagementView />);
    expect(screen.getByText('Invite Colleague')).toBeTruthy();
    first.unmount();
    h.members = makeMembers(3);
    render(<TeamManagementView />);
    expect(screen.queryByText('Invite Colleague')).toBeNull();
    expect(screen.getByText(/All 3 seats are taken/)).toBeTruthy();
  });
  it('pending invitations are held against the limit', () => {
    setAuth({ plan: 'starter', status: 'active', seatLimit: 3 });
    h.members = makeMembers(2);
    h.invitations = [{ id: 'a@x.org', email: 'a@x.org', role: 'viewer', invitedByEmail: 'o@x.org', orgId: 'org1' }];
    render(<TeamManagementView />);
    expect(screen.queryByText('Invite Colleague')).toBeNull();
    expect(screen.getByText(/2 joined · 1 pending/)).toBeTruthy();
  });
  it('Trial allows 8', () => {
    setAuth({ plan: 'trial', status: 'trialing', seatLimit: 8 });
    h.members = makeMembers(7);
    const first = render(<TeamManagementView />);
    expect(screen.getByText('Invite Colleague')).toBeTruthy();
    first.unmount();
    h.members = makeMembers(8);
    render(<TeamManagementView />);
    expect(screen.queryByText('Invite Colleague')).toBeNull();
  });
  it('a failed payment or ended subscription blocks invites and explains why, without locking anyone out', () => {
    for (const status of ['past_due', 'canceled']) {
      setAuth({ plan: 'growth', status, seatLimit: null });
      h.members = makeMembers(2);
      const { unmount } = render(<TeamManagementView />);
      expect(screen.queryByText('Invite Colleague')).toBeNull();
      expect(screen.getByRole('status').textContent).toMatch(status === 'past_due' ? /payment did not go through/ : /subscription has ended/);
      expect(screen.getAllByText(/m1@x.org/).length).toBeGreaterThan(0); // members still listed
      unmount();
    }
  });
  it('removing a member goes through the server', async () => {
    setAuth({ plan: 'growth', status: 'active', seatLimit: null });
    h.members = makeMembers(3);
    render(<TeamManagementView />);
    fireEvent.click(screen.getAllByTitle('Remove member')[0]);
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    const [url, init] = h.fetch.mock.calls[0];
    expect(url).toBe('/api/remove-member');
    expect(JSON.parse(init.body)).toMatchObject({ orgId: 'org1' });
    expect(init.headers.Authorization).toBe('Bearer tok');
  });
  it('shows the server\'s reason when removal is refused', async () => {
    h.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'The organization owner cannot be removed.' }) }));
    (globalThis as any).fetch = h.fetch;
    setAuth({ plan: 'growth', status: 'active', seatLimit: null });
    h.members = makeMembers(3);
    render(<TeamManagementView />);
    fireEvent.click(screen.getAllByTitle('Remove member')[0]);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/owner cannot be removed/));
  });
});

describe('Billing: one subscription, plan changes, policies', () => {
  it('with no subscription, choosing a plan starts checkout', async () => {
    setAuth({ plan: 'trial', status: 'trialing', seatLimit: 8 });
    render(<BillingView />);
    fireEvent.click(screen.getAllByText('Choose this plan')[0]);
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    expect(h.fetch.mock.calls[0][0]).toBe('/api/create-subscription-checkout');
  });
  it('with a subscription, choosing another plan changes that subscription and never starts a checkout', async () => {
    setAuth({ plan: 'starter', status: 'active', seatLimit: 3, stripeSubscriptionId: 'sub_1', stripeCustomerId: 'cus_1' });
    h.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ plan: 'growth' }) }));
    (globalThis as any).fetch = h.fetch;
    render(<BillingView />);
    fireEvent.click(screen.getByText('Upgrade to Growth'));
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    expect(h.fetch.mock.calls.map((c) => c[0])).toEqual(['/api/change-plan']);
    expect(await screen.findByText(/Your plan is now Compass Growth/)).toBeTruthy();
  });
  it('a downgrade that would not fit is explained and never sent', async () => {
    setAuth({ plan: 'growth', status: 'active', seatLimit: null, stripeSubscriptionId: 'sub_1' }, {}, 5);
    render(<BillingView />);
    fireEvent.click(screen.getByText('Downgrade to Starter'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/5 team members.*allows 3.*Remove 2 members/);
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it('exactly 3 members can downgrade to Starter', async () => {
    setAuth({ plan: 'growth', status: 'active', seatLimit: null, stripeSubscriptionId: 'sub_1' }, {}, 3);
    h.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    (globalThis as any).fetch = h.fetch;
    render(<BillingView />);
    fireEvent.click(screen.getByText('Downgrade to Starter'));
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
  });
  it('the server\'s refusal is shown to the person', async () => {
    setAuth({ plan: 'starter', status: 'active', seatLimit: 3, stripeSubscriptionId: 'sub_1' });
    h.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'This organization already has a subscription.' }) }));
    (globalThis as any).fetch = h.fetch;
    render(<BillingView />);
    fireEvent.click(screen.getByText('Upgrade to Pro'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/already has a subscription/);
  });
  it('failed payment: explained, plan changes are disabled, Manage Billing is offered', () => {
    setAuth({ plan: 'growth', status: 'past_due', seatLimit: null, stripeSubscriptionId: 'sub_1', stripeCustomerId: 'cus_1' });
    render(<BillingView />);
    expect(screen.getByText(/last payment did not go through/)).toBeTruthy();
    expect((screen.getByText('Downgrade to Starter') as HTMLButtonElement).closest('button')!.disabled).toBe(true);
    expect(screen.getByText('Manage Billing')).toBeTruthy();
  });
  it('canceled: explained, and choosing a plan starts a NEW subscription (checkout)', async () => {
    setAuth({ plan: 'growth', status: 'canceled', seatLimit: null, stripeSubscriptionId: 'sub_old', stripeCustomerId: 'cus_1' });
    render(<BillingView />);
    expect(screen.getByText(/subscription has ended/)).toBeTruthy();
    fireEvent.click(screen.getAllByText('Choose this plan')[0]);
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    expect(h.fetch.mock.calls[0][0]).toBe('/api/create-subscription-checkout');
  });
  it('set to cancel at period end: says when, and that access continues', () => {
    setAuth({ plan: 'starter', status: 'active', seatLimit: 3, stripeSubscriptionId: 'sub_1', cancelAtPeriodEnd: true, currentPeriodEnd: '2030-01-15T00:00:00.000Z' });
    render(<BillingView />);
    expect(screen.getByText(/set to end on/)).toBeTruthy();
    expect(screen.getByText(/keeps full access until then/)).toBeTruthy();
  });
  it('a non-admin cannot change the plan', () => {
    setAuth({ plan: 'starter', status: 'active', seatLimit: 3, stripeSubscriptionId: 'sub_1' }, { role: 'viewer' });
    render(<BillingView />);
    expect(screen.getByText(/Only an administrator can change the plan/)).toBeTruthy();
    expect((screen.getByText('Upgrade to Growth').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
