import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Star, CheckCircle, XCircle, AlertCircle, Ticket } from 'lucide-react-native';
import { Text } from '../src/components/ui';
import { bookingService } from '../src/services/apiService';
import { setConfirmationState } from '../src/lib/checkoutState';
import { colors } from '../src/theme';

const TABS = [{ id: 'upcoming', label: 'Today Lead' }, { id: 'ongoing', label: 'Yesterday' }, { id: 'completed', label: 'New' }, { id: 'cancelled', label: 'Others' }];
const EMPTY = { upcoming: 'Your upcoming trips will appear here.', ongoing: 'Currently active stays will show here.', completed: 'Your past stays history is empty.', cancelled: 'No cancelled bookings found.' };

const Badge = ({ bg, fg, Icon, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}><Icon size={10} color={fg} /><Text style={{ fontSize: 10, fontWeight: '700', color: fg }}>{text}</Text></View>
);
const statusBadge = (status, pay) => {
  const s = (status || '').toLowerCase();
  if (s === 'confirmed' || s === 'pending') return pay === 'paid' ? <Badge bg={colors.green100} fg={colors.green700} Icon={CheckCircle} text="Paid" /> : <Badge bg="#FEF9C3" fg="#A16207" Icon={AlertCircle} text="Pay at Hotel" />;
  if (s === 'pending_payment') return <Badge bg="#FFEDD5" fg="#C2410C" Icon={Clock} text="Payment Pending" />;
  if (s === 'checked_in') return <Badge bg={colors.blue100} fg={colors.blue700} Icon={Clock} text="Ongoing" />;
  if (s === 'completed' || s === 'checked_out') return <Badge bg={colors.gray100} fg={colors.gray700} Icon={CheckCircle} text="Completed" />;
  if (s === 'cancelled' || s === 'no_show' || s === 'rejected') return <Badge bg={colors.red100} fg={colors.red600} Icon={XCircle} text={s === 'no_show' ? 'No Show' : 'Cancelled'} />;
  return <View style={{ backgroundColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 10, color: colors.gray500 }}>{status}</Text></View>;
};
const short = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A');

export default function Bookings() {
  const router = useRouter();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (t, silent) => {
    try { if (!silent) setLoading(true); const data = await bookingService.getMyBookings(t); setBookings(Array.isArray(data) ? data : []); }
    catch { setBookings([]); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(tab); }, [tab]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <View style={{ backgroundColor: colors.surface, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, elevation: 4 }}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff' }}>My Bookings</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 10 }}>Manage your stays and trips</Text>
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 12, gap: 4 }}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', backgroundColor: tab === t.id ? '#fff' : 'transparent' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: tab === t.id ? colors.surface : 'rgba(255,255,255,0.7)' }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 14, gap: 16, flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(tab, true); }} />}>
        {loading ? <View style={{ paddingVertical: 80, alignItems: 'center' }}><ActivityIndicator color={colors.surface} size="large" /></View>
        : bookings.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Ticket size={32} color={colors.gray300} /></View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.surface, marginBottom: 4 }}>No {tab} bookings</Text>
            <Text style={{ fontSize: 11, color: colors.gray400, textAlign: 'center', marginBottom: 20 }}>{EMPTY[tab]}</Text>
            {tab !== 'cancelled' ? <TouchableOpacity onPress={() => router.push('/search')} style={{ backgroundColor: colors.surface, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Explore Hotels</Text></TouchableOpacity> : null}
          </View>
        ) : bookings.map((b, i) => {
          const hotel = b.propertyId || {};
          const status = b.bookingStatus || b.status || 'pending';
          const img = hotel.propertyImages?.[0] || hotel.images?.[0]?.url || hotel.images?.[0] || hotel.coverImage || 'https://via.placeholder.com/150';
          const loc = `${hotel.address?.city || ''}, ${hotel.address?.state || ''}`.replace(/^, /, '').replace(/, $/, '') || 'Location not available';
          return (
            <TouchableOpacity key={b._id || b.id || i} activeOpacity={0.9} onPress={() => { setConfirmationState({ booking: b }); router.push(`/booking/${b._id}`); }} style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden', elevation: 2 }}>
              <View style={{ flexDirection: 'row', height: 112 }}>
                <View style={{ width: 96, backgroundColor: colors.gray200 }}>
                  <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <View style={{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Star size={8} color="#fff" fill="#fff" /><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{hotel.avgRating > 0 ? Number(hotel.avgRating).toFixed(1) : 'New'}</Text></View>
                </View>
                <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>{statusBadge(status, b.paymentStatus)}<Text style={{ fontSize: 9, color: colors.gray400, fontWeight: '500' }}>#{b.bookingId || b._id?.slice(-6)}</Text></View>
                  <View>
                    <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.surface, fontSize: 14 }}>{hotel.propertyName || hotel.name || 'Unknown Property'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><MapPin size={9} color={colors.gray400} /><Text numberOfLines={1} style={{ fontSize: 10, color: colors.gray400, flex: 1 }}>{loc}</Text></View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}><Text style={{ fontSize: 10, fontWeight: '600', color: colors.gray700 }}>{short(b.checkInDate || b.checkIn)}</Text></View>
                    <Text style={{ color: colors.gray300 }}>→</Text>
                    <View style={{ backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}><Text style={{ fontSize: 10, fontWeight: '600', color: colors.gray700 }}>{short(b.checkOutDate || b.checkOut)}</Text></View>
                  </View>
                </View>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: colors.gray100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(249,250,251,0.5)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '500' }}>Total Amount</Text><Text style={{ fontSize: 14, fontWeight: '900', color: colors.surface }}>₹{b.totalAmount?.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
