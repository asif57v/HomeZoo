import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function HotelLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }} />;
}
