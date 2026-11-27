import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BadgeCheck, MapPin, User, Building2, CalendarDays } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import PropertyCard from '../../src/components/PropertyCard';
import ResponsiveGrid from '../../src/components/ResponsiveGrid';
import { propertyService, userService } from '../../src/services/apiService';
import { storage } from '../../src/lib/storage';
import { colors } from '../../src/theme';
import { CENTER_WIDE } from '../../src/lib/responsive';

const P = '#005CA8';
const TYPE_LABEL = { pg: 'PG', hostel: 'Hostel', rent: 'Rent', buy: 'Buy', plot: 'Plot', hotel: 'Hotel', villa: 'Villa', resort: 'Resort', homestay: 'Homestay' };
const typeLabel = (t) => TYPE_LABEL[String(t || '').toLowerCase()] || (t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : 'Other');
const typeOf = (p) => String(p.propertyType || 'other').toLowerCase();

// Public profile of a Top Rated Partner: who they are and every live listing they posted
export default function PartnerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [partner, setPartner] = useState(null);
  const [properties, setProperties] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState('all');

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, list, saved] = await Promise.all([
        propertyService.getPartnerProfile(id),
        propertyService.getPublic({ partner: id }),
        storage.getItem('token') ? userService.getSavedHotels().catch(() => null) : Promise.resolve(null),
      ]);
      setPartner(p);
      setProperties(Array.isArray(list) ? list : list?.properties || []);
      setSavedIds((saved?.savedHotels || []).map((h) => (typeof h === 'object' ? h._id : h)));
    } catch (e) {
      setError(e?.message || 'Partner not found');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const types = useMemo(() => {
    const counts = {};
    properties.forEach((p) => { counts[typeOf(p)] = (counts[typeOf(p)] || 0) + 1; });
    return Object.entries(counts);
  }, [properties]);
  const shown = type === 'all' ? properties : properties.filter((p) => typeOf(p) === type);

  const place = [partner?.address?.city, partner?.address?.state].filter(Boolean).join(', ');
  const since = partner?.partnerSince ? new Date(partner.partnerSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
        <TouchableOpacity accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 8 }}>
          <ArrowLeft size={22} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.gray900 }}>Partner Profile</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={P} /></View>
      ) : error || !partner ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray600, textAlign: 'center' }}>{error || 'Partner not found'}</Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: P }}><Text style={{ color: '#fff', fontWeight: '700' }}>Go Home</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[{ padding: 16, paddingBottom: 48 }, CENTER_WIDE]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[P]} tintColor={P} />}
        >
          {/* Profile */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.gray100, padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, overflow: 'hidden', borderWidth: 2, borderColor: P, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }}>
                {partner.profileImage ? <Image source={{ uri: partner.profileImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <User size={30} color={colors.gray400} />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: colors.gray900, flexShrink: 1 }}>{partner.name}</Text>
                  {partner.isVerified ? <BadgeCheck size={18} color={P} /> : null}
                </View>
                {partner.plan?.name ? <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#EFF6FF' }}><Text style={{ fontSize: 11, fontWeight: '700', color: P }}>{partner.plan.name}</Text></View> : null}
                {place ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MapPin size={12} color={colors.gray500} /><Text style={{ fontSize: 12, color: colors.gray500 }}>{place}</Text></View> : null}
                {since ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><CalendarDays size={12} color={colors.gray500} /><Text style={{ fontSize: 12, color: colors.gray500 }}>Partner since {since}</Text></View> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[['LISTINGS', String(properties.length)], ['EXPERIENCE', `${partner.experienceYears || 0}+ Yrs`]].map(([k, v]) => (
                <View key={k} style={{ flex: 1, backgroundColor: colors.gray50, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5 }}>{k}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.gray900 }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Listings */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 }}>
            <Building2 size={18} color={colors.gray700} />
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.gray900, flexShrink: 1 }}>Properties by {partner.name}</Text>
          </View>

          {types.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
              {[['all', properties.length], ...types].map(([k, n]) => {
                const on = type === k;
                return (
                  <TouchableOpacity key={k} onPress={() => setType(k)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: on ? P : colors.gray200, backgroundColor: on ? P : '#fff' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : colors.gray600 }}>{k === 'all' ? 'All' : typeLabel(k)} ({n})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {shown.length === 0
            ? <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 32, alignItems: 'center' }}><Text style={{ color: colors.gray500, fontWeight: '600' }}>No live properties right now.</Text></View>
            : <ResponsiveGrid gap={20}>{shown.map((p) => <PropertyCard key={p._id} property={p} isSaved={savedIds.includes(p._id)} source={`Partner profile · ${partner.name}`} />)}</ResponsiveGrid>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
