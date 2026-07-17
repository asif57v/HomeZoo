import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from '../../components/user/HeroSection';
import ExclusiveOffers from '../../components/user/ExclusiveOffers';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import PropertyFeed from '../../components/user/PropertyFeed';
import CollectionSection from '../../components/user/CollectionSection';
import ReelSection from '../../components/user/ReelSection';
import LatestProjectsBanner from '../../components/user/LatestProjectsBanner';
import RecommendedSellers from '../../components/user/RecommendedSellers';
import { categoryService } from '../../services/categoryService';

// Category Theme Map - Professional palettes inspired by Housing.com
const THEME_MAP = {
    Hotel: {
        darkBg: 'linear-gradient(135deg, #002240 0%, #005CA8 100%)', // Brand Blue
        pageBg: '#F8FAFC',
        accent: '#005CA8',
        cornerImage: '/pg_hero_art.png',
        cornerImage2: '/pg_hero_art_2.png'
    },
    'PG/Co-Living': {
        darkBg: 'linear-gradient(135deg, #881337 0%, #9F1239 100%)', // Rose
        pageBg: '#FFF1F2',
        accent: '#E11D48',
        cornerImage: '/pg_hero_art.png',
        cornerImage2: '/pg_hero_art_2.png'
    },
    Rent: {
        darkBg: 'linear-gradient(135deg, #4C1D95 0%, #5B21B6 100%)', // Violet
        pageBg: '#F5F3FF',
        accent: '#8B5CF6',
        cornerImage: '/rent_hero_art.png',
        cornerImage2: '/rent_hero_art_2.png'
    },
    Buy: {
        darkBg: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', // Blue
        pageBg: '#EFF6FF',
        accent: '#3B82F6',
        cornerImage: '/buy_hero_art.png',
        cornerImage2: '/buy_hero_art_2.png'
    },
    Plot: {
        darkBg: 'linear-gradient(135deg, #A84900 0%, #D97706 100%)', // Base gradient
        bgImage: '/plot_hero_bg.png', // Image layer
        cornerImage: '/plot_hero_art.png',
        cornerImage2: '/plot_hero_art_2.png',
        pageBg: '#FFFBEB',
        accent: '#F59E0B'
    },
    default: {
        darkBg: 'linear-gradient(135deg, #002240 0%, #005CA8 100%)', // Brand Blue
        pageBg: '#F8FAFC',
        accent: '#005CA8',
        cornerImage: '/buy_hero_art.png',
        cornerImage2: '/buy_hero_art_2.png'
    }
};

