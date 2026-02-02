"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api";
import { AuthUser, ThaiDVerifyResponse, OfficialLoginRequest } from "../../../shared/src/types/auth";
import { useRouter } from "next/navigation";

interface VoterLoginResponse {
  data: {
    user: AuthUser;
    thaidInfo: ThaiDVerifyResponse;
    token: string;
  };
}

interface OfficialLoginResponse {
  data: {
    user: AuthUser;
    token: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  thaidInfo: ThaiDVerifyResponse | null;
  isLoading: boolean;
  voterLogin: (citizenId: string) => Promise<void>;
  officialLogin: (data: OfficialLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [thaidInfo, setThaidInfo] = useState<ThaiDVerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("auth_token");
    
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    
    try {
      const userData = await apiRequest<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` } as HeadersInit
      });
      
      if (userData && userData.id) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      localStorage.removeItem("auth_token");
    } finally {
      setIsLoading(false);
    }
  };

  const voterLogin = async (citizenId: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<VoterLoginResponse>("/auth/voter/login", {
        data: { citizenId },
      });
      
      const { user, thaidInfo, token } = response.data;
      
      localStorage.setItem("auth_token", token);
      document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;
      
      setUser(user);
      setThaidInfo(thaidInfo);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const officialLogin = async (data: OfficialLoginRequest) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<OfficialLoginResponse>("/auth/official/login", {
        data,
      });

      const { user, token } = response.data;
      
      localStorage.setItem("auth_token", token);
      document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;

      setUser(user);
      router.push("/admin");
    } catch (error) {
      console.error("Official Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await apiRequest("/auth/logout", { 
        method: "POST", 
        headers: headers as HeadersInit
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setThaidInfo(null);
      localStorage.removeItem("auth_token");
      document.cookie = "auth_token=; path=/; max-age=0";
      router.push("/login");
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, thaidInfo, isLoading, voterLogin, officialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
