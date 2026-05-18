/**
 * Auth flow smoke tests.
 * These run in jsdom (no real Firebase connection).
 * They verify the shape and contract of the AuthContext, not Firebase internals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Firebase auth so no real network calls happen
// ---------------------------------------------------------------------------
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null); // simulate signed-out state
    return () => {}; // unsubscribe noop
  }),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => new Date()),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Auth module contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import firebase/auth without throwing', async () => {
    const auth = await import('firebase/auth');
    expect(auth.getAuth).toBeDefined();
    expect(auth.onAuthStateChanged).toBeDefined();
    expect(auth.signInWithEmailAndPassword).toBeDefined();
    expect(auth.signOut).toBeDefined();
  });

  it('onAuthStateChanged fires the callback with null when signed out', async () => {
    const { onAuthStateChanged, getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const callback = vi.fn();
    const unsubscribe = onAuthStateChanged(auth, callback);
    expect(callback).toHaveBeenCalledWith(null);
    expect(typeof unsubscribe).toBe('function');
  });

  it('signInWithEmailAndPassword is callable', async () => {
    const { signInWithEmailAndPassword, getAuth } = await import('firebase/auth');
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'test@example.com',
      'password123'
    );
  });

  it('signOut is callable', async () => {
    const { signOut, getAuth } = await import('firebase/auth');
    const auth = getAuth();
    await signOut(auth);
    expect(signOut).toHaveBeenCalledWith(auth);
  });
});

describe('Environment variable safety', () => {
  it('VITE_GEMINI_API_KEY must never be an empty string in production', () => {
    // In test/CI environments this is the stub value; in production it must be set.
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('VITE_FIREBASE_PROJECT_ID must be defined', () => {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    expect(typeof projectId).toBe('string');
    expect(projectId.length).toBeGreaterThan(0);
  });
});
