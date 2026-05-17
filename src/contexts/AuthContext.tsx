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
import { auth, db, signInWithGoogle } from '../lib/firebase';
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // 1. Sync Profile
        const profileRef = doc(db, 'users', user.uid);
        let profileSnap = await getDoc(profileRef);
        
        if (!profileSnap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'New User',
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(profileSnap.data() as UserProfile);
        }

        // 2. Fetch Org & Role
        // For simplicity, we find the first org they are a member of
        const membersQuery = query(collection(db, 'organizations'), where('members', 'array-contains', user.uid));
        // Wait, our schema uses organizations/{orgId}/members/{userId}. We need a collection group query or just check currentOrgId.
        
        // Let's use currentOrgId from profile
        const currentOrgId = (profileSnap.data() as UserProfile | undefined)?.currentOrgId;
        if (currentOrgId) {
          const orgRef = doc(db, 'organizations', currentOrgId);
          onSnapshot(orgRef, (snap) => {
            if (snap.exists()) setOrganization({ id: snap.id, ...snap.data() } as Organization);
          });

          const memberRef = doc(db, `organizations/${currentOrgId}/members`, user.uid);
          onSnapshot(memberRef, (snap) => {
            if (snap.exists()) setRole((snap.data() as OrgMember).role);
          });
        }
      } else {
        setProfile(null);
        setOrganization(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
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
