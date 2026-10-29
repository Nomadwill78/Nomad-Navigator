import { Firestore, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Invitation, UserRole } from '../../types';
import { evaluateSeats, seatLimitForPlan } from './plans';
import { PLAN_SEAT_LIMITS } from '../../types';

/**
 * The two transactions that change an organization's membership from the browser.
 * They live here, away from any screen, so the app and the tests run exactly the same code.
 *
 * A transaction re-reads the organization if anyone else changes it first and re-runs, so two people
 * joining at once can never both take the last seat. The database rules check the same thing again
 * on the server, so even a modified client cannot get past the limit.
 */

export class SeatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeatError';
  }
}

/** Creates an organization with its creator as the first admin, on a trial. One commit, memberCount = 1. */
export async function createOrganizationTxn(db: Firestore, args: { orgId: string; name: string; uid: string; email: string }): Promise<void> {
  const { orgId, name, uid, email } = args;
  await runTransaction(db, async (transaction) => {
    transaction.set(doc(db, 'organizations', orgId), { name, creatorId: uid, createdAt: serverTimestamp(), memberCount: 1, pendingInviteCount: 0 });
    transaction.set(doc(db, `organizations/${orgId}/members`, uid), { userId: uid, email, role: 'admin' as UserRole, joinedAt: serverTimestamp() });
    transaction.set(doc(db, `organizations/${orgId}/billing`, 'subscription'), {
      plan: 'trial', status: 'trialing', seatLimit: PLAN_SEAT_LIMITS.trial, updatedAt: new Date().toISOString(),
    });
    transaction.update(doc(db, 'users', uid), { currentOrgId: orgId });
  });
}

/**
 * Joins the organization named in `invitation`. Checks the seat limit against the live member count,
 * adds the member, adds exactly 1 to memberCount, points the profile at the organization and consumes
 * the invitation, all in one commit.
 */
export async function acceptInvitationTxn(
  db: Firestore,
  args: { uid: string; email: string; invitation: Invitation },
  options: { attempts?: number; pauseMs?: number } = {}
): Promise<void> {
  const attempts = options.attempts ?? 6;
  const pauseMs = options.pauseMs ?? 80;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await runAccept(db, args);
      return;
    } catch (error) {
      if (error instanceof SeatError) throw error; // a real answer: no seat, or the organization is gone
      lastError = error;
      const code = (error as { code?: string })?.code;
      const retryable = code === 'permission-denied' || code === 'aborted' || code === 'failed-precondition';
      if (!retryable) throw error;
      // The database refused the commit. When people join at once, the seat count moves under the loser,
      // so re-read the live numbers: if the plan is now full or blocked say so plainly, else try again.
      const explained = await explainRefusal(db, args.invitation);
      if (explained) throw explained;
      await new Promise((r) => setTimeout(r, pauseMs * attempt + Math.random() * pauseMs));
    }
  }
  throw lastError;
}

async function explainRefusal(db: Firestore, invitation: Invitation): Promise<SeatError | null> {
  try {
    const orgSnap = await getDoc(doc(db, 'organizations', invitation.orgId));
    const billingSnap = await getDoc(doc(db, `organizations/${invitation.orgId}/billing`, 'subscription'));
    if (!orgSnap.exists()) return null;
    const plan = billingSnap.exists() ? billingSnap.data().plan : 'trial';
    const status = billingSnap.exists() ? billingSnap.data().status : 'trialing';
    const seats = evaluateSeats({ plan, status, members: (orgSnap.data().memberCount as number) ?? 0 });
    if (seats.blockedBy === 'full') {
      return new SeatError(`${invitation.orgName} just filled its last seat (limit ${seats.limit}). Ask an administrator to free one up or upgrade the plan.`);
    }
    if (seats.blockedBy) return new SeatError(`${invitation.orgName} cannot add new members right now. ${seats.message}`);
    return null;
  } catch {
    return null;
  }
}

async function runAccept(db: Firestore, args: { uid: string; email: string; invitation: Invitation }): Promise<void> {
  const { uid, email, invitation } = args;
  const orgRef = doc(db, 'organizations', invitation.orgId);
  const billingRef = doc(db, `organizations/${invitation.orgId}/billing`, 'subscription');
  const invitationRef = doc(db, 'invitations', invitation.id);

  await runTransaction(db, async (transaction) => {
    const orgSnap = await transaction.get(orgRef);
    if (!orgSnap.exists()) throw new SeatError('That organization no longer exists. Ask your administrator to re-invite you.');
    const [billingSnap, invitationSnap] = await Promise.all([transaction.get(billingRef), transaction.get(invitationRef)]);
    if (!invitationSnap.exists() || invitationSnap.data().orgId !== invitation.orgId || invitationSnap.data().email?.toLowerCase() !== email.toLowerCase()) {
      throw new SeatError('This invitation is no longer available. Ask an administrator to send a new invitation.');
    }
    // An organization with no billing document yet is on the trial.
    const plan = billingSnap.exists() ? billingSnap.data().plan : 'trial';
    const status = billingSnap.exists() ? billingSnap.data().status : 'trialing';
    const members = (orgSnap.data().memberCount as number) ?? 0;

    // Seats are judged on real members only here (the invitation being accepted is this person's own seat).
    const seats = evaluateSeats({ plan, status, members, pendingInvites: 0 });
    if (!seats.canAdd) {
      const limit = seatLimitForPlan(plan);
      throw new SeatError(
        seats.blockedBy === 'full'
          ? `${invitation.orgName} has no seats left (limit ${limit}). Ask an administrator to free one up or upgrade the plan.`
          : `${invitation.orgName} cannot add new members right now. ${seats.message}`
      );
    }

    transaction.set(doc(db, `organizations/${invitation.orgId}/members`, uid), {
      userId: uid, email, role: invitation.role, joinedAt: new Date().toISOString(),
    });
    const pendingInviteCount = Math.max(0, Number(orgSnap.data().pendingInviteCount ?? 1) - 1);
    transaction.update(orgRef, { memberCount: members + 1, pendingInviteCount });
    transaction.update(doc(db, 'users', uid), { currentOrgId: invitation.orgId });
    transaction.delete(invitationRef);
  });
}
