import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Briefcase, Wallet, Building2, Star, Plus, ChevronRight, MapPin, AlertCircle, UserCheck } from 'lucide-react-native';
import { Text } from '../ui';
import { PartnerHeader } from './PartnerKit';
import { hotelService, bookingService, reviewService } from '../../services/apiService';
import walletService from '../../services/walletService';
import useAuthStore from '../../store/authStore';
import { handleNavigateToAddProperty } from '../../utils/subscriptionGuard';
import toast from '../../store/toastStore';
import { inr } from '../../utils/format';
import { colors } from '../../theme';

const P = '#005CA8';

// Web: shadow-[0_1px_3px_rgba(15,23,42,0.04)]
const SOFT = { shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 };

const Stat = ({ Icon, label, value, actionLabel, onPress, valueColor }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ width: '48%', backgroundColor: '#fff', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, ...SOFT }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={P} /></View>
      <Text style={{ flex: 1, fontSize: 12, lineHeight: 16, color: colors.gray500, fontWeight: '500' }}>{label}</Text>
    </View>
    <Text style={{ marginTop: 10, fontSize: 24, lineHeight: 30, fontWeight: '700', color: valueColor || colors.gray900, letterSpacing: -0.3 }}>{value}</Text>
    <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 12, fontWeight: '600', color: P }}>{actionLabel}</Text><ChevronRight size={13} color={P} /></View>
  </TouchableOpacity>
);

const Card = ({ title, onAll, children }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden', ...SOFT }}>
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontWeight: '600', color: colors.gray900, fontSize: 17, letterSpacing: -0.2 }}>{title}</Text>
      <TouchableOpacity onPress={onAll} style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 12, fontWeight: '600', color: P }}>View All</Text><ChevronRight size={14} color={P} /></TouchableOpacity>
    </View>
    {children}
  </View>
);

// Web RecentBookingsTable status chips
const statusStyle = (s) => (
  s === 'confirmed' || s === 'checked_in' ? ['#DCFCE7', '#15803D']
    : s === 'pending' || s === 'awaiting_payment' ? ['#FEF9C3', '#A16207']
      : s === 'cancelled' || s === 'rejected' ? ['#FEE2E2', '#B91C1C']
        : s === 'completed' || s === 'checked_out' ? ['#DBEAFE', '#1D4ED8']
          : ['transparent', colors.gray500]
);

