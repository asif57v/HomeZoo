import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from './ui';
import { on, emit } from '../lib/events';
import { colors } from '../theme';

// Razorpay has no maintained Expo-compatible native SDK; the PDF allows a WebView for the payment flow only.
// Usage: const res = await openRazorpay({ key, amount, currency, name, description, order_id, prefill, theme })
// Resolves with { razorpay_payment_id, razorpay_order_id, razorpay_signature }; rejects on cancel/failure.
export const openRazorpay = (options) =>
  new Promise((resolve, reject) => emit('razorpay:open', { options, resolve, reject }));

const buildHtml = (options) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>body{margin:0;background:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#475569}</style></head>
<body><div id="msg">Opening secure payment…</div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  window.onload = function(){
    try {
      var opts = ${JSON.stringify(options)};
      opts.handler = function(r){ post({ type:'success', payload:r }); };
      opts.modal = { ondismiss: function(){ post({ type:'dismiss' }); }, escape:false };
      var rzp = new Razorpay(opts);
      rzp.on('payment.failed', function(resp){ post({ type:'failed', payload: resp.error }); });
      rzp.open();
    } catch(e){ post({ type:'error', payload:String(e) }); }
  };
</script></body></html>`;

export default function RazorpayHost() {
  const [req, setReq] = useState(null);
  const done = useRef(false);

  useEffect(() => on('razorpay:open', (r) => { done.current = false; setReq(r); }), []);

  const finish = (fn, val) => {
    if (done.current) return;
    done.current = true;
    const r = req;
    setReq(null);
    r && r[fn] && r[fn](val);
  };

  if (!req) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={() => finish('reject', new Error('Payment cancelled by user'))}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 48, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
          <Text style={{ fontWeight: '700', color: colors.gray900 }}>Secure Payment</Text>
          <TouchableOpacity onPress={() => finish('reject', new Error('Payment cancelled by user'))} style={{ padding: 6 }}><X size={20} color={colors.gray600} /></TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html: buildHtml(req.options), baseUrl: 'https://checkout.razorpay.com' }}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>}
          onMessage={(e) => {
            try {
              const m = JSON.parse(e.nativeEvent.data);
              if (m.type === 'success') finish('resolve', m.payload);
              else if (m.type === 'dismiss') finish('reject', new Error('Payment cancelled by user'));
              else finish('reject', new Error((m.payload && m.payload.description) || 'Payment failed'));
            } catch {}
          }}
          onShouldStartLoadWithRequest={(r) => {
            if (/^(https?:|about:|data:|blob:)/.test(r.url)) return true;
            // UPI / wallet app intents (GPay, PhonePe, Paytm...) open in the installed app
            Linking.openURL(r.url).catch(() => {});
            return false;
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
