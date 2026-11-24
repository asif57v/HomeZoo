import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Linking } from 'react-native';
import { Phone, Send } from 'lucide-react-native';
import { Text, TextField, Button } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import { legalService } from '../../src/services/apiService';
import { errMsg } from '../../src/utils/format';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

export default function PartnerContact() {
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setError(''); setSuccess('');
    if (!f.name || !f.subject || !f.message) { setError('Please fill all required fields.'); return; }
    if (submitting) return;
    try { setSubmitting(true); await legalService.submitContact('partner', f); setSuccess('Your message has been sent. Our team will reach out soon.'); setF({ name: '', email: '', phone: '', subject: '', message: '' }); }
    catch (e) { setError(errMsg(e, 'Failed to send message. Please try again.')); } finally { setSubmitting(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Contact Partner Support" subtitle="Reach the HoomZo team" />
      <ScrollView contentContainerStyle={[{ padding: 16, gap: 14, paddingBottom: 40 }, CENTER]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => Linking.openURL('tel:6232314147')} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' }}><Phone size={18} color="#005CA8" /></View>
          <View><Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray700 }}>Phone</Text><Text style={{ fontSize: 14, color: colors.gray600 }}>+91 6232314147</Text></View>
        </TouchableOpacity>
        {error ? <View style={{ backgroundColor: colors.red50, borderWidth: 1, borderColor: colors.red100, borderRadius: 12, padding: 12 }}><Text style={{ color: colors.red700, fontSize: 12 }}>{error}</Text></View> : null}
        {success ? <View style={{ backgroundColor: colors.green50, borderWidth: 1, borderColor: colors.green100, borderRadius: 12, padding: 12 }}><Text style={{ color: colors.green700, fontSize: 12 }}>{success}</Text></View> : null}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.gray100 }}>
          <TextField label="Full Name" required value={f.name} onChangeText={set('name')} placeholder="Your name" />
          <TextField label="Email" value={f.email} onChangeText={set('email')} placeholder="you@hotel.com" keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Phone" value={f.phone} onChangeText={set('phone')} placeholder="+91" keyboardType="phone-pad" />
          <TextField label="Subject" required value={f.subject} onChangeText={set('subject')} placeholder="Billing, onboarding, payouts..." />
          <TextField label="Message" required value={f.message} onChangeText={set('message')} placeholder="Share context so we can assist you faster." multiline />
          <Button title={submitting ? 'Sending...' : 'Send Message'} onPress={submit} loading={submitting} variant="primary" icon={<Send size={16} color="#fff" />} style={{ borderRadius: 12 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
