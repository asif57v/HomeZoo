import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, User, Phone, Clock, ChevronRight, BedDouble, Lock, Crown, Users } from 'lucide-react-native';
import { Text } from '../../../src/components/ui';
import { bookingService } from '../../../src/services/apiService';
import { colors } from '../../../src/theme';
import { setCurrentEnquiry } from '../../../src/lib/enquiryState';
import { CENTER } from '../../../src/lib/responsive';
import Svg, { Path } from 'react-native-svg';
import { whatsAppLink, enquiryMessage, WHATSAPP_PATH } from '../../../src/utils/whatsapp';

const P = '#005CA8';
const TABS = [{ id: 'upcoming', label: 'New Leads' }, { id: 'in_house', label: 'Ongoing' }, { id: 'completed', label: 'Completed' }, { id: 'cancelled', label: 'Cancelled' }];
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A');
// Same labels as the enquiry detail screen ([id].jsx)
const SHARING = { triple: 'Triple Sharing', double: 'Double Sharing', private: 'Private Room', shared: 'Shared Dorm', entire: 'Entire Unit' };
const sharingFor = (b) => b.inquiryMetadata?.sharingType || (b.roomTypeId?.roomCategory ? SHARING[String(b.roomTypeId.roomCategory).toLowerCase()] || b.roomTypeId.roomCategory : null);
const nightsBetween =(a, b) => { if (!a || !b) return 1; const diff = Math.ceil((new Date(b) - new Date(a)) / 86400000); return diff > 0 ? diff : 1; };

const statusOf = (booking, isPG, isRent, isInquiry, inqStatus, s) => {
  const T = (c, b, l) => ({ fg: c, bg: b, label: l });
  if (isInquiry) {
    if (inqStatus === 'new') return T('#2563EB', '#EFF6FF', 'New Inquiry');
    if (inqStatus === 'scheduled') return T('#9333EA', '#FAF5FF', 'Scheduled');
    if (inqStatus === 'negotiating') return T('#EA580C', '#FFF7ED', 'Negotiating');
    if (inqStatus === 'sold' || inqStatus === 'rented') return T('#005CA8', '#f0f7fd', inqStatus.toUpperCase());
    return T('#6B7280', '#F9FAFB', inqStatus.toUpperCase());
  }
  if (s === 'confirmed') return T('#2563EB', '#EFF6FF', isPG ? 'Booked' : 'Confirmed');
  if (s === 'checked_in') return T('#9333EA', '#FAF5FF', isPG || isRent ? 'Active Tenant' : 'Ongoing');
  if (s === 'checked_out' || s === 'completed') return T('#005CA8', '#f0f7fd', 'Completed');
  if (s === 'cancelled') return T('#EF4444', '#FEF2F2', 'Cancelled');
  if (s === 'no_show') return T('#6B7280', '#F3F4F6', 'No Show');
  if (s === 'pending_payment') return T('#EA580C', '#FFF7ED', 'Payment Pending');
  return T('#CA8A04', '#FEFCE8', s.replace('_', ' ').toUpperCase());
};

