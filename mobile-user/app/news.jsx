import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Share, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { TrendingUp, Calendar, Clock, ArrowRight, Search, X, Share2, BookOpen, ChevronLeft } from 'lucide-react-native';
import { Text, Sheet } from '../src/components/ui';
import { propertyService } from '../src/services/apiService';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

const CATEGORIES = ['All', 'Market Insights', 'Legal Guide', 'Lifestyle & Design', 'Infrastructure', 'Investment'];
const fmt = (d) => { if (!d) return 'Recent'; try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return 'Recent'; } };

export default function News() {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);

  useEffect(() => {
    (async () => {
      try { setLoading(true); const params = { limit: 30 }; if (cat !== 'All') params.category = cat; const d = await propertyService.getNewsArticles(params); if (d && d.articles) setArticles(d.articles); }
      catch {} finally { setLoading(false); }
    })();
  }, [cat]);

  const shown = useMemo(() => articles.filter((a) => { if (!q.trim()) return true; const s = q.toLowerCase(); return a.title?.toLowerCase().includes(s) || a.description?.toLowerCase().includes(s) || a.category?.toLowerCase().includes(s); }), [articles, q]);

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(248,250,252,0.7)' }}>
      <ScrollView contentContainerStyle={[{ paddingBottom: 40 }, CENTER]} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
          <SafeAreaView edges={['top']} style={{ padding: 20, paddingBottom: 24 }}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ alignSelf: 'flex-start', padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, marginBottom: 16 }}><ChevronLeft size={20} color="#fff" /></TouchableOpacity>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)', marginBottom: 16 }}><TrendingUp size={16} color="#60a5fa" /><Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 12 }}>Market Intelligence & Insights</Text></View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>Real Estate & Property <Text style={{ fontSize: 28, fontWeight: '900', color: '#60a5fa' }}>Updates</Text></Text>
            <Text style={{ marginTop: 12, fontSize: 14, color: '#cbd5e1', lineHeight: 21 }}>Stay up-to-date with ground reality reports, upcoming expressways, RERA compliance guidelines, and smart land investment strategies across prime hubs.</Text>
            <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.8)', borderWidth: 1, borderColor: 'rgba(51,65,85,0.8)', borderRadius: 16, paddingHorizontal: 14, gap: 10 }}>
              <Search size={18} color="#94a3b8" />
              <TextInput value={q} onChangeText={setQ} placeholder="Search articles, topics or keywords..." placeholderTextColor="#64748b" style={{ flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 }} />
              {q ? <TouchableOpacity onPress={() => setQ('')}><X size={16} color="#94a3b8" /></TouchableOpacity> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 14 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setCat(c)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: cat === c ? '#2563eb' : 'rgba(15,23,42,0.6)', borderWidth: cat === c ? 0 : 1, borderColor: 'rgba(51,65,85,0.6)' }}><Text style={{ fontSize: 12, fontWeight: '700', color: cat === c ? '#fff' : '#cbd5e1' }}>{c}</Text></TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
        <View style={{ padding: 16, gap: 24 }}>
          {loading ? <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color="#2563eb" size="large" /></View>
          : shown.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: colors.slate200 }}>
              <BookOpen size={56} color={colors.slate300} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.slate900 }}>No Articles Found</Text>
              <Text style={{ color: colors.slate500, fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 16 }}>Try selecting a different category or clearing your search.</Text>
              {q ? <TouchableOpacity onPress={() => setQ('')} style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.slate900, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Clear Search</Text></TouchableOpacity> : null}
            </View>
          ) : shown.map((a) => (
            <TouchableOpacity key={a._id || a.id} activeOpacity={0.92} onPress={() => setSel(a)} style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)', overflow: 'hidden', elevation: 3 }}>
              <View style={{ height: 200, backgroundColor: colors.slate100 }}>
                <Image source={{ uri: a.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }} />
                <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 12, fontWeight: '900', color: colors.slate900 }}>{a.category}</Text></View>
                <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{a.readTime}</Text></View>
              </View>
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}><Calendar size={14} color="#2563eb" /><Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb' }}>{fmt(a.publishedAt || a.date || a.createdAt)}</Text></View>
                <Text numberOfLines={3} style={{ fontSize: 18, fontWeight: '800', color: colors.slate900 }}>{a.title}</Text>
                <Text numberOfLines={3} style={{ marginTop: 10, fontSize: 14, fontWeight: '500', color: colors.slate600 }}>{a.description}</Text>
              </View>
              <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.slate100 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: colors.slate900 }}>Read Full Story</Text>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' }}><ArrowRight size={16} color={colors.slate500} /></View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <Sheet visible={!!sel} onClose={() => setSel(null)} maxHeight="94%">
        {sel ? (
          <ScrollView contentContainerStyle={[{ paddingBottom: 16 }, CENTER]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 12, fontWeight: '800', color: '#1d4ed8' }}>{sel.category}</Text></View><Clock size={12} color={colors.slate500} /><Text style={{ fontSize: 12, color: colors.slate500, fontWeight: '600' }}>{sel.readTime}</Text></View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <TouchableOpacity onPress={() => Share.share({ message: `${sel.title}\n${sel.description}` }).catch(() => {})} style={{ padding: 8 }}><Share2 size={20} color={colors.slate500} /></TouchableOpacity>
                <TouchableOpacity onPress={() => setSel(null)} style={{ padding: 8 }}><X size={20} color={colors.slate400} /></TouchableOpacity>
              </View>
            </View>
            <View style={{ paddingHorizontal: 20, gap: 14 }}>
              {sel.image ? <Image source={{ uri: sel.image }} style={{ width: '100%', height: 200, borderRadius: 16 }} contentFit="cover" /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Calendar size={14} color={colors.slate400} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.slate400 }}>Published on {fmt(sel.publishedAt || sel.createdAt)}</Text></View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.slate900 }}>{sel.title}</Text>
              <View style={{ padding: 16, borderRadius: 16, backgroundColor: 'rgba(239,246,255,0.6)', borderWidth: 1, borderColor: '#DBEAFE' }}><Text style={{ color: '#172554', fontWeight: '500', fontSize: 14 }}>{sel.description}</Text></View>
              {(sel.content ? sel.content.split('\n\n') : [sel.description]).map((p, i) => <Text key={i} style={{ fontSize: 15, color: colors.slate700, lineHeight: 24 }}>{p}</Text>)}
              <Text style={{ fontSize: 12, color: colors.slate400, fontWeight: '500' }}>Hoomzo Market Intelligence</Text>
            </View>
          </ScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}
