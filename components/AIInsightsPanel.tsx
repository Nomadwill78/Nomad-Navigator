import React from 'react';
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle2, BrainCircuit, Check, ArrowRight } from 'lucide-react';
import { AIAnalysisData } from '../types';

interface AIInsightsPanelProps {
  data: AIAnalysisData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ data, isLoading, onRefresh }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-surface2/60 border border-hairline rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-ivory flex items-center gap-2">
          <BrainCircuit className="text-teal" size={20} />
          AI Strategic Analysis
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono2 uppercase tracking-wider text-inkmute">Grant readiness</span>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-b from-brassbright to-brass text-[#26200e] font-bold text-sm">
            {data.readinessScore}/100
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Key Findings */}
        <div className="bg-surface rounded-xl p-5 border border-hairline relative overflow-hidden hover:border-brass/30 transition-all">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-teal"></div>
          <div className="flex items-center gap-2 mb-3 text-teal font-mono2 text-xs uppercase tracking-[0.14em]">
            <CheckCircle2 size={16} /> Key Findings
          </div>
          <ul className="space-y-3">
            {data.keyFindings.map((finding, idx) => (
              <li key={idx} className="text-sm text-inkmute leading-snug flex gap-2.5 items-start">
                <Check size={14} className="text-teal mt-1 shrink-0" />
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="bg-surface rounded-xl p-5 border border-hairline relative overflow-hidden hover:border-brass/30 transition-all">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-brass"></div>
          <div className="flex items-center gap-2 mb-3 text-brass font-mono2 text-xs uppercase tracking-[0.14em]">
            <Sparkles size={16} /> Strategic Steps
          </div>
          <ul className="space-y-4">
            {data.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-inkmute leading-snug flex gap-2.5 items-start">
                <ArrowRight size={14} className="text-brass mt-1 shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="bg-surface rounded-xl p-5 border border-hairline relative overflow-hidden hover:border-brass/30 transition-all">
          <div className="absolute top-0 left-0 w-0.5 h-full bg-[#d2896f]"></div>
          <div className="flex items-center gap-2 mb-3 text-[#e0a487] font-mono2 text-xs uppercase tracking-[0.14em]">
            <AlertTriangle size={16} /> Risk Alerts
          </div>
          <ul className="space-y-3">
            {data.risks.map((risk, idx) => (
              <li key={idx} className="text-sm text-inkmute leading-snug flex gap-2">
                <span className="text-[#e0a487] mt-0.5">⚠</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>

        {/* Trend Analysis */}
        <div className="bg-abyss text-parchment rounded-xl p-5 border border-brass/25 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-teal opacity-5 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2 mb-3 font-mono2 text-xs uppercase tracking-[0.14em] text-brass">
            <TrendingUp size={16} /> Trend Analysis
          </div>
          <div className="bg-white/5 border-l-2 border-teal/50 p-4 rounded-r-lg">
            <p className="font-display text-sm text-parchment/90 leading-relaxed italic">
              “{data.trendAnalysis}”
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-hairline/50 flex justify-between items-center text-xs text-inkmute">
            <span className="font-mono2">Q1–Q2 data</span>
            <button onClick={onRefresh} className="hover:text-teal transition-colors flex items-center gap-1 font-medium">
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
