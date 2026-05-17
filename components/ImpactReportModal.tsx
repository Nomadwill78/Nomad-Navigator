import React, { useState } from 'react';
import { X, Download, Copy, FileText, ChevronRight, Calendar } from 'lucide-react';
import { ReportFrequency } from '../types';

interface ImpactReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (frequency: ReportFrequency) => void;
  reportContent: string;
  isLoading: boolean;
}

export const ImpactReportModal: React.FC<ImpactReportModalProps> = ({ 
  isOpen, 
  onClose, 
  onGenerate,
  reportContent, 
  isLoading 
}) => {
  const [selectedFreq, setSelectedFreq] = useState<ReportFrequency>('quarterly');

  if (!isOpen) return null;

  const frequencies: { id: ReportFrequency; label: string; desc: string }[] = [
    { id: 'weekly', label: 'Weekly Impact', desc: 'Fast-paced operational highlights and immediate reach numbers.' },
    { id: 'monthly', label: 'Monthly Summary', desc: 'Detailed program analysis and budget efficiency tracking.' },
    { id: 'quarterly', label: 'Quarterly Audit', desc: 'Grant-ready comprehensive analysis for major stakeholders.' },
    { id: 'annual', label: 'Annual Review', desc: 'Generational impact study and long-term strategic evaluation.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg text-brand-700">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Nomad AI Impact Reporting</h2>
              <p className="text-xs text-slate-500">Automated Grant-Ready Insights</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 prose-content">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-80 space-y-4">
              <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse text-center">
                Nomad AI is analyzing metrics...<br/>
                <span className="text-xs font-normal text-slate-400 font-mono mt-2 block tracking-tight">Processing {selectedFreq} data points</span>
              </p>
            </div>
          ) : reportContent ? (
            <div className="prose prose-slate prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-normal">
                {reportContent.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-black mb-6 text-slate-950 border-b-2 border-slate-100 pb-2 tracking-tight">{line.replace('# ', '')}</h1>
                  if (line.startsWith('## ')) {
                    const title = line.replace('## ', '');
                    const isScore = title.toLowerCase().includes('readiness');
                    return (
                      <h2 key={i} className={`text-xl font-bold mt-10 mb-4 flex items-center gap-2 ${isScore ? 'text-brand-600 bg-brand-50 inline-flex px-4 py-1.5 rounded-full border border-brand-100' : 'text-slate-900 border-l-4 border-slate-200 pl-4'}`}>
                        {title}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-6 mb-3 text-slate-800 tracking-wide uppercase">{line.replace('### ', '')}</h3>
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                      const content = line.replace(/[-*] /, '');
                      const isSWOT = content.toLowerCase().includes('strength') || content.toLowerCase().includes('weakness') || content.toLowerCase().includes('opportunity') || content.toLowerCase().includes('threat');
                      return <li key={i} className={`ml-4 list-disc marker:text-brand-500 mb-1.5 ${isSWOT ? 'font-medium text-slate-800' : ''}`}>{content}</li>
                  }
                  if (line.match(/^\d\./)) return <li key={i} className="ml-4 list-decimal marker:text-slate-400 mb-2 font-medium">{line.substring(line.indexOf(' ') + 1)}</li>
                  if (line.trim() === '') return <div key={i} className="h-4" />
                  
                  const parts = line.split('**');
                  if(parts.length > 1) {
                      return <p key={i} className="mb-4">
                          {parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="text-slate-950 font-bold">{part}</strong> : part)}
                      </p>
                  }
                  return <p key={i} className="mb-4">{line}</p>
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-8">
                 <h3 className="font-bold text-slate-900 text-xl mb-2">Select Report Frequency</h3>
                 <p className="text-slate-500 text-sm">Choose the reporting period for AI synthesis.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {frequencies.map((freq) => (
                  <button
                    key={freq.id}
                    onClick={() => setSelectedFreq(freq.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                      selectedFreq === freq.id 
                        ? 'bg-brand-50 border-brand-500 shadow-sm ring-1 ring-brand-500/20' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${selectedFreq === freq.id ? 'bg-brand-100 text-brand-600' : 'bg-slate-50 text-slate-400'}`}>
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm ${selectedFreq === freq.id ? 'text-brand-900' : 'text-slate-800'}`}>{freq.label}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{freq.desc}</p>
                    </div>
                    <ChevronRight size={16} className={selectedFreq === freq.id ? 'text-brand-500' : 'text-slate-300'} />
                  </button>
                ))}
              </div>

              <div className="pt-6">
                <button
                  onClick={() => onGenerate(selectedFreq)}
                  className="w-full bg-brand-600 text-white rounded-xl py-4 font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-[0.98]"
                >
                  Confirm & Generate {selectedFreq.charAt(0).toUpperCase() + selectedFreq.slice(1)} Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {reportContent && !isLoading && (
          <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              <Copy size={16} />
              Copy Text
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium">
              <Download size={16} />
              Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
