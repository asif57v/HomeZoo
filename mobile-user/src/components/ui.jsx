import React from 'react';
import {
  Text as RNText, TextInput as RNTextInput, View, TouchableOpacity, ActivityIndicator, StyleSheet,
  Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform, FlatList, RefreshControl, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, X, Inbox, AlertCircle, RefreshCw } from 'lucide-react-native';
import { colors, fontFor, radius, shadow } from '../theme';

// Text that maps fontWeight -> bundled Poppins family
export const Text = ({ style, children, ...rest }) => {
  const flat = StyleSheet.flatten(style) || {};
  const { fontWeight, ...other } = flat;
  const family = flat.fontFamily || fontFor(fontWeight);
  return (
    <RNText {...rest} style={[{ color: colors.textDark, fontSize: 14 }, other, { fontFamily: family }]}>
      {children}
    </RNText>
  );
};

export const Input = React.forwardRef(({ style, ...props }, ref) => (
  <RNTextInput
    ref={ref}
    placeholderTextColor={colors.gray300}
    {...props}
    style={[{ fontFamily: fontFor('500'), color: colors.gray800, fontSize: 14, padding: 0 }, style]}
  />
));

export const Button = ({ title, onPress, loading, disabled, variant = 'dark', style, textStyle, icon, small }) => {
  const bg = variant === 'dark' ? colors.gray900 : variant === 'primary' ? colors.primary : variant === 'outline' ? '#fff' : variant === 'danger' ? colors.red600 : variant === 'amber' ? colors.amber600 : colors.gray900;
  const fg = variant === 'outline' ? colors.gray700 : '#fff';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        { backgroundColor: bg, borderRadius: radius.xl, paddingVertical: small ? 10 : 15, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: disabled || loading ? 0.5 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.gray200 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (<>
        {icon}
        <Text style={[{ color: fg, fontWeight: '700', fontSize: small ? 12 : 15 }, textStyle]}>{title}</Text>
      </>)}
    </TouchableOpacity>
  );
};

export const Card = ({ style, children, ...rest }) => (
  <View {...rest} style={[{ backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray100, ...shadow.sm }, style]}>{children}</View>
);

export const Loader = ({ label = 'Loading...', style }) => (
  <View style={[{ flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12 }, style]}>
    <ActivityIndicator size="large" color={colors.teal500} />
    {label ? <Text style={{ color: colors.gray500, fontSize: 13, fontWeight: '500' }}>{label}</Text> : null}
  </View>
);

export const EmptyState = ({ title = 'Nothing here yet', subtitle, icon, action }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }}>
      {icon || <Inbox size={28} color={colors.gray400} />}
    </View>
    <Text style={{ fontWeight: '700', fontSize: 16, color: colors.gray800, textAlign: 'center' }}>{title}</Text>
    {subtitle ? <Text style={{ fontSize: 13, color: colors.gray500, textAlign: 'center' }}>{subtitle}</Text> : null}
    {action}
  </View>
);

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
    <AlertCircle size={36} color={colors.red500} />
    <Text style={{ fontWeight: '600', color: colors.gray700, textAlign: 'center' }}>{message}</Text>
    {onRetry ? <Button title="Retry" onPress={onRetry} small variant="dark" icon={<RefreshCw size={14} color="#fff" />} /> : null}
  </View>
);

export const Screen = ({ children, style, edges = ['top'], bg = colors.background }) => (
  <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>{children}</SafeAreaView>
);

export const Header = ({ title, subtitle, onBack, right, style }) => {
  const router = useRouter();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100, gap: 8 }, style]}>
      <TouchableOpacity onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={{ padding: 8 }}>
        <ArrowLeft size={22} color={colors.gray800} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 17, color: colors.gray900 }}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={{ fontSize: 11, color: colors.gray500 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
};

export const Sheet = ({ visible, onClose, title, children, full, maxHeight = '85%' }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: full ? '100%' : maxHeight, paddingBottom: insets.bottom + 8 }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200 }} /></View>
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 17, color: colors.gray900 }}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={20} color={colors.gray500} /></TouchableOpacity>
            </View>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const Chip = ({ label, active, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: active ? colors.gray900 : colors.gray200, backgroundColor: active ? colors.gray900 : '#fff' }, style]}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : colors.gray600 }}>{label}</Text>
  </TouchableOpacity>
);

export const Field = ({ label, required, children, hint, style }) => (
  <View style={[{ marginBottom: 14 }, style]}>
    {label ? <Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 6 }}>{label}{required ? <Text style={{ color: colors.red500 }}> *</Text> : null}</Text> : null}
    {children}
    {hint ? <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 4 }}>{hint}</Text> : null}
  </View>
);

export const TextField = ({ label, required, hint, style, inputStyle, left, multiline, ...props }) => (
  <Field label={label} required={required} hint={hint} style={style}>
    <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: multiline ? 10 : 12, gap: 10 }}>
      {left}
      <Input multiline={multiline} {...props} style={[{ flex: 1, minHeight: multiline ? 80 : undefined, textAlignVertical: multiline ? 'top' : 'center' }, inputStyle]} />
    </View>
  </Field>
);

export const Divider = () => <View style={{ height: 1, backgroundColor: colors.gray100 }} />;

export const Row = ({ children, style, gap = 8, ...rest }) => <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;

export { ScrollView, FlatList, RefreshControl, Keyboard, View, TouchableOpacity, Modal, Pressable, ActivityIndicator, KeyboardAvoidingView, StyleSheet };
