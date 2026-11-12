import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Globe,
    Menu,
    X,
    Home,
    Search,
    Video,
    Calendar,
    Wallet,
    Share2,
    LogOut,
    FileText,
    HelpCircle,
    Shield,
    ChevronRight,
    ChevronDown,
    Plus,
    Heart,
    LayoutDashboard,
    Building,
    Settings
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../services/apiService';
import { detectPlatform } from '../../utils/firebase';
import { handleNavigateToAddProperty } from '../../utils/subscriptionGuard';

const TopNavbar = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || 'User';
    const isAdmin = Boolean(localStorage.getItem('adminToken') || user.role === 'admin');

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileDropdownRef = useRef(null);

    // Disable body scroll and pause Lenis when sidebar is open
    useEffect(() => {
        if (isSidebarOpen) {
            window.lenis?.stop();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            window.lenis?.start();
        }
        return () => {
            document.body.style.overflow = '';
            window.lenis?.start();
        };
    }, [isSidebarOpen]);

    // Handle outside clicks and Esc key for profile dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsProfileOpen(false);
            }
        };

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isProfileOpen]);

    const handleNavigation = (path) => {
        setIsSidebarOpen(false);
        setIsProfileOpen(false);
        if (path === '/hotel/join') {
            handleNavigateToAddProperty(navigate);
            return;
        }
        navigate(path);
    };

    const navLinks = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Search', path: '/search', icon: Search },
        { name: 'Reels', path: '/reels', icon: Video },
        { name: 'Host Dashboard', path: '/hotel/partner-dashboard', icon: LayoutDashboard },
        { name: 'Add Property', path: '/hotel/join', icon: Plus },
        { name: 'Wishlist', path: '/wishlist', icon: Heart },
        { name: 'Wallet', path: '/wallet', icon: Wallet },
        { name: 'Refer & Earn', path: '/refer', icon: Share2 },
    ];

    const supportLinks = [
        { name: 'Help & Support', path: '/login/support', icon: HelpCircle },
        { name: 'Terms & Conditions', path: '/login/terms', icon: FileText },
        { name: 'Privacy Policy', path: '/login/privacy', icon: Shield },
    ];

    return (
        <>
            <nav className="hidden md:flex w-full h-16 bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 justify-between items-center fixed top-0 z-40">
                {/* Left Side: Hamburger Menu & Logo */}
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-100 flex items-center justify-center text-gray-700 cursor-pointer"
                        aria-label="Open Navigation Menu"
                    >
                        <Menu size={20} />
                    </button>

                    <Link to="/">
                        <div className="flex flex-col items-start leading-tight group">
                            <span className="text-2xl font-black tracking-tighter text-gray-900">
                                HOOM<span className="text-emerald-600">ZO</span>
                            </span>
                            <div className="h-0.5 w-6 bg-emerald-500 rounded-full group-hover:w-full transition-all duration-300"></div>
                        </div>
                    </Link>
                </div>

                {/* Desktop Links */}
                <div className="flex items-center gap-7">
                    <Link to="/" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Home
                    </Link>
                    <Link to="/search" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Search
                    </Link>
                    <Link to="/reels" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Reels
                    </Link>
                    <Link to="/wishlist" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Wishlist
                    </Link>
                    <Link to="/wallet" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Wallet
                    </Link>
                    <Link to="/refer" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Refer & Earn
                    </Link>
                </div>

                {/* Right Side: User Actions & Profile Switcher */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleNavigateToAddProperty(navigate)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-full shadow-sm shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={14} strokeWidth={3} />
                        <span>Post Property</span>
                    </button>

                    <Link
                        to="/saved-places"
                        className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition border border-transparent hover:border-emerald-100"
                        title="Saved Places"
                    >
                        <Globe size={17} className="text-gray-500 hover:text-emerald-600" />
                    </Link>

                    {/* Profile Dropdown with Dashboard Switch */}
                    <div className="relative" ref={profileDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsProfileOpen((prev) => !prev)}
                            aria-expanded={isProfileOpen}
                            className="pl-2 pr-3 py-1 bg-white border border-gray-200/80 rounded-full flex items-center gap-2 hover:border-emerald-300 hover:bg-emerald-50/40 transition group shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-emerald-200 overflow-hidden">
                                {user.profileImage ? (
                                    <img src={user.profileImage} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    userName.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-700 max-w-[90px] truncate">
                                {userName.split(' ')[0]}
                            </span>
                            <ChevronDown
                                size={13}
                                className={`text-gray-400 group-hover:text-emerald-600 transition-transform duration-200 ${
                                    isProfileOpen ? 'rotate-180 text-emerald-600' : ''
                                }`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isProfileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2.5 z-50 overflow-hidden"
                                >
                                    {/* User Info Header */}
                                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-br from-emerald-50/40 to-transparent">
                                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-200 overflow-hidden shrink-0">
                                            {user.profileImage ? (
                                                <img src={user.profileImage} alt={userName} className="w-full h-full object-cover" />
                                            ) : (
                                                userName.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 truncate leading-tight">{userName}</h4>
                                            <p className="text-[11px] text-gray-400 truncate font-medium mt-0.5">
                                                {user.email || user.phone || 'HoomZo Account'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dashboard Switch Card */}
                                    <div className="p-2.5">
                                        <div className="p-3 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-md border border-indigo-500/20">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                    <Building size={12} className="text-amber-400" />
                                                    Host / Partner Hub
                                                </span>
                                                <span className="text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded">
                                                    Switch Mode
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-200 leading-tight mb-2.5">
                                                Manage listings, view guest enquiries & bookings
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsProfileOpen(false);
                                                    navigate('/hotel/partner-dashboard');
                                                }}
                                                className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            >
                                                <LayoutDashboard size={14} strokeWidth={2.5} />
                                                <span>Switch to Host Dashboard</span>
                                            </button>
                                        </div>

                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsProfileOpen(false);
                                                    navigate('/admin');
                                                }}
                                                className="w-full mt-2 py-2 px-3 bg-purple-50 hover:bg-purple-100/80 active:scale-95 text-purple-700 font-bold text-xs rounded-lg flex items-center justify-between border border-purple-200/60 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Shield size={14} className="text-purple-600" />
                                                    <span>Switch to Admin Panel</span>
                                                </div>
                                                <ChevronRight size={14} className="text-purple-400" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    {/* Navigation Links */}
                                    <div className="px-1.5 py-0.5 space-y-0.5">
                                        <Link
                                            to="/profile/edit"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition"
                                        >
                                            <User size={15} className="text-gray-400" />
                                            <span>Edit Profile</span>
                                        </Link>
                                        <Link
                                            to="/wishlist"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition"
                                        >
                                            <Heart size={15} className="text-gray-400" />
                                            <span>Saved Properties</span>
                                        </Link>
                                        <Link
                                            to="/wallet"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition"
                                        >
                                            <Wallet size={15} className="text-gray-400" />
                                            <span>My Wallet</span>
                                        </Link>
                                        <Link
                                            to="/settings"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition"
                                        >
                                            <Settings size={15} className="text-gray-400" />
                                            <span>App Preferences</span>
                                        </Link>
                                    </div>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    {/* Logout Option */}
                                    <div className="px-1.5 pt-0.5">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setIsProfileOpen(false);
                                                await authService.logout(detectPlatform());
                                                navigate('/login');
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition text-left cursor-pointer"
                                        >
                                            <LogOut size={15} className="text-red-500" />
                                            <span>Log Out</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </nav>

            {/* Sidebar Drawer */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-50 flex hidden md:flex">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
                            className="relative flex h-[100dvh] w-[85%] max-w-[300px] flex-col bg-white shadow-2xl z-[51]"
                        >
                            <div className="flex-1 overflow-y-auto pb-4" data-lenis-prevent="true" data-lenis-prevent-touch="true" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {/* Sidebar Header */}
                                <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-100">
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-xl font-black tracking-tighter text-gray-900">
                                            HOOM<span className="text-emerald-600">ZO</span>
                                        </span>
                                        <div className="h-1 w-6 bg-emerald-600 rounded-full mt-0.5"></div>
                                    </div>
                                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition border border-gray-100 cursor-pointer">
                                        <X size={20} className="text-gray-500" />
                                    </button>
                                </div>

                                {/* Host Dashboard Quick Switch in Sidebar */}
                                <div className="px-4 pt-4 pb-1">
                                    <button
                                        type="button"
                                        onClick={() => handleNavigation('/hotel/partner-dashboard')}
                                        className="w-full py-2.5 px-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-slate-800 hover:to-indigo-900 text-amber-400 font-bold text-xs rounded-xl flex items-center justify-between border border-amber-500/20 shadow-sm transition-all active:scale-95 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <LayoutDashboard size={16} className="text-amber-400" />
                                            <span className="text-white">Host Dashboard</span>
                                        </div>
                                        <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                                            Switch
                                        </span>
                                    </button>
                                </div>

                                {/* Main Navigation */}
                                <div className="px-3 mt-3 space-y-1">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-3">
                                        Main Menu
                                    </h4>
                                    {navLinks.map((link, idx) => {
                                        const Icon = link.icon;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleNavigation(link.path)}
                                                className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-emerald-50 group transition-all cursor-pointer"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                                                    <Icon size={18} className="text-emerald-700" />
                                                </div>
                                                <span className="flex-1 text-left font-bold text-gray-700 text-sm group-hover:text-emerald-800 transition-colors">{link.name}</span>
                                                <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Support Links */}
                                <div className="px-3 mt-6 space-y-1">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-3">
                                        Support & More
                                    </h4>
                                    {supportLinks.map((link, idx) => {
                                        const Icon = link.icon;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleNavigation(link.path)}
                                                className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-gray-50 group transition-all cursor-pointer"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-colors">
                                                    <Icon size={16} className="text-gray-600" />
                                                </div>
                                                <span className="flex-1 text-left font-medium text-gray-600 text-sm group-hover:text-gray-900 transition-colors">{link.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sidebar Footer */}
                            <div className="p-4 border-t border-gray-100">
                                <button onClick={async () => {
                                    await authService.logout(detectPlatform());
                                    handleNavigation('/login');
                                }} className="flex items-center gap-2 text-red-500 font-bold text-xs px-2 hover:opacity-80 transition-opacity cursor-pointer">
                                    <LogOut size={16} /> Log Out
                                </button>
                                <p className="text-[10px] font-medium text-gray-400 mt-3 px-2">
                                    HoomZo Web • v1.0.0
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TopNavbar;