export default function PartnerDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState({ totalBookings: 0, walletBalance: 0, activeProperties: 0, pendingReviews: 0, bookingsThisWeek: 0 });
  const [recent, setRecent] = useState([]);
  const [activeList, setActiveList] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [propertiesData, bookingsData, walletData, reviewStats] = await Promise.all([
        hotelService.getMyHotels(), bookingService.getPartnerBookings(), walletService.getWallet(),
        reviewService.getPartnerStats().catch(() => ({ pendingReviews: 0 })),
      ]);
      const properties = propertiesData.properties || [];
      const active = properties.filter((p) => p.status === 'approved' && p.isLive);
      setActiveList(active.slice(0, 5));
      const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings || [];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const acts = [];
      const today = new Date().toISOString().split('T')[0];
      const pendingCheckIns = bookings.filter((b) => { const ci = b.checkInDate || b.checkIn; return ci && new Date(ci).toISOString().split('T')[0] === today && b.bookingStatus === 'confirmed'; });
      if (pendingCheckIns.length > 0) acts.push({ type: 'check-in', title: 'Pending Check-ins', description: `${pendingCheckIns.length} guests arriving today.`, link: '/hotel/bookings' });
      if (user?.partnerApprovalStatus === 'rejected') acts.push({ type: 'alert', title: 'Document Rejected', description: 'Your KYC documents were rejected. Please support.', link: '/hotel/kyc', urgent: true });
      setStats({ totalBookings: bookings.length, walletBalance: walletData.wallet?.balance || 0, activeProperties: active.length, pendingReviews: reviewStats?.pendingReviews || 0, bookingsThisWeek: bookings.filter((b) => new Date(b.createdAt) > weekAgo).length });
      setRecent(bookings.slice(0, 5)); setActions(acts);
    } catch { toast.error('Could not load dashboard data'); } finally { setLoading(false); setRefreshing(false); }
  }, [user?.partnerApprovalStatus]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.gray50 }}><PartnerHeader /><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={P} /></View></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, lineHeight: 30, fontWeight: '700', color: colors.slate900, letterSpacing: -0.3 }}>Welcome back, {user?.name?.split(' ')[0] || 'Partner'}! 👋</Text>
            <Text style={{ color: colors.gray500, marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: '400' }}>Here's what's happening with your properties today.</Text>
          </View>
          <TouchableOpacity onPress={() => handleNavigateToAddProperty(router)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}><Plus size={16} color="#fff" /><Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Add Property</Text></TouchableOpacity>
        </View>

        {actions.length > 0 ? (
          <View>
            <Text style={{ fontWeight: '700', color: colors.gray900, marginBottom: 10, paddingHorizontal: 4 }}>Action Required</Text>
            <View style={{ gap: 8 }}>
              {actions.map((a, i) => (
                <TouchableOpacity key={i} onPress={() => router.push(a.link)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: a.urgent ? colors.red100 : colors.orange100, backgroundColor: a.urgent ? colors.red50 : colors.orange50 }}>
                  {/* Web: icon box red-100/orange-100 with red-600/orange-600; title red-800/orange-900; text red-600/orange-700 */}
                  <View style={{ padding: 10, borderRadius: 12, backgroundColor: a.urgent ? colors.red100 : colors.orange100 }}>{a.type === 'check-in' ? <UserCheck size={24} color={a.urgent ? colors.red600 : '#EA580C'} /> : <AlertCircle size={24} color={a.urgent ? colors.red600 : '#EA580C'} />}</View>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: a.urgent ? '#991B1B' : '#7C2D12' }}>{a.title}</Text><Text style={{ fontSize: 13, color: a.urgent ? colors.red600 : '#C2410C' }}>{a.description}</Text></View>
                  <View style={{ backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, ...SOFT }}><Text style={{ fontSize: 13, fontWeight: '700', color: a.urgent ? colors.red600 : '#EA580C' }}>Fix Now</Text></View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          <Stat Icon={Briefcase} label="Total Enquiries" value={stats.totalBookings} actionLabel="View all" onPress={() => router.push('/hotel/bookings')} />
          <Stat Icon={Wallet} label="Wallet Balance" value={inr(stats.walletBalance)} valueColor={stats.walletBalance < 0 ? colors.red600 : undefined} actionLabel="Withdraw" onPress={() => router.push('/hotel/wallet')} />
          <Stat Icon={Building2} label="Active Properties" value={stats.activeProperties} actionLabel="Manage" onPress={() => router.push('/hotel/properties')} />
          <Stat Icon={Star} label="Pending Reviews" value={stats.pendingReviews} actionLabel="Reply" onPress={() => router.push('/hotel/reviews')} />
        </View>

        {activeList.length > 0 ? (
          <Card title="Active Properties" onAll={() => router.push('/hotel/properties')}>
            {activeList.map((p) => {
              const loc = [p.address?.city, p.address?.state].filter(Boolean).join(', ');
              return (
                <TouchableOpacity key={p._id} onPress={() => router.push('/hotel/properties')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray50 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(0,92,168,0.05)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {p.coverImage ? <Image source={{ uri: p.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Building2 size={22} color="rgba(0,92,168,0.6)" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.gray900, fontSize: 15 }}>{p.propertyName || 'Property'}</Text>
                    {loc ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><MapPin size={12} color={colors.gray400} /><Text numberOfLines={1} style={{ fontSize: 12, color: colors.gray500, flex: 1 }}>{loc}</Text></View> : null}
                    <Text style={{ marginTop: 4, fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 0.8 }}>{(p.propertyType || '').toUpperCase()}</Text>
                  </View>
                  <View style={{ backgroundColor: colors.green100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.green700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Live</Text></View>
                </TouchableOpacity>
              );
            })}
          </Card>
        ) : null}

        {recent.length > 0 ? (
          <Card title="Recent Enquiries" onAll={() => router.push('/hotel/bookings')}>
            {recent.map((b) => {
              const t = (b.propertyId?.propertyType || b.propertyType || '').toLowerCase();
              const inquiry = ['buy', 'plot', 'rent', 'pg', 'hostel'].includes(t) || b.isInquiry;
              const [bg, fg] = statusStyle(b.bookingStatus);
              const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              return (
                <TouchableOpacity key={b._id} onPress={() => router.push(`/hotel/bookings/${b._id}`)} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View><Text style={{ fontWeight: '700', color: colors.gray900, fontSize: 14 }}>{b.userId?.name || b.guestName || 'Guest'}</Text><Text style={{ fontSize: 12, color: colors.gray500 }}>{b.userId?.phone || b.guestPhone?.substring(0, 10) || 'No Phone'}</Text></View>
                    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}><Text style={{ fontSize: 10, fontWeight: '700', color: fg }}>{(b.bookingStatus === 'checked_in' ? 'ONGOING' : b.bookingStatus === 'checked_out' ? 'COMPLETED' : (b.bookingStatus || '')).toString().toUpperCase()}</Text></View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.gray700 }}>{b.propertyId?.propertyName || b.property?.name || 'Property'}</Text>
                      {t ? <View style={{ alignSelf: 'flex-start', backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginVertical: 3 }}><Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '500', textTransform: 'uppercase' }}>{t}</Text></View> : null}
                      <Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '500' }}>{inquiry ? `Inquiry: ${fmt(b.createdAt)}` : `${fmt(b.checkInDate || b.checkIn)} - ${fmt(b.checkOutDate || b.checkOut)}`}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: colors.gray900 }}>₹{(inquiry ? b.inquiryMetadata?.budget || 0 : b.totalAmount || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}
