import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { MessageSquare, Phone, Mail, CircleHelp, ChevronDown } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import { LegalContent } from '../../src/components/Common';
import { faqService, legalService } from '../../src/services/apiService';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

export default function PartnerSupport() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [support, setSupport] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    faqService.getFaqs('partner').then(setFaqs).catch(() => {}).finally(() => setLoading(false));
    legalService.getPage('partner', 'support').then((r) => setSupport(r.page)).catch(() => {});
  }, []);
  const wa = (support?.supportWhatsapp || '919111384535').replace(/\D/g, '');
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Support Center" subtitle="We are here to help" />
      <ScrollView contentContainerStyle={[{ padding: 16, gap: 16, paddingBottom: 40 }, CENTER]}>
        {support?.content ? <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100, gap: 6 }}><LegalContent content={support.content} />{support.supportHours ? <Text style={{ fontSize: 12, color: colors.gray500 }}>{support.supportHours}</Text> : null}</View> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${wa}`)} style={{ flex: 1, alignItems: 'center', gap: 8, backgroundColor: colors.green50, borderWidth: 1, borderColor: colors.green100, borderRadius: 16, padding: 18 }}><MessageSquare size={20} color={colors.green600} /><Text style={{ fontSize: 13, fontWeight: '700', color: colors.green700 }}>WhatsApp Chat</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${support?.supportPhone || '9111384535'}`)} style={{ flex: 1, alignItems: 'center', gap: 8, backgroundColor: colors.blue50, borderWidth: 1, borderColor: colors.blue100, borderRadius: 16, padding: 18 }}><Phone size={20} color={colors.blue600} /><Text style={{ fontSize: 13, fontWeight: '700', color: colors.blue700 }}>Call Support</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><CircleHelp size={18} color="#005CA8" /><Text style={{ fontWeight: '800', color: colors.gray900, fontSize: 16 }}>Frequently Asked Questions</Text></View>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' }}>
          {loading ? <View style={{ padding: 28, alignItems: 'center' }}><ActivityIndicator color={colors.gray400} /></View> : faqs.length === 0 ? <Text style={{ padding: 28, textAlign: 'center', color: colors.gray400, fontSize: 13 }}>No FAQs available.</Text> : faqs.map((f, i) => (
            <View key={f._id || i} style={{ borderBottomWidth: i < faqs.length - 1 ? 1 : 0, borderBottomColor: colors.gray50 }}>
              <TouchableOpacity onPress={() => setOpen(open === i ? null : i)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><Text style={{ flex: 1, fontWeight: '700', color: colors.gray800, fontSize: 14 }}>{f.question}</Text><ChevronDown size={18} color={colors.gray400} style={{ transform: [{ rotate: open === i ? '180deg' : '0deg' }] }} /></TouchableOpacity>
              {open === i ? <Text style={{ paddingHorizontal: 16, paddingBottom: 16, fontSize: 13, color: colors.gray500, lineHeight: 20 }}>{f.answer}</Text> : null}
            </View>
          ))}
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}><Text style={{ fontSize: 12, color: colors.gray500 }}>Still have questions?</Text><TouchableOpacity onPress={() => Linking.openURL(`mailto:${support?.supportEmail || 'partners@rokkooin.com'}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Mail size={14} color="#005CA8" /><Text style={{ fontSize: 13, fontWeight: '700', color: '#005CA8' }}>Email us at {support?.supportEmail || 'partners@rokkooin.com'}</Text></TouchableOpacity></View>
      </ScrollView>
    </View>
  );
}
