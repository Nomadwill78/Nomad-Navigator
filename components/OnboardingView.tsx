import React, { useState } from 'react';
import { Building2, ArrowRight, CheckCircle2, LayoutDashboard, Activity } from 'lucide-react';

interface OnboardingViewProps {
  onCreateOrg: (name: string) => void;
  userEmail: string;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onCreateOrg, userEmail }) => {
  const [orgName, setOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="compass-canvas min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="mb-12 text-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal/10 text-teal rounded-full text-xs font-bold mb-4 border border-teal/25">
             <CheckCircle2 size={14} /> Account Verified: {userEmail}
           </div>
           <h1 className="font-display text-4xl font-semibold text-ivory tracking-tight mb-2">Final Step: Setup your Organization</h1>
           <p className="text-inkmute">Every Nomad Compass project starts with a central organization. You can invite up to 8 team members later.</p>
        </div>

        <div className="bg-surface rounded-2xl p-8 border border-hairline">
           <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-parchment mb-2 uppercase tracking-wide">Organization Name</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-inkfaint group-focus-within:text-teal transition-colors" size={20} />
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
                    <p className="text-xl font-black text-brassbright">$0<span className="text-xs font-medium text-brass">/mo</span></p>
                    <ul className="mt-4 space-y-2">
                       <li className="text-[10px] text-brass flex items-center gap-2">
                          <div className="w-1 h-1 bg-brass rounded-full" /> AI Impact Reporting
                       </li>
                       <li className="text-[10px] text-brass flex items-center gap-2">
                          <div className="w-1 h-1 bg-brass rounded-full" /> Up to 8 users
                       </li>
                    </ul>
                 </div>
                 <div className="p-4 bg-ink/50 border border-hairline/60 rounded-2xl opacity-50 select-none">
                    <p className="text-xs font-bold text-inkfaint uppercase mb-1">Enterprise</p>
                    <p className="text-xl font-black text-inkfaint">Custom</p>
                    <p className="text-[10px] text-inkfaint mt-4 leading-relaxed">Multi-organization management and dedicated support.</p>
                 </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={!orgName.trim() || isSubmitting}
                className="w-full bg-abyss text-parchment py-4 rounded-2xl font-black text-lg hover:bg-surface2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
             <Building2 size={14} /> Organization Vault
           </div>
        </div>
      </div>
    </div>
  );
};
