import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { View, TouchableOpacity, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Building2, ChevronRight, MapPin, MoreVertical, EyeOff, Trash2, Play } from 'lucide-react-native';
import { Text } from '../ui';
import { reelService } from '../../services/reelService';
import useAuthStore from '../../store/authStore';
import toast from '../../store/toastStore';
import { colors } from '../../theme';

// Sound preference shared by every reel in the feed: on by default, stays muted once the user mutes
let soundMuted = false;
const listeners = new Set();
const setSoundMuted = (v) => { soundMuted = v; listeners.forEach((l) => l(v)); };
const useSoundMuted = () => {
  const [m, setM] = useState(soundMuted);
  useEffect(() => { listeners.add(setM); return () => listeners.delete(setM); }, []);
  return m;
};

const priceOf = (p) => {
  if (!p) return null;
  if (p.pgDetails?.securityDeposit) return `₹${p.pgDetails.securityDeposit}/mo`;
  if (p.rentDetails?.monthlyRent) return `₹${p.rentDetails.monthlyRent}/mo`;
  if (p.buyDetails?.expectedPrice) return `₹${p.buyDetails.expectedPrice.toLocaleString()}`;
  if (p.plotDetails?.expectedPrice) return `₹${p.plotDetails.expectedPrice.toLocaleString()}`;
  return null;
};

const Rail = ({ Icon, count, onPress, active, activeColor, size = 28 }) => (
  <View style={{ alignItems: 'center' }}>
    <TouchableOpacity onPress={onPress} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size} color={active ? activeColor : '#fff'} fill={active ? activeColor : 'transparent'} />
    </TouchableOpacity>
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{count ?? 0}</Text>
  </View>
);

