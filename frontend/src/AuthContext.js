import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const AuthContext = createContext(null);
const KEY = "politicsai_user";

function setCookie(value) {
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  document.cookie = `${KEY}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie() {
  const match = document.cookie.match(new RegExp(`(^| )${KEY}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie() {
  document.cookie = `${KEY}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const cookie = getCookie();
      const local = localStorage.getItem(KEY);
      const saved = cookie || local;
      if (saved) setUser(JSON.parse(saved));
    } catch (_) {}
    setLoading(false);
  }, []);

  const saveUser = (userData) => {
    try {
      const str = JSON.stringify(userData);
      setCookie(str);
      localStorage.setItem(KEY, str);
      sessionStorage.setItem(KEY, str);
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
      deleteCookie();
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
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