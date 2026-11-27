import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Share } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Star, BadgeCheck, MapPin, Calendar, Building2, User, TrendingUp, Quote, X, Clock, Share2, ArrowRight, Sparkles } from 'lucide-react-native';
import { Text, Sheet } from '../ui';
import { propertyService } from '../../services/apiService';
import { API_BASE_URL } from '../../config';
import { colors } from '../../theme';
import { useResponsive } from '../../lib/responsive';

const THEMES = {
  diamond: { bg: ['#1C2F8F', '#060B2D', '#03051A'], border: '#7B3FFB', badge: ['#1C2F8F', '#7B3FFB', '#E94CFF'], text: '#fff', sub: '#C4B5FD', accent: '#39D5FF', quote: 'rgba(11,19,66,0.7)', dark: true },
  gold: { bg: ['#EAB031', '#FCE38A', '#D59821'], border: '#FEEAA7', badge: ['#FFF0B3', '#FCE38A', '#FCE38A'], text: '#523600', sub: '#7A5200', accent: '#8F6100', quote: 'rgba(255,240,179,0.6)', dark: false },
  platinum: { bg: ['#F8FAFC', '#EEF2FF', '#FAF5FF'], border: '#C7D2FE', badge: ['#E0E7FF', '#E0E7FF', '#E0E7FF'], text: '#1e1b4b', sub: '#4f46e5', accent: '#6366f1', quote: 'rgba(255,255,255,0.9)', dark: false },
  silver: { bg: ['#021035', '#041A52', '#010927'], border: '#3b82f6', badge: ['#0B256B', '#0B256B', '#0B256B'], text: '#fff', sub: '#93c5fd', accent: '#1B55E2', quote: 'rgba(6,24,71,0.9)', dark: true },
};
const themeFor = (tier, name) => {
  const t = (tier || name || '').toLowerCase();
  if (t.includes('diamond')) return { ...THEMES.diamond, label: name ? `💎 ${name}` : '💎 ELITE DIAMOND PACK' };
  if (t.includes('gold')) return { ...THEMES.gold, label: name || 'ELITE GOLD PACK' };
  if (t.includes('platinum')) return { ...THEMES.platinum, label: name || 'PLATINUM PACK' };
  return { ...THEMES.silver, label: name || 'STARTER SILVER PACK' };
};

const fmtDate = (v) => { if (!v) return 'Recent'; try { return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return 'Recent'; } };

