import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, ShieldCheck, Package, Crown, Zap, Star, AlertCircle, Check, CalendarDays, Home, Users, TrendingUp, Sparkles, ArrowRight, ChevronRight } from 'lucide-react-native';
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

// Dark "luxe" palette for the plan cards (glossy dark card, light metallic accent, bright pill CTA).
const LUX = {
  5: { bg: ['#3b1460', '#1f0a36', '#0d0418'], line: '#E9C9FF', accent: '#E3B8FF', glow: '216,180,254', cta: ['#F0D4FF', '#C98BFF'] },
  4: { bg: ['#0f3a5c', '#071f36', '#030d19'], line: '#B9E6FF', accent: '#9FDCFF', glow: '125,211,252', cta: ['#C9EEFF', '#7CCBFF'] },
  3: { bg: ['#6b4c10', '#2e2006', '#120c02'], line: '#E8C566', accent: '#FFD36A', glow: '255,211,106', cta: ['#FFE08A', '#F7C948'] },
  2: { bg: ['#6a3412', '#2e1607', '#140902'], line: '#F2B27A', accent: '#FFB984', glow: '255,170,110', cta: ['#FFD0A8', '#FB9F5B'] },
  1: { bg: ['#3a4556', '#1b222d', '#0b0f15'], line: '#D5DEE9', accent: '#E2E8F0', glow: '203,213,225', cta: ['#F1F5F9', '#CBD5E1'] },
};
const luxFor = (th) => LUX[th.weight] || LUX[1];
const INK = '#1a1206';

// Soft light blob (RN has no blur; stacked translucent circles fake a glow).
const Glow = ({ rgb, size, style }) => (
  <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    {[1, 0.72, 0.46, 0.24].map((k, i) => (
      <View key={i} style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: size, backgroundColor: `rgba(${rgb},${0.05 + i * 0.03})` }} />
    ))}
  </View>
);

// Card text (font scale is capped globally in ui.jsx Text).
const CT = Text;

const LuxFeature = ({ lx, children, tag }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
    <Check size={14} color={lx.accent} strokeWidth={3} />
    <CT style={{ flex: 1, fontSize: 12.5, color: 'rgba(255,255,255,0.82)', fontWeight: '600' }}>{children}</CT>
    {tag ? <View style={{ borderWidth: 1, borderColor: `rgba(${lx.glow},0.45)`, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 }}><CT style={{ fontSize: 9, fontWeight: '800', color: lx.accent }}>{tag}</CT></View> : null}
  </View>
);
const B = ({ children }) => <CT style={{ fontSize: 12.5, fontWeight: '900', color: '#fff' }}>{children}</CT>;

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

