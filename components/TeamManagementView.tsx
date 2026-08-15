import React, { useState, useEffect } from 'react';
import { Users, Mail, Trash2, UserPlus, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { useAuth, inviteId } from '../src/contexts/AuthContext';
import { db } from '../src/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { OrgMember, UserRole, Invitation, USER_ROLES, ROLE_DESCRIPTIONS, PLAN_LABELS } from '../types';

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
  // Grandfathered default matches firestore.rules' orgSeatLimit() while the billing doc is still loading.
  const seatLimit = billing?.seatLimit ?? 8;

  useEffect(() => {
    if (!organization) return;

    const unsubMembers = onSnapshot(
      collection(db, `organizations/${organization.id}/members`),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ ...(d.data() as OrgMember), docId: d.id })));
      },
      (error) => console.error('Member sync failed:', error)
    );

    // Pending invitations live in a top-level collection so the invitee — who is
    // not yet a member — can read their own. Admins read their org's by query.
    const unsubInvites = onSnapshot(
      query(collection(db, 'invitations'), where('orgId', '==', organization.id)),
      (snap) => {
        setInvitations(snap.docs.map((d) => ({ ...(d.data() as Invitation), id: d.id })));
      },
      (error) => console.error('Invitation sync failed:', error)
    );

    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [organization]);

  const handleInvite = async () => {
    if (!organization || !user || !inviteEmail.trim()) return;

    const email = inviteId(inviteEmail);
    setInviteError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('That does not look like a valid email address.');
      return;
    }
    if (members.some((m) => m.email?.toLowerCase() === email)) {
      setInviteError('That person is already a member of this organization.');
      return;
    }
    if (seatsUsed >= seatLimit) {
      setInviteError(`All ${seatLimit} seats are taken. Remove a member, revoke an invitation, or upgrade your plan first.`);
      return;
    }

    setIsSending(true);
    try {
      // One pending invitation per email address, product-wide.
      const existing = await getDoc(doc(db, 'invitations', email));
      if (existing.exists() && existing.data().orgId !== organization.id) {
        setInviteError('That email already has a pending invitation to another organization.');
        setIsSending(false);
        return;
      }

      const invitation: Omit<Invitation, 'id'> = {
        email,
        orgId: organization.id,
        orgName: organization.name,
        role: inviteRole,
        invitedBy: user.uid,
        invitedByEmail: user.email || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'invitations', email), invitation);
      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch (error: any) {
      console.error('Invite failed:', error);
      setInviteError('Could not create that invitation. Check that you still have admin access.');
    } finally {
      setIsSending(false);
    }
  };

  const revokeInvitation = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Revoke this invitation?')) return;
    try {
      await deleteDoc(doc(db, 'invitations', id));
    } catch (error) {
      console.error('Could not revoke invitation:', error);
    }
  };

  const updateMemberRole = async (docId: string, newRole: UserRole) => {
    if (!isAdmin || !organization) return;
    try {
      await updateDoc(doc(db, `organizations/${organization.id}/members`, docId), { role: newRole });
    } catch (error) {
      console.error('Could not update role:', error);
    }
  };

  const handleDeleteMember = async (docId: string) => {
    if (!isAdmin || !organization) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await deleteDoc(doc(db, `organizations/${organization.id}/members`, docId));
      await updateDoc(doc(db, 'organizations', organization.id), {
        memberCount: Math.max(0, members.length - 1),
      });
    } catch (error) {
      console.error('Could not remove member:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ivory flex items-center gap-2">
            <Users className="text-teal" /> Team Management
          </h2>
          <p className="text-inkmute">
            {billing ? PLAN_LABELS[billing.plan] : 'Trial'} plan — limit: {seatLimit} seats, including
            pending invitations.
          </p>
        </div>
        {isAdmin && seatsUsed < seatLimit && (
          <button
            onClick={() => {
              setInviteError(null);
              setIsInviteModalOpen(true);
            }}
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
          <p className="text-3xl font-black text-ivory">
            {seatsUsed} <span className="text-inkfaint text-xl">/ {seatLimit}</span>
          </p>
          <div className="mt-4 h-2 w-full bg-abyss border border-hairline/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal transition-all duration-500"
              style={{ width: `${Math.min(100, (seatsUsed / seatLimit) * 100)}%` }}
            />
          </div>
          {invitations.length > 0 && (
            <p className="text-[10px] text-inkfaint mt-2 font-medium">
              {members.length} joined · {invitations.length} pending
            </p>
          )}
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
              {isAdmin && (
                <th className="px-6 py-4 font-bold text-inkmute uppercase tracking-wider text-[10px] text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/60">
            {members.map((member) => (
              <tr key={member.docId} className="hover:bg-ink/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal/10 text-teal rounded-full flex items-center justify-center font-bold text-xs">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-ivory">{member.email}</p>
                      <p className="text-[10px] text-inkfaint font-medium">
                        {member.userId === organization?.creatorId ? 'Organization owner' : 'Active member'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {/* Admins cannot change their own role or the owner's — an org
                      must always keep at least one administrator. Enforced in rules too. */}
                  {isAdmin && member.userId !== organization?.creatorId && member.userId !== user?.uid ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.docId!, e.target.value as UserRole)}
                      className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-inkmute outline-none hover:text-teal cursor-pointer"
                    >
                      {USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, ' ')}
                        </option>
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
                      {member.role.replace(/_/g, ' ')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-inkmute">
                    <CheckCircle2 size={14} className="text-teal" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-inkmute font-medium">
                  {formatJoined(member.joinedAt)}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    {member.userId !== user?.uid && member.userId !== organization?.creatorId && (
                      <button
                        onClick={() => handleDeleteMember(member.docId!)}
                        className="text-inkfaint hover:text-alert transition-colors p-2 rounded-lg hover:bg-alert/15"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {invitations.map((invite) => (
              <tr key={invite.id} className="hover:bg-ink/50 transition-colors bg-brass/[0.03]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brass/10 text-brassbright rounded-full flex items-center justify-center font-bold text-xs">
                      {invite.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-parchment">{invite.email}</p>
                      <p className="text-[10px] text-inkfaint font-medium">
                        Invited by {invite.invitedByEmail}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono2 font-bold uppercase tracking-wider border bg-white/5 text-inkmute border-hairline">
                    {invite.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-brassbright">
                    <Clock size={14} />
                    <span className="text-xs font-medium">Awaiting sign-up</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-inkfaint font-medium">—</td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => revokeInvitation(invite.id)}
                      className="text-inkfaint hover:text-alert transition-colors p-2 rounded-lg hover:bg-alert/15"
                      title="Revoke invitation"
                    >
                      <X size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && invitations.length === 0 && (
          <div className="p-12 text-center">
            <Users size={28} className="mx-auto text-inkfaint mb-3" />
            <p className="text-sm text-inkfaint">No team members yet.</p>
          </div>
        )}
      </div>

      <div className="bg-ink/40 border border-hairline/60 rounded-2xl p-5 flex items-start gap-3">
        <Mail size={18} className="text-inkfaint shrink-0 mt-0.5" />
        <p className="text-xs text-inkmute leading-relaxed">
          Invitations are matched by email address when the person signs in. Nomad Compass does not
          send the invitation email itself yet — let your colleague know to sign up at this site with
          the exact address you invited, and verify it. Their invitation will be waiting.
        </p>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-abyss/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-ivory mb-2">Invite Collaborator</h3>
            <p className="text-inkmute text-sm mb-8">
              Role-based access ensures data integrity for your donors.
            </p>

            {inviteError && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-6">
                <AlertCircle size={16} className="text-rose-300 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-200 leading-relaxed">{inviteError}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-inkfaint uppercase tracking-widest block mb-1.5">
                  Email Address
                </label>
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
                <label className="text-[10px] font-bold text-inkfaint uppercase tracking-widest block mb-1.5">
                  Permission Role
                </label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {USER_ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        inviteRole === r
                          ? 'border-teal/40 bg-teal/10 ring-1 ring-teal/40'
                          : 'border-hairline hover:border-hairline'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                          inviteRole === r ? 'text-teal' : 'text-inkmute'
                        }`}
                      >
                        {r.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[0.6rem] text-inkfaint leading-tight">{ROLE_DESCRIPTIONS[r]}</p>
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
                  disabled={!inviteEmail.trim() || isSending}
                  className="flex-1 bg-abyss text-ivory py-3 rounded-xl font-bold hover:bg-surface2 transition-all disabled:opacity-50"
                >
                  {isSending ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatJoined(joinedAt: unknown): string {
  if (!joinedAt) return '—';
  // joinedAt may be an ISO string or a Firestore Timestamp depending on how it was written.
  const raw =
    typeof joinedAt === 'object' && joinedAt !== null && 'toDate' in joinedAt
      ? (joinedAt as { toDate: () => Date }).toDate()
      : new Date(joinedAt as string);
  return Number.isNaN(raw.getTime()) ? '—' : raw.toLocaleDateString();
}