export default function HomeBottomSections() {
  const router = useRouter();
  const { width: winW, wideW, isTablet } = useResponsive();
  const width = isTablet ? Math.min(wideW * 0.55, 520) : winW;
  const [partners, setPartners] = useState([]);
  const [news, setNews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [section, setSection] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/info/platform/top-rated-section`, { timeout: 15000 }).then((r) => setSection(r.data)).catch(() => {});
    propertyService.getRecommendedSellers().then((d) => setPartners(d || [])).catch(() => {});
    // Only real articles from the admin panel; the section hides itself when there are none
    propertyService.getNewsArticles({ limit: 6 }).then((res) => setNews(res?.articles || [])).catch(() => setNews([]));
  }, []);

  const shown = partners.slice(0, section?.maxPartners || 6);
  const showPartners = shown.length > 0 && section?.enabled !== false;

  return (
    <View style={{ width: '100%', marginTop: 16, marginBottom: 32 }}>
      {showPartners ? (
        <View style={{ marginBottom: 24 }}>
          <View style={{ paddingHorizontal: 14, marginBottom: 16 }}>
            {section?.badgeText ? (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.amber50, borderWidth: 1, borderColor: 'rgba(253,230,138,0.6)', marginBottom: 12 }}>
                <Star size={14} color={colors.amber500} fill={colors.amber500} /><Text style={{ fontSize: 12, fontWeight: '800', color: colors.amber700 }}>{section.badgeText}</Text>
              </View>) : null}
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.slate900 }}>{(section?.title || 'Top Rated Hoomzo Partners').replace(/HomeZo/gi, 'Hoomzo')}</Text>
            {section?.subtitle ? <Text style={{ fontSize: 12, color: colors.slate500, fontWeight: '500', marginTop: 6 }}>{section.subtitle.replace(/HomeZo/gi, 'Hoomzo')}</Text> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 16 }}>
            {shown.map((p, i) => {
              const th = themeFor(p.plan?.tier, p.plan?.name);
              return (
                <TouchableOpacity key={p._id || i} activeOpacity={0.9} onPress={() => p._id && router.push({ pathname: "/partners/[id]", params: { id: String(p._id) } })}>
                <LinearGradient colors={th.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: width * 0.76, borderRadius: 20, padding: 12, borderWidth: 2, borderColor: th.border, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: th.accent, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                      {p.profileImage ? <Image source={{ uri: p.profileImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <User size={22} color={colors.slate400} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 13, color: th.text, flexShrink: 1 }}>{p.name}</Text>
                        <BadgeCheck size={15} color={th.accent} />
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <LinearGradient colors={th.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 7.5, fontWeight: '800', color: th.dark ? '#fff' : th.sub }}>{th.label}</Text></LinearGradient>
                        {(p.address?.city || p.address?.locality) ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><MapPin size={10} color={th.accent} /><Text style={{ fontSize: 9, fontWeight: '600', color: th.sub }}>{p.address.locality || p.address.city}</Text></View> : null}
                      </View>
                    </View>
                    {Number(p.rating) > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)' }}><Star size={10} color={colors.amber400} fill={colors.amber400} /><Text style={{ fontSize: 9, fontWeight: '900', color: colors.amber700 }}>{Number(p.rating).toFixed(1)}</Text></View> : null}
                  </View>
                  {p.tagline ? (
                    <View style={{ flexDirection: 'row', gap: 6, padding: 8, borderRadius: 8, backgroundColor: th.quote }}>
                      <Quote size={12} color={th.accent} />
                      <Text numberOfLines={3} style={{ flex: 1, fontSize: 10, fontWeight: '600', color: th.text }}>"{p.tagline}"</Text>
                    </View>) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      <View><Text style={{ fontSize: 7.5, fontWeight: '800', color: th.sub }}>EXPERIENCE</Text><Text style={{ fontSize: 12, fontWeight: '900', color: th.text }}>{p.experienceYears || 0}+ Yrs</Text></View>
                      <View><Text style={{ fontSize: 7.5, fontWeight: '800', color: th.sub }}>LISTINGS</Text><Text style={{ fontSize: 12, fontWeight: '900', color: th.text }}>{p.totalListings || 0}</Text></View>
                    </View>
                  </View>
                </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {news.length > 0 ? (
      <View>
        <View style={{ paddingHorizontal: 14, marginBottom: 16 }}>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EEF2FF', marginBottom: 12 }}><TrendingUp size={14} color={colors.indigo600} /><Text style={{ fontSize: 12, fontWeight: '800', color: colors.indigo600 }}>Market Intelligence</Text></View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.slate900 }}>News & Property Updates</Text>
          <Text style={{ fontSize: 14, color: colors.slate500, fontWeight: '500', marginTop: 8 }}>Stay ahead of real estate dynamics with our curated insider reports, investment strategies, and emerging corridor developments.</Text>
          <TouchableOpacity onPress={() => router.push('/news')} style={{ alignSelf: 'flex-start', marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: colors.slate200 }}><Text style={{ fontSize: 14, fontWeight: '700', color: colors.slate900 }}>View All News</Text><ArrowRight size={16} color={colors.slate900} /></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 16 }}>
          {news.map((item, i) => (
            <TouchableOpacity key={item._id || item.id || i} activeOpacity={0.92} onPress={() => setSelected(item)} style={{ width: width * 0.85, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(241,245,249,0.9)', overflow: 'hidden', elevation: 3 }}>
              <View style={{ height: isTablet ? 240 : 176, backgroundColor: colors.slate100 }}>
                <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '800', color: colors.slate800 }}>{item.category}</Text></View>
                  <View style={{ backgroundColor: 'rgba(15,23,42,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{item.readTime}</Text></View>
                </View>
              </View>
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Calendar size={13} color={colors.slate400} /><Text style={{ fontSize: 11, fontWeight: '600', color: colors.slate400 }}>{fmtDate(item.publishedAt)}</Text></View>
                <Text numberOfLines={3} style={{ fontSize: 17, fontWeight: '800', color: colors.slate900, marginTop: 8 }}>{item.title}</Text>
                <Text numberOfLines={3} style={{ fontSize: 13, fontWeight: '500', color: colors.slate600, marginTop: 8 }}>{item.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.blue600 }}>Read Story</Text><ArrowRight size={14} color={colors.blue600} /></View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      ) : null}

      <Sheet visible={!!selected} onClose={() => setSelected(null)} maxHeight="92%">
        {selected ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.indigo600 }}>{selected.category}</Text><Clock size={13} color={colors.slate400} /><Text style={{ fontSize: 11, color: colors.slate500 }}>{selected.readTime}</Text></View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => Share.share({ message: `${selected.title}\n${selected.description}` }).catch(() => {})} style={{ padding: 8 }}><Share2 size={20} color={colors.slate500} /></TouchableOpacity>
                <TouchableOpacity onPress={() => setSelected(null)} style={{ padding: 8 }}><X size={20} color={colors.slate400} /></TouchableOpacity>
              </View>
            </View>
            {selected.image ? <Image source={{ uri: selected.image }} style={{ width: '100%', height: 200 }} contentFit="cover" /> : null}
            <View style={{ padding: 20, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Calendar size={13} color={colors.slate400} /><Text style={{ fontSize: 11, color: colors.slate400, fontWeight: '600' }}>{fmtDate(selected.publishedAt)}</Text></View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.slate900 }}>{selected.title}</Text>
              <Text style={{ fontSize: 14, color: colors.slate600, fontWeight: '500' }}>{selected.description}</Text>
              {(selected.content ? selected.content.split('\n\n') : [selected.description]).map((para, i) => <Text key={i} style={{ fontSize: 15, color: colors.slate700, lineHeight: 24 }}>{para}</Text>)}
              <TouchableOpacity onPress={() => { setSelected(null); router.push('/news'); }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.blue600 }}>View All News →</Text></TouchableOpacity>
            </View>
          </ScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}
