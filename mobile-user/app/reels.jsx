import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Share, Alert, useWindowDimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Plus, X, ArrowLeft, Compass, Video, Bookmark, Heart, Eye, Trash2, Building2, Sparkles } from 'lucide-react-native';
import ReelCard from '../src/components/reels/ReelCard';
import ReelCommentsSheet from '../src/components/reels/ReelCommentsSheet';
import { Text, Input, Sheet } from '../src/components/ui';
import { reelService } from '../src/services/reelService';
import { api } from '../src/services/apiService';
import paymentService from '../src/services/paymentService';
import { pickVideo } from '../src/lib/imagePicker';
import toast from '../src/store/toastStore';
import { errMsg } from '../src/utils/format';
import { storage } from '../src/lib/storage';
import useAuthStore from '../src/store/authStore';
import { colors } from '../src/theme';

const MAX_SIZE_MB = 60;
const CATEGORIES = ['General', 'PG', 'Rent', 'Buy', 'Plot'];

export default function ReelsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width, height: winH } = useWindowDimensions();
  const barH = 56;
  // The bottom nav is hidden on /reels, so the feed fills everything under the header.
  // Height is measured from the real layout (works with any nav-bar / gesture / edge-to-edge setup); winH is only the first-frame fallback.
  const [measuredH, setMeasuredH] = useState(0);
  const feedH = measuredH > 0 ? measuredH : Math.max(300, winH - insets.top - barH);
  const onFeedLayout = useCallback((e) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setMeasuredH((p) => (Math.abs(p - h) > 1 ? h : p));
  }, []);

  const [tab, setTab] = useState(params.tab === 'saved' || params.tab === 'my' ? String(params.tab) : 'discover');
  const [feed, setFeed] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [myReels, setMyReels] = useState([]);
  const [myLoading, setMyLoading] = useState(false);
  const [saved, setSaved] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [modalReel, setModalReel] = useState(null);
  const [commentReel, setCommentReel] = useState(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('General');
  const [propertyId, setPropertyId] = useState('');
  const [userProps, setUserProps] = useState([]);
  const [durationSettings, setDurationSettings] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paidPaymentId, setPaidPaymentId] = useState(null);
  const [paidMeta, setPaidMeta] = useState(null);

  const feedRef = useRef([]);
  const viewReported = useRef(new Set());
  const loadingMoreRef = useRef(false);
  useEffect(() => { feedRef.current = feed; }, [feed]);

  const loadFeed = useCallback(async (cursor = null) => {
    if (cursor) { loadingMoreRef.current = true; setLoadingMore(true); } else setFeedLoading(true);
    try {
      const page = cursor ? Number(cursor) || 2 : 1;
      const exclude = (feedRef.current || []).map((r) => r._id).filter(Boolean).join(',');
      const res = await reelService.getFeed({ page, limit: 10, ...(cursor ? { cursor: String(page) } : {}), ...(exclude ? { exclude } : {}) });
      let list = res.reels || [];
      if (cursor) {
        setFeed((prev) => { const seen = new Set(prev.map((r) => r._id)); const merged = [...prev]; list.forEach((r) => { if (r?._id && !seen.has(r._id)) { seen.add(r._id); merged.push(r); } }); return merged; });
      } else {
        const target = params.reel ? String(params.reel) : null;
        if (target) {
          const idx = list.findIndex((r) => r._id === target);
          if (idx > 0) { const [t] = list.splice(idx, 1); list = [t, ...list]; }
          else if (idx === -1) { try { const one = await reelService.getReelById(target); if (one?.reel) list = [one.reel, ...list]; } catch {} }
        }
        setFeed(list); setActiveIndex(0);
      }
      setNextCursor(res.nextCursor || null); setHasMore(!!res.hasMore);
    } catch { toast.error('Failed to load reels feed'); } finally { setFeedLoading(false); loadingMoreRef.current = false; setLoadingMore(false); }
  }, [params.reel]);

  const loadMy = useCallback(async () => { setMyLoading(true); try { const r = await reelService.getMyReels({ page: 1, limit: 30 }); setMyReels(r.reels || []); } catch { toast.error('Failed to load your reels'); } finally { setMyLoading(false); } }, []);
  const loadSaved = useCallback(async () => { setSavedLoading(true); try { const r = await reelService.getSavedReels(); setSaved(r.reels || []); } catch { toast.error('Failed to load saved reels'); } finally { setSavedLoading(false); } }, []);

  useEffect(() => {
    loadFeed();
    api.get('/properties/my').then((r) => {
      const props = r.data?.properties || r.data?.hotels || [];
      if (props.length > 0) setUserProps(props); else api.get('/admin/properties').then((res) => setUserProps(res.data?.properties || [])).catch(() => {});
    }).catch(() => {});
    reelService.getDurationSettings().then((r) => setDurationSettings(r.settings || null)).catch(() => {});
  }, []);
  useEffect(() => { if (tab === 'my') loadMy(); if (tab === 'saved') loadSaved(); }, [tab]);
  useEffect(() => { if (params.tab === 'saved' && params.reel) reelService.getReelById(String(params.reel)).then((r) => r.reel && setModalReel(r.reel)).catch(() => {}); }, []);

  const handleViewed = useCallback((id) => { if (viewReported.current.has(id)) return; viewReported.current.add(id); reelService.recordView(id, 3).catch(() => {}); }, []);
  const patch = (id, fn) => { const m = (prev) => prev.map((r) => (r._id === id ? fn(r) : r)); setFeed(m); setMyReels(m); setSaved(m); setModalReel((p) => (p && p._id === id ? fn(p) : p)); };

  const onLike = useCallback(async (id) => {
    patch(id, (r) => { const l = !r.likedByMe; return { ...r, likedByMe: l, likesCount: Math.max(0, (r.likesCount || 0) + (l ? 1 : -1)) }; });
    try { const res = await reelService.like(id); patch(id, (r) => ({ ...r, likedByMe: res.liked, likesCount: res.likesCount })); } catch { toast.error('Failed to update like'); }
  }, []);
  const onSave = useCallback(async (id) => {
    patch(id, (r) => { const s = !r.savedByMe; return { ...r, savedByMe: s, savesCount: Math.max(0, (r.savesCount || 0) + (s ? 1 : -1)) }; });
    try {
      const res = await reelService.toggleSave(id);
      patch(id, (r) => ({ ...r, savedByMe: res.saved, savesCount: res.savesCount }));
      if (!res.saved) setSaved((p) => p.filter((r) => r._id !== id)); else reelService.getSavedReels().then((r) => setSaved(r.reels || [])).catch(() => {});
      toast.success(res.saved ? 'Reel saved!' : 'Reel unsaved');
    } catch { toast.error('Failed to update save'); }
  }, []);
  const onDelete = useCallback((id) => {
    Alert.alert('Delete reel', 'Are you sure you want to delete this reel?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await reelService.deleteReel(id); const f = (p) => p.filter((r) => r._id !== id); setFeed(f); setMyReels(f); setSaved(f); setModalReel((p) => (p && p._id === id ? null : p)); toast.success('Reel deleted successfully'); }
      catch (e) { toast.error(e?.response?.data?.message || 'Failed to delete reel'); }
    } }]);
  }, []);
  const onNotInterested = useCallback((id) => setFeed((p) => p.filter((r) => r._id !== id)), []);
  const onCommentCount = useCallback((id, d = 1) => patch(id, (r) => ({ ...r, commentsCount: Math.max(0, (r.commentsCount || 0) + d) })), []);
  // A user's share is counted once per reel: repeat shares still open the share sheet but never bump the count again
  const onShare = useCallback(async (reel) => {
    const uid = String(useAuthStore.getState().user?._id || 'anon');
    const key = `reel_shared_${uid}`;
    let shared = [];
    try { shared = JSON.parse(storage.getItem(key) || '[]'); } catch { shared = []; }
    try {
      const res = await Share.share({ title: 'Reel', message: `${reel.caption || 'Check this reel on Hoomzo'}\nhttps://hoomzo.com/reels?reel=${reel._id}` });
      if (res?.action === Share.dismissedAction) return;
      if (shared.includes(reel._id)) return;
      shared.push(reel._id);
      storage.setItem(key, JSON.stringify(shared.slice(-500)));
      const r = await reelService.share(reel._id);
      patch(reel._id, (x) => ({ ...x, sharesCount: r?.sharesCount ?? (x.sharesCount || 0) + 1 }));
    } catch {}
  }, []);

  // ---- upload
  const resetUpload = () => { setCaption(''); setHashtags(''); setFile(null); setCategory('General'); setPropertyId(''); setQuote(null); setPaidPaymentId(null); setPaidMeta(null); setProgress(0); };
  const refreshQuote = async (f) => {
    setQuoteLoading(true); setPaidPaymentId(null); setPaidMeta(null);
    try {
      const dur = f.duration ? Math.ceil(f.duration / 1000) : null;
      if (!dur) throw new Error('no duration');
      const res = await reelService.quoteDuration(dur);
      setQuote(res.quote || null); if (res.settings) setDurationSettings(res.settings);
      return res.quote;
    } catch {
      const free = durationSettings?.freeDuration ?? 20; const max = durationSettings?.maxDuration ?? 90;
      const q = { ok: true, isProvisional: true, duration: null, freeDuration: free, maxDuration: max, charge: 0, requiresPayment: false, message: `Duration will be verified on upload (Free up to ${free}s)` };
      setQuote(q); return q;
    } finally { setQuoteLoading(false); }
  };
  const chooseVideo = async () => {
    const f = await pickVideo();
    if (!f) return;
    if (f.size && f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`Video must be under ${MAX_SIZE_MB}MB`); return; }
    setFile(f); setUploadOpen(true); await refreshQuote(f);
  };
  const payIfNeeded = async (q) => {
    if (!q?.requiresPayment || !(q.charge > 0)) return { durationPaymentId: null };
    if (paidPaymentId) return { durationPaymentId: paidPaymentId, ...(paidMeta || {}) };
    const orderRes = await reelService.createDurationPaymentOrder(q.duration);
    const { order, paymentId, razorpayKeyId } = orderRes;
    const isDemo = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo' || String(order?.id || '').startsWith('order_sim_');
    let verify = { paymentId, razorpay_order_id: order.id };
    if (!isDemo) {
      const r = await paymentService.openCheckout({ key: razorpayKeyId, amount: order.amount, currency: order.currency || 'INR', name: 'Hoomzo', description: `Reel duration charge (${q.duration}s)`, order_id: order.id, theme: { color: '#005CA8' } });
      verify = { paymentId, razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature };
    } else verify.razorpay_payment_id = `pay_sim_reel_${Date.now()}`;
    const verified = await reelService.verifyDurationPayment(verify);
    if (!verified.success) throw new Error(verified.message || 'Payment failed. Your Reel has not been published.');
    setPaidPaymentId(verified.paymentId || paymentId);
    setPaidMeta({ razorpay_order_id: verify.razorpay_order_id, razorpay_payment_id: verify.razorpay_payment_id });
    return { durationPaymentId: verified.paymentId || paymentId, razorpay_order_id: verify.razorpay_order_id, razorpay_payment_id: verify.razorpay_payment_id };
  };
  const submitUpload = async () => {
    if (!file) { toast.error('Please select a video'); return; }
    if (uploading) return;
    setUploading(true);
    try {
      let q = quote || (await refreshQuote(file));
      if (!q) { toast.error('Could not calculate duration charge'); return; }
      if (!q.ok) { toast.error(q.message || 'This video cannot be uploaded'); return; }
      let meta = {};
      if (!q.isProvisional && q.requiresPayment && q.charge > 0) meta = await payIfNeeded(q);
      setProgress(1);
      const res = await reelService.uploadReel(file, caption.trim(), category, { propertyId: propertyId || undefined, hashtags: hashtags ? hashtags.split(',').map((h) => h.trim()) : [], ...meta }, (e) => { if (e.total) setProgress(Math.min(99, Math.round((e.loaded * 100) / e.total))); });
      const nr = { ...res.reel, likedByMe: false, savedByMe: false };
      setFeed((p) => [nr, ...p]); setMyReels((p) => [nr, ...p]);
      setUploadOpen(false); resetUpload(); toast.success('Reel uploaded successfully!'); setTab('my');
    } catch (err) {
      if (err?.response?.status === 402 && err.response?.data?.quote) { setQuote(err.response.data.quote); toast.error(err.response.data.message || 'Payment required to unlock this reel duration'); return; }
      const msg = err?.response?.data?.message || errMsg(err, 'Upload failed');
      if (String(msg).toLowerCase().includes('cancel')) toast.error('Payment cancelled. Your Reel has not been published.');
      else if (msg === 'Network Error') toast.error('Network Error: Upload failed or timed out. Please check your connection or choose a smaller video.');
      else toast.error(msg);
    } finally { setUploading(false); setProgress(0); }
  };

  const viewable = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewable = useRef(({ viewableItems }) => { if (viewableItems.length > 0 && viewableItems[0].index != null) setActiveIndex(viewableItems[0].index); });

  const Grid = ({ list, unsave }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {list.map((reel) => (
        <TouchableOpacity key={reel._id} activeOpacity={0.9} onPress={() => setModalReel(reel)} style={{ width: (width - 32 - 16) / 3, aspectRatio: 9 / 16, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.gray900, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          {reel.thumbnailUrl ? <Image source={{ uri: reel.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: '700', color: '#60aee3' }}>#{reel.category?.toLowerCase() || 'general'}</Text></View>
          <TouchableOpacity onPress={() => (unsave ? onSave(reel._id) : onDelete(reel._id))} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>{unsave ? <Bookmark size={13} color={colors.amber400} fill={colors.amber400} /> : <Trash2 size={13} color="#f87171" />}</TouchableOpacity>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <Text numberOfLines={1} style={{ fontWeight: '700', color: '#fff', fontSize: 10 }}>{reel.caption || (unsave ? 'Saved Reel' : 'Property Tour')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              {!unsave ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Eye size={10} color="#60aee3" /><Text style={{ fontSize: 9, color: '#d1d5db' }}>{reel.viewsCount || 0}</Text></View> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Heart size={10} color="#f87171" /><Text style={{ fontSize: 9, color: '#d1d5db' }}>{reel.likesCount || 0}</Text></View>
              {!unsave ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Bookmark size={10} color={colors.amber400} /><Text style={{ fontSize: 9, color: '#d1d5db' }}>{reel.savesCount || 0}</Text></View> : reel.property ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Building2 size={10} color="#60aee3" /><Text style={{ fontSize: 9, color: '#60aee3' }}>Prop</Text></View> : null}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const TabEmpty = ({ Icon, title, sub, cta, onCta, tint }) => (
    <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 16, backgroundColor: 'rgba(17,24,39,0.6)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
      <Icon size={48} color={tint} style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 12, color: colors.gray400, marginTop: 4, textAlign: 'center' }}>{sub}</Text>
      <TouchableOpacity onPress={onCta} style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#005CA8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{cta}</Text></TouchableOpacity>
    </View>
  );

  const costLabel = quote?.requiresPayment && quote.charge > 0 ? (paidPaymentId ? 'Upload Reel' : `Pay ₹${quote.charge} & Upload`) : 'Upload Reel';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Black screen: light status-bar icons (root layout sets 'dark' for the rest of the app) */}
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={{ height: barH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 10 }}><ArrowLeft size={22} color="#fff" /></TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {[['discover', 'Discover'], ['my', 'My Reels'], ['saved', 'Saved']].map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ paddingVertical: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: tab === k ? '700' : '500', color: tab === k ? '#fff' : 'rgba(255,255,255,0.6)' }}>{l}</Text>
                {tab === k ? <View style={{ height: 2, borderRadius: 1, backgroundColor: '#fff', marginTop: 2 }} /> : <View style={{ height: 2, marginTop: 2 }} />}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={chooseVideo} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999 }}><Plus size={20} color="#fff" /></TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }} onLayout={onFeedLayout}>
      {tab === 'discover' ? (
        feedLoading && feed.length === 0 ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#3b93d6" /></View>
        : feed.length === 0 ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}><Compass size={48} color="#3b93d6" style={{ marginBottom: 12 }} /><Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>No reels in feed yet</Text><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' }}>Be the first to share a property tour reel.</Text><TouchableOpacity onPress={chooseVideo} style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#005CA8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 }}><Plus size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Create Reel</Text></TouchableOpacity></View>
        : (
          <FlatList
            data={feed}
            keyExtractor={(r) => r._id}
            pagingEnabled
            snapToInterval={feedH}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: feedH, offset: feedH * i, index: i })}
            onViewableItemsChanged={onViewable.current}
            viewabilityConfig={viewable.current}
            windowSize={3}
            maxToRenderPerBatch={2}
            initialNumToRender={1}
            disableIntervalMomentum
            removeClippedSubviews
            onEndReachedThreshold={0.5}
            onEndReached={() => { if (hasMore && nextCursor && !loadingMoreRef.current) loadFeed(nextCursor); }}
            ListFooterComponent={loadingMore ? <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View> : null}
            renderItem={({ item, index }) => (
              <ReelCard reel={item} height={feedH} isActive={!modalReel && !commentReel ? activeIndex === index : activeIndex === index && !modalReel}
                onLikeToggle={onLike} onSaveToggle={onSave} onCommentClick={setCommentReel} onShareClick={onShare} onViewed={handleViewed} onNotInterested={onNotInterested} onDeleteReel={onDelete} />
            )}
          />
        )
      ) : null}

      {tab === 'my' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Video size={20} color="#3b93d6" /><Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>My Uploaded Reels</Text></View><Text style={{ fontSize: 12, color: colors.gray400 }}>Manage and view engagement on your reels</Text></View>
            <View style={{ backgroundColor: '#00172e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(59,147,214,0.3)' }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#60aee3' }}>{myReels.length} {myReels.length === 1 ? 'Reel' : 'Reels'}</Text></View>
          </View>
          {myLoading ? <ActivityIndicator color="#3b93d6" style={{ paddingVertical: 60 }} size="large" /> : myReels.length === 0 ? <TabEmpty Icon={Video} tint={colors.gray500} title="You haven't uploaded any Reels yet." sub="Share short 10-second property tours to attract buyers and renters." cta="＋ Create Reel" onCta={chooseVideo} /> : <Grid list={myReels} />}
        </ScrollView>
      ) : null}

      {tab === 'saved' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Bookmark size={20} color={colors.amber400} /><Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Saved Reels</Text></View><Text style={{ fontSize: 12, color: colors.gray400 }}>Reels and property tours you bookmarked</Text></View>
            <View style={{ backgroundColor: '#451a03', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.amber400 }}>{saved.length} Saved</Text></View>
          </View>
          {savedLoading ? <ActivityIndicator color="#3b93d6" style={{ paddingVertical: 60 }} size="large" /> : saved.length === 0 ? <TabEmpty Icon={Bookmark} tint="rgba(251,191,36,0.5)" title="No saved Reels yet." sub="Explore Reels and save properties you like to watch them anytime." cta="Explore Reels" onCta={() => setTab('discover')} /> : <Grid list={saved} unsave />}
        </ScrollView>
      ) : null}
      </View>

      <Modal visible={!!modalReel} animationType="slide" onRequestClose={() => setModalReel(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
              <TouchableOpacity onPress={() => setModalReel(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ArrowLeft size={18} color="#fff" /><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Back</Text></TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{tab === 'my' ? 'My Reel' : tab === 'saved' ? 'Saved Reel' : 'Reel Detail'}</Text>
              <TouchableOpacity onPress={() => setModalReel(null)}><X size={18} color="#fff" /></TouchableOpacity>
            </View>
          </SafeAreaView>
          {modalReel ? <ReelCard reel={modalReel} height={winH - insets.top - 48} isActive onLikeToggle={onLike} onSaveToggle={onSave} onCommentClick={setCommentReel} onShareClick={onShare} onViewed={handleViewed} onNotInterested={onNotInterested} onDeleteReel={onDelete} /> : null}
          <ReelCommentsSheet isOpen={!!commentReel && !!modalReel} onClose={() => setCommentReel(null)} reel={commentReel} onCommentAdded={onCommentCount} onCommentDeleted={(id) => onCommentCount(id, -1)} />
        </View>
      </Modal>

      {!modalReel ? <ReelCommentsSheet isOpen={!!commentReel} onClose={() => setCommentReel(null)} reel={commentReel} onCommentAdded={onCommentCount} onCommentDeleted={(id) => onCommentCount(id, -1)} /> : null}

      <Sheet visible={uploadOpen} onClose={() => { if (!uploading) { setUploadOpen(false); resetUpload(); } }} title="Create & Upload Reel" maxHeight="92%">
        <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
          {file ? <Text numberOfLines={1} style={{ fontSize: 14, color: colors.gray600 }}>Video: <Text style={{ fontSize: 14, fontWeight: '500', color: colors.gray600 }}>{file.name}</Text></Text> : null}
          <TouchableOpacity onPress={chooseVideo} style={{ alignSelf: 'flex-start' }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald600 }}>Change video</Text></TouchableOpacity>
          <Text style={{ fontSize: 12, color: colors.gray500 }}>Max {durationSettings?.maxDuration ? `${durationSettings.maxDuration}s` : '—'}. Free up to {durationSettings?.freeDuration != null ? `${durationSettings.freeDuration}s` : '—'}. Max {MAX_SIZE_MB}MB.</Text>
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.gray50, padding: 14 }}>
            {quoteLoading ? <Text style={{ fontSize: 14, color: colors.gray500 }}>Calculating duration charge...</Text>
            : quote ? (<>
              {quote.duration ? <Text style={{ fontSize: 14, color: colors.gray700 }}>Duration: <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray900 }}>{quote.duration}s</Text></Text> : null}
              <Text style={{ fontSize: 13, color: quote.ok === false ? colors.red600 : colors.gray600, marginTop: 2 }}>{quote.message || (quote.requiresPayment ? `Charge: ₹${quote.charge}` : 'Free upload')}</Text>
            </>) : <Text style={{ fontSize: 14, color: colors.gray500 }}>Select a video to see the charge.</Text>}
          </View>
          <View><Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 6 }}>Caption</Text><Input value={caption} onChangeText={setCaption} multiline maxLength={500} placeholder="Describe your reel..." style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' }} /></View>
          <View><Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 6 }}>Hashtags (comma separated)</Text><Input value={hashtags} onChangeText={setHashtags} placeholder="pg, indore, luxury" autoCapitalize="none" style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12 }} /></View>
          <View><Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray700, marginBottom: 8 }}>Select Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{CATEGORIES.map((c) => <TouchableOpacity key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: category === c ? '#005CA8' : colors.gray200, backgroundColor: category === c ? '#005CA8' : '#fff' }}><Text style={{ fontSize: 12, fontWeight: '600', color: category === c ? '#fff' : colors.gray600 }}>{c}</Text></TouchableOpacity>)}</View>
          </View>
          {userProps.length > 0 ? (
            <View><Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray700, marginBottom: 8 }}>Link a property (optional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity onPress={() => setPropertyId('')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: !propertyId ? colors.gray900 : colors.gray200, backgroundColor: !propertyId ? colors.gray900 : '#fff' }}><Text style={{ fontSize: 12, color: !propertyId ? '#fff' : colors.gray600 }}>None</Text></TouchableOpacity>
                {userProps.slice(0, 20).map((p) => <TouchableOpacity key={p._id} onPress={() => setPropertyId(p._id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: propertyId === p._id ? colors.gray900 : colors.gray200, backgroundColor: propertyId === p._id ? colors.gray900 : '#fff', maxWidth: 220 }}><Text numberOfLines={1} style={{ fontSize: 12, color: propertyId === p._id ? '#fff' : colors.gray600 }}>{p.propertyName || p.name}</Text></TouchableOpacity>)}
              </View>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8 }}>
          <TouchableOpacity disabled={uploading} onPress={() => { setUploadOpen(false); resetUpload(); }} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: colors.gray700 }}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity disabled={uploading || quoteLoading || !file} onPress={submitUpload} style={{ flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#005CA8', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: uploading || quoteLoading || !file ? 0.6 : 1 }}>
            {uploading ? <ActivityIndicator color="#fff" /> : <Sparkles size={16} color="#fff" />}<Text style={{ fontWeight: '700', color: '#fff' }}>{uploading ? (progress > 0 ? `Uploading ${progress}%…` : 'Uploading…') : costLabel}</Text>
          </TouchableOpacity>
        </View>
      </Sheet>
    </View>
  );
}
