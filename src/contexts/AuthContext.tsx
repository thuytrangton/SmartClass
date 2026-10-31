import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../data/mockData';
import {
  auth,
  db as firestoreDb,
  signInWithGoogle,
  logOutFirebase,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null;
  isFirebaseConnected: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
              avatar: data.avatar || fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
              avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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

  const login = async (email: string): Promise<boolean> => {
    // Find matching user from DEMO_USERS or create teacher session
    const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setCurrentUser(matched);
      return true;
    }
    // Fallback: create mock teacher login if user typed another email
    const fallbackUser: User = {
      id: `usr-${Date.now()}`,
      name: email.split('@')[0],
      email,
      role: 'teacher',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Trường THPT Chuyên Nguyễn Huệ'
    };
    setCurrentUser(fallbackUser);
    return true;
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
