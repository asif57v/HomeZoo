import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Wallet, Heart, Gift, HelpCircle, FileText, Shield, ChevronRight, LogOut, Settings, BookOpen, Building, Briefcase, Bell, Edit3, Video } from 'lucide-react';
import logo from '../../assets/rokologin-removebg-preview.png';
import { userService, authService } from '../../services/apiService';
import { detectPlatform } from '../../utils/firebase';

import { useNavigate } from 'react-router-dom';

const MobileMenu = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    const user = React.useMemo(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) return null;
        try {
            return JSON.parse(savedUser);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }, []);

    useEffect(() => {
        // Fetch unread count whenever menu opens
        if (isOpen && user) {
            const fetchUnread = async () => {
                try {
                    const data = await userService.getNotifications(1, 1);
                    if (data.success && data.meta) {
                        setUnreadCount(data.meta.unreadCount);
                    }
                } catch (error) {
                    console.error('Error fetching unread count', error);
                }
            };
            fetchUnread();
        }
    }, [isOpen, user]);

    // Disable body scroll and pause Lenis smooth scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
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
    }, [isOpen]);

    // Grouped Menu Items
    const bookingItems = [
        { icon: BookOpen, label: 'My Bookings', path: '/bookings' },
        { icon: Video, label: 'Reels', path: '/reels' },
        { icon: Heart, label: 'Saved Places', path: '/saved-places' },
        { icon: Wallet, label: 'View Wallet', path: '/wallet' },
    ];

    const growthItems = [
        { icon: Gift, label: 'Refer & Earn', path: '/refer' },
    ];

    const settingItems = [
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount > 0 ? unreadCount : null },
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: HelpCircle, label: 'Need Help?', path: '/support' },
    ];

    const legalItems = [
        { icon: Shield, label: 'Privacy Policy', path: '/legal' },
        { icon: FileText, label: 'Terms & Conditions', path: '/legal' },
    ];

    const handleNavigation = (path) => {
        if (path) {
            navigate(path);
            onClose();
        }
    };

    const MenuItem = ({ icon: Icon, label, path, badge }) => (
        <button
            onClick={() => handleNavigation(path)}
            className="flex items-center gap-4 w-full p-2.5 hover:bg-gray-50 rounded-xl transition-all group active:scale-95"
        >
            <div className="w-8 h-8 rounded-full bg-surface/5 flex items-center justify-center group-hover:bg-surface/10 transition-colors">
                <Icon size={16} className="text-surface" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-700 text-sm">{label}</span>

            {badge && (
                <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-2">
                    {badge}
                </div>
            )}

            <ChevronRight size={14} className="text-gray-300 group-hover:text-surface transition-colors" />
        </button>
    );

    const handleLogout = async () => {
        await authService.logout(detectPlatform());
        onClose();
        navigate('/login');
    };

    const handleEditProfile = () => {
        navigate('/profile/edit');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] md:hidden"
                        style={{ pointerEvents: 'auto' }}
                    />

                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', ease: 'circOut', duration: 0.35 }}
                        className="fixed top-0 left-0 h-[100dvh] w-[85%] max-w-[310px] bg-white z-[101] flex flex-col md:hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header (Pinned at Top) */}
                        <div className="flex items-center justify-between p-4 px-5 pb-3 shrink-0 border-b border-gray-100 bg-white">
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-xl font-black tracking-tight text-[#111827] flex items-center gap-0.5">
                                    HOOM<span className="text-emerald-600">ZO</span>
                                </span>
                                <div className="h-0.5 w-6 bg-emerald-500 rounded-full mt-0.5"></div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition border border-gray-100" aria-label="Close">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div 
                            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
                            data-lenis-prevent="true"
                            data-lenis-prevent-touch="true"
                            style={{ 
                                WebkitOverflowScrolling: 'touch',
                                touchAction: 'pan-y'
                            }}
                        >
                            {/* Profile Card */}
                            <div>
                                {user ? (
                                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-3.5 text-white shadow-md shadow-emerald-900/15 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm shrink-0">
                                                    <User size={20} className="text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm sm:text-base leading-tight truncate">{user.name}</h3>
                                                    <p className="text-[11px] text-white/80 mt-0.5 truncate">{user.phone}</p>
                                                </div>
                                            </div>
                                            <button onClick={handleEditProfile} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm shrink-0 ml-2" aria-label="Edit Profile">
                                                <Edit3 size={14} className="text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-surface rounded-2xl p-4 text-white shadow-md shadow-surface/15 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20 shrink-0">
                                                <User size={18} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm leading-tight">Guest User</h3>
                                                <p className="text-[10px] text-white/70">Sign in for full experience</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => handleNavigation('/login')} className="flex-1 py-1.5 bg-white text-surface text-xs font-bold rounded-lg shadow-xs hover:bg-gray-50 transition-colors">Login</button>
                                            <button onClick={() => handleNavigation('/signup')} className="flex-1 py-1.5 bg-white/10 text-white border border-white/20 text-xs font-bold rounded-lg hover:bg-white/20 transition-colors">Signup</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Menu Sections */}
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-2">Travel & Stays</h4>
                                <div className="flex flex-col gap-0.5">{bookingItems.map((item, idx) => <MenuItem key={idx} {...item} />)}</div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-2">Grow with HOOMZO</h4>
                                <div className="flex flex-col gap-0.5">{growthItems.map((item, idx) => <MenuItem key={idx} {...item} />)}</div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-2">App Settings</h4>
                                <div className="flex flex-col gap-0.5">{settingItems.map((item, idx) => <MenuItem key={idx} {...item} />)}</div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 pb-16">
                                {legalItems.map((item, idx) => (
                                    <button key={idx} onClick={() => handleNavigation(item.path)} className="flex items-center gap-3 w-full p-2 hover:text-surface transition-colors">
                                        <span className="text-xs font-medium text-gray-400 hover:text-surface">{item.label}</span>
                                    </button>
                                ))}
                                {user && (
                                    <button onClick={handleLogout} className="mt-3 flex items-center gap-2 text-red-500 font-bold text-xs px-2 py-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                        <LogOut size={14} /> Log Out
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileMenu;
