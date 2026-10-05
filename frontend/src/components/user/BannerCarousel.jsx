import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const BannerCarousel = ({
  banners = [],
  loading = false,
  placement = 'HOME_TOP',
  autoSlideInterval = 5000,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto slide effect
  useEffect(() => {
    if (!banners || banners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [banners, isPaused, autoSlideInterval]);

  // Loading skeleton
  if (loading) {
    const heightClass = placement === 'HOME_MIDDLE' ? 'h-36 sm:h-44' : 'h-44 sm:h-56 md:h-64';
    return (
      <div className={`max-w-7xl mx-auto px-4 py-3 ${className}`}>
        <div className={`w-full ${heightClass} bg-gray-200/80 rounded-2xl md:rounded-3xl animate-pulse`} />
      </div>
    );
  }

  // Hide if no banners
  if (!banners || banners.length === 0) {
    return null;
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  const handleBannerClick = (banner) => {
    if (!banner || banner.linkType === 'NONE') return;

    switch (banner.linkType) {
      case 'CATEGORY':
        navigate(`/search?category=${banner.linkValue}`);
        break;
      case 'PROPERTY':
        navigate(`/hotel/${banner.linkValue}`);
        break;
      case 'OFFER':
        if (banner.linkValue) {
          navigator.clipboard.writeText(banner.linkValue);
          setCopiedCode(banner.linkValue);
          toast.success(`Coupon code ${banner.linkValue} copied!`);
          setTimeout(() => setCopiedCode(null), 3000);
        }
        break;
      case 'EXTERNAL_URL':
        if (banner.linkValue) {
          window.open(banner.linkValue, '_blank', 'noopener,noreferrer');
        }
        break;
      default:
        break;
    }
  };

  const currentBanner = banners[currentIndex] || banners[0];
  const isMiddle = placement === 'HOME_MIDDLE';
  const containerHeight = isMiddle ? 'h-36 sm:h-44 md:h-48' : 'h-44 sm:h-56 md:h-64';

  return (
    <section
      className={`max-w-7xl mx-auto px-4 py-2 sm:py-3 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={`relative w-full ${containerHeight} rounded-2xl md:rounded-3xl overflow-hidden shadow-xs border border-gray-100/80 bg-gray-900 select-none group cursor-pointer`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => handleBannerClick(currentBanner)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner._id || currentIndex}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Background Image */}
            <img
              src={currentBanner.image}
              alt={currentBanner.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4 sm:p-6 md:p-8">
              <div className="max-w-xl text-white">
                <h3 className="text-base sm:text-xl md:text-2xl font-black tracking-tight drop-shadow-md">
                  {currentBanner.title}
                </h3>
                {currentBanner.subtitle && (
                  <p className="text-xs sm:text-sm text-gray-200 font-medium line-clamp-1 sm:line-clamp-2 mt-0.5 sm:mt-1 drop-shadow-sm">
                    {currentBanner.subtitle}
                  </p>
                )}

                {/* Call-to-action button or indicator */}
                {currentBanner.linkType && currentBanner.linkType !== 'NONE' && (
                  <div className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 bg-white/90 hover:bg-white text-gray-900 rounded-full text-xs font-bold shadow-md transition-all">
                    {currentBanner.linkType === 'OFFER' ? (
                      <>
                        {copiedCode === currentBanner.linkValue ? (
                          <Check size={13} className="text-green-600" />
                        ) : (
                          <Copy size={13} className="text-blue-600" />
                        )}
                        <span>{copiedCode === currentBanner.linkValue ? 'Copied!' : `Copy: ${currentBanner.linkValue}`}</span>
                      </>
                    ) : (
                      <>
                        <span>Explore Now</span>
                        <ArrowUpRight size={13} />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows (desktop hover) */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous Banner"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next Banner"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dots Pagination */}
        {banners.length > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3.5 right-4 sm:right-6 flex items-center gap-1.5 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-5 sm:w-6 h-1.5 bg-white shadow-xs'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BannerCarousel;
