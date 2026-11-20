import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Plus, MapPin, Pencil, Eye, Trash2, Lock, FileClock } from 'lucide-react-native';
import { Text, Sheet } from '../../../src/components/ui';
import { PartnerHeader } from '../../../src/components/partner/PartnerKit';
import { propertyService } from '../../../src/services/apiService';
import { handleNavigateToAddProperty } from '../../../src/utils/subscriptionGuard';
import { setWizardParams } from '../../../src/lib/wizardState';
import toast from '../../../src/store/toastStore';
import { errMsg } from '../../../src/utils/format';
import { colors } from '../../../src/theme';

const P = '#005CA8';

export default function PartnerProperties() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [byType, setByType] = useState({});
  const [drafts, setDrafts] = useState([]);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState('All');

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true); setError('');
    try {
      const res = await propertyService.getMy();
      const grouped = {};
      (res.properties || []).forEach((p) => { const t = p.propertyType || 'other'; (grouped[t] = grouped[t] || []).push(p); });
      setByType(grouped); setDrafts(res.drafts || []);
    } catch (e) { setError(errMsg(e, 'Failed to load properties')); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const edit = (property) => {
    setWizardParams({ property, categoryName: property.dynamicCategory?.displayName });
    const t = property.propertyType;
    if (t === 'pg') router.push('/hotel/join-pg');
    else if (['hotel', 'tent', 'villa', 'hostel', 'resort', 'homestay'].includes(t) && !property.dynamicCategory) toast.error('Editing this listing type is available on the web partner panel.');
    else if (property.dynamicCategory) router.push(`/hotel/join-dynamic/${typeof property.dynamicCategory === 'object' ? property.dynamicCategory._id : property.dynamicCategory}`);
  };

  const del = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await propertyService.delete(toDelete._id);
      const next = { ...byType }; const t = toDelete.propertyType || 'other';
      if (next[t]) { next[t] = next[t].filter((p) => p._id !== toDelete._id); if (next[t].length === 0) delete next[t]; }
      setByType(next); setDrafts((p) => p.filter((p2) => p2._id !== toDelete._id)); setToDelete(null);
    } catch (e) { toast.error(errMsg(e, 'Failed to delete property')); } finally { setDeleting(false); }
  };

  const sections = Object.entries(byType);
  const shown = filter === 'All' ? sections : sections.filter(([t]) => t === filter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View><Text style={{ fontSize: 20, fontWeight: '900', color: colors.slate900 }}>My Properties</Text><Text style={{ fontSize: 12, color: colors.gray500 }}>Manage your listings</Text></View>
          <TouchableOpacity onPress={() => handleNavigateToAddProperty(router)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}><Plus size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text></TouchableOpacity>
        </View>

        {drafts.length > 0 ? (
          <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 16, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><FileClock size={16} color={P} /><Text style={{ fontWeight: '700', color: colors.slate900, fontSize: 14 }}>Continue where you left off</Text></View>
            {drafts.map((d) => (
              <View key={d._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#DBEAFE', padding: 12 }}>
                <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: '700', color: colors.slate900, fontSize: 14 }}>{d.propertyName || 'Untitled draft'}</Text><Text style={{ fontSize: 11, color: colors.gray500 }}>{(d.propertyType || '').toUpperCase()} · Draft</Text></View>
                <TouchableOpacity onPress={() => edit(d)} style={{ backgroundColor: P, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Resume</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setToDelete(d)} style={{ padding: 6 }}><Trash2 size={14} color={colors.red500} /></TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {sections.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['All', ...Object.keys(byType)].map((f) => {
              const name = f === 'All' ? 'All Properties' : byType[f][0]?.dynamicCategory?.displayName || f.toUpperCase();
              return <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: filter === f ? P : '#fff', borderWidth: 1, borderColor: filter === f ? P : colors.gray200 }}><Text style={{ fontSize: 12, fontWeight: '700', color: filter === f ? '#fff' : colors.gray600 }}>{name}</Text></TouchableOpacity>;
            })}
          </ScrollView>
        ) : null}

        {error ? <View style={{ backgroundColor: colors.red50, padding: 12, borderRadius: 12 }}><Text style={{ color: colors.red600, fontSize: 13 }}>{error}</Text></View> : null}
        {loading ? <View style={{ paddingVertical: 50, alignItems: 'center', gap: 8 }}><ActivityIndicator color={P} /><Text style={{ color: colors.gray500, fontSize: 13 }}>Loading properties...</Text></View> : null}
        {!loading && sections.length === 0 ? <Text style={{ textAlign: 'center', color: colors.gray500, paddingVertical: 40 }}>No properties found. Start by adding your first property.</Text> : null}

        {shown.map(([type, list]) => (
          <View key={type} style={{ gap: 12 }}>
            <View><Text style={{ fontSize: 14, fontWeight: '800', color: colors.gray800, letterSpacing: 0.6 }}>{list[0]?.dynamicCategory?.displayName || type.toUpperCase()}</Text><Text style={{ fontSize: 11, color: colors.gray400 }}>{list.length} {list.length === 1 ? 'property' : 'properties'}</Text></View>
            {list.map((p) => (
              <View key={p._id} style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: colors.partnerBorder, borderLeftWidth: 5, borderLeftColor: P, overflow: 'hidden', shadowColor: '#005CA8', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
                <View style={{ height: 150, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }}>
                  {p.coverImage ? <Image source={{ uri: p.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ color: colors.gray400 }}>No Image</Text>}
                  <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: p.status === 'published' ? colors.green100 : colors.amber100, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '700', color: p.status === 'published' ? colors.green700 : colors.amber700 }}>{p.status === 'published' ? 'Active' : p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Pending'}</Text></View>
                </View>
                <View style={{ padding: 14, gap: 4 }}>
                  {p.propertyCode ? <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1 }}>PROPERTY ID: {p.propertyCode}</Text> : null}
                  <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 16, color: colors.gray900 }}>{p.propertyName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MapPin size={14} color={colors.gray400} /><Text style={{ fontSize: 12, color: colors.gray500 }}>{p.address?.city || 'Unknown City'}, {p.address?.state || ''}</Text></View>
                  <Text numberOfLines={2} style={{ fontSize: 12, color: colors.gray500, marginTop: 2 }}>{p.shortDescription || 'No description provided'}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => edit(p)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.blue50 }}><Pencil size={14} color={P} /><Text style={{ fontSize: 12, fontWeight: '700', color: P }}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push(`/hotel/properties/${p._id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.gray100 }}><Eye size={14} color={colors.gray700} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray700 }}>Details</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setToDelete(p)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.red50 }}><Trash2 size={14} color={colors.red600} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.red600 }}>Delete</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <Sheet visible={!!toDelete} onClose={() => !deleting && setToDelete(null)}>
        <View style={{ padding: 24, gap: 8 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.red50, alignItems: 'center', justifyContent: 'center' }}><Trash2 size={24} color={colors.red600} /></View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.gray900 }}>Delete Property?</Text>
          <Text style={{ fontSize: 13, color: colors.gray500, lineHeight: 19 }}>Are you sure you want to delete <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray800 }}>{toDelete?.propertyName}</Text>? This action cannot be undone and will delete all associated rooms and data.</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity disabled={deleting} onPress={() => setToDelete(null)} style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.gray100, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: colors.gray700 }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity disabled={deleting} onPress={del} style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.red600, alignItems: 'center' }}>{deleting ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '700', color: '#fff' }}>Delete</Text>}</TouchableOpacity>
          </View>
        </View>
      </Sheet>
    </View>
  );
}
