import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Menu, Wallet, Bell, Home, X, User, Building, List, Crown, History, Shield, FileText, HelpCircle, LogOut, LayoutDashboard, ChevronRight, Settings, Edit3, Info, Phone, Calendar, ArrowLeft } from 'lucide-react-native';
import { Text } from '../ui';
import { hotelService } from '../../services/apiService';
import walletService from '../../services/walletService';
import useAuthStore from '../../store/authStore';
import { useFeatureFlags } from '../../store/featureFlagsStore';
import { inr } from '../../utils/format';
import { colors } from '../../theme';

const P = '#005CA8';

const MenuItem = ({ icon: Icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 10, borderRadius: 12 }}>
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,92,168,0.05)', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={P} /></View>
    <Text style={{ flex: 1, fontWeight: '600', color: colors.gray800, fontSize: 14 }}>{label}</Text>
    <ChevronRight size={14} color={colors.gray300} />
  </TouchableOpacity>
);

export const PartnerDrawer = ({ isOpen, onClose }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user) || {};
  const { subscriptionEnabled } = useFeatureFlags();
  const go = (p) => { onClose(); setTimeout(() => router.push(p), 50); };
  const groups = [
    { title: 'Overview', items: [[LayoutDashboard, 'Dashboard', '/hotel/partner-dashboard']] },
    { title: 'Growth & Finance', items: [[Wallet, 'Wallet', '/hotel/wallet'], [Crown, 'Subscription Plans', '/hotel/subscriptions'], [History, 'Enquiry History', '/hotel/bookings']] },
    { title: 'Management', items: [[Building, 'My Properties', '/hotel/properties'], [Calendar, 'Manage Inventory', '/hotel/inventory-properties'], [List, 'Reviews & Ratings', '/hotel/reviews'], [Bell, 'Notifications', '/hotel/notifications']] },
    { title: 'Support & Legal', items: [[HelpCircle, 'Help & Support', '/hotel/support'], [FileText, 'Terms & Conditions', '/hotel/terms'], [Shield, 'Privacy Policy', '/hotel/privacy'], [Info, 'About HoomZo Partner', '/hotel/about'], [Phone, 'Contact HoomZo Team', '/hotel/contact'], [Settings, 'Settings', '/hotel/settings']] },
  ].map((g) => ({ ...g, items: g.items.filter((i) => subscriptionEnabled || i[2] !== '/hotel/subscriptions') }));
  const logout = async () => { onClose(); await useAuthStore.getState().logout(); router.replace('/login'); };
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ width: '85%', backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
              <View><Text style={{ fontSize: 20, fontWeight: '900', color: colors.slate900, letterSpacing: -0.5 }}>HOOM<Text style={{ fontSize: 20, fontWeight: '900', color: P }}>ZO</Text></Text><View style={{ height: 4, width: 24, backgroundColor: P, borderRadius: 2, marginTop: 2 }} /></View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8, borderRadius: 999, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100 }}><X size={20} color={colors.gray500} /></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <LinearGradient colors={[P, '#004b8a']} style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {user.profileImage ? <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%' }} /> : <User size={22} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 16, color: '#fff' }}>{user.name || 'Partner'}</Text><Text numberOfLines={1} style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{user.email || 'Manage Account'}</Text></View>
                <TouchableOpacity onPress={() => go('/hotel/profile')} style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }}><Edit3 size={14} color="#fff" /></TouchableOpacity>
              </LinearGradient>
            </View>
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => go('/')} style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(0,92,168,0.1)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(0,92,168,0.2)' }}><Building size={14} color={P} /><Text style={{ fontWeight: '700', fontSize: 12, color: P }}>Switch to Guest View (Home)</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              {groups.map((g) => (
                <View key={g.title} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{g.title}</Text>
                  {g.items.map(([I, l, p]) => <MenuItem key={p} icon={I} label={l} onPress={() => go(p)} />)}
                </View>
              ))}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 8 }}>
                <TouchableOpacity onPress={logout} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8 }}><LogOut size={14} color={colors.red500} /><Text style={{ color: colors.red500, fontWeight: '500', fontSize: 12 }}>Log Out</Text></TouchableOpacity>
                <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 12, paddingHorizontal: 8 }}>Partner App • v1.0.0</Text>
              </View>
            </View>
          </ScrollView>
        </View>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      </View>
    </Modal>
  );
};

// Top bar for partner dashboard screens (menu, logo, guest view, notifications, wallet)
export const PartnerHeader = ({ title, subtitle }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [balance, setBalance] = useState(0);
  useEffect(() => {
    walletService.getWallet().then((w) => { if (w.success && w.wallet) setBalance(w.wallet.balance); }).catch(() => {});
    hotelService.getNotifications(1, 1).then((n) => { if (n.success && n.meta) setUnread(n.meta.unreadCount); }).catch(() => {});
  }, []);
  return (
    <>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 10 }}>
          <TouchableOpacity onPress={() => setOpen(true)} style={{ padding: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100 }}><Menu size={18} color={colors.gray700} /></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/')} style={{ marginLeft: 8 }}>
            {title ? (<View><Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: colors.slate900 }}>{title}</Text>{subtitle ? <Text numberOfLines={1} style={{ fontSize: 10, color: colors.gray500 }}>{subtitle}</Text> : null}</View>) : (
              <View><Text style={{ fontSize: 18, fontWeight: '900', color: colors.slate900, letterSpacing: -0.5 }}>HOOM<Text style={{ fontSize: 18, fontWeight: '900', color: P }}>ZO</Text></Text><View style={{ width: 20, height: 3, backgroundColor: P, borderRadius: 2, marginTop: -1 }} /></View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.slate100 }}><Home size={13} color={colors.slate700} /></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/hotel/notifications')} style={{ padding: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100 }}>
              <Bell size={18} color={colors.gray700} />
              {unread > 0 ? <View style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red500, borderWidth: 2, borderColor: '#fff' }} /> : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/hotel/wallet')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100 }}>
              <View style={{ width: 20, height: 20, backgroundColor: P, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><Wallet size={10} color="#fff" /></View>
              <View><Text style={{ fontSize: 7.5, fontWeight: '700', color: colors.gray400 }}>WALLET</Text><Text style={{ fontSize: 10, fontWeight: '700', color: colors.slate900 }}>{inr(balance)}</Text></View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      <PartnerDrawer isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

// Simple back header for partner sub pages
export const PartnerBack = ({ title, subtitle, right }) => {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 12, gap: 8 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/hotel/dashboard'))} style={{ padding: 8 }}><ArrowLeft size={20} color={colors.gray700} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '700', color: colors.gray900 }}>{title}</Text>{subtitle ? <Text numberOfLines={1} style={{ fontSize: 11, color: colors.gray500 }}>{subtitle}</Text> : null}</View>
        {right}
      </View>
    </SafeAreaView>
  );
};
