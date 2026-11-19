import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, BackHandler, Animated, Easing } from 'react-native';
import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
  Poppins_700Bold, Poppins_800ExtraBold, Poppins_900Black,
} from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';
import { hydrateStorage } from '../src/lib/storage';
import { on } from '../src/lib/events';
import useAuthStore from '../src/store/authStore';
import useFeatureFlagsStore from '../src/store/featureFlagsStore';
import { configureNotifications, registerForPush } from '../src/lib/push';
import ErrorBoundary from '../src/components/ErrorBoundary';
import Toaster from '../src/components/Toaster';
import GlobalNav from '../src/components/GlobalNav';
import RazorpayHost from '../src/components/RazorpayHost';
import MaintenanceGate from '../src/components/MaintenanceGate';
import { colors } from '../src/theme';
import BrandSplash from '../src/components/BrandSplash';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

// Pages reachable without a token (web: PublicRoute + CMS/legal pages)
const PUBLIC_PREFIXES = ['/login', '/signup', '/legal', '/news', '/terms', '/privacy', '/support'];
const isPublicPath = (p) => PUBLIC_PREFIXES.some((x) => p === x || p.startsWith(x + '/'));

function Root() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const token = useAuthStore((s) => s.token);
  const ready = useAuthStore((s) => s.ready);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    (async () => {
      await hydrateStorage();
      useAuthStore.getState().init();
      setStorageReady(true);
    })();
  }, []);

  // Feature flags (admin switches) fetched once on launch; websocket pushes live updates
  useEffect(() => {
    useFeatureFlagsStore.getState().fetchFlags();
  }, []);

  // 401 / blocked account: clear session and send to login
  useEffect(() => on('session-expired', () => {
    useAuthStore.getState().expire();
  }), []);

  // Route guard (web: UserProtectedRoute / PublicRoute)
  useEffect(() => {
    if (!ready) return;
    const first = segments[0];
    if (!token && !isPublicPath(pathname) && first !== undefined) {
      router.replace('/login');
    } else if (!token && pathname === '/') {
      router.replace('/login');
    } else if (token && (pathname === '/login' || pathname === '/signup')) {
      router.replace('/');
    }
  }, [ready, token, pathname]);

  // Push: register once logged in; handle taps (deep link via data.url)
  useEffect(() => {
    if (token) registerForPush().catch(() => {});
  }, [token]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      try {
        const url = resp?.notification?.request?.content?.data?.url;
        if (typeof url === 'string' && url.startsWith('/')) router.push(url);
      } catch {}
    });
    return () => sub.remove();
  }, []);

  // Back button: go back a screen, never log out; on the root screens fall through to the OS (exit)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) { router.back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [router]);

  if (!storageReady || !ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    // The tap-glow overlay was removed: its setState on every touch re-rendered the whole app and made scrolling janky
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MaintenanceGate>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }} />
        </View>
        <GlobalNav />
      </MaintenanceGate>
      <RazorpayHost />
      <Toaster />
    </View>
  );
}

// Animated brand splash (src/components/BrandSplash.jsx): covers the app until fonts are ready and for a
// short minimum time, then fades out over the already-rendered app.
const SPLASH_MIN_MS = 2400;
const SPLASH_FADE_MS = 380;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
    Poppins_700Bold, Poppins_800ExtraBold, Poppins_900Black,
  });
  const [minDone, setMinDone] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => { const t = setTimeout(() => setMinDone(true), SPLASH_MIN_MS); return () => clearTimeout(t); }, []);
  const hideNativeSplash = useCallback(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  const ready = fontsLoaded && minDone;
  useEffect(() => {
    if (!ready) return;
    Animated.timing(fade, { toValue: 0, duration: SPLASH_FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setSplashGone(true));
  }, [ready]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={splashGone ? 'dark' : 'light'} />
        {fontsLoaded ? (
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
        ) : null}
        {!splashGone ? <BrandSplash onShown={hideNativeSplash} opacity={fade} fontsLoaded={fontsLoaded} /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
