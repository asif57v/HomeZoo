import React from 'react';
import { View, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Clapperboard, Plus, Heart, User, LayoutDashboard, Briefcase, Crown, UserCircle } from 'lucide-react-native';
import { Text } from './ui';
import { colors } from '../theme';
import { useFeatureFlags } from '../store/featureFlagsStore';
import { handleNavigateToAddProperty } from '../utils/subscriptionGuard';
import { storage } from '../lib/storage';
import useAuthStore from '../store/authStore';
import { useKeyboardOpen } from '../hooks/useKeyboardOpen';

// Replicates the web Layout rules: user bottom bar vs partner bottom bar vs none
const HIDE_USER_ON = ['/booking-confirmation', '/payment', '/support', '/refer', '/legal', '/terms', '/privacy', '/reels', '/property/'];
const GLOBAL_HIDE = ['/login', '/signup', '/register', '/hotel/join'];

const UserNav = ({ pathname }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getActive = () => {
    if (pathname.includes('reels')) return 'Reels';
    if (pathname.includes('wishlist') || pathname.includes('saved')) return 'Wishlist';
    if (pathname.includes('profile') || pathname.includes('account')) return 'Profile';
    return 'Home';
  };
  const active = getActive();
  const items = [
    { name: 'Home', Icon: Home, route: '/' },
    { name: 'Reels', Icon: Clapperboard, route: '/reels' },
    { name: 'Post', Icon: Plus, center: true },
    { name: 'Wishlist', Icon: Heart, route: '/wishlist' },
    { name: 'Profile', Icon: User, route: '/profile/edit' },
  ];
  const onPress = (it) => {
    if (it.center) {
      if (!storage.getItem('token')) { router.push('/login'); return; }
      handleNavigateToAddProperty(router);
      return;
    }
    if (pathname === it.route) return;
    router.navigate(it.route);
  };
  return (
    <View style={{ backgroundColor: '#fff', paddingBottom: Math.max(insets.bottom, 10), borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderTopColor: 'rgba(241,245,249,0.9)', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 12 }}>
      <View style={{ height: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
        {items.map((it) => {
          const isActive = active === it.name && !it.center;
          const color = isActive ? colors.navActive : colors.navInactive;
          if (it.center) {
            return (
              <TouchableOpacity key={it.name} onPress={() => onPress(it)} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingBottom: 6 }}>
                <View style={{ position: 'absolute', top: -14, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.slate900, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff', elevation: 6 }}>
                  <Plus size={24} color={colors.amber400} strokeWidth={2.6} />
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: '500', color: colors.navInactive }}>Post</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={it.name} onPress={() => onPress(it)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
              {isActive ? <View style={{ position: 'absolute', left: 6, right: 6, top: 4, bottom: 4, backgroundColor: 'rgba(239,246,255,0.7)', borderRadius: 12 }} /> : null}
              <it.Icon size={20} color={color} fill={isActive ? colors.blue600 : 'transparent'} strokeWidth={isActive ? 2 : 1.9} />
              <Text style={{ fontSize: 10.5, fontWeight: isActive ? '700' : '500', color }}>{it.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const PartnerNav = ({ pathname }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { subscriptionEnabled } = useFeatureFlags();
  const getActive = () => {
    if (pathname.includes('dashboard') || pathname === '/hotel') return 'Dashboard';
    if (pathname.includes('bookings')) return 'Enquiry';
    if (pathname.includes('subscription')) return 'Subscription';
    if (pathname.includes('reels')) return 'Reels';
    if (pathname.includes('profile')) return 'Profile';
    return '';
  };
  const active = getActive();
  const items = [
    { name: 'Dashboard', short: 'Home', Icon: LayoutDashboard, route: '/hotel/dashboard' },
    { name: 'Enquiry', short: 'Enquiry', Icon: Briefcase, route: '/hotel/bookings' },
    ...(subscriptionEnabled ? [{ name: 'Subscription', short: 'Plans', Icon: Crown, route: '/hotel/subscriptions' }] : []),
    { name: 'Reels', short: 'Reels', Icon: Clapperboard, route: '/reels' },
    { name: 'Profile', short: 'Profile', Icon: UserCircle, route: '/hotel/profile' },
  ];
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingBottom: Math.max(insets.bottom, 10), borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: 'rgba(243,244,246,0.8)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, elevation: 12 }}>
      <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
        {items.map((it) => {
          const isActive = active === it.name;
          const color = isActive ? colors.primary : colors.gray400;
          return (
            <TouchableOpacity key={it.name} onPress={() => (pathname !== it.route ? router.navigate(it.route) : null)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
              {isActive ? <View style={{ position: 'absolute', left: 2, right: 2, top: 6, bottom: 6, backgroundColor: 'rgba(0,92,168,0.1)', borderRadius: 12 }} /> : null}
              <it.Icon size={20} color={color} strokeWidth={isActive ? 2.5 : 2} />
              <Text numberOfLines={1} style={{ fontSize: 9.5, fontWeight: '700', color }}>{it.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function GlobalNav() {
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const keyboardOpen = useKeyboardOpen();
  if (!token || keyboardOpen) return null;
  if (GLOBAL_HIDE.some((r) => pathname.includes(r))) return null;
  const isPartnerApp = pathname.startsWith('/hotel') && pathname !== '/hotel';
  if (isPartnerApp) return <PartnerNav pathname={pathname} />;
  if (HIDE_USER_ON.some((r) => pathname.includes(r))) return null;
  return <UserNav pathname={pathname} />;
}
