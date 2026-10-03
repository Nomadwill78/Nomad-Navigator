import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Target,
  ChevronRight,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit2,
  Users,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Download
} from 'lucide-react';
import { Grant, GrantKPI, Subgrantee, SubgranteeKPI, ROLE_PERMISSIONS } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { exportGrantPortfolioPDF, exportToCSV, exportToJSON } from '../src/lib/exportUtils';
import { resolveKpiStatus, KpiStatus } from '../src/lib/kpiStatus';
import { generateId } from '../src/lib/id';
import { draftIncompleteReason } from '../src/lib/grantValidation';

interface GrantTrackingViewProps {
  grants: Grant[];
  onCreateGrant: (grant: Omit<Grant, 'id'>) => Promise<string>;
  onUpdateGrant: (grantId: string, changes: Partial<Grant>) => void;
  onDeleteGrant: (grantId: string) => void;
}

/** Icon/color per resolved KPI state — replaces the old current/target division. */
const KPI_STATUS_STYLES: Record<KpiStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  no_target: { icon: <Target size={12} />, color: 'text-inkfaint', bg: 'bg-white/5' },
  not_started: { icon: <Clock size={12} />, color: 'text-inkfaint', bg: 'bg-white/5' },
  behind: { icon: <TrendingDown size={12} />, color: 'text-brass', bg: 'bg-brass/10' },
  on_track: { icon: <ArrowRight size={12} />, color: 'text-teal', bg: 'bg-teal/10' },
  met: { icon: <TrendingUp size={12} />, color: 'text-teal', bg: 'bg-teal/10' },
  exceeded: { icon: <TrendingUp size={12} />, color: 'text-teal', bg: 'bg-teal/10' },
};

type HeaderDraft = {
  name: string; funder: string; amount: string; startDate: string; endDate: string; status: Grant['status'];
};

