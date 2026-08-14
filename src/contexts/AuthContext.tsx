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
import { auth, db, signInWithGoogle, getRedirectResult } from '../lib/firebase';
import { UserProfile, Organization, OrgMember, UserRole, Invitation, SEAT_LIMIT } from '../../types';
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
  /** A pending invitation addressed to this user's email, if they have no org yet. */
  invitation: Invitation | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createOrg: (name: string) => Promise<void>;
  acceptInvitation: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;
    let orgUnsubscribe: (() => void) | undefined;
    let memberUnsubscribe: (() => void) | undefined;

    // Handle redirected sign-in results
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("Successfully signed in via Google redirect", result.user);
        }
      })
      .catch((error) => {
        console.error("Firebase Google redirect sign-in error:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Cleanup previous observers
      if (profileUnsubscribe) profileUnsubscribe();
      if (orgUnsubscribe) orgUnsubscribe();
      if (memberUnsubscribe) memberUnsubscribe();

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
            } else {
              setOrganization(null);
              setRole(null);
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
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      if (orgUnsubscribe) orgUnsubscribe();
      if (memberUnsubscribe) memberUnsubscribe();
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

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

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

  const logout = () => signOut(auth);

  const createOrg = async (name: string) => {
    if (!user) return;
    const orgId = `org_${Date.now()}`;
    const userEmail = user.email || '';

    try {
      await runTransaction(db, async (transaction) => {
        const orgRef = doc(db, 'organizations', orgId);
        const memberRef = doc(db, `organizations/${orgId}/members`, user.uid);
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

    await runTransaction(db, async (transaction) => {
      const orgSnap = await transaction.get(orgRef);
      if (!orgSnap.exists()) {
        throw new Error('That organization no longer exists. Ask your administrator to re-invite you.');
      }

      const currentCount = (orgSnap.data().memberCount as number) ?? 0;
      if (currentCount >= SEAT_LIMIT) {
        throw new Error(
          `${invitation.orgName} has no seats left (limit ${SEAT_LIMIT}). Ask an administrator to free one up.`
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
      user, profile, organization, role, loading, invitation,
      login, loginWithEmail, registerWithEmail, logout, createOrg,
      acceptInvitation, resendVerificationEmail
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
