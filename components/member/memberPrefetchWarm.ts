import {
  api,
  type MemberProfile,
  type Membership,
  type MembershipHistoryEntry,
} from '@/lib/api';
import { cacheKeys, getDataCache, setDataCache } from '@/lib/dataCache';

type WarmCore = {
  token: string;
  membership: Membership | null;
  payments: MembershipHistoryEntry[] | null;
  prefetchError: string | null;
};

let inflight: Promise<WarmCore> | null = null;
let inflightToken: string | null = null;
let cached: WarmCore | null = null;

async function fetchCore(token: string): Promise<WarmCore> {
  const settled = await Promise.allSettled([api.membership(token), api.membershipHistory(token)]);

  let membership: Membership | null = null;
  let payments: MembershipHistoryEntry[] | null = null;
  let prefetchError: string | null = null;

  if (settled[0].status === 'fulfilled') {
    membership = settled[0].value;
  } else {
    prefetchError =
      settled[0].reason instanceof Error ? settled[0].reason.message : 'Could not load account data.';
  }

  if (settled[1].status === 'fulfilled') {
    payments = settled[1].value;
  } else {
    payments = [];
    if (!prefetchError) {
      prefetchError =
        settled[1].reason instanceof Error ? settled[1].reason.message : 'Could not load payments.';
    }
  }

  return { token, membership, payments, prefetchError };
}

/** Start membership + payments fetch as early as possible (e.g. while `api.me` runs on app open). */
export function warmMemberCoreAccount(token: string): void {
  if (cached?.token === token) return;
  if (inflight && inflightToken === token) return;

  inflightToken = token;
  inflight = fetchCore(token).then((r) => {
    cached = r;
    inflight = null;
    return r;
  });
}

/** Read warm core data if it matches the session token. */
export function peekWarmMemberCore(token: string): WarmCore | null {
  if (cached?.token === token) return cached;
  return null;
}

/** Await in-flight or cached core fetch for this token. */
export async function consumeWarmMemberCore(token: string): Promise<WarmCore> {
  if (cached?.token === token) return cached;
  if (inflight && inflightToken === token) return inflight;
  warmMemberCoreAccount(token);
  return inflight!;
}

export function clearWarmMemberCore(): void {
  cached = null;
  inflight = null;
  inflightToken = null;
}

/** Drop cached core data so the next fetch hits the network (pull-to-refresh, after payment). */
export function invalidateWarmMemberCore(): void {
  cached = null;
}

let profileInflight: Promise<MemberProfile | null> | null = null;
let profileInflightToken: string | null = null;

/** Start member profile fetch early (parallel with membership warm). */
export function warmMemberProfile(token: string): void {
  if (getDataCache<MemberProfile>(cacheKeys.memberProfile)) return;
  if (profileInflight && profileInflightToken === token) return;
  profileInflightToken = token;
  profileInflight = api
    .memberProfile(token)
    .then((p) => {
      setDataCache(cacheKeys.memberProfile, p);
      return p;
    })
    .catch(() => null)
    .finally(() => {
      profileInflight = null;
    });
}

export function peekWarmMemberProfile(): MemberProfile | null {
  return getDataCache<MemberProfile>(cacheKeys.memberProfile);
}

export async function consumeWarmMemberProfile(token: string): Promise<MemberProfile | null> {
  const cached = peekWarmMemberProfile();
  if (cached) return cached;
  if (profileInflight && profileInflightToken === token) return profileInflight;
  warmMemberProfile(token);
  return profileInflight ?? null;
}
