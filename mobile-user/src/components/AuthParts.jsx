import React, { useRef, useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './ui';
import { colors, fontFor } from '../theme';

export const Brand = ({ style }) => (
  <View style={[{ alignItems: 'center' }, style]}>
    <View style={{ alignItems: 'flex-start' }}>
      <Text style={{ fontSize: 36, fontWeight: '900', color: '#111827', letterSpacing: -1.5 }}>
        HOOM<Text style={{ fontSize: 36, fontWeight: '900', color: colors.amber600, letterSpacing: -1.5 }}>ZO</Text>
      </Text>
      <View style={{ height: 4, width: 32, backgroundColor: colors.amber600, borderRadius: 2, marginTop: -4 }} />
    </View>
  </View>
);

export const AuthLegalLinks = ({ action = 'continuing' }) => {
  const router = useRouter();
  const link = { fontWeight: '700', color: colors.gray500, textDecorationLine: 'underline', fontSize: 11 };
  return (
    <View style={{ alignItems: 'center', marginTop: 24 }}>
      <Text style={{ fontSize: 11, color: colors.gray400, textAlign: 'center', lineHeight: 18 }}>
        By {action}, you agree to our{' '}
        <Text onPress={() => router.push('/login/terms')} style={link}>Terms &amp; Conditions</Text> and{' '}
        <Text onPress={() => router.push('/login/privacy')} style={link}>Privacy Policy</Text>
      </Text>
      <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 8 }}>
        Need help?{' '}
        <Text onPress={() => router.push('/login/support')} style={{ ...link, color: colors.amber600 }}>Support</Text>
      </Text>
    </View>
  );
};

// 6-box OTP input with auto-advance / backspace
export const OtpBoxes = ({ value, onChange }) => {
  const refs = useRef([]);
  const set = (i, v) => {
    if (v.length > 1) { // paste
      const digits = v.replace(/\D/g, '').slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      digits.forEach((d, k) => { next[k] = d; });
      onChange(next);
      refs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    if (!/^\d*$/.test(v)) return;
    const next = [...value];
    next[i] = v;
    onChange(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {value.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => (refs.current[i] = r)}
          value={d}
          onChangeText={(v) => set(i, v)}
          onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus(); }}
          keyboardType="number-pad"
          maxLength={i === 0 ? 6 : 1}
          style={{ width: 42, height: 50, textAlign: 'center', fontSize: 18, fontFamily: fontFor('700'), backgroundColor: '#fff', borderWidth: 2, borderColor: d ? colors.amber500 : colors.gray400, borderRadius: 12, color: colors.gray900 }}
        />
      ))}
    </View>
  );
};

// 120s resend countdown (web: resendTimer)
export const useResendTimer = (active, seconds = 120) => {
  const [t, setT] = useState(seconds);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return [t, () => setT(seconds)];
};

export const ErrorText = ({ children }) => (children ? (
  <View style={{ backgroundColor: colors.red50, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 }}>
    <Text style={{ color: colors.red500, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{children}</Text>
  </View>
) : null);

export const LinkText = ({ children, onPress, style }) => (
  <TouchableOpacity onPress={onPress}><Text style={[{ color: colors.amber600, fontWeight: '700', fontSize: 11 }, style]}>{children}</Text></TouchableOpacity>
);
