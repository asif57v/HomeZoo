import React from 'react';
import { Home, Calendar, Plus, User, Clapperboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { name: 'Home', icon: Home, route: '/' },
        { name: 'Reels', icon: Clapperboard, route: '/reels' },
        { name: 'Post', icon: Plus, route: '/hotel/login', isCenter: true },
        { name: 'Bookings', icon: Calendar, route: '/bookings' },
        { name: 'Profile', icon: User, route: '/profile/edit' },
    ];

    const getActiveTab = (path) => {
        if (path.includes('reels')) return 'Reels';
        if (path.includes('hotel') || path.includes('post')) return 'Post';
        if (path.includes('bookings') || path.includes('checkout')) return 'Bookings';
        if (path.includes('profile') || path.includes('account')) return 'Profile';
        return 'Home';
    };

    const activeTab = getActiveTab(location.pathname);

    const handleNavClick = (item) => {
        navigate(item.route);
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] print:hidden pb-safe">
            <div className="bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-gray-100/80 px-2 h-[68px] grid grid-cols-5 items-center relative">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;

                    if (item.isCenter) {
                        return (
                            <div key={item.name} className="relative flex justify-center items-center h-full">
                                <button
                                    onClick={() => handleNavClick(item)}
                                    className="absolute -top-3 w-14 h-14 bg-[#0b1329] hover:bg-[#070d1e] rounded-full flex items-center justify-center shadow-lg shadow-slate-900/30 transition-transform active:scale-95 border-[3px] border-white"
                                    aria-label="Add Post"
                                >
                                    <Plus className="w-7 h-7 text-[#f59e0b]" strokeWidth={2.5} />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavClick(item)}
                            className="flex flex-col items-center justify-center h-full gap-1 transition-colors duration-200"
                        >
                            <Icon
                                size={22}
                                className={`transition-colors duration-200 ${isActive ? 'text-[#1a56db]' : 'text-[#8e95a5]'}`}
                                strokeWidth={isActive ? 2.2 : 1.8}
                            />
                            <span className={`text-[11px] font-semibold tracking-tight transition-colors duration-200 ${isActive ? 'text-[#1a56db]' : 'text-[#8e95a5]'}`}>
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNavbar;
