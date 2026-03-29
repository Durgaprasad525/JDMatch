import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [user, setUser] = useState(null);
  const [hrUser, setHrUser] = useState(null);
  const prevUserIdRef = useRef(null);

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
      prevUserIdRef.current = session?.user?.id ?? null;
      fetchHrUser(session?.access_token ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id ?? null;

      // If user changed (sign-out, sign-in as different user), clear ALL cached data
      if (prevUserIdRef.current !== newUserId) {
        queryClient.clear(); // wipe entire react-query cache
        prevUserIdRef.current = newUserId;
        setSession(session);
        setUser(session?.user ?? null);
        fetchHrUser(session?.access_token ?? null);
        return;
      }
      prevUserIdRef.current = newUserId;

      // Only refresh session/user state, skip re-fetching hrUser on token refreshes
      setSession(session);
      setUser(session?.user ?? null);

      // Only fetch hrUser on actual sign-in, not token refreshes
      if (event === 'SIGNED_IN') {
        fetchHrUser(session?.access_token ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchHrUser]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    queryClient.clear(); // clear all cached queries on sign-out
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
