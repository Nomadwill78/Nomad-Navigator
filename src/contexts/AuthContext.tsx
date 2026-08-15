import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, sendEmailVerification, reload } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Organization, OrgMember, UserRole, Invitation, OrgBilling, PLAN_SEAT_LIMITS } from '../../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { clearLegacyLocalData } from '../lib/orgData';

/** Invitations are keyed by the invitee's email, normalised the same way everywhere. */
export const inviteId = (email: string) => email.trim().toLowerCase();

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  role: UserRole | null;
  loading: boolean;
  /** The current organization's plan and seat limit. Null until the trial doc syncs. */
  billing: OrgBilling | null;
  /** A pending invitation addressed to this user's email, if they have no org yet. */
  invitation: Invitation | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createOrg: (name: string) => Promise<void>;
  acceptInvitation: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Marks the one-time welcome step as seen, so it doesn't show again on this account. */
  dismissWelcome: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [billing, setBilling] = useState<OrgBilling | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;
    let orgUnsubscribe: (() => void) | undefined;
    let memberUnsubscribe: (() => void) | undefined;
    let billingUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Cleanup previous observers
      if (profileUnsubscribe) profileUnsubscribe();
      if (orgUnsubscribe) orgUnsubscribe();
      if (memberUnsubscribe) memberUnsubscribe();
      if (billingUnsubscribe) billingUnsubscribe();

      if (user) {
        setLoading(true);
        const profileRef = doc(db, 'users', user.uid);
        
        profileUnsubscribe = onSnapshot(profileRef, async (snap) => {
          if (!snap.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'New User',
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          } else {
            const profileData = snap.data() as UserProfile;
            setProfile(profileData);

            // Handle Org/Role syncing reactively
            if (profileData.currentOrgId) {
              if (orgUnsubscribe) orgUnsubscribe();
              if (memberUnsubscribe) memberUnsubscribe();
              if (billingUnsubscribe) billingUnsubscribe();

              const orgRef = doc(db, 'organizations', profileData.currentOrgId);
              orgUnsubscribe = onSnapshot(orgRef, (osnap) => {
                if (osnap.exists()) {
                  setOrganization({ id: osnap.id, ...osnap.data() } as Organization);
                }
              });

              const memberRef = doc(db, `organizations/${profileData.currentOrgId}/members`, user.uid);
              memberUnsubscribe = onSnapshot(memberRef, (msnap) => {
                if (msnap.exists()) {
                  setRole((msnap.data() as OrgMember).role);
                }
              });

              const billingRef = doc(db, `organizations/${profileData.currentOrgId}/billing`, 'subscription');
              billingUnsubscribe = onSnapshot(billingRef, (bsnap) => {
                setBilling(bsnap.exists() ? (bsnap.data() as OrgBilling) : null);
              });
            } else {
              setOrganization(null);
              setRole(null);
              setBilling(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setOrganization(null);
        setRole(null);
        setBilling(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      if (orgUnsubscribe) orgUnsubscribe();
      if (memberUnsubscribe) memberUnsubscribe();
      if (billingUnsubscribe) billingUnsubscribe();
    };
  }, []);

  /**
   * Look for an invitation addressed to this user, but only while they have no
   * organization — that is the only moment it matters. The document id is the
   * lowercased email, so this is a single `get`, not a query: no index, and the
   * security rule is a simple id comparison.
   */
  useEffect(() => {
    let cancelled = false;

    const findInvitation = async () => {
      if (!user?.email || profile?.currentOrgId) {
        if (!cancelled) setInvitation(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'invitations', inviteId(user.email)));
        if (cancelled) return;
        setInvitation(snap.exists() ? ({ ...(snap.data() as Invitation), id: snap.id }) : null);
      } catch (error) {
        // A missing invitation is the common case, not a failure worth surfacing.
        console.debug('No pending invitation found:', error);
        if (!cancelled) setInvitation(null);
      }
    };

    findInvitation();
    return () => {
      cancelled = true;
    };
  }, [user?.email, profile?.currentOrgId]);

  const loginWithEmail = async (email: string, pass: string) => {
    const { signInWithEmailAndPassword } = await import('../lib/firebase');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const { createUserWithEmailAndPassword } = await import('../lib/firebase');
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    // Accepting an invitation is an email-based trust decision, so the address has
    // to be proven. Send the verification mail at signup rather than stranding the
    // user at the join screen with no way forward.
    try {
      await sendEmailVerification(credential.user);
    } catch (error) {
      console.error('Could not send verification email:', error);
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('You need to be signed in first.');
    await sendEmailVerification(auth.currentUser);
  };

  const resetPassword = async (email: string) => {
    const { sendPasswordResetEmail } = await import('../lib/firebase');
    await sendPasswordResetEmail(auth, email);
  };

  const updateDisplayName = async (name: string) => {
    if (!auth.currentUser) throw new Error('You need to be signed in first.');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Please enter a name.');
    await setDoc(doc(db, 'users', auth.currentUser.uid), { displayName: trimmed }, { merge: true });
  };

  /**
   * Firebase requires a recent sign-in before it will accept a password
   * change, so this re-proves identity with the current password first —
   * the same reason `acceptInvitation` re-checks emailVerified live rather
   * than trusting a stale client value.
   */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('You need to be signed in first.');
    const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('../lib/firebase');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  const dismissWelcome = async () => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, 'users', auth.currentUser.uid), { hasSeenWelcome: true }, { merge: true });
  };

  const logout = () => signOut(auth);

  const createOrg = async (name: string) => {
    if (!user) return;
    const orgId = `org_${Date.now()}`;
    const userEmail = user.email || '';

    try {
      await runTransaction(db, async (transaction) => {
        const orgRef = doc(db, 'organizations', orgId);
        const memberRef = doc(db, `organizations/${orgId}/members`, user.uid);
        const billingRef = doc(db, `organizations/${orgId}/billing`, 'subscription');
        const profileRef = doc(db, 'users', user.uid);

        transaction.set(orgRef, {
          name,
          creatorId: user.uid,
          createdAt: serverTimestamp(),
          memberCount: 1
        });

        transaction.set(memberRef, {
          userId: user.uid,
          email: userEmail,
          role: 'admin',
          joinedAt: serverTimestamp()
        });

        // Every org starts on the trial plan — no card required. An admin
        // upgrades from the Billing screen whenever they're ready.
        transaction.set(billingRef, {
          plan: 'trial',
          status: 'trialing',
          seatLimit: PLAN_SEAT_LIMITS.trial,
          updatedAt: new Date().toISOString(),
        });

        transaction.update(profileRef, { currentOrgId: orgId });
      });
      clearLegacyLocalData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `organizations/${orgId}`);
    }
  };

  /**
   * Completes the join: creates the member document keyed by auth uid (which is
   * what the rest of the app looks up), points the user profile at the org,
   * bumps the seat count, and consumes the invitation — all atomically, so a
   * half-joined member can't exist.
   */
  const acceptInvitation = async () => {
    if (!user || !invitation) return;

    // Re-check with the server; the user may have clicked the verification link
    // in another tab since this page loaded.
    await reload(user);
    if (!auth.currentUser?.emailVerified) {
      throw new Error(
        'Please verify your email address first, then try again. We sent a link to ' + user.email + '.'
      );
    }
    if (!user.email) {
      throw new Error('Your account has no email address, so this invitation cannot be matched.');
    }

    const orgRef = doc(db, 'organizations', invitation.orgId);
    const billingRef = doc(db, `organizations/${invitation.orgId}/billing`, 'subscription');

    await runTransaction(db, async (transaction) => {
      const orgSnap = await transaction.get(orgRef);
      if (!orgSnap.exists()) {
        throw new Error('That organization no longer exists. Ask your administrator to re-invite you.');
      }

      const billingSnap = await transaction.get(billingRef);
      // Grandfather in orgs from before the billing model shipped, same as firestore.rules' orgSeatLimit().
      const seatLimit = billingSnap.exists() ? (billingSnap.data().seatLimit as number) : 8;

      const currentCount = (orgSnap.data().memberCount as number) ?? 0;
      if (currentCount >= seatLimit) {
        throw new Error(
          `${invitation.orgName} has no seats left (limit ${seatLimit}). Ask an administrator to free one up.`
        );
      }

      transaction.set(doc(db, `organizations/${invitation.orgId}/members`, user.uid), {
        userId: user.uid,
        email: user.email,
        role: invitation.role,
        joinedAt: new Date().toISOString(),
      });
      transaction.update(orgRef, { memberCount: currentCount + 1 });
      transaction.update(doc(db, 'users', user.uid), { currentOrgId: invitation.orgId });
      transaction.delete(doc(db, 'invitations', invitation.id));
    });

    clearLegacyLocalData();
    setInvitation(null);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, organization, role, loading, billing, invitation,
      loginWithEmail, registerWithEmail, logout, createOrg,
      acceptInvitation, resendVerificationEmail, resetPassword,
      updateDisplayName, changePassword, dismissWelcome
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
