export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type CheckoutHost = (options: Record<string, unknown>) => Promise<RazorpaySuccessPayload>;

let host: CheckoutHost | null = null;

export function registerRazorpayCheckoutHost(next: CheckoutHost | null) {
  host = next;
}

export async function openRazorpayCheckoutViaBridge(
  options: Record<string, unknown>,
): Promise<RazorpaySuccessPayload> {
  if (!host) {
    throw new Error('Payment is still loading. Wait a moment and tap Pay again.');
  }
  return host(options);
}
