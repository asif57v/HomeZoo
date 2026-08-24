import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  X,
  Loader2,
  ArrowLeft,
  Building2,
  Tag,
  Compass,
  Video,
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Trash2,
  Play,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import ReelCard from '../../components/reels/ReelCard';
import ReelCommentsSheet from '../../components/reels/ReelCommentsSheet';
import { reelService } from '../../services/reelService';
import { api } from '../../services/apiService';
import paymentService from '../../services/paymentService';
import { isFlutterApp, pickVideo } from '../../utils/flutterBridge';
import toast from 'react-hot-toast';

const MAX_SIZE_MB = 20;
const MAX_CAPTION_LENGTH = 500;

export default function ReelsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation tab state: 'discover' | 'my' | 'saved'
  const [activeTab, setActiveTab] = useState('discover');

  // Discover Feed State
  const [feedReels, setFeedReels] = useState([]);
  const [feedNextCursor, setFeedNextCursor] = useState(null);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // My Reels State
  const [myReels, setMyReels] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // Saved Reels State
  const [savedReels, setSavedReels] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Fullscreen Viewer Modal State for Grid items
  const [selectedReelForModal, setSelectedReelForModal] = useState(null);

  // Comments Sheet State
  const [commentReel, setCommentReel] = useState(null);

  // Upload Modal State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadHashtags, setUploadHashtags] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [userProperties, setUserProperties] = useState([]);
  const [durationSettings, setDurationSettings] = useState(null);
  const [videoDurationSec, setVideoDurationSec] = useState(null);
  const [durationQuote, setDurationQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paidDurationPaymentId, setPaidDurationPaymentId] = useState(null);
  const [paidRazorpayMeta, setPaidRazorpayMeta] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const fileInputRef = useRef(null);
  const feedContainerRef = useRef(null);
  const viewReportedRef = useRef(new Set());
  const loadingMoreRef = useRef(false);
  const feedReelsRef = useRef([]);

  useEffect(() => {
    feedReelsRef.current = feedReels;
  }, [feedReels]);

  // Read query params e.g. ?tab=saved or ?tab=my or ?reel=xyz
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'saved' || tabParam === 'my') {
      setActiveTab(tabParam);
    }
    const reelIdParam = params.get('reel');
    if (reelIdParam) {
      reelService.getReelById(reelIdParam).then((res) => {
        if (res.reel) setSelectedReelForModal(res.reel);
      }).catch(() => {});
    }
  }, [location.search]);

  // Fetch Discover Feed
  const loadFeed = useCallback(async (cursor = null) => {
    if (cursor) {
      loadingMoreRef.current = true;
      setFeedLoadingMore(true);
    } else {
      setFeedLoading(true);
    }
    try {
      const page = cursor ? Number(cursor) || 2 : 1;
      const existing = feedReelsRef.current || [];
      const exclude = existing.map((r) => r._id).filter(Boolean).join(',');
      const res = await reelService.getFeed({
        page,
        limit: 10,
        ...(cursor ? { cursor: String(page) } : {}),
        ...(exclude ? { exclude } : {}),
      });
      const list = res.reels || [];
      if (cursor) {
        setFeedReels((prev) => {
          const seen = new Set(prev.map((r) => r._id));
          const merged = [...prev];
          list.forEach((r) => {
            if (r?._id && !seen.has(r._id)) {
              seen.add(r._id);
              merged.push(r);
            }
          });
          return merged;
        });
      } else {
        setFeedReels(list);
      }
      setFeedNextCursor(res.nextCursor || null);
      setFeedHasMore(!!res.hasMore);
    } catch (err) {
      console.error('Feed load error', err);
      toast.error('Failed to load reels feed');
    } finally {
      setFeedLoading(false);
      loadingMoreRef.current = false;
      setFeedLoadingMore(false);
    }
  }, []);

  // Fetch My Reels
  const loadMyReels = useCallback(async () => {
    setMyLoading(true);
    try {
      const res = await reelService.getMyReels({ page: 1, limit: 30 });
      setMyReels(res.reels || []);
    } catch (err) {
      console.error('My reels load error', err);
      toast.error('Failed to load your reels');
    } finally {
      setMyLoading(false);
    }
  }, []);

  // Fetch Saved Reels
  const loadSavedReels = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res = await reelService.getSavedReels();
      setSavedReels(res.reels || []);
    } catch (err) {
      console.error('Saved reels load error', err);
      toast.error('Failed to load saved reels');
    } finally {
      setSavedLoading(false);
    }
  }, []);

  // Initial load based on tab
  useEffect(() => {
    loadFeed();
    // Load property options for linking
    api
      .get('/properties/my')
      .then((r) => {
        const props = r.data?.properties || r.data?.hotels || [];
        if (props.length > 0) setUserProperties(props);
        else api.get('/admin/properties').then((res) => setUserProperties(res.data?.properties || [])).catch(() => {});
      })
      .catch(() => {
        api.get('/admin/properties').then((res) => setUserProperties(res.data?.properties || [])).catch(() => {});
      });
  }, [loadFeed]);

  useEffect(() => {
    if (activeTab === 'my') loadMyReels();
    if (activeTab === 'saved') loadSavedReels();
  }, [activeTab, loadMyReels, loadSavedReels]);

  // Handle view tracking
  const handleViewed = useCallback((reelId) => {
    if (viewReportedRef.current.has(reelId)) return;
    viewReportedRef.current.add(reelId);
    reelService.recordView(reelId, 3).catch(() => {});
  }, []);

  // Like Toggle
  const handleLikeToggle = useCallback(async (reelId) => {
    const updateList = (prev) =>
      prev.map((r) => {
        if (r._id !== reelId) return r;
        const liked = !r.likedByMe;
        return {
          ...r,
          likedByMe: liked,
          likesCount: Math.max(0, (r.likesCount || 0) + (liked ? 1 : -1)),
        };
      });

    setFeedReels(updateList);
    setMyReels(updateList);
    setSavedReels(updateList);

    if (selectedReelForModal && selectedReelForModal._id === reelId) {
      const liked = !selectedReelForModal.likedByMe;
      setSelectedReelForModal({
        ...selectedReelForModal,
        likedByMe: liked,
        likesCount: Math.max(0, (selectedReelForModal.likesCount || 0) + (liked ? 1 : -1)),
      });
    }

    try {
      const res = await reelService.like(reelId);
      const applyRes = (prev) =>
        prev.map((r) => (r._id === reelId ? { ...r, likedByMe: res.liked, likesCount: res.likesCount } : r));

      setFeedReels(applyRes);
      setMyReels(applyRes);
      setSavedReels(applyRes);

      if (selectedReelForModal && selectedReelForModal._id === reelId) {
        setSelectedReelForModal((prev) =>
          prev ? { ...prev, likedByMe: res.liked, likesCount: res.likesCount } : null
        );
      }
    } catch (err) {
      toast.error('Failed to update like');
    }
  }, [selectedReelForModal]);

  // Save Toggle
  const handleSaveToggle = useCallback(async (reelId) => {
    const updateList = (prev) =>
      prev.map((r) => {
        if (r._id !== reelId) return r;
        const saved = !r.savedByMe;
        return {
          ...r,
          savedByMe: saved,
          savesCount: Math.max(0, (r.savesCount || 0) + (saved ? 1 : -1)),
        };
      });

    setFeedReels(updateList);
    setMyReels(updateList);

    if (selectedReelForModal && selectedReelForModal._id === reelId) {
      const saved = !selectedReelForModal.savedByMe;
      setSelectedReelForModal({
        ...selectedReelForModal,
        savedByMe: saved,
        savesCount: Math.max(0, (selectedReelForModal.savesCount || 0) + (saved ? 1 : -1)),
      });
    }

    try {
      const res = await reelService.toggleSave(reelId);

      const applyRes = (prev) =>
        prev.map((r) => (r._id === reelId ? { ...r, savedByMe: res.saved, savesCount: res.savesCount } : r));

      setFeedReels(applyRes);
      setMyReels(applyRes);

      if (!res.saved) {
        // If unsaved, remove from savedReels list
        setSavedReels((prev) => prev.filter((r) => r._id !== reelId));
      } else {
        // If saved, refresh saved reels list
        reelService.getSavedReels().then((r) => setSavedReels(r.reels || [])).catch(() => {});
      }

      if (selectedReelForModal && selectedReelForModal._id === reelId) {
        setSelectedReelForModal((prev) =>
          prev ? { ...prev, savedByMe: res.saved, savesCount: res.savesCount } : null
        );
      }

      toast.success(res.saved ? 'Reel saved!' : 'Reel unsaved');
    } catch (err) {
      toast.error('Failed to update save');
    }
  }, [selectedReelForModal]);

  // Delete Reel
  const handleDeleteReel = useCallback(async (reelId) => {
    if (!window.confirm('Are you sure you want to delete this reel?')) return;
    try {
      await reelService.deleteReel(reelId);
      setFeedReels((prev) => prev.filter((r) => r._id !== reelId));
      setMyReels((prev) => prev.filter((r) => r._id !== reelId));
      setSavedReels((prev) => prev.filter((r) => r._id !== reelId));
      if (selectedReelForModal && selectedReelForModal._id === reelId) {
        setSelectedReelForModal(null);
      }
      toast.success('Reel deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete reel');
    }
  }, [selectedReelForModal]);

  const handleNotInterested = useCallback((reelId) => {
    setFeedReels((prev) => prev.filter((r) => r._id !== reelId));
  }, []);

  const handleCommentClick = useCallback((reel) => setCommentReel(reel), []);
  const handleCloseComments = useCallback(() => setCommentReel(null), []);

  const handleCommentAdded = useCallback((reelId, delta = 1) => {
    const updateCount = (prev) =>
      prev.map((r) =>
        r._id === reelId
          ? { ...r, commentsCount: Math.max(0, (r.commentsCount || 0) + delta) }
          : r
      );
    setFeedReels(updateCount);
    setMyReels(updateCount);
    setSavedReels(updateCount);
    if (selectedReelForModal && selectedReelForModal._id === reelId) {
      setSelectedReelForModal((prev) =>
        prev
          ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) + delta) }
          : null
      );
    }
  }, [selectedReelForModal]);

  const handleShareClick = useCallback(async (reel) => {
    const url = `${window.location.origin}/reels?reel=${reel._id}`;
    try {
      await reelService.share(reel._id);
      const incShare = (prev) =>
        prev.map((r) => (r._id === reel._id ? { ...r, sharesCount: (r.sharesCount || 0) + 1 } : r));
      setFeedReels(incShare);
      setMyReels(incShare);
      setSavedReels(incShare);

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

  // Video Upload Handlers
  const resetUploadForm = () => {
    setUploadCaption('');
    setUploadHashtags('');
    setSelectedFileName('');
    setSelectedFile(null);
    setSelectedCategory('General');
    setSelectedPropertyId('');
    setVideoDurationSec(null);
    setDurationQuote(null);
    setPaidDurationPaymentId(null);
    setPaidRazorpayMeta(null);
    setShowUnlockModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const refreshDurationQuote = async (file) => {
    setQuoteLoading(true);
    setPaidDurationPaymentId(null);
    setPaidRazorpayMeta(null);
    try {
      const duration = await getVideoDuration(file);
      const rounded = Math.ceil(duration);
      setVideoDurationSec(rounded);
      const res = await reelService.quoteDuration(rounded);
      setDurationQuote(res.quote || null);
      if (res.settings) setDurationSettings(res.settings);
      if (res.quote?.requiresPayment && res.quote.charge > 0) {
        setShowUnlockModal(true);
      } else {
        setShowUnlockModal(false);
      }
      return res.quote;
    } catch (err) {
      console.error(err);
      setDurationQuote(null);
      setVideoDurationSec(null);
      toast.error('Could not read video duration');
      return null;
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    reelService
      .getDurationSettings()
      .then((res) => setDurationSettings(res.settings || null))
      .catch(() => {});
  }, []);

  const payForDurationIfNeeded = async (quote) => {
    if (!quote?.requiresPayment || !(quote.charge > 0)) {
      return { durationPaymentId: null };
    }

    if (paidDurationPaymentId) {
      return {
        durationPaymentId: paidDurationPaymentId,
        ...(paidRazorpayMeta || {}),
      };
    }

    const orderRes = await reelService.createDurationPaymentOrder(quote.duration);
    const { order, paymentId, razorpayKeyId, quote: serverQuote } = orderRes;
    const amountToPay = serverQuote?.charge ?? quote.charge;

    const isDemo =
      !razorpayKeyId ||
      razorpayKeyId === 'rzp_test_demo' ||
      String(order?.id || '').startsWith('order_sim_');

    let verifyPayload = {
      paymentId,
      razorpay_order_id: order.id,
    };

    if (!isDemo) {
      const rzpResponse = await paymentService.openCheckout({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'HomeZoo',
        description: `Reel duration charge (${quote.duration}s)`,
        order_id: order.id,
        theme: { color: '#059669' },
      });
      verifyPayload = {
        paymentId,
        razorpay_order_id: rzpResponse.razorpay_order_id,
        razorpay_payment_id: rzpResponse.razorpay_payment_id,
        razorpay_signature: rzpResponse.razorpay_signature,
      };
    } else {
      verifyPayload.razorpay_payment_id = `pay_sim_reel_${Date.now()}`;
    }

    const verified = await reelService.verifyDurationPayment(verifyPayload);
    if (!verified.success) {
      throw new Error(verified.message || 'Payment failed. Your Reel has not been published.');
    }

    setPaidDurationPaymentId(verified.paymentId || paymentId);
    setPaidRazorpayMeta({
      razorpay_order_id: verifyPayload.razorpay_order_id,
      razorpay_payment_id: verifyPayload.razorpay_payment_id,
    });

    return {
      durationPaymentId: verified.paymentId || paymentId,
      razorpay_order_id: verifyPayload.razorpay_order_id,
      razorpay_payment_id: verifyPayload.razorpay_payment_id,
    };
  };

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
      let quote = durationQuote;
      if (!quote || videoDurationSec == null) {
        quote = await refreshDurationQuote(file);
      }
      if (!quote) {
        toast.error('Could not calculate duration charge');
        return;
      }
      if (!quote.ok) {
        toast.error(quote.message || 'This video cannot be uploaded');
        return;
      }

      const paymentMeta = await payForDurationIfNeeded(quote);

      const res = await reelService.uploadReel(
        file,
        uploadCaption.trim(),
        selectedCategory,
        {
          propertyId: selectedPropertyId || undefined,
          hashtags: uploadHashtags ? uploadHashtags.split(',').map((h) => h.trim()) : [],
          ...paymentMeta,
        }
      );

      const newReel = { ...res.reel, likedByMe: false, savedByMe: false };
      setFeedReels((prev) => [newReel, ...prev]);
      setMyReels((prev) => [newReel, ...prev]);
      setUploadOpen(false);
      resetUploadForm();
      toast.success('Reel uploaded successfully!');
      setActiveTab('my');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Upload failed';
      if (String(msg).toLowerCase().includes('cancel')) {
        toast.error('Payment cancelled. Your Reel has not been published.');
      } else {
        toast.error(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (isFlutterApp()) {
      pickVideo(
        async (file) => {
          if (!validateVideoFile(file)) return;
          setSelectedFile(file);
          setSelectedFileName(file.name);
          setUploadOpen(true);
          await refreshDurationQuote(file);
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

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateVideoFile(file)) return;
      setSelectedFile(file);
      setSelectedFileName(file.name);
      setUploadOpen(true);
      await refreshDurationQuote(file);
    }
  };

  // Scroll observer for feed autoplay & infinite scroll
  useEffect(() => {
    if (activeTab !== 'discover') return;
    const container = feedContainerRef.current;
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
  }, [activeTab, feedReels.length]);

  const handleScroll = useCallback(() => {
    if (activeTab !== 'discover') return;
    const container = feedContainerRef.current;
    if (!container || !feedHasMore || !feedNextCursor || loadingMoreRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      loadFeed(feedNextCursor);
    }
  }, [activeTab, feedHasMore, feedNextCursor, loadFeed]);

  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Render Top Header Navigation
  const ReelsTopBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 md:max-w-md md:left-1/2 md:-translate-x-1/2 flex items-center justify-between p-3 pt-safe safe-area-top bg-black/60 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Tabs Switcher: Discover | My Reels | Saved */}
      <div className="flex items-center bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('discover')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'discover'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Compass size={13} />
          Discover
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('my')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'my'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Video size={13} />
          My Reels
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'saved'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Bookmark size={13} />
          Saved
        </button>
      </div>

      {/* Upload + Button */}
      <button
        type="button"
        onClick={handleUploadClick}
        className="p-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg transition-transform active:scale-95"
        aria-label="Create reel"
        title="Create Reel"
      >
        <Plus size={20} />
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

      {/* CONTENT BASED ON ACTIVE TAB */}
      <div className="pt-14 h-full">
        {/* 1. DISCOVER TAB */}
        {activeTab === 'discover' && (
          <>
            {feedLoading && feedReels.length === 0 ? (
              <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
                <Loader2 size={36} className="text-emerald-500 animate-spin" />
              </div>
            ) : feedReels.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-white p-6">
                <Compass size={48} className="text-emerald-500 mb-3 opacity-80" />
                <p className="text-lg font-bold">No reels in feed yet</p>
                <p className="text-xs text-white/70 mt-1 text-center">
                  Be the first to share a property tour reel.
                </p>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="mt-6 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create Reel
                </button>
              </div>
            ) : (
              <div
                ref={feedContainerRef}
                className="h-[calc(100dvh-3.5rem)] overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}
              >
                {feedReels.map((reel, index) => (
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
                      onDeleteReel={handleDeleteReel}
                    />
                  </div>
                ))}
                {feedLoadingMore && (
                  <div className="h-20 flex items-center justify-center">
                    <Loader2 size={24} className="text-white animate-spin" />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 2. MY REELS TAB */}
        {activeTab === 'my' && (
          <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto p-4 pb-24 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Video className="text-emerald-500" size={20} />
                  My Uploaded Reels
                </h2>
                <p className="text-xs text-gray-400">Manage and view engagement on your reels</p>
              </div>
              <span className="text-xs bg-emerald-950 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                {myReels.length} {myReels.length === 1 ? 'Reel' : 'Reels'}
              </span>
            </div>

            {myLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
              </div>
            ) : myReels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-900/60 rounded-2xl border border-white/10">
                <Video size={48} className="text-gray-500 mb-3" />
                <p className="text-base font-bold text-white">You haven't uploaded any Reels yet.</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Share short 10-second property tours to attract buyers and renters.
                </p>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="mt-6 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create Reel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {myReels.map((reel) => (
                  <div
                    key={reel._id}
                    onClick={() => setSelectedReelForModal(reel)}
                    className="relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden cursor-pointer group border border-white/10 shadow-md hover:border-emerald-500/50 transition-all"
                  >
                    {/* Thumbnail / Video */}
                    {reel.thumbnailUrl ? (
                      <img
                        src={reel.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={reel.videoUrl}
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Category Pill */}
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-bold bg-black/60 backdrop-blur-md text-emerald-400 px-1.5 py-0.5 rounded border border-white/10">
                        #{reel.category?.toLowerCase() || 'general'}
                      </span>
                    </div>

                    {/* Quick Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReel(reel._id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-red-400 hover:bg-black/90 transition-colors"
                      title="Delete Reel"
                    >
                      <Trash2 size={13} />
                    </button>

                    {/* Reel Stats Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 text-white text-[10px] font-semibold space-y-1">
                      <p className="truncate font-bold text-white text-[11px]">
                        {reel.caption || 'Property Tour'}
                      </p>
                      <div className="flex items-center justify-between text-gray-300 pt-0.5 border-t border-white/10">
                        <span className="flex items-center gap-1" title="Views">
                          <Eye size={11} className="text-emerald-400" />
                          {reel.viewsCount || 0}
                        </span>
                        <span className="flex items-center gap-1" title="Likes">
                          <Heart size={11} className="text-red-400 fill-red-400/30" />
                          {reel.likesCount || 0}
                        </span>
                        <span className="flex items-center gap-1" title="Saves">
                          <Bookmark size={11} className="text-amber-400 fill-amber-400/30" />
                          {reel.savesCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. SAVED REELS TAB */}
        {activeTab === 'saved' && (
          <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto p-4 pb-24 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Bookmark className="text-amber-400 fill-amber-400/30" size={20} />
                  Saved Reels
                </h2>
                <p className="text-xs text-gray-400">Reels and property tours you bookmarked</p>
              </div>
              <span className="text-xs bg-amber-950 text-amber-400 font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                {savedReels.length} {savedReels.length === 1 ? 'Saved' : 'Saved'}
              </span>
            </div>

            {savedLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
              </div>
            ) : savedReels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-900/60 rounded-2xl border border-white/10">
                <Bookmark size={48} className="text-amber-400/50 mb-3" />
                <p className="text-base font-bold text-white">No saved Reels yet.</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Explore Reels and save properties you like to watch them anytime.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className="mt-6 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2"
                >
                  <Compass size={18} />
                  Explore Reels
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {savedReels.map((reel) => (
                  <div
                    key={reel._id}
                    onClick={() => setSelectedReelForModal(reel)}
                    className="relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden cursor-pointer group border border-white/10 shadow-md hover:border-emerald-500/50 transition-all"
                  >
                    {/* Thumbnail / Video */}
                    {reel.thumbnailUrl ? (
                      <img
                        src={reel.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={reel.videoUrl}
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Quick Unsave Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveToggle(reel._id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-amber-400 hover:bg-black/90 transition-colors"
                      title="Unsave Reel"
                    >
                      <Bookmark size={13} className="fill-amber-400" />
                    </button>

                    {/* Reel Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 text-white text-[10px] font-semibold space-y-1">
                      <p className="truncate font-bold text-white text-[11px]">
                        {reel.caption || 'Saved Reel'}
                      </p>
                      <div className="flex items-center justify-between text-gray-300 pt-0.5 border-t border-white/10">
                        <span className="flex items-center gap-1">
                          <Heart size={11} className="text-red-400" />
                          {reel.likesCount || 0}
                        </span>
                        {reel.property && (
                          <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                            <Building2 size={10} />
                            Prop
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULLSCREEN REEL VIEWER MODAL (Opened when clicking a card in My Reels or Saved Reels) */}
      {selectedReelForModal && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col md:max-w-md md:mx-auto">
          {/* Modal Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 pt-safe safe-area-top bg-black/50 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setSelectedReelForModal(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 px-3 text-xs font-bold"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <span className="text-white text-xs font-bold">
              {activeTab === 'my' ? 'My Reel' : activeTab === 'saved' ? 'Saved Reel' : 'Reel Detail'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedReelForModal(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="w-full h-full">
            <ReelCard
              reel={selectedReelForModal}
              isActive={true}
              onLikeToggle={handleLikeToggle}
              onSaveToggle={handleSaveToggle}
              onCommentClick={handleCommentClick}
              onShareClick={handleShareClick}
              onViewed={handleViewed}
              onNotInterested={handleNotInterested}
              onDeleteReel={handleDeleteReel}
            />
          </div>
        </div>
      )}

      {/* Comments Sheet */}
      <ReelCommentsSheet
        isOpen={!!commentReel}
        onClose={handleCloseComments}
        reel={commentReel}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={(reelId) => handleCommentAdded(reelId, -1)}
      />

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end md:items-center md:justify-center overflow-y-auto">
          <div className="bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl md:max-w-md p-6 pb-24 md:pb-6 safe-area-bottom">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-emerald-600" />
                Create & Upload Reel
              </h3>
              <button
                type="button"
                onClick={() => {
                  setUploadOpen(false);
                  resetUploadForm();
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
            <p className="text-xs text-gray-500 mb-3">
              Max {durationSettings?.maxDuration ? `${durationSettings.maxDuration}s` : '—'}.
              Free up to {durationSettings?.freeDuration != null ? `${durationSettings.freeDuration}s` : '—'}.
              Max {MAX_SIZE_MB}MB. MP4 or WebM only.
            </p>

            {/* Duration / pricing summary (recalculated when video changes) */}
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm">
              {quoteLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={16} className="animate-spin" /> Checking duration…
                </div>
              ) : videoDurationSec == null ? (
                <p className="text-gray-500 text-xs">Select a video to see duration charge.</p>
              ) : durationQuote?.code === 'OVER_MAX' ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">Video: {videoDurationSec} sec</p>
                  <p className="text-red-600 text-xs font-medium">
                    Maximum allowed duration: {durationQuote.maxDuration} sec
                  </p>
                  <p className="text-red-500 text-xs">Please select a shorter video.</p>
                </div>
              ) : durationQuote?.isFree || durationQuote?.code === 'FREE' || durationQuote?.code === 'FREE_TIER' ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">Video: {videoDurationSec} sec</p>
                  <p className="text-xs text-gray-600">
                    Free duration: {durationQuote.freeDuration} sec
                  </p>
                  <p className="text-emerald-700 font-bold text-xs">Duration charge: FREE</p>
                </div>
              ) : durationQuote?.requiresPayment ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">Your reel is {videoDurationSec} seconds long.</p>
                  <p className="text-xs text-gray-600">
                    The first {durationQuote.freeDuration} seconds are free.
                  </p>
                  <p className="text-amber-700 font-bold">
                    Additional payment: ₹{durationQuote.charge}
                  </p>
                  {paidDurationPaymentId && (
                    <p className="text-emerald-600 text-xs font-medium">Unlocked — ready to upload</p>
                  )}
                </div>
              ) : (
                <p className="text-red-600 text-xs">{durationQuote?.message || 'Unable to price this video'}</p>
              )}
            </div>

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
                    resetUploadForm();
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    uploading ||
                    quoteLoading ||
                    !durationQuote?.ok ||
                    durationQuote?.code === 'OVER_MAX'
                  }
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {durationQuote?.requiresPayment && !paidDurationPaymentId
                        ? 'Processing…'
                        : 'Uploading…'}
                    </>
                  ) : durationQuote?.requiresPayment && durationQuote.charge > 0 ? (
                    paidDurationPaymentId ? (
                      'Upload Reel'
                    ) : (
                      `Pay ₹${durationQuote.charge} & Upload`
                    )
                  ) : (
                    'Upload Reel'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUnlockModal && durationQuote?.requiresPayment && (
        <div className="fixed inset-0 z-[140] bg-black/70 flex items-end md:items-center md:justify-center p-4">
          <div className="bg-white w-full md:max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unlock Full Reel</h3>
            <p className="text-sm text-gray-700">
              Your reel is <span className="font-semibold">{durationQuote.duration} seconds</span> long.
            </p>
            <p className="text-sm text-gray-600">
              The first <span className="font-semibold">{durationQuote.freeDuration} seconds</span> are free,
              but uploading a reel of this duration requires an additional payment of{' '}
              <span className="font-semibold">₹{durationQuote.charge}</span>.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={async () => {
                  setUploading(true);
                  try {
                    await payForDurationIfNeeded(durationQuote);
                    setShowUnlockModal(false);
                    toast.success('Duration unlocked. You can now upload.');
                  } catch (err) {
                    const msg = err.response?.data?.message || err.message || 'Payment failed';
                    if (String(msg).toLowerCase().includes('cancel')) {
                      toast.error('Payment cancelled. Your Reel has not been published.');
                    } else {
                      toast.error(msg);
                    }
                  } finally {
                    setUploading(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60"
              >
                {uploading ? 'Processing…' : `Pay ₹${durationQuote.charge} & Unlock`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
