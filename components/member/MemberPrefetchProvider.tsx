import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import {
  clearWarmMemberCore,
  consumeWarmMemberCore,
  consumeWarmMemberProfile,
  invalidateWarmMemberCore,
  peekWarmMemberCore,
  warmMemberCoreAccount,
  warmMemberProfile,
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
import { cacheKeys, getDataCache, invalidateDataCacheKey, setDataCache } from '@/lib/dataCache';

type Phase = 'idle' | 'loading' | 'ready';

type MemberPrefetchContextValue = {
  /** True once signed-in student may use member screens (shell-first; does not wait on API). */
  accountReady: boolean;
  /** Full prefetch finished (includes attendance for the Attendance tab). */
  ready: boolean;
  /** Core membership + payments still loading on first open. */
  loading: boolean;
  /** Profile row still loading (documents/attendance may continue in background). */
  profileLoading: boolean;
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

async function loadProfile(token: string): Promise<{
  profile: MemberProfile | null;
  profileError: string | null;
}> {
  const cached = getDataCache<MemberProfile>(cacheKeys.memberProfile);
  try {
    const warm = await consumeWarmMemberProfile(token);
    if (warm) return { profile: warm, profileError: null };
    const profile = await api.memberProfile(token);
    return { profile, profileError: null };
  } catch (e) {
    if (cached) return { profile: cached, profileError: null };
    return {
      profile: null,
      profileError: e instanceof Error ? e.message : 'Could not load profile.',
    };
  }
}

async function loadDeferredBundle(token: string): Promise<{
  documents: MemberDocumentsPayload | null;
  documentsError: string | null;
  attendance: MemberAttendanceToday | null;
  attendanceError: string | null;
}> {
  const settled = await Promise.allSettled([api.documents(token), api.memberAttendanceToday(token)]);

  let documents: MemberDocumentsPayload | null = null;
  let documentsError: string | null = null;
  if (settled[0].status === 'fulfilled') {
    documents = settled[0].value;
  } else {
    documentsError =
      settled[0].reason instanceof Error ? settled[0].reason.message : 'Could not load documents.';
  }

  let attendance: MemberAttendanceToday | null = null;
  let attendanceError: string | null = null;
  if (settled[1].status === 'fulfilled') {
    attendance = settled[1].value;
  } else {
    attendanceError =
      settled[1].reason instanceof Error ? settled[1].reason.message : 'Could not load attendance.';
  }

  return { documents, documentsError, attendance, attendanceError };
}

function mergeDeviceIdOnMembership(
  membership: Membership | null,
  profile: MemberProfile | null,
): Membership | null {
  if (!membership || !profile) return membership;
  const d = deviceUserIdDisplayFromProfile(profile);
  if (!membership.deviceUserId && d !== '—') {
    return { ...membership, deviceUserId: d };
  }
  return membership;
}

export function MemberPrefetchProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();

  const token = auth.status === 'signed_in' ? auth.token : null;
  const isStudent = auth.status === 'signed_in' && auth.user.role === 'student';

  const [accountReady, setAccountReady] = useState(false);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [payments, setPayments] = useState<MembershipHistoryEntry[] | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(() =>
    getDataCache<MemberProfile>(cacheKeys.memberProfile),
  );
  const [documents, setDocuments] = useState<MemberDocumentsPayload | null>(() =>
    getDataCache<MemberDocumentsPayload>(cacheKeys.memberDocuments),
  );
  const [attendance, setAttendance] = useState<MemberAttendanceToday | null>(null);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [profileLoading, setProfileLoading] = useState(false);

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
      setProfileLoading(false);
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
      setProfileLoading(false);
      return () => {
        cancelled = true;
      };
    }

    warmMemberCoreAccount(token);
    warmMemberProfile(token);

    setAccountReady(true);

    const peek = peekWarmMemberCore(token);
    if (peek) {
      setMembership(peek.membership);
      setPayments(peek.payments);
      setPrefetchError(peek.prefetchError);
    }

    setPhase('loading');
    setProfileLoading(!getDataCache<MemberProfile>(cacheKeys.memberProfile));
    setPrefetchError(peek?.prefetchError ?? null);
    setProfileError(null);
    setDocumentsError(null);
    setAttendanceError(null);

    void (async () => {
      const coreP = loadCoreAccount(token);
      const profileP = loadProfile(token);

      const core = await coreP;
      if (cancelled) return;

      setMembership(core.membership);
      setPayments(core.payments);
      setPrefetchError(core.prefetchError);
      setAccountReady(true);

      const prof = await profileP;
      if (cancelled) return;

      setProfile(prof.profile);
      setProfileError(prof.profileError);
      setProfileLoading(false);
      if (prof.profile) setDataCache(cacheKeys.memberProfile, prof.profile);
      setMembership((prev) => mergeDeviceIdOnMembership(prev, prof.profile));
      setPhase('ready');

      void loadDeferredBundle(token).then((deferred) => {
        if (cancelled) return;
        setDocuments(deferred.documents);
        setDocumentsError(deferred.documentsError);
        setAttendance(deferred.attendance);
        setAttendanceError(deferred.attendanceError);
        if (deferred.documents) setDataCache(cacheKeys.memberDocuments, deferred.documents);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [token, isStudent]);

  const refetch = useCallback(async () => {
    if (!token || !isStudent) return;

    invalidateDataCacheKey(cacheKeys.memberProfile);
    setProfileLoading(true);

    const coreP = fetchFreshCoreAccount(token);
    const profileP = loadProfile(token);

    const core = await coreP;
    setMembership(core.membership);
    setPayments(core.payments);
    setPrefetchError(core.prefetchError);
    setAccountReady(true);

    const prof = await profileP;
    setProfile(prof.profile);
    setProfileError(prof.profileError);
    setProfileLoading(false);
    if (prof.profile) setDataCache(cacheKeys.memberProfile, prof.profile);
    setMembership((prev) => mergeDeviceIdOnMembership(prev, prof.profile));

    setPhase('ready');
    const deferred = await loadDeferredBundle(token);
    setDocuments(deferred.documents);
    setDocumentsError(deferred.documentsError);
    setAttendance(deferred.attendance);
    setAttendanceError(deferred.attendanceError);
    if (deferred.documents) setDataCache(cacheKeys.memberDocuments, deferred.documents);
  }, [token, isStudent]);

  const value = useMemo<MemberPrefetchContextValue>(
    () => ({
      accountReady,
      ready: phase === 'ready',
      loading: isStudent && (phase === 'loading' || (phase === 'idle' && !!token)),
      profileLoading,
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
      profileLoading,
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
