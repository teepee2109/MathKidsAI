// Shared Firebase app for Analytics and Authentication. The SDK is loaded lazily
// so it does not weigh on the first page load.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let appPromise;

export function getFirebaseApp() {
  if (!appPromise) {
    appPromise = import("firebase/app").then(({ getApps, initializeApp }) => getApps()[0] || initializeApp(firebaseConfig));
  }
  return appPromise;
}
