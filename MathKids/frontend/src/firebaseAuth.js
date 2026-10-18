// Firebase Authentication (Google + Email/Password). Firebase only proves who the user is:
// the ID token is exchanged at /api/auth/firebase for the app's own JWT session.
import { firebaseConfig, getFirebaseApp } from "./firebase";

export const isFirebaseAuthConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

const errorMessages = {
  "auth/email-already-in-use": "Email này đã có tài khoản Firebase. Hãy đăng nhập hoặc dùng \"Quên mật khẩu\".",
  "auth/invalid-credential": "Email hoặc mật khẩu không chính xác.",
  "auth/invalid-email": "Email không đúng định dạng.",
  "auth/weak-password": "Mật khẩu cần có ít nhất 6 ký tự.",
  "auth/too-many-requests": "Bạn thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.",
  "auth/user-disabled": "Tài khoản Firebase này đã bị khóa.",
  "auth/popup-blocked": "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.",
  "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập Google.",
  "auth/cancelled-popup-request": "Bạn đã đóng cửa sổ đăng nhập Google.",
  "auth/network-request-failed": "Không thể kết nối tới Firebase. Hãy kiểm tra mạng.",
  "auth/operation-not-allowed": "Phương thức đăng nhập này chưa được bật trong Firebase Console.",
  "auth/unauthorized-domain": "Tên miền này chưa được thêm vào Authorized domains trong Firebase Console.",
};

export function getFirebaseAuthErrorMessage(error, fallback) {
  return errorMessages[error?.code] || error?.message || fallback;
}

let authPromise;

function loadAuth() {
  if (!authPromise) {
    authPromise = Promise.all([getFirebaseApp(), import("firebase/auth")]).then(([app, sdk]) => {
      // In-memory only: the session lives in the app's JWT, not in Firebase's IndexedDB.
      const auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence, popupRedirectResolver: sdk.browserPopupRedirectResolver });
      auth.languageCode = "vi";
      return { auth, sdk };
    });
  }
  return authPromise;
}

export async function signInWithFirebaseGoogle() {
  const { auth, sdk } = await loadAuth();
  const provider = new sdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const { user } = await sdk.signInWithPopup(auth, provider);
  return user.getIdToken();
}

// Returns an ID token, or null when the email is not verified yet (a new verification email is sent).
export async function signInWithFirebaseEmail(email, password) {
  const { auth, sdk } = await loadAuth();
  const { user } = await sdk.signInWithEmailAndPassword(auth, email, password);
  if (!user.emailVerified) {
    await sdk.sendEmailVerification(user);
    return null;
  }
  return user.getIdToken();
}

// Keeps the new user signed in (in memory) so getVerifiedFirebaseIdToken can finish registration.
export async function registerWithFirebaseEmail(name, email, password) {
  const { auth, sdk } = await loadAuth();
  const { user } = await sdk.createUserWithEmailAndPassword(auth, email, password);
  await sdk.updateProfile(user, { displayName: name });
  await sdk.sendEmailVerification(user);
}

export async function resendFirebaseVerificationEmail() {
  const { auth, sdk } = await loadAuth();
  if (auth.currentUser) await sdk.sendEmailVerification(auth.currentUser);
}

// Returns a fresh ID token once the pending user has clicked the verification link, otherwise null.
export async function getVerifiedFirebaseIdToken() {
  const { auth } = await loadAuth();
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified ? auth.currentUser.getIdToken(true) : null;
}

export async function sendFirebasePasswordReset(email) {
  const { auth, sdk } = await loadAuth();
  await sdk.sendPasswordResetEmail(auth, email);
}

export async function signOutFirebase() {
  if (!authPromise) return;
  const { auth, sdk } = await loadAuth();
  await sdk.signOut(auth);
}