const BookingCard = ({ booking }) => {
  const router = useRouter();
  const pType = (booking.propertyType || '').toLowerCase();
  const isPG = ['pg', 'hostel'].includes(pType); const isRent = pType === 'rent'; const isBuyPlot = ['buy', 'plot'].includes(pType);
  const isInquiry = booking.isInquiry === true; const isLocked = booking.isLocked === true;
  const rawStatus = (booking.bookingStatus || booking.status || 'pending').toLowerCase().trim();
  const inqStatus = (booking.inquiryMetadata?.status || 'new').toLowerCase();
  const st = statusOf(booking, isPG, isRent, isInquiry, inqStatus, rawStatus);
  const nights = nightsBetween(booking.checkInDate || booking.checkIn, booking.checkOutDate || booking.checkOut);
  const guestCount = (booking.guests?.adults || 1) + (booking.guests?.children || 0);
  const secondary = isBuyPlot ? 'Interested' : isPG || isRent ? 'Tenant' : 'Guest';
  const duration = isPG || isRent ? (nights >= 30 ? `${Math.round(nights / 30)} Months` : `${nights} Days`) : `${nights} Nights`;
  const unit = isPG ? 'Bed' : isBuyPlot || isRent ? 'Unit' : 'Room';
  const id = booking.bookingId || booking._id?.slice(-8).toUpperCase();
  const sharing = isPG ? sharingFor(booking) : null;
  const Meta = ({ Icon, text }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon size={15} color={colors.gray400} /><Text style={{ fontSize: 12, color: colors.gray500 }}>{text}</Text></View>;
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => { setCurrentEnquiry(booking); router.push({ pathname: '/hotel/bookings/[id]', params: { id: String(booking._id) } }); }} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: colors.partnerBorder, borderLeftWidth: 5, borderLeftColor: st.fg, gap: 8, shadowColor: '#005CA8', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1 }}>ENQUIRY ID: {id}</Text>
        <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '700', color: st.fg }}>{st.label}</Text></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: colors.gray900, flexShrink: 1 }}>{booking.userId?.name || 'Guest User'}</Text><ChevronRight size={20} color={colors.gray300} /></View>
        {isLocked ? <TouchableOpacity onPress={() => router.push('/hotel/subscriptions')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.amber100 }}><Lock size={11} color={colors.amber700} /><Text style={{ fontSize: 11, fontWeight: '700', color: colors.amber700 }}>Unlock</Text></TouchableOpacity>
        : booking.userId?.phone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity accessibilityLabel="Chat on WhatsApp" onPress={() => Linking.openURL(whatsAppLink(booking.userId.phone, enquiryMessage(booking.userId?.name, booking.propertyId?.propertyName || booking.propertyId?.name))).catch(() => {})} style={{ padding: 8, borderRadius: 999, backgroundColor: '#E7F8EE' }}>
              <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={WHATSAPP_PATH} fill="#25D366" /></Svg>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Call" onPress={() => Linking.openURL(`tel:${booking.userId.phone}`)} style={{ padding: 8, borderRadius: 999, backgroundColor: colors.green50 }}><Phone size={14} color={colors.green600} /></TouchableOpacity>
          </View>
        ) : null}
      </View>
      {isLocked ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Lock size={12} color={colors.amber600} /><Text style={{ fontSize: 11, color: colors.amber700 }}>Contact locked • Active subscription required</Text></View> : null}
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.gray700 }}>{booking.propertyId?.propertyName || booking.propertyId?.name || 'Property'} • <Text style={{ fontSize: 13, color: colors.gray500 }}>{pType}</Text>{booking.propertyId?.propertyCode ? <Text style={{ fontSize: 12, color: colors.gray400 }}> • {booking.propertyId.propertyCode}</Text> : null}</Text>
      {isPG ? (
        sharing
          ? <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Users size={13} color="#7C3AED" /><Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>{sharing}</Text></View>
          : booking.propertySharingOptions?.length
            ? <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Users size={13} color={colors.gray500} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray600 }}>{booking.propertySharingOptions.join(', ')}</Text></View>
            : <Text style={{ fontSize: 11, color: colors.gray400 }}>Sharing: Not selected</Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Meta Icon={Calendar} text={`${fmt(booking.checkInDate || booking.checkIn || booking.inquiryMetadata?.preferredDate)}${!isBuyPlot ? ` - ${fmt(booking.checkOutDate || booking.checkOut)}` : ''}`} />
        {!isBuyPlot ? <Meta Icon={Clock} text={duration} /> : null}
        <Meta Icon={User} text={isBuyPlot ? '1 Person' : `${guestCount} ${secondary}s`} />
        {!isBuyPlot ? <Meta Icon={BedDouble} text={`1 ${unit}`} /> : null}
      </View>
    </TouchableOpacity>
  );
};

export default function PartnerBookings() {
  const router = useRouter();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [valid, setValid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (silent) => {
    try {
      if (!silent) setLoading(true);
      const data = await bookingService.getPartnerBookings(tab);
      setBookings(Array.isArray(data) ? data : data?.bookings || []);
      if (data && typeof data.hasValidSubscription === 'boolean') setValid(data.hasValidSubscription);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.slate900, marginBottom: 12 }}>Enquiries</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.id ? P : 'transparent' }}>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: tab === t.id ? P : colors.gray400 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={[{ padding: 16, gap: 12, flexGrow: 1 }, CENTER]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}>
        {!valid ? (
          <View style={{ backgroundColor: colors.amber50, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Crown size={22} color={colors.amber600} /><Text style={{ fontWeight: '800', color: '#78350F' }}>Unlock Your Customer Leads</Text></View>
            <Text style={{ fontSize: 12, color: colors.amber700, lineHeight: 18 }}>You have enquiries from interested customers. Get an active subscription to access verified phone numbers, direct calls, and close bookings faster!</Text>
            <TouchableOpacity onPress={() => router.push('/hotel/subscriptions')} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.amber600, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>View Plans</Text><ChevronRight size={15} color="#fff" /></TouchableOpacity>
          </View>
        ) : null}
        {loading ? <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color={P} size="large" /></View>
        : bookings.length > 0 ? bookings.map((b, i) => <BookingCard key={b._id || i} booking={b} />)
        : <View style={{ alignItems: 'center', paddingVertical: 60 }}><BedDouble size={32} color={colors.gray300} style={{ marginBottom: 8 }} /><Text style={{ color: colors.gray400, fontWeight: '500' }}>No {tab.replace('_', ' ')} enquiries found</Text></View>}
      </ScrollView>
    </View>
  );
}
