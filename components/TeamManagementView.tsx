import React, { useState, useEffect } from 'react';
import { Users, Mail, Shield, Trash2, Plus, UserPlus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { db } from '../src/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { OrgMember, UserRole } from '../types';

export const TeamManagementView: React.FC = () => {
  const { user, organization, role } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');

  useEffect(() => {
    if (!organization) return;
    const unsub = onSnapshot(collection(db, `organizations/${organization.id}/members`), (snap) => {
      setMembers(snap.docs.map(d => ({ ...d.data(), docId: d.id } as OrgMember & { docId: string })));
    });
    return unsub;
  }, [organization]);

  const handleInvite = async () => {
    if (!organization || !inviteEmail.trim()) return;
    const memberId = inviteEmail.replace(/\./g, '_'); // More stable ID than timestamp
    await setDoc(doc(db, `organizations/${organization.id}/members`, memberId), {
      userId: '', // pending
      email: inviteEmail,
      role: inviteRole,
      joinedAt: new Date().toISOString()
    });
    
    await updateDoc(doc(db, 'organizations', organization.id), {
       memberCount: members.length + 1
    });

    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  const updateMemberRole = async (docId: string, newRole: UserRole) => {
    if (role !== 'admin' || !organization) return;
    await updateDoc(doc(db, `organizations/${organization.id}/members`, docId), {
      role: newRole
    });
  };

  const handleDeleteMember = async (docId: string) => {
    if (role !== 'admin' || !organization) return;
    if (confirm("Are you sure you want to remove this member?")) {
      await deleteDoc(doc(db, `organizations/${organization.id}/members`, docId));
      await updateDoc(doc(db, 'organizations', organization.id), {
        memberCount: Math.max(0, members.length - 1)
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-brand-500" /> Team Management
          </h2>
          <p className="text-slate-500">Manage your organization's users and permissions. (Limit: 8 users)</p>
        </div>
        {role === 'admin' && members.length < 8 && (
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
          >
            <UserPlus size={18} /> Invite Colleague
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Users size={64} className="text-slate-900" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Seats Used</p>
            <p className="text-3xl font-black text-slate-900">{members.length} <span className="text-slate-300 text-xl">/ 8</span></p>
            <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-brand-500 transition-all duration-500" 
                 style={{ width: `${(members.length / 8) * 100}%` }}
               />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">User</th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Role</th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Joined</th>
              {role === 'admin' && <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold text-xs">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{member.email}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{member.userId ? 'Active' : 'Pending Invitation'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {role === 'admin' && member.userId !== organization?.creatorId ? (
                    <select 
                      value={member.role}
                      onChange={(e) => updateMemberRole((member as any).docId, e.target.value as UserRole)}
                      className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-600 outline-none hover:text-brand-500 cursor-pointer"
                    >
                      {(['admin', 'grant_coordinator', 'impact_analyst', 'compliance_officer', 'data_entry', 'viewer'] as UserRole[]).map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      member.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                      member.role === 'grant_coordinator' ? 'bg-blue-50 text-blue-600' :
                      member.role === 'impact_analyst' ? 'bg-emerald-50 text-emerald-600' :
                      member.role === 'compliance_officer' ? 'bg-amber-50 text-amber-600' :
                      member.role === 'data_entry' ? 'bg-slate-100 text-slate-600' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {member.role.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-slate-500">
                      {member.userId ? <CheckCircle2 size={14} className="text-green-500" /> : <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
                      <span className="text-xs font-medium">{member.userId ? 'Verified' : 'Pending'}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-slate-500 font-medium">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {role === 'admin' && (
                  <td className="px-6 py-4 text-right">
                    {member.userId !== user?.uid && member.userId !== organization?.creatorId && (
                      <button 
                        onClick={() => handleDeleteMember((member as any).docId)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Invite Collaborator</h3>
            <p className="text-slate-500 text-sm mb-8">Role-based access ensures data integrity for your donors.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Permission Role</label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {(['admin', 'grant_coordinator', 'impact_analyst', 'compliance_officer', 'data_entry', 'viewer'] as UserRole[]).map((r) => (
                    <button 
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === r 
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${inviteRole === r ? 'text-brand-600' : 'text-slate-600'}`}>
                        {r.replace('_', ' ')}
                      </p>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        {r === 'admin' ? 'Full system administration' : 
                         r === 'grant_coordinator' ? 'Manage grant lifecycle' :
                         r === 'impact_analyst' ? 'Manage impact metrics' :
                         r === 'compliance_officer' ? 'Audit-only access' :
                         r === 'data_entry' ? 'Enter raw metric data' : 'Read-only dashboard'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
