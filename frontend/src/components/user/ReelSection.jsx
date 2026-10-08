import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { reelService } from '../../services/reelService';
import { Band, SectionHeader } from './home/HomeLayout';

const ReelItem = ({ reel, navigate, banded }) => {
    const videoRef = useRef(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            { threshold: 0.7 } // Play when 70% of the card is visible
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            if (isIntersecting) {
                videoRef.current.play().catch(err => console.log("Autoplay blocked", err));
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isIntersecting]);

    return (
        <div
            onClick={() => navigate(`/reels?reel=${reel._id}`)}
            className={`group flex-shrink-0 ${banded ? 'w-[132px] md:w-[160px]' : 'w-[125px] md:w-[150px]'} cursor-pointer snap-start`}
        >
            {/* Thumbnail/Video Card */}
            <div className={`relative aspect-[9/16] overflow-hidden transition-shadow ${banded ? 'rounded-2xl bg-white shadow-[0_4px_14px_rgba(15,23,42,0.08)]' : 'rounded-lg shadow-sm group-hover:shadow-md bg-gray-200'}`}>
                {/* Auto-playing Video */}
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    poster={reel.thumbnailUrl}
                    muted
                    loop
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isIntersecting ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Fallback Static Thumbnail */}
                <img
                    src={reel.thumbnailUrl || 'https://via.placeholder.com/150x266?text=Reel'}
                    alt={reel.caption}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isIntersecting ? 'opacity-0' : 'opacity-100'}`}
                />

                {/* subtle bottom overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-40" />

                {/* Play Icon - Only shows when not playing */}
                {!isIntersecting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/20 backdrop-blur-md p-2 rounded-full">
                            <Play size={20} className="text-white fill-white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Info Below Card */}
            <div className="mt-2.5 px-0.5">
                <h3 className={`text-[11px] md:text-xs font-bold line-clamp-2 leading-[1.3] transition-colors text-gray-900 group-hover:text-emerald-700`}>
                    {reel.caption || 'Property Tour'}
                </h3>
                <div className="flex items-center justify-between mt-1">
                    <span className={`text-[9px] md:text-[10px] font-medium text-gray-500`}>
                        {reel.viewsCount || 0} views • #{reel.category?.toLowerCase() || 'general'}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReelSection = ({ category, banded = false }) => {
    const navigate = useNavigate();
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);

    const normalizedCategory = (cat) => {
        if (!cat || cat === 'All') return 'All';
        if (cat.toLowerCase().includes('pg')) return 'PG';
        if (cat.toLowerCase().includes('rent')) return 'Rent';
        if (cat.toLowerCase().includes('buy')) return 'Buy';
        if (cat.toLowerCase().includes('plot')) return 'Plot';
        return 'General';
    };

    useEffect(() => {
        const fetchReels = async () => {
            setLoading(true);
            try {
                const cat = normalizedCategory(category);
                const res = await reelService.getFeed({ category: cat, limit: 10 });
                setReels(res.reels || []);
            } catch (err) {
                console.error("Failed to fetch reels for section:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, [category]);

    if (loading) {
        if (banded) {
            return (
                <div className="w-full bg-gradient-to-b from-rose-50 to-orange-50/40 py-4 md:py-12 rounded-[1.75rem] md:rounded-none">
                    <div className="max-w-7xl mx-auto flex gap-2 md:gap-4 overflow-hidden px-4 md:px-0">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="w-[132px] md:w-[160px] aspect-[9/16] shrink-0 rounded-2xl bg-white/80 animate-pulse" />
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <div className="py-8 flex justify-center items-center">
                <Loader2 className="animate-spin text-surface" size={24} />
            </div>
        );
    }

    if (reels.length === 0) return null;

    if (banded) {
        return (
            <Band tone="blush" spacing="loose" rounded>
                <SectionHeader
                    size="md"
                    icon={
                        <span className="inline-flex bg-red-600 p-1.5 rounded-xl">
                            <Play size={14} className="text-white fill-white" />
                        </span>
                    }
                    title="Reels"
                    subtitle="Short video tours and updates"
                    onAction={() => navigate('/reels')}
                />
                <div className="flex overflow-x-auto gap-2 md:gap-4 pb-1 px-4 md:px-0 scroll-pl-4 md:scroll-pl-0 no-scrollbar snap-x snap-mandatory">
                    {reels.map((reel) => (
                        <ReelItem key={reel._id} reel={reel} navigate={navigate} banded />
                    ))}
                    <div className="w-1 shrink-0" />
                </div>
            </Band>
        );
    }

    return (
        <div className="py-2.5 md:py-4 border-b border-gray-100 bg-gray-50/30">
            <div className="px-3.5 md:px-0 mb-1.5 md:mb-2 flex items-center justify-between">
                <div>
                    <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="bg-red-600 p-1 rounded-lg">
                            <Play size={14} className="text-white fill-white" />
                        </span>
                        Reels
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">Short video tours and updates</p>
                </div>
                <button
                    onClick={() => navigate('/reels')}
                    className="text-xs md:text-sm font-bold text-emerald-600 hover:text-emerald-700"
                >
                    View All
                </button>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-2 pl-3.5 pr-3.5 md:px-0 scroll-pl-3.5 no-scrollbar snap-x snap-mandatory">
                {reels.map((reel) => (
                    <ReelItem key={reel._id} reel={reel} navigate={navigate} />
                ))}
                <div className="w-2 shrink-0" />
            </div>
        </div>
    );
};

export default ReelSection;
