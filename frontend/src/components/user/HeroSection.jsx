import React, { useState, useEffect } from 'react';
import { Search, Menu, Bell, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/rokologin-removebg-preview.png';
import MobileMenu from '../../components/ui/MobileMenu';
import { useNavigate } from 'react-router-dom';
import walletService from '../../services/walletService';

const HeroSection = ({ theme, selectedType }) => {
    const accentColor = theme?.accent || '#10B981';
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isSticky, setIsSticky] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchRef = React.useRef(null);

    const categoryContent = {
        'All': "Find your space — PG/Co-Living, Rent, Buy & Plots. Your home, your way.",
        'PG/Co-Living': "Scholar & Professional Stays. Premium PGs and Co-living spaces designed for comfort.",
        'Rent': "Premium Homes for Rent. Find your ideal match from chic apartments to spacious villas.",
        'Buy': "Invest in your Future. Discover exclusive properties and luxury estates for sale.",
        'Plot': "Premium Plots in Prime Locations. Build your vision on the perfect foundation."
    };

    const displayContent = categoryContent[selectedType?.label] || categoryContent['All'];

    const placeholders = [
        "Search in Bucharest...",
        "Find luxury hotels...",
        "Book villas in Bali...",
        "Couple friendly stays...",
        "Search near Red Square..."
    ];

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user) {
                    const walletData = await walletService.getWallet();
                    if (walletData.success && walletData.wallet) {
                        setWalletBalance(walletData.wallet.balance);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch wallet', error);
            }
        };
        fetchWallet();
    }, []);

    // Placeholder Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [placeholders.length]);

    // Scroll Listener for Sticky & Header Logic
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsSticky(scrollY > 120);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Click outside listener for search suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchClick = () => {
        navigate('/search');
    };

    return (
        <motion.section
            className={`relative w-full px-5 pt-4 pb-4 flex flex-col gap-4 md:gap-3 md:pt-8 md:pb-4 bg-transparent transition-all duration-300`}
        >
            {/* 1. Header Row (Hides on Scroll) */}
            <div className={`flex md:hidden items-center justify-between relative h-16 transition-all duration-300 ${isSticky ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 mb-0'}`}>
                {/* Menu Button */}
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2.5 rounded-xl bg-emerald-100/20 hover:bg-emerald-100/35 backdrop-blur-md transition-all duration-300 border border-emerald-100/30 shadow-lg shadow-emerald-900/10 active:scale-90"
                >
                    <Menu size={18} className="text-emerald-50" />
                </button>

                {/* Logo */}
                <div className="flex flex-col items-start leading-none ml-3">
                    <span className="text-2xl font-black tracking-tight text-white flex items-center gap-0 drop-shadow-md">
                        HOOM<span style={{ color: accentColor }} className="drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">ZO</span>
                    </span>
                    <motion.div
                        className="h-[3px] w-8 rounded-full"
                        style={{ backgroundColor: accentColor }}
                        animate={{ width: [32, 24, 32] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                <div className="flex-1" />

                {/* Wallet Balance Display */}
                <button
                    onClick={() => navigate('/wallet')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-400/20 to-emerald-500/10 backdrop-blur-md border border-emerald-300/25 shadow-lg shadow-emerald-900/10 active:scale-95 transition-all duration-300 hover:from-emerald-400/30 hover:to-emerald-500/20"
                >
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-300 to-emerald-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/30">
                        <Wallet size={12} className="text-white" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[8px] font-bold text-amber-200/80 uppercase tracking-wider">Wallet</span>
                        <span className="text-[11px] font-extrabold text-white">
                            {new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(walletBalance)}
                        </span>
                    </div>
                </button>
            </div>

            {/* Tagline - project related (hidden on mobile) */}
            <div className="hidden md:flex flex-col items-center text-center text-white/95 text-sm md:text-lg font-medium drop-shadow-md px-2 max-w-3xl mx-auto mt-4 mb-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={displayContent}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center"
                    >
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            {selectedType?.label === 'Plot' ? "Premium Plots in Prime Locations." : displayContent.split('.')[0] + '.'}
                        </h1>
                        <p className="text-base md:text-lg font-medium opacity-90">
                            {selectedType?.label === 'Plot' ? "Build your vision on the perfect foundation." : displayContent.split('.').slice(1).join('.')}
                        </p>
                        <div className="w-12 h-1 mt-4 rounded-full" style={{ backgroundColor: accentColor }} />
                    </motion.div>
                </AnimatePresence>
            </div>            {/* 2. Search Bar - Sticky Logic with smooth animation */}
            <motion.div
                layout
                className={`
                    w-full z-50
                    relative mt-2 md:mt-4
                `}
            >
                <motion.div
                    layout
                    ref={searchRef}
                    onClick={() => setIsSearchFocused(true)}
                    className={`
                        w-full mx-auto max-w-4xl
                        h-14 md:h-16 ${isSearchFocused ? 'rounded-t-2xl' : 'rounded-full'} shadow-2xl shadow-black/20 border border-white/20 bg-white/95 backdrop-blur-xl

                        flex items-center 
                        pr-2 pl-2 md:pl-4
                        gap-2 md:gap-3
                        relative
                        overflow-visible
                        cursor-pointer
                        transition-all duration-300
                    `}
                >
                    {/* Location Dropdown (Desktop only) */}
                    <div className="hidden md:flex items-center gap-2 pr-4 border-r border-gray-200 h-2/3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span className="font-semibold text-gray-800 text-sm">Indore</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    <div className="pl-2 md:pl-0 flex items-center h-full">
                        <Search size={20} style={{ color: accentColor }} className="z-10" />
                    </div>

                    <div className="flex-1 h-full flex items-center bg-transparent outline-none font-medium z-20 relative text-sm md:text-base text-gray-700">
                        {/* Input simulated via div/text */}
                    </div>

                    <div className="absolute left-10 md:left-40 right-28 h-full flex items-center pointer-events-none z-0">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={placeholderIndex}
                                initial={{ y: 15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -15, opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="text-gray-400 font-normal text-sm md:text-base absolute w-full truncate"
                            >
                                {selectedType?.label === 'Plot' ? "Search by locality, landmark, project or builder..." : placeholders[placeholderIndex]}
                            </motion.span>
                        </AnimatePresence>
                    </div>

                    {/* Search Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSearchClick();
                        }}
                        className="hidden md:flex px-8 py-2.5 rounded-full text-white font-bold transition-transform active:scale-95 shadow-md z-10"
                        style={{ backgroundColor: accentColor }}
                    >
                        Search
                    </button>

                    {/* Filter Icon for Mobile */}
                    <button 
                        className="md:hidden p-2 rounded-full bg-gray-50/50 hover:bg-gray-100 transition-colors z-10 mr-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSearchClick();
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6"></line>
                            <line x1="4" y1="12" x2="20" y2="12"></line>
                            <line x1="4" y1="18" x2="12" y2="18"></line>
                        </svg>
                    </button>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                        {isSearchFocused && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full left-0 right-0 bg-white border-x border-b border-gray-100 rounded-b-2xl shadow-2xl z-50 overflow-hidden"
                            >
                                <div className="p-2 md:p-4 bg-white max-h-[60vh] overflow-y-auto no-scrollbar">
                                    <h4 className="text-xs md:text-sm font-semibold text-gray-500 mb-2 px-2 md:px-4 pt-2">Popular locations:</h4>
                                    <div className="flex flex-col">
                                        {[
                                            "Delhi", "Mumbai", "Bhopal", "Indore",
                                            "Mayakhedi", "Rau", "Sanwer", "Bhicholi Mardana",
                                            "Bhawrasla", "Manglia", "Super Corridor", "Talawali Chanda"
                                        ].map((loc, idx) => (
                                            <div key={idx} 
                                                 className="flex items-center gap-4 p-3 md:px-4 hover:bg-indigo-50/50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 rounded-xl"
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     navigate(`/search?locality=${loc}`);
                                                     setIsSearchFocused(false);
                                                 }}
                                            >
                                                <div className="text-gray-400">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-800 text-sm md:text-base">{loc}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Locality</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>

            {/* Placeholder Spacer only when sticky to prevent content jump */}


            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </motion.section>
    );
};

export default HeroSection;
