import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
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
import { UserProfile, Organization, OrgMember, UserRole } from '../../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  role: UserRole | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createOrg: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
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
    await createUserWithEmailAndPassword(auth, email, pass);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `organizations/${orgId}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, organization, role, loading, 
      login, loginWithEmail, registerWithEmail, logout, createOrg 
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
