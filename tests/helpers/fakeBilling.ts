import type { BillingIssue, BillingRecord, BillingStore, ClaimResult, StripeLike, StripeSubscription } from '../../src/server/billing';

export const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_fake',
  STRIPE_PRICE_STARTER: 'price_starter',
  STRIPE_PRICE_GROWTH: 'price_growth',
  STRIPE_PRICE_PRO: 'price_pro',
  APP_URL: 'https://app.example.org',
};

export const sub = (over: Partial<StripeSubscription> & { id: string }): StripeSubscription => ({
  status: 'active', customer: 'cus_1', metadata: { orgId: 'org1' }, cancel_at_period_end: false,
  items: { data: [{ id: 'si_1', price: { id: 'price_starter' }, current_period_end: 1_800_000_000 }] },
  ...over,
});

export class FakeStripe implements StripeLike {
  subs = new Map<string, StripeSubscription>();
  calls: { method: string; args: any[] }[] = [];
  customerSeq = 0;
  sessionKeys: string[] = [];
  updateKeys: string[] = [];

  subscriptions = {
    retrieve: async (id: string) => {
      this.calls.push({ method: 'retrieve', args: [id] });
      const s = this.subs.get(id);
      if (!s) throw Object.assign(new Error('No such subscription'), { code: 'resource_missing' });
      return JSON.parse(JSON.stringify(s));
    },
    update: async (id: string, params: any, options?: { idempotencyKey?: string }) => {
      this.calls.push({ method: 'update', args: [id, params] });
      if (options?.idempotencyKey) this.updateKeys.push(options.idempotencyKey);
      const s = this.subs.get(id)!;
      if (params.items) s.items.data = s.items.data.map((i) => { const u = params.items.find((x: any) => x.id === i.id); return u ? { ...i, price: { id: u.price } } : i; });
      if (params.metadata) s.metadata = params.metadata;
      return JSON.parse(JSON.stringify(s));
    },
    cancel: async (id: string, params?: any) => {
      this.calls.push({ method: 'cancel', args: [id, params] });
      const s = this.subs.get(id)!;
      s.status = 'canceled';
      return JSON.parse(JSON.stringify(s));
    },
    list: async (params: any) => {
      this.calls.push({ method: 'list', args: [params] });
      return { data: [...this.subs.values()].filter((s) => (typeof s.customer === 'string' ? s.customer : s.customer.id) === params.customer).map((s) => JSON.parse(JSON.stringify(s))) };
    },
  };
  customers = {
    create: async (_p: any, _o?: any) => { this.calls.push({ method: 'customers.create', args: [] }); return { id: `cus_new${++this.customerSeq}` }; },
  };
  checkout = {
    sessions: {
      create: async (params: any, options?: { idempotencyKey?: string }) => {
        this.calls.push({ method: 'checkout.create', args: [params] });
        if (options?.idempotencyKey) this.sessionKeys.push(options.idempotencyKey);
        return { url: `https://checkout.stripe.test/${params.line_items[0].price}` };
      },
    },
  };
  count = (method: string) => this.calls.filter((c) => c.method === method).length;
}

export class FakeStore implements BillingStore {
  billing = new Map<string, BillingRecord>();
  issues: { orgId: string; issue: BillingIssue }[] = [];
  events = new Map<string, { status: 'processing' | 'done' | 'failed'; outcome?: string; error?: string }>();
  memberCounts = new Map<string, number>();
  writes = 0;

  async getBilling(orgId: string) { return this.billing.get(orgId) ?? null; }
  async setBilling(orgId: string, patch: BillingRecord) { this.writes++; this.billing.set(orgId, { ...(this.billing.get(orgId) ?? {}), ...patch }); }
  async adoptSubscription(orgId: string, subId: string, patch: BillingRecord, isRecordedLive: (id: string) => Promise<boolean>) {
    const cur = this.billing.get(orgId);
    const held = cur?.stripeSubscriptionId;
    if (held && held !== subId && (await isRecordedLive(held))) return { applied: false as const, heldBy: held };
    await this.setBilling(orgId, patch);
    return { applied: true as const };
  }
  async recordIssue(orgId: string, issue: BillingIssue) { this.issues.push({ orgId, issue }); }
  async claimEvent(id: string): Promise<ClaimResult> {
    const e = this.events.get(id);
    if (!e || e.status === 'failed') { this.events.set(id, { status: 'processing' }); return 'new'; }
    return e.status === 'done' ? 'duplicate' : 'in_progress';
  }
  async finishEvent(id: string, outcome: string) { this.events.set(id, { status: 'done', outcome }); }
  async failEvent(id: string, error: string) { this.events.set(id, { status: 'failed', error }); }
  async countMembers(orgId: string) { return this.memberCounts.get(orgId) ?? 1; }
}

export const evt = (id: string, type: string, object: any) => ({ id, type, data: { object } });
