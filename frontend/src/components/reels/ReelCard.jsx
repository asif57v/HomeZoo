import React, { useRef, useEffect, useCallback, memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Building2,
  ExternalLink,
  MapPin,
  MoreVertical,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reelService } from '../../services/reelService';
import toast from 'react-hot-toast';

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
  const viewReported = useRef(false);
  const watchStartTimeRef = useRef(null);
  const watchDurationRef = useRef(0);

  const [muted, setMuted] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundToast, setSoundToast] = useState(null);
  const soundToastTimerRef = useRef(null);
  const clickTimeoutRef = useRef(null);

  const currentUser = React.useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
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
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  const toggleMute = useCallback((e) => {
    if (e) e.stopPropagation();
    setMuted((prev) => {
      const nextMuted = !prev;
      if (videoRef.current) {
        videoRef.current.muted = nextMuted;
        if (!nextMuted) {
          videoRef.current.volume = 1.0;
          videoRef.current.play().catch(() => {});
        }
      }
      if (soundToastTimerRef.current) clearTimeout(soundToastTimerRef.current);
      setSoundToast(nextMuted ? 'muted' : 'unmuted');
      soundToastTimerRef.current = setTimeout(() => {
        setSoundToast(null);
      }, 1000);
      return nextMuted;
    });
  }, []);

  // Track video play/pause & watch duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      watchStartTimeRef.current = Date.now();
      video.play().catch(() => {});
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
    if (!isActive || viewReported.current || !onViewed) return;
    const video = videoRef.current;
    if (video && video.currentTime >= 2) {
      viewReported.current = true;
      onViewed(reel._id);
    }
  }, [isActive, reel._id, onViewed]);

  const handleDoubleTap = useCallback(() => {
    if (!reel.likedByMe) onLikeToggle(reel._id);
  }, [reel._id, reel.likedByMe, onLikeToggle]);

  const handleVideoTap = useCallback(
    (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.no-tap')) return;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        // Double tap -> Like
        if (!reel.likedByMe) onLikeToggle(reel._id);
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          clickTimeoutRef.current = null;
          toggleMute();
        }, 250);
      }
    },
    [reel._id, reel.likedByMe, onLikeToggle, toggleMute]
  );

  const handlePropertyClick = useCallback(async (e) => {
    if (e) e.stopPropagation();
    const propId = typeof reel.property === 'object' ? reel.property?._id : reel.property;
    if (!propId) return;
    try {
      reelService.recordPropertyClick(reel._id).catch(() => {});
      navigate(`/hotel/${propId}`);
    } catch (e) {
      navigate(`/hotel/${propId}`);
    }
  }, [navigate, reel._id, reel.property]);

  const handleNotInterestedClick = useCallback(async () => {
    setMenuOpen(false);
    try {
      await reelService.setNotInterested(reel._id);
      toast.success('We will show fewer reels like this');
      if (onNotInterested) onNotInterested(reel._id);
    } catch (e) {
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
        muted
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Top right floating controls: 3-dots Menu (positioned safely below top header) */}
      <div className="absolute top-16 right-3.5 z-30 flex items-center gap-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-lg hover:bg-black/80 active:scale-90 transition-transform flex items-center justify-center"
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

      {/* Sound indicator toast (center of video on toggle/tap) */}
      <AnimatePresence>
        {soundToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-2xl">
              {soundToast === 'unmuted' ? (
                <Volume2 size={36} className="text-emerald-400 animate-pulse" />
              ) : (
                <VolumeX size={36} className="text-red-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider">
                {soundToast === 'unmuted' ? 'Sound On' : 'Muted'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right side interaction buttons */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
        {/* Like */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onLikeToggle(reel._id)}
            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 transition-transform active:scale-90 hover:bg-black/70"
          >
            <Heart
              size={24}
              className={reel.likedByMe ? 'fill-red-500 text-red-500' : ''}
            />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {reel.likesCount ?? 0}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onCommentClick(reel)}
            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 transition-transform active:scale-90 hover:bg-black/70"
          >
            <MessageCircle size={24} />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {reel.commentsCount ?? 0}
          </span>
        </div>

        {/* Save / Bookmark */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSaveToggle(reel._id)}
            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 transition-transform active:scale-90 hover:bg-black/70"
          >
            <Bookmark
              size={24}
              className={reel.savedByMe ? 'fill-amber-400 text-amber-400' : ''}
            />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {reel.savesCount ?? 0}
          </span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onShareClick(reel)}
            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 transition-transform active:scale-90 hover:bg-black/70"
          >
            <Share2 size={24} />
          </button>
          <span className="text-[11px] font-bold text-white drop-shadow">
            {reel.sharesCount ?? 0}
          </span>
        </div>

        {/* Sound / Volume Toggle */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 transition-transform active:scale-90 hover:bg-black/70"
            title={muted ? 'Tap to Unmute' : 'Tap to Mute'}
          >
            {muted ? (
              <VolumeX size={24} className="text-red-400" />
            ) : (
              <Volume2 size={24} className="text-emerald-400" />
            )}
          </button>
          <span className="text-[10px] font-bold text-white drop-shadow">
            {muted ? 'Muted' : 'Sound'}
          </span>
        </div>

        {/* Uploader Avatar */}
        <div className="mt-1">
          <div className="w-9 h-9 rounded-full border-2 border-white/80 overflow-hidden bg-gray-800 flex items-center justify-center shadow-lg">
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-xs">
                {displayName.charAt(0)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Information & Property Overlay Banner */}
      <div
        className="absolute left-0 right-0 bottom-0 pl-4 pr-20 pb-20 pt-16 z-10 text-left space-y-2 pointer-events-auto no-tap"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
        }}
      >
        {/* Linked Property Banner Card */}
        {property && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handlePropertyClick}
            className="mb-2 p-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/25 transition-all group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {property.coverImage ? (
                <img
                  src={property.coverImage}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-emerald-600/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
                  <Building2 size={20} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                    {property.propertyName}
                  </h4>
                  {propertyPrice && (
                    <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {propertyPrice}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-300 truncate flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-emerald-400" />
                  {property.address?.city || property.address?.state || 'Verified Property'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePropertyClick}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0 group-hover:bg-emerald-500 shadow-md transition-all"
            >
              View Property
              <ExternalLink size={12} />
            </button>
          </motion.div>
        )}

        {/* Creator Name & Category Tag */}
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-white drop-shadow">
            {displayName}
          </p>
          {reel.creatorType === 'vendor' && (
            <span className="bg-emerald-600/80 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
              Partner
            </span>
          )}
          {(reel.creatorType === 'admin' || user.role === 'admin' || user.role === 'superadmin') && (
            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase shadow">
              Admin
            </span>
          )}
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            #{reel.category?.toLowerCase() || 'general'}
          </span>
        </div>

        {/* Caption */}
        {reel.caption ? (
          <p className="text-xs text-white/95 line-clamp-2 leading-relaxed drop-shadow">
            {reel.caption}
          </p>
        ) : null}

        {/* Hashtags */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reel.hashtags.map((tag, idx) => (
              <span key={idx} className="text-[10px] font-medium text-white/80">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Double-tap heart overlay */}
      <DoubleTapHeart reelId={reel._id} onLikeToggle={onLikeToggle} likedByMe={reel.likedByMe} />
    </div>
  );
});

function DoubleTapHeart({ reelId, onLikeToggle, likedByMe }) {
  const [show, setShow] = useState(false);
  const handleDoubleTap = useCallback(
    (e) => {
      if (e.target.closest('button')) return;
      if (!likedByMe) {
        onLikeToggle(reelId);
        setShow(true);
        setTimeout(() => setShow(false), 800);
      }
    },
    [reelId, likedByMe, onLikeToggle]
  );
  return (
    <>
      <div
        className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center"
        aria-hidden
      >
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1.3 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-red-500 drop-shadow-xl"
            >
              <Heart size={90} fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default ReelCard;
