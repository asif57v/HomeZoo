import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Star, 
    BadgeCheck, 
    ChevronRight, 
    MapPin, 
    Search, 
    Calendar, 
    ArrowRight, 
    Download, 
    Smartphone, 
    QrCode, 
    Sparkles, 
    Building2, 
    User, 
    TrendingUp,
    CheckCircle2,
    Quote
} from 'lucide-react';
import { propertyService } from '../../services/apiService';

const HomeBottomSections = () => {
    // 1. Partners State (using existing recommended sellers service to maintain backend integration)
    const [partners, setPartners] = useState([]);
    const [loadingPartners, setLoadingPartners] = useState(true);

    // 4. Cities Filter State
    const [citySearch, setCitySearch] = useState('');

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const data = await propertyService.getRecommendedSellers();
                setPartners(data || []);
            } catch (err) {
                console.error("Failed to fetch partners:", err);
            } finally {
                setLoadingPartners(false);
            }
        };
        fetchPartners();
    }, []);

    // Dynamic Package-Based Theming Helper
    const getPackageTheme = (planTier, planName) => {
        const tier = (planTier || planName || '').toLowerCase();

        if (tier.includes('diamond')) {
            return {
                badgeLabel: planName || 'ELITE DIAMOND PACK',
                cardBg: 'bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-indigo-50/60',
                borderColor: 'border-sky-300/60 hover:border-sky-400/90',
                glowShadow: 'shadow-[0_10px_35px_-8px_rgba(56,189,248,0.18)] hover:shadow-[0_20px_50px_-10px_rgba(56,189,248,0.3)]',
                badgeStyle: 'bg-sky-500/10 text-sky-800 border-sky-300/70',
                accentColor: '#6EC6FF',
                profileRing: 'ring-sky-200/90 group-hover:ring-sky-400/80',
                quoteBg: 'bg-white/90 border-sky-100/90 shadow-xs',
                quoteIconColor: 'text-sky-500',
                buttonGradient: 'from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-700 shadow-sky-500/25',
                hasDiamondPattern: true,
            };
        }

        if (tier.includes('gold')) {
            return {
                badgeLabel: planName || 'GOLD PACK',
                cardBg: 'bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-amber-100/30',
                borderColor: 'border-amber-300/70 hover:border-amber-400/90',
                glowShadow: 'shadow-[0_10px_35px_-8px_rgba(245,158,11,0.15)] hover:shadow-[0_20px_50px_-10px_rgba(245,158,11,0.28)]',
                badgeStyle: 'bg-amber-500/10 text-amber-900 border-amber-300/80',
                accentColor: '#D4AF37',
                profileRing: 'ring-amber-200/90 group-hover:ring-amber-400/80',
                quoteBg: 'bg-white/90 border-amber-100/90 shadow-xs',
                quoteIconColor: 'text-amber-500',
                buttonGradient: 'from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-900 shadow-amber-500/25',
                hasDiamondPattern: false,
            };
        }

        if (tier.includes('platinum')) {
            return {
                badgeLabel: planName || 'PLATINUM PACK',
                cardBg: 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40',
                borderColor: 'border-indigo-200/80 hover:border-indigo-300/90',
                glowShadow: 'shadow-[0_10px_35px_-8px_rgba(99,102,241,0.12)] hover:shadow-[0_20px_50px_-10px_rgba(99,102,241,0.25)]',
                badgeStyle: 'bg-indigo-500/10 text-indigo-900 border-indigo-200/90',
                accentColor: '#E5E4E2',
                profileRing: 'ring-indigo-200/90 group-hover:ring-indigo-400/80',
                quoteBg: 'bg-white/90 border-indigo-100/90 shadow-xs',
                quoteIconColor: 'text-indigo-500',
                buttonGradient: 'from-indigo-600 via-indigo-700 to-slate-900 hover:from-indigo-500 hover:to-black shadow-indigo-500/25',
                hasDiamondPattern: false,
            };
        }

        // Default / Starter Silver Pack
        return {
            badgeLabel: planName || 'STARTER SILVER PACK',
            cardBg: 'bg-gradient-to-br from-slate-50 via-slate-100/60 to-slate-200/30',
            borderColor: 'border-slate-200/90 hover:border-slate-300/90',
            glowShadow: 'shadow-[0_10px_35px_-8px_rgba(148,163,184,0.12)] hover:shadow-[0_20px_50px_-10px_rgba(148,163,184,0.25)]',
            badgeStyle: 'bg-slate-200/80 text-slate-700 border-slate-300/80',
            accentColor: '#C0C0C0',
            profileRing: 'ring-slate-200/90 group-hover:ring-slate-300/90',
            quoteBg: 'bg-white/90 border-slate-200/80 shadow-xs',
            quoteIconColor: 'text-slate-400',
            buttonGradient: 'from-slate-700 via-slate-800 to-slate-950 hover:from-slate-800 hover:to-black shadow-slate-500/25',
            hasDiamondPattern: false,
        };
    };

    // Fallback/demo partners if backend API returns less items
    const displayPartners = (partners.length > 0 ? partners : [
        {
            _id: 'p1',
            name: 'Seed Partner',
            profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
            plan: { name: 'ELITE DIAMOND PACK', tier: 'diamond', hasVerifiedTag: true },
            experienceYears: 10,
            totalListings: 13,
            tagline: 'Professional guidance for verified plots & premium properties across prime city zones.',
            rating: '4.9',
            reviewsCount: 120,
            address: { city: 'Indore', locality: 'AB Road' }
        },
        {
            _id: 'p2',
            name: 'Asif mansoori',
            profileImage: '',
            plan: { name: 'STARTER SILVER PACK', tier: 'silver', hasVerifiedTag: true },
            experienceYears: 10,
            totalListings: 24,
            tagline: 'Professional guidance for verified plots & premium properties across prime city zones.',
            rating: '4.9',
            reviewsCount: 120,
            address: { city: 'Indore', locality: 'Malipura' }
        },
        {
            _id: 'p3',
            name: 'Horizon BuildMart & Estates',
            profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
            plan: { name: 'GOLD PACK', tier: 'gold', hasVerifiedTag: true },
            experienceYears: 15,
            totalListings: 72,
            tagline: 'Trusted developers of gated plot communities & premium luxury villas.',
            rating: '5.0',
            reviewsCount: 240,
            address: { city: 'Pune', locality: 'Hinjewadi' }
        },
        {
            _id: 'p4',
            name: 'Summit Real Estate Partners',
            profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
            plan: { name: 'PLATINUM PACK', tier: 'platinum', hasVerifiedTag: true },
            experienceYears: 8,
            totalListings: 29,
            tagline: 'Verified land titles and fast legal clearing services for commercial plots.',
            rating: '4.9',
            reviewsCount: 98,
            address: { city: 'Hyderabad', locality: 'Gachibowli' }
        }
    ]).slice(0, 6);

    // 2. News & Updates Data
    const newsArticles = [
        {
            id: 1,
            title: "Why Residential Plots Are Overperforming Urban Apartments in 2026",
            description: "An in-depth market analysis revealing how smart infrastructure improvements and express highway corridors are fueling record returns in land investment.",
            date: "Jul 24, 2026",
            category: "Market Insights",
            image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80",
            readTime: "5 min read"
        },
        {
            id: 2,
            title: "Essential Legal Checklist Before Investing in Agricultural & Residential Land",
            description: "Learn the crucial title verification steps, RERA compliance check procedures, and zoning laws to ensure your property purchase is 100% secure.",
            date: "Jul 20, 2026",
            category: "Legal Guide",
            image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80",
            readTime: "7 min read"
        },
        {
            id: 3,
            title: "The Rise of Eco-Friendly Gated Plot Communities Across India's IT Hubs",
            description: "Modern homeowners are shifting towards customizable villa plots within solar-powered, green luxury townships offering resort-like amenities.",
            date: "Jul 15, 2026",
            category: "Lifestyle & Design",
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80",
            readTime: "4 min read"
        }
    ];

    return (
        <div className="w-full text-slate-800 antialiased space-y-20 sm:space-y-28 md:space-y-32 my-20 md:my-28">
            
            {/* =========================================================
                SECTION 1: ⭐ TOP RATED HOMEZOO PARTNERS
            ========================================================= */}
            <section className="w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10 md:mb-14">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-extrabold tracking-wide uppercase mb-3 border border-amber-200/60 shadow-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            Verified Excellence
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Top Rated HomeZoo Partners
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
                            Collaborate with our highest-performing locality experts and trusted land advisors with proven track records and verified titles.
                        </p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '#/partners'} 
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm sm:text-base hover:bg-blue-600 active:scale-[0.98] transition-all shadow-md hover:shadow-xl shrink-0 group"
                    >
                        <span>View All Partners</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="flex overflow-x-auto lg:grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 pb-4 lg:pb-0 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {displayPartners.map((partner, idx) => {
                        const theme = getPackageTheme(partner.plan?.tier, partner.plan?.name);

                        return (
                            <motion.div
                                key={partner._id || idx}
                                whileHover={{ y: -6 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                onClick={() => window.location.href = `#/partners/${partner._id}`}
                                className={`group relative w-[88vw] max-w-[360px] sm:max-w-[460px] lg:w-auto lg:max-w-none shrink-0 lg:shrink snap-start 
                                    rounded-[24px] p-5 sm:p-6 border ${theme.borderColor} ${theme.cardBg} ${theme.glowShadow} 
                                    transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden backdrop-blur-md`}
                            >
                                {/* Subtle Crystal/Diamond Grid Pattern for Diamond Pack */}
                                {theme.hasDiamondPattern && (
                                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:16px_16px]" />
                                )}

                                <div>
                                    {/* Profile Section */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                            {/* Profile Avatar */}
                                            <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md shrink-0 ring-3 ${theme.profileRing} transition-all duration-300`}>
                                                {partner.profileImage ? (
                                                    <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                                        <User size={28} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Partner Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-1.5 tracking-tight group-hover:text-blue-600 transition-colors">
                                                    <span className="truncate">{partner.name}</span>
                                                    <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 fill-blue-50 shrink-0 inline-block" />
                                                </h3>

                                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                    <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${theme.badgeStyle} tracking-wider shadow-2xs`}>
                                                        {theme.badgeLabel}
                                                    </span>
                                                    {(partner.address?.city || partner.address?.locality) && (
                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 truncate">
                                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="truncate">{partner.address.locality || partner.address.city}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Top Right Rating Badge */}
                                        <div className="shrink-0">
                                            <div className="inline-flex items-center gap-1 bg-amber-50/95 backdrop-blur-md text-amber-950 font-black text-xs px-2.5 py-1 rounded-full border border-amber-200/80 shadow-xs">
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                                <span>{partner.rating || '4.9'}</span>
                                                <span className="text-slate-400 font-medium text-[10px]">({partner.reviewsCount || 120})</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description / Quote Card */}
                                    <div className={`mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-2xl border ${theme.quoteBg} flex items-start gap-2.5 transition-colors duration-300`}>
                                        <Quote className={`w-4 h-4 ${theme.quoteIconColor} shrink-0 mt-0.5 rotate-180`} />
                                        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed italic">
                                            "{partner.tagline || 'Professional guidance for verified plots & premium properties across prime city zones.'}"
                                        </p>
                                    </div>
                                </div>

                                {/* Bottom Section: Experience + Listings + Explore Profile Button */}
                                <div className="mt-5 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                    {/* Stats */}
                                    <div className="flex items-center gap-4 sm:gap-5 justify-between sm:justify-start">
                                        {/* Experience */}
                                        <div className="flex flex-col items-start">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">Experience</span>
                                            <span className="text-slate-900 font-black text-xs sm:text-sm mt-0.5">{partner.experienceYears || '10'}+ Years</span>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-7 w-[1px] bg-slate-200/80" />

                                        {/* Active Listings */}
                                        <div className="flex flex-col items-start">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">Listings</span>
                                            <span className="text-slate-900 font-black text-xs sm:text-sm mt-0.5">{partner.totalListings || '24'} Properties</span>
                                        </div>
                                    </div>

                                    {/* Explore Profile Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `#/partners/${partner._id}`;
                                        }}
                                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r ${theme.buttonGradient} text-white font-extrabold text-xs shadow-md transition-all duration-300 active:scale-95 group/btn shrink-0 w-full sm:w-auto`}
                                    >
                                        <span className="whitespace-nowrap">Explore Profile</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform shrink-0" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>


            {/* =========================================================
                SECTION 2: 📰 NEWS & UPDATES
            ========================================================= */}
            <section className="w-full border-t border-slate-100 pt-16 md:pt-20">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10 md:mb-14">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold tracking-wide uppercase mb-3 border border-indigo-200/60 shadow-xs">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                            Market Intelligence
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                            News & Property Updates
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
                            Stay ahead of real estate dynamics with our curated insider reports, investment strategies, and emerging corridor developments.
                        </p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '#/news'} 
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-900 font-bold text-sm sm:text-base hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-[0.98] transition-all shadow-xs shrink-0 group"
                    >
                        <span>View All Articles</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-5 md:gap-8 pb-4 md:pb-0 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {newsArticles.map((item) => (
                        <motion.article
                            key={item.id}
                            whileHover={{ y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="group w-[85vw] max-w-[340px] sm:max-w-[380px] md:w-auto md:max-w-none shrink-0 md:shrink snap-start bg-white rounded-3xl border border-slate-100/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_54px_-12px_rgba(15,23,42,0.12)] overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300"
                        >
                            <div>
                                {/* Thumbnail Container */}
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                    <img 
                                        src={item.image} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />
                                    
                                    <span className="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 text-xs font-black tracking-wide shadow-md border border-white/40">
                                        {item.category}
                                    </span>

                                    <span className="absolute bottom-4 right-4 text-white font-bold text-xs bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                                        {item.readTime}
                                    </span>
                                </div>

                                {/* Content Body */}
                                <div className="p-6 sm:p-7">
                                    <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 mb-3 uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{item.date}</span>
                                    </div>

                                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug tracking-tight line-clamp-2">
                                        {item.title}
                                    </h3>

                                    <p className="mt-3 text-sm font-medium text-slate-600 leading-relaxed line-clamp-3">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-2 flex items-center justify-between font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                <span className="underline decoration-slate-200 group-hover:decoration-blue-500 underline-offset-4 transition-all">Read Full Report</span>
                                <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-all shadow-xs">
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </section>


            {/* =========================================================
                SECTION 3: 📱 DOWNLOAD OUR APP
            ========================================================= */}
            <section className="w-full pt-4 pb-6">
                <div className="relative rounded-3xl sm:rounded-[36px] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 md:p-12 lg:p-14 overflow-hidden shadow-2xl border border-slate-800/80">
                    
                    {/* Subtle Glow Mesh */}
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
                        
                        {/* Left Compact Content */}
                        <div className="max-w-2xl space-y-4 sm:space-y-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[11px] sm:text-xs tracking-wider uppercase border border-blue-400/20">
                                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                                HomeZoo On The Go
                            </div>

                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight sm:leading-snug">
                                Buy, sell & track <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-300">premium plots</span> anytime from your smartphone.
                            </h2>

                            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed max-w-xl">
                                Receive instant alerts for RERA plot launches, verified price drops, and chat directly with verified land advisors without spam.
                            </p>

                            {/* Compact Side-by-Side Store Buttons */}
                            <div className="pt-2 grid grid-cols-2 sm:flex items-center gap-3 sm:gap-4 max-w-sm sm:max-w-none">
                                <a 
                                    href="https://play.google.com" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-center sm:justify-start gap-2.5 bg-white text-slate-950 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold shadow-lg hover:bg-slate-100 active:scale-[0.98] transition-all"
                                >
                                    <Download className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                                    <div className="text-left leading-none">
                                        <p className="text-[9px] font-extrabold uppercase text-slate-500">GET IT ON</p>
                                        <p className="text-xs sm:text-sm font-black mt-0.5">Google Play</p>
                                    </div>
                                </a>

                                <a 
                                    href="https://apple.com/app-store" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-center sm:justify-start gap-2.5 bg-slate-800 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold shadow-lg hover:bg-slate-700/80 active:scale-[0.98] transition-all border border-slate-700/80"
                                >
                                    <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
                                    <div className="text-left leading-none">
                                        <p className="text-[9px] font-extrabold uppercase text-slate-400">DOWNLOAD ON THE</p>
                                        <p className="text-xs sm:text-sm font-black mt-0.5">App Store</p>
                                    </div>
                                </a>
                            </div>
                        </div>

                        {/* Right Desktop/Tablet QR Scanner - Hidden on mobile screens to save space and avoid redundancy */}
                        <div className="hidden lg:flex items-center gap-5 bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-inner shrink-0">
                            <div className="w-28 h-28 bg-white rounded-xl p-2 flex items-center justify-center border border-slate-100 shadow-md">
                                <div className="w-full h-full border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-1.5 text-slate-800 bg-slate-50">
                                    <QrCode className="w-12 h-12 text-slate-900 stroke-[1.5]" />
                                    <span className="text-[9px] font-black text-blue-600 tracking-tighter mt-1">FREE SCANNER</span>
                                </div>
                            </div>
                            <div className="max-w-[170px]">
                                <h4 className="font-extrabold text-white text-sm tracking-tight">Scan to install app</h4>
                                <p className="text-[11px] text-slate-300 font-medium mt-1 leading-normal">
                                    Point your phone camera here to get the official HomeZoo app instantly.
                                </p>
                                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">iOS & Android</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

        </div>
    );
};

export default HomeBottomSections;
