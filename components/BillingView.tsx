import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle, ExternalLink, Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { PlanId, PLAN_LABELS } from '../types';

interface PaidPlan {
  id: PlanId;
  price: string;
  seats: number | null;
  features: string[];
}

const PAID_PLANS: PaidPlan[] = [
  { id: 'starter', price: '$49/mo', seats: 3, features: ['Grant tracking', 'KPI & impact tracking', '2 AI Impact Reports/month'] },
  { id: 'growth', price: '$99/mo', seats: null, features: ['Everything in Starter', 'Unlimited team members', 'Subgrantee tracking', '10 AI Impact Reports/month', 'Priority support'] },
  { id: 'pro', price: '$199/mo', seats: 20, features: ['Everything in Growth', 'Unlimited AI Impact Reports*', 'Custom onboarding'] },
];

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  trialing: { label: 'Trial', className: 'bg-brass/10 text-brassbright border-brass/25' },
  active: { label: 'Active', className: 'bg-teal/10 text-teal border-teal/25' },
  past_due: { label: 'Payment needed', className: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  canceled: { label: 'Canceled', className: 'bg-white/5 text-inkfaint border-hairline' },
};

export const BillingView: React.FC = () => {
  const { user, organization, billing } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = billing?.plan ?? 'trial';
  const status = billing ? STATUS_LABEL[billing.status] ?? STATUS_LABEL.trialing : STATUS_LABEL.trialing;
  const canManagePortal = Boolean(billing?.stripeCustomerId);
  const currentSeatLabel = billing?.seatLimit === null ? 'Unlimited seats' : `Up to ${billing?.seatLimit ?? 8} seats`;

  const choosePlan = async (plan: PlanId) => {
    if (!user || !organization) return;
    setError(null);
    setLoadingPlan(plan);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orgId: organization.id, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Could not start checkout. Please try again.');
      setLoadingPlan(null);
    }
  };

  const openPortal = async () => {
    if (!user || !organization) return;
    setError(null);
    setLoadingPortal(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orgId: organization.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open the billing portal.');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Could not open the billing portal. Please try again.');
      setLoadingPortal(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-ivory flex items-center gap-2"><CreditCard className="text-teal" /> Billing</h2>
        <p className="text-inkmute">Manage your organization's plan and payment method.</p>
      </div>

      <div className="bg-surface p-6 rounded-3xl border border-hairline shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-inkfaint uppercase tracking-widest mb-1">Current Plan</p>
          <div className="flex items-center gap-3"><p className="text-2xl font-black text-ivory">{PLAN_LABELS[currentPlan]}</p><span className={`px-2 py-0.5 rounded-full text-[10px] font-mono2 font-bold uppercase tracking-wider border ${status.className}`}>{status.label}</span></div>
          <p className="text-xs text-inkmute mt-1">{currentSeatLabel}{billing?.currentPeriodEnd && billing.status === 'active' ? ` · renews ${new Date(billing.currentPeriodEnd).toLocaleDateString()}` : ''}</p>
        </div>
        {canManagePortal && <button onClick={openPortal} disabled={loadingPortal} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-parchment border border-hairline hover:bg-white/5 transition-all disabled:opacity-60 shrink-0">{loadingPortal ? <Activity className="animate-spin" size={16} /> : <ExternalLink size={16} />} Manage Billing</button>}
      </div>

      {error && <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4"><AlertCircle size={16} className="text-rose-300 shrink-0 mt-0.5" /><p className="text-sm text-rose-200 leading-relaxed">{error}</p></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PAID_PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          return <div key={plan.id} className={`flex flex-col rounded-3xl p-6 border ${isCurrent ? 'bg-teal/5 border-teal/40 ring-1 ring-teal/25' : 'bg-surface border-hairline'}`}>
            <h3 className="font-display text-lg font-semibold text-ivory mb-1">{PLAN_LABELS[plan.id]}</h3>
            <p className="text-2xl font-black text-ivory mb-1">{plan.price}</p>
            <p className="text-xs text-inkmute mb-4">{plan.seats === null ? 'Unlimited team members' : `${plan.seats} team members`}</p>
            <div className="flex-1 space-y-1.5 mb-5">{plan.features.map(f => <div key={f} className="flex items-center gap-2 text-xs text-inkmute"><Check size={13} className="text-teal shrink-0" /> {f}</div>)}</div>
            <button onClick={() => choosePlan(plan.id)} disabled={isCurrent || loadingPlan !== null} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isCurrent ? 'bg-teal/10 text-teal border border-teal/30 opacity-80' : 'bg-gradient-to-b from-brassbright to-brass text-[#26200e] hover:brightness-105 disabled:opacity-60'}`}>
              {isCurrent ? <><ShieldCheck size={15} /> Current Plan</> : loadingPlan === plan.id ? <><Activity className="animate-spin" size={15} /> Redirecting…</> : 'Choose this plan'}
            </button>
          </div>;
        })}
      </div>
      <p className="text-xs text-inkfaint">*Reasonable-use limits apply.</p>
    </div>
  );
};
