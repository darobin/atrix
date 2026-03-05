import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const BSKY_API = 'https://public.api.bsky.app/xrpc';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        if (data?.did) {
          try {
            const profile = await fetch(`${BSKY_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(data.did)}`)
              .then(r => r.ok ? r.json() : null);
            if (profile) {
              data = { ...data, displayName: profile.displayName, avatar: profile.avatar };
            }
          } catch { /* non-fatal */ }
        }
        setUser(data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function login(handle) {
    window.location.href = `/auth/login?handle=${encodeURIComponent(handle)}`;
  }

  async function logout() {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
