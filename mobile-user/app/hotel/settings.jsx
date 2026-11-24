import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, ChevronRight, LogOut } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import useAuthStore from '../../src/store/authStore';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

// Only the options the web page actually wires (saved bank details + sign out). The web's other rows
// (toggles, language, 2FA, dark mode) are non-functional placeholders there and are not carried over.
export default function PartnerSettings() {
  const router = useRouter();
  const logout = async () => { await useAuthStore.getState().logout(); router.replace('/login'); };
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Settings" subtitle="Preferences" />
      <ScrollView contentContainerStyle={[{ padding: 16, gap: 12 }, CENTER]}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gray400, letterSpacing: 1, textTransform: 'uppercase' }}>Payments</Text>
        <TouchableOpacity onPress={() => router.push('/hotel/bank-details')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.gray100 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' }}><CreditCard size={18} color="#005CA8" /></View>
          <Text style={{ flex: 1, fontWeight: '600', color: colors.gray800 }}>Saved Bank Details</Text><ChevronRight size={16} color={colors.gray300} />
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.red50, paddingVertical: 14, borderRadius: 14 }}><LogOut size={18} color={colors.red500} /><Text style={{ color: colors.red500, fontWeight: '700' }}>Sign Out</Text></TouchableOpacity>
        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.gray400, marginTop: 8 }}>HoomZo Partner App v1.0.0</Text>
      </ScrollView>
    </View>
  );
}
