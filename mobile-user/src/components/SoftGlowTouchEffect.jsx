import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

/**
 * Port of the web's components/ui/SoftGlowTouchEffect.jsx:
 * a gentle translucent cyan bloom at every tap position that expands and fades out (450ms).
 * Purely visual (pointerEvents="none"); the host View feeds it raw touch coordinates.
 */
const SIZE = 64;
const DURATION = 450;

const Glow = memo(({ x, y, onDone }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: DURATION, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start(() => onDone());
  }, []);
  // Same keyframes as the web: 0% scale .4/op 0, 25% .9/.65, 50% 1.02/.45, 100% 1.15/0
  const scale = t.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [0.4, 0.9, 1.02, 1.15] });
  const opacity = t.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [0, 0.65, 0.45, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - SIZE / 2, top: y - SIZE / 2, width: SIZE, height: SIZE, opacity, transform: [{ scale }] }}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <RadialGradient id="g" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="rgb(56,189,248)" stopOpacity="0.5" />
            <Stop offset="0.4" stopColor="rgb(14,165,233)" stopOpacity="0.28" />
            <Stop offset="0.7" stopColor="rgb(6,182,212)" stopOpacity="0.08" />
            <Stop offset="1" stopColor="rgb(6,182,212)" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#g)" />
      </Svg>
    </Animated.View>
  );
});

export const useSoftGlow = () => {
  const [glows, setGlows] = useState([]);
  const idRef = useRef(0);
  const last = useRef({ time: 0, x: 0, y: 0 });

  // Attach to the root View's onTouchStart (raw touch events reach ancestors without stealing the responder)
  const onTouchStart = useCallback((e) => {
    const { pageX: x, pageY: y } = e.nativeEvent || {};
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const now = Date.now();
    if (now - last.current.time < 80 && Math.abs(x - last.current.x) < 20 && Math.abs(y - last.current.y) < 20) return;
    last.current = { time: now, x, y };
    const id = ++idRef.current;
    setGlows((prev) => [...prev.slice(-5), { id, x, y }]);
  }, []);

  const remove = useCallback((id) => setGlows((prev) => prev.filter((g) => g.id !== id)), []);

  const overlay = (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 999999, elevation: 999 }]}>
      {glows.map((g) => <Glow key={g.id} x={g.x} y={g.y} onDone={() => remove(g.id)} />)}
    </View>
  );
  return { onTouchStart, overlay };
};
