import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, User, Wallet, Heart, Gift, HelpCircle, FileText, Shield, ChevronRight, LogOut, Settings, BookOpen, Building, Bell, Edit3, Video, LayoutDashboard } from 'lucide-react-native';
import { Text } from './ui';
import { userService } from '../services/apiService';
import useAuthStore from '../store/authStore';
import { colors } from '../theme';

const Item = ({ icon: Icon, label, onPress, badge }) => (
  <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 10, borderRadius: 12 }}>
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,92,168,0.05)', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={colors.surface} /></View>
    <Text style={{ flex: 1, fontWeight: '600', color: colors.gray800, fontSize: 14 }}>{label}</Text>
    {badge ? <View style={{ backgroundColor: colors.red500, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge}</Text></View> : null}
    <ChevronRight size={14} color={colors.gray300} />
  </TouchableOpacity>
);

const Section = ({ title, children }) => (
  <View style={{ marginTop: 16 }}>
    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</Text>
    {children}
  </View>
);

export default function MobileMenu({ isOpen, onClose }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isOpen && user) {
      userService.getNotifications(1, 1).then((d) => { if (d.success && d.meta) setUnread(d.meta.unreadCount); }).catch(() => {});
    }
  }, [isOpen, user]);

  const go = (path) => { onClose(); setTimeout(() => router.push(path), 50); };
  const logout = async () => { onClose(); await useAuthStore.getState().logout(); router.replace('/login'); };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ width: '85%', backgroundColor: '#fff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827', letterSpacing: -0.5 }}>HOOM<Text style={{ fontSize: 20, fontWeight: '900', color: colors.emerald600 }}>ZO</Text></Text>
              <View style={{ height: 2, width: 24, backgroundColor: '#3b93d6', borderRadius: 1, marginTop: 2 }} />
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6, borderRadius: 999, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100 }}><X size={18} color={colors.gray500} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {user ? (
              <LinearGradient colors={['#005CA8', '#004b8a']} style={{ borderRadius: 16, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#fff" /></View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 14, color: '#fff' }}>{user.name}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{user.phone}</Text>
                  </View>
                  <TouchableOpacity onPress={() => go('/profile/edit')} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }}><Edit3 size={14} color="#fff" /></TouchableOpacity>
                </View>
              </LinearGradient>
            ) : (
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><User size={18} color="#fff" /></View>
                  <View><Text style={{ fontWeight: '700', fontSize: 14, color: '#fff' }}>Guest User</Text><Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Sign in for full experience</Text></View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity onPress={() => go('/login')} style={{ flex: 1, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center' }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.surface }}>Login</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => go('/signup')} style={{ flex: 1, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, alignItems: 'center' }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Signup</Text></TouchableOpacity>
                </View>
              </View>
            )}
            <Section title="Travel & Stays">
              <Item icon={BookOpen} label="My Bookings" onPress={() => go('/bookings')} />
              <Item icon={Video} label="Reels" onPress={() => go('/reels')} />
              <Item icon={Heart} label="Wishlist" onPress={() => go('/wishlist')} />
              <Item icon={Wallet} label="View Wallet" onPress={() => go('/wallet')} />
            </Section>
            <Section title="Grow with HOOMZO">
              <Item icon={Building} label="List Your Property" onPress={() => go('/hotel/join')} />
              <Item icon={LayoutDashboard} label="Host Dashboard" onPress={() => go('/hotel/partner-dashboard')} />
              <Item icon={Gift} label="Refer & Earn" onPress={() => go('/refer')} />
            </Section>
            <Section title="App Settings">
              <Item icon={Bell} label="Notifications" badge={unread > 0 ? unread : null} onPress={() => go('/notifications')} />
              <Item icon={Settings} label="Settings" onPress={() => go('/settings')} />
              <Item icon={HelpCircle} label="Need Help?" onPress={() => go('/login/support')} />
            </Section>
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 8 }}>
              <TouchableOpacity onPress={() => go('/login/privacy')} style={{ padding: 8 }}><Text style={{ fontSize: 12, fontWeight: '500', color: colors.gray400 }}>Privacy Policy</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => go('/login/terms')} style={{ padding: 8 }}><Text style={{ fontSize: 12, fontWeight: '500', color: colors.gray400 }}>Terms & Conditions</Text></TouchableOpacity>
              {user ? <TouchableOpacity onPress={logout} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6 }}><LogOut size={14} color={colors.red500} /><Text style={{ color: colors.red500, fontWeight: '700', fontSize: 12 }}>Log Out</Text></TouchableOpacity> : null}
            </View>
          </ScrollView>
        </View>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      </View>
    </Modal>
  );
}
