import { Platform } from 'react-native';

import { isExpoGoClient } from '@/lib/isExpoGo';
import { openRazorpayCheckoutViaBridge, type RazorpaySuccessPayload } from '@/lib/razorpayCheckoutBridge';

export type { RazorpaySuccessPayload };

function isNativeModuleMissingError(message: string): boolean {
  return (
    message.includes('Native module') ||
    message.includes('Cannot find module') ||
    message.includes('Invariant Violation') ||
    message.includes("doesn't exist") ||
    message.includes('not available in this build') ||
    message.includes('Expo Go cannot run Razorpay')
  );
}

type NativeRazorpay = {
  open: (o: Record<string, unknown>) => Promise<RazorpaySuccessPayload>;
};

function loadNativeRazorpay(): NativeRazorpay | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-razorpay').default as NativeRazorpay;
  } catch {
    return null;
  }
}

async function openNativeRazorpayCheckout(options: Record<string, unknown>): Promise<RazorpaySuccessPayload> {
  const RazorpayCheckout = loadNativeRazorpay();
  if (!RazorpayCheckout) {
    throw new Error('Native Razorpay module is not linked in this build.');
  }
  const data = await RazorpayCheckout.open(options);
  if (!data?.razorpay_payment_id || !data?.razorpay_order_id || !data?.razorpay_signature) {
    throw new Error('Razorpay returned an incomplete success payload.');
  }
  return data;
}

/**
 * Opens Razorpay Standard Checkout.
 *
 * **Server (your API base URL):** `create-order` returns `keyId`, `orderId`, `amount` — that only
 * prepares the payment. It does not install Razorpay on the phone.
 *
 * **Client:** Expo Go has no `react-native-razorpay` native code → we use in-app WebView checkout.
 * Dev/production builds with the native module linked use the native modal when available.
 */
export async function openRazorpayCheckout(options: Record<string, unknown>): Promise<RazorpaySuccessPayload> {
  if (Platform.OS === 'web') {
    throw new Error('Razorpay checkout is not supported on web in this app. Use iOS or Android.');
  }

  const webOptions: Record<string, unknown> = {
    ...options,
    amount: typeof options.amount === 'string' ? Number(options.amount) : options.amount,
  };

  if (isExpoGoClient()) {
    return openRazorpayCheckoutViaBridge(webOptions);
  }

  try {
    return await openNativeRazorpayCheckout(webOptions);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isNativeModuleMissingError(msg)) {
      return openRazorpayCheckoutViaBridge(webOptions);
    }
    throw e instanceof Error ? e : new Error(msg);
  }
}
