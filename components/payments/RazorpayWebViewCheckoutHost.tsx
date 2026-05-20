import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { registerRazorpayCheckoutHost } from '@/lib/razorpayCheckoutBridge';
import type { RazorpaySuccessPayload } from '@/lib/razorpayCheckoutBridge';

function buildCheckoutHtml(options: Record<string, unknown>): string {
  const webOptions: Record<string, unknown> = { ...options };
  if (typeof webOptions.amount === 'string') {
    webOptions.amount = Number(webOptions.amount);
  }
  const serialized = JSON.stringify(webOptions).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; background: #fff; min-height: 100vh; }
    #status { font-family: -apple-system, system-ui, sans-serif; padding: 24px; text-align: center; color: #344054; font-size: 15px; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div id="status">Opening secure payment…</div>
  <script>
    (function () {
      function post(obj) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(obj));
        }
      }
      try {
        var options = ${serialized};
        options.handler = function (response) {
          post({ ok: true, data: response });
        };
        options.modal = {
          ondismiss: function () {
            post({ ok: false, code: 'dismissed', message: 'Payment closed.' });
          },
        };
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          var d = (resp && resp.error && resp.error.description) || 'Payment failed.';
          post({ ok: false, code: 'failed', message: d });
        });
        document.getElementById('status').textContent = '';
        rzp.open();
      } catch (e) {
        post({ ok: false, code: 'init', message: e && e.message ? e.message : 'Could not start checkout.' });
      }
    })();
  </script>
</body>
</html>`;
}

function normalizeSuccess(data: unknown): RazorpaySuccessPayload {
  const r = data as Record<string, unknown>;
  const razorpay_payment_id = String(r.razorpay_payment_id ?? '');
  const razorpay_order_id = String(r.razorpay_order_id ?? '');
  const razorpay_signature = String(r.razorpay_signature ?? '');
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    throw new Error('Razorpay returned an incomplete success payload.');
  }
  return { razorpay_payment_id, razorpay_order_id, razorpay_signature };
}

/** Development / production builds with react-native-webview linked. */
export function RazorpayWebViewCheckoutHost() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const resolveRef = useRef<((v: RazorpaySuccessPayload) => void) | null>(null);
  const rejectRef = useRef<((e: Error) => void) | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    setHtml(null);
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  const openCheckout = useCallback((options: Record<string, unknown>) => {
    return new Promise<RazorpaySuccessPayload>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      setHtml(buildCheckoutHtml(options));
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    registerRazorpayCheckoutHost(openCheckout);
    return () => registerRazorpayCheckoutHost(null);
  }, [openCheckout]);

  const finish = useCallback(
    (fn: () => void) => {
      fn();
      close();
    },
    [close],
  );

  const onMessage = useCallback(
    (raw: string) => {
      try {
        const payload = JSON.parse(raw) as {
          ok?: boolean;
          data?: unknown;
          message?: string;
        };
        if (payload.ok && payload.data) {
          const success = normalizeSuccess(payload.data);
          finish(() => resolveRef.current?.(success));
          return;
        }
        finish(() => rejectRef.current?.(new Error(payload.message ?? 'Payment was not completed.')));
      } catch {
        finish(() => rejectRef.current?.(new Error('Invalid response from payment page.')));
      }
    },
    [finish],
  );

  const cancel = useCallback(() => {
    finish(() => rejectRef.current?.(new Error('Payment cancelled.')));
  }, [finish]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cancel}>
      <SafeAreaView style={[styles.shell, { backgroundColor: c.surface }]}>
        <View style={[styles.bar, { borderBottomColor: c.border }]}>
          <Text style={[styles.barTitle, { color: c.ink900 }]}>Complete payment</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close payment"
            onPress={cancel}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.closeText, { color: c.azure600 }]}>Close</Text>
          </Pressable>
        </View>
        {html ? (
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://manilibrary.com' }}
            onMessage={(e) => onMessage(e.nativeEvent.data)}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={c.azure500} />
              </View>
            )}
            style={styles.webview}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={c.azure500} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barTitle: { fontSize: 16, fontWeight: '700' },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  closeText: { fontSize: 15, fontWeight: '600' },
  webview: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
