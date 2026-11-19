import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './ui';
import { useToastStore } from '../store/toastStore';
import { colors } from '../theme';

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, alignItems: 'center', gap: 8, zIndex: 9999, elevation: 9999 }}>
      {toasts.map((t) => (
        <View key={t.id} style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.gray200, borderLeftWidth: 4, borderLeftColor: t.type === 'error' ? colors.red500 : t.type === 'success' ? colors.green500 : colors.teal600, maxWidth: 360 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.gray900 }}>{t.message}</Text>
        </View>
      ))}
    </View>
  );
}
