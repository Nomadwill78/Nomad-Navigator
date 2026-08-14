import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Target,
  DollarSign,
  Sparkles,
  Users,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const BEARINGS = [
  {
    deg: 'N 000°',
    key: 'Impact',
    title: 'Know what your programs are accomplishing.',
    body: 'Track people served, outcomes, KPIs, costs, demographic reach, and other measures that tell the story behind your mission.',
  },
  {
    deg: 'E 090°',
    key: 'Funding',
    title: 'Know where your grant portfolio stands.',
    body: 'Track awards, spending, timelines, KPIs, subgrantees, and burn rate so you can see which grants are on track and where attention is needed.',
  },
  {
    deg: 'W 270°',
    key: 'Direction',
    title: 'Know what your data is telling you.',
    body: 'Nomad Compass turns your organizational data into structured reports and strategic recommendations designed to help you communicate performance and prepare for funder conversations.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Bring in your data',
    body: 'Enter your program metrics manually or import them through CSV. Your data becomes the foundation for everything that follows.',
  },
  {
    n: '02',
    title: 'Track your grants',
    body: 'Create grants, establish KPIs, monitor spending, track timelines, and see whether your performance is keeping pace with your commitments.',
  },
  {
    n: '03',
    title: 'Measure what matters',
    body: 'Connect program activity to measurable outcomes. Track:',
    items: ['People served', 'Outcomes', 'Costs', 'KPIs', 'SROI', 'Demographics', 'Verification methodology', 'Program performance'],
  },
  {
    n: '04',
    title: 'Monitor grant health',
    body: 'See spending against award amounts and time elapsed. Identify:',
    items: ['High Burn Rate', 'Underutilization', 'On Track'],
    footer: 'Before a problem becomes a funder conversation.',
  },
  {
    n: '05',
    title: 'Generate the report',
    body: 'Use Nomad AI to turn your organizational data into a structured impact report. Reports can include:',
    items: [
      'Executive Summary',
      'Grant Readiness Assessment',
      'SWOT Analysis',
      'Outcomes & Effectiveness',
      'Equity & Inclusion Audit',
      'Financial Sustainability',
      'Strategic Recommendations',
    ],
  },
];

const ROLES = [
  { name: 'Administrators', body: 'Manage the organization and team.' },
  { name: 'Grant Coordinators', body: 'Manage grants and monitor performance.' },
  { name: 'Impact Analysts', body: 'Maintain program metrics and impact data.' },
  { name: 'Compliance Officers', body: 'Access the information needed for oversight and reporting.' },
  { name: 'Data Entry', body: 'Maintain approved organizational metrics.' },
  { name: 'Viewers', body: 'See the information they need without changing it.' },
];

interface Plan {
  name: string;
  price: string;
  tagline: string;
  audience: string;
  members: string;
  features: string[];
  everythingIn?: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Compass Starter',
    price: '$49',
    tagline: 'Know where your nonprofit stands.',
    audience: 'For smaller nonprofits building a disciplined approach to grant and impact management.',
    members: '3 team members',
    features: [
      'Grant tracking',
      'KPI & impact tracking',
      'Burn-rate monitoring',
      'CSV data import',
      'PDF / CSV / JSON exports',
      'Offline access',
      '2 AI Impact Reports/month',
    ],
  },
  {
    name: 'Compass Growth',
    price: '$99',
    tagline: 'Turn your data into management intelligence.',
    audience: 'For growing nonprofits managing multiple grants, programs, and reporting requirements.',
    members: '8 team members',
    everythingIn: 'Starter',
    features: [
      'Subgrantee tracking',
      'Advanced KPI management',
      'Board Reports',
      '10 AI Impact Reports/month',
      'Priority support',
      'Guided onboarding',
    ],
    popular: true,
  },
  {
    name: 'Compass Pro',
    price: '$199',
    tagline: 'Build a stronger funding and impact operation.',
    audience: 'For established nonprofits with larger teams and more complex grant portfolios.',
    members: '20 team members',
    everythingIn: 'Growth',
    features: [
      'Unlimited AI Impact Reports*',
      'Advanced reporting workflows',
      'Custom onboarding',
      'Data-review session',
      'Priority support',
    ],
  },
];

const INCLUDED = [
  'Secure nonprofit workspace',
  'Grant & impact tracking',
  'Role-based team access',
  'Data exports',
  'Offline access',
  'AI-powered reporting',
  'No long-term contract',
];

