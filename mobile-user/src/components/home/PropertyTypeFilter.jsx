import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Grid3x3, BedDouble, Home, Landmark, MapPin } from 'lucide-react-native';
import { Text } from '../ui';
import { categoryService } from '../../services/categoryService';

const ALL_OPTION = { id: null, label: 'All', Icon: Grid3x3 };

// Tabs: All, PG/Co-Living, Rent, Buy, Plot (category ids resolved from /categories/active, same as web)
export default function PropertyTypeFilter({ selectedType: selProp, onSelectType, theme, variant = 'dark' }) {
  const light = variant === 'light';
  // glass = over the Full Photo hero: darker frosted buttons so white icons stay readable
  const glass = variant === 'glass';
  const selectedType = selProp === 'all' || selProp === undefined ? null : selProp;
  const accent = theme?.accent || '#005CA8';
  const [types, setTypes] = useState([ALL_OPTION]);

  useEffect(() => {
    (async () => {
      try {
        const categories = await categoryService.getActiveCategories();
        const ids = (names) => {
          const list = Array.isArray(names) ? names : [names];
          return categories.filter((c) => list.some((n) => (c.displayName || '').toLowerCase() === n.toLowerCase() || (c.name || '').toLowerCase() === n.toLowerCase())).map((c) => c._id);
        };
        const pg = ids(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig']);
        const rent = ids('Rent'); const buy = ids('Buy'); const plot = ids(['Plot', 'Plots']);
        setTypes([
          ALL_OPTION,
          { id: pg.length ? pg.join(',') : 'pg', label: 'PG/Co-Living', Icon: BedDouble },
          { id: rent.length ? rent.join(',') : 'rent', label: 'Rent', Icon: Home },
          { id: buy.length ? buy.join(',') : 'buy', label: 'Buy', Icon: Landmark },
          { id: plot.length ? plot.join(',') : 'plot', label: 'Plot', Icon: MapPin },
        ]);
      } catch {
        setTypes([ALL_OPTION, { label: 'PG/Co-Living', Icon: BedDouble, id: null }, { label: 'Rent', Icon: Home, id: null }, { label: 'Buy', Icon: Landmark, id: null }, { label: 'Plot', Icon: MapPin, id: null }]);
      }
    })();
  }, []);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 6, gap: 10 }}>
      {types.map((type) => {
        let selected = false;
        if (selectedType === null && type.id === null) selected = true;
        else if (selectedType && type.id) {
          if (selectedType === type.id) selected = true;
          else if (type.id.includes(',') || selectedType.includes(',')) {
            const a = type.id.split(',').map((x) => x.trim()); const b = selectedType.split(',').map((x) => x.trim());
            selected = a.some((x) => b.includes(x));
          }
        }
        const Icon = type.Icon;
        return (
          <TouchableOpacity key={type.label} onPress={() => onSelectType(type.id, type.label)} style={{ width: 62, alignItems: 'center', gap: 4 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? '#fff' : light ? '#F3F4F6' : glass ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: selected ? (light ? '#E5E7EB' : 'rgba(255,255,255,0.7)') : light ? '#E5E7EB' : glass ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)', transform: [{ scale: selected ? 1.05 : 1 }], elevation: selected ? 4 : 0 }}>
              <Icon size={16} color={selected ? accent : light ? '#4b5563' : '#fff'} strokeWidth={selected ? 2.3 : 1.8} />
            </View>
            <Text numberOfLines={1} style={{ fontSize: 10, textAlign: 'center', fontWeight: selected ? '800' : '500', color: light ? (selected ? '#111827' : '#6B7280') : (selected ? '#fff' : 'rgba(255,255,255,0.9)'), ...(glass ? { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } } : null) }}>{type.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
