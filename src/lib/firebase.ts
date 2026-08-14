import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingFirebaseSettings = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingFirebaseSettings.length > 0) {
  throw new Error(
    `Missing Firebase environment settings: ${missingFirebaseSettings.join(', ')}. ` +
      'Use the environment template for your local, staging, or production project.',
  );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)');
export const auth = getAuth(app);

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection successful');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
