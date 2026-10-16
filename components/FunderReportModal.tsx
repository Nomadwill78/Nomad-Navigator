import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import { Grant } from '../types';
import { exportFunderReportPDF } from '../src/lib/reportPdf';

interface Props {
  grant: Grant;
  orgName: string;
  programName?: string;
  onClose: () => void;
}

/** Asks for the narrative, then downloads the one-grant funder report as a PDF. */
export const FunderReportModal: React.FC<Props> = ({ grant, orgName, programName, onClose }) => {
  const [narrative, setNarrative] = useState('');
  const [error, setError] = useState<string | null>(null);

  const download = () => {
    setError(null);
    try {
      exportFunderReportPDF({ grant, orgName, program: programName ? { name: programName } : null, narrative });
    } catch (e) {
      console.error('Funder report failed:', e);
      setError('Could not build the PDF. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 p-4" role="dialog" aria-modal="true" aria-label="Funder report">
      <div className="bg-surface border border-hairline rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-ivory">Funder report</h3>
            <p className="text-sm text-inkmute">{grant.funder} | {grant.name}</p>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 text-inkfaint hover:text-parchment rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-xs text-inkmute leading-relaxed">
          The report is built from what you have entered on this grant: award, spending, budget lines, KPI results against targets, who was served, partners and the reporting calendar.
          Add the story behind the numbers below. It is printed in the narrative box.
        </p>
        <label className="flex flex-col gap-1 text-xs text-inkfaint">
          Narrative: progress, challenges and next steps
          <textarea
            rows={8}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="What happened this period, what got in the way, and what comes next."
            className="px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment placeholder:text-inkfaint outline-none focus:ring-2 focus:ring-teal/40"
          />
        </label>
        {error && <p role="alert" className="text-xs font-semibold text-alert bg-alert/10 border border-alert/25 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <button onClick={download} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-brassbright to-brass text-[#26200e] rounded-lg text-sm font-bold hover:brightness-105">
            <Download size={16} /> Download PDF
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-white/5 text-inkmute rounded-lg text-sm font-bold hover:bg-white/10">Close</button>
        </div>
      </div>
    </div>
  );
};
