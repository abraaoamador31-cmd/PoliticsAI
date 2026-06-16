import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("politicsai_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const userData = res.data;
    setUser(userData);
    localStorage.setItem("politicsai_user", JSON.stringify(userData));
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    return res.data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("politicsai_user");
  };

  const updateSearchCount = () => {
    if (!user) return;
    const updated = { ...user, searches_this_month: (user.searches_this_month || 0) + 1 };
    setUser(updated);
    localStorage.setItem("politicsai_user", JSON.stringify(updated));
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