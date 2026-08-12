import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Loader2, ArrowLeft, Building2, Tag } from 'lucide-react';
import ReelCard from '../../components/reels/ReelCard';
import ReelCommentsSheet from '../../components/reels/ReelCommentsSheet';
import { reelService } from '../../services/reelService';
import { api } from '../../services/apiService';
import { isFlutterApp, pickVideo } from '../../utils/flutterBridge';
import toast from 'react-hot-toast';

const MAX_DURATION_SEC = 10;
const MAX_SIZE_MB = 20;
const MAX_CAPTION_LENGTH = 500;

export default function ReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentReel, setCommentReel] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadHashtags, setUploadHashtags] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [userProperties, setUserProperties] = useState([]);

  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const viewReportedRef = useRef(new Set());
  const loadingMoreRef = useRef(false);

  const loadFeed = useCallback(async (cursor = null) => {
    if (cursor) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else setLoading(true);
    try {
      const res = await reelService.getFeed(cursor ? { cursor } : {});
      const list = res.reels || [];
      if (cursor) {
        setReels((prev) => [...prev, ...list]);
      } else {
        setReels(list);
      }
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error('Feed load error', err);
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    // Fetch partner properties for linking when user opens upload modal
    api
      .get('/properties/my')
      .then((r) => setUserProperties(r.data?.properties || r.data?.hotels || []))
      .catch(() => {});
  }, [loadFeed]);

  const handleViewed = useCallback((reelId) => {
    if (viewReportedRef.current.has(reelId)) return;
    viewReportedRef.current.add(reelId);
    reelService.recordView(reelId, 3).catch(() => {});
  }, []);

  const handleLikeToggle = useCallback(async (reelId) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r._id !== reelId) return r;
        const liked = !r.likedByMe;
        return {
          ...r,
          likedByMe: liked,
          likesCount: (r.likesCount || 0) + (liked ? 1 : -1),
        };
      })
    );
    try {
      const res = await reelService.like(reelId);
      setReels((prev) =>
        prev.map((r) =>
          r._id === reelId ? { ...r, likedByMe: res.liked, likesCount: res.likesCount } : r
        )
      );
    } catch (err) {
      setReels((prev) =>
        prev.map((r) => {
          if (r._id !== reelId) return r;
          return {
            ...r,
            likedByMe: !r.likedByMe,
            likesCount: (r.likesCount || 0) + (r.likedByMe ? -1 : 1),
          };
        })
      );
      toast.error('Failed to update like');
    }
  }, []);

  const handleSaveToggle = useCallback(async (reelId) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r._id !== reelId) return r;
        const saved = !r.savedByMe;
        return {
          ...r,
          savedByMe: saved,
          savesCount: (r.savesCount || 0) + (saved ? 1 : -1),
        };
      })
    );
    try {
      const res = await reelService.toggleSave(reelId);
      setReels((prev) =>
        prev.map((r) =>
          r._id === reelId ? { ...r, savedByMe: res.saved, savesCount: res.savesCount } : r
        )
      );
      toast.success(res.saved ? 'Reel saved!' : 'Reel unsaved');
    } catch (err) {
      setReels((prev) =>
        prev.map((r) => {
          if (r._id !== reelId) return r;
          return {
            ...r,
            savedByMe: !r.savedByMe,
            savesCount: (r.savesCount || 0) + (r.savedByMe ? -1 : 1),
          };
        })
      );
      toast.error('Failed to update save');
    }
  }, []);

  const handleNotInterested = useCallback((reelId) => {
    setReels((prev) => prev.filter((r) => r._id !== reelId));
  }, []);

  const handleCommentClick = useCallback((reel) => setCommentReel(reel), []);
  const handleCloseComments = useCallback(() => setCommentReel(null), []);

  const handleCommentAdded = useCallback((reelId) => {
    setReels((prev) =>
      prev.map((r) =>
        r._id === reelId ? { ...r, commentsCount: (r.commentsCount || 0) + 1 } : r
      )
    );
  }, []);

  const validateVideoFile = (file) => {
    const allowed = ['video/mp4', 'video/webm'];
    if (!allowed.includes(file.type)) {
      toast.error('Only MP4 or WebM video is allowed');
      return false;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_SIZE_MB}MB`);
      return false;
    }
    return true;
  };

  const getVideoDuration = (file) =>
    new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject(new Error('Could not read video'));
      video.src = URL.createObjectURL(file);
    });

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a video');
      return;
    }
    if (!validateVideoFile(file)) return;
    setUploading(true);
    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_DURATION_SEC) {
        toast.error(`Video must be ${MAX_DURATION_SEC} seconds or less`);
        setUploading(false);
        return;
      }

      const res = await reelService.uploadReel(
        file,
        uploadCaption.trim(),
        selectedCategory,
        {
          propertyId: selectedPropertyId || undefined,
          hashtags: uploadHashtags ? uploadHashtags.split(',').map((h) => h.trim()) : [],
        }
      );

      const newReel = { ...res.reel, likedByMe: false, savedByMe: false };
      setReels((prev) => [newReel, ...prev]);
      setUploadOpen(false);
      setUploadCaption('');
      setUploadHashtags('');
      setSelectedFileName('');
      setSelectedFile(null);
      setSelectedCategory('General');
      setSelectedPropertyId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Reel uploaded successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (isFlutterApp()) {
      pickVideo(
        (file) => {
          setSelectedFile(file);
          setSelectedFileName(file.name);
          setUploadOpen(true);
        },
        (err) => {
          console.error('[Flutter Video Pick Error]', err);
          fileInputRef.current?.click();
        }
      );
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateVideoFile(file)) return;
      setSelectedFile(file);
      setSelectedFileName(file.name);
      setUploadOpen(true);
    }
  };

  const handleShareClick = useCallback(async (reel) => {
    const url = `${window.location.origin}/reels?reel=${reel._id}`;
    try {
      await reelService.share(reel._id);
      if (navigator.share) {
        await navigator.share({
          title: 'Reel',
          text: reel.caption || 'Check this reel on HomeZoo',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success('Link copied to clipboard');
      }
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = parseInt(entry.target.dataset.reelIndex, 10);
          if (!Number.isNaN(index)) setActiveIndex(index);
        });
      },
      { threshold: 0.5, root: container }
    );
    const slides = container.querySelectorAll('[data-reel-index]');
    slides.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.length]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !nextCursor || loadingMoreRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      loadFeed(nextCursor);
    }
  }, [nextCursor, loadFeed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const ReelsTopBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 md:max-w-md md:left-1/2 md:-translate-x-1/2 flex items-center justify-between p-3 pt-safe safe-area-top bg-black/40 backdrop-blur-sm pointer-events-none">
      <div className="flex items-center pointer-events-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="ml-3 text-white font-semibold">Reels</span>
      </div>
      <button
        type="button"
        onClick={handleUploadClick}
        className="p-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg pointer-events-auto"
        aria-label="Upload reel"
      >
        <Plus size={22} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black md:max-w-md md:mx-auto">
      <ReelsTopBar />

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileSelected}
      />

      {loading && reels.length === 0 ? (
        <div className="flex items-center justify-center min-h-dvh pt-14">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : reels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-dvh text-white p-6 pt-14">
          <p className="text-lg font-semibold">No reels yet</p>
          <p className="text-sm text-white/70 mt-2">Be the first to share a 10-second property reel.</p>
          <button
            type="button"
            onClick={handleUploadClick}
            className="mt-6 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg"
          >
            Upload Reel
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-[100dvh] overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar"
          style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}
        >
          {reels.map((reel, index) => (
            <div
              key={reel._id}
              data-reel-index={index}
              className="h-dvh min-h-dvh snap-start snap-always"
            >
              <ReelCard
                reel={reel}
                isActive={activeIndex === index}
                onLikeToggle={handleLikeToggle}
                onSaveToggle={handleSaveToggle}
                onCommentClick={handleCommentClick}
                onShareClick={handleShareClick}
                onViewed={handleViewed}
                onNotInterested={handleNotInterested}
              />
            </div>
          ))}
          {loadingMore && (
            <div className="h-20 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      <ReelCommentsSheet
        isOpen={!!commentReel}
        onClose={handleCloseComments}
        reel={commentReel}
        onCommentAdded={handleCommentAdded}
      />

      {/* Upload modal - Always rendered at root so uploadOpen works in both empty state and feed state */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end md:items-center md:justify-center overflow-y-auto">
          <div className="bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl md:max-w-md p-6 pb-24 md:pb-6 safe-area-bottom">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900">Upload Reel</h3>
              <button
                type="button"
                onClick={() => {
                  setUploadOpen(false);
                  setUploadCaption('');
                  setUploadHashtags('');
                  setSelectedFileName('');
                  setSelectedFile(null);
                  setSelectedPropertyId('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            {selectedFileName && (
              <p className="text-sm text-gray-600 mb-2 truncate" title={selectedFileName}>
                Video: <span className="font-medium">{selectedFileName}</span>
              </p>
            )}
            <p className="text-xs text-gray-500 mb-4">
              Max 10 seconds, max 20MB. MP4 or WebM only.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Optional Property Link Selection */}
              {userProperties && userProperties.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 size={16} className="text-emerald-600" />
                    Connect to Property (Optional)
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                  >
                    <option value="">-- No Property Link --</option>
                    {userProperties.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.propertyName || p.name} ({p.propertyType || 'Property'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Caption Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Add Caption (optional)
                </label>
                <textarea
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
                  placeholder="Describe your reel..."
                  maxLength={MAX_CAPTION_LENGTH}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none bg-white"
                />
                <p className="text-right text-xs text-gray-400 mt-1">
                  {uploadCaption.length}/{MAX_CAPTION_LENGTH}
                </p>
              </div>

              {/* Hashtags Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Tag size={15} className="text-emerald-600" />
                  Hashtags (comma separated)
                </label>
                <input
                  type="text"
                  value={uploadHashtags}
                  onChange={(e) => setUploadHashtags(e.target.value)}
                  placeholder="pg, luxury, indiranagar"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {['PG', 'Rent', 'Buy', 'Plot', 'General'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-500/50'
                      }`}
                    >
                      #{cat.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadOpen(false);
                    setUploadCaption('');
                    setUploadHashtags('');
                    setSelectedFileName('');
                    setSelectedFile(null);
                    setSelectedCategory('General');
                    setSelectedPropertyId('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    'Post Reel'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
