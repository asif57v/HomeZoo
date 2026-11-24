import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { Text } from '../src/components/ui';
import { BlueHeader } from '../src/components/Common';
import PropertyCard from '../src/components/PropertyCard';
import ResponsiveGrid from '../src/components/ResponsiveGrid';
import { userService } from '../src/services/apiService';
import toast from '../src/store/toastStore';
import { colors } from '../src/theme';
import { CENTER_WIDE } from '../src/lib/responsive';

export default function SavedPlaces() {
  const router = useRouter();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (silent) => {
    try { if (!silent) setLoading(true); const r = await userService.getSavedHotels(); setSaved(r.savedHotels || []); }
    catch { toast.error('Failed to load saved places'); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="Wishlist" right={<TouchableOpacity onPress={() => router.push({ pathname: '/reels', params: { tab: 'saved' } })} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Saved Reels →</Text></TouchableOpacity>}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>Your Favorites</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Properties and reels you have saved.</Text>
      </BlueHeader>
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 24, flexGrow: 1 }, CENTER_WIDE]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}>
        {loading ? <View style={{ paddingVertical: 80, alignItems: 'center' }}><ActivityIndicator size="large" color={colors.surface} /></View>
        : saved.length > 0 ? <ResponsiveGrid gap={24}>{saved.map((h) => <PropertyCard key={h._id || h.id} data={h} isSaved />)}</ResponsiveGrid>
        : (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Heart size={48} color={colors.gray300} style={{ marginBottom: 8 }} />
            <Text style={{ color: colors.gray500, fontWeight: '700' }}>Your wishlist is empty.</Text>
            <Text style={{ fontSize: 12, color: colors.gray400, marginTop: 4 }}>Start exploring and save your favorites!</Text>
            <TouchableOpacity onPress={() => router.push('/search')} style={{ marginTop: 24, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Explore Properties</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