export default function PartnerSubscriptions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user) || {};
  const scrollRef = useRef(null);
  // Responsive: 1 column on phones, 2 on tablets, 3 on large tablets / landscape.
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const cols = width >= 1100 ? 3 : isTablet ? 2 : 1;
  const MAX_W = 1200;
  const pad = isTablet ? 24 : 16;
  const GAP = isTablet ? 20 : 16;
  const cardW = cols === 1 ? '100%' : Math.floor((Math.min(width, MAX_W) - pad * 2 - GAP * (cols - 1)) / cols);
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
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: pad, gap: 16, paddingBottom: 40, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GAP }}>
              {plans.map((plan) => {
                const th = themeFor(plan); const lx = luxFor(th); const isCurrent = currentSub?.planId?._id === plan._id && active; const isMax = th.weight >= 5 || plan.tier === 'diamond'; const isSilver = th.weight === 1;
                const perMonth = plan.durationDays > 30 ? `≈ ₹${Math.round((plan.price / plan.durationDays) * 30).toLocaleString('en-IN')} / month` : isSilver ? 'Affordable entry for local listing' : '30-day listing & inquiries';
                return (
                  <View key={plan._id} style={{ width: cardW, borderRadius: 28, borderWidth: isCurrent ? 2.5 : 1.5, borderColor: lx.line, overflow: 'hidden', backgroundColor: lx.bg[2], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
                    <LinearGradient colors={lx.bg} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1, paddingHorizontal: isTablet ? 20 : 16, paddingTop: 14, paddingBottom: 12, gap: 12 }}>
                      <Glow rgb={lx.glow} size={200} style={{ top: -85, right: -75 }} />
                      <Glow rgb={lx.glow} size={160} style={{ bottom: -65, left: -65 }} />

                      {/* Top row: badge + weight */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
                        {th.badge && !isCurrent ? <View style={{ borderWidth: 1, borderColor: `rgba(${lx.glow},0.5)`, backgroundColor: `rgba(${lx.glow},0.12)`, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 }}><CT style={{ fontSize: 9.5, fontWeight: '900', color: lx.accent }}>{th.badge}</CT></View> : <View />}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isCurrent ? lx.accent : 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                          {isCurrent ? <CheckCircle size={11} color={INK} /> : <TrendingUp size={11} color={lx.accent} />}
                          <CT style={{ fontSize: 9.5, fontWeight: '800', color: isCurrent ? INK : lx.accent }}>{isCurrent ? 'Current Plan' : `Weight ${th.weight}x`}</CT>
                        </View>
                      </View>

                      {/* Title block (centered, like a brand mark) */}
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: `rgba(${lx.glow},0.6)`, backgroundColor: `rgba(${lx.glow},0.12)`, alignItems: 'center', justifyContent: 'center' }}><th.Icon size={20} color={lx.accent} strokeWidth={2.2} /></View>
                        <CT numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 21, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 0.2 }}>{plan.name}</CT>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 40, height: 1.5, backgroundColor: lx.accent, opacity: 0.8 }} />
                          <CT style={{ fontSize: 10, fontWeight: '800', color: lx.accent, letterSpacing: 1.4 }}>{th.weight}x PRIORITY{isMax ? ' • MAX' : ''}</CT>
                          <View style={{ width: 40, height: 1.5, backgroundColor: lx.accent, opacity: 0.8 }} />
                        </View>
                        <CT numberOfLines={2} style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', textAlign: 'center', lineHeight: 16, paddingHorizontal: 4 }}>{plan.description || th.tagline}</CT>
                      </View>

                      {/* Features */}
                      <View style={{ gap: 7, paddingHorizontal: 2 }}>
                        <LuxFeature lx={lx}>Up to <B>{plan.maxProperties} properties</B> listed</LuxFeature>
                        <LuxFeature lx={lx} tag={plan.leadCap === 0 ? 'Unlimited' : null}><B>{plan.leadCap > 0 ? `${plan.leadCap} Leads` : 'Unlimited leads'}</B> / month</LuxFeature>
                        <LuxFeature lx={lx}>Ranking boost (<B>Level {th.weight}</B> Priority)</LuxFeature>
                        {plan.hasVerifiedTag ? <LuxFeature lx={lx} tag="Verified">Verified badge & trust seal</LuxFeature> : null}
                        {plan.bannerType && plan.bannerType !== 'none' ? <LuxFeature lx={lx} tag="Banner">{plan.bannerType} banner presence</LuxFeature> : null}
                        {plan.pauseDaysAllowed > 0 ? <LuxFeature lx={lx}><B>{plan.pauseDaysAllowed} days</B> subscription pause</LuxFeature> : null}
                      </View>

                      {/* Spacer: keeps price + button aligned at the bottom when cards sit side by side */}
                      <View style={{ flexGrow: 1, marginTop: -12 }} />

                      {/* Ranking power meter */}
                      <View style={{ gap: 5 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><CT style={{ fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>Ranking Power</CT><CT style={{ fontSize: 10.5, fontWeight: '800', color: lx.accent }}>{th.weight}/5</CT></View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>{[1, 2, 3, 4, 5].map((s) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: s <= th.weight ? lx.accent : 'rgba(255,255,255,0.14)' }} />)}</View>
                      </View>

                      {/* Price option (selected-pill look) */}
                      <View style={{ borderRadius: 18, borderWidth: 1.5, borderColor: `rgba(${lx.glow},0.55)`, backgroundColor: `rgba(${lx.glow},0.1)`, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <CT style={{ fontSize: 11, fontWeight: '700', color: lx.accent }}>{plan.durationDays} Days Subscription</CT>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                            <CT style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>₹{plan.price.toLocaleString('en-IN')}</CT>
                            <CT style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 4, flexShrink: 1 }}>{perMonth}</CT>
                          </View>
                        </View>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: lx.accent, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: lx.accent }} /></View>
                      </View>

                      {/* CTA */}
                      {isCurrent ? (
                        <View style={{ borderRadius: 999, borderWidth: 1.5, borderColor: lx.accent, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><CheckCircle size={17} color={lx.accent} /><CT style={{ color: lx.accent, fontWeight: '900', fontSize: 14 }}>Current Active Plan</CT></View>
                      ) : (
                        <TouchableOpacity disabled={processing} onPress={() => purchase(plan)} activeOpacity={0.85} style={{ opacity: processing ? 0.6 : 1 }}>
                          <LinearGradient colors={lx.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 999, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><CT style={{ color: INK, fontWeight: '900', fontSize: 15 }}>Subscribe {th.tierName}</CT><ChevronRight size={17} color={INK} strokeWidth={3} /></LinearGradient>
                        </TouchableOpacity>
                      )}
                      <CT style={{ textAlign: 'center', fontSize: 9.5, color: 'rgba(255,255,255,0.45)', marginTop: -4 }}>Secure payment  •  Non-refundable  •  Upgrade anytime</CT>
                    </LinearGradient>
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
