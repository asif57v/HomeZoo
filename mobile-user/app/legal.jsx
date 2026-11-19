import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FileText, Shield } from 'lucide-react-native';
import { Text } from '../src/components/ui';
import { LegalHeader, LegalContent, formatUpdated } from '../src/components/Common';
import { legalService } from '../src/services/apiService';
import { colors } from '../src/theme';

const Card = ({ icon: Icon, tint, bg, title, page, fallback }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.slate100, marginBottom: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.slate100, flexWrap: 'wrap', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon size={15} color={tint} /></View><Text style={{ fontWeight: '700', fontSize: 12, color: colors.slate800 }}>{page?.title || title}</Text></View>
      {formatUpdated(page) ? <Text style={{ fontSize: 10, color: colors.slate500 }}>Updated: {formatUpdated(page)}</Text> : null}
    </View>
    <LegalContent content={page?.content || fallback} />
  </View>
);

export default function Legal() {
  const { audience: a } = useLocalSearchParams();
  const audience = a || 'user';
  const [privacy, setPrivacy] = useState(null);
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.allSettled([legalService.getPage(audience, 'privacy'), legalService.getPage(audience, 'terms')]).then(([p, t]) => {
      if (p.status === 'fulfilled' && p.value?.page) setPrivacy(p.value.page);
      if (t.status === 'fulfilled' && t.value?.page) setTerms(t.value.page);
    }).finally(() => setLoading(false));
  }, [audience]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <LegalHeader eyebrow={audience === 'partner' ? 'Partner Portal' : 'Hoomzo Stays'} title={`${audience === 'partner' ? 'Partner' : 'User'} Policies & Agreements`} />
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {loading ? <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 12 }}><ActivityIndicator color="#005CA8" /><Text style={{ fontSize: 12, color: colors.slate400 }}>Loading policies...</Text></View> : (<>
          <Card icon={Shield} tint={colors.emerald600} bg={colors.emerald50} title="Privacy Policy" page={privacy} fallback="At HoomZo, we take your privacy seriously. This policy describes how we collect, use, and handle your data." />
          <Card icon={FileText} tint="#005CA8" bg="#EFF6FF" title={audience === 'partner' ? 'Partner Agreement' : 'Terms & Conditions'} page={terms} fallback="By using HoomZo, you agree to the latest booking, cancellation and usage terms defined by the platform." />
        </>)}
      </ScrollView>
    </View>
  );
}
