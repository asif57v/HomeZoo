import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BedDouble, Landmark, Home, TreePine, ArrowLeft, ChevronRight, X } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { categoryService } from '../../src/services/categoryService';
import subscriptionService from '../../src/services/subscriptionService';
import { useFeatureFlags } from '../../src/store/featureFlagsStore';
import { evaluateSubscriptionCanAddProperty } from '../../src/utils/subscriptionGuard';
import { setWizardParams } from '../../src/lib/wizardState';
import toast from '../../src/store/toastStore';
import { colors } from '../../src/theme';

const OPTIONS = [
  { key: 'pg-coliving', label: 'PG/Co-living', description: 'Long-stay beds or rooms with shared facilities', badge: 'Long Term', Icon: BedDouble, tone: ['#FAF5FF', '#9333EA'] }, // web: bg-purple-50 text-purple-600
  { key: 'rent', label: 'Rent', description: 'List your property for rent', badge: 'Rental', Icon: Home, tone: ['#ECFEFF', '#0891B2'] },
  { key: 'buy', label: 'Sell', description: 'List your property for sale', badge: 'Sale', Icon: Landmark, tone: ['#EFF6FF', '#2563EB'] },
  { key: 'plot', label: 'Plot', description: 'List land or plot', badge: 'Land', Icon: TreePine, tone: ['#FFFBEB', '#D97706'] },
];

export default function PartnerJoinPropertyType() {
  const router = useRouter();
  const { subscriptionEnabled } = useFeatureFlags();
  const [types, setTypes] = useState(OPTIONS.map((o) => ({ ...o, route: null })));
  const [subscription, setSubscription] = useState(null);
  const [freeTrial, setFreeTrial] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const subRes = await subscriptionService.getCurrentSubscription();
        if (!mounted) return;
        if (subRes?.subscription) setSubscription(subRes.subscription);
        if (subRes?.freeTrial) setFreeTrial(subRes.freeTrial);
        const check = evaluateSubscriptionCanAddProperty({ ...subRes, subscription: subRes?.subscription, freeTrial: subRes?.freeTrial, subscriptionEnabled });
        if (!check.canAdd) {
          toast.error(check.message, { duration: 4000 });
          router.replace({ pathname: '/hotel/subscriptions', params: { reason: check.reason, alertMessage: check.message } });
          return;
        }
      } catch {} finally { if (mounted) setChecking(false); }
    })();
    return () => { mounted = false; };
  }, [subscriptionEnabled]);

  useEffect(() => {
    (async () => {
      try {
        const cats = await categoryService.getActiveCategories();
        const find = (names) => { const l = Array.isArray(names) ? names : [names]; return cats.find((c) => l.some((n) => (c.displayName || '').toLowerCase() === n.toLowerCase() || (c.name || '').toLowerCase() === n.toLowerCase())); };
        const pg = find(['hostel', 'pg', 'pg/co-living']); const rent = find('Rent'); const buy = find('Buy'); const plot = find(['Plot', 'Plots']);
        setTypes([
          { ...OPTIONS[0], route: '/hotel/join-pg', categoryId: pg?._id },
          { ...OPTIONS[1], route: rent ? `/hotel/join-dynamic/${rent._id}` : null, categoryId: rent?._id },
          { ...OPTIONS[2], route: buy ? `/hotel/join-dynamic/${buy._id}` : null, categoryId: buy?._id },
          { ...OPTIONS[3], route: plot ? `/hotel/join-dynamic/${plot._id}` : null, categoryId: plot?._id },
        ]);
      } catch { setTypes(OPTIONS.map((o, i) => ({ ...o, route: i === 0 ? '/hotel/join-pg' : null }))); }
    })();
  }, []);

  const select = (item) => {
    if (!item.route) return;
    const check = evaluateSubscriptionCanAddProperty({ subscription, freeTrial, subscriptionEnabled });
    if (!check.canAdd) { toast.error(check.message, { duration: 4000 }); router.push({ pathname: '/hotel/subscriptions', params: { reason: check.reason, alertMessage: check.message } }); return; }
    setWizardParams({ categoryName: item.label, categoryId: item.categoryId });
    router.push(item.route);
  };

  if (checking) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50 }}><ActivityIndicator size="large" color="#005CA8" /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
        <View style={{ height: 64, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 8 }}><ArrowLeft size={20} color={colors.gray600} /></TouchableOpacity>
          <Text style={{ fontWeight: '700', fontSize: 18, color: colors.gray800 }}>Select Property Type</Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={{ padding: 8 }}><X size={20} color={colors.gray600} /></TouchableOpacity>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
        <View style={{ marginBottom: 8 }}><Text style={{ fontSize: 24, fontWeight: '700', color: colors.gray900 }}>What keeps you busy?</Text><Text style={{ color: colors.gray500, fontSize: 14 }}>Select the type of property you want to list on HoomZo.</Text></View>
        {types.map((it) => (
          <TouchableOpacity key={it.key} disabled={!it.route} onPress={() => select(it)} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 16, paddingRight: 36, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 20, opacity: it.route ? 1 : 0.6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: it.tone[0], alignItems: 'center', justifyContent: 'center' }}><it.Icon size={24} color={it.tone[1]} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.gray900, marginBottom: 2 }}>{it.label}</Text>
              <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 8 }}>{it.description}</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{it.badge}</Text></View>
            </View>
            <ChevronRight size={16} color={colors.gray300} style={{ position: 'absolute', top: 16, right: 16 }} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
