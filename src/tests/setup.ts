import '@testing-library/jest-dom';

// Provide stub values for Firebase env vars in test environments
if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  Object.assign(import.meta.env, {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000',
    VITE_FIREBASE_APP_ID: '1:000:web:000',
    VITE_GEMINI_API_KEY: 'test-gemini-key',
  });
}
