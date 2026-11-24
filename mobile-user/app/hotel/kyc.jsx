import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, CheckCircle, Clock, XCircle, FileText } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import useAuthStore from '../../src/store/authStore';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

// The web KYC page renders a hard-coded demo list. The app shows the partner's real approval status instead
// (user.partnerApprovalStatus) and points to support for document changes.
export default function PartnerKYC() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user) || {};
  const status = user.partnerApprovalStatus || 'pending';
  const cfg = status === 'approved' ? { Icon: CheckCircle, c: colors.green600, bg: colors.green50, label: 'Verified', desc: 'Your documents are verified. Payouts are enabled.' }
    : status === 'rejected' ? { Icon: XCircle, c: colors.red600, bg: colors.red50, label: 'Action Needed', desc: 'Your KYC documents were rejected. Please contact support to re-submit them.' }
    : { Icon: Clock, c: colors.amber600, bg: colors.amber50, label: 'Reviewing', desc: 'Your documents are under review. This usually takes 24–48 hours.' };
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="KYC Verification" subtitle="Complete your profile" />
      <ScrollView contentContainerStyle={[{ padding: 16, gap: 16 }, CENTER]}>
        <View style={{ backgroundColor: '#005CA8', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Shield size={28} color="#fff" />
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: '#fff', fontSize: 17 }}>Verification Status</Text><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Complete all steps to start receiving payouts.</Text></View>
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FileText size={16} color={colors.gray500} /><Text style={{ flex: 1, fontWeight: '700', color: colors.gray900 }}>Identity & Business Documents</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cfg.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}><cfg.Icon size={10} color={cfg.c} /><Text style={{ fontSize: 10, fontWeight: '700', color: cfg.c }}>{cfg.label}</Text></View>
          </View>
          <Text style={{ fontSize: 12, color: colors.gray500 }}>{cfg.desc}</Text>
          <TouchableOpacity onPress={() => router.push('/hotel/support')} style={{ alignSelf: 'flex-start', backgroundColor: colors.blue50, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#005CA8' }}>Contact Support</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
