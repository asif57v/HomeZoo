import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Linking, useWindowDimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Icons from 'lucide-react-native';
import { ArrowRight, Copy, Check, ArrowUpRight, Sparkles, Play, MapPin, Star, TrendingUp } from 'lucide-react-native';
import { Text } from '../ui';
import PropertyCard from '../PropertyCard';
import { propertyService, userService } from '../../services/apiService';
import { reelService } from '../../services/reelService';
import { storage } from '../../lib/storage';
import toast from '../../store/toastStore';
import { colors } from '../../theme';
import { realRating } from '../../utils/format';

const Skel = ({ style }) => <View style={[{ backgroundColor: 'rgba(209,213,219,0.7)', borderRadius: 8 }, style]} />;

const BAND = {
  white: ['#FFFFFF', '#FFFFFF'],
  tint: ['rgba(240,247,253,0.9)', 'rgba(240,253,250,0.5)'],
  cream: ['#FBF7F0', '#FBF7F0'],
  muted: ['#F8FAFC', '#F8FAFC'],
  violet: ['#F5F3FF', 'rgba(238,242,255,0.4)'],
  sand: ['#FFFBEB', 'rgba(254,252,232,0.4)'],
  blush: ['#FFF1F2', 'rgba(255,247,237,0.4)'],
  dark: ['#020617', '#020617'],
};
const SPACING = { tight: 16, normal: 24, loose: 28 };

export const Band = ({ tone = 'white', spacing = 'normal', rounded = false, style, children }) => (
  <LinearGradient colors={BAND[tone] || BAND.white} style={[{ width: '100%', paddingVertical: SPACING[spacing], borderRadius: rounded ? 28 : 0 }, style]}>
    {children}
  </LinearGradient>
);

