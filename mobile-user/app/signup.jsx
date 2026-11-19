import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Phone, Mail, ArrowRight, Shield, User } from 'lucide-react-native';
import { Text, Input, Button } from '../src/components/ui';
import { Brand, AuthLegalLinks, OtpBoxes, useResendTimer, ErrorText } from '../src/components/AuthParts';
import { authService } from '../src/services/apiService';
import useAuthStore from '../src/store/authStore';
import toast from '../src/store/toastStore';
import { errMsg } from '../src/utils/format';
import { colors } from '../src/theme';

const Field = ({ label, required, icon, children }) => (
  <View>
    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.gray700, marginBottom: 8 }}>
      {label} {required ? <Text style={{ color: colors.red500 }}>*</Text> : <Text style={{ fontSize: 12, color: colors.gray400 }}>(Optional)</Text>}
    </Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, gap: 12, backgroundColor: '#fff' }}>
      {icon}
      {children}
    </View>
  </View>
);

export default function Signup() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, resetTimer] = useResendTimer(step === 2);
  const canResend = timer === 0;

  useEffect(() => { if (params.phone) setForm((p) => ({ ...p, phone: String(params.phone) })); }, [params.phone]);

  const exists = (err) => err?.requiresLogin || /already exists/i.test(errMsg(err, ''));

  const handleSendOTP = async () => {
    setError('');
    if (!form.name || form.name.length < 3) { setError('Please enter your full name'); return; }
    if (form.phone.length !== 10) { setError('Please enter a valid 10-digit phone number'); return; }
    try {
      setLoading(true);
      await authService.sendOtp(form.phone, 'register');
      resetTimer(); setStep(2);
    } catch (err) {
      if (exists(err)) {
        setError('Account already exists. Redirecting to login...');
        setTimeout(() => router.replace({ pathname: '/login', params: { phone: form.phone } }), 1500);
      } else setError(errMsg(err, 'Failed to send OTP'));
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      setLoading(true); setError('');
      await authService.sendOtp(form.phone, 'register');
      resetTimer(); setOtp(['', '', '', '', '', '']);
      toast.success('OTP sent successfully!');
    } catch (err) { const m = errMsg(err, 'Failed to resend OTP'); setError(m); toast.error(m); } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) { setError('Please enter complete OTP'); return; }
    try {
      setLoading(true); setError('');
      await useAuthStore.getState().verifyOtp({ phone: form.phone, otp: otpString, name: form.name, email: form.email || undefined });
      router.replace('/');
    } catch (err) { setError(errMsg(err, 'Verification failed')); } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={['#FFFBEB', '#FFFFFF', '#FFF7ED']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center' }}>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Brand style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 30, fontWeight: '700', color: colors.gray900 }}>Create Account</Text>
                <Text style={{ color: colors.gray500, marginTop: 8 }}>Join thousands of happy travelers</Text>
              </View>
              <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: colors.gray100, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 }}>
                {step === 1 ? (
                  <View style={{ gap: 20 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gray900 }}>Sign Up</Text>
                    <Field label="Full Name" required icon={<User size={18} color={colors.gray400} />}>
                      <Input value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="John Doe" style={{ flex: 1 }} />
                    </Field>
                    <Field label="Phone Number" required icon={<Phone size={18} color={colors.gray400} />}>
                      <Input value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v.replace(/\D/g, '') })} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} style={{ flex: 1 }} />
                    </Field>
                    <Field label="Email Address" icon={<Mail size={18} color={colors.gray400} />}>
                      <Input value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" style={{ flex: 1 }} />
                    </Field>
                    <ErrorText>{error}</ErrorText>
                    <Button title="Send OTP" variant="amber" onPress={handleSendOTP} loading={loading} icon={<ArrowRight size={20} color="#fff" />} style={{ flexDirection: 'row-reverse', borderRadius: 12 }} />
                  </View>
                ) : (
                  <View style={{ gap: 24 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 64, height: 64, backgroundColor: colors.amber100, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Shield size={32} color={colors.amber600} /></View>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gray900 }}>Verify OTP</Text>
                      <Text style={{ fontSize: 14, color: colors.gray500, marginTop: 8 }}>Enter the code sent to +91 {form.phone}</Text>
                    </View>
                    <OtpBoxes value={otp} onChange={setOtp} />
                    <View style={{ alignItems: 'center' }}>
                      {canResend ? (
                        <Text style={{ fontSize: 12, color: colors.gray500 }}>Didn't receive code? <Text onPress={handleResend} style={{ fontSize: 12, fontWeight: '700', color: colors.amber600 }}>Resend OTP</Text></Text>
                      ) : (
                        <Text style={{ fontSize: 12, color: colors.gray500 }}>Resend OTP in <Text style={{ fontSize: 12, fontWeight: '700', color: colors.amber600 }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</Text></Text>
                      )}
                    </View>
                    <ErrorText>{error}</ErrorText>
                    <Button title="Verify & Create Account" variant="amber" onPress={handleVerify} loading={loading} style={{ borderRadius: 12 }} />
                    <TouchableOpacity onPress={() => { setStep(1); setError(''); }}><Text style={{ textAlign: 'center', fontSize: 12, color: colors.gray500 }}>Change Details</Text></TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={{ textAlign: 'center', fontSize: 14, color: colors.gray500, marginTop: 24 }}>
                Already have an account? <Text onPress={() => router.replace('/login')} style={{ fontSize: 14, fontWeight: '700', color: colors.amber600 }}>Login</Text>
              </Text>
              <AuthLegalLinks action="signing up" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
