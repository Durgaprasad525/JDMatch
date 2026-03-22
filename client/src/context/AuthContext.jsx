import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [user, setUser] = useState(null);
  const [hrUser, setHrUser] = useState(null);

  // Fetch HR user profile from our DB after session is confirmed
  const fetchHrUser = useCallback(async (accessToken) => {
    if (!accessToken) { setHrUser(null); return; }
    try {
      const res = await fetch('/api/trpc/auth.me?batch=1&input=%7B%7D', {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) { setHrUser(null); return; }
      const json = await res.json();
      const profile = json?.[0]?.result?.data;
      setHrUser(profile ?? null);
    } catch {
      setHrUser(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchHrUser(session?.access_token ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchHrUser(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, [fetchHrUser]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setHrUser(null);
  };

  const value = {
    session,
    user,
    hrUser,
    isLoading: session === undefined,
    isAuthenticated: !!session,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
