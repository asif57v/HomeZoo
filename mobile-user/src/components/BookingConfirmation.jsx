import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Share, Alert, ActivityIndicator, Animated } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, MapPin, Navigation, Phone, FileText, Share2, ChevronLeft } from 'lucide-react-native';
import { Text } from './ui';
import { bookingService } from '../services/apiService';
import { getConfirmationState } from '../lib/checkoutState';
import toast from '../store/toastStore';
import { colors } from '../theme';
import { errMsg } from '../utils/format';

const D = (v) => new Date(v).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const Card = ({ children, style }) => <View style={[{ backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.gray100 }, style]}>{children}</View>;
const Row = ({ k, v, color = colors.gray600 }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 14, color }}>{k}</Text><Text style={{ fontSize: 14, color }}>{v}</Text></View>;

export default function BookingConfirmation() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState(() => { const s = getConfirmationState(); return s?.booking && (!id || s.booking._id === id || s.booking.bookingId === id) ? s.booking : null; });
  const [loading, setLoading] = useState(!booking);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (booking) { setLoading(false); return; }
    if (!id) { router.replace('/'); return; }
    (async () => {
      try { setLoading(true); setBooking(await bookingService.getBookingDetail(id)); }
      catch { toast.error('Could not load booking details'); router.replace('/'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50, gap: 12 }}><ActivityIndicator color="#000" size="large" /><Text style={{ color: colors.gray500, fontWeight: '500' }}>Loading Booking...</Text></View>;
  if (!booking) return null;

  const property = booking.propertyId || {};
  const room = booking.roomTypeId || {};
  const user = booking.userId || {};
  const t = property.propertyType?.toLowerCase();
  const isPg = t === 'pg' || t === 'hostel';
  const noTimes = ['pg', 'hostel', 'rent', 'buy', 'plot'].includes(t);
  const img = property.propertyImages?.[0] || property.images?.[0]?.url || property.images?.[0] || property.coverImage;

  const directions = () => {
    const addr = property.address?.fullAddress || `${property.address?.street || ''}, ${property.address?.city || ''}, ${property.address?.state || ''}`;
    if (property.location?.coordinates?.length === 2) { const [lng, lat] = property.location.coordinates; Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`); return; }
    if (addr) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);
  };
  const share = () => Share.share({ message: `Booking #${booking.bookingId || booking._id?.slice(-8).toUpperCase()} at ${property.name || property.propertyName}\nCheck-in: ${D(booking.checkInDate)}\nCheck-out: ${D(booking.checkOutDate)}\nTotal: ₹${booking.totalAmount?.toLocaleString()}` }).catch(() => {});

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const checkIn = new Date(booking.checkInDate); checkIn.setHours(0, 0, 0, 0);
  const cancellable = today < checkIn;
  const active = ['confirmed', 'pending'].includes(booking.bookingStatus);

  const cancel = () => Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking? This action cannot be undone.', [
    { text: 'No', style: 'cancel' },
    { text: 'Yes, cancel', style: 'destructive', onPress: async () => {
      setCancelling(true);
      try { await bookingService.cancel(booking._id || booking.id); toast.success('Booking cancelled successfully'); router.replace('/bookings'); }
      catch (e) { toast.error(e?.response?.data?.message || errMsg(e, 'Failed to cancel booking')); } finally { setCancelling(false); }
    } },
  ]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <View style={{ height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/bookings'))} style={{ padding: 8 }}><ChevronLeft size={22} color={colors.gray600} /></TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gray900 }}>Booking Confirmation</Text>
        <TouchableOpacity onPress={share} style={{ padding: 8 }}><Share2 size={20} color={colors.gray600} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Card style={{ alignItems: 'center', padding: 32, overflow: 'hidden' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.green50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><CheckCircle size={40} color={colors.green600} /></View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.gray900, marginBottom: 8 }}>Booking Confirmed!</Text>
          <Text style={{ color: colors.gray500, textAlign: 'center', lineHeight: 22 }}>Your reservation ID is <Text style={{ fontWeight: '700', color: colors.gray800 }}>#{booking.bookingId || booking._id?.slice(-8).toUpperCase()}</Text>.{user.email ? <> We've sent a confirmation email to <Text style={{ fontWeight: '500', color: colors.gray800 }}>{user.email}</Text>.</> : null}</Text>
        </Card>

        <Card>
          <View style={{ height: 128, borderRadius: 16, backgroundColor: colors.gray200, overflow: 'hidden', marginBottom: 16 }}>
            {img ? <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1 }}>{(property.propertyType || 'Hotel').toUpperCase()}</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gray900, marginVertical: 6 }}>{property.name || property.propertyName || 'Property Name'}</Text>
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}><MapPin size={16} color={colors.gray500} style={{ marginTop: 2 }} /><Text style={{ flex: 1, fontSize: 14, color: colors.gray500 }}>{property.address?.fullAddress || property.address?.street || property.address?.city || (typeof property.address === 'string' ? property.address : '')}</Text></View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={directions} style={{ flex: 1, backgroundColor: colors.gray100, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Navigation size={14} color={colors.gray700} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray700 }}>Directions</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => property.contactNumber && Linking.openURL(`tel:${property.contactNumber}`)} style={{ flex: 1, borderWidth: 1, borderColor: colors.gray200, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Phone size={14} color={colors.gray700} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray700 }}>Contact Property</Text></TouchableOpacity>
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}><FileText size={18} color={colors.gray400} /><Text style={{ fontWeight: '700', color: colors.gray900 }}>Reservation Details</Text></View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, padding: 16, backgroundColor: colors.gray50, borderRadius: 16 }}><Text style={{ fontSize: 12, color: colors.gray400, fontWeight: '700' }}>Check-in</Text><Text style={{ fontWeight: '700', fontSize: 16, color: colors.gray900 }}>{D(booking.checkInDate)}</Text>{!noTimes ? <Text style={{ fontSize: 12, color: colors.gray500 }}>{property.checkInTime || '12:00 PM'}</Text> : null}</View>
            <View style={{ flex: 1, padding: 16, backgroundColor: colors.gray50, borderRadius: 16 }}><Text style={{ fontSize: 12, color: colors.gray400, fontWeight: '700' }}>Check-out</Text><Text style={{ fontWeight: '700', fontSize: 16, color: colors.gray900 }}>{D(booking.checkOutDate)}</Text>{!noTimes ? <Text style={{ fontSize: 12, color: colors.gray500 }}>{property.checkOutTime || '11:00 AM'}</Text> : null}</View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
            {[[isPg ? 'Duration' : 'Total Nights', isPg ? '1 Month' : `${booking.totalNights} Night(s)`], ['Room Type', room.name || room.type || booking.roomType || 'Standard Room'], ['Guests', isPg ? `${booking.rooms || 1} Bed(s)` : `${booking.guests?.adults || 1} Adults, ${booking.guests?.children || 0} Children`], ['Booking Unit', booking.bookingUnit]].map(([k, v]) => (
              <View key={k} style={{ width: '50%' }}><Text style={{ fontSize: 12, color: colors.gray400, fontWeight: '700' }}>{k}</Text><Text style={{ fontWeight: '600', color: colors.gray900 }}>{v}</Text></View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ fontWeight: '700', color: colors.gray900, marginBottom: 20 }}>Payment Summary</Text>
          <View style={{ gap: 10, marginBottom: 16 }}>
            <Row k="Base Price" v={`₹${booking.baseAmount?.toLocaleString()}`} />
            {booking.extraCharges > 0 ? <Row k="Extra Charges" v={`₹${booking.extraCharges?.toLocaleString()}`} /> : null}
            <Row k="Taxes & Fees" v={`₹${booking.taxes?.toLocaleString()}`} />
            {booking.discount > 0 ? <Row k="Discount" v={`-₹${booking.discount?.toLocaleString()}`} color={colors.green600} /> : null}
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.gray100, backgroundColor: colors.gray50, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.gray900 }}>Total Amount</Text><Text style={{ fontSize: 20, fontWeight: '900', color: colors.gray900 }}>₹{booking.totalAmount?.toLocaleString()}</Text>
          </View>
          <View style={{ marginTop: 16, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: booking.paymentStatus === 'paid' ? colors.green50 : '#FEFCE8' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: booking.paymentStatus === 'paid' ? colors.green100 : '#FEF9C3', alignItems: 'center', justifyContent: 'center' }}>{booking.paymentStatus === 'paid' ? <CheckCircle size={20} color={colors.green600} /> : <FileText size={20} color="#CA8A04" />}</View>
            <View><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500 }}>Payment Status</Text><Text style={{ fontWeight: '700', color: booking.paymentStatus === 'paid' ? colors.green700 : '#A16207' }}>{booking.paymentStatus === 'paid' ? 'Paid Completely' : 'Pay at Hotel'}</Text></View>
          </View>
        </Card>

        <TouchableOpacity onPress={() => router.replace('/bookings')} style={{ backgroundColor: '#000', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>My Bookings</Text></TouchableOpacity>
        {active ? (cancellable ? (
          <TouchableOpacity disabled={cancelling} onPress={cancel} style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: colors.red100, paddingVertical: 16, borderRadius: 16, alignItems: 'center', opacity: cancelling ? 0.6 : 1 }}>{cancelling ? <ActivityIndicator color={colors.red500} /> : <Text style={{ color: colors.red500, fontWeight: '700' }}>Cancel Booking</Text>}</TouchableOpacity>
        ) : <View style={{ backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}><Text style={{ color: colors.gray400, fontWeight: '700', fontSize: 12 }}>Cancellation unavailable (Policy: Up to 1 day before Check-in)</Text></View>) : null}
        {booking.bookingStatus === 'cancelled' ? <View style={{ backgroundColor: colors.red50, borderWidth: 1, borderColor: colors.red100, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}><Text style={{ color: colors.red600, fontWeight: '700' }}>This booking has been cancelled</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
