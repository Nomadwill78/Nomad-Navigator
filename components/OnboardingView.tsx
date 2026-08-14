import React, { useState } from 'react';
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Activity,
  MailCheck,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { Invitation, ROLE_DESCRIPTIONS, SEAT_LIMIT } from '../types';

interface OnboardingViewProps {
  onCreateOrg: (name: string) => void;
  userEmail: string;
  /** A pending invitation for this user, if one exists. */
  invitation?: Invitation | null;
  emailVerified?: boolean;
  onAcceptInvitation?: () => Promise<void>;
  onResendVerification?: () => Promise<void>;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onCreateOrg,
  userEmail,
  invitation,
  emailVerified = false,
  onAcceptInvitation,
  onResendVerification,
}) => {
  const [orgName, setOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async () => {
    if (!orgName.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateOrg(orgName);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!onAcceptInvitation) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      await onAcceptInvitation();
    } catch (error: any) {
      setJoinError(error?.message || 'Could not join that organization. Please try again.');
      setIsJoining(false);
    }
  };

  const handleResend = async () => {
    if (!onResendVerification) return;
    try {
      await onResendVerification();
      setVerificationSent(true);
    } catch (error: any) {
      setJoinError(error?.message || 'Could not send the verification email.');
    }
  };

  return (
    <div className="compass-canvas min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="max-w-xl w-full py-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal/10 text-teal rounded-full text-xs font-bold mb-4 border border-teal/25">
            <CheckCircle2 size={14} /> Signed in as {userEmail}
          </div>
          <h1 className="font-display text-4xl font-semibold text-ivory tracking-tight mb-2">
            {invitation ? 'You have an invitation' : 'Final Step: Setup your Organization'}
          </h1>
          <p className="text-inkmute">
            {invitation
              ? 'Join the organization that invited you, or start one of your own instead.'
              : 'Every Nomad Compass project starts with a central organization.'}
          </p>
        </div>

        {/* --- Pending invitation --- */}
        {invitation && (
          <div className="bg-surface rounded-2xl p-8 border border-teal/30 ring-1 ring-teal/15 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-teal/10 border border-teal/25 rounded-2xl text-teal shrink-0">
                <Building2 size={24} />
              </div>
              <div className="min-w-0">
                <p className="font-mono2 text-[0.58rem] tracking-[0.2em] uppercase text-brass mb-1">
                  Invitation
                </p>
                <h2 className="font-display text-2xl font-semibold text-ivory truncate">
                  {invitation.orgName}
                </h2>
                <p className="text-sm text-inkmute mt-1">
                  Invited by {invitation.invitedByEmail} as{' '}
                  <span className="text-parchment font-semibold">
                    {invitation.role.replace(/_/g, ' ')}
                  </span>
                </p>
                <p className="text-xs text-inkfaint mt-1.5">
                  {ROLE_DESCRIPTIONS[invitation.role]}
                </p>
              </div>
            </div>

            {joinError && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4">
                <AlertCircle size={16} className="text-rose-300 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-200 leading-relaxed">{joinError}</p>
              </div>
            )}

            {emailVerified ? (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full bg-gradient-to-b from-brassbright to-brass text-[#26200e] py-4 rounded-2xl font-bold text-lg hover:brightness-105 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <Activity className="animate-spin" size={20} />
                    Joining…
                  </>
                ) : (
                  <>
                    Join {invitation.orgName} <ArrowRight size={20} />
                  </>
                )}
              </button>
            ) : (
              <div className="bg-brass/10 border border-brass/25 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <MailCheck size={18} className="text-brassbright shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-parchment text-sm mb-1">
                      Verify your email to join
                    </h3>
                    <p className="text-xs text-inkmute leading-relaxed">
                      Invitations are matched by email address, so we need to confirm{' '}
                      <span className="text-parchment">{userEmail}</span> is yours. Click the link we
                      sent, then reload this page.
                    </p>
                    <button
                      onClick={handleResend}
                      disabled={verificationSent}
                      className="mt-3 text-xs font-bold text-brassbright hover:underline disabled:text-inkfaint disabled:no-underline"
                    >
                      {verificationSent ? 'Verification email sent ✓' : 'Resend verification email'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Create an organization --- */}
        <div className="bg-surface rounded-2xl p-8 border border-hairline">
          {invitation && (
            <p className="font-mono2 text-[0.58rem] tracking-[0.2em] uppercase text-inkfaint mb-5">
              Or start your own
            </p>
          )}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-parchment mb-2 uppercase tracking-wide">
                Organization Name
              </label>
              <div className="relative group">
                <Building2
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-inkfaint group-focus-within:text-teal transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., Global Health Partners"
                  className="w-full pl-12 pr-4 py-4 bg-ink/50 border border-hairline rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal/40 transition-all font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* A plan is money, so the active one reads brass; the unavailable
                  Enterprise tier beside it stays neutral. */}
              <div className="p-4 bg-brass/10 border border-brass/25 rounded-2xl">
                <p className="text-xs font-bold text-brassbright uppercase mb-1">Standard Plan</p>
                <p className="text-xl font-black text-brassbright">
                  $0<span className="text-xs font-medium text-brass">/mo</span>
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="text-[10px] text-brass flex items-center gap-2">
                    <div className="w-1 h-1 bg-brass rounded-full" /> AI Impact Reporting
                  </li>
                  <li className="text-[10px] text-brass flex items-center gap-2">
                    <div className="w-1 h-1 bg-brass rounded-full" /> Up to {SEAT_LIMIT} users
                  </li>
                </ul>
              </div>
              <div className="p-4 bg-ink/50 border border-hairline/60 rounded-2xl opacity-50 select-none">
                <p className="text-xs font-bold text-inkfaint uppercase mb-1">Enterprise</p>
                <p className="text-xl font-black text-inkfaint">Custom</p>
                <p className="text-[10px] text-inkfaint mt-4 leading-relaxed">
                  Multi-organization management and dedicated support.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!orgName.trim() || isSubmitting}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                invitation
                  ? 'bg-ink/60 text-parchment border border-hairline hover:bg-surface2'
                  : 'bg-abyss text-ivory hover:bg-surface2'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Activity className="animate-spin" size={20} />
                  Preparing Workspace...
                </>
              ) : (
                <>
                  Launch Dashboard <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-8 text-inkfaint">
          <div className="flex items-center gap-2 text-xs font-medium">
            <LayoutDashboard size={14} /> Shared Workspace
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <ShieldCheck size={14} /> Organization Vault
          </div>
        </div>
      </div>
    </div>
  );
};
