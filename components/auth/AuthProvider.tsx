import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';

import { clearWarmMemberCore, warmMemberCoreAccount } from '@/components/member/memberPrefetchWarm';
import { api, clearApiGetCache, type ApiUser } from '@/lib/api';
import { clearDataCache } from '@/lib/dataCache';
import { clearRole, clearToken, getRole, getToken, setRole, setToken } from '@/lib/storage';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; token: string; user: ApiUser };

type AuthContextValue = {
  auth: AuthState;
  signIn: (args: { emailOrPhone: string; passwordOrOtp: string }) => Promise<void>;
  /** After sign-up when the server returns a session (email confirmation off). */
  establishSession: (token: string, user: ApiUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const storedRole = await getRole();
        if (token) {
          warmMemberCoreAccount(token);
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

  const value = useMemo<AuthContextValue>(() => {
    return {
      auth,
      async signIn({ emailOrPhone, passwordOrOtp }) {
        const expectedEmail = emailOrPhone.trim().toLowerCase();
        if (!expectedEmail.includes('@')) {
          throw new Error('Use the email address on your library account.');
        }
        const res = await api.login({ emailOrPhone, passwordOrOtp });
        warmMemberCoreAccount(res.token);
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
        await setToken(res.token);
        await setRole(verified.role);
        setAuth({ status: 'signed_in', token: res.token, user: verified });
        router.replace(verified.role === 'admin' ? '/(admin)' : '/(student)');
      },
      async establishSession(token: string, user: ApiUser) {
        warmMemberCoreAccount(token);
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
        router.replace(verified.role === 'admin' ? '/(admin)' : '/(student)');
      },
      async signOut() {
        clearWarmMemberCore();
        clearApiGetCache();
        clearDataCache();
        await clearToken();
        await clearRole();
        setAuth({ status: 'signed_out' });
        router.replace('/(student)');
      },
    };
  }, [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
