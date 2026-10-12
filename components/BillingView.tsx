import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle, ExternalLink, Activity, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { PlanId, PLAN_LABELS } from '../types';
import { checkPlanChange, describeSeatLimit, describeTeamSize, isDowngrade, policyFor, STATUS_POLICY } from '../src/lib/plans';

interface PaidPlan {
  id: PlanId;
  price: string;
  features: string[];
}

// Team sizes are NOT listed here: they come from the one plan table (types.ts) so they can never disagree with what is enforced.
const PAID_PLANS: PaidPlan[] = [
  { id: 'starter', price: '$49/mo', features: ['Grant tracking', 'KPI & impact tracking', '2 AI Impact Reports/month'] },
  { id: 'growth', price: '$99/mo', features: ['Everything in Starter', 'Subgrantee tracking', '10 AI Impact Reports/month', 'Priority support'] },
  { id: 'pro', price: '$199/mo', features: ['Everything in Growth', 'Unlimited AI Impact Reports*', 'Custom onboarding'] },
];

const STATUS_STYLE: Record<string, string> = {
  trialing: 'bg-brass/10 text-brassbright border-brass/25',
  active: 'bg-teal/10 text-teal border-teal/25',
  past_due: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  canceled: 'bg-white/5 text-inkfaint border-hairline',
};