export const SectionHeader = ({ title, subtitle, size = 'md', onAction, dark, style }) => {
  const fs = size === 'lg' ? 20 : size === 'sm' ? 15 : 17;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16, gap: 12 }, style]}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: fs, fontWeight: size === 'lg' ? '800' : '700', color: dark ? '#fff' : colors.gray900, letterSpacing: -0.3 }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, marginTop: 4, color: dark ? 'rgba(255,255,255,0.6)' : colors.gray500 }}>{subtitle}</Text> : null}
      </View>
      {onAction ? (
        <TouchableOpacity onPress={onAction} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: dark ? 'rgba(255,255,255,0.1)' : colors.gray100, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowRight size={16} color={dark ? '#fff' : colors.gray700} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

// ---- Popular Categories (story-style rings)
export const PopularCategories = ({ categories = [], loading, onSelectCategory, title = 'Popular Categories' }) => {
  const router = useRouter();
  if (loading) {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <Skel style={{ height: 20, width: 160, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 16 }}>{[1, 2, 3, 4, 5].map((n) => <View key={n} style={{ gap: 6 }}><Skel style={{ width: 64, height: 64, borderRadius: 32 }} /><Skel style={{ height: 10, width: 48 }} /></View>)}</View>
      </View>
    );
  }
  if (!categories || categories.length === 0) return null;
  const onPress = (cat) => (onSelectCategory ? onSelectCategory(cat._id, cat.displayName || cat.name) : router.push({ pathname: '/search', params: { category: cat.slug || cat.name } }));
  return (
    <View style={{ width: '100%' }}>
      <SectionHeader size="sm" title={title} onAction={() => router.push('/search')} style={{ marginBottom: 10 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {categories.map((cat, i) => {
          const Icon = Icons[cat.icon] || Icons.Building2;
          const img = cat.image || cat.bgImage;
          const label = cat.displayName || cat.name;
          return (
            <TouchableOpacity key={cat._id || i} onPress={() => onPress(cat)} style={{ width: 68, alignItems: 'center', gap: 6 }}>
              <LinearGradient colors={['#fbbf24', '#f43f5e', '#8b5cf6']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ padding: 2.5, borderRadius: 999 }}>
                <View style={{ padding: 2, borderRadius: 999, backgroundColor: '#fff' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: cat.color || '#0f766e' }}>
                    {img ? <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon size={24} color="#fff" />}
                  </View>
                </View>
              </LinearGradient>
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: colors.gray700, textAlign: 'center', width: '100%' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ---- Banner Carousel
export const BannerCarousel = ({ banners = [], loading, placement = 'HOME_TOP', autoSlideInterval = 5000 }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState(null);
  const listRef = useRef(null);
  const itemW = width - 28;
  const h = placement === 'HOME_MIDDLE' ? 144 : 176;

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const t = setInterval(() => {
      setIdx((p) => {
        const n = (p + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: n * (itemW + 0), animated: true });
        return n;
      });
    }, autoSlideInterval);
    return () => clearInterval(t);
  }, [banners, itemW, autoSlideInterval]);

  if (loading) return <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}><Skel style={{ width: '100%', height: h, borderRadius: 16 }} /></View>;
  if (!banners || banners.length === 0) return null;

  const onBanner = async (b) => {
    if (!b || b.linkType === 'NONE') return;
    switch (b.linkType) {
      case 'CATEGORY': router.push({ pathname: '/search', params: { category: b.linkValue } }); break;
      case 'PROPERTY': router.push({ pathname: '/property/[id]', params: { id: String(b.linkValue), from: `Banner · ${b.title || placement}` } }); break;
      case 'OFFER':
        if (b.linkValue) { await Clipboard.setStringAsync(b.linkValue); setCopied(b.linkValue); toast.success(`Coupon code ${b.linkValue} copied!`); setTimeout(() => setCopied(null), 3000); }
        break;
      case 'EXTERNAL_URL': if (b.linkValue) Linking.openURL(b.linkValue).catch(() => {}); break;
      default: break;
    }
  };
  const heading = banners.find((b) => b.sectionHeading && b.sectionHeading.trim());

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: placement === 'HOME_TOP' ? 16 : 8 }}>
      {heading ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.gray900 }}>{heading.sectionHeading}</Text>
          {heading.sectionSubtitle ? <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 2 }}>{heading.sectionSubtitle}</Text> : null}
        </View>
      ) : null}
      <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.gray900, borderWidth: 1, borderColor: 'rgba(243,244,246,0.8)' }}>
        <FlatList
          ref={listRef}
          data={banners}
          horizontal
          pagingEnabled
          snapToInterval={itemW}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(b, i) => b._id || String(i)}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / itemW))}
          getItemLayout={(_, i) => ({ length: itemW, offset: itemW * i, index: i })}
          renderItem={({ item: b }) => (
            <TouchableOpacity activeOpacity={0.95} onPress={() => onBanner(b)} style={{ width: itemW, height: h }}>
              <Image source={{ uri: b.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 16 }]}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{b.title}</Text>
                {b.subtitle ? <Text style={{ fontSize: 12, color: colors.gray200, fontWeight: '500', marginTop: 2 }}>{b.subtitle}</Text> : null}
                {b.linkType && b.linkType !== 'NONE' ? (
                  <View style={{ marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999 }}>
                    {b.linkType === 'OFFER' ? (<>
                      {copied === b.linkValue ? <Check size={13} color={colors.green600} /> : <Copy size={13} color={colors.blue600} />}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray900 }}>{copied === b.linkValue ? 'Copied!' : `Copy: ${b.linkValue}`}</Text>
                    </>) : (<><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray900 }}>Explore Now</Text><ArrowUpRight size={13} color={colors.gray900} /></>)}
                  </View>
                ) : null}
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
        {banners.length > 1 ? (
          <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {banners.map((_, i) => <View key={i} style={{ height: 6, width: i === idx ? 20 : 6, borderRadius: 3, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.5)' }} />)}
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ---- Offers
export const ExclusiveOffers = ({ offers = [], loading }) => {
  const router = useRouter();
  const [copied, setCopied] = useState(null);
  const onOffer = (o) => {
    if (o.linkValue) {
      if (o.linkType === 'CATEGORY') return router.push({ pathname: '/search', params: { category: o.linkValue } });
      if (o.linkType === 'PROPERTY') return router.push({ pathname: '/property/[id]', params: { id: String(o.linkValue), from: `Offer · ${o.title || o.code || 'Exclusive offers'}` } });
      if (o.linkType === 'EXTERNAL_URL') return Linking.openURL(o.linkValue).catch(() => {});
    }
    router.push('/search');
  };
  const copy = async (code) => { await Clipboard.setStringAsync(code); setCopied(code); toast.success(`Coupon code ${code} copied!`); setTimeout(() => setCopied(null), 3000); };
  if (loading) return <View style={{ paddingHorizontal: 16 }}><Skel style={{ height: 24, width: 176, marginBottom: 12 }} /><Skel style={{ height: 80, width: '100%', borderRadius: 16 }} /></View>;
  if (!offers || offers.length === 0) return null;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
        <Sparkles size={18} color={colors.emerald600} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gray900 }}>Offers for you</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {offers.map((o) => (
          <TouchableOpacity key={o._id || o.id} onPress={() => onOffer(o)} activeOpacity={0.9} style={{ width: 280, backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: colors.gray100 }}>
            <View style={{ width: 64, height: 56, borderRadius: 12, backgroundColor: colors.emerald50, overflow: 'hidden' }}>
              {o.image ? <Image source={{ uri: o.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '900', color: colors.gray900 }}>{o.title}</Text>
              {o.subtitle ? <Text numberOfLines={2} style={{ fontSize: 10, color: colors.gray500, fontWeight: '500', marginTop: 2 }}>{o.subtitle}</Text> : null}
              {o.code ? (
                <TouchableOpacity onPress={() => copy(o.code)} style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  {copied === o.code ? <><Check size={11} color={colors.green600} /><Text style={{ fontSize: 10, fontWeight: '700', color: colors.green600 }}>Copied!</Text></> : <><Copy size={11} color={colors.blue700} /><Text style={{ fontSize: 10, fontWeight: '700', color: colors.blue700 }}>{o.code}</Text></>}
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ---- Featured categories (bento -> 2 column grid, first tile hero)
export const FeaturedCategories = ({ categories = [], loading, onSelectCategory, title = 'Featured Categories', subtitle = '' }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const FALLBACK = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';
  if (loading) return <View style={{ paddingHorizontal: 16, paddingVertical: 28 }}><Skel style={{ height: 24, width: 176, marginBottom: 16 }} /><Skel style={{ height: 160, borderRadius: 24 }} /></View>;
  if (!categories || categories.length === 0) return null;
  const onPress = (cat) => (onSelectCategory ? onSelectCategory(cat._id, cat.displayName || cat.name) : router.push({ pathname: '/search', params: { category: cat.slug || cat.name } }));
  const colW = (width - 32 - 8) / 2;
  const total = categories.length;
  return (
    <Band tone="cream" spacing="loose" rounded>
      <SectionHeader size="md" title={title} subtitle={subtitle} onAction={() => router.push('/search')} />
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((cat, index) => {
          const Icon = Icons[cat.icon] || Icons.Building2;
          const img = cat.image || cat.bgImage || FALLBACK;
          const isHero = index === 0;
          const full = total === 1 || (index === total - 1 && index >= 1 && (total - 1) % 2 === 1 && !isHero);
          const w = full ? width - 32 : colW;
          const h = isHero ? colW * 1.35 : colW * 0.66;
          return (
            <TouchableOpacity key={cat._id || index} activeOpacity={0.9} onPress={() => onPress(cat)} style={{ width: isHero && total > 1 ? colW : w, height: isHero && total > 1 ? colW * 1.35 : h, borderRadius: 24, overflow: 'hidden', backgroundColor: cat.color || '#0f766e' }}>
              <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
              {cat.badge ? <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 9, fontWeight: '700', color: colors.gray900 }}>{cat.badge}</Text></View> : null}
              <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                <View style={{ width: isHero ? 32 : 24, height: isHero ? 32 : 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: isHero ? 8 : 6 }}><Icon size={isHero ? 18 : 13} color="#fff" /></View>
                <Text numberOfLines={2} style={{ fontWeight: '800', color: '#fff', fontSize: isHero ? 17 : 13 }}>{cat.displayName || cat.name}</Text>
                {isHero && cat.tagline ? <Text numberOfLines={2} style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{cat.tagline}</Text> : null}
                {isHero ? <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}><Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>Explore</Text><Icons.ChevronRight size={13} color="rgba(255,255,255,0.9)" /></View> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Band>
  );
};

// ---- helper to load saved ids
const useSavedIds = () => {
  const [saved, setSaved] = useState([]);
  const load = useCallback(async () => {
    if (!storage.getItem('token')) return [];
    try {
      const res = await userService.getSavedHotels();
      const list = res.savedHotels || [];
      const ids = list.map((h) => (typeof h === 'object' ? h._id : h));
      setSaved(ids);
      return ids;
    } catch { return []; }
  }, []);
  return [saved, load];
};

// ---- Admin-curated Top Properties
export const TopPropertiesSection = ({ config, loading: configLoading }) => {
  const { width } = useWindowDimensions();
  const ids = config?.propertyIds || [];
  const idsKey = ids.join(',');
  const [properties, setProperties] = useState([]);
  const [saved, loadSaved] = useSavedIds();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!idsKey) { setProperties([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [data] = await Promise.all([propertyService.getPublicProperties({ ids: idsKey }), loadSaved()]);
        if (cancelled) return;
        const byId = new Map((data || []).map((p) => [String(p._id), p]));
        setProperties(idsKey.split(',').map((id) => byId.get(id)).filter(Boolean));
      } catch { if (!cancelled) setProperties([]); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [idsKey]);

  if (configLoading || loading) {
    if (!configLoading && !idsKey) return null;
    return <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}><Skel style={{ height: 28, width: 192, marginBottom: 16 }} /><Skel style={{ height: 192, width: width * 0.64, borderRadius: 24 }} /></View>;
  }
  if (!config?.enabled || properties.length === 0) return null;
  return (
    <Band tone="white" spacing="tight">
      <SectionHeader size="lg" title={config.title || 'Top Properties'} subtitle={config.subtitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {properties.map((p) => <PropertyCard key={p._id} data={p} variant="featured" style={{ width: width * 0.64 }} isSaved={saved.includes(p._id)} source={`Home · ${config.title || 'Top Properties'}`} />)}
      </ScrollView>
    </Band>
  );
};

// ---- Property feed (carousels / grid)
const TILE = { 'rent-grid': { variant: 'tile', w: 0.38, max: 176 }, 'sale-grid': { variant: 'sale', w: 0.66, max: 288 }, 'plot-grid': { variant: 'plot', w: 0.52, max: 224 } };

export const PropertyFeed = ({ selectedType, selectedCity, nearLocation, viewMode = 'grid', limit, extraFilters = {}, source }) => {
  const { width } = useWindowDimensions();
  const [properties, setProperties] = useState([]);
  const [saved, loadSaved] = useSavedIds();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filtersKey = JSON.stringify(extraFilters);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const filters = {};
      Object.keys(extraFilters).forEach((k) => { if (extraFilters[k] !== undefined && extraFilters[k] !== null) filters[k] = extraFilters[k]; });
      if (selectedType && selectedType !== 'All') filters.type = selectedType;
      if (limit && !(selectedCity && selectedCity !== 'All')) filters.limit = limit;
      const { lat, lng, city } = nearLocation || {};
      // Same order as the web: nearby (lat/lng) -> city name -> everything. A failed step falls through to the next one,
      // and each request is retried once, so a flaky mobile connection no longer shows "Could not load properties".
      const fetchList = async (params) => {
        let lastErr;
        for (let i = 0; i < 3; i++) {
          try { return await propertyService.getPublicProperties(params); }
          catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 700 * (i + 1))); }
        }
        throw lastErr;
      };
      const byLocation = async () => {
        if (lat != null && lng != null) {
          try {
            const nearby = await fetchList({ ...filters, lat, lng, sort: 'distance' });
            if (Array.isArray(nearby) && nearby.length > 0) return nearby;
          } catch { /* fall back to the city search */ }
        }
        if (city) {
          try { return await fetchList({ ...filters, search: city }); } catch { /* fall back to the unfiltered list */ }
        }
        return fetchList(filters);
      };
      const [data] = await Promise.all([nearLocation ? byLocation() : fetchList(filters), loadSaved()]);
      let out = Array.isArray(data) ? data : [];
      if (selectedCity && selectedCity !== 'All') out = out.filter((p) => p.address?.city?.toLowerCase() === selectedCity.toLowerCase());
      setProperties(out);
    } catch (e) {
      if (__DEV__) console.warn('[PropertyFeed] load failed:', e?.message || e);
      const why = typeof e === 'string' ? e : e?.message || '';
      setError(`Could not load properties. Please try again.${why ? `\n(${String(why).slice(0, 80)})` : ''}`);
    } finally { setLoading(false); }
  }, [selectedType, selectedCity, nearLocation?.lat, nearLocation?.lng, nearLocation?.city, filtersKey]);

  useEffect(() => { load(); }, [load]);

  const cfg = TILE[viewMode];
  const cardW = cfg ? Math.min(width * cfg.w, cfg.max) : viewMode === 'stay-carousel' ? width * 0.58 : 0;

  if (loading) {
    if (cfg || viewMode === 'stay-carousel') return <ScrollView horizontal scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>{[1, 2, 3].map((n) => <Skel key={n} style={{ width: cardW, height: cardW * 1.3, borderRadius: 16 }} />)}</ScrollView>;
    return <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  if (error) return (
    <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
      <Text style={{ textAlign: 'center', color: colors.gray500, fontSize: 13 }}>{error}</Text>
      <TouchableOpacity onPress={load} style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.gray900 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Tap to retry</Text></TouchableOpacity>
    </View>
  );
  if (properties.length === 0) return <View style={{ padding: 32 }}><Text style={{ textAlign: 'center', color: colors.gray500, fontSize: 14 }}>{nearLocation?.city ? `No properties found near ${nearLocation.city}.` : 'No properties found in this category.'}</Text></View>;

  const shown = limit ? properties.slice(0, limit) : properties;
  if (cfg) {
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>{shown.map((p) => <PropertyCard key={p._id} data={p} variant={cfg.variant} style={{ width: cardW }} isSaved={saved.includes(p._id)} source={source} />)}</ScrollView>;
  }
  if (viewMode === 'stay-carousel') {
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>{shown.map((p) => <PropertyCard key={p._id} data={p} variant="stay" style={{ width: cardW }} isSaved={saved.includes(p._id)} source={source} />)}</ScrollView>;
  }
  return <View style={{ paddingHorizontal: 14, gap: 16 }}>{shown.map((p) => <PropertyCard key={p._id} data={p} isSaved={saved.includes(p._id)} source={source} />)}</View>;
};

// ---- Reels
const ReelItem = ({ reel, onPress, banded }) => {
  const w = 132;
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ width: banded ? w : w }}>
      <View style={{ width: w, height: w * 1.78, borderRadius: 16, overflow: 'hidden', backgroundColor: banded ? '#fff' : colors.gray200, shadowColor: '#0f172a', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
        <Image source={{ uri: reel.thumbnailUrl || 'https://via.placeholder.com/150x266?text=Reel' }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFill} />
        <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 999 }}><Play size={20} color="#fff" fill="#fff" /></View>
        </View>
      </View>
      <View style={{ marginTop: 10, paddingHorizontal: 2 }}>
        <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: colors.gray900 }}>{reel.caption || 'Property Tour'}</Text>
        <Text style={{ fontSize: 9, fontWeight: '500', color: colors.gray500, marginTop: 4 }}>{reel.viewsCount || 0} views • #{reel.category?.toLowerCase() || 'general'}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const ReelSection = ({ category, banded = false }) => {
  const router = useRouter();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const norm = (cat) => {
    if (!cat || cat === 'All') return 'All';
    const c = cat.toLowerCase();
    if (c.includes('pg')) return 'PG';
    if (c.includes('rent')) return 'Rent';
    if (c.includes('buy')) return 'Buy';
    if (c.includes('plot')) return 'Plot';
    return 'General';
  };
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reelService.getFeed({ category: norm(category), limit: 10 }).then((res) => { if (!cancelled) setReels(res.reels || []); }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  if (loading) {
    return banded ? (
      <LinearGradient colors={BAND.blush} style={{ paddingVertical: 28, borderRadius: 28 }}><ScrollView horizontal scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2, 3].map((n) => <Skel key={n} style={{ width: 132, height: 235, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.8)' }} />)}</ScrollView></LinearGradient>
    ) : <View style={{ paddingVertical: 32, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (reels.length === 0) return null;
  const list = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
      {reels.map((r) => <ReelItem key={r._id} reel={r} banded={banded} onPress={() => router.push({ pathname: '/reels', params: { reel: r._id } })} />)}
    </ScrollView>
  );
  if (banded) return <Band tone="blush" spacing="loose" rounded><SectionHeader size="md" title="Reels" subtitle="Short video tours and updates" onAction={() => router.push('/reels')} />{list}</Band>;
  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray100, backgroundColor: 'rgba(249,250,251,0.3)' }}>
      <View style={{ paddingHorizontal: 14, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ backgroundColor: colors.red600, padding: 4, borderRadius: 8 }}><Play size={14} color="#fff" /></View><Text style={{ fontSize: 16, fontWeight: '700', color: colors.gray900 }}>Reels</Text></View>
          <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 2 }}>Short video tours and updates</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/reels')}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald600 }}>View All</Text></TouchableOpacity>
      </View>
      {list}
    </View>
  );
};

// ---- Latest projects banner (category tabs)
export const LatestProjectsBanner = ({ categoryId, categoryName, theme }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    setLoading(true);
    propertyService.getPublicProperties({ type: categoryId, sort: 'newest', limit: 5 }).then((res) => { if (!cancelled) setProperties(res || []); }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [categoryId]);
  useEffect(() => { setIdx(0); }, [properties]);
  useEffect(() => {
    if (properties.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % properties.length), 5000);
    return () => clearInterval(t);
  }, [properties.length]);

  if (loading) return <View style={{ marginHorizontal: 14, height: 220, backgroundColor: colors.gray50, borderRadius: 16, borderWidth: 1, borderColor: colors.gray200, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.gray300} /></View>;
  const cur = properties[idx];
  if (!cur) return null;
  return (
    <View style={{ width: '100%', marginTop: 12, marginBottom: 24, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.gray900 }}>Top Picks</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.emerald50, borderWidth: 1, borderColor: colors.emerald100, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 }}>
          <TrendingUp size={11} color={colors.emerald700} /><Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.emerald700 }}>Recent Added</Text>
        </View>
      </View>
      <TouchableOpacity activeOpacity={0.95} onPress={() => router.push({ pathname: '/property/[id]', params: { id: String(cur._id), from: `Top Picks · ${categoryName || 'Latest projects'}` } })} style={{ height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.gray200 }}>
        <Image source={{ uri: cur.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 16, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 10, fontWeight: '900', color: colors.gray900 }}>LATEST PROJECT</Text></View>
            {cur.rankingWeight > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.yellow400, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Star size={10} color="#000" fill="#000" /><Text style={{ fontSize: 10, fontWeight: '900', color: '#000' }}>PREMIUM</Text></View> : null}
          </View>
          <Text numberOfLines={2} style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{cur.propertyName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MapPin size={14} color="#fff" /><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>{[cur.address?.area, cur.address?.city].filter(Boolean).join(', ') || cur.address?.state || 'Location not added'}</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}><Star size={14} color={colors.yellow400} fill={colors.yellow400} /><Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{realRating(cur)}</Text></View>
          </View>
          <View style={{ marginTop: 8, flexDirection: 'row' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 }}><Text style={{ fontSize: 12, fontWeight: '900', color: '#000' }}>View Details</Text><ArrowRight size={14} color="#000" /></View>
          </View>
        </View>
        {properties.length > 1 ? <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6 }}>{properties.map((_, i) => <View key={i} style={{ height: 4, width: i === idx ? 24 : 12, borderRadius: 2, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.4)' }} />)}</View> : null}
      </TouchableOpacity>
    </View>
  );
};

// ---- PG collections
const COLLECTIONS = [
  { id: 'guys', title: 'For Boys', image: 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=400', filters: { gender: 'Boys' }, tint: 'rgba(30,64,175,0.6)' },
  { id: 'girls', title: 'For Girls', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400', filters: { gender: 'Girls' }, tint: 'rgba(159,18,57,0.6)' },
  { id: 'coliving', title: 'Co-Living PG', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400', filters: { gender: 'Co-Living' }, tint: 'rgba(107,33,168,0.6)' },
  { id: 'food', title: 'Food Available', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400', filters: { foodIncluded: 'true' }, tint: 'rgba(154,52,18,0.6)' },
  { id: 'private', title: 'Private Room', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=400', filters: { occupancy: 'Single' }, tint: 'rgba(6,95,70,0.6)' },
];
const CLEAR = { gender: undefined, occupancy: undefined, foodIncluded: undefined };

export const CollectionSection = ({ onFilter, activeFilters = {} }) => {
  const isSel = (f) => Object.entries(f).every(([k, v]) => activeFilters[k] === v);
  return (
    <View style={{ paddingVertical: 8, marginBottom: 16 }}>
      <View style={{ paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray900 }}>Handpicked <Text style={{ fontSize: 18, fontWeight: '700', color: colors.surface }}>Collections</Text></Text>
          <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 2 }}>Found exactly what you are looking for</Text>
        </View>
        {Object.values(activeFilters).some((v) => v !== undefined) ? <TouchableOpacity onPress={() => onFilter(CLEAR)}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.red500 }}>Clear Filters</Text></TouchableOpacity> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 12 }}>
        {COLLECTIONS.map((it) => {
          const sel = isSel(it.filters);
          return (
            <TouchableOpacity key={it.id} activeOpacity={0.9} onPress={() => onFilter(sel ? CLEAR : it.filters)} style={{ width: 128, height: 96, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: sel ? colors.surface : 'transparent' }}>
              <Image source={{ uri: it.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={['transparent', it.tint]} style={StyleSheet.absoluteFill} />
              <View style={{ position: 'absolute', left: 10, bottom: 8 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{it.title}</Text></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
