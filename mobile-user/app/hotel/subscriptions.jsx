import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, ShieldCheck, Package, Crown, Zap, Star, AlertCircle, Check, CalendarDays, Home, Users, TrendingUp, Sparkles, ArrowRight } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import subscriptionService from '../../src/services/subscriptionService';
import paymentService from '../../src/services/paymentService';
import useFeatureFlagsStore, { RAZORPAY_UNAVAILABLE_MESSAGE } from '../../src/store/featureFlagsStore';
import useAuthStore from '../../src/store/authStore';
import toast from '../../src/store/toastStore';
import { errMsg } from '../../src/utils/format';
import { colors } from '../../src/theme';

// Weight-based tier themes (same tiers as the web: silver 1x, gold basic 2x, gold 3x, platinum 4x, diamond 5x)
const THEMES = {
  diamond: { weight: 5, tierName: 'Diamond Elite', tagline: 'Maximum priority & city-level prominence', badge: '👑 MAX BOOST • VIP ELITE', Icon: Zap, border: '#D8B4FE', ring: '#9333EA', sheen: ['#d946ef', '#a855f7', '#4f46e5'], header: ['#1d072b', '#581c87'], bg: '#FAF5FF', accent: '#7E22CE', pill: '#F3E8FF', btn: ['#9333ea', '#c026d3'], btnText: '#fff', filled: '#9333ea' },
  platinum: { weight: 4, tierName: 'Platinum Plus', tagline: 'High volume growth with city banners', badge: '⚡ HIGH IMPACT • 4x BOOST', Icon: ShieldCheck, border: '#7DD3FC', ring: '#0284c7', sheen: ['#22d3ee', '#0ea5e9', '#2563eb'], header: ['#031d33', '#0284c7'], bg: '#F0F9FF', accent: '#0369A1', pill: '#E0F2FE', btn: ['#0284c7', '#4f46e5'], btnText: '#fff', filled: '#0ea5e9' },
  gold: { weight: 3, tierName: 'Professional Gold', tagline: 'Best value for high-inquiry partner listings', badge: '⭐ MOST POPULAR • 3x BOOST', Icon: Crown, border: '#FBBF24', ring: '#F59E0B', sheen: ['#facc15', '#fbbf24', '#eab308'], header: ['#261502', '#78350f'], bg: '#FFFBEB', accent: '#92400E', pill: '#FEF3C7', btn: ['#fbbf24', '#eab308'], btnText: '#1c1917', filled: '#f59e0b' },
  gold_basic: { weight: 2, tierName: 'Gold Basic', tagline: 'Accelerated inquiries & lead generation', badge: '🔥 FAST TRACK • 2x BOOST', Icon: Star, border: '#FDBA74', ring: '#F97316', sheen: ['#f59e0b', '#fb923c', '#d97706'], header: ['#2a1306', '#9a3412'], bg: '#FFF7ED', accent: '#9A3412', pill: '#FFEDD5', btn: ['#f59e0b', '#ea580c'], btnText: '#fff', filled: '#f97316' },
  silver: { weight: 1, tierName: 'Starter Silver', tagline: 'Essential presence with verified leads', badge: null, Icon: Package, border: '#CBD5E1', ring: '#0f172a', sheen: ['#94a3b8', '#e2e8f0', '#94a3b8'], header: ['#0f172a', '#334155'], bg: '#F8FAFC', accent: '#1E293B', pill: '#E2E8F0', btn: ['#0f172a', '#1e293b'], btnText: '#fff', filled: '#0f172a' },
};
export const themeFor = (plan) => {
  const tier = (plan?.tier || '').toLowerCase(); const name = (plan?.name || '').toLowerCase();
  let w = plan?.rankingWeight;
  if (!w || w < 1) { if (tier === 'diamond' || name.includes('diamond')) w = 5; else if (tier === 'platinum' || name.includes('platinum')) w = 4; else if (tier === 'gold' || (name.includes('gold') && !name.includes('basic'))) w = 3; else if (tier === 'gold_basic' || name.includes('basic') || name.includes('bronze')) w = 2; else w = 1; }
  return w >= 5 ? THEMES.diamond : w === 4 ? THEMES.platinum : w === 3 ? THEMES.gold : w === 2 ? THEMES.gold_basic : THEMES.silver;
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const Usage = ({ Icon, label, used, cap, color, finiteOnly }) => {
  const limited = cap > 0 || finiteOnly; const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon size={15} color={colors.gray500} /><Text style={{ fontSize: 13, fontWeight: '600', color: colors.gray700 }}>{label}</Text></View><Text style={{ fontWeight: '800', color: colors.gray900 }}>{used} <Text style={{ fontWeight: '500', color: colors.gray500 }}>/ {limited ? cap : '∞'}</Text></Text></View>
      <View style={{ height: 8, backgroundColor: colors.gray100, borderRadius: 4 }}><View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: color }} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 10, color: colors.gray400 }}>{limited ? `${pct}% utilized` : 'Unlimited quota'}</Text>{limited ? <Text style={{ fontSize: 10, color: colors.gray400 }}>{Math.max(0, cap - used)} remaining</Text> : null}</View>
    </View>
  );
};
const Feature = ({ theme, children, tag }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: theme.pill, alignItems: 'center', justifyContent: 'center' }}><Check size={11} color={theme.accent} strokeWidth={3} /></View>
    <Text style={{ flex: 1, fontSize: 13, color: colors.gray700 }}>{children}</Text>
    {tag ? <View style={{ backgroundColor: theme.pill, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 9, fontWeight: '800', color: theme.accent }}>{tag}</Text></View> : null}
  </View>
);

