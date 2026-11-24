import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, TrendingUp, Users } from 'lucide-react-native';
import { Text } from '../src/components/ui';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

export default function PartnerLanding() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ position: 'absolute', top: -60, right: -60, width: 256, height: 256, borderRadius: 128, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      <View style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(0,107,196,0.2)' }} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[{ padding: 24, flexGrow: 1 }, CENTER]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999 }}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>HoomZo Partner</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 16, lineHeight: 42 }}>Grow your{'\n'}<Text style={{ fontSize: 36, fontWeight: '900', color: colors.accent }}>Business</Text> with us.</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 17, marginBottom: 32 }}>Join thousands of hotels and homeowners who trust HoomZo to increase their revenue.</Text>
            {[[TrendingUp, 'Increase revenue by up to 30%'], [Users, 'Reach millions of travellers'], [CheckCircle, 'Hassle-free management']].map(([Icon, t], i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={colors.accent} /></View>
                <Text style={{ fontWeight: '700', fontSize: 16, color: '#fff' }}>{t}</Text>
              </View>))}
            <TouchableOpacity onPress={() => router.push('/hotel/join')} style={{ marginTop: 24, paddingVertical: 16, backgroundColor: colors.accent, borderRadius: 16, alignItems: 'center' }}><Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>List Your Property</Text></TouchableOpacity>
            <Text style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>Already have listed properties? <Text onPress={() => router.push('/hotel/partner-dashboard')} style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>Go to Host Dashboard</Text></Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
