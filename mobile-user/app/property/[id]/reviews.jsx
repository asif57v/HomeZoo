import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Star, User } from 'lucide-react-native';
import { Text, Loader, EmptyState } from '../../../src/components/ui';
import { BlueHeader } from '../../../src/components/Common';
import { reviewService } from '../../../src/services/apiService';
import { colors } from '../../../src/theme';
import { CENTER } from '../../../src/lib/responsive';

// The web page shows a static sample list; the app shows this property's real reviews from GET /reviews/:propertyId
export default function ReviewsPage() {
  const { id } = useLocalSearchParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { reviewService.getPropertyReviews(id).then((d) => setReviews(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false)); }, [id]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;
  const label = avg >= 4.5 ? 'Excellent' : avg >= 4 ? 'Very Good' : avg >= 3 ? 'Good' : 'Average';
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="Ratings & Reviews" />
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 16 }, CENTER]}>
        {loading ? <Loader /> : reviews.length === 0 ? <EmptyState title="No reviews yet" subtitle="Be the first to review this property." /> : (<>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', alignItems: 'center', gap: 24 }}>
            <View style={{ width: 80, height: 80, backgroundColor: 'rgba(0,92,168,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,92,168,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '900', color: colors.surface }}>{avg.toFixed(1)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Star size={10} color={colors.surface} fill={colors.surface} /><Text style={{ fontSize: 10, fontWeight: '700', color: colors.surface }}>{label}</Text></View>
            </View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.gray800 }}>{reviews.length} review{reviews.length > 1 ? 's' : ''}</Text><Text style={{ fontSize: 12, color: colors.gray500 }}>Based on verified guest feedback</Text></View>
          </View>
          <Text style={{ fontWeight: '700', color: colors.surface, fontSize: 16 }}>User Reviews</Text>
          {reviews.map((r) => (
            <View key={r._id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }}><User size={20} color={colors.gray500} /></View>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', fontSize: 14, color: colors.surface }}>{r.userId?.name || r.user?.name || 'Guest'}</Text><Text style={{ fontSize: 10, color: colors.gray400 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.green50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.green700 }}>{r.rating}</Text><Star size={10} color={colors.green700} fill={colors.green700} /></View>
              </View>
              <Text style={{ fontSize: 12, color: colors.gray600, lineHeight: 19 }}>{r.comment}</Text>
              {r.reply ? <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.gray50, borderRadius: 8 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray500 }}>Owner reply</Text><Text style={{ fontSize: 12, color: colors.gray600 }}>{r.reply}</Text></View> : null}
            </View>
          ))}
        </>)}
      </ScrollView>
    </View>
  );
}
