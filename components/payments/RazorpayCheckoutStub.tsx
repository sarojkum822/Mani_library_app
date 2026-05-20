import { useEffect } from 'react';

import { registerRazorpayCheckoutHost } from '@/lib/razorpayCheckoutBridge';

const EXPO_GO_PAYMENT_MSG =
  'Payments need a development build. From student-app run: npx expo run:ios (or run:android). Expo Go cannot open Razorpay checkout.';

/** Expo Go: register bridge handler only — never load react-native-webview. */
export function RazorpayCheckoutStub() {
  useEffect(() => {
    registerRazorpayCheckoutHost(() => Promise.reject(new Error(EXPO_GO_PAYMENT_MSG)));
    return () => registerRazorpayCheckoutHost(null);
  }, []);

  return null;
}