const Home = () => {
    const [selectedType, setSelectedType] = useState({ id: null, label: 'All' });
    const [pgFilters, setPgFilters] = useState({ gender: undefined, occupancy: undefined, foodIncluded: undefined });
    const [sectionIds, setSectionIds] = useState({ pg: null, rent: null, buy: null, plot: null });
    const [categoriesData, setCategoriesData] = useState([]);

    // Fetch Category IDs for the homepage sections
    useEffect(() => {
        const fetchIds = async () => {
            try {
                const categories = await categoryService.getActiveCategories();
                setCategoriesData(categories);
                const findCategoryIds = (names) => {
                    const searchNames = Array.isArray(names) ? names : [names];
                    const found = categories.filter(c =>
                        searchNames.some(n =>
                            (c.displayName || '').toLowerCase() === n.toLowerCase() ||
                            (c.name || '').toLowerCase() === n.toLowerCase()
                        )
                    );
                    return found.map(c => c._id).length > 0 ? found.map(c => c._id).join(',') : null;
                };

                setSectionIds({
                    pg: findCategoryIds(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig']),
                    rent: findCategoryIds('Rent'),
                    buy: findCategoryIds('Buy'),
                    plot: findCategoryIds(['Plot', 'Plots'])
                });
            } catch (err) {
                console.error("Failed to fetch section IDs", err);
            }
        };
        fetchIds();
    }, []);

    const activeTheme = useMemo(() => {
        if (!selectedType.label || selectedType.label === 'All' || !selectedType.id) return THEME_MAP.default;
        const baseTheme = THEME_MAP[selectedType.label] || THEME_MAP.default;
        
        // Handle case where selectedType.id might be multiple comma-separated IDs
        const selectedIds = String(selectedType.id).split(',');
        const selectedCategoryData = categoriesData.find(c => selectedIds.includes(String(c._id)));
        
        return {
            ...baseTheme,
            bgImage: selectedCategoryData?.bgImage || baseTheme.bgImage,
            cornerImage: baseTheme.cornerImage,
            cornerImage2: baseTheme.cornerImage2
        };
    }, [selectedType, categoriesData]);

    const handleTypeSelect = (id, label) => {
        setSelectedType({ id, label });
        // Reset PG filters when switching tabs
        setPgFilters({ gender: undefined, occupancy: undefined, foodIncluded: undefined });
    };

    const pageBg = activeTheme.pageBg || '#f8fafc';

    // Section Component
    const HomeSection = ({ title, typeId, subtitle }) => (
        <div className="py-4 border-b border-gray-100 last:border-0 relative">
            <div className="flex justify-between items-end px-5 md:px-0 mb-2">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <button
                    onClick={() => {
                        const labelMap = {
                            [sectionIds.pg]: 'PG/Co-Living',
                            [sectionIds.rent]: 'Rent',
                            [sectionIds.buy]: 'Buy',
                            [sectionIds.plot]: 'Plot'
                        };
                        handleTypeSelect(typeId, labelMap[typeId] || 'All');
                        // Scroll to top or handle navigation if needed, 
                        // dependent on standard behavior (here state update triggers re-render to grid view)
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                    View All
                </button>
            </div>
            <PropertyFeed selectedType={typeId} viewMode="carousel" limit={8} />
        </div>
    );

    return (
        <main className="min-h-screen pb-24 transition-colors duration-700" style={{ backgroundColor: pageBg }}>
            {/* Hero: dark background only (no images), changes per category */}
            <div className="relative overflow-visible min-h-[280px] md:min-h-[340px]">
                <motion.div
                    className="absolute inset-0 w-full h-full rounded-b-[3rem] md:rounded-b-none overflow-hidden"
                    animate={{ background: activeTheme.darkBg || THEME_MAP.default.darkBg }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
                
                {/* Image Layer for specific themes like Plot */}
                <motion.div
                    className="absolute inset-0 w-full h-full bg-no-repeat z-0 rounded-b-[3rem] md:rounded-b-none overflow-hidden"
                    style={{ 
                        backgroundPosition: 'center bottom', 
                        backgroundSize: 'cover',
                        backgroundImage: activeTheme.bgImage ? `url(${activeTheme.bgImage})` : 'none'
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: activeTheme.bgImage ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                />

                {/* Floating Corner Images */}
                <AnimatePresence mode="wait">
                    {activeTheme.cornerImage && (
                        <motion.div
                            key={activeTheme.cornerImage}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="absolute inset-0 pointer-events-none flex justify-between items-center overflow-hidden z-10 rounded-b-[3rem] md:rounded-b-none"
                        >
                            {/* Left Corner */}
                            <img 
                                src={activeTheme.cornerImage} 
                                alt="" 
                                className="w-[300px] md:w-[450px] object-cover opacity-100 -ml-16 md:-ml-24 transform -translate-y-8"
                                style={{ 
                                    WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
                                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)'
                                }} 
                            />
                            {/* Right Corner (Distinct Image, no mirroring) */}
                            <img 
                                src={activeTheme.cornerImage2} 
                                alt="" 
                                className="w-[300px] md:w-[450px] object-cover opacity-100 -mr-16 md:-mr-24 transform -translate-y-8"
                                style={{ 
                                    WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
                                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)'
                                }} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content on top */}
                <div className="relative z-40 flex flex-col min-h-[280px] md:min-h-[340px]">
                    <HeroSection theme={activeTheme} selectedType={selectedType} />

                    {/* Small gap between search bar and category (mobile); minimal on desktop */}
                    <div className="pt-0 flex-shrink-0 md:pt-1 md:min-h-0" />

                    {/* Filter Bar at bottom of hero */}
                    <div className="pt-1 pb-4">
                        <PropertyTypeFilter
                            selectedType={selectedType.id}
                            selectedLabel={selectedType.label}
                            onSelectType={handleTypeSelect}
                            theme={activeTheme}
                        />
                    </div>
                </div>
            </div>

            <ExclusiveOffers />

            <div className="mt-2 max-w-7xl mx-auto">
                {(!selectedType.id || selectedType.label === 'All') ? (
                    // Show Categorized Sections when "All" is selected
                    <div className="flex flex-col gap-2">
                        {sectionIds.pg && (
                            <HomeSection
                                title="Scholar & Professional Stays"
                                subtitle="Top rated PGs and Hostels near you"
                                typeId={sectionIds.pg}
                            />
                        )}

                        {/* Recommendation for All view */}
                        <RecommendedSellers />

                        {/* YouTube style Reels Section */}
                        <ReelSection category={selectedType.label} />

                        {sectionIds.rent && (
                            <HomeSection
                                title="Properties for Rent"
                                subtitle="Apartments, Homes, and Villas for Rent"
                                typeId={sectionIds.rent}
                            />
                        )}
                        {sectionIds.buy && (
                            <HomeSection
                                title="Dream Homes for Sale"
                                subtitle="Buy your perfect home today"
                                typeId={sectionIds.buy}
                            />
                        )}
                        {sectionIds.plot && (
                            <HomeSection
                                title="Premium Plots & Land"
                                subtitle="Invest in the best locations"
                                typeId={sectionIds.plot}
                            />
                        )}
                    </div>
                ) : (
                    // Show Filtered Grid when a specific category is selected
                    <div className="flex flex-col gap-1">
                        {/* 1. Latest Projects Banner for the category */}
                        <LatestProjectsBanner
                            categoryId={selectedType.id}
                            categoryName={selectedType.label}
                            theme={activeTheme}
                        />

                        {selectedType.label === 'PG/Co-Living' && (
                            <CollectionSection onFilter={(filters) => setPgFilters(filters)} activeFilters={pgFilters} />
                        )}

                        {/* 2. Reels for specific Category */}
                        <ReelSection category={selectedType.label} />

                        {/* 3. Recommended Sellers for the category */}
                        <RecommendedSellers />

                        {/* 4. Main Property Feed */}
                        <PropertyFeed selectedType={selectedType.id} viewMode="grid" extraFilters={pgFilters} />
                    </div>
                )}
            </div>
        </main>
    );
};

export default Home;
