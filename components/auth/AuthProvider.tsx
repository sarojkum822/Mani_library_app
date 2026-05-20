import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';

import { AuthNoticeBanner, type AuthNotice } from '@/components/auth/AuthNoticeBanner';
import { clearWarmMemberCore, warmMemberCoreAccount, warmMemberProfile } from '@/components/member/memberPrefetchWarm';
import { api, clearApiGetCache, type ApiUser } from '@/lib/api';
import { clearDataCache } from '@/lib/dataCache';
import { clearPendingSignup, loadPendingSignup } from '@/lib/signupVerification';
import { clearRole, clearToken, getRole, getToken, setRole, setToken } from '@/lib/storage';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; token: string; user: ApiUser };

type EstablishSessionOptions = {
  /** Skip default navigation (caller shows notice first). */
  silent?: boolean;
};

type AuthContextValue = {
  auth: AuthState;
  signIn: (args: { emailOrPhone: string; passwordOrOtp: string }) => Promise<void>;
  establishSession: (token: string, user: ApiUser, opts?: EstablishSessionOptions) => Promise<void>;
  signOut: () => Promise<void>;
  showAuthNotice: (notice: AuthNotice) => void;
  /** After signup: poll login until email is confirmed, then sign in + welcome banner. */
  tryCompletePendingVerification: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const storedRole = await getRole();
        if (token) {
          warmMemberCoreAccount(token);
          warmMemberProfile(token);
          try {
            const user = await api.me(token);
            const role = user.role;
            await setRole(role);
            if (!cancelled) setAuth({ status: 'signed_in', token, user });
          } catch {
            await clearToken();
            await clearRole();
            if (!cancelled) setAuth({ status: 'signed_out' });
          }
        } else {
          if (storedRole) await clearRole();
          if (!cancelled) setAuth({ status: 'signed_out' });
        }
      } catch {
        await clearToken();
        await clearRole();
        if (!cancelled) setAuth({ status: 'signed_out' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const establishSession = useCallback(async (token: string, user: ApiUser, opts?: EstablishSessionOptions) => {
    warmMemberCoreAccount(token);
    if (user.role === 'student') warmMemberProfile(token);
    const verified = await api.me(token);
    const expect = (user.email ?? '').trim().toLowerCase();
    const got = (verified.email ?? '').trim().toLowerCase();
    if (expect && got !== expect) {
      await clearToken();
      await clearRole();
      setAuth({ status: 'signed_out' });
      throw new Error('Session email does not match your new account. Try signing in manually.');
    }
    await setToken(token);
    await setRole(verified.role);
    setAuth({ status: 'signed_in', token, user: verified });
    if (!opts?.silent) {
      router.replace(verified.role === 'admin' ? '/(admin)' : '/(student)');
    } else {
      router.replace(verified.role === 'admin' ? '/(admin)' : '/(student)');
    }
  }, []);

  const tryCompletePendingVerification = useCallback(async () => {
    const pending = await loadPendingSignup();
    if (!pending) return false;
    try {
      const res = await api.login({
        emailOrPhone: pending.email,
        passwordOrOtp: pending.password,
      });
      await clearPendingSignup();
      const first = res.user.name?.split(/\s+/)[0];
      await establishSession(res.token, res.user, { silent: true });
      setNotice({
        title: 'Email verified',
        body: first ? `Welcome, ${first}!` : 'Welcome to Mani Library!',
      });
      return true;
    } catch {
      return false;
    }
  }, [establishSession]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      auth,
      showAuthNotice: setNotice,
      tryCompletePendingVerification,
      async signIn({ emailOrPhone, passwordOrOtp }) {
        const expectedEmail = emailOrPhone.trim().toLowerCase();
        if (!expectedEmail.includes('@')) {
          throw new Error('Use the email address on your library account.');
        }
        const res = await api.login({ emailOrPhone, passwordOrOtp });
        warmMemberCoreAccount(res.token);
        warmMemberProfile(res.token);
        const verified = await api.me(res.token);
        const got = (verified.email ?? '').trim().toLowerCase();
        if (got !== expectedEmail) {
          await clearToken();
          await clearRole();
          setAuth({ status: 'signed_out' });
          throw new Error(
            'The server session does not match the email you typed. Sign out everywhere, clear app data if needed, and try again — or check EXPO_PUBLIC_API_BASE_URL points at the correct site.',
          );
        }
        await clearPendingSignup();
        await setToken(res.token);
        await setRole(verified.role);
        setAuth({ status: 'signed_in', token: res.token, user: verified });
        router.replace(verified.role === 'admin' ? '/(admin)' : '/(student)');
      },
      establishSession,
      async signOut() {
        clearWarmMemberCore();
        clearApiGetCache();
        clearDataCache();
        await clearPendingSignup();
        await clearToken();
        await clearRole();
        setAuth({ status: 'signed_out' });
        router.replace('/(student)');
      },
    };
  }, [auth, establishSession, tryCompletePendingVerification]);

  return (
    <AuthContext.Provider value={value}>
      <AuthNoticeBanner notice={notice} onDismiss={() => setNotice(null)} />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
