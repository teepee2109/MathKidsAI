// Firebase Analytics (Google Analytics 4). Disabled unless VITE_FIREBASE_* is set,
// and the SDK is loaded lazily so it does not weigh on the first page load.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.measurementId);
let analyticsPromise;

function loadAnalytics() {
  if (!isConfigured) return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = Promise.all([import("firebase/app"), import("firebase/analytics")])
      .then(async ([{ initializeApp }, analyticsModule]) => {
        if (!(await analyticsModule.isSupported())) return null;
        const analytics = analyticsModule.initializeAnalytics(initializeApp(firebaseConfig), {
          config: {
            // Page views are sent by trackPageView on every route change instead.
            send_page_view: false,
            // Many users are children: no ad personalisation or Google signals.
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
          },
        });
        return { analytics, ...analyticsModule };
      })
      .catch((error) => {
        console.warn("[analytics] Firebase Analytics could not start:", error.message);
        return null;
      });
  }
  return analyticsPromise;
}

export function trackEvent(name, params = {}) {
  loadAnalytics().then((sdk) => sdk?.logEvent(sdk.analytics, name, params));
}

// Numeric ids (e.g. /parent/children/12/report) are collapsed so reports group by page.
export function trackPageView(pathname) {
  const pagePath = pathname.replace(/\/\d+(?=\/|$)/g, "/:id");
  trackEvent("page_view", { page_path: pagePath, page_location: `${window.location.origin}${pagePath}`, page_title: document.title });
}

// Only the internal numeric id and role are sent, never names or emails.
export function setAnalyticsUser(user) {
  loadAnalytics().then((sdk) => {
    if (!sdk) return;
    sdk.setUserId(sdk.analytics, user?.id ? String(user.id) : null);
    sdk.setUserProperties(sdk.analytics, { user_role: user?.role || "Guest" });
  });
}