const FAQS = [
  {
    q: 'Is Nomad Compass only for large nonprofits?',
    a: 'No. Nomad Compass is designed specifically for small-to-mid-sized nonprofits that need stronger grant, impact, and reporting infrastructure without building an entire data department.',
  },
  {
    q: 'Do I need a data analyst to use it?',
    a: 'No. The product is designed for nonprofit professionals who need to manage and understand organizational data without requiring a dedicated analytics team.',
  },
  {
    q: 'Can I import existing data?',
    a: 'Yes. Nomad Compass supports CSV import with mapping and preview functionality.',
  },
  {
    q: 'Can multiple people use the same organization?',
    a: 'Yes. Team roles and organization membership are built into the product.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Depending on the feature, Nomad Compass supports PDF, CSV, and JSON exports.',
  },
  {
    q: 'Does Nomad Compass work offline?',
    a: 'Supported cached workflows can continue when the network connection drops, with the application indicating that it is working from cached data.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. The current launch offer is a 30-day free trial for the first 10 nonprofits, with no credit card required.',
  },
  {
    q: 'Is AI included?',
    a: 'Yes. AI-powered impact reporting is included in all plans, with different monthly usage levels by plan.',
  },
];

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono2 text-[0.62rem] tracking-[0.28em] uppercase text-brass mb-3 text-center">{children}</p>
);

const PrimaryCta: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <a
    href="/free-trial"
    className={`inline-flex items-center justify-center gap-2 bg-gradient-to-b from-brassbright to-brass text-[#26200e] px-7 py-3.5 rounded-xl font-black text-base hover:brightness-105 transition-all active:scale-95 shadow-lg shadow-brass/25 ${className}`}
  >
    {children} <ArrowRight size={18} />
  </a>
);

