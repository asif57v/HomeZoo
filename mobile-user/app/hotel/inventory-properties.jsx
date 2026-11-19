import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Building2, MapPin, CalendarDays } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import { propertyService } from '../../src/services/apiService';
import { errMsg } from '../../src/utils/format';
import { colors } from '../../src/theme';

const P = '#005CA8';

export default function PartnerInventoryProperties() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [byType, setByType] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const res = await propertyService.getMy();
        const g = {}; (res.properties || []).forEach((p) => { const t = p.propertyType || 'other'; (g[t] = g[t] || []).push(p); });
        setByType(g);
      } catch (e) { setError(errMsg(e, 'Failed to load properties')); } finally { setLoading(false); }
    })();
  }, []);
  const sections = Object.entries(byType);
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Manage Inventory" subtitle="Select a property to update availability" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Building2 size={14} color={colors.gray500} /><Text style={{ fontSize: 13, fontWeight: '800', color: colors.gray600 }}>My Properties</Text></View>
        {error ? <View style={{ backgroundColor: colors.red50, padding: 12, borderRadius: 12 }}><Text style={{ color: colors.red600, fontSize: 13 }}>{error}</Text></View> : null}
        {loading ? <View style={{ paddingVertical: 50, alignItems: 'center', gap: 8 }}><ActivityIndicator color={P} /><Text style={{ color: colors.gray500, fontSize: 13 }}>Loading properties...</Text></View> : null}
        {!loading && sections.length === 0 ? <Text style={{ textAlign: 'center', color: colors.gray500, paddingVertical: 40 }}>No properties found to manage.</Text> : null}
        {sections.map(([type, list]) => (
          <View key={type} style={{ gap: 10 }}>
            <View><Text style={{ fontSize: 13, fontWeight: '800', color: colors.gray800 }}>{type.toUpperCase()}</Text><Text style={{ fontSize: 11, color: colors.gray400 }}>{list.length} properties</Text></View>
            {list.map((p) => (
              <TouchableOpacity key={p._id} activeOpacity={0.9} onPress={() => router.push(`/hotel/inventory/${p._id}`)} style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 12, flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: colors.gray100, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>{p.coverImage ? <Image source={{ uri: p.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ fontSize: 10, color: colors.gray400 }}>No Image</Text>}</View>
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View><Text numberOfLines={1} style={{ fontWeight: '800', color: colors.gray900, fontSize: 15 }}>{p.propertyName}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MapPin size={12} color={colors.gray400} /><Text numberOfLines={1} style={{ fontSize: 12, color: colors.gray500, flex: 1 }}>{p.address?.city || 'Unknown City'}, {p.address?.state || ''}</Text></View></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase' }}>{p.status}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blue50, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}><CalendarDays size={14} color={P} /><Text style={{ fontSize: 11, fontWeight: '700', color: P }}>Manage Inventory</Text></View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
