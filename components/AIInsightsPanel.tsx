import React from 'react';
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle2, BrainCircuit } from 'lucide-react';
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
          <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BrainCircuit className="text-purple-600" />
          AI Strategic Analysis
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Grant Readiness Score:</span>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm shadow-lg">
            {data.readinessScore}/100
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Key Findings */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
            <CheckCircle2 size={18} /> Key Findings
          </div>
          <ul className="space-y-3">
            {data.keyFindings.map((finding, idx) => (
              <li key={idx} className="text-sm text-slate-600 leading-snug flex gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                {finding}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
          <div className="flex items-center gap-2 mb-3 text-green-700 font-semibold">
            <Sparkles size={18} /> Strategic Steps
          </div>
          <ul className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-slate-600 leading-snug flex gap-2">
                <span className="text-green-400 mt-0.5">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <div className="flex items-center gap-2 mb-3 text-orange-700 font-semibold">
            <AlertTriangle size={18} /> Risk Alerts
          </div>
          <ul className="space-y-3">
            {data.risks.map((risk, idx) => (
              <li key={idx} className="text-sm text-slate-600 leading-snug flex gap-2">
                <span className="text-orange-400 mt-0.5">⚠</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>

         {/* Trend Analysis */}
         <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2 mb-3 font-semibold text-purple-200">
            <TrendingUp size={18} /> Trend Analysis
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {data.trendAnalysis}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
            <span>Based on Q1-Q2 Data</span>
            <button onClick={onRefresh} className="hover:text-white transition-colors flex items-center gap-1">
               Refresh Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};