const FaqItem: React.FC<{ q: string; a: string; open: boolean; onToggle: () => void }> = ({ q, a, open, onToggle }) => (
  <div className="border-b border-hairline/60 py-5">
    <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 text-left">
      <span className="font-bold text-parchment">{q}</span>
      <ChevronDown size={18} className={`text-inkfaint shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <p className="text-sm text-inkmute leading-relaxed mt-3 max-w-2xl">{a}</p>}
  </div>
);

export const SalesPageView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="compass-canvas min-h-screen bg-ink text-parchment font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-ink/85 backdrop-blur-md border-b border-hairline/40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo size={34} variant="light" />
          <a href="/" className="text-inkfaint hover:text-brass text-xs font-bold uppercase tracking-widest transition-colors">
            Sign In
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <Eyebrow>Nomad Compass</Eyebrow>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ivory tracking-tight leading-tight mb-5">
          Your nonprofit has the data.
          <br />
          Now make it work for you.
        </h1>
        <p className="text-inkmute text-lg leading-relaxed max-w-2xl mx-auto mb-2">
          Nomad Compass brings your grants, impact metrics, program performance, and funder reporting into one
          intelligent workspace.
        </p>
        <p className="text-inkmute leading-relaxed max-w-2xl mx-auto mb-8">
          Stop chasing spreadsheets, rebuilding reports, and trying to remember which numbers belong to which
          grant. Track the work. Understand the impact. Know where you're headed.
        </p>
        <PrimaryCta>Request Your 30-Day Free Trial</PrimaryCta>
        <p className="font-mono2 text-[0.6rem] tracking-[0.14em] uppercase text-inkfaint mt-4">
          No credit card required · First 10 nonprofits · 30 days free
        </p>
      </section>

      {/* Problem */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center border-t border-hairline/40">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory mb-4">
          Your mission deserves better than scattered spreadsheets.
        </h2>
        <p className="text-inkmute leading-relaxed mb-8">
          Nonprofit teams are expected to answer difficult questions:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
          {[
            'How are our programs performing?',
            'Are we meeting our grant commitments?',
            'Where are we spending too much—or too little?',
            'Can we prove our impact to funders?',
            'What should we focus on next?',
          ].map((q) => (
            <div key={q} className="bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-parchment font-medium">
              {q}
            </div>
          ))}
        </div>
        <p className="text-inkmute leading-relaxed">
          But the answers are often scattered across spreadsheets, reports, emails, databases, and someone's
          memory. <span className="text-parchment font-semibold">Nomad Compass puts the answers in one place.</span>
        </p>
      </section>

      {/* Three Bearings */}
      <section className="border-t border-hairline/40 bg-abyss/40">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Eyebrow>One Compass. Three Bearings.</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {BEARINGS.map((b) => (
              <div key={b.key} className="bg-surface border border-hairline rounded-2xl p-6">
                <p className="font-mono2 text-[0.62rem] tracking-[0.2em] text-inkfaint mb-2">{b.deg}</p>
                <h3 className="font-display text-xl font-semibold text-teal mb-3">{b.key}</h3>
                <p className="text-sm font-bold text-parchment mb-2">{b.title}</p>
                <p className="text-sm text-inkmute leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* From raw data to funding-ready intelligence */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-hairline/40">
        <Eyebrow>From Raw Data to Funding-Ready Intelligence</Eyebrow>
        <div className="mt-10 space-y-8">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-6">
              <div className="font-display text-3xl font-black text-brass/50 shrink-0 w-12">{s.n}</div>
              <div className="flex-1 border-l border-hairline/60 pl-6 pb-2">
                <h3 className="font-bold text-ivory text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-inkmute leading-relaxed mb-3">{s.body}</p>
                {s.items && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {s.items.map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1 bg-white/5 text-inkmute border border-hairline rounded-lg text-[10px] font-mono2 font-bold uppercase tracking-wider"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {s.footer && <p className="text-sm text-brassbright font-medium">{s.footer}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Built for the people actually doing the work */}
      <section className="border-t border-hairline/40 bg-abyss/40">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory mb-4">
            Built for the people actually doing the work
          </h2>
          <p className="text-inkmute leading-relaxed mb-6">
            Nomad Compass isn't designed around the assumption that every nonprofit has a data analyst sitting in
            the next office. It's built for the grant coordinator who may be responsible for:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left mb-6 max-w-xl mx-auto">
            {[
              'Multiple grants',
              'Multiple reporting deadlines',
              'Program metrics',
              'KPI tracking',
              'Subgrantee reporting',
              'Budget monitoring',
              'Funder communication',
              'Board reporting',
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-inkmute font-medium">
                <Check size={12} className="text-teal shrink-0" /> {item}
              </div>
            ))}
          </div>
          <p className="text-parchment font-semibold leading-relaxed">
            One person shouldn't have to rebuild the organization's story every time someone asks for an update.
          </p>
        </div>
      </section>

      {/* Roles */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-hairline/40">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory mb-3">
            Your grants. Your data. Your team.
          </h2>
          <p className="text-inkmute">Nomad Compass supports collaboration across your organization.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((r) => (
            <div key={r.name} className="bg-surface border border-hairline rounded-xl p-5 flex items-start gap-3">
              <div className="p-2 bg-teal/10 border border-teal/25 rounded-lg text-teal shrink-0">
                <Users size={16} />
              </div>
              <div>
                <h3 className="font-bold text-parchment text-sm mb-1">{r.name}</h3>
                <p className="text-xs text-inkmute leading-relaxed">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* See the story behind the numbers */}
      <section className="border-t border-hairline/40 bg-abyss/40">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory mb-4">
            See the story behind the numbers
          </h2>
          <p className="text-inkmute leading-relaxed mb-6">
            A spreadsheet can tell you that you've served 4,500 people. Nomad Compass helps you ask:
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[
              'What happened?',
              'How much did it cost?',
              'Did we meet our target?',
              'Which grant supported the work?',
              'Are we on track?',
              'What should we do next?',
            ].map((q) => (
              <span key={q} className="px-3 py-1.5 bg-surface border border-hairline rounded-full text-xs text-parchment font-medium">
                {q}
              </span>
            ))}
          </div>
          <p className="text-parchment font-semibold">
            That's the difference between recording data and using data.
          </p>
        </div>
      </section>

      {/* Reporting shouldn't start from scratch */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center border-t border-hairline/40">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory mb-4">
          Reporting shouldn't start from scratch
        </h2>
        <p className="text-inkmute leading-relaxed mb-6">
          When a funder asks for an update, you shouldn't have to open five spreadsheets and start rebuilding the
          story. Nomad Compass gives you a structured foundation for producing funder-facing reports from the data
          already inside your organization.
        </p>
        <p className="font-display text-xl text-teal font-semibold leading-relaxed">
          Less hunting. Less copying. Less rebuilding.
          <br />
          More confidence.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-hairline/40 bg-abyss/40">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <Eyebrow>Pricing</Eyebrow>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl p-7 border ${
                  plan.popular
                    ? 'bg-surface border-brass/50 ring-1 ring-brass/30 shadow-2xl shadow-brass/10 lg:-translate-y-2'
                    : 'bg-surface border-hairline'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-b from-brassbright to-brass text-[#26200e] text-[10px] font-black uppercase tracking-widest rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold text-ivory mb-1">{plan.name}</h3>
                <p className="text-3xl font-black text-ivory mb-1">
                  {plan.price}
                  <span className="text-sm font-medium text-inkmute">/month</span>
                </p>
                <p className="text-sm font-bold text-brassbright mb-3">{plan.tagline}</p>
                <p className="text-xs text-inkmute leading-relaxed mb-5">{plan.audience}</p>

                <div className="flex-1 space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-parchment font-semibold">
                    <Check size={15} className="text-teal shrink-0" /> {plan.members}
                  </div>
                  {plan.everythingIn && (
                    <p className="text-[10px] font-mono2 uppercase tracking-widest text-inkfaint pt-1 pb-0.5">
                      Everything in {plan.everythingIn}, plus:
                    </p>
                  )}
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-inkmute">
                      <Check size={15} className="text-teal shrink-0" /> {f}
                    </div>
                  ))}
                </div>

                <a
                  href="/free-trial"
                  className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    plan.popular
                      ? 'bg-gradient-to-b from-brassbright to-brass text-[#26200e] hover:brightness-105'
                      : 'bg-abyss text-ivory border border-hairline hover:bg-surface2'
                  }`}
                >
                  Start Your Trial
                </a>
              </div>
            ))}
          </div>
          <p className="text-xs text-inkfaint text-center mt-4">*Reasonable-use limits apply.</p>

          {/* All plans include */}
          <div className="mt-14 text-center">
            <p className="font-mono2 text-[0.6rem] tracking-[0.24em] uppercase text-inkfaint mb-4">All Plans Include</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              {INCLUDED.map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-parchment font-medium">
                  <Check size={14} className="text-teal shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Start with 30 days free */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center border-t border-hairline/40">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory mb-4">
          Start with 30 days free
        </h2>
        <p className="text-inkmute leading-relaxed mb-2">
          We're inviting the first 10 nonprofits to use Nomad Compass free for 30 days.
        </p>
        <p className="text-inkmute leading-relaxed mb-8">
          No credit card. No obligation. Just bring your real nonprofit challenges and see what happens when your
          grant and impact data finally work together.
        </p>
        <PrimaryCta>Request My Free Trial</PrimaryCta>
        <p className="font-mono2 text-[0.6rem] tracking-[0.14em] uppercase text-inkfaint mt-4">
          30 days free · No credit card required · First 10 nonprofits
        </p>
      </section>

      {/* North star closing CTA */}
      <section className="border-t border-hairline/40 bg-abyss/60">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <Compass size={32} className="text-brass mx-auto mb-5" />
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory mb-4">
            Your mission is the north star.
          </h2>
          <p className="text-inkmute leading-relaxed mb-8">
            Your data shouldn't be another administrative burden. It should help you understand where you've been,
            where you are, and where you're going. Nomad Compass gives your nonprofit a clearer bearing.
          </p>
          <PrimaryCta>Request My Free Trial</PrimaryCta>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-hairline/40">
        <Eyebrow>FAQ</Eyebrow>
        <div className="mt-6">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline/40">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <BrandLogo size={30} variant="light" textPosition="bottom" className="mx-auto mb-5" />
          <p className="text-sm text-inkmute max-w-xl mx-auto leading-relaxed mb-2">
            Nomad Compass is the nonprofit intelligence workspace that connects grant management, impact
            measurement, and funder-ready reporting in one place.
          </p>
          <p className="font-mono2 text-[0.62rem] tracking-[0.2em] uppercase text-brass mb-6">
            Track the work. Measure the impact. Know your direction.
          </p>
          <a href="/" className="text-inkfaint hover:text-brass text-xs font-bold uppercase tracking-widest transition-colors">
            ← Back to sign in
          </a>
        </div>
      </footer>
    </div>
  );
};
