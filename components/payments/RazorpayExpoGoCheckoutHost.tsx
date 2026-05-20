import React, { useEffect, useState } from 'react';

import { RazorpayCheckoutStub } from '@/components/payments/RazorpayCheckoutStub';
import { isExpoGoClient } from '@/lib/isExpoGo';

/**
 * Razorpay checkout host: stub in Expo Go (no WebView native module), WebView modal in dev builds.
 */
export function RazorpayExpoGoCheckoutHost() {
  const expoGo = isExpoGoClient();
  const [WebHost, setWebHost] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (expoGo) return;
    let cancelled = false;
    import('@/components/payments/RazorpayWebViewCheckoutHost')
      .then((m) => {
        if (!cancelled) setWebHost(() => m.RazorpayWebViewCheckoutHost);
      })
      .catch(() => {
        if (!cancelled) setWebHost(null);
      });
    return () => {
      cancelled = true;
    };
  }, [expoGo]);

  if (expoGo) {
    return <RazorpayCheckoutStub />;
  }

  if (!WebHost) {
    return null;
  }

  return <WebHost />;
}
