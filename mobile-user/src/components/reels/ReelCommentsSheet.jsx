import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { Send, CornerDownRight, Trash2 } from 'lucide-react-native';
import { Text, Input, Sheet } from '../ui';
import { reelService } from '../../services/reelService';
import useAuthStore from '../../store/authStore';
import toast from '../../store/toastStore';
import { colors } from '../../theme';

export default function ReelCommentsSheet({ isOpen, onClose, reel, onCommentAdded, onCommentDeleted }) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (cursor = null) => {
    if (!reel?._id) return;
    cursor ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await reelService.getComments(reel._id, { limit: 20, ...(cursor && { cursor }) });
      setComments((prev) => (cursor ? [...prev, ...res.comments] : res.comments || []));
      setNextCursor(res.nextCursor || null);
    } catch {} finally { setLoading(false); setLoadingMore(false); }
  }, [reel?._id]);

  useEffect(() => { if (isOpen && reel?._id) { setComments([]); setReplyingTo(null); load(); } }, [isOpen, reel?._id, load]);

  const submit = async () => {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      const res = await reelService.comment(reel._id, t, replyingTo?._id || null);
      setComments((prev) => [res.comment, ...prev]);
      setText(''); setReplyingTo(null); Keyboard.dismiss();
      onCommentAdded && onCommentAdded(reel._id);
    } catch { toast.error('Failed to post comment'); } finally { setSubmitting(false); }
  };
  const del = async (id) => {
    try {
      await reelService.deleteComment(id);
      setComments((prev) => prev.filter((c) => c._id !== id));
      if (onCommentDeleted) onCommentDeleted(reel._id); else if (onCommentAdded) onCommentAdded(reel._id, -1);
      toast.success('Comment deleted');
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to delete comment'); }
  };

  if (!reel) return null;
  return (
    <Sheet visible={isOpen} onClose={onClose} title="Comments" maxHeight="80%">
      <View style={{ height: 380 }}>
        {loading ? <Text style={{ padding: 24, textAlign: 'center', color: colors.gray500 }}>Loading comments...</Text> : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c._id}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center', color: colors.gray500 }}>No comments yet. Be the first to comment!</Text>}
            ListFooterComponent={nextCursor ? <TouchableOpacity onPress={() => !loadingMore && load(nextCursor)} style={{ padding: 12, alignItems: 'center' }}>{loadingMore ? <ActivityIndicator color={colors.emerald600} /> : <Text style={{ fontSize: 14, fontWeight: '500', color: colors.emerald600 }}>Load more</Text>}</TouchableOpacity> : null}
            renderItem={({ item: c }) => {
              const mine = user && (c.user?._id === user._id || c.user === user._id);
              const admin = user?.role === 'admin' || user?.role === 'superadmin';
              return (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,92,168,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {c.user?.profileImage ? <Image source={{ uri: c.user.profileImage }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: colors.emerald700, fontWeight: '700', fontSize: 12 }}>{(c.user?.name || 'U').charAt(0)}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: '600', fontSize: 12, color: colors.gray900 }}>{c.user?.name || 'User'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity onPress={() => setReplyingTo(c)}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.emerald600 }}>Reply</Text></TouchableOpacity>
                        {mine || admin ? <TouchableOpacity onPress={() => del(c._id)} style={{ padding: 4 }}><Trash2 size={13} color={colors.gray400} /></TouchableOpacity> : null}
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, color: colors.gray700, marginTop: 2 }}>{c.text}</Text>
                    {c.parentComment ? <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gray50, padding: 6, borderRadius: 8 }}><CornerDownRight size={12} color={colors.emerald600} /><Text style={{ fontSize: 11, color: colors.gray500 }}>Replying to comment</Text></View> : null}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
      {replyingTo ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#f0f7fd', borderTopWidth: 1, borderTopColor: '#dceef9', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: '#003768' }}>Replying to <Text style={{ fontSize: 12, fontWeight: '700', color: '#003768' }}>{replyingTo.user?.name || 'User'}</Text></Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.emerald600 }}>Cancel</Text></TouchableOpacity>
        </View>
      ) : null}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Input value={text} onChangeText={setText} placeholder={replyingTo ? `Reply to ${replyingTo.user?.name || 'user'}...` : 'Add a comment...'} maxLength={300} style={{ flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 }} />
        <TouchableOpacity disabled={!text.trim() || submitting} onPress={submit} style={{ padding: 10, borderRadius: 999, backgroundColor: !text.trim() || submitting ? colors.gray300 : '#005CA8' }}><Send size={18} color="#fff" /></TouchableOpacity>
      </View>
    </Sheet>
  );
}
