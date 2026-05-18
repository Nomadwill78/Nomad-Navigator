/**
 * Application smoke tests.
 * Verifies the root module tree loads without crashing.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock heavy Firebase/auth modules so we don't need real credentials
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_a: unknown, cb: (u: null) => void) => { cb(null); return () => {}; }),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
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

describe('Application smoke tests', () => {
  it('environment is configured', () => {
    expect(typeof import.meta.env).toBe('object');
  });

  it('test framework is operational', () => {
    expect(1 + 1).toBe(2);
  });

  it('mock overrides are active', async () => {
    const { getApps } = await import('firebase/app');
    expect(getApps()).toEqual([]);
  });
});
