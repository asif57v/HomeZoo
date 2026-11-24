import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Mail, Phone, Send } from 'lucide-react-native';
import { Text, TextField, Button } from '../src/components/ui';
import { BlueHeader } from '../src/components/Common';
import { legalService } from '../src/services/apiService';
import { errMsg } from '../src/utils/format';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

const Info = ({ Icon, k, v }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,92,168,0.05)', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={colors.surface} /></View>
    <View style={{ flex: 1 }}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray700 }}>{k}</Text><Text numberOfLines={1} style={{ fontSize: 12, color: colors.gray500 }}>{v}</Text></View>
  </View>
);

export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setError(''); setSuccess('');
    if (!f.name || !f.subject || !f.message) { setError('Please fill all required fields.'); return; }
    if (submitting) return;
    try { setSubmitting(true); await legalService.submitContact('user', f); setSuccess('Your message has been sent. Our team will reach out soon.'); setF({ name: '', email: '', phone: '', subject: '', message: '' }); }
    catch (e) { setError(errMsg(e, 'Failed to send message. Please try again.')); } finally { setSubmitting(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="Contact Us" subtitle="Have questions or need help with a booking? Share your query with us." />
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 14 }, CENTER]} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}><Info Icon={Mail} k="Email" v="support@hoomzo.in" /><Info Icon={Phone} k="Phone" v="+91-6232314147" /></View>
        {error ? <View style={{ backgroundColor: colors.red50, borderWidth: 1, borderColor: colors.red100, borderRadius: 12, padding: 12 }}><Text style={{ color: colors.red700, fontSize: 12 }}>{error}</Text></View> : null}
        {success ? <View style={{ backgroundColor: colors.amber50, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12 }}><Text style={{ color: colors.amber700, fontSize: 12 }}>{success}</Text></View> : null}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray100 }}>
          <TextField label="Full Name" required value={f.name} onChangeText={set('name')} placeholder="Enter your name" />
          <TextField label="Email" value={f.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <TextField label="Phone" value={f.phone} onChangeText={set('phone')} placeholder="+91" keyboardType="phone-pad" />
          <TextField label="Subject" required value={f.subject} onChangeText={set('subject')} placeholder="What do you need help with?" />
          <TextField label="Message" required value={f.message} onChangeText={set('message')} placeholder="Share details so we can assist you faster." multiline />
          <Button title={submitting ? 'Sending...' : 'Send Message'} onPress={submit} loading={submitting} variant="primary" icon={<Send size={16} color="#fff" />} style={{ borderRadius: 12 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