export const BillingView: React.FC = () => {
  const { user, organization, billing, role } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentPlan: PlanId = billing?.plan ?? 'trial';
  const statusKey = billing?.status ?? 'trialing';
  const policy = policyFor(statusKey);
  const statusClass = STATUS_STYLE[statusKey] ?? STATUS_STYLE.trialing;
  const isAdmin = role === 'admin';
  const canManagePortal = Boolean(billing?.stripeCustomerId);
  // An organization with a live subscription changes plan on THAT subscription; it never starts a second one.
  const hasSubscription = Boolean(billing?.stripeSubscriptionId) && statusKey !== 'canceled';
  const paymentProblem = statusKey === 'past_due';
  const endsOn = billing?.cancelAtPeriodEnd && billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString() : null;

  const authedPost = async (path: string, body: object) => {
    const idToken = await user!.getIdToken();
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  };

  const choosePlan = async (plan: PlanId) => {
    if (!user || !organization) return;
    setError(null);
    setNotice(null);

    if (hasSubscription) {
      // Check the team fits BEFORE asking Stripe (the server checks again with the true member count).
      const fit = checkPlanChange(plan, organization.memberCount ?? 0);
      if ('reason' in fit) { setError(fit.reason); return; }
      const down = isDowngrade(currentPlan, plan);
      const ok = confirm(
        down
          ? `Switch to ${PLAN_LABELS[plan]}? The unused part of this period is credited to your next invoice.`
          : `Switch to ${PLAN_LABELS[plan]}? You are charged the prorated difference for the rest of this period.`
      );
      if (!ok) return;
      setLoadingPlan(plan);
      try {
        await authedPost('/api/change-plan', { orgId: organization.id, plan });
        setNotice(`Your plan is now ${PLAN_LABELS[plan]}.`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    setLoadingPlan(plan);
    try {
      const data = await authedPost('/api/create-subscription-checkout', { orgId: organization.id, plan });
      if (!data.url) throw new Error('Could not start checkout.');
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
      const data = await authedPost('/api/create-portal-session', { orgId: organization.id });
      if (!data.url) throw new Error('Could not open the billing portal.');
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
          <div className="flex items-center gap-3"><p className="text-2xl font-black text-ivory">{PLAN_LABELS[currentPlan]}</p><span className={`px-2 py-0.5 rounded-full text-[10px] font-mono2 font-bold uppercase tracking-wider border ${statusClass}`}>{policy.label}</span></div>
          <p className="text-xs text-inkmute mt-1">
            {describeSeatLimit(currentPlan)}
            {billing?.currentPeriodEnd && statusKey === 'active' && !endsOn ? ` · renews ${new Date(billing.currentPeriodEnd).toLocaleDateString()}` : ''}
          </p>
        </div>
        {canManagePortal && isAdmin && <button onClick={openPortal} disabled={loadingPortal} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-parchment border border-hairline hover:bg-white/5 transition-all disabled:opacity-60 shrink-0">{loadingPortal ? <Activity className="animate-spin" size={16} /> : <ExternalLink size={16} />} Manage Billing</button>}
      </div>

      {(paymentProblem || statusKey === 'canceled') && (
        <div role="status" className="flex items-start gap-2 bg-brass/10 border border-brass/30 rounded-xl p-4"><Info size={16} className="text-brassbright shrink-0 mt-0.5" /><p className="text-sm text-parchment leading-relaxed">{STATUS_POLICY[statusKey].message}</p></div>
      )}
      {endsOn && statusKey === 'active' && (
        <div role="status" className="flex items-start gap-2 bg-brass/10 border border-brass/30 rounded-xl p-4"><Info size={16} className="text-brassbright shrink-0 mt-0.5" /><p className="text-sm text-parchment leading-relaxed">Your subscription is set to end on {endsOn}. Everyone keeps full access until then. To keep your plan, use Manage Billing to resume it.</p></div>
      )}
      {notice && <div role="status" className="flex items-start gap-2 bg-teal/10 border border-teal/30 rounded-xl p-4"><Check size={16} className="text-teal shrink-0 mt-0.5" /><p className="text-sm text-parchment">{notice}</p></div>}
      {error && <div role="alert" className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4"><AlertCircle size={16} className="text-rose-300 shrink-0 mt-0.5" /><p className="text-sm text-rose-200 leading-relaxed">{error}</p></div>}
      {!isAdmin && <p className="text-xs text-inkfaint">Only an administrator can change the plan.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PAID_PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id && statusKey !== 'canceled';
          const label = isCurrent ? null : hasSubscription ? (isDowngrade(currentPlan, plan.id) ? `Downgrade to ${PLAN_LABELS[plan.id].replace('Compass ', '')}` : `Upgrade to ${PLAN_LABELS[plan.id].replace('Compass ', '')}`) : 'Choose this plan';
          const blocked = !isAdmin || paymentProblem;
          return <div key={plan.id} className={`flex flex-col rounded-3xl p-6 border ${isCurrent ? 'bg-teal/5 border-teal/40 ring-1 ring-teal/25' : 'bg-surface border-hairline'}`}>
            <h3 className="font-display text-lg font-semibold text-ivory mb-1">{PLAN_LABELS[plan.id]}</h3>
            <p className="text-2xl font-black text-ivory mb-1">{plan.price}</p>
            <p className="text-xs text-inkmute mb-4">{describeTeamSize(plan.id)}</p>
            <div className="flex-1 space-y-1.5 mb-5">{plan.features.map(f => <div key={f} className="flex items-center gap-2 text-xs text-inkmute"><Check size={13} className="text-teal shrink-0" /> {f}</div>)}</div>
            <button onClick={() => choosePlan(plan.id)} disabled={isCurrent || loadingPlan !== null || blocked} title={paymentProblem ? 'Fix the payment method first' : undefined} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isCurrent ? 'bg-teal/10 text-teal border border-teal/30 opacity-80' : 'bg-gradient-to-b from-brassbright to-brass text-[#26200e] hover:brightness-105 disabled:opacity-60'}`}>
              {isCurrent ? <><ShieldCheck size={15} /> Current Plan</> : loadingPlan === plan.id ? <><Activity className="animate-spin" size={15} /> {hasSubscription ? 'Updating…' : 'Redirecting…'}</> : label}
            </button>
          </div>;
        })}
      </div>
      <p className="text-xs text-inkfaint">*Reasonable-use limits apply.</p>
    </div>
  );
};
