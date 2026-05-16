import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import {
  clearWarmMemberCore,
  consumeWarmMemberCore,
  invalidateWarmMemberCore,
  peekWarmMemberCore,
  warmMemberCoreAccount,
} from '@/components/member/memberPrefetchWarm';
import {
  api,
  deviceUserIdDisplayFromProfile,
  type MemberAttendanceToday,
  type MemberDocumentsPayload,
  type MemberProfile,
  type Membership,
  type MembershipHistoryEntry,
} from '@/lib/api';

type Phase = 'idle' | 'loading' | 'ready';

type MemberPrefetchContextValue = {
  /**
   * Membership + payment history resolved (or failed). Use this to unblock Membership / Transactions /
   * Home ribbons — does not wait on profile, documents, or attendance.
   */
  accountReady: boolean;
  /** Full prefetch finished (includes attendance for the Attendance tab). */
  ready: boolean;
  loading: boolean;
  membership: Membership | null;
  payments: MembershipHistoryEntry[] | null;
  prefetchError: string | null;
  profile: MemberProfile | null;
  profileError: string | null;
  documents: MemberDocumentsPayload | null;
  documentsError: string | null;
  attendance: MemberAttendanceToday | null;
  attendanceError: string | null;
  refetch: () => Promise<void>;
};

const MemberPrefetchContext = createContext<MemberPrefetchContextValue | null>(null);

async function loadCoreAccount(token: string): Promise<{
  membership: Membership | null;
  payments: MembershipHistoryEntry[] | null;
  prefetchError: string | null;
}> {
  const warm = await consumeWarmMemberCore(token);
  return {
    membership: warm.membership,
    payments: warm.payments,
    prefetchError: warm.prefetchError,
  };
}

async function fetchFreshCoreAccount(token: string): Promise<{
  membership: Membership | null;
  payments: MembershipHistoryEntry[] | null;
  prefetchError: string | null;
}> {
  invalidateWarmMemberCore();
  warmMemberCoreAccount(token);
  return loadCoreAccount(token);
}

async function loadSecondaryBundle(token: string): Promise<{
  profile: MemberProfile | null;
  profileError: string | null;
  documents: MemberDocumentsPayload | null;
  documentsError: string | null;
  attendance: MemberAttendanceToday | null;
  attendanceError: string | null;
}> {
  const settled = await Promise.allSettled([
    api.memberProfile(token),
    api.documents(token),
    api.memberAttendanceToday(token),
  ]);

  let profile: MemberProfile | null = null;
  let profileError: string | null = null;
  if (settled[0].status === 'fulfilled') {
    profile = settled[0].value;
  } else {
    profileError =
      settled[0].reason instanceof Error ? settled[0].reason.message : 'Could not load profile.';
  }

  let documents: MemberDocumentsPayload | null = null;
  let documentsError: string | null = null;
  if (settled[1].status === 'fulfilled') {
    documents = settled[1].value;
  } else {
    documentsError =
      settled[1].reason instanceof Error ? settled[1].reason.message : 'Could not load documents.';
  }

  let attendance: MemberAttendanceToday | null = null;
  let attendanceError: string | null = null;
  if (settled[2].status === 'fulfilled') {
    attendance = settled[2].value;
  } else {
    attendanceError =
      settled[2].reason instanceof Error ? settled[2].reason.message : 'Could not load attendance.';
  }

  return { profile, profileError, documents, documentsError, attendance, attendanceError };
}

