import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Star, ThumbsUp, MessageCircle, CheckCircle2, CornerDownRight } from 'lucide-react-native';
import { Text, Input } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import { reviewService } from '../../src/services/apiService';
import useAuthStore from '../../src/store/authStore';
import toast from '../../src/store/toastStore';
import { errMsg } from '../../src/utils/format';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

const P = '#005CA8';
const Stars = ({ n, size = 10 }) => <View style={{ flexDirection: 'row', gap: 1 }}>{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} color={i < n ? colors.amber500 : colors.gray300} fill={i < n ? colors.amber500 : 'transparent'} />)}</View>;

const ReviewCard = ({ review, onReply, me }) => {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(review.helpfulVotes?.length || 0);
  const [helpful, setHelpful] = useState(review.helpfulVotes?.includes(me?._id) || false);
  const has = !!review.reply;
  const toggleHelpful = async () => {
    const next = !helpful; setHelpful(next); setCount((c) => (next ? c + 1 : c - 1));
    try { await reviewService.toggleHelpful(review._id); } catch { setHelpful(!next); setCount((c) => (!next ? c + 1 : c - 1)); toast.error('Failed to update helpful status'); }
  };
  const submit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try { await onReply(review._id, text); setText(''); setReplying(false); toast.success('Reply posted successfully'); } catch (e) { toast.error(errMsg(e, 'Failed to post reply')); } finally { setSubmitting(false); }
  };
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontWeight: '800', color: P }}>{review.userId?.name?.[0] || 'G'}</Text></View>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.gray900 }}>{review.userId?.name || 'Guest User'}</Text><Text numberOfLines={1} style={{ fontSize: 10, color: colors.gray400, fontWeight: '600' }}>STAYED AT: {review.propertyId?.propertyName || 'Property'}</Text></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Stars n={review.rating} /><Text style={{ fontSize: 10, color: colors.gray400 }}>• {new Date(review.createdAt).toLocaleDateString()}</Text></View>
      <Text style={{ fontSize: 13, color: colors.gray700, lineHeight: 20 }}>{review.comment}</Text>
      {has ? <View style={{ backgroundColor: colors.blue50, borderRadius: 12, padding: 12 }}><Text style={{ fontSize: 10, fontWeight: '700', color: P }}>Your Reply</Text><Text style={{ fontSize: 13, color: colors.gray700, marginTop: 2 }}>{review.reply}</Text>{review.replyAt ? <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 4 }}>{new Date(review.replyAt).toLocaleDateString()}</Text> : null}</View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: colors.gray50, paddingTop: 10 }}>
        <TouchableOpacity onPress={toggleHelpful} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ThumbsUp size={14} color={helpful ? P : colors.gray500} fill={helpful ? P : 'transparent'} /><Text style={{ fontSize: 12, fontWeight: '600', color: helpful ? P : colors.gray500 }}>Helpful{count > 0 ? ` (${count})` : ''}</Text></TouchableOpacity>
        {!has ? <TouchableOpacity onPress={() => setReplying(!replying)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MessageCircle size={14} color={colors.gray500} /><Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray500 }}>Reply</Text></TouchableOpacity> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} color={colors.green600} /><Text style={{ fontSize: 12, fontWeight: '600', color: colors.green600 }}>Replied</Text></View>}
      </View>
      {replying && !has ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CornerDownRight size={14} color={colors.gray400} style={{ marginTop: 14 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Input value={text} onChangeText={setText} placeholder="Write your reply to the guest..." multiline autoFocus style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setReplying(false)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={submitting} onPress={submit} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: P, opacity: submitting ? 0.6 : 1 }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{submitting ? 'Posting...' : 'Post Reply'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default function PartnerReviews() {
  const me = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, breakdown: [0, 0, 0, 0, 0] });
  useEffect(() => {
    (async () => {
      try {
        const data = await reviewService.getAllPartnerReviews();
        setReviews(data);
        if (data.length > 0) {
          const total = data.length; const avg = (data.reduce((a, r) => a + r.rating, 0) / total).toFixed(1);
          setStats({ avgRating: avg, totalReviews: total, breakdown: [5, 4, 3, 2, 1].map((s) => (data.filter((r) => Math.round(r.rating) === s).length / total) * 100) });
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);
  const reply = async (id, text) => { await reviewService.reply(id, text); setReviews((p) => p.map((r) => (r._id === id ? { ...r, reply: text, replyAt: new Date().toISOString() } : r))); };
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Reviews" subtitle="What guests are saying" />
      <ScrollView contentContainerStyle={[{ padding: 16, gap: 14, paddingBottom: 40 }, CENTER]}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', gap: 18, alignItems: 'center' }}>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 38, fontWeight: '900', color: colors.gray900 }}>{stats.avgRating || '0.0'}</Text><Stars n={Math.round(stats.avgRating)} size={12} /><Text style={{ fontSize: 11, color: colors.gray500, marginTop: 2 }}>{stats.totalReviews} Reviews</Text></View>
          <View style={{ flex: 1, gap: 4 }}>{[0, 1, 2, 3, 4].map((i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ width: 10, fontSize: 11, color: colors.gray500 }}>{5 - i}</Text><View style={{ flex: 1, height: 6, backgroundColor: colors.gray100, borderRadius: 3 }}><View style={{ width: `${stats.breakdown[i]}%`, height: 6, backgroundColor: colors.amber500, borderRadius: 3 }} /></View></View>)}</View>
        </View>
        {loading ? <ActivityIndicator color={P} style={{ paddingVertical: 40 }} /> : reviews.length === 0 ? <Text style={{ textAlign: 'center', color: colors.gray400, paddingVertical: 40 }}>No reviews yet.</Text> : reviews.map((r) => <ReviewCard key={r._id} review={r} onReply={reply} me={me} />)}
      </ScrollView>
    </View>
  );
}
