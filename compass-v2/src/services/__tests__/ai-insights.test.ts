import { describe, expect, it } from 'vitest';

import {
  generateDonorInsight,
  generateGrantReportDraft,
  runWeeklyInsights,
  type AgentRunner,
  type AiDeps,
} from 'src/services/ai-insights';
import { createFakeClient, eur } from 'src/services/__tests__/fake-client';

const ASOF = '2026-10-06';

type Call = { agentUniversalIdentifier: string; prompt: string };

const stubAgent = (reply: object | null | ((call: Call) => object | null), failWith?: string) => {
  const calls: Call[] = [];
  const runAgent: AgentRunner = async (call) => {
    calls.push(call);
    if (failWith) return { result: null, error: failWith, success: false };

    return { result: typeof reply === 'function' ? reply(call) : reply, error: null, success: true };
  };

  return { runAgent, calls };
};

const depsFor = (client: AiDeps['client'], runAgent: AgentRunner, overrides: Partial<AiDeps> = {}): AiDeps => ({
  client,
  asOf: ASOF,
  currency: 'USD',
  runAgent,
  donorAgentId: 'donor-agent',
  reportAgentId: 'report-agent',
  includeFreeText: false,
  now: new Date('2026-10-06T15:00:00.000Z'),
  ...overrides,
});

const goodInsight = {
  summary: 'A steady supporter who has not given since January.',
  nextBestAction: 'Send an impact update this week, then invite a renewal.',
  suggestedAskAmount: 300,
  retentionRisk: 'MEDIUM',
  basis: '3 gifts totalling $550, last gift 2026-01-15 of $250.',
  dataGaps: '',
};

const donorFixture = (personOverrides: Record<string, unknown> = {}) =>
  createFakeClient({
    people: [
      {
        id: 'p1',
        name: { firstName: 'Maria', lastName: 'Lopez' },
        emails: { primaryEmail: 'maria.lopez@example.org' },
        contactTypes: ['DONOR'],
        outreachPermission: 'OK_TO_CONTACT',
        volunteerHours: 12,
        ...personOverrides,
      },
    ],
    donations: [
      { id: 'd1', donorId: 'p1', status: 'RECEIVED', giftType: 'ONE_TIME', amount: eur(100), giftDate: '2024-05-01', campaign: null },
      { id: 'd2', donorId: 'p1', status: 'RECEIVED', giftType: 'ONE_TIME', amount: eur(200), giftDate: '2025-05-01', campaign: { name: 'Spring Appeal' } },
      { id: 'd3', donorId: 'p1', status: 'RECEIVED', giftType: 'ONE_TIME', amount: eur(250), giftDate: '2026-01-15', campaign: null },
    ],
    cultivationPlans: [
      { id: 'plan1', donorId: 'p1', stage: 'CULTIVATION', askAmount: eur(1000), nextStep: 'Coffee with the director', nextStepDate: '2026-10-01', purpose: 'Naming the library', updatedAt: '2026-09-01T00:00:00Z' },
    ],
  });

