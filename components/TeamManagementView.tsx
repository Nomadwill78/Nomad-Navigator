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
          <h2 className="text-2xl font-bold text-ivory flex items-center gap-2">
            <Users className="text-teal" /> Team Management
          </h2>
          <p className="text-inkmute">Manage your organization's users and permissions. (Limit: 8 users)</p>
        </div>
        {role === 'admin' && members.length < 8 && (
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-gradient-to-b from-brassbright to-brass text-[#26200e] px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:brightness-105 transition-all shadow-lg shadow-brass/25"
          >
            <UserPlus size={18} /> Invite Colleague
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-surface p-6 rounded-3xl border border-hairline shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Users size={64} className="text-ivory" />
            </div>
            <p className="text-xs font-bold text-inkfaint uppercase tracking-widest mb-1">Seats Used</p>
            <p className="text-3xl font-black text-ivory">{members.length} <span className="text-inkfaint text-xl">/ 8</span></p>
            <div className="mt-4 h-2 w-full bg-abyss border border-hairline/50 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-teal transition-all duration-500" 
                 style={{ width: `${(members.length / 8) * 100}%` }}
               />
            </div>
         </div>
      </div>

      <div className="bg-surface rounded-3xl border border-hairline shadow-sm overflow-hidden text-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-ink/50 border-b border-hairline">
              <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">User</th>
              <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">Role</th>
              <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">Status</th>
              <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">Joined</th>
              {role === 'admin' && <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px] text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/60">
            {members.map((member, i) => (
              <tr key={i} className="hover:bg-ink/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal/10 text-teal rounded-full flex items-center justify-center font-bold text-xs">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-ivory">{member.email}</p>
                      <p className="text-[10px] text-inkfaint font-medium">{member.userId ? 'Active' : 'Pending Invitation'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {role === 'admin' && member.userId !== organization?.creatorId ? (
                    <select 
                      value={member.role}
                      onChange={(e) => updateMemberRole((member as any).docId, e.target.value as UserRole)}
                      className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-inkmute outline-none hover:text-teal cursor-pointer"
                    >
                      {(['admin', 'grant_coordinator', 'impact_analyst', 'compliance_officer', 'data_entry', 'viewer'] as UserRole[]).map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    // Two Bearings Rule: teal for the impact role, brass for the money and
                    // governance roles, neutral for the roles that hold no authority. Admin
                    // is the lit face of brass — the only role that can manage the team and
                    // delete grants.
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono2 font-bold uppercase tracking-[0.16em] ${
                      member.role === 'admin' ? 'bg-brass/10 border-brass/25 text-brassbright' :
                      member.role === 'grant_coordinator' ? 'bg-brass/10 border-brass/25 text-brass' :
                      member.role === 'impact_analyst' ? 'bg-teal/10 border-teal/25 text-teal' :
                      member.role === 'compliance_officer' ? 'bg-brass/10 border-brass/25 text-brass' :
                      member.role === 'data_entry' ? 'bg-abyss border-hairline text-inkmute' :
                      'bg-abyss border-hairline text-inkfaint'
                    }`}>
                      {member.role.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-inkmute">
                      {member.userId ? <CheckCircle2 size={14} className="text-green-500" /> : <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
                      <span className="text-xs font-medium">{member.userId ? 'Verified' : 'Pending'}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-inkmute font-medium">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {role === 'admin' && (
                  <td className="px-6 py-4 text-right">
                    {member.userId !== user?.uid && member.userId !== organization?.creatorId && (
                      <button 
                        onClick={() => handleDeleteMember((member as any).docId)}
                        className="text-inkfaint hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
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
        <div className="fixed inset-0 bg-abyss/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-ivory mb-2">Invite Collaborator</h3>
            <p className="text-inkmute text-sm mb-8">Role-based access ensures data integrity for your donors.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-inkfaint uppercase tracking-widest block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-inkfaint" size={16} />
                  <input 
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-ink/50 border border-hairline rounded-xl text-sm focus:ring-2 focus:ring-teal/40 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-inkfaint uppercase tracking-widest block mb-1.5">Permission Role</label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {(['admin', 'grant_coordinator', 'impact_analyst', 'compliance_officer', 'data_entry', 'viewer'] as UserRole[]).map((r) => (
                    <button 
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === r 
                          ? 'border-teal/40 bg-teal/10 ring-1 ring-teal/40' 
                          : 'border-hairline hover:border-hairline'
                      }`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${inviteRole === r ? 'text-teal' : 'text-inkmute'}`}>
                        {r.replace('_', ' ')}
                      </p>
                      <p className="text-[9px] text-inkfaint leading-tight">
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
                  className="flex-1 bg-abyss text-inkmute py-3 rounded-xl font-bold hover:bg-surface2 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 bg-abyss text-white py-3 rounded-xl font-bold hover:bg-surface2 transition-all disabled:opacity-50"
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
