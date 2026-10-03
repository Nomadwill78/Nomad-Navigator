import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

/**
 * Firestore is initialised once, with two reliability settings:
 *
 *  - persistentLocalCache: reads AND queued writes are kept in IndexedDB, so an
 *    edit made offline (or during a dropped connection) survives a page reload
 *    and is sent automatically when the connection returns. Multi-tab manager
 *    lets several open tabs share that cache. If IndexedDB is unavailable
 *    (private mode, blocked storage) we fall back to the in-memory cache
 *    instead of crashing the app.
 *
 *  - experimentalAutoDetectLongPolling: the "WebChannelConnection RPC 'Listen'
 *    stream transport errored" warnings come from the streaming transport being
 *    blocked or dropped by a proxy, VPN, ad blocker or flaky network. With this
 *    on, the SDK detects that and falls back to HTTP long-polling.
 */
function createFirestore() {
  const databaseId = (firebaseConfig as any).firestoreDatabaseId;
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        experimentalAutoDetectLongPolling: true,
      },
      databaseId
    );
  } catch (error) {
    console.warn('Offline persistence unavailable, using in-memory cache:', error);
    return initializeFirestore(
      app,
      { localCache: memoryLocalCache(), experimentalAutoDetectLongPolling: true },
      databaseId
    );
  }
}

export const db = createFirestore();
export const auth = getAuth(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
};

