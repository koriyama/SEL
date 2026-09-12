// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase, getSession } from '../lib/supabaseClient';
import { institutionalIdToEmail } from '../lib/lmsApi';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      return null;
    }
    setProfile(data || null);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async (authUser) => {
      if (cancelled) return;
      setUser(authUser);
      if (authUser) {
        await fetchProfile(authUser);
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    };

    (async () => {
      try {
        const session = await getSession();
        await load(session?.user ?? null);
      } catch (err) {
        console.error('Failed to get session:', err);
        await load(null);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setLoading(true);
        load(session?.user ?? null);
      }
    );

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    return await fetchProfile(user);
  }, [user, fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const loginStudent = async (institutionalId, password) => {
    const email = institutionalIdToEmail(institutionalId);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signup = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName?.trim() || email.split('@')[0],
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  // Derived convenience values
  const role = profile?.role ?? (user ? 'teacher' : null);
  const displayName = profile?.display_name ?? user?.email ?? '';
  const institutionalId = profile?.institutional_id ?? null;
  const mustChangePassword = profile?.must_change_password ?? false;

  const value = {
    user,
    profile,
    role,
    displayName,
    institutionalId,
    mustChangePassword,
    loading,
    refreshProfile,
    login,
    loginStudent,
    signup,
    logout,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};