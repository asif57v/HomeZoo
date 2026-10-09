import React, { useRef, useEffect, useCallback, memo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Building2,
  ChevronRight,
  MapPin,
  MoreVertical,
  EyeOff,
  Trash2,
  Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reelService } from '../../services/reelService';
import toast from 'react-hot-toast';

// Sound preference shared by every reel in the feed (like Instagram): sound is ON by default,
// and once the user mutes a reel the next ones stay muted until they turn sound back on.
let soundMuted = false;
const soundListeners = new Set();
const subscribeSound = (cb) => {
  soundListeners.add(cb);
  return () => soundListeners.delete(cb);
};
const getSoundMuted = () => soundMuted;
const setSoundMuted = (value) => {
  soundMuted = value;
  soundListeners.forEach((l) => l());
};

const railButton =
  'w-11 h-11 flex items-center justify-center text-white active:scale-90 transition-transform drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]';

const ReelCard = memo(function ReelCard({
  reel,
  isActive,
  onLikeToggle,
  onSaveToggle,
  onCommentClick,
  onShareClick,
  onViewed,
  onNotInterested,
  onDeleteReel,
}) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const viewReported = useRef(false);
  const watchStartTimeRef = useRef(null);
  const watchDurationRef = useRef(0);
  const clickTimeoutRef = useRef(null);
  const heartTimeoutRef = useRef(null);

  const muted = useSyncExternalStore(subscribeSound, getSoundMuted);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  const currentUser = React.useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const reelUserId = typeof reel.user === 'object' ? reel.user?._id : reel.user;
  const isOwner =
    currentUser &&
    (reelUserId === currentUser._id ||
      currentUser.role === 'admin' ||
      currentUser.role === 'superadmin');

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  useEffect(
    () => () => {
      clearTimeout(clickTimeoutRef.current);
      clearTimeout(heartTimeoutRef.current);
    },
    []
  );

  const toggleMute = useCallback((e) => {
    if (e) e.stopPropagation();
    const next = !getSoundMuted();
    if (videoRef.current) videoRef.current.muted = next;
    setSoundMuted(next);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  // Track video play/pause & watch duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      watchStartTimeRef.current = Date.now();
      video.muted = getSoundMuted();
      video.play().catch((err) => {
        // Browser blocked autoplay *with sound*: fall back to muted playback.
        // The user can turn sound on with the speaker button.
        if (err?.name === 'NotAllowedError' && !video.muted) {
          setSoundMuted(true);
          video.muted = true;
          video.play().catch(() => {});
        }
      });
    } else {
      if (watchStartTimeRef.current) {
        const elapsed = (Date.now() - watchStartTimeRef.current) / 1000;
        watchDurationRef.current += elapsed;
        watchStartTimeRef.current = null;

        // Flush watch tracking event
        if (watchDurationRef.current >= 1) {
          const videoDuration = video.duration || 10;
          const completionPercentage = Math.min(
            100,
            Math.round((watchDurationRef.current / videoDuration) * 100)
          );
          reelService
            .trackWatch(reel._id, {
              watchDuration: Math.round(watchDurationRef.current),
              videoDuration: Math.round(videoDuration),
              completionPercentage,
              completed: completionPercentage >= 90,
              source: 'feed',
            })
            .catch(() => {});
        }
      }
      video.pause();
    }
  }, [isActive, reel._id]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    if (progressRef.current && video.duration) {
      progressRef.current.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
    }

    if (viewReported.current || !onViewed) return;
    if (video.currentTime >= 2) {
      viewReported.current = true;
      onViewed(reel._id);
    }
  }, [isActive, reel._id, onViewed]);

  const burstHeart = useCallback(() => {
    setShowHeart(true);
    clearTimeout(heartTimeoutRef.current);
    heartTimeoutRef.current = setTimeout(() => setShowHeart(false), 800);
  }, []);

  // Single tap = pause / play, double tap = like (Instagram / TikTok behaviour)
  const handleVideoTap = useCallback(
    (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.no-tap')) return;
      setMenuOpen(false);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        if (!reel.likedByMe) onLikeToggle(reel._id);
        burstHeart();
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          clickTimeoutRef.current = null;
          togglePlay();
        }, 250);
      }
    },
    [reel._id, reel.likedByMe, onLikeToggle, togglePlay, burstHeart]
  );

  const handlePropertyClick = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      const propId = typeof reel.property === 'object' ? reel.property?._id : reel.property;
      if (!propId) return;
      reelService.recordPropertyClick(reel._id).catch(() => {});
      navigate(`/hotel/${propId}`);
    },
    [navigate, reel._id, reel.property]
  );

  const handleNotInterestedClick = useCallback(async () => {
    setMenuOpen(false);
    try {
      await reelService.setNotInterested(reel._id);
      toast.success('We will show fewer reels like this');
      if (onNotInterested) onNotInterested(reel._id);
    } catch {
      toast.error('Failed to update recommendation preferences');
    }
  }, [reel._id, onNotInterested]);

  const user = reel.user || {};
  const displayName = user.name || 'User';
  const property = reel.property || null;

  // Extract property price display if property is linked
  const getPropertyPrice = (p) => {
    if (!p) return null;
    if (p.pgDetails?.securityDeposit) return `₹${p.pgDetails.securityDeposit}/mo`;
    if (p.rentDetails?.monthlyRent) return `₹${p.rentDetails.monthlyRent}/mo`;
    if (p.buyDetails?.expectedPrice) return `₹${p.buyDetails.expectedPrice.toLocaleString()}`;
    if (p.plotDetails?.expectedPrice) return `₹${p.plotDetails.expectedPrice.toLocaleString()}`;
    return null;
  };
  const propertyPrice = getPropertyPrice(property);

  return (
    <div
      className="relative w-full h-full min-h-dvh snap-start snap-always flex items-end justify-center bg-black overflow-hidden select-none"
      onClick={handleVideoTap}
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        loop
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />

      {/* Top right: sound + menu */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMute}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-40 py-1">
              <button
                type="button"
                onClick={handleNotInterestedClick}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-white hover:bg-white/10 flex items-center gap-2"
              >
                <EyeOff size={16} className="text-gray-400" />
                Not Interested
              </button>
              {(isOwner || onDeleteReel) && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onDeleteReel) onDeleteReel(reel._id);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/20 flex items-center gap-2 border-t border-white/10"
                >
                  <Trash2 size={16} className="text-red-400" />
                  Delete Reel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paused indicator */}
      <AnimatePresence>
        {isActive && paused && (
          <motion.div
            key="paused"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center"
          >
            <span className="w-20 h-20 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
              <Play size={38} className="text-white fill-white ml-1" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            key="heart"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            className="absolute inset-0 z-[6] pointer-events-none flex items-center justify-center text-white drop-shadow-xl"
          >
            <Heart size={96} fill="currentColor" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action rail: icons only, counts underneath */}
      <div className="absolute right-1.5 bottom-6 flex flex-col items-center gap-3 z-20">
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => onLikeToggle(reel._id)} className={railButton} aria-label="Like">
            <Heart size={28} className={reel.likedByMe ? 'fill-red-500 text-red-500' : ''} />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow -mt-1">{reel.likesCount ?? 0}</span>
        </div>

        <div className="flex flex-col items-center">
          <button type="button" onClick={() => onCommentClick(reel)} className={railButton} aria-label="Comments">
            <MessageCircle size={27} />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow -mt-1">{reel.commentsCount ?? 0}</span>
        </div>

        <div className="flex flex-col items-center">
          <button type="button" onClick={() => onSaveToggle(reel._id)} className={railButton} aria-label="Save">
            <Bookmark size={27} className={reel.savedByMe ? 'fill-amber-400 text-amber-400' : ''} />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow -mt-1">{reel.savesCount ?? 0}</span>
        </div>

        <div className="flex flex-col items-center">
          <button type="button" onClick={() => onShareClick(reel)} className={railButton} aria-label="Share">
            <Share2 size={26} />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow -mt-1">{reel.sharesCount ?? 0}</span>
        </div>
      </div>

      {/* Bottom info. Wrapper ignores taps so the whole screen toggles play/pause. */}
      <div
        className="absolute left-0 right-0 bottom-0 pl-4 pr-16 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-28 z-10 text-left space-y-2.5 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)',
        }}
      >
        {/* Creator */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full border-2 border-white/80 overflow-hidden bg-gray-800 flex items-center justify-center shrink-0">
            {user.profileImage ? (
              <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xs">{displayName.charAt(0)}</span>
            )}
          </div>
          <p className="font-bold text-sm text-white drop-shadow truncate">{displayName}</p>
          {reel.creatorType === 'vendor' && (
            <span className="shrink-0 bg-emerald-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
              Partner
            </span>
          )}
          {(reel.creatorType === 'admin' || user.role === 'admin' || user.role === 'superadmin') && (
            <span className="shrink-0 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
              Admin
            </span>
          )}
          <span className="shrink-0 text-[10px] font-semibold text-emerald-300 bg-white/10 px-2 py-0.5 rounded-full">
            #{reel.category?.toLowerCase() || 'general'}
          </span>
        </div>

        {/* Caption */}
        {reel.caption ? (
          <p className="text-[13px] text-white/95 line-clamp-2 leading-snug drop-shadow">{reel.caption}</p>
        ) : null}

        {/* Hashtags */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {reel.hashtags.map((tag, idx) => (
              <span key={idx} className="text-[11px] font-medium text-white/80">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Linked property: compact CTA */}
        {property && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handlePropertyClick}
            className="pointer-events-auto flex items-center gap-2.5 p-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 cursor-pointer active:scale-[0.98] transition-transform"
          >
            {property.coverImage ? (
              <img src={property.coverImage} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-emerald-600/30 flex items-center justify-center shrink-0 text-emerald-300">
                <Building2 size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[13px] text-white truncate">{property.propertyName}</h4>
              <p className="text-[11px] text-white/75 truncate flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-emerald-300 shrink-0" />
                <span className="truncate">
                  {property.address?.city || property.address?.state || 'Verified Property'}
                </span>
                {propertyPrice && (
                  <span className="shrink-0 font-bold text-white">· {propertyPrice}</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePropertyClick}
              className="shrink-0 flex items-center gap-0.5 pl-3 pr-2 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-transform"
            >
              View
              <ChevronRight size={14} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/20 z-20 pointer-events-none">
        <div
          ref={progressRef}
          className="h-full bg-white origin-left transition-transform duration-300 ease-linear"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  );
});

export default ReelCard;
