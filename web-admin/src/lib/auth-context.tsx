import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "student" | "faculty" | "admin";

export interface User {
  id: number;
  user_id: string;
  name: string;
  role: UserRole;
  department?: string;
  department_id?: number;
  email?: string;
  phone?: string;
  photo_url?: string;
  batch?: string;
  semester?: string;
  section?: string;
  admission_no?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("icms_token"));

  useEffect(() => {
    if (token) fetchMe(token);
  }, []);

  const fetchMe = async (t: string) => {
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem("icms_token");
        setToken(null);
      }
    } catch {
      localStorage.removeItem("icms_token");
      setToken(null);
    }
  };

  const login = async (userId: string, password: string) => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, error: data.message || "Login failed" };
      localStorage.setItem("icms_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Cannot connect to server. Is backend running?" };
    }
  };

  const logout = () => {
    localStorage.removeItem("icms_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