const ReelCard = memo(function ReelCard({ reel, isActive, height, onLikeToggle, onSaveToggle, onCommentClick, onShareClick, onViewed, onNotInterested, onDeleteReel }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const user = useAuthStore((s) => s.user);
  const muted = useSoundMuted();
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const viewReported = useRef(false);
  const watchStart = useRef(null);
  const watched = useRef(0);
  const lastTap = useRef(0);
  const tapTimer = useRef(null);
  const likedRef = useRef(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  likedRef.current = !!reel.likedByMe;

  const player = useVideoPlayer(isActive ? reel.videoUrl : null, (p) => { p.loop = true; p.timeUpdateEventInterval = 0.25; });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => { try { player.muted = muted; } catch {} }, [muted, player]);

  useEffect(() => {
    if (isActive) {
      watchStart.current = Date.now();
      setPaused(false);
      try { player.play(); } catch {}
    } else {
      if (watchStart.current) {
        watched.current += (Date.now() - watchStart.current) / 1000;
        watchStart.current = null;
        if (watched.current >= 1) {
          const dur = player.duration || 10;
          const pct = Math.min(100, Math.round((watched.current / dur) * 100));
          reelService.trackWatch(reel._id, { watchDuration: Math.round(watched.current), videoDuration: Math.round(dur), completionPercentage: pct, completed: pct >= 90, source: 'feed' }).catch(() => {});
        }
      }
      try { player.pause(); } catch {}
    }
  }, [isActive, reel._id]);

  useEffect(() => {
    if (!isActive) return;
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      const d = player.duration;
      if (d) setProgress(Math.min(1, currentTime / d));
      if (!viewReported.current && onViewed && currentTime >= 2) { viewReported.current = true; onViewed(reel._id); }
    });
    return () => sub.remove();
  }, [isActive, player]);

  const togglePlay = () => { try { if (player.playing) { player.pause(); setPaused(true); } else { player.play(); setPaused(false); } } catch {} };
  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current); }, []);
  const burstHeart = () => {
    heartScale.setValue(0.4); heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.sequence([Animated.delay(450), Animated.timing(heartOpacity, { toValue: 0, duration: 250, useNativeDriver: true })]),
    ]).start();
  };
  // Single tap = play/pause, double tap = like (never un-likes; use the heart button for that)
  const onTap = () => {
    setMenuOpen(false);
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      burstHeart();
      if (!likedRef.current) onLikeToggle(reel._id);
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => { tapTimer.current = null; lastTap.current = 0; togglePlay(); }, 330);
  };

  // Delete is offered only on the logged-in user's own reels
  const ownerId = typeof reel.user === 'object' ? reel.user?._id : reel.user;
  const owner = !!(user && ownerId && String(ownerId) === String(user._id || user.id));
  const creator = reel.user || {};
  const name = creator.name || 'User';
  const property = reel.property || null;
  const price = priceOf(property);

  const openProperty = () => {
    const pid = typeof reel.property === 'object' ? reel.property?._id : reel.property;
    if (!pid) return;
    reelService.recordPropertyClick(reel._id).catch(() => {});
    router.push({ pathname: '/property/[id]', params: { id: String(pid), from: 'Reels' } });
  };
  const notInterested = async () => {
    setMenuOpen(false);
    try { await reelService.setNotInterested(reel._id); toast.success('We will show fewer reels like this'); onNotInterested && onNotInterested(reel._id); }
    catch { toast.error('Failed to update recommendation preferences'); }
  };

  return (
    <View style={{ width: '100%', height, backgroundColor: '#000' }}>
      {isActive ? <VideoView player={player} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" nativeControls={false} /> : null}
      {!isActive || !isPlaying ? <Image source={{ uri: reel.thumbnailUrl }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : null}
      <Pressable onPress={onTap} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => setSoundMuted(!muted)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>{muted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}</TouchableOpacity>
        <View>
          <TouchableOpacity onPress={() => setMenuOpen((o) => !o)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}><MoreVertical size={18} color="#fff" /></TouchableOpacity>
          {menuOpen ? (
            <View style={{ position: 'absolute', top: 44, right: 0, width: 176, backgroundColor: 'rgba(17,24,39,0.95)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 4, zIndex: 10 }}>
              <TouchableOpacity onPress={notInterested} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}><EyeOff size={16} color={colors.gray400} /><Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Not Interested</Text></TouchableOpacity>
              {owner && onDeleteReel ? <TouchableOpacity onPress={() => { setMenuOpen(false); onDeleteReel && onDeleteReel(reel._id); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}><Trash2 size={16} color="#f87171" /><Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>Delete Reel</Text></TouchableOpacity> : null}
            </View>
          ) : null}
        </View>
      </View>

      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: heartOpacity, transform: [{ scale: heartScale }] }}><Heart size={96} color={colors.red500} fill={colors.red500} /></Animated.View>

      {isActive && paused ? <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}><Play size={38} color="#fff" fill="#fff" /></View></View> : null}

      <View style={{ position: 'absolute', right: 8, bottom: 96 + bottomInset, gap: 12 }}>
        <Rail Icon={Heart} count={reel.likesCount} onPress={() => onLikeToggle(reel._id)} active={reel.likedByMe} activeColor={colors.red500} />
        <Rail Icon={MessageCircle} count={reel.commentsCount} onPress={() => onCommentClick(reel)} size={27} />
        <Rail Icon={Bookmark} count={reel.savesCount} onPress={() => onSaveToggle(reel._id)} active={reel.savedByMe} activeColor={colors.amber400} size={27} />
        <Rail Icon={Share2} count={reel.sharesCount} onPress={() => onShareClick(reel)} size={26} />
      </View>

      <LinearGradient pointerEvents="box-none" colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 48, paddingHorizontal: 14, paddingBottom: bottomInset, paddingRight: 70, gap: 8 }}>
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: colors.gray800, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {creator.profileImage ? <Image source={{ uri: creator.profileImage }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{name.charAt(0)}</Text>}
          </View>
          <Text style={{ fontWeight: '700', fontSize: 14, color: '#fff' }}>{name}</Text>
          {reel.creatorType === 'vendor' ? <View style={{ backgroundColor: 'rgba(0,92,168,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>Partner</Text></View> : null}
          {reel.creatorType === 'admin' || creator.role === 'admin' || creator.role === 'superadmin' ? <View style={{ backgroundColor: colors.amber500, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>Admin</Text></View> : null}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '600', color: '#93c9ed' }}>#{reel.category?.toLowerCase() || 'general'}</Text></View>
        </View>
        {reel.caption ? <Text pointerEvents="none" numberOfLines={3} style={{ fontSize: 13, color: 'rgba(255,255,255,0.95)' }}>{reel.caption}</Text> : null}
        {reel.hashtags?.length > 0 ? <Text pointerEvents="none" numberOfLines={2} style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>{reel.hashtags.map((t) => `#${t}`).join('  ')}</Text> : null}
        {property ? (
          <TouchableOpacity activeOpacity={0.9} onPress={openProperty} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
            {property.coverImage ? <Image source={{ uri: property.coverImage }} style={{ width: 44, height: 44, borderRadius: 12 }} contentFit="cover" /> : <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,92,168,0.3)', alignItems: 'center', justifyContent: 'center' }}><Building2 size={20} color="#93c9ed" /></View>}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 13, color: '#fff' }}>{property.propertyName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><MapPin size={10} color="#93c9ed" /><Text numberOfLines={1} style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', flexShrink: 1 }}>{property.address?.city || property.address?.state || 'Verified Property'}</Text>{price ? <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>· {price}</Text> : null}</View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: '#3b93d6' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>View</Text><ChevronRight size={14} color="#fff" /></View>
          </TouchableOpacity>
        ) : null}
        <View pointerEvents="none" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.2)' }}><View style={{ height: 3, width: `${Math.round(progress * 100)}%`, backgroundColor: '#fff' }} /></View>
      </LinearGradient>
    </View>
  );
});

export default ReelCard;
