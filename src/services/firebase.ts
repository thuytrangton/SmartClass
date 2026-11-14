import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Xóa dữ liệu phiên hết hạn lưu trong IndexedDB để tránh lỗi gọi securetoken.googleapis.com khi API chưa bật
if (typeof window !== 'undefined' && window.indexedDB) {
  try {
    window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
  } catch {
    // Bỏ qua nếu trình duyệt chặn thao tác xóa IndexedDB
  }
}

// Khởi tạo ứng dụng Firebase chính cho Auth
const app = getApps().some((a) => a.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig);

// Khởi tạo ứng dụng Firebase độc lập cho Firestore để kết nối cơ sở dữ liệu
// không bao giờ bị chặn bởi lỗi làm mới token (securetoken.googleapis.com)
const firestoreApp = getApps().some((a) => a.name === 'smart-class-firestore')
  ? getApp('smart-class-firestore')
  : initializeApp(firebaseConfig, 'smart-class-firestore');

// CRITICAL: Khởi tạo Firestore với đúng firestoreDatabaseId
export const db = getFirestore(firestoreApp, firebaseConfig.firestoreDatabaseId);

// Khởi tạo Firebase Auth với inMemoryPersistence để tránh lưu token hết hạn gây lỗi Token Service API
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    return getAuth(app);
  }
})();

// Kiểm tra kết nối đến Firestore khi ứng dụng khởi động
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Vui lòng kiểm tra cấu hình mạng hoặc Firebase.');
    }
  }
}

// Gọi kiểm tra kết nối ngay khi file được import
testFirestoreConnection();

// Các kiểu thao tác Firestore phục vụ chuẩn đoán lỗi
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Xử lý lỗi Firestore theo tiêu chuẩn định dạng JSON FirestoreErrorInfo
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);

  // Nếu là lỗi mạng tạm thời hoặc client offline thì không làm sập luồng ứng dụng
  if (
    errMsg.includes('the client is offline') ||
    errMsg.includes('token-service-api') ||
    errMsg.includes('Fetching auth token failed')
  ) {
    console.warn(`Firestore offline/network notice (${operationType} ${path}):`, errMsg);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Đăng nhập bằng Google Popup
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider, browserPopupRedirectResolver);
}

// Đăng ký tài khoản bằng Email & Mật khẩu với Firebase Auth
export async function registerWithEmailPassword(email: string, password: string, displayName?: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName });
    } catch {
      // Bỏ qua nếu cập nhật displayName gặp lỗi mạng
    }
  }
  return userCredential;
}

// Đăng nhập bằng Email & Mật khẩu với Firebase Auth
export async function logInWithEmailPassword(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Đăng xuất khỏi Firebase
export async function logOutFirebase() {
  return await signOut(auth);
}

export default app;
