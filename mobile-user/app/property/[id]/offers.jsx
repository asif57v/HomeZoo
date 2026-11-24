import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle, Copy, RefreshCw } from 'lucide-react-native';
import { Text, Loader } from '../../../src/components/ui';
import { BlueHeader } from '../../../src/components/Common';
import { offerService } from '../../../src/services/apiService';
import toast from '../../../src/store/toastStore';
import { colors } from '../../../src/theme';
import { CENTER } from '../../../src/lib/responsive';

const TONES = [
  ['#FEF2F2', '#FECACA', '#DC2626'], ['#EFF6FF', '#BFDBFE', '#2563EB'], ['#F0FDF4', '#BBF7D0', '#16A34A'],
  ['#FFF7ED', '#FED7AA', '#EA580C'], ['#FAF5FF', '#E9D5FF', '#9333EA'], ['#FFFBEB', '#FDE68A', '#D97706'],
];

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = async () => {
    try { setLoading(true); setError(null); setOffers(await offerService.getActive()); } catch { setError('Failed to load offers. Please try again.'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const copy = async (code) => { await Clipboard.setStringAsync(code); toast.success(`Code ${code} copied to clipboard!`); };
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="Available Offers" />
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 16 }, CENTER]}>
        {loading ? <Loader label="Loading offers..." />
        : error ? <View style={{ alignItems: 'center', paddingVertical: 60 }}><Text style={{ color: colors.red500, fontWeight: '700', marginBottom: 16 }}>{error}</Text><TouchableOpacity onPress={load} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><RefreshCw size={16} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>Try Again</Text></TouchableOpacity></View>
        : offers.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: 60 }}><Text style={{ fontSize: 18, fontWeight: '700', color: colors.surface, marginBottom: 8 }}>No active offers</Text><Text style={{ fontSize: 14, color: colors.gray400 }}>Check back later for new exclusive deals!</Text></View>
        : offers.map((o, i) => {
          const [bg, border, fg] = TONES[i % TONES.length];
          return (
            <View key={o._id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: border, backgroundColor: bg }}><Text style={{ fontWeight: '700', fontSize: 14, color: fg }}>{o.code}</Text></View>
                <TouchableOpacity onPress={() => copy(o.code)} style={{ padding: 8, backgroundColor: colors.gray50, borderRadius: 999 }}><Copy size={16} color={colors.gray400} /></TouchableOpacity>
              </View>
              <Text style={{ fontWeight: '700', color: colors.surface, fontSize: 16, marginBottom: 4 }}>{o.title}</Text>
              <Text style={{ fontSize: 12, color: colors.gray500 }}>{o.subtitle || o.description}</Text>
              <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><CheckCircle size={12} color={fg} /><Text style={{ fontSize: 10, fontWeight: '700', color: fg }}>Verified Offer</Text></View>
                <TouchableOpacity onPress={() => { copy(o.code); router.push('/search'); }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>Apply & Book</Text></TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