export default function PartnerSubscriptions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user) || {};
  const scrollRef = useRef(null);
  const plansY = useRef(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [freeTrial, setFreeTrial] = useState(null);

  const load = useCallback(async () => {
    try {
      const [plansData, subData] = await Promise.all([subscriptionService.getActivePlans(), subscriptionService.getCurrentSubscription()]);
      if (plansData.success) {
        const order = ['silver', 'gold_basic', 'gold', 'platinum', 'diamond'];
        setPlans([...plansData.plans].sort((a, b) => { const wa = a.rankingWeight || order.indexOf(a.tier) + 1; const wb = b.rankingWeight || order.indexOf(b.tier) + 1; return wa !== wb ? wa - wb : a.price - b.price; }));
      }
      if (subData.success) { setCurrentSub(subData.subscription); setFreeTrial(subData.freeTrial || null); }
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const purchase = async (plan) => {
    if (processing) return;
    if (!useFeatureFlagsStore.getState().razorpayEnabled) { toast.error(RAZORPAY_UNAVAILABLE_MESSAGE); return; }
    setProcessing(true);
    try {
      toast('Initializing payment...');
      const { order, key } = await subscriptionService.createSubscriptionOrder(plan._id);
      let r;
      try { r = await paymentService.openCheckout({ key, amount: order.amount, currency: order.currency, name: 'HoomZo Partner', description: `Subscription: ${plan.name}`, order_id: order.id, prefill: { name: user.name, email: user.email, contact: user.phone }, theme: { color: '#005CA8' } }); }
      catch (e) { toast.error(errMsg(e, 'Payment Failed')); return; }
      try {
        toast('Verifying payment...');
        const v = await subscriptionService.verifySubscription({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature, planId: plan._id });
        if (v.success) { toast.success('Subscription Activated!'); setCurrentSub(v.subscription); load(); } else toast.error('Verification Failed');
      } catch { toast.error('Payment verification failed'); }
    } catch (e) { toast.error(e?.response?.data?.message || errMsg(e, 'Failed to initiate purchase')); } finally { setProcessing(false); }
  };

  const expired = currentSub?.status === 'expired' || (currentSub?.expiryDate && new Date(currentSub.expiryDate) < new Date());
  const active = currentSub?.status === 'active' && !expired;
  const hasPaid = active && !!currentSub?.planId;
  const onFree = !hasPaid && !!freeTrial && !freeTrial.exhausted;
  const paidExpired = !!currentSub?.planId && expired;
  const activeTheme = currentSub?.planId ? themeFor(currentSub.planId) : null;
  const toPlans = () => scrollRef.current?.scrollTo({ y: plansY.current, animated: true });

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Subscription Plans" subtitle="Partner visibility boosters" />
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blue50, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginBottom: 8 }}><TrendingUp size={13} color="#005CA8" /><Text style={{ fontSize: 11, fontWeight: '800', color: '#005CA8' }}>Partner Visibility Boosters</Text></View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.slate900 }}>Subscription Plans</Text>
          <Text style={{ fontSize: 13, color: colors.gray500, marginTop: 4 }}>Rank higher in search results with weighted listing priority and verified leads.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray500 }}>Priority Weight:</Text><Text style={{ fontSize: 11, color: colors.gray600 }}>1x Silver → 3x Gold → 5x Diamond</Text></View>
        </View>

        {params.alertMessage && !onFree ? (
          <View style={{ backgroundColor: colors.amber50, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10 }}>
            <AlertCircle size={22} color={colors.amber600} />
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: '#78350F' }}>Subscription Required</Text><Text style={{ fontSize: 12, color: colors.amber700, marginTop: 2 }}>{String(params.alertMessage)}</Text><Text style={{ fontSize: 12, color: colors.amber700, marginTop: 4 }}>Choose one of the plans below to instantly activate or extend your listing allowance.</Text></View>
          </View>
        ) : null}

        {loading ? <View style={{ alignItems: 'center', paddingVertical: 50, gap: 8 }}><ActivityIndicator color="#005CA8" /><Text style={{ color: colors.gray500, fontSize: 13 }}>Loading subscription plans...</Text></View> : (<>
          {onFree ? (
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.green100, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.green50, alignItems: 'center', justifyContent: 'center' }}><Sparkles size={20} color={colors.green600} /></View><View><Text style={{ fontSize: 11, fontWeight: '700', color: colors.green600 }}>Free Plan Active — Your Current Plan</Text><Text style={{ fontSize: 18, fontWeight: '900', color: colors.gray900 }}>Free Starter Plan</Text></View></View>
              <Text style={{ fontSize: 12, color: colors.gray500 }}>Welcome to HoomZo! You get {freeTrial.propertiesLimit} free {freeTrial.propertiesLimit === 1 ? 'property listing' : 'property listings'} and {freeTrial.leadsLimit} free buyer leads.</Text>
              <Usage Icon={Home} label="Free Properties" used={freeTrial.propertiesUsed} cap={freeTrial.propertiesLimit} color={colors.emerald600} finiteOnly />
              <Usage Icon={Users} label="Free Buyer Leads" used={freeTrial.leadsUsed} cap={freeTrial.leadsLimit} color={colors.emerald600} finiteOnly />
              <TouchableOpacity onPress={toPlans} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.blue50, borderRadius: 12, padding: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}><Zap size={15} color="#005CA8" /><Text style={{ fontSize: 12, color: colors.gray700, flex: 1 }}>Want more reach? Upgrade to list more properties and rank higher.</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#005CA8' }}>View Plans</Text><ArrowRight size={14} color="#005CA8" /></View></TouchableOpacity>
            </View>
          ) : null}

          {!hasPaid && !onFree ? (
            <View style={{ backgroundColor: colors.amber50, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 20, padding: 18, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><AlertCircle size={24} color={colors.amber600} /><Text style={{ fontWeight: '900', color: '#78350F', fontSize: 15 }}>No Active Subscription</Text></View>
              <Text style={{ fontWeight: '700', color: '#78350F' }}>{paidExpired ? `Your ${currentSub.planId.name} expired on ${fmtDate(currentSub.expiryDate)}` : freeTrial?.exhausted ? 'Your free plan has been used up' : "You don't have a subscription yet"}</Text>
              <Text style={{ fontSize: 12, color: colors.amber700 }}>Subscribe to a plan to keep listing properties, receive buyer leads and get your listings ranked higher in search results.</Text>
              <TouchableOpacity onPress={toPlans} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.amber600, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Take a Subscription</Text><ArrowRight size={16} color="#fff" /></TouchableOpacity>
            </View>
          ) : null}

          {hasPaid ? (
            <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100 }}>
              <LinearGradient colors={activeTheme.header} style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ShieldCheck size={20} color="#fff" />
                <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Your Current Plan • Active Subscription</Text><Text style={{ fontSize: 20, fontWeight: '900', color: '#fff' }}>{currentSub.planId.name}</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}><TrendingUp size={12} color="#fff" /><Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{activeTheme.weight}x Boost</Text></View>
              </LinearGradient>
              <View style={{ padding: 18, gap: 12 }}>
                {currentSub.planId.description ? <Text style={{ fontSize: 12, color: colors.gray500 }}>{currentSub.planId.description}</Text> : null}
                <Usage Icon={Home} label="Properties Listed" used={currentSub.propertiesAdded} cap={currentSub.planId.maxProperties} color={activeTheme.filled} />
                <Usage Icon={Users} label="Monthly Buyer Leads" used={currentSub.leadsUsedThisMonth} cap={currentSub.planId.leadCap} color={activeTheme.filled} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.gray50, borderRadius: 12, padding: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CalendarDays size={15} color={colors.gray500} /><Text style={{ fontSize: 12, color: colors.gray600 }}>Plan Renewal Date</Text></View><Text style={{ fontWeight: '800', color: colors.gray900, fontSize: 13 }}>{fmtDate(currentSub.expiryDate)}</Text></View>
                <Text style={{ fontSize: 11, color: colors.gray400 }}>Upgrade anytime to boost your listing weight</Text>
              </View>
            </View>
          ) : null}

          <View onLayout={(e) => { plansY.current = e.nativeEvent.layout.y; }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}><Text style={{ fontSize: 18, fontWeight: '900', color: colors.gray900 }}>Available Plans</Text><Text style={{ fontSize: 11, color: colors.gray500 }}>{plans.length} options</Text></View>
            <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 12 }}>Select the tier and search ranking weight that best fits your portfolio.</Text>
            <View style={{ gap: 16 }}>
              {plans.map((plan) => {
                const th = themeFor(plan); const isCurrent = currentSub?.planId?._id === plan._id && active; const isMax = th.weight >= 5 || plan.tier === 'diamond'; const isSilver = th.weight === 1;
                return (
                  <View key={plan._id} style={{ backgroundColor: th.bg, borderRadius: 24, borderWidth: isCurrent ? 3 : 2, borderColor: isCurrent ? th.ring : th.border, overflow: 'hidden' }}>
                    <LinearGradient colors={th.sheen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 5 }} />
                    <View style={{ padding: 18, gap: 14 }}>
                      {th.badge && !isCurrent ? <View style={{ alignSelf: 'flex-start', backgroundColor: th.pill, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '900', color: th.accent }}>{th.badge}</Text></View> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <LinearGradient colors={th.header} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}><th.Icon size={24} color="#fff" strokeWidth={2.4} /></LinearGradient>
                        <View style={{ flex: 1 }}><View style={{ alignSelf: 'flex-start', backgroundColor: th.pill, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 2 }}><Text style={{ fontSize: 10, fontWeight: '800', color: th.accent }}>{isCurrent ? 'Current Plan' : `Weight ${th.weight}x`}</Text></View><Text style={{ fontSize: 18, fontWeight: '900', color: colors.gray900 }}>{plan.name}</Text></View>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.gray500 }}>{plan.description || th.tagline}</Text>
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><TrendingUp size={13} color={th.accent} /><Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray600 }}>Ranking Power</Text></View><Text style={{ fontSize: 11, fontWeight: '800', color: th.accent }}>{th.weight}x Priority {isMax ? '(MAX)' : ''}</Text></View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>{[1, 2, 3, 4, 5].map((s) => <View key={s} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: s <= th.weight ? th.filled : colors.gray200 }} />)}</View>
                      </View>
                      <View><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}><Text style={{ fontSize: 32, fontWeight: '900', color: colors.gray900 }}>₹{plan.price.toLocaleString('en-IN')}</Text><Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 6 }}>/ {plan.durationDays} days</Text></View><Text style={{ fontSize: 11, color: colors.gray500 }}>{plan.durationDays > 30 ? `≈ ₹${Math.round((plan.price / plan.durationDays) * 30).toLocaleString('en-IN')} / month` : isSilver ? '⚡ Affordable entry for local listing' : '⚡ 30-day listing & inquiries'}</Text></View>
                      <View style={{ gap: 10 }}>
                        <Feature theme={th}>Up to <Text style={{ fontSize: 13, fontWeight: '800', color: colors.gray900 }}>{plan.maxProperties} properties</Text> listed</Feature>
                        <Feature theme={th} tag={plan.leadCap === 0 ? 'Unlimited' : null}><Text style={{ fontSize: 13, fontWeight: '800', color: colors.gray900 }}>{plan.leadCap > 0 ? `${plan.leadCap} Leads` : 'Unlimited leads'}</Text> / month</Feature>
                        <Feature theme={th} tag={th.weight >= 3 ? `${th.weight}x Priority` : null}>Ranking boost (<Text style={{ fontSize: 13, fontWeight: '800', color: colors.gray900 }}>Level {th.weight}</Text> Priority)</Feature>
                        {plan.hasVerifiedTag ? <Feature theme={th} tag="Verified">Verified partner badge & trust seal</Feature> : null}
                        {plan.bannerType && plan.bannerType !== 'none' ? <Feature theme={th} tag="Banner">{plan.bannerType} banner presence</Feature> : null}
                        {plan.pauseDaysAllowed > 0 ? <Feature theme={th}><Text style={{ fontSize: 13, fontWeight: '800', color: colors.gray900 }}>{plan.pauseDaysAllowed} days</Text> subscription pause</Feature> : null}
                      </View>
                      {isCurrent ? (
                        <View style={{ backgroundColor: colors.slate900, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><CheckCircle size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '900' }}>Current Active Plan</Text></View>
                      ) : (
                        <TouchableOpacity disabled={processing} onPress={() => purchase(plan)} activeOpacity={0.85} style={{ opacity: processing ? 0.6 : 1 }}>
                          <LinearGradient colors={th.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Text style={{ color: th.btnText, fontWeight: '900' }}>Choose {th.tierName}</Text><ArrowRight size={16} color={th.btnText} /></LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ backgroundColor: colors.blue50, borderRadius: 16, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><TrendingUp size={20} color="#005CA8" /><Text style={{ fontWeight: '800', color: colors.gray900 }}>How Subscription Weight Powers Your Visibility</Text></View>
            <Text style={{ fontSize: 12, color: colors.gray600, lineHeight: 18 }}>Our search algorithm prioritizes listings based on your subscription weight. Higher weight plans (such as Level 3 Gold and Level 5 Diamond) appear higher in search results.</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}><AlertCircle size={16} color={colors.gray500} style={{ marginTop: 2 }} /><Text style={{ flex: 1, fontSize: 11, color: colors.gray500, lineHeight: 17 }}>Subscription plans are non-refundable. For higher tiers (Platinum & Diamond), exclusive city-level banner slots are subject to availability. Upgrade anytime; your remaining validity will be credited towards your upgraded tier.</Text></View>
          </View>
        </>)}
      </ScrollView>
    </View>
  );
}