describe('generateDonorInsight', () => {
  it('stores the insight with its sources and an AI label', async () => {
    const fake = donorFixture();
    const agent = stubAgent(goodInsight);

    const outcome = await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');
    const person = fake.row('people', 'p1')!;

    expect(outcome).toEqual({ status: 'stored', warnings: [] });
    expect(person).toMatchObject({
      aiSummary: goodInsight.summary,
      aiNextBestAction: goodInsight.nextBestAction,
      aiSuggestedAsk: { amountMicros: 300_000_000, currencyCode: 'USD' },
      aiRetentionRisk: 'MEDIUM',
      aiGeneratedAt: '2026-10-06T15:00:00.000Z',
    });
    expect(person.aiBasis).toContain('Based on: 3 gifts totalling $550');
    expect(person.aiBasis).toContain('AI-generated from the records in Compass');
  });

  it('never sends the donor\'s name, email or free text to the AI by default', async () => {
    const fake = donorFixture();
    const agent = stubAgent(goodInsight);

    await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');
    const prompt = agent.calls[0].prompt;

    expect(prompt).not.toMatch(/Maria|Lopez|maria\.lopez|example\.org/);
    expect(prompt).not.toContain('Naming the library');
    expect(prompt).not.toContain('Coffee with the director');
    // but it does get the facts it needs
    expect(prompt).toContain('Cash giving: $550 across 3 gifts');
    expect(prompt).toContain('Spring Appeal');
    expect(prompt).toContain('overdue');
  });

  it('includes staff-written plan text only when the workspace opts in', async () => {
    const fake = donorFixture();
    const agent = stubAgent(goodInsight);

    await generateDonorInsight(depsFor(fake.client, agent.runAgent, { includeFreeText: true }), 'p1');

    expect(agent.calls[0].prompt).toContain('Naming the library');
    expect(agent.calls[0].prompt).not.toMatch(/Maria|Lopez/);
  });

  it('does nothing, and calls nothing, for someone who asked not to be contacted', async () => {
    const fake = donorFixture({ outreachPermission: 'DO_NOT_CONTACT' });
    const agent = stubAgent(goodInsight);

    const outcome = await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');

    expect(outcome.status).toBe('skipped');
    expect(agent.calls).toHaveLength(0);
    expect(fake.writes).toEqual([]);
  });

  it('removes the suggested ask for donors who want thank-yous only', async () => {
    const fake = donorFixture({ outreachPermission: 'NO_ASKS' });
    const agent = stubAgent({ ...goodInsight, nextBestAction: 'Ask for a $500 renewal gift.' });

    const outcome = await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');
    const person = fake.row('people', 'p1')!;

    expect(outcome.status).toBe('stored');
    expect(person.aiSuggestedAsk).toBeNull();
    expect(person.aiNextBestAction).toContain('asked not to be asked');
    expect(person.aiBasis).toContain('Check:');
  });

  it('flags figures the AI made up, in the stored basis', async () => {
    const fake = donorFixture();
    const agent = stubAgent({ ...goodInsight, summary: 'Gave $9,400 over the years.' });

    await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');

    expect(fake.row('people', 'p1')!.aiBasis).toContain('$9,400');
  });

  it('does not store a reply that cites no evidence', async () => {
    const fake = donorFixture();
    const agent = stubAgent({ ...goodInsight, basis: '' });

    const outcome = await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');

    expect(outcome).toMatchObject({ status: 'rejected' });
    expect(fake.row('people', 'p1')!.aiSummary).toBeUndefined();
  });

  it('reports an AI outage plainly and stores nothing', async () => {
    const fake = donorFixture();
    const agent = stubAgent(null, 'Out of AI credits');

    const outcome = await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');

    expect(outcome).toEqual({ status: 'failed', reason: 'Out of AI credits' });
    expect(fake.writes).toEqual([]);
  });

  it('caps an unreasonable ask at five times the largest gift', async () => {
    const fake = donorFixture();
    const agent = stubAgent({ ...goodInsight, suggestedAskAmount: 50000 });

    await generateDonorInsight(depsFor(fake.client, agent.runAgent), 'p1');

    expect(fake.row('people', 'p1')!.aiSuggestedAsk).toMatchObject({ amountMicros: 1_250_000_000 });
  });

  it('reports a missing person', async () => {
    const fake = createFakeClient({ people: [] });

    expect((await generateDonorInsight(depsFor(fake.client, stubAgent(goodInsight).runAgent), 'x')).status).toBe('not-found');
  });
});

