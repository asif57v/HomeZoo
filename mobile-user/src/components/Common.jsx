import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { Text } from './ui';
import { legalService } from '../services/apiService';
import { colors } from '../theme';

// Blue rounded page header used by most user pages (web: "bg-surface text-white p-6 rounded-b-[30px]")
export const BlueHeader = ({ title, subtitle, right, children, onBack }) => {
  const router = useRouter();
  return (
    <View style={{ backgroundColor: colors.surface, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 6 }}>
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle || children ? 14 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999 }}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{title}</Text>
          </View>
          {right}
        </View>
        {subtitle ? <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{subtitle}</Text> : null}
        {children}
      </SafeAreaView>
    </View>
  );
};

// Gradient-free header variant for legal pages (compact)
export const LegalHeader = ({ eyebrow, title }) => {
  const router = useRouter();
  return (
    <View style={{ backgroundColor: colors.surface, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 4 }}>
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: 12, paddingBottom: 14, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={18} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{eyebrow}</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{title}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

// Admin-authored text: "# Heading", "## Sub heading", "- bullet", blank line = paragraph break
export const LegalContent = ({ content, style }) => {
  const lines = typeof content === 'string' ? content.split('\n') : [];
  const blocks = []; let list = null;
  const flush = () => { if (list) { blocks.push({ type: 'ul', items: list }); list = null; } };
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) return flush();
    if (line.startsWith('## ')) { flush(); blocks.push({ type: 'h3', text: line.slice(3) }); }
    else if (line.startsWith('# ')) { flush(); blocks.push({ type: 'h2', text: line.slice(2) }); }
    else if (/^[-*•]\s+/.test(line)) { list = list || []; list.push(line.replace(/^[-*•]\s+/, '')); }
    else { flush(); blocks.push({ type: 'p', text: line }); }
  });
  flush();
  return (
    <View style={[{ gap: 8 }, style]}>
      {blocks.map((b, i) => {
        if (b.type === 'h2') return <Text key={i} style={{ fontWeight: '700', color: colors.slate900, fontSize: 14, borderTopWidth: 1, borderTopColor: colors.slate100, paddingTop: 12, marginTop: 4 }}>{b.text}</Text>;
        if (b.type === 'h3') return <Text key={i} style={{ fontWeight: '600', color: colors.slate800, fontSize: 12, marginTop: 4 }}>{b.text}</Text>;
        if (b.type === 'ul') return <View key={i} style={{ gap: 6 }}>{b.items.map((it, j) => <View key={j} style={{ flexDirection: 'row', gap: 8 }}><View style={{ marginTop: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#005CA8' }} /><Text style={{ flex: 1, fontSize: 12, color: colors.slate600, lineHeight: 19 }}>{it}</Text></View>)}</View>;
        return <Text key={i} style={{ fontSize: 12, color: colors.slate600, lineHeight: 19 }}>{b.text}</Text>;
      })}
    </View>
  );
};

export const formatUpdated = (page) => (page?.updatedAt ? new Date(page.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null);

// Terms / Privacy style page (web TermsPage / PrivacyPage)
export const PolicyPage = ({ audience = 'user', slug, eyebrowUser = 'Hoomzo Stays', titleUser, titlePartner, fallback }) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => {
    setLoading(true); setError('');
    legalService.getPage(audience, slug).then((res) => { if (res.success) setPage(res.page); }).catch(() => setError(`Unable to load ${titleUser}.`)).finally(() => setLoading(false));
  };
  useEffect(load, [audience, slug]);
  const isPartner = audience === 'partner';
  const title = isPartner ? titlePartner || titleUser : titleUser;
  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <LegalHeader eyebrow={isPartner ? 'Partner Portal' : eyebrowUser} title={title} />
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.slate100 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.slate100 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}><FileText size={15} color="#005CA8" /></View>
              <Text style={{ fontWeight: '700', fontSize: 12, color: colors.slate800 }}>{page?.title || title}</Text>
            </View>
            {formatUpdated(page) ? <View style={{ backgroundColor: colors.slate50, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: colors.slate100 }}><Text style={{ fontSize: 10, color: colors.slate500, fontWeight: '500' }}>Updated: {formatUpdated(page)}</Text></View> : null}
          </View>
          {loading ? <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}><ActivityIndicator color="#005CA8" /><Text style={{ fontSize: 12, color: colors.slate400, fontWeight: '500' }}>Loading document...</Text></View>
          : error ? <View style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ color: colors.red500, fontWeight: '600', fontSize: 12, marginBottom: 12 }}>{error}</Text><TouchableOpacity onPress={load} style={{ backgroundColor: '#005CA8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Retry</Text></TouchableOpacity></View>
          : <LegalContent content={page?.content || fallback} />}
        </View>
      </ScrollView>
    </View>
  );
};

export const Row = ({ children, style }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
