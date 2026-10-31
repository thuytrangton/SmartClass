import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../data/mockData';
import {
  auth,
  db as firestoreDb,
  signInWithGoogle,
  registerWithEmailPassword,
  logInWithEmailPassword,
  logOutFirebase,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  schoolName?: string;
  phone?: string;
  className?: string;
}

export interface StoredUserAccount extends User {
  password?: string;
  className?: string;
}

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null;
  isFirebaseConnected: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<boolean>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REGISTERED_USERS_KEY = 'smart_class_registered_users';

const DEFAULT_AVATARS: Record<UserRole, string> = {
  teacher: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  student: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  parent: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  admin: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // Default to Teacher (Cô Trần Thị Mai) so the app immediately shows rich teacher features
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smart_class_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEMO_USERS[1]; // Teacher
      }
    }
    return DEMO_USERS[1]; // Default to Teacher
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocPath = `users/${fbUser.uid}`;
          const userDocRef = doc(firestoreDb, 'users', fbUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userDocRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, userDocPath);
          }

          if (userSnap && userSnap.exists()) {
            const data = userSnap.data();
            const matchedUser: User = {
              id: fbUser.uid,
              name: data.name || fbUser.displayName || 'Giáo viên',
              email: data.email || fbUser.email || '',
              role: (data.role as UserRole) || 'teacher',
              avatar: data.avatar || fbUser.photoURL || DEFAULT_AVATARS[(data.role as UserRole) || 'teacher'],
              schoolName: data.schoolName || 'Trường THPT Chuyên Nguyễn Huệ'
            };
            setCurrentUser(matchedUser);
          } else {
            // New user registration in Firestore
            const assignedRole: UserRole = fbUser.email === 'thuytrangtonnu@gmail.com' ? 'admin' : 'teacher';
            const newUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Giáo viên',
              email: fbUser.email || '',
              role: assignedRole,
              avatar: fbUser.photoURL || DEFAULT_AVATARS[assignedRole],
              schoolName: 'Trường THPT Chuyên Nguyễn Huệ',
              createdAt: new Date().toISOString()
            };

            try {
              await setDoc(userDocRef, {
                ...newUser,
                updatedAt: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Could not write user profile to Firestore (using local session):', err);
            }
            setCurrentUser(newUser);
          }
        } catch (error) {
          console.warn('Error reading or syncing Firestore user profile:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('smart_class_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('smart_class_auth_user');
    }
  }, [currentUser]);

  // Load custom registered accounts from local storage
  const getRegisteredUsers = (): StoredUserAccount[] => {
    try {
      const data = localStorage.getItem(REGISTERED_USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const saveRegisteredUsers = (users: StoredUserAccount[]) => {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    } catch (err) {
      console.warn('Failed to save registered users to localStorage:', err);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const result = await signInWithGoogle();
      if (result.user) {
        setIsFirebaseConnected(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Google Firebase Login error:', err);
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = data.name.trim();
    const trimmedEmail = data.email.trim().toLowerCase();
    const trimmedPassword = data.password.trim();

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Họ và tên phải có ít nhất 2 ký tự.' };
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return { success: false, error: 'Email không hợp lệ. Vui lòng kiểm tra lại.' };
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      return { success: false, error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' };
    }

    // Check if email already registered in local repository
    const registeredList = getRegisteredUsers();
    if (registeredList.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập.' };
    }

    let uid = `usr-${Date.now()}`;
    const avatar = DEFAULT_AVATARS[data.role] || DEFAULT_AVATARS.teacher;
    const schoolName = data.schoolName?.trim() || 'Trường THPT Chuyên Nguyễn Huệ';

    // Attempt Firebase Auth creation
    try {
      const fbCred = await registerWithEmailPassword(trimmedEmail, trimmedPassword, trimmedName);
      if (fbCred.user) {
        uid = fbCred.user.uid;
      }
    } catch (fbError: unknown) {
      const err = fbError as { code?: string; message?: string };
      if (err.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Email này đã tồn tại trên tài khoản Firebase Auth. Vui lòng đăng nhập.' };
      }
      if (err.code === 'auth/weak-password') {
        return { success: false, error: 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu an toàn hơn.' };
      }
      if (err.code === 'auth/invalid-email') {
        return { success: false, error: 'Địa chỉ email không hợp lệ.' };
      }
      // If operation not allowed or network issue, proceed with local account creation
      console.warn('Firebase Auth register notice (using local storage fallback if needed):', err.message);
    }

    // Create the User profile
    const newUser: StoredUserAccount = {
      id: uid,
      name: trimmedName,
      email: trimmedEmail,
      role: data.role,
      avatar,
      phone: data.phone?.trim() || '',
      schoolName,
      className: data.className?.trim(),
      password: trimmedPassword,
      createdAt: new Date().toISOString()
    };

    // Save to local registered accounts
    registeredList.push(newUser);
    saveRegisteredUsers(registeredList);

    // Save to Firestore if authenticated or valid
    try {
      const userDocRef = doc(firestoreDb, 'users', uid);
      await setDoc(userDocRef, {
        id: uid,
        name: trimmedName,
        email: trimmedEmail,
        role: data.role,
        avatar,
        schoolName,
        createdAt: newUser.createdAt,
        updatedAt: new Date().toISOString()
      });
    } catch (fsErr) {
      console.warn('Firestore user doc sync notice (saved locally):', fsErr);
    }

    // Set as active logged-in user
    setCurrentUser(newUser);
    return { success: true };
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = (password || '').trim();

    // 1. Check local registered accounts
    const registeredList = getRegisteredUsers();
    const matchedAccount = registeredList.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (matchedAccount) {
      if (matchedAccount.password && trimmedPass && matchedAccount.password !== trimmedPass) {
        return { success: false, error: 'Mật khẩu không chính xác. Vui lòng thử lại.' };
      }
      setCurrentUser(matchedAccount);
      return { success: true };
    }

    // 2. Try Firebase Auth Email/Password
    if (trimmedPass) {
      try {
        const cred = await logInWithEmailPassword(trimmedEmail, trimmedPass);
        if (cred.user) {
          // onAuthStateChanged will handle updating state, but we can also set immediately
          return { success: true };
        }
      } catch (fbErr: unknown) {
        const err = fbErr as { code?: string; message?: string };
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          return { success: false, error: 'Mật khẩu không chính xác.' };
        }
        if (err.code === 'auth/user-not-found') {
          return { success: false, error: 'Tài khoản không tồn tại. Vui lòng đăng ký.' };
        }
      }
    }

    // 3. Check DEMO_USERS
    const matchedDemo = DEMO_USERS.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (matchedDemo) {
      setCurrentUser(matchedDemo);
      return { success: true };
    }

    // 4. Fallback for custom school email if valid format
    if (trimmedEmail.includes('@')) {
      const fallbackUser: User = {
        id: `usr-${Date.now()}`,
        name: trimmedEmail.split('@')[0],
        email: trimmedEmail,
        role: 'teacher',
        avatar: DEFAULT_AVATARS.teacher,
        schoolName: 'Trường THPT Chuyên Nguyễn Huệ'
      };
      setCurrentUser(fallbackUser);
      return { success: true };
    }

    return { success: false, error: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.' };
  };

  const logout = async (): Promise<void> => {
    try {
      await logOutFirebase();
    } catch (err) {
      console.error('Firebase logout error:', err);
    }
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  const switchDemoRole = (role: UserRole) => {
    const targetUser = DEMO_USERS.find((u) => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        firebaseUser,
        isFirebaseConnected,
        login,
        loginWithGoogle,
        register,
        logout,
        switchDemoRole,
        setUser: setCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