describe('generateGrantReportDraft', () => {
  const fixture = () =>
    createFakeClient({
      companies: [{ id: 'f1', name: 'Memphis Community Foundation' }],
      grants: [
        {
          id: 'g1', name: 'Clean Water', status: 'ACTIVE', funderId: 'f1',
          awardAmount: eur(50000), spentAmount: eur(20000), startDate: '2026-01-01', endDate: '2026-12-31',
          reportFrequency: 'QUARTERLY', nextReportDue: '2026-10-15',
          kpiProgressPercent: 51.2, timeElapsedPercent: 76.4, percentSpent: 40, pace: 'OFF_PACE',
          purpose: 'Install wells in three neighborhoods',
        },
      ],
      grantKpis: [
        { id: 'k1', grantId: 'g1', name: 'Households', unit: 'households', current: 310, target: 400, asOfDate: '2026-09-30', measurementMethod: 'Sign-in sheets' },
      ],
      subgrantees: [],
      programMetrics: [{ id: 'm1', grantId: 'g1', name: 'Wells', period: '2026-08-01', peopleServed: 120, totalCost: eur(14000) }],
      donations: [],
    });

  it('stores a labeled draft and sends the model the real figures, including shortfalls', async () => {
    const fake = fixture();
    const agent = stubAgent({ draft: 'We reached 310 of 400 households. Progress is behind our schedule.', dataGaps: 'No participant stories.' });

    const outcome = await generateGrantReportDraft(depsFor(fake.client, agent.runAgent), 'g1');
    const grant = fake.row('grants', 'g1')!;

    expect(outcome.status).toBe('stored');
    expect(grant.aiReportDraft).toContain('DRAFT. AI-generated');
    expect(grant.aiReportDraft).toContain('310 of 400 households');
    expect(grant.aiReportDraft).toContain('No participant stories.');
    expect(grant.aiReportGeneratedAt).toBe('2026-10-06T15:00:00.000Z');

    const prompt = agent.calls[0].prompt;
    expect(prompt).toContain('Households: 310 of 400 households, 77.5% (On track)');
    expect(prompt).toContain('method: Sign-in sheets');
    expect(prompt).toContain('Pace: OFF_PACE');
    expect(prompt).not.toContain('Install wells in three neighborhoods');
  });

  it('lists figures in the draft that are not in the records', async () => {
    const fake = fixture();
    const agent = stubAgent({ draft: 'We served 1,200 households and saved 45% in costs.' });

    await generateGrantReportDraft(depsFor(fake.client, agent.runAgent), 'g1');
    const draft = fake.row('grants', 'g1')!.aiReportDraft as string;

    expect(draft).toContain('Check before sending');
    expect(draft).toContain('1,200');
    expect(draft).toContain('45%');
  });

  it('stores nothing when the AI is unavailable', async () => {
    const fake = fixture();

    const outcome = await generateGrantReportDraft(depsFor(fake.client, stubAgent(null, 'AI is turned off').runAgent), 'g1');

    expect(outcome.status).toBe('failed');
    expect(fake.writes).toEqual([]);
  });
});

describe('runWeeklyInsights', () => {
  const people = (count: number, overrides: Record<string, unknown> = {}) =>
    Array.from({ length: count }, (_, index) => ({
      id: `p${index}`,
      name: { firstName: `Donor${index}`, lastName: 'X' },
      contactTypes: ['DONOR'],
      outreachPermission: 'OK_TO_CONTACT',
      givingStatus: 'AT_RISK',
      lastGiftDate: '2026-01-10',
      aiGeneratedAt: null,
      // 10, 100, 1,000, 10,000, 100,000: far enough apart to change the priority
      lifetimeGiving: eur(10 ** (index + 1)),
      ...overrides,
    }));

  it('writes insights for the highest-priority donors up to the limit', async () => {
    const fake = createFakeClient({ people: people(5), donations: [], cultivationPlans: [] });
    const agent = stubAgent(goodInsight);

    const summary = await runWeeklyInsights(depsFor(fake.client, agent.runAgent), 3);

    expect(summary).toMatchObject({ considered: 3, stored: 3, stoppedEarly: null });
    expect(agent.calls).toHaveLength(3);
    // the three largest donors are chosen; the two smallest wait for next week
    for (const id of ['p2', 'p3', 'p4']) expect(fake.row('people', id)!.aiSummary).toBeDefined();
    for (const id of ['p0', 'p1']) expect(fake.row('people', id)!.aiSummary).toBeUndefined();
  });

  it('skips do-not-contact donors and ones refreshed recently', async () => {
    const fake = createFakeClient({
      people: [
        ...people(1, { id: 'dnc', outreachPermission: 'DO_NOT_CONTACT' }),
        ...people(1, { id: 'fresh', aiGeneratedAt: '2026-09-30T00:00:00Z' }),
        ...people(1, { id: 'due' }),
      ],
      donations: [],
      cultivationPlans: [],
    });
    const agent = stubAgent(goodInsight);

    await runWeeklyInsights(depsFor(fake.client, agent.runAgent), 10);

    expect(fake.row('people', 'due')!.aiSummary).toBeDefined();
    expect(fake.row('people', 'dnc')!.aiSummary).toBeUndefined();
    expect(fake.row('people', 'fresh')!.aiSummary).toBeUndefined();
  });

  it('stops at the first AI failure instead of making hundreds of failing calls', async () => {
    const fake = createFakeClient({ people: people(10), donations: [], cultivationPlans: [] });
    const agent = stubAgent(null, 'Out of AI credits');

    const summary = await runWeeklyInsights(depsFor(fake.client, agent.runAgent), 10);

    expect(summary.stoppedEarly).toBe('Out of AI credits');
    expect(agent.calls).toHaveLength(1);
  });
});
