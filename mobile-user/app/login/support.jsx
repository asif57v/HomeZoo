import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, Phone, Mail, ChevronRight, Clock, Shield, FileText } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { BlueHeader, LegalContent } from '../../src/components/Common';
import { faqService, legalService } from '../../src/services/apiService';
import { colors } from '../../src/theme';

const Btn = ({ tone, Icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: tone === 'blue' ? '#EFF6FF' : colors.green50, borderColor: tone === 'blue' ? '#DBEAFE' : colors.green100 }}>
    <View style={{ width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={tone === 'blue' ? colors.blue600 : colors.green600} /></View>
    <Text style={{ fontSize: 12, fontWeight: '700', color: tone === 'blue' ? colors.blue700 : colors.green700 }}>{label}</Text>
  </TouchableOpacity>
);

export default function Support() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [support, setSupport] = useState(null);
  useEffect(() => {
    faqService.getFaqs('user').then(setFaqs).catch(() => {}).finally(() => setLoading(false));
    legalService.getPage('user', 'support').then((r) => setSupport(r.page)).catch(() => {});
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="Help & Support" subtitle={support?.title && support.title !== 'Help & Support' ? support.title : 'Find answers or contact our support team.'}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 6 }}>How can we help you?</Text>
      </BlueHeader>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray100, elevation: 3 }}>
          <Text style={{ fontWeight: '700', color: colors.surface, fontSize: 14, marginBottom: 16 }}>Contact Us</Text>
          {support?.content ? <LegalContent content={support.content} style={{ marginBottom: 16 }} /> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {support?.supportWhatsapp ? <Btn tone="blue" Icon={MessageSquare} label="WhatsApp Chat" onPress={() => Linking.openURL(`https://wa.me/${support.supportWhatsapp.replace(/\D/g, '')}`)} /> : <Btn tone="blue" Icon={MessageSquare} label="Send a Message" onPress={() => router.push('/contact')} />}
            {support?.supportPhone ? <Btn tone="green" Icon={Phone} label="Call Support" onPress={() => Linking.openURL(`tel:${support.supportPhone}`)} /> : <Btn tone="green" Icon={Phone} label="Contact Us" onPress={() => router.push('/contact')} />}
          </View>
          {support?.supportEmail ? <TouchableOpacity onPress={() => Linking.openURL(`mailto:${support.supportEmail}`)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Mail size={14} color={colors.surface} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.surface }}>{support.supportEmail}</Text></TouchableOpacity> : null}
          {support?.supportHours ? <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Clock size={14} color={colors.gray500} /><Text style={{ fontSize: 12, color: colors.gray500 }}>{support.supportHours}</Text></View> : null}
        </View>
        <View>
          <Text style={{ fontWeight: '700', color: colors.gray500, fontSize: 12, marginBottom: 12 }}>Frequently Asked Questions</Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' }}>
            {loading ? <View style={{ padding: 32, alignItems: 'center' }}><ActivityIndicator color={colors.gray400} /></View>
            : faqs.length === 0 ? <Text style={{ padding: 32, textAlign: 'center', color: colors.gray400, fontSize: 12 }}>No FAQs available.</Text>
            : faqs.map((f, i) => (
              <View key={f._id || i} style={{ borderBottomWidth: i < faqs.length - 1 ? 1 : 0, borderBottomColor: colors.gray50 }}>
                <TouchableOpacity onPress={() => setOpenFaq(openFaq === i ? null : i)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.surface }}>{f.question}</Text>
                  <ChevronRight size={16} color={colors.gray400} style={{ transform: [{ rotate: openFaq === i ? '90deg' : '0deg' }] }} />
                </TouchableOpacity>
                {openFaq === i ? <Text style={{ fontSize: 12, color: colors.gray500, padding: 16, paddingTop: 0, lineHeight: 19 }}>{f.answer}</Text> : null}
              </View>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => router.push('/login/terms')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100, borderRadius: 12, paddingVertical: 12 }}><FileText size={14} color={colors.surface} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.surface }}>Terms</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login/privacy')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100, borderRadius: 12, paddingVertical: 12 }}><Shield size={14} color={colors.surface} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.surface }}>Privacy</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
