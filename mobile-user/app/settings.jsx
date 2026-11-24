import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, FileText, Shield, Info, Phone, LayoutDashboard, User } from 'lucide-react-native';
import { Text } from '../src/components/ui';
import { BlueHeader } from '../src/components/Common';
import useAuthStore from '../src/store/authStore';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

// Admin stays on the web: only the user / host switch is shown in the app
export default function Settings() {
  const router = useRouter();
  const sections = [
    { title: 'Switch Mode & Dashboards', items: [
      { icon: LayoutDashboard, label: 'Host / Partner Dashboard', subtitle: 'Manage listings, view guest enquiries & bookings', path: '/hotel/partner-dashboard', badge: 'Switch', highlight: true },
      { icon: User, label: 'Edit Profile Details', subtitle: 'Personal information, photo & address', path: '/profile/edit' },
    ] },
    { title: 'About & Legal', items: [
      { icon: Info, label: 'About HoomZo', path: '/about' },
      { icon: Phone, label: 'Contact Us', path: '/contact' },
      { icon: Shield, label: 'Privacy Policy', path: '/login/privacy' },
      { icon: FileText, label: 'Terms & Conditions', path: '/login/terms' },
    ] },
  ];
  const logout = async () => { await useAuthStore.getState().logout(); router.replace('/login'); };
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="Settings"><Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>App Preferences</Text></BlueHeader>
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 20 }, CENTER]}>
        {sections.map((s) => (
          <View key={s.title}>
            <Text style={{ fontWeight: '700', color: colors.gray400, fontSize: 12, marginBottom: 12 }}>{s.title}</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' }}>
              {s.items.map((it, i) => (
                <TouchableOpacity key={it.label} onPress={() => router.push(it.path)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: i < s.items.length - 1 ? 1 : 0, borderBottomColor: colors.gray50, backgroundColor: it.highlight ? 'rgba(255,251,235,0.5)' : '#fff' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: it.highlight ? colors.amber100 : 'rgba(0,92,168,0.05)', alignItems: 'center', justifyContent: 'center' }}><it.icon size={19} color={it.highlight ? colors.amber600 : colors.surface} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray800 }}>{it.label}</Text>
                      {it.subtitle ? <Text style={{ fontSize: 11, color: colors.gray400, fontWeight: '500', marginTop: 2 }}>{it.subtitle}</Text> : null}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {it.badge ? <View style={{ backgroundColor: colors.amber500, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '900', color: colors.slate950 || '#020617' }}>{it.badge}</Text></View> : null}
                    <ChevronRight size={16} color={colors.gray300} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <TouchableOpacity onPress={logout} style={{ backgroundColor: colors.red50, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><LogOut size={18} color={colors.red500} /><Text style={{ color: colors.red500, fontWeight: '700' }}>Log Out</Text></TouchableOpacity>
        <Text style={{ textAlign: 'center', fontSize: 12, color: colors.gray400 }}>HoomZo App • Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}
