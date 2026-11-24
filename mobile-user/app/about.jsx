import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Info } from 'lucide-react-native';
import { Text, Loader } from '../src/components/ui';
import { BlueHeader } from '../src/components/Common';
import { legalService } from '../src/services/apiService';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

const DEFAULT = 'HoomZo helps you discover, compare and book stays that match your style, from budget hostels to premium villas, with a mobile-first experience.';

export default function About() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    legalService.getPage('user', 'about').then((r) => setPage(r.page)).catch(() => setError('About content is not configured yet. Showing default copy.')).finally(() => setLoading(false));
  }, []);
  const content = page?.content || DEFAULT;
  const paras = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="About Us" subtitle="Learn more about the story, mission and values behind HoomZo." />
      <ScrollView contentContainerStyle={[{ padding: 20 }, CENTER]}>
        {error ? <View style={{ marginBottom: 16, backgroundColor: colors.amber50, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12 }}><Text style={{ fontSize: 12, color: colors.amber700 }}>{error}</Text></View> : null}
        {loading ? <Loader /> : (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.gray100, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,92,168,0.05)', alignItems: 'center', justifyContent: 'center' }}><Info size={20} color={colors.surface} /></View>
              <Text style={{ flex: 1, fontWeight: '700', fontSize: 18, color: colors.surface }}>{page?.title || 'Built for modern travellers'}</Text>
            </View>
            {(paras.length ? paras : [content]).map((p, i) => <Text key={i} style={{ fontSize: 14, color: colors.gray600, lineHeight: 22 }}>{p}</Text>)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