export const GrantTrackingView: React.FC<GrantTrackingViewProps> = ({ grants, onCreateGrant, onUpdateGrant, onDeleteGrant }) => {
  const { role } = useAuth();
  const permissions = role ? ROLE_PERMISSIONS[role] : null;

  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kpis' | 'subgrantees'>('kpis');
  // 'new' means a not-yet-persisted draft is being edited; an id means an existing grant's header is.
  const [editingHeaderId, setEditingHeaderId] = useState<string | 'new' | null>(null);
  const [headerDraft, setHeaderDraft] = useState<HeaderDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const handleAddGrant = () => {
    // Left genuinely blank rather than filled with plausible-looking numbers —
    // a new grant should look obviously unfinished, not like real data. It also
    // isn't written to Firestore yet: it's a local draft until required fields
    // are complete and the user saves it (see saveHeaderEditor).
    const today = new Date().toISOString().split('T')[0];
    setSelectedGrantId(null);
    setDraftError(null);
    setEditingHeaderId('new');
    setHeaderDraft({
      name: '',
      funder: '',
      amount: '',
      startDate: today,
      endDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
      status: 'pending',
    });
  };

  const openHeaderEditor = (grant: Grant) => {
    setDraftError(null);
    setEditingHeaderId(grant.id);
    setHeaderDraft({
      name: grant.name,
      funder: grant.funder,
      amount: String(grant.amount ?? 0),
      startDate: grant.startDate,
      endDate: grant.endDate,
      status: grant.status,
    });
  };

  const cancelHeaderEditor = () => {
    setEditingHeaderId(null);
    setHeaderDraft(null);
    setDraftError(null);
  };

  const saveHeaderEditor = async () => {
    if (!headerDraft) return;
    const name = headerDraft.name.trim();
    const funder = headerDraft.funder.trim();
    const parsedAmount = Number(headerDraft.amount);
    const amount = Number.isFinite(parsedAmount) ? Math.max(0, parsedAmount) : 0;

    const incomplete = draftIncompleteReason({ name, funder, amount });
    if (incomplete) {
      setDraftError(incomplete);
      return;
    }

    if (editingHeaderId === 'new') {
      setIsSavingDraft(true);
      setDraftError(null);
      try {
        const newId = await onCreateGrant({
          name,
          funder,
          amount,
          startDate: headerDraft.startDate,
          endDate: headerDraft.endDate,
          status: headerDraft.status,
          kpis: [],
          subgrantees: [],
          spentAmount: 0,
        });
        setEditingHeaderId(null);
        setHeaderDraft(null);
        setSelectedGrantId(newId);
      } catch (error) {
        setDraftError(error instanceof Error ? error.message : 'Could not save this grant. Please try again.');
      } finally {
        setIsSavingDraft(false);
      }
      return;
    }

    if (!editingHeaderId) return;
    onUpdateGrant(editingHeaderId, {
      name,
      funder,
      amount,
      startDate: headerDraft.startDate,
      endDate: headerDraft.endDate,
      status: headerDraft.status,
    });
    setEditingHeaderId(null);
    setHeaderDraft(null);
    setDraftError(null);
  };

  const renderHeaderForm = () => {
    if (!headerDraft) return null;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={headerDraft.name}
            onChange={(e) => setHeaderDraft({ ...headerDraft, name: e.target.value })}
            placeholder="Grant name"
            className="px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-lg font-bold text-ivory placeholder:text-inkfaint placeholder:font-normal outline-none focus:ring-2 focus:ring-teal/40"
            autoFocus
          />
          <input
            type="text"
            value={headerDraft.funder}
            onChange={(e) => setHeaderDraft({ ...headerDraft, funder: e.target.value })}
            placeholder="Funder"
            className="px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment placeholder:text-inkfaint outline-none focus:ring-2 focus:ring-teal/40"
          />
          <input
            type="number"
            min={0}
            value={headerDraft.amount}
            onChange={(e) => setHeaderDraft({ ...headerDraft, amount: e.target.value })}
            placeholder="Award amount"
            className="px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment placeholder:text-inkfaint outline-none focus:ring-2 focus:ring-teal/40"
          />
          <select
            value={headerDraft.status}
            onChange={(e) => setHeaderDraft({ ...headerDraft, status: e.target.value as Grant['status'] })}
            className="px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment outline-none focus:ring-2 focus:ring-teal/40"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <label className="flex flex-col gap-1 text-xs text-inkfaint">
            Start date
            <input
              type="date"
              value={headerDraft.startDate}
              onChange={(e) => setHeaderDraft({ ...headerDraft, startDate: e.target.value })}
              className="px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment outline-none focus:ring-2 focus:ring-teal/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-inkfaint">
            End date
            <input
              type="date"
              value={headerDraft.endDate}
              onChange={(e) => setHeaderDraft({ ...headerDraft, endDate: e.target.value })}
              className="px-3 py-2 bg-ink/70 border border-hairline rounded-lg text-sm text-parchment outline-none focus:ring-2 focus:ring-teal/40"
            />
          </label>
        </div>
        {draftError && (
          <p className="text-xs font-semibold text-alert bg-alert/10 border border-alert/25 rounded-lg px-3 py-2">{draftError}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={saveHeaderEditor}
            disabled={isSavingDraft}
            className="px-4 py-2 bg-teal text-abyss rounded-lg text-xs font-bold hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingDraft ? 'Saving…' : editingHeaderId === 'new' ? 'Save Grant' : 'Save'}
          </button>
          <button
            onClick={cancelHeaderEditor}
            className="px-4 py-2 bg-white/5 text-inkmute rounded-lg text-xs font-bold hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const handleDeleteGrant = (grant: Grant) => {
    if (!confirm(`Delete "${grant.name || 'this grant'}"? This cannot be undone.`)) return;
    if (selectedGrantId === grant.id) setSelectedGrantId(null);
    onDeleteGrant(grant.id);
  };

  const handleUpdateKPI = (grantId: string, kpiId: string, updates: Partial<GrantKPI>) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    onUpdateGrant(grantId, { kpis: grant.kpis.map(k => k.id === kpiId ? { ...k, ...updates } : k) });
  };

  const handleAddKPI = (grantId: string) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    const newKpi: GrantKPI = { id: generateId(), name: 'New Impact Metric', target: 1000, current: 0, unit: 'people' };
    onUpdateGrant(grantId, { kpis: [...grant.kpis, newKpi] });
  };

  const handleDeleteKPI = (grantId: string, kpiId: string) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    onUpdateGrant(grantId, { kpis: grant.kpis.filter(k => k.id !== kpiId) });
  };

  const handleDeleteSubgranteeKPI = (grantId: string, subgranteeId: string, kpiId: string) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    const subgrantees = (grant.subgrantees ?? []).map(sub =>
      sub.id === subgranteeId ? { ...sub, kpis: sub.kpis.filter(k => k.id !== kpiId) } : sub
    );
    onUpdateGrant(grantId, { subgrantees });
  };

  const handleAddSubgrantee = (grantId: string) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    const newSub: Subgrantee = {
      id: generateId(),
      name: "Local Partner Org",
      allocatedAmount: 10000,
      status: 'active',
      kpis: [{ id: generateId(), name: 'Reach Target', target: 500, current: 0, unit: 'people' }]
    };
    onUpdateGrant(grantId, { subgrantees: [...(grant.subgrantees || []), newSub] });
  };

  const handleUpdateSubgranteeKPI = (grantId: string, subgranteeId: string, kpiId: string, updates: Partial<SubgranteeKPI>) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    const subgrantees = (grant.subgrantees ?? []).map(sub =>
      sub.id === subgranteeId ? { ...sub, kpis: sub.kpis.map(k => k.id === kpiId ? { ...k, ...updates } : k) } : sub
    );
    onUpdateGrant(grantId, { subgrantees });
  };

  const handleAddSubgranteeKPI = (grantId: string, subgranteeId: string) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    const subgrantees = (grant.subgrantees ?? []).map(sub => {
      if (sub.id !== subgranteeId) return sub;
      const newKpi: SubgranteeKPI = { id: generateId(), name: 'New Metric', target: 100, current: 0, unit: 'units' };
      return { ...sub, kpis: [...sub.kpis, newKpi] };
    });
    onUpdateGrant(grantId, { subgrantees });
  };

  const handleUpdateSubgrantee = (grantId: string, subgranteeId: string, updates: Partial<Subgrantee>) => {
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return;
    const subgrantees = (grant.subgrantees ?? []).map(sub => sub.id === subgranteeId ? { ...sub, ...updates } : sub);
    onUpdateGrant(grantId, { subgrantees });
  };

  const selectedGrant = grants.find(g => g.id === selectedGrantId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ivory font-sans tracking-tight">Grant & KPI Tracking</h2>
          <p className="text-inkmute">Manage individual funding source requirements and subgrantee performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {permissions?.canExportData && (
            <div className="flex items-center gap-2 bg-surface border border-hairline rounded-xl p-1 shadow-sm">
              <button
                onClick={() => exportGrantPortfolioPDF(grants)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-inkmute hover:text-teal hover:bg-ink/50 rounded-lg transition-all"
                title="Export entire portfolio as PDF Report"
              >
                <Download size={14} />
                PDF
              </button>
              <button
                onClick={() => exportToCSV(grants, 'nomad-compass-grants')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-inkmute hover:text-teal hover:bg-ink/50 rounded-lg transition-all"
                title="Export entire portfolio as CSV"
              >
                <Download size={14} />
                CSV
              </button>
              <button
                onClick={() => exportToJSON(grants, 'nomad-compass-grants')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-inkmute hover:text-teal hover:bg-ink/50 rounded-lg transition-all"
                title="Export entire portfolio as JSON"
              >
                <Download size={14} />
                JSON
              </button>
            </div>
          )}
          {permissions?.canEditGrants && (
            <button
              onClick={handleAddGrant}
              className="flex items-center gap-2 bg-gradient-to-b from-brassbright to-brass text-[#26200e] px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brass/25 hover:brightness-105 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus size={18} />
              Add Grant
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Grant List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-inkfaint uppercase tracking-widest px-2">Active Portfolios</h3>
          {grants.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-2xl border border-dashed border-hairline">
               <Target className="mx-auto text-inkfaint mb-3" size={32} />
               <p className="text-inkfaint text-sm">No grants tracked yet.</p>
            </div>
          ) : (
            grants.map(grant => (
              <button
                key={grant.id}
                onClick={() => setSelectedGrantId(grant.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedGrantId === grant.id
                    ? 'bg-surface border-teal/40 shadow-md ring-1 ring-teal/25'
                    : 'bg-surface border-hairline hover:border-hairline shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    grant.status === 'active' ? 'bg-teal/15 text-teal' :
                    grant.status === 'completed' ? 'bg-teal/15 text-inkmute' :
                    'bg-abyss text-inkmute'
                  }`}>
                    {grant.status}
                  </span>
                  <p className="text-xs font-bold text-inkfaint">${(grant.amount/1000).toFixed(0)}k</p>
                </div>
                <h4 className="font-bold text-parchment line-clamp-1">{grant.name}</h4>
                <p className="text-xs text-inkmute mb-3">{grant.funder}</p>

                <div className="flex items-center gap-4 text-[10px] text-inkfaint font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(grant.endDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                     <Users size={12} />
                     {grant.subgrantees?.length || 0} Partners
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Grant Detail */}
        <div className="lg:col-span-2">
          {editingHeaderId === 'new' ? (
            <div className="bg-surface rounded-2xl border border-hairline shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 p-8">
              <h3 className="text-lg font-bold text-ivory mb-1">New Grant</h3>
              <p className="text-sm text-inkmute mb-6">
                This stays local — it won't become an official organizational record until the required fields are filled in and you save it.
              </p>
              {renderHeaderForm()}
            </div>
          ) : selectedGrant ? (
            <div className="bg-surface rounded-2xl border border-hairline shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-hairline/60 bg-ink/50">
                {editingHeaderId === selectedGrant.id && headerDraft ? (
                  <div className="mb-6">{renderHeaderForm()}</div>
                ) : (
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-ivory mb-1">{selectedGrant.name || 'Untitled Grant'}</h3>
                    <div className="flex items-center gap-4 text-sm text-inkmute">
                        <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-inkfaint" /> {selectedGrant.funder || 'No funder set'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-inkfaint"></span>
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-inkfaint" /> {selectedGrant.startDate} - {selectedGrant.endDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {permissions?.canEditGrants && (
                      <button
                        onClick={() => openHeaderEditor(selectedGrant)}
                        title="Edit grant details"
                        className="p-2 text-inkfaint hover:text-inkmute hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    {permissions?.canDeleteGrants && (
                      <button
                        onClick={() => handleDeleteGrant(selectedGrant)}
                        title="Delete grant"
                        className="p-2 text-inkfaint hover:text-alert hover:bg-alert/15 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                )}

                {/* Visual Progress Bar: Spent Funds versus Time Elapsed */}
                {(() => {
                  const totalAmount = selectedGrant.amount;
                  const spentAmount = selectedGrant.spentAmount ?? 0;
                  const fundsSpentPercent = totalAmount > 0 ? (spentAmount / totalAmount) * 100 : 0;

                  const startDate = new Date(selectedGrant.startDate).getTime();
                  const endDate = new Date(selectedGrant.endDate).getTime();
                  const today = Date.now();

                  let timeElapsedPercent = 0;
                  if (endDate > startDate) {
                    const totalDuration = endDate - startDate;
                    const elapsedDuration = today - startDate;
                    timeElapsedPercent = Math.min(Math.max((elapsedDuration / totalDuration) * 100, 0), 100);
                  }

                  // Burn rate calculation and indicator
                  const diff = fundsSpentPercent - timeElapsedPercent;
                  let burnStatus = {
                    label: "On Track",
                    color: "text-teal bg-teal/10 border-teal/25",
                    desc: "Your budget burn rate matches the timeline progress well."
                  };

                  if (diff > 12) {
                    burnStatus = {
                      label: "High Burn Rate",
                      // Overspend is money awaiting a decision, not an error, so it stays
                      // brass rather than taking the Alert red. It carries a heavier wash
                      // and border than the underspend case to rank the two.
                      color: "text-brassbright bg-brass/15 border-brass/40",
                      desc: "Warning: Funds are being spent significantly faster than time elapsed."
                    };
                  } else if (diff < -15) {
                    burnStatus = {
                      label: "Underutilization Alert",
                      color: "text-brassbright bg-brass/10 border-brass/25",
                      desc: "Alert: Funds are being spent slower than the elapsed timeline. Risk of under-spending."
                    };
                  }

                  return (
                    <div className="mb-6 p-5 bg-surface rounded-2xl border border-hairline/80 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-inkfaint flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-teal" />
                            Financial Burn vs. Timeline Progression
                          </h4>
                          <p className="text-sm font-bold text-parchment mt-0.5">Budget Depletion Comparison</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${burnStatus.color}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {burnStatus.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Funds Spent Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-inkmute flex items-center gap-1">
                              <DollarSign size={12} className="text-inkfaint" /> Funds Spent
                            </span>
                            <span className="font-bold text-parchment">
                              ${spentAmount.toLocaleString()} / ${totalAmount.toLocaleString()} ({fundsSpentPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-abyss border border-hairline/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brass rounded-full transition-all duration-500"
                              style={{ width: `${fundsSpentPercent}%` }}
                            />
                          </div>
                          {permissions?.canEditGrants && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[10px] text-inkfaint font-bold uppercase">Update Spent:</span>
                              <div className="flex items-center gap-1 bg-ink/50 border border-hairline rounded-lg px-2 py-0.5 max-w-[140px]">
                                <span className="text-xs text-inkfaint font-bold">$</span>
                                <input
                                  type="number"
                                  value={spentAmount}
                                  onChange={(e) => {
                                    const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), totalAmount);
                                    onUpdateGrant(selectedGrant.id, { spentAmount: val });
                                  }}
                                  className="bg-transparent font-semibold text-parchment text-xs outline-none w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Time Elapsed Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-inkmute flex items-center gap-1">
                              <Clock size={12} className="text-inkfaint" /> Time Elapsed
                            </span>
                            <span className="font-bold text-parchment">
                              {timeElapsedPercent.toFixed(1)}% Completed
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-abyss border border-hairline/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-inkmute rounded-full transition-all duration-500"
                              style={{ width: `${timeElapsedPercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-inkfaint font-medium pt-1">
                            <span>Start: {new Date(selectedGrant.startDate).toLocaleDateString()}</span>
                            <span>End: {new Date(selectedGrant.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-inkmute bg-ink/50 border border-hairline/60 px-3 py-2 rounded-xl">
                        <span className="font-semibold text-parchment">Analysis: </span>
                        {burnStatus.desc}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 p-1 bg-abyss border border-hairline rounded-xl w-fit">
                   <button
                     onClick={() => setActiveTab('kpis')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'kpis' ? 'bg-surface text-ivory shadow-sm' : 'text-inkmute hover:text-parchment'}`}
                   >
                     General Performance
                   </button>
                   <button
                     onClick={() => setActiveTab('subgrantees')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'subgrantees' ? 'bg-surface text-ivory shadow-sm' : 'text-inkmute hover:text-parchment'}`}
                   >
                     Subgrantee Metrics
                   </button>
                </div>
              </div>

              <div className="p-8">
                {activeTab === 'kpis' ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <h4 className="font-bold text-parchment flex items-center gap-2 text-sm uppercase tracking-wider">
                         <Target size={16} className="text-teal" /> Core KPIs
                       </h4>
                       {permissions?.canEditGrants && (
                         <button
                           onClick={() => handleAddKPI(selectedGrant.id)}
                           className="text-xs font-bold text-teal hover:text-teal flex items-center gap-1"
                         >
                           <Plus size={14} /> Add Metric
                         </button>
                       )}
                    </div>

                    <div className="space-y-6">
                      {selectedGrant.kpis.map(kpi => {
                        const kpiStatus = resolveKpiStatus(kpi.current, kpi.target);
                        const badge = KPI_STATUS_STYLES[kpiStatus.status];
                        const progress = Math.min(kpiStatus.progressPercent, 100);
                        return (
                          <div key={kpi.id} className="space-y-4 p-5 bg-ink/50 rounded-2xl border border-hairline/60 group">
                            <div className="flex justify-between items-start">
                               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="col-span-1 md:col-span-2 flex items-center gap-3">
                                   <input
                                     type="text"
                                     value={kpi.name}
                                     onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { name: e.target.value })}
                                     className="flex-1 bg-transparent font-bold text-parchment text-sm border-b border-transparent hover:border-hairline focus:border-teal/40 outline-none transition-colors"
                                   />
                                   <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${badge.bg} ${badge.color} text-[10px] font-bold uppercase tracking-wider`}>
                                     {badge.icon}
                                     <span>{kpiStatus.label}</span>
                                   </div>
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-inkfaint uppercase font-bold block mb-1">Current Progress</label>
                                   <div className="flex items-center gap-2">
                                     <input
                                       type="number"
                                       value={kpi.current}
                                       onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { current: Math.max(0, parseInt(e.target.value) || 0) })}
                                       className="w-full bg-transparent border-b border-hairline/60 hover:border-hairline focus:border-teal/40 focus:bg-surface px-2 py-1 text-sm font-bold text-parchment outline-none transition-all"
                                     />
                                   </div>
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-inkfaint uppercase font-bold block mb-1">Target & Unit</label>
                                   <div className="flex items-center gap-2">
                                     <input
                                       type="number"
                                       value={kpi.target}
                                       onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { target: Math.max(0, parseInt(e.target.value) || 0) })}
                                       className="w-24 bg-transparent border-b border-hairline/60 hover:border-hairline focus:border-teal/40 focus:bg-surface px-2 py-1 text-sm font-bold text-parchment outline-none transition-all"
                                     />
                                     <input
                                       type="text"
                                       value={kpi.unit}
                                       onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { unit: e.target.value })}
                                       className="flex-1 bg-transparent border-b border-hairline/60 hover:border-hairline focus:border-teal/40 focus:bg-surface px-2 py-1 text-sm font-bold text-parchment outline-none transition-all"
                                     />
                                   </div>
                                 </div>
                               </div>
                               <div className="flex flex-col items-end gap-3 ml-4">
                                  {permissions?.canDeleteGrants && (
                                    <button
                                      onClick={() => handleDeleteKPI(selectedGrant.id, kpi.id)}
                                      className="p-1.5 text-inkfaint hover:text-alert hover:bg-alert/15 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                  <span className="text-sm font-bold text-teal">
                                    {kpiStatus.progressPercent.toFixed(0)}%
                                  </span>
                               </div>
                            </div>
                            <div className="h-2 w-full bg-abyss border border-hairline/50 rounded-full overflow-hidden">
                               <div
                                 className="h-full rounded-full transition-all duration-500 ease-out bg-teal"
                                 style={{ width: `${progress}%` }}
                               ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="font-bold text-parchment flex items-center gap-2 text-sm uppercase tracking-wider">
                         <Users size={16} className="text-brass" /> Partner Performance
                       </h4>
                       <button
                         onClick={() => handleAddSubgrantee(selectedGrant.id)}
                         className="text-xs font-bold text-brassbright hover:text-brassbright flex items-center gap-1 border border-brass/25 px-3 py-1.5 rounded-lg bg-brass/10"
                       >
                         <Plus size={14} /> New Subgrantee
                       </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {selectedGrant.subgrantees?.length === 0 ? (
                        <div className="py-12 bg-ink/50 border border-dashed border-hairline rounded-2xl text-center">
                           <Users size={24} className="mx-auto text-inkfaint mb-2" />
                           <p className="text-sm text-inkfaint">No subgrantees registered for this portfolio.</p>
                        </div>
                      ) : (
                        selectedGrant.subgrantees?.map((sub) => (
                          <div key={sub.id} className="p-5 border border-hairline rounded-2xl bg-surface shadow-sm hover:border-hairline transition-all">
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex-1 space-y-2 mr-4">
                                 <input
                                   type="text"
                                   value={sub.name}
                                   onChange={(e) => handleUpdateSubgrantee(selectedGrant.id, sub.id, { name: e.target.value })}
                                   className="w-full bg-transparent font-bold text-ivory text-base border-b border-transparent hover:border-hairline focus:border-teal outline-none transition-colors"
                                   placeholder="Partner Name"
                                 />
                                 <div className="flex items-center gap-2">
                                   <label className="text-[10px] font-bold text-inkfaint uppercase tracking-widest">Allocation</label>
                                   <div className="flex items-center gap-1 bg-ink/50 border border-hairline/60 rounded px-2 py-0.5">
                                      <DollarSign size={10} className="text-inkfaint" />
                                      <input
                                        type="number"
                                        value={sub.allocatedAmount}
                                        onChange={(e) => handleUpdateSubgrantee(selectedGrant.id, sub.id, { allocatedAmount: Math.max(0, parseInt(e.target.value) || 0) })}
                                        className="bg-transparent font-semibold text-parchment text-xs outline-none w-24"
                                      />
                                   </div>
                                 </div>
                               </div>
                               <span className="px-2 py-0.5 bg-brass/10 text-brassbright rounded-full text-[10px] font-bold uppercase tracking-wider h-fit">
                                 {sub.status}
                               </span>
                             </div>

                             <div className="space-y-6">
                               <div className="flex items-center justify-between">
                                 <p className="text-[10px] font-bold text-inkfaint uppercase tracking-widest">Performance Metrics</p>
                                 <button
                                   onClick={() => handleAddSubgranteeKPI(selectedGrant.id, sub.id)}
                                   className="text-[10px] font-bold text-brassbright hover:text-brassbright flex items-center gap-1"
                                 >
                                   <Plus size={12} /> Add Metric
                                 </button>
                               </div>

                               {sub.kpis.map(kpi => {
                                 const kpiStatus = resolveKpiStatus(kpi.current, kpi.target);
                                 const badge = KPI_STATUS_STYLES[kpiStatus.status];
                                 const progress = Math.min(kpiStatus.progressPercent, 100);
                                 return (
                                   <div key={kpi.id} className="space-y-3 p-3 bg-ink/50 rounded-xl border border-hairline/60 group/kpi">
                                      <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div className="col-span-2 flex justify-between items-center">
                                          <div className="flex items-center gap-2 flex-1">
                                            <input
                                              type="text"
                                              value={kpi.name}
                                              onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { name: e.target.value })}
                                              className="flex-1 bg-transparent font-bold text-parchment text-xs border-b border-transparent hover:border-hairline focus:border-teal outline-none transition-colors"
                                              placeholder="KPI Name"
                                            />
                                            <div className="flex items-center gap-2">
                                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${badge.bg} ${badge.color} text-[0.6rem] font-bold uppercase`}>
                                                {badge.icon}
                                                <span className="hidden sm:inline">{kpiStatus.label}</span>
                                              </div>
                                              <span className="text-[10px] font-bold text-brassbright">
                                                {kpiStatus.progressPercent.toFixed(0)}%
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleDeleteSubgranteeKPI(selectedGrant.id, sub.id, kpi.id)}
                                            className="text-inkfaint hover:text-alert p-1 opacity-0 group-hover/kpi:opacity-100 transition-opacity"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                        <div>
                                          <label className="text-[0.6rem] text-inkfaint uppercase font-bold block mb-1">Current</label>
                                          <input
                                            type="number"
                                            value={kpi.current}
                                            onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { current: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="w-full bg-transparent border-b border-hairline/60 hover:border-hairline focus:border-teal focus:bg-surface px-2 py-1 text-xs font-semibold outline-none transition-all"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[0.6rem] text-inkfaint uppercase font-bold block mb-1">Target / Unit</label>
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              value={kpi.target}
                                              onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { target: Math.max(0, parseInt(e.target.value) || 0) })}
                                              className="w-16 bg-transparent border-b border-hairline/60 hover:border-hairline focus:border-teal focus:bg-surface px-2 py-1 text-xs font-semibold outline-none transition-all"
                                            />
                                            <input
                                              type="text"
                                              value={kpi.unit}
                                              onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { unit: e.target.value })}
                                              className="flex-1 bg-transparent border-b border-hairline/60 hover:border-hairline focus:border-teal focus:bg-surface px-2 py-1 text-xs font-semibold outline-none transition-all"
                                              placeholder="Unit"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="h-1.5 w-full bg-abyss border border-hairline/50 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all duration-500 ease-out ${progress >= 100 ? 'bg-teal' : 'bg-brass'}`}
                                          style={{ width: `${progress}%` }}
                                        ></div>
                                      </div>
                                   </div>
                                 );
                               })}
                             </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-8 p-6 bg-brass/10 rounded-2xl border border-brass/25 flex items-start gap-4">
                      <div className="p-3 bg-surface rounded-xl shadow-sm text-brassbright">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-ivory mb-1">Subgrantee Compliance</h5>
                        <p className="text-sm text-parchment/80 leading-relaxed font-medium">
                          Partner organizations are averaging <strong className="font-bold text-parchment">84% compliance</strong>. Nomad Compass recommends requesting additional validation data from {selectedGrant.subgrantees?.[0]?.name || 'partners'} before the quarterly disbursement.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-surface rounded-2xl border border-dashed border-hairline text-center opacity-60">
               <div className="w-20 h-20 bg-ink/50 rounded-full flex items-center justify-center mb-4 text-inkfaint">
                  <ExternalLink size={32} />
               </div>
               <h3 className="font-bold text-parchment text-lg">Grant & Partner Intelligence</h3>
               <p className="text-inkmute max-w-sm mt-2 text-sm leading-relaxed">
                 Select a portfolio to drill down into core metrics or manage nested subgrantee performance indicators.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
