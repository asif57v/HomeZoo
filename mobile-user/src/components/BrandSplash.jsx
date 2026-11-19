import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

// Launch screen: clean brand-blue gradient, the Hoomzo logo in a single rounded tile that springs in,
// the category line, and a running loader bar.
// The native splash is a flat #0032C7, so the hand-off from the OS splash to this one is seamless.

const BRAND = '#0032C7';
const TILE = 176;

const LoaderBar = () => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ width: 132, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
      <Animated.View style={{ width: 52, height: 4, borderRadius: 2, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-52, 132] }) }] }}>
        <LinearGradient colors={['#7CFFB2', '#38E1FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
};

export default function BrandSplash({ onShown, opacity, fontsLoaded }) {
  const { height } = useWindowDimensions();
  const intro = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(intro, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();
    Animated.timing(text, { toValue: 1, duration: 600, delay: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const version = Constants.expoConfig?.version;
  // Poppins only once loaded (system font for the first few ms otherwise)
  const fontOk = (w) => (fontsLoaded ? { fontFamily: w } : { fontWeight: w.includes('600') ? '600' : w.includes('500') ? '500' : '400' });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND, opacity: opacity || 1 }]} onLayout={onShown}>
      <LinearGradient colors={['#0A47E0', BRAND, '#021F8F']} locations={[0, 0.5, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: height * 0.04 }}>
        <View style={{ width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{
            opacity: intro,
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
            width: TILE, height: TILE, borderRadius: TILE * 0.28,
            shadowColor: '#000A3D', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 18,
          }}>
            <View style={{ flex: 1, borderRadius: TILE * 0.28, overflow: 'hidden', backgroundColor: BRAND }}>
              <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" fadeDuration={0} />
            </View>
          </Animated.View>
        </View>

        <Animated.View style={{ alignItems: 'center', marginTop: 34, opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <Text style={[{ color: '#fff', fontSize: 15, letterSpacing: 0.4 }, fontOk('Poppins_600SemiBold')]}>India's home for every stay</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            {['PG', 'Rent', 'Buy', 'Plots'].map((t, i) => (
              <React.Fragment key={t}>
                {i > 0 ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#7CFFB2', marginHorizontal: 10 }} /> : null}
                <Text style={[{ color: 'rgba(255,255,255,0.78)', fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase' }, fontOk('Poppins_500Medium')]}>{t}</Text>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>

      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(48, height * 0.07), alignItems: 'center', opacity: text }}>
        <LoaderBar />
        {version ? <Text style={[{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 1, marginTop: 14 }, fontOk('Poppins_400Regular')]}>VERSION {version}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}
