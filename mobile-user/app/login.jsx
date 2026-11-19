import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Phone, ArrowRight, Shield } from 'lucide-react-native';
import { Text, Input, Button } from '../src/components/ui';
import { Brand, AuthLegalLinks, OtpBoxes, useResendTimer, ErrorText } from '../src/components/AuthParts';
import { authService } from '../src/services/apiService';
import useAuthStore from '../src/store/authStore';
import toast from '../src/store/toastStore';
import { errMsg } from '../src/utils/format';
import { colors } from '../src/theme';

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, resetTimer] = useResendTimer(step === 2);
  const canResend = timer === 0;

  useEffect(() => { if (params.phone) setPhone(String(params.phone)); }, [params.phone]);

  const notFound = (err) => {
    const msg = errMsg(err, '');
    return err?.requiresRegistration || /account not found/i.test(msg);
  };

  const handleSendOTP = async () => {
    setError('');
    if (phone.length !== 10) { setError('Please enter a valid 10-digit phone number'); return; }
    try {
      setLoading(true);
      await authService.sendOtp(phone, 'login');
      resetTimer();
      setStep(2);
    } catch (err) {
      if (notFound(err)) {
        setError('Account not found. Redirecting to signup...');
        setTimeout(() => router.replace({ pathname: '/signup', params: { phone } }), 1500);
      } else setError(errMsg(err, 'Failed to send OTP'));
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      setLoading(true); setError('');
      await authService.sendOtp(phone, 'login');
      resetTimer(); setOtp(['', '', '', '', '', '']);
      toast.success('OTP sent successfully!');
    } catch (err) { setError(errMsg(err, 'Failed to resend OTP')); } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) { setError('Please enter complete OTP'); return; }
    try {
      setLoading(true); setError('');
      await useAuthStore.getState().verifyOtp({ phone, otp: otpString });
      router.replace('/');
    } catch (err) {
      if (notFound(err)) {
        setError('Account not found. Redirecting to signup...');
        setTimeout(() => router.replace({ pathname: '/signup', params: { phone } }), 1500);
      } else setError(errMsg(err, 'Verification failed'));
    } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={['#FFFBEB', '#FFFFFF', '#FFF7ED']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ width: '100%', maxWidth: 384, alignSelf: 'center' }}>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Brand style={{ marginBottom: 24 }} />
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.gray900, letterSpacing: -0.5 }}>Welcome Back</Text>
                <Text style={{ fontSize: 12, color: colors.gray400, fontWeight: '500', marginTop: 4 }}>Login to continue your journey</Text>
              </View>

              {step === 1 ? (
                <View style={{ gap: 24 }}>
                  <View>
                    <Text style={{ fontSize: 10, letterSpacing: 1, fontWeight: '700', color: colors.gray400, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' }}>Phone Number</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                      <Phone size={18} color={colors.gray400} />
                      <Input value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, ''))} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} style={{ flex: 1, fontSize: 18, fontFamily: undefined }} />
                    </View>
                  </View>
                  <ErrorText>{error}</ErrorText>
                  <Button title="Send OTP" onPress={handleSendOTP} loading={loading} icon={<ArrowRight size={20} color="#fff" />} style={{ flexDirection: 'row-reverse' }} />
                </View>
              ) : (
                <View style={{ gap: 24 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 48, height: 48, backgroundColor: colors.amber50, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Shield size={20} color={colors.amber600} /></View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.gray900 }}>Enter OTP</Text>
                    <Text style={{ fontSize: 10, color: colors.gray500, marginTop: 4 }}>Code sent to <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray800 }}>+91 {phone}</Text></Text>
                  </View>
                  <OtpBoxes value={otp} onChange={setOtp} />
                  <View style={{ alignItems: 'center' }}>
                    {canResend ? (
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400 }}>Didn't receive code?{' '}<Text onPress={handleResend} style={{ fontSize: 10, fontWeight: '700', color: colors.amber600 }}>Resend OTP</Text></Text>
                    ) : (
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400 }}>Resend OTP in <Text style={{ fontSize: 10, fontWeight: '700', color: colors.amber600 }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</Text></Text>
                    )}
                  </View>
                  <ErrorText>{error}</ErrorText>
                  <View style={{ gap: 12 }}>
                    <Button title="Verify & Login" onPress={handleVerify} loading={loading} />
                    <TouchableOpacity onPress={() => { setStep(1); setError(''); }}><Text style={{ textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.gray400 }}>Change Number</Text></TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={{ textAlign: 'center', fontSize: 12, color: colors.gray400, marginTop: 32, fontWeight: '500' }}>
                New to HoomZo?{' '}<Text onPress={() => router.push('/signup')} style={{ fontSize: 12, fontWeight: '700', color: colors.amber600 }}>Create Account</Text>
              </Text>
              <AuthLegalLinks action="continuing" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
