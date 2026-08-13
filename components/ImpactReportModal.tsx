import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, ChevronRight, Calendar } from 'lucide-react';
import { ReportFrequency } from '../types';
import { jsPDF } from 'jspdf';

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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleExportPDF = () => {
    if (!reportContent) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    let y = 30;

    const ensureSpace = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight - margin) {
        doc.addPage();
        y = margin + 10;
      }
    };

    const lines = reportContent.split('\n');

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 4;
        return;
      }

      if (trimmed.startsWith('# ')) {
        const text = trimmed.replace('# ', '');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);

        const wrapped = doc.splitTextToSize(text, maxLineWidth);
        const needed = wrapped.length * 8 + 6;
        ensureSpace(needed);

        doc.setDrawColor(14, 165, 233);
        doc.setLineWidth(1.5);
        doc.line(margin - 4, y - 5, margin - 4, y + (wrapped.length * 8) - 4);

        wrapped.forEach((wLine: string) => {
          doc.text(wLine, margin, y);
          y += 8;
        });
        y += 4;
      } else if (trimmed.startsWith('## ')) {
        const text = trimmed.replace('## ', '');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);

        const wrapped = doc.splitTextToSize(text, maxLineWidth);
        const needed = wrapped.length * 6 + 4;
        ensureSpace(needed + 5);

        y += 4;
        wrapped.forEach((wLine: string) => {
          doc.text(wLine, margin, y);
          y += 6;
        });
        y += 3;
      } else if (trimmed.startsWith('### ')) {
        const text = trimmed.replace('### ', '');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);

        const wrapped = doc.splitTextToSize(text, maxLineWidth);
        const needed = wrapped.length * 5 + 3;
        ensureSpace(needed + 3);

        y += 3;
        wrapped.forEach((wLine: string) => {
          doc.text(wLine, margin, y);
          y += 5;
        });
        y += 2;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-*]\s+/, '');
        const cleanedText = text.replace(/\*\*/g, '');

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        const listTextWidth = maxLineWidth - 6;
        const wrapped = doc.splitTextToSize(cleanedText, listTextWidth);
        const needed = wrapped.length * 5;
        ensureSpace(needed);

        doc.setFillColor(14, 165, 233);
        doc.circle(margin + 2, y - 1.2, 0.8, 'F');

        wrapped.forEach((wLine: string) => {
          doc.text(wLine, margin + 6, y);
          y += 5;
        });
        y += 1;
      } else if (/^\d+\./.test(trimmed)) {
        const numMatch = trimmed.match(/^(\d+\.)\s+(.*)/);
        const indexStr = numMatch ? numMatch[1] : '1.';
        const restText = numMatch ? numMatch[2] : trimmed;
        const cleanedText = restText.replace(/\*\*/g, '');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(14, 165, 233);

        ensureSpace(5);
        doc.text(indexStr, margin, y);

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(51, 65, 85);

        const listTextWidth = maxLineWidth - 8;
        const wrapped = doc.splitTextToSize(cleanedText, listTextWidth);
        wrapped.forEach((wLine: string, idx: number) => {
          if (idx > 0) {
            ensureSpace(5);
          }
          doc.text(wLine, margin + 8, y);
          y += 5;
        });
        y += 1;
      } else {
        const cleanedText = trimmed.replace(/\*\*/g, '');
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        const wrapped = doc.splitTextToSize(cleanedText, maxLineWidth);
        const needed = wrapped.length * 5;
        ensureSpace(needed);

        wrapped.forEach((wLine: string) => {
          doc.text(wLine, margin, y);
          y += 5;
        });
        y += 2.5;
      }
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin, 15, pageWidth - margin, 15);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Nomad Compass AI Impact Report', margin, 12);

      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.text('Generated via Nomad Compass Dashboard', margin, pageHeight - 10);
      
      const pageStr = `Page ${i} of ${totalPages}`;
      const pageStrWidth = doc.getTextWidth(pageStr);
      doc.text(pageStr, pageWidth - margin - pageStrWidth, pageHeight - 10);
    }

    doc.save(`nomad-compass-impact-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!isOpen) return null;

  const frequencies: { id: ReportFrequency; label: string; desc: string }[] = [
    { id: 'weekly', label: 'Weekly Impact', desc: 'Fast-paced operational highlights and immediate reach numbers.' },
    { id: 'monthly', label: 'Monthly Summary', desc: 'Detailed program analysis and budget efficiency tracking.' },
    { id: 'quarterly', label: 'Quarterly Audit', desc: 'Grant-ready comprehensive analysis for major stakeholders.' },
    { id: 'annual', label: 'Annual Review', desc: 'Generational impact study and long-term strategic evaluation.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-abyss/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-hairline/60 flex justify-between items-center bg-ink/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal/15 rounded-lg text-teal">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ivory">Nomad AI Impact Reporting</h2>
              <p className="text-xs text-inkmute">Automated Grant-Ready Insights</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface/5 rounded-full text-inkmute transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 prose-content">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-80 space-y-4">
              <div className="w-12 h-12 border-4 border-teal/30 border-t-teal rounded-full animate-spin"></div>
              <p className="text-inkmute font-medium animate-pulse text-center">
                Nomad AI is analyzing metrics...<br/>
                <span className="text-xs font-normal text-inkfaint font-mono mt-2 block tracking-tight">Processing {selectedFreq} data points</span>
              </p>
            </div>
          ) : reportContent ? (
            <div className="prose prose-slate prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-parchment leading-relaxed font-normal">
                {reportContent.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="font-display text-3xl font-semibold mb-6 text-ivory border-b border-hairline pb-2 tracking-tight">{line.replace('# ', '')}</h1>
                  if (line.startsWith('## ')) {
                    const title = line.replace('## ', '');
                    const isScore = title.toLowerCase().includes('readiness');
                    return (
                      <h2 key={i} className={`text-xl font-bold mt-10 mb-4 flex items-center gap-2 ${isScore ? 'text-teal bg-teal/10 inline-flex px-4 py-1.5 rounded-full border border-teal/25' : 'text-ivory border-l-4 border-hairline pl-4'}`}>
                        {title}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-6 mb-3 text-parchment tracking-wide uppercase">{line.replace('### ', '')}</h3>
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                      const content = line.replace(/[-*] /, '');
                      const isSWOT = content.toLowerCase().includes('strength') || content.toLowerCase().includes('weakness') || content.toLowerCase().includes('opportunity') || content.toLowerCase().includes('threat');
                      return <li key={i} className={`ml-4 list-disc marker:text-teal mb-1.5 ${isSWOT ? 'font-medium text-parchment' : ''}`}>{content}</li>
                  }
                  if (line.match(/^\d\./)) return <li key={i} className="ml-4 list-decimal marker:text-inkfaint mb-2 font-medium">{line.substring(line.indexOf(' ') + 1)}</li>
                  if (line.trim() === '') return <div key={i} className="h-4" />
                  
                  const parts = line.split('**');
                  if(parts.length > 1) {
                      return <p key={i} className="mb-4">
                          {parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="text-ivory font-bold">{part}</strong> : part)}
                      </p>
                  }
                  return <p key={i} className="mb-4">{line}</p>
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-8">
                 <h3 className="font-bold text-ivory text-xl mb-2">Select Report Frequency</h3>
                 <p className="text-inkmute text-sm">Choose the reporting period for AI synthesis.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {frequencies.map((freq) => (
                  <button
                    key={freq.id}
                    onClick={() => setSelectedFreq(freq.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                      selectedFreq === freq.id 
                        ? 'bg-teal/10 border-teal/60 ring-1 ring-teal/25' 
                        : 'bg-surface border-hairline hover:border-hairline'
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${selectedFreq === freq.id ? 'bg-teal/15 text-teal' : 'bg-ink/50 text-inkfaint'}`}>
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-sm ${selectedFreq === freq.id ? 'text-teal' : 'text-parchment'}`}>{freq.label}</h4>
                      <p className="text-xs text-inkmute line-clamp-1">{freq.desc}</p>
                    </div>
                    <ChevronRight size={16} className={selectedFreq === freq.id ? 'text-teal' : 'text-inkfaint'} />
                  </button>
                ))}
              </div>

              <div className="pt-6">
                <button
                  onClick={() => onGenerate(selectedFreq)}
                  className="w-full bg-gradient-to-b from-brassbright to-brass text-[#26200e] rounded-xl py-4 font-bold shadow-lg shadow-brass/25 hover:brightness-105 transition-all active:scale-[0.98]"
                >
                  Confirm & Generate {selectedFreq.charAt(0).toUpperCase() + selectedFreq.slice(1)} Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {reportContent && !isLoading && (
          <div className="p-4 border-t border-hairline/60 flex justify-end gap-3 bg-ink/50">
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                copied ? 'text-teal font-bold' : 'text-inkmute hover:text-ivory'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-brassbright to-brass text-[#26200e] rounded-lg hover:brightness-105 transition-colors shadow-sm text-sm font-medium animate-pulse hover:animate-none"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
