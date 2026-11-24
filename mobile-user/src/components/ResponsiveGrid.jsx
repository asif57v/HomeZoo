import React, { useState } from 'react';
import { View } from 'react-native';
import { useResponsive } from '../lib/responsive';

// Lays children out in 1 column on phones and `tablet` / `large` columns on tablets.
// Measures its own width, so it works inside any padded / centered container.
export default function ResponsiveGrid({ children, phone = 1, tablet = 2, large = 3, gap = 16, style }) {
  const { cols } = useResponsive();
  const [w, setW] = useState(0);
  const n = cols(phone, tablet, large);
  const items = React.Children.toArray(children).filter(Boolean);
  if (n <= 1) return <View style={[{ gap }, style]}>{items}</View>;
  const itemW = w > 0 ? Math.floor((w - gap * (n - 1)) / n) : `${Math.floor(100 / n) - 2}%`;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}>
      {items.map((child, i) => <View key={child.key ?? i} style={{ width: itemW }}>{child}</View>)}
    </View>
  );
}
