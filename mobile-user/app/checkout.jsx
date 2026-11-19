import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Lock, Tag, Wallet, CreditCard, Building } from 'lucide-react-native';
import { Text, Header, Button } from '../src/components/ui';
import { bookingService, paymentService } from '../src/services/apiService';
import walletService from '../src/services/walletService';
import { useFeatureFlags, RAZORPAY_UNAVAILABLE_MESSAGE } from '../src/store/featureFlagsStore';
import { getCheckoutState, setConfirmationState } from '../src/lib/checkoutState';
import payments from '../src/services/paymentService';
import useAuthStore from '../src/store/authStore';
import toast from '../src/store/toastStore';
import { colors } from '../src/theme';
import { errMsg } from '../src/utils/format';

const Card = ({ children, style }) => <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.gray100 }, style]}>{children}</View>;
const Row = ({ k, v, color = colors.gray600, bold }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 14, color, fontWeight: bold ? '500' : '400' }}>{k}</Text><Text style={{ fontSize: 14, color, fontWeight: bold ? '600' : '400' }}>{v}</Text></View>;

export default function Checkout() {
  const router = useRouter();
  const st = getCheckoutState() || {};
  const { property, selectedRoom, dates, guests, priceBreakdown, taxRate } = st;
  const user = useAuthStore((s) => s.user) || {};
  const { razorpayEnabled } = useFeatureFlags();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pay_at_hotel');
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => { if (!razorpayEnabled && paymentMethod === 'online') setPaymentMethod('pay_at_hotel'); }, [razorpayEnabled, paymentMethod]);
  useEffect(() => {
    if (!property || !dates) { toast.error('Invalid booking details'); router.replace('/'); return; }
    walletService.getWallet().then((d) => { if (d.success && d.wallet) setWalletBalance(d.wallet.balance); }).catch(() => {});
  }, []);
  if (!property || !dates) return null;

  const isPg = ['pg', 'hostel'].includes(property?.propertyType?.toLowerCase());
  const totalAmount = priceBreakdown?.grandTotal || 0;
  let walletDeduction = 0; let remaining = totalAmount;
  if (useWallet && paymentMethod === 'online') { walletDeduction = Math.min(walletBalance, totalAmount); remaining = totalAmount - walletDeduction; }

  const goConfirm = (booking) => { setConfirmationState({ booking, animate: true }); router.replace(`/booking/${booking._id || booking.bookingId}`); };

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    const payload = {
      propertyId: property._id, roomTypeId: selectedRoom._id, checkInDate: dates.checkIn, checkOutDate: dates.checkOut,
      guests: { adults: guests.adults, children: guests.children, rooms: guests.rooms || 1, extraAdults: priceBreakdown?.extraAdultsCount || 0, extraChildren: priceBreakdown?.extraChildrenCount || 0 },
      bookingUnit: selectedRoom.inventoryType || (['Hostel', 'PG'].includes(property.propertyType) ? 'bed' : 'room'),
      couponCode: priceBreakdown?.couponCode || null,
      paymentMethod: paymentMethod === 'online' ? 'razorpay' : 'pay_at_hotel', paymentStatus: 'pending', totalAmount,
      useWallet: useWallet && paymentMethod === 'online', walletDeduction: useWallet && paymentMethod === 'online' ? walletDeduction : 0,
    };
    try {
      if (paymentMethod === 'pay_at_hotel') {
        const res = await bookingService.create(payload);
        if (res.success && res.booking) { toast.success('Booking Confirmed!'); goConfirm(res.booking); } else throw new Error(res.message || 'Booking failed');
      } else {
        if (remaining <= 0) {
          const res = await bookingService.create(payload);
          if (res.success && res.booking) { toast.success('Paid via Wallet! Booking Confirmed.'); goConfirm(res.booking); return; }
          throw new Error(res.message || 'Wallet payment failed');
        }
        const bookingRes = await bookingService.create(payload);
        if (!bookingRes.success) throw new Error(bookingRes.message || 'Failed to initialize booking');
        if (bookingRes.paymentRequired && bookingRes.order) {
          const { order, key } = bookingRes;
          let response;
          try {
            response = await payments.openCheckout({
              key, amount: order.amount, currency: order.currency, name: 'HoomZo', description: 'Booking Payment', order_id: order.id,
              prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' }, theme: { color: '#000000' },
              config: { display: { blocks: { head: { name: 'Pay via UPI / Apps', instruments: [{ method: 'upi' }, { method: 'wallet', wallets: ['paytm', 'phonepe'] }] }, cards: { name: 'Cards & Netbanking', instruments: [{ method: 'card' }, { method: 'netbanking' }] } }, sequence: ['block.head', 'block.cards'], preferences: { show_default_blocks: true } } },
              retry: { enabled: true },
            });
          } catch (e) { toast.error(errMsg(e, 'Payment Failed')); return; }
          try {
            const verifyRes = await paymentService.verifyPayment({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, bookingId: bookingRes.booking._id });
            if (verifyRes.success) { toast.success('Payment Successful!'); goConfirm(verifyRes.booking); } else toast.error('Payment Verification Failed');
          } catch { toast.error('Payment verification failed.'); }
        }
      }
    } catch (e) { toast.error(errMsg(e, 'Booking failed.')); } finally { setLoading(false); }
  };

  const label = paymentMethod === 'online' ? (isPg ? 'Pay & Reserve' : 'Pay & Book') : (isPg ? 'Confirm Reservation' : 'Confirm Booking');
  const Radio = ({ on }) => <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.surface : colors.gray300, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface }} /> : null}</View>;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <Header title="Review & Pay" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 140 }}>
        <Card style={{ flexDirection: 'row', gap: 14, padding: 14 }}>
          <View style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: colors.gray200, overflow: 'hidden' }}>
            <Image source={{ uri: property.images?.cover || property.coverImage || 'https://via.placeholder.com/150' }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1 }}>{(property.propertyType || '').toUpperCase()}</Text>
            <Text numberOfLines={2} style={{ fontWeight: '700', color: colors.gray900, marginBottom: 2 }}>{property.name}</Text>
            <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 6 }}>{property.address?.city || property.address}, {property.address?.state}</Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: colors.green100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.green700 }}>{property.avgRating || 'New'} ★</Text></View>
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: '700', color: colors.gray900, fontSize: 14, marginBottom: 14 }}>Your Trip</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
            <View style={{ width: '50%' }}><Text style={{ fontSize: 12, color: colors.gray500, fontWeight: '500' }}>Dates</Text><Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray800 }}>{isPg ? '1 Month' : `${priceBreakdown?.nights} Nights`}</Text><Text style={{ fontSize: 12, color: colors.gray600 }}>{dates.checkIn} - {dates.checkOut}</Text></View>
            <View style={{ width: '50%' }}><Text style={{ fontSize: 12, color: colors.gray500, fontWeight: '500' }}>Guests</Text>
              {isPg ? <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray800 }}>{guests.rooms} Bed(s)</Text> : <><Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray800 }}>{guests.adults} Adults, {guests.children} Children</Text><Text style={{ fontSize: 12, color: colors.gray600 }}>{guests.rooms} Room(s)</Text></>}
            </View>
            <View style={{ width: '100%' }}><Text style={{ fontSize: 12, color: colors.gray500, fontWeight: '500' }}>{isPg ? 'Bed Type' : 'Room Type'}</Text><Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray800 }}>{selectedRoom.type || selectedRoom.name}</Text></View>
          </View>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ fontWeight: '700', color: colors.gray900, fontSize: 14, marginBottom: 4 }}>Price Details</Text>
          <Row k={`Base Price (${isPg ? '1 Month' : `${priceBreakdown?.nights} nights`})`} v={`₹${priceBreakdown?.totalBasePrice?.toLocaleString()}`} />
          {priceBreakdown?.totalExtraAdultCharge > 0 ? <Row k="Extra Adults Charges" v={`₹${priceBreakdown.totalExtraAdultCharge.toLocaleString()}`} /> : null}
          {priceBreakdown?.totalExtraChildCharge > 0 ? <Row k="Extra Children Charges" v={`₹${priceBreakdown.totalExtraChildCharge.toLocaleString()}`} /> : null}
          {priceBreakdown?.discountAmount > 0 ? <Row k="Coupon Discount" v={`- ₹${priceBreakdown.discountAmount.toLocaleString()}`} color={colors.green700} bold /> : null}
          <Row k={`Taxes & Fees (${taxRate || 0}%)`} v={`₹${priceBreakdown?.taxAmount?.toLocaleString()}`} />
          {useWallet && paymentMethod === 'online' && walletDeduction > 0 ? <Row k="Wallet Balance Used" v={`- ₹${walletDeduction.toLocaleString()}`} color={colors.blue700} bold /> : null}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.gray900 }}>Total Payable</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.gray900 }}>₹{(paymentMethod === 'online' && useWallet ? remaining : totalAmount).toLocaleString()}</Text>
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Wallet size={18} color={colors.blue600} /><Text style={{ fontWeight: '700', color: colors.gray900, fontSize: 14 }}>Use Wallet Balance</Text></View>
            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.blue700 }}>Available: ₹{walletBalance.toLocaleString()}</Text></View>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => { if (paymentMethod !== 'online') { toast.error('Wallet can only be used with Online Payment for now'); return; } if (walletBalance > 0) setUseWallet(!useWallet); }} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: useWallet ? colors.blue500 : colors.gray100, backgroundColor: useWallet ? 'rgba(239,246,255,0.5)' : '#fff', opacity: walletBalance <= 0 ? 0.5 : 1 }}>
            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: useWallet ? colors.blue600 : colors.gray300, backgroundColor: useWallet ? colors.blue600 : '#fff', alignItems: 'center', justifyContent: 'center' }}>{useWallet ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray800 }}>Pay using Wallet</Text>
              <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 2 }}>{paymentMethod !== 'online' ? "Select 'Pay Now' to use wallet balance." : walletBalance > 0 ? `Use ₹${Math.min(walletBalance, totalAmount).toLocaleString()} from your wallet.` : 'Insufficient balance.'}</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={{ fontWeight: '700', color: colors.gray900, fontSize: 14 }}>Payment Method</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => { setPaymentMethod('pay_at_hotel'); setUseWallet(false); }} style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: paymentMethod === 'pay_at_hotel' ? colors.surface : colors.gray100, backgroundColor: paymentMethod === 'pay_at_hotel' ? 'rgba(0,92,168,0.05)' : '#fff' }}>
            <Radio on={paymentMethod === 'pay_at_hotel'} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontWeight: '700', fontSize: 14 }}>{isPg ? 'Pay at Move-In' : 'Pay at Hotel'}</Text><Building size={16} color={colors.gray400} /></View>
              <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>{isPg ? "Pay your first month's rent when you move in. Room will be reserved for you." : 'Pay the full amount when you check-in at the property. No upfront payment required.'}</Text>
            </View>
          </TouchableOpacity>
          {razorpayEnabled ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setPaymentMethod('online')} style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: paymentMethod === 'online' ? colors.surface : colors.gray100, backgroundColor: paymentMethod === 'online' ? 'rgba(0,92,168,0.05)' : '#fff' }}>
              <Radio on={paymentMethod === 'online'} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontWeight: '700', fontSize: 14 }}>Pay Now</Text><CreditCard size={16} color={colors.gray400} /></View>
                <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 4, marginBottom: 8 }}>{isPg ? "Pay first month's rent online & get instant room reservation confirmation." : 'Secure online payment via UPI, Card, or Netbanking.'}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ backgroundColor: colors.green100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.green700 }}>{isPg ? 'Instant Confirm' : 'Fast Checkout'}</Text></View>
                  <View style={{ backgroundColor: colors.blue100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.blue700 }}>Secure</Text></View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.gray200, backgroundColor: colors.gray50 }}>
              <CreditCard size={16} color={colors.gray400} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', fontSize: 14, color: colors.gray500 }}>Pay Now</Text><Text style={{ fontSize: 12, color: colors.gray400, marginTop: 2 }}>{RAZORPAY_UNAVAILABLE_MESSAGE}</Text></View>
            </View>
          )}
        </Card>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100 }}>
        <Button title={label} onPress={handleConfirm} loading={loading} variant="primary" icon={<ChevronRight size={20} color="#fff" />} style={{ flexDirection: 'row-reverse', borderRadius: 12 }} textStyle={{ fontSize: 17 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 }}><Lock size={10} color={colors.gray400} /><Text style={{ fontSize: 10, color: colors.gray400 }}>Your data is secure. By booking, you agree to our Terms.</Text></View>
      </View>
    </SafeAreaView>
  );
}
