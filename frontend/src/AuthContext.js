import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

const STORAGE_KEY = "politicsai_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch (_) {}
    setLoading(false);
  }, []);

  const saveUser = (userData) => {
    try {
      const str = JSON.stringify(userData);
      localStorage.setItem(STORAGE_KEY, str);
      sessionStorage.setItem(STORAGE_KEY, str);
    } catch (_) {}
  };

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const userData = res.data;
    setUser(userData);
    saveUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    return res.data;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  };

  const updateSearchCount = () => {
    if (!user) return;
    const updated = { ...user, searches_this_month: (user.searches_this_month || 0) + 1 };
    setUser(updated);
    saveUser(updated);
  };

  const canSearch = () => {
    if (!user) return false;
    if (user.is_pro) return true;
    return (user.searches_this_month || 0) < 3;
  };

  const searchesLeft = () => {
    if (!user) return 0;
    if (user.is_pro) return Infinity;
    return Math.max(0, 3 - (user.searches_this_month || 0));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateSearchCount, canSearch, searchesLeft }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}