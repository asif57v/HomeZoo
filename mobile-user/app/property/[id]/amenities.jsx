import React from 'react';
import { View, ScrollView } from 'react-native';
import { Wifi, Coffee, Car, Shield, Utensils, Users, Dumbbell, Snowflake, Tv, Briefcase } from 'lucide-react-native';
import { Text } from '../../../src/components/ui';
import { BlueHeader } from '../../../src/components/Common';
import { colors } from '../../../src/theme';
import { CENTER } from '../../../src/lib/responsive';

const LIST = [
  { category: 'Popular', items: [[Wifi, 'Free Wifi'], [Car, 'Parking Facility'], [Snowflake, 'AC'], [Tv, 'TV']] },
  { category: 'Safety & Hygiene', items: [[Shield, 'Daily Housekeeping'], [Shield, 'Fire Extinguisher'], [Shield, 'Sanitized Rooms']] },
  { category: 'Food & Drinks', items: [[Utensils, 'Restaurant'], [Coffee, 'Breakfast Available'], [Coffee, 'Coffee/Tea Maker']] },
  { category: 'Services', items: [[Users, '24x7 Reception'], [Briefcase, 'Conference Room'], [Dumbbell, 'Gym']] },
];

export default function Amenities() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="All Amenities" />
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 20 }, CENTER]}>
        {LIST.map((s) => (
          <View key={s.category} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray100 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.surface, marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.gray50 }}>{s.category}</Text>
            <View style={{ gap: 16 }}>
              {s.items.map(([Icon, name]) => (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,92,168,0.05)', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={colors.surface} /></View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.gray600 }}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
