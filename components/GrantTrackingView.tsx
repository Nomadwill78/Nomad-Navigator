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
  ArrowRight
} from 'lucide-react';
import { Grant, GrantKPI, Subgrantee, SubgranteeKPI, ROLE_PERMISSIONS } from '../types';
import { useAuth } from '../src/contexts/AuthContext';

interface GrantTrackingViewProps {
  grants: Grant[];
  onUpdateGrants: (grants: Grant[]) => void;
}

const getTrendIndicator = (current: number, target: number) => {
  const progress = current / target;
  if (progress >= 1) return { icon: <TrendingUp size={12} />, color: 'text-green-500', bg: 'bg-green-50', label: 'Target Met' };
  if (progress >= 0.5) return { icon: <ArrowRight size={12} />, color: 'text-brand-500', bg: 'bg-brand-50', label: 'On Track' };
  return { icon: <TrendingDown size={12} />, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Below Target' };
};

export const GrantTrackingView: React.FC<GrantTrackingViewProps> = ({ grants, onUpdateGrants }) => {
  const { role } = useAuth();
  const permissions = role ? ROLE_PERMISSIONS[role] : null;

  const [isAddingGrant, setIsAddingGrant] = useState(false);
  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kpis' | 'subgrantees'>('kpis');

  const handleAddGrant = () => {
    const newGrant: Grant = {
      id: Date.now().toString(),
      name: "New Strategic Grant",
      funder: "Foundation Name",
      amount: 50000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
      status: 'pending',
      kpis: [
        { id: '1', name: 'Beneficiaries Reached', target: 1000, current: 0, unit: 'people' }
      ],
      subgrantees: []
    };
    onUpdateGrants([...grants, newGrant]);
    setIsAddingGrant(false);
    setSelectedGrantId(newGrant.id);
  };

  const handleUpdateKPI = (grantId: string, kpiId: string, updates: Partial<GrantKPI>) => {
    const updatedGrants = grants.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          kpis: g.kpis.map(k => k.id === kpiId ? { ...k, ...updates } : k)
        };
      }
      return g;
    });
    onUpdateGrants(updatedGrants);
  };

  const handleAddKPI = (grantId: string) => {
    const updatedGrants = grants.map(g => {
      if (g.id === grantId) {
        const newKpi: GrantKPI = {
          id: Date.now().toString(),
          name: 'New Impact Metric',
          target: 1000,
          current: 0,
          unit: 'people'
        };
        return { ...g, kpis: [...g.kpis, newKpi] };
      }
      return g;
    });
    onUpdateGrants(updatedGrants);
  };

  const handleDeleteKPI = (grantId: string, kpiId: string) => {
    onUpdateGrants(grants.map(g => g.id === grantId ? { ...g, kpis: g.kpis.filter(k => k.id !== kpiId) } : g));
  };

  const handleDeleteSubgranteeKPI = (grantId: string, subgranteeId: string, kpiId: string) => {
    onUpdateGrants(grants.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          subgrantees: g.subgrantees?.map(sub => {
            if (sub.id === subgranteeId) {
              return { ...sub, kpis: sub.kpis.filter(k => k.id !== kpiId) };
            }
            return sub;
          })
        };
      }
      return g;
    }));
  };

  const handleAddSubgrantee = (grantId: string) => {
    const updatedGrants = grants.map(g => {
      if (g.id === grantId) {
        const newSub: Subgrantee = {
          id: Date.now().toString(),
          name: "Local Partner Org",
          allocatedAmount: 10000,
          status: 'active',
          kpis: [{ id: '1', name: 'Reach Target', target: 500, current: 0, unit: 'people' }]
        };
        return { ...g, subgrantees: [...(g.subgrantees || []), newSub] };
      }
      return g;
    });
    onUpdateGrants(updatedGrants);
  };

  const handleUpdateSubgranteeKPI = (grantId: string, subgranteeId: string, kpiId: string, updates: Partial<SubgranteeKPI>) => {
    const updatedGrants = grants.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          subgrantees: g.subgrantees?.map(sub => {
            if (sub.id === subgranteeId) {
              return {
                ...sub,
                kpis: sub.kpis.map(k => k.id === kpiId ? { ...k, ...updates } : k)
              };
            }
            return sub;
          })
        };
      }
      return g;
    });
    onUpdateGrants(updatedGrants);
  };

  const handleAddSubgranteeKPI = (grantId: string, subgranteeId: string) => {
    const updatedGrants = grants.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          subgrantees: g.subgrantees?.map(sub => {
            if (sub.id === subgranteeId) {
              const newKpi: SubgranteeKPI = {
                id: Date.now().toString(),
                name: 'New Metric',
                target: 100,
                current: 0,
                unit: 'units'
              };
              return { ...sub, kpis: [...sub.kpis, newKpi] };
            }
            return sub;
          })
        };
      }
      return g;
    });
    onUpdateGrants(updatedGrants);
  };

  const handleUpdateSubgrantee = (grantId: string, subgranteeId: string, updates: Partial<Subgrantee>) => {
    const updatedGrants = grants.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          subgrantees: g.subgrantees?.map(sub => 
            sub.id === subgranteeId ? { ...sub, ...updates } : sub
          )
        };
      }
      return g;
    });
    onUpdateGrants(updatedGrants);
  };

  const selectedGrant = grants.find(g => g.id === selectedGrantId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">Grant & KPI Tracking</h2>
          <p className="text-slate-500">Manage individual funding source requirements and subgrantee performance.</p>
        </div>
        {permissions?.canEditGrants && (
          <button 
            onClick={handleAddGrant}
            className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus size={18} />
            New Tracking Goal
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Grant List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Active Portfolios</h3>
          {grants.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
               <Target className="mx-auto text-slate-300 mb-3" size={32} />
               <p className="text-slate-400 text-sm">No grants tracked yet.</p>
            </div>
          ) : (
            grants.map(grant => (
              <button
                key={grant.id}
                onClick={() => setSelectedGrantId(grant.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedGrantId === grant.id 
                    ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-500/20' 
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    grant.status === 'active' ? 'bg-green-100 text-green-700' :
                    grant.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {grant.status}
                  </span>
                  <p className="text-xs font-bold text-slate-400">${(grant.amount/1000).toFixed(0)}k</p>
                </div>
                <h4 className="font-bold text-slate-800 line-clamp-1">{grant.name}</h4>
                <p className="text-xs text-slate-500 mb-3">{grant.funder}</p>
                
                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
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
          {selectedGrant ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">{selectedGrant.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-slate-400" /> {selectedGrant.funder}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {selectedGrant.startDate} - {selectedGrant.endDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {permissions?.canEditGrants && (
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl w-fit">
                   <button 
                     onClick={() => setActiveTab('kpis')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'kpis' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     General Performance
                   </button>
                   <button 
                     onClick={() => setActiveTab('subgrantees')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'subgrantees' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     Subgrantee Metrics
                   </button>
                </div>
              </div>

              <div className="p-8">
                {activeTab === 'kpis' ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                         <Target size={16} className="text-brand-500" /> Core KPIs
                       </h4>
                       {permissions?.canEditGrants && (
                         <button 
                           onClick={() => handleAddKPI(selectedGrant.id)}
                           className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                         >
                           <Plus size={14} /> Add Metric
                         </button>
                       )}
                    </div>

                    <div className="space-y-6">
                      {selectedGrant.kpis.map(kpi => {
                        const progress = Math.min((kpi.current / kpi.target) * 100, 100);
                        const trend = getTrendIndicator(kpi.current, kpi.target);
                        return (
                          <div key={kpi.id} className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                            <div className="flex justify-between items-start">
                               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="col-span-1 md:col-span-2 flex items-center gap-3">
                                   <input 
                                     type="text" 
                                     value={kpi.name}
                                     onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { name: e.target.value })}
                                     className="flex-1 bg-transparent font-bold text-slate-800 text-sm border-b border-transparent hover:border-slate-200 focus:border-brand-400 outline-none transition-colors"
                                   />
                                   <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${trend.bg} ${trend.color} text-[10px] font-bold uppercase tracking-wider`}>
                                     {trend.icon}
                                     <span>{trend.label}</span>
                                   </div>
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Current Progress</label>
                                   <div className="flex items-center gap-2">
                                     <input 
                                       type="number" 
                                       value={kpi.current}
                                       onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { current: parseInt(e.target.value) || 0 })}
                                       className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-400"
                                     />
                                   </div>
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Target & Unit</label>
                                   <div className="flex items-center gap-2">
                                     <input 
                                       type="number" 
                                       value={kpi.target}
                                       onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { target: parseInt(e.target.value) || 1 })}
                                       className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-400"
                                     />
                                     <input 
                                       type="text" 
                                       value={kpi.unit}
                                       onChange={(e) => handleUpdateKPI(selectedGrant.id, kpi.id, { unit: e.target.value })}
                                       className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-400"
                                     />
                                   </div>
                                 </div>
                               </div>
                               <div className="flex flex-col items-end gap-3 ml-4">
                                  {permissions?.canDeleteGrants && (
                                    <button 
                                      onClick={() => handleDeleteKPI(selectedGrant.id, kpi.id)}
                                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                  <span className={`text-sm font-bold ${progress >= 100 ? 'text-green-600' : 'text-brand-600'}`}>
                                    {progress.toFixed(0)}%
                                  </span>
                               </div>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                               <div 
                                 className={`h-full rounded-full transition-all duration-500 ease-out ${
                                   progress >= 100 ? 'bg-green-500' : 'bg-brand-500'
                                 }`}
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
                       <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                         <Users size={16} className="text-indigo-500" /> Partner Performance
                       </h4>
                       <button 
                         onClick={() => handleAddSubgrantee(selectedGrant.id)}
                         className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 border border-indigo-100 px-3 py-1.5 rounded-lg bg-indigo-50"
                       >
                         <Plus size={14} /> New Subgrantee
                       </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {selectedGrant.subgrantees?.length === 0 ? (
                        <div className="py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                           <Users size={24} className="mx-auto text-slate-300 mb-2" />
                           <p className="text-sm text-slate-400">No subgrantees registered for this portfolio.</p>
                        </div>
                      ) : (
                        selectedGrant.subgrantees?.map((sub) => (
                          <div key={sub.id} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-slate-300 transition-all">
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex-1 space-y-2 mr-4">
                                 <input 
                                   type="text"
                                   value={sub.name}
                                   onChange={(e) => handleUpdateSubgrantee(selectedGrant.id, sub.id, { name: e.target.value })}
                                   className="w-full bg-transparent font-bold text-slate-900 text-base border-b border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none transition-colors"
                                   placeholder="Partner Name"
                                 />
                                 <div className="flex items-center gap-2">
                                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allocation</label>
                                   <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded px-2 py-0.5">
                                      <DollarSign size={10} className="text-slate-400" />
                                      <input 
                                        type="number"
                                        value={sub.allocatedAmount}
                                        onChange={(e) => handleUpdateSubgrantee(selectedGrant.id, sub.id, { allocatedAmount: parseInt(e.target.value) || 0 })}
                                        className="bg-transparent font-semibold text-slate-700 text-xs outline-none w-24"
                                      />
                                   </div>
                                 </div>
                               </div>
                               <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider h-fit">
                                 {sub.status}
                               </span>
                             </div>

                             <div className="space-y-6">
                               <div className="flex items-center justify-between">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance Metrics</p>
                                 <button 
                                   onClick={() => handleAddSubgranteeKPI(selectedGrant.id, sub.id)}
                                   className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                 >
                                   <Plus size={12} /> Add Metric
                                 </button>
                               </div>
                               
                               {sub.kpis.map(kpi => {
                                 const progress = Math.min((kpi.current / kpi.target) * 100, 100);
                                 const trend = getTrendIndicator(kpi.current, kpi.target);
                                 return (
                                   <div key={kpi.id} className="space-y-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 group/kpi">
                                      <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div className="col-span-2 flex justify-between items-center">
                                          <div className="flex items-center gap-2 flex-1">
                                            <input 
                                              type="text" 
                                              value={kpi.name}
                                              onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { name: e.target.value })}
                                              className="flex-1 bg-transparent font-bold text-slate-700 text-xs border-b border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none transition-colors"
                                              placeholder="KPI Name"
                                            />
                                            <div className="flex items-center gap-2">
                                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${trend.bg} ${trend.color} text-[8px] font-bold uppercase`}>
                                                {trend.icon}
                                                <span className="hidden sm:inline">{trend.label}</span>
                                              </div>
                                              <span className={`text-[10px] font-bold ${progress >= 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                                                {progress.toFixed(0)}%
                                              </span>
                                            </div>
                                          </div>
                                          <button 
                                            onClick={() => handleDeleteSubgranteeKPI(selectedGrant.id, sub.id, kpi.id)}
                                            className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover/kpi:opacity-100 transition-opacity"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                        <div>
                                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Current</label>
                                          <input 
                                            type="number" 
                                            value={kpi.current}
                                            onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { current: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-400"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Target / Unit</label>
                                          <div className="flex items-center gap-1">
                                            <input 
                                              type="number" 
                                              value={kpi.target}
                                              onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { target: parseInt(e.target.value) || 1 })}
                                              className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-400"
                                            />
                                            <input 
                                              type="text" 
                                              value={kpi.unit}
                                              onChange={(e) => handleUpdateSubgranteeKPI(selectedGrant.id, sub.id, kpi.id, { unit: e.target.value })}
                                              className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-400"
                                              placeholder="Unit"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-500 ease-out ${progress >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
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

                    <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-indigo-900 mb-1">Subgrantee Compliance</h5>
                        <p className="text-sm text-indigo-700/80 leading-relaxed font-medium">
                          Partner organizations are averaging **84% compliance**. Nomad Compass recommends requesting additional validation data from {selectedGrant.subgrantees?.[0]?.name || 'partners'} before the quarterly disbursement.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center opacity-60">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <ExternalLink size={32} />
               </div>
               <h3 className="font-bold text-slate-800 text-lg">Grant & Partner Intelligence</h3>
               <p className="text-slate-500 max-w-sm mt-2 text-sm leading-relaxed">
                 Select a portfolio to drill down into core metrics or manage nested subgrantee performance indicators.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
