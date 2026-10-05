import React, { useState, useEffect } from 'react';
import { Users, Mail, Trash2, UserPlus, CheckCircle2, Clock, X } from 'lucide-react';
import { useAuth, inviteId } from '../src/contexts/AuthContext';
import { db } from '../src/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, query, where } from 'firebase/firestore';
import { OrgMember, UserRole, Invitation, USER_ROLES, PLAN_LABELS } from '../types';

const formatJoined = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

export const TeamManagementView: React.FC = () => {
  const { user, organization, role, billing } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const isAdmin = role === 'admin';
  const seatsUsed = members.length + invitations.length;
  // null is the explicit unlimited-seat entitlement for Compass Growth.
  const seatLimit = billing?.seatLimit ?? 8;
  const hasUnlimitedSeats = seatLimit === null;
  const hasAvailableSeat = hasUnlimitedSeats || seatsUsed < seatLimit;

  useEffect(() => {
    if (!organization) return;
    const unsubMembers = onSnapshot(
      collection(db, `organizations/${organization.id}/members`),
      snap => setMembers(snap.docs.map(d => ({ ...(d.data() as OrgMember), docId: d.id }))),
      error => console.error('Member sync failed:', error)
    );
    const unsubInvites = onSnapshot(
      query(collection(db, 'invitations'), where('orgId', '==', organization.id)),
      snap => setInvitations(snap.docs.map(d => ({ ...(d.data() as Invitation), id: d.id }))),
      error => console.error('Invitation sync failed:', error)
    );
    return () => { unsubMembers(); unsubInvites(); };
  }, [organization]);

  const handleInvite = async () => {
    if (!organization || !user || !inviteEmail.trim()) return;
    const email = inviteId(inviteEmail);
    setInviteError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('That does not look like a valid email address.');
      return;
    }
    if (members.some(m => m.email?.toLowerCase() === email)) {
      setInviteError('That person is already a member of this organization.');
      return;
    }
    if (!hasAvailableSeat) {
      setInviteError(`All ${seatLimit} seats are taken. Remove a member, revoke an invitation, or upgrade your plan first.`);
      return;
    }
    setIsSending(true);
    try {
      const existing = await getDoc(doc(db, 'invitations', email));
      if (existing.exists() && existing.data().orgId !== organization.id) {
        setInviteError('That email already has a pending invitation to another organization.');
        return;
      }
      const invitation: Omit<Invitation, 'id'> = {
        email, orgId: organization.id, orgName: organization.name, role: inviteRole,
        invitedBy: user.uid, invitedByEmail: user.email || '', status: 'pending', createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'invitations', email), invitation);
      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch (error) {
      console.error('Invite failed:', error);
      setInviteError('Could not create that invitation. Check that you still have admin access.');
    } finally { setIsSending(false); }
  };

  const revokeInvitation = async (id: string) => {
    if (!isAdmin || !confirm('Revoke this invitation?')) return;
    try { await deleteDoc(doc(db, 'invitations', id)); } catch (error) { console.error('Could not revoke invitation:', error); }
  };

  const updateMemberRole = async (docId: string, newRole: UserRole) => {
    if (!isAdmin || !organization) return;
    try { await updateDoc(doc(db, `organizations/${organization.id}/members`, docId), { role: newRole }); }
    catch (error) { console.error('Could not update role:', error); }
  };

  const handleDeleteMember = async (docId: string) => {
    if (!isAdmin || !organization || !confirm('Are you sure you want to remove this member?')) return;
    try {
      await deleteDoc(doc(db, `organizations/${organization.id}/members`, docId));
      await updateDoc(doc(db, 'organizations', organization.id), { memberCount: Math.max(0, members.length - 1) });
    } catch (error) { console.error('Could not remove member:', error); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ivory flex items-center gap-2"><Users className="text-teal" /> Team Management</h2>
          <p className="text-inkmute">
            {billing ? PLAN_LABELS[billing.plan] : 'Trial'} plan — {hasUnlimitedSeats ? 'unlimited seats' : `limit: ${seatLimit} seats`}, including pending invitations.
          </p>
        </div>
        {isAdmin && hasAvailableSeat && (
          <button onClick={() => { setInviteError(null); setIsInviteModalOpen(true); }} className="bg-gradient-to-b from-brassbright to-brass text-[#26200e] px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:brightness-105 transition-all shadow-lg shadow-brass/25">
            <UserPlus size={18} /> Invite Colleague
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface p-6 rounded-3xl border border-hairline shadow-sm">
          <p className="text-xs font-bold text-inkfaint uppercase tracking-widest mb-1">Seats Used</p>
          <p className="text-3xl font-black text-ivory">
            {seatsUsed} <span className="text-inkfaint text-xl">/ {hasUnlimitedSeats ? '∞' : seatLimit}</span>
          </p>
          {!hasUnlimitedSeats && <div className="mt-4 h-2 w-full bg-abyss border border-hairline/50 rounded-full overflow-hidden"><div className="h-full bg-teal transition-all duration-500" style={{ width: `${Math.min(100, (seatsUsed / (seatLimit as number)) * 100)}%` }} /></div>}
          {invitations.length > 0 && <p className="text-[10px] text-inkfaint mt-2 font-medium">{members.length} joined · {invitations.length} pending</p>}
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-hairline shadow-sm overflow-hidden text-sm">
        <table className="w-full text-left"><thead><tr className="bg-ink/50 border-b border-hairline">
          <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">User</th>
          <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">Role</th>
          <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">Status</th>
          <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px]">Joined</th>
          {isAdmin && <th className="px-6 py-4 text-right font-bold text-inkmute uppercase tracking-wider text-[10px]">Actions</th>}
        </tr></thead><tbody className="divide-y divide-hairline/60">
          {members.map(member => <tr key={member.docId} className="hover:bg-ink/50 transition-colors">
            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-teal/10 text-teal rounded-full flex items-center justify-center font-bold text-xs">{member.email.charAt(0).toUpperCase()}</div><div><p className="font-bold text-ivory">{member.email}</p><p className="text-[10px] text-inkfaint">{member.userId === organization?.creatorId ? 'Organization owner' : 'Active member'}</p></div></div></td>
            <td className="px-6 py-4">{isAdmin && member.userId !== organization?.creatorId && member.userId !== user?.uid ? <select value={member.role} onChange={e => updateMemberRole(member.docId!, e.target.value as UserRole)} className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-inkmute outline-none hover:text-teal cursor-pointer">{USER_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}</select> : <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.16em] text-inkmute border-hairline">{member.role.replace(/_/g, ' ')}</span>}</td>
            <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-inkmute"><CheckCircle2 size={14} className="text-teal" /><span className="text-xs font-medium">Active</span></div></td>
            <td className="px-6 py-4 text-inkmute font-medium">{formatJoined(member.joinedAt)}</td>
            {isAdmin && <td className="px-6 py-4 text-right">{member.userId !== user?.uid && member.userId !== organization?.creatorId && <button onClick={() => handleDeleteMember(member.docId!)} className="text-inkfaint hover:text-alert p-2 rounded-lg" title="Remove member"><Trash2 size={16} /></button>}</td>}
          </tr>)}
          {invitations.map(invite => <tr key={invite.id} className="hover:bg-ink/50 transition-colors bg-brass/[0.03]">
            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-brass/10 text-brassbright rounded-full flex items-center justify-center font-bold text-xs">{invite.email.charAt(0).toUpperCase()}</div><div><p className="font-bold text-parchment">{invite.email}</p><p className="text-[10px] text-inkfaint">Invited by {invite.invitedByEmail}</p></div></div></td>
            <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase tracking-wider text-inkmute">{invite.role.replace(/_/g, ' ')}</span></td>
            <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-brassbright"><Clock size={14} /><span className="text-xs">Awaiting sign-up</span></div></td>
            <td className="px-6 py-4 text-inkfaint">—</td>
            {isAdmin && <td className="px-6 py-4 text-right"><button onClick={() => revokeInvitation(invite.id)} className="text-inkfaint hover:text-alert p-2 rounded-lg" title="Revoke invitation"><X size={16} /></button></td>}
          </tr>)}
        </tbody></table>
        {members.length === 0 && invitations.length === 0 && <div className="p-12 text-center"><Users size={28} className="mx-auto text-inkfaint mb-3" /><p className="text-sm text-inkfaint">No team members yet.</p></div>}
      </div>

      <div className="bg-ink/40 border border-hairline/60 rounded-2xl p-5 flex items-start gap-3"><Mail size={18} className="text-inkfaint shrink-0 mt-0.5" /><p className="text-xs text-inkmute leading-relaxed">Invitations are matched by email address when the person signs in. Nomad Compass does not send the invitation email itself yet — let your colleague know to sign up at this site with the exact address you invited, and verify it. Their invitation will be waiting.</p></div>

      {isInviteModalOpen && <div className="fixed inset-0 bg-abyss/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className="bg-surface rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h3 className="text-2xl font-black text-ivory mb-2">Invite Collaborator</h3>
        <p className="text-inkmute text-sm mb-6">Invite a nonprofit team member and choose their role.</p>
        <label className="block text-xs font-bold text-inkmute mb-2">Email</label>
        <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@example.org" className="w-full bg-abyss border border-hairline rounded-xl px-4 py-3 text-ivory outline-none mb-4" />
        <label className="block text-xs font-bold text-inkmute mb-2">Role</label>
        <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className="w-full bg-abyss border border-hairline rounded-xl px-4 py-3 text-ivory outline-none mb-4">{USER_ROLES.filter(r => r !== 'admin').map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}</select>
        {inviteError && <p className="text-sm text-alert mb-4">{inviteError}</p>}
        <div className="flex justify-end gap-3"><button onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-sm text-inkmute">Cancel</button><button disabled={isSending} onClick={handleInvite} className="bg-brass text-[#26200e] px-5 py-2 rounded-xl text-sm font-bold">{isSending ? 'Sending…' : 'Send Invitation'}</button></div>
      </div></div>}
    </div>
  );
};
