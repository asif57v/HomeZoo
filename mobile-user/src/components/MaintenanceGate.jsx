import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './ui';
import { legalService } from '../services/apiService';
import { colors } from '../theme';

// Web: Layout shows a maintenance overlay when GET /info/platform/status says maintenanceMode (except auth + CMS pages)
export default function MaintenanceGate({ children }) {
  const pathname = usePathname();
  const [status, setStatus] = useState({ maintenanceMode: false, title: '', message: '' });

  useEffect(() => {
    let mounted = true;
    legalService.getPlatformStatus().then((data) => {
      if (!mounted) return;
      setStatus({
        maintenanceMode: !!data?.maintenanceMode,
        title: data?.maintenanceTitle || 'We will be back soon.',
        message: data?.maintenanceMessage || 'The platform is under scheduled maintenance. Please check back in some time.',
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const isAuthRoute = ['/login', '/signup', '/hotel/login', '/hotel/register'].some((r) => pathname.startsWith(r));
  const isCms = ['/legal', '/terms', '/privacy', '/about', '/contact', '/support'].some((r) => pathname.startsWith(r));
  if (status.maintenanceMode && !isAuthRoute && !isCms) {
    return (
      <LinearGradient colors={['#111827', '#0f172a', '#000']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Clock size={32} color="#FBBF24" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 }}>HOOM<Text style={{ color: '#FBBF24', fontSize: 28, fontWeight: '900' }}>ZO</Text></Text>
        <View style={{ height: 4, width: 32, backgroundColor: '#FBBF24', borderRadius: 2, marginTop: 4, marginBottom: 24 }} />
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 }}>{status.title}</Text>
        <Text style={{ fontSize: 14, color: colors.gray300, textAlign: 'center', lineHeight: 22 }}>{status.message}</Text>
      </LinearGradient>
    );
  }
  return children;
}
