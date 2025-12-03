// src/contexts/AuthContext.tsx
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from "react";
  import { onAuthStateChanged, signOut, type User } from "firebase/auth";
  import { auth } from "../firebase";
  
  type AuthContextValue = {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextValue | undefined>(undefined);
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const unsub = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
      return unsub;
    }, []);
  
    const logout = async () => {
      await signOut(auth);
    };
  
    return (
      <AuthContext.Provider value={{ user, loading, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }
  
 // eslint-disable-next-line react-refresh/only-export-components
  export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
  }
  