export function MemberPrefetchProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();

  const token = auth.status === 'signed_in' ? auth.token : null;
  const isStudent = auth.status === 'signed_in' && auth.user.role === 'student';

  const [accountReady, setAccountReady] = useState(false);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [payments, setPayments] = useState<MembershipHistoryEntry[] | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [documents, setDocuments] = useState<MemberDocumentsPayload | null>(null);
  const [attendance, setAttendance] = useState<MemberAttendanceToday | null>(null);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useLayoutEffect(() => {
    let cancelled = false;

    if (!token) {
      clearWarmMemberCore();
      setAccountReady(false);
      setMembership(null);
      setPayments(null);
      setProfile(null);
      setDocuments(null);
      setAttendance(null);
      setPrefetchError(null);
      setProfileError(null);
      setDocumentsError(null);
      setAttendanceError(null);
      setPhase('idle');
      return () => {
        cancelled = true;
      };
    }

    if (!isStudent) {
      setAccountReady(true);
      setMembership(null);
      setPayments(null);
      setProfile(null);
      setDocuments(null);
      setAttendance(null);
      setPrefetchError(null);
      setProfileError(null);
      setDocumentsError(null);
      setAttendanceError(null);
      setPhase('ready');
      return () => {
        cancelled = true;
      };
    }

    warmMemberCoreAccount(token);

    const peek = peekWarmMemberCore(token);
    if (peek) {
      setMembership(peek.membership);
      setPayments(peek.payments);
      setPrefetchError(peek.prefetchError);
      setAccountReady(true);
    } else {
      setAccountReady(false);
    }

    setPhase('loading');
    setPrefetchError(peek?.prefetchError ?? null);
    setProfileError(null);
    setDocumentsError(null);
    setAttendanceError(null);

    void (async () => {
      const core = await loadCoreAccount(token);
      if (cancelled) return;

      setMembership(core.membership);
      setPayments(core.payments);
      setPrefetchError(core.prefetchError);
      setAccountReady(true);

      const sec = await loadSecondaryBundle(token);
      if (cancelled) return;

      setProfile(sec.profile);
      setProfileError(sec.profileError);
      setDocuments(sec.documents);
      setDocumentsError(sec.documentsError);
      setAttendance(sec.attendance);
      setAttendanceError(sec.attendanceError);

      if (sec.profile && core.membership) {
        const d = deviceUserIdDisplayFromProfile(sec.profile);
        if (!core.membership.deviceUserId && d !== '—') {
          setMembership((prev) =>
            prev && !prev.deviceUserId ? { ...prev, deviceUserId: d } : prev,
          );
        }
      }

      setPhase('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [token, isStudent]);

  const refetch = useCallback(async () => {
    if (!token || !isStudent) return;

    const core = await fetchFreshCoreAccount(token);
    setMembership(core.membership);
    setPayments(core.payments);
    setPrefetchError(core.prefetchError);
    setAccountReady(true);

    const sec = await loadSecondaryBundle(token);
    setProfile(sec.profile);
    setProfileError(sec.profileError);
    setDocuments(sec.documents);
    setDocumentsError(sec.documentsError);
    setAttendance(sec.attendance);
    setAttendanceError(sec.attendanceError);

    if (sec.profile && core.membership) {
      const d = deviceUserIdDisplayFromProfile(sec.profile);
      if (!core.membership.deviceUserId && d !== '—') {
        setMembership((prev) => (prev && !prev.deviceUserId ? { ...prev, deviceUserId: d } : prev));
      }
    }
    setPhase('ready');
  }, [token, isStudent]);

  const value = useMemo<MemberPrefetchContextValue>(
    () => ({
      accountReady,
      ready: phase === 'ready',
      loading: phase === 'loading' || (phase === 'idle' && !!token && isStudent),
      membership,
      payments,
      prefetchError,
      profile,
      profileError,
      documents,
      documentsError,
      attendance,
      attendanceError,
      refetch,
    }),
    [
      accountReady,
      phase,
      token,
      isStudent,
      membership,
      payments,
      prefetchError,
      profile,
      profileError,
      documents,
      documentsError,
      attendance,
      attendanceError,
      refetch,
    ],
  );

  return <MemberPrefetchContext.Provider value={value}>{children}</MemberPrefetchContext.Provider>;
}

export function useMemberPrefetch(): MemberPrefetchContextValue {
  const ctx = useContext(MemberPrefetchContext);
  if (!ctx) throw new Error('useMemberPrefetch must be used inside MemberPrefetchProvider');
  return ctx;
}
