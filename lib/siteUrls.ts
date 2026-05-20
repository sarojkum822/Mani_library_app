const DEFAULT_SITE = 'https://www.manilibrary.com';

export function siteBaseUrl(): string {
  const raw = typeof process.env.EXPO_PUBLIC_API_BASE_URL === 'string' ? process.env.EXPO_PUBLIC_API_BASE_URL.trim() : '';
  return (raw || DEFAULT_SITE).replace(/\/+$/, '');
}

export function forgotPasswordUrl(): string {
  return `${siteBaseUrl()}/forgot-password`;
}
