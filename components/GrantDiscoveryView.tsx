import React from 'react';
import { 
  Sparkles, 
  Target, 
  Calendar, 
  DollarSign, 
  ChevronRight, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search
} from 'lucide-react';
import { Opportunity } from '../types';

interface GrantDiscoveryViewProps {
  opportunities: Opportunity[];
}

export const GrantDiscoveryView: React.FC<GrantDiscoveryViewProps> = ({ opportunities }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ivory flex items-center gap-2">
            <Sparkles className="text-teal" /> AI Grant Discovery Radar
          </h2>
          <p className="text-inkmute">Nomad AI found these opportunities that match your mission profile and current KPI performance.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-inkfaint group-focus-within:text-teal transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search databases..."
              className="pl-10 pr-4 py-2 bg-surface border border-hairline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/25 transition-all w-64"
            />
          </div>
          <button className="bg-abyss text-ivory px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-surface2 transition-all">
            Refresh Scan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-surface border border-hairline rounded-3xl p-6 hover:shadow-xl hover:border-teal/25 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-ink/50 rounded-2xl flex items-center justify-center text-inkfaint group-hover:bg-teal/10 group-hover:text-teal transition-all">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ivory text-lg group-hover:text-teal transition-colors">{opp.name}</h3>
                    <p className="text-sm font-medium text-inkmute flex items-center gap-1.5 uppercase tracking-wider">
                      <DollarSign size={14} className="text-inkfaint" /> {opp.funder}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <span className="text-xs font-bold text-inkfaint uppercase tracking-widest">Match Score</span>
                    <span className="px-2 py-0.5 bg-teal/10 text-teal rounded-full text-[10px] font-black">{opp.matchScore}%</span>
                  </div>
                  <div className="h-1.5 w-24 bg-abyss border border-hairline/50 rounded-full overflow-hidden ml-auto">
                    <div 
                      className="h-full bg-teal rounded-full"
                      style={{ width: `${opp.matchScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <p className="text-inkmute text-sm leading-relaxed mb-6 line-clamp-2">
                {opp.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-ink/50 rounded-2xl p-4 border border-hairline/60">
                   <p className="text-[10px] font-bold text-inkfaint uppercase tracking-widest mb-1.5">Nomad AI Rationale</p>
                   <p className="text-xs text-parchment font-medium leading-relaxed italic">
                     "{opp.whyMatch}"
                   </p>
                </div>
                <div className="flex flex-col justify-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-inkmute font-medium">
                    <DollarSign size={16} className="text-teal" />
                    <span>Potential: <span className="text-ivory font-bold">${opp.amount.toLocaleString()}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-inkmute font-medium">
                    <Calendar size={16} className="text-teal" />
                    <span>Deadline: <span className="text-ivory font-bold">{new Date(opp.deadline).toLocaleDateString()}</span></span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-hairline/60 flex justify-between items-center">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/5 text-inkmute border border-hairline rounded-lg text-[10px] font-mono2 font-bold uppercase tracking-wider">Water &amp; Sanitation</span>
                  <span className="px-3 py-1 bg-white/5 text-inkmute border border-hairline rounded-lg text-[10px] font-mono2 font-bold uppercase tracking-wider">Infrastructure</span>
                </div>
                <button className="flex items-center gap-1.5 text-teal font-bold text-xs hover:gap-2 transition-all">
                  Start AI Draft <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-abyss rounded-3xl p-6 text-ivory overflow-hidden relative shadow-2xl">
            <div className="relative z-10">
              <div className="bg-white/10 w-fit p-3 rounded-2xl mb-4 backdrop-blur-sm">
                <TrendingUp size={24} className="text-teal" />
              </div>
              <h4 className="text-xl font-bold mb-2 tracking-tight">Strategy Intelligence</h4>
              <p className="text-inkfaint text-sm leading-relaxed mb-6">
                Based on your **92% success rate** in WASH projects, Nomad AI predicts a high likelihood of approval for community-led infrastructure grants this quarter.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="w-1.5 h-1.5 bg-teal rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-parchment">Top Funder: Bill & Melinda Gates</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                   <div className="w-1.5 h-1.5 bg-teal rounded-full animate-pulse" />
                   <span className="text-xs font-medium text-parchment">Market Trend: Up 14%</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-brass/15 rounded-full blur-[100px]" />
          </div>

          <div className="bg-surface border border-hairline rounded-3xl p-6">
            <h4 className="font-bold text-ivory mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-teal" /> Submission Readiness
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><CheckCircle2 size={14} className="text-teal" /></div>
                <p className="text-xs text-inkmute leading-relaxed font-medium">Financial audit documents are up to date (Validated 2h ago).</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><CheckCircle2 size={14} className="text-teal" /></div>
                <p className="text-xs text-inkmute leading-relaxed font-medium">KPI data verification exceeds 85% requirement.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><AlertCircle size={14} className="text-brass" /></div>
                <p className="text-xs text-inkmute leading-relaxed font-medium">Theory of Change document needs updating for 2024 standards.</p>
              </div>
            </div>
            <button className="w-full mt-6 py-2.5 bg-ink/50 text-ivory rounded-xl text-xs font-bold border border-hairline hover:bg-white/5 transition-colors">
              Manage Compliance Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
