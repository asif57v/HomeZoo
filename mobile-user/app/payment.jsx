import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CreditCard, ShieldCheck, Tag, TrendingDown } from 'lucide-react-native';
import { Text, Header, Button } from '../src/components/ui';
import paymentService from '../src/services/paymentService';
import { useFeatureFlags, RAZORPAY_UNAVAILABLE_MESSAGE } from '../src/store/featureFlagsStore';
import { getCheckoutState, setConfirmationState } from '../src/lib/checkoutState';
import toast from '../src/store/toastStore';
import { errMsg } from '../src/utils/format';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

// Web: /payment with router state { booking }. Booking comes from the in-memory hand-off.
export default function Payment() {
  const router = useRouter();
  const { razorpayEnabled } = useFeatureFlags();
  const booking = getCheckoutState()?.booking;
  const bookingId = booking?.bookingId;
  const pricing = booking?.pricing || {};
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!booking || !bookingId) { toast.error('No booking found. Please create a booking first.'); router.replace('/'); } }, []);
  if (!booking) return null;

  const pay = async () => {
    if (!razorpayEnabled) { toast.error(RAZORPAY_UNAVAILABLE_MESSAGE); return; }
    if (loading) return;
    setLoading(true);
    try {
      const orderData = await paymentService.createOrder(bookingId);
      if (!orderData.success) throw new Error(orderData.message || 'Failed to create order');
      const { order, booking: b, razorpayKeyId } = orderData;
      const res = await paymentService.openCheckout({ key: razorpayKeyId, amount: order.amount, currency: order.currency, name: 'HoomZo', description: `Booking Payment - ${b.bookingId}`, order_id: order.id, prefill: { name: '', email: '', contact: '' }, theme: { color: '#B45309' } });
      const v = await paymentService.verifyPayment({ razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature, bookingId: b.bookingId });
      if (v.success) { toast.success('Payment successful!'); setConfirmationState({ booking: v.booking, animate: true }); router.replace('/booking-confirmation'); } else throw new Error('Payment verification failed');
    } catch (e) { toast.error(e?.response?.data?.message || errMsg(e, 'Payment failed')); } finally { setLoading(false); }
  };

  const amt = pricing.userPayableAmount?.toLocaleString('en-IN');
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <Header title="Payment Checkout" />
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 20, paddingBottom: 120 }, CENTER]}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray100, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Tag size={18} color={colors.surface} /><Text style={{ fontWeight: '700', color: colors.surface }}>Price Breakdown</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 14, color: colors.gray600 }}>Base Amount</Text><Text style={{ fontWeight: '700', color: colors.surface }}>₹{pricing.baseAmount?.toLocaleString('en-IN')}</Text></View>
          {pricing.discountAmount > 0 ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><TrendingDown size={14} color={colors.green600} /><Text style={{ fontSize: 14, color: colors.green600 }}>Coupon Discount</Text></View><Text style={{ fontWeight: '700', color: colors.green600 }}>-₹{pricing.discountAmount?.toLocaleString('en-IN')}</Text></View> : null}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontWeight: '700', color: colors.surface }}>Total Amount</Text><Text style={{ fontSize: 24, fontWeight: '900', color: colors.surface }}>₹{amt}</Text></View>
          {pricing.discountAmount > 0 ? <View style={{ backgroundColor: colors.green50, borderWidth: 1, borderColor: colors.green100, borderRadius: 8, padding: 12 }}><Text style={{ fontSize: 12, color: colors.green700, fontWeight: '500' }}>🎉 You saved ₹{pricing.discountAmount?.toLocaleString('en-IN')} with this coupon!</Text></View> : null}
        </View>
        <View style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 16 }}>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Total Amount to Pay</Text>
          <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 4 }}>₹{amt}</Text>
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}><ShieldCheck size={14} color="#fff" /><Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Secure Payment via Razorpay</Text></View>
        </View>
        <View>
          <Text style={{ fontWeight: '700', color: colors.gray500, fontSize: 12, marginBottom: 12 }}>Payment Gateway</Text>
          <View style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.surface, backgroundColor: 'rgba(0,92,168,0.05)', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 40, height: 40, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><CreditCard size={20} color={colors.blue600} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.surface }}>Razorpay</Text><Text style={{ fontSize: 12, color: colors.gray400 }}>UPI, Cards, Net Banking & More</Text></View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.surface }} /></View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}><ShieldCheck size={12} color={colors.gray400} /><Text style={{ fontSize: 10, color: colors.gray400 }}>Your payment details are encrypted and secure</Text></View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: colors.gray200 }}>
        <Button title={`Pay ₹${amt}`} onPress={pay} loading={loading} variant="amber" icon={<CreditCard size={20} color="#fff" />} style={{ borderRadius: 12, backgroundColor: colors.amber700 }} />
      </View>
    </SafeAreaView>
  );
}
