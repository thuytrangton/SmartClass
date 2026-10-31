import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Khởi tạo ứng dụng Firebase với cấu hình từ file provision
const app = initializeApp(firebaseConfig);

// CRITICAL: Khởi tạo Firestore với đúng firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Khởi tạo Firebase Auth
export const auth = getAuth(app);

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
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  return await signInWithPopup(auth, provider);
}

// Đăng ký tài khoản bằng Email & Mật khẩu với Firebase Auth
export async function registerWithEmailPassword(email: string, password: string, displayName?: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
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
