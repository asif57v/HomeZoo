import React from 'react';
import { LayoutDashboard, Briefcase, UserCircle, Crown, Clapperboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const PartnerBottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('dashboard') || path === '/hotel') return 'Dashboard';
    if (path.includes('bookings')) return 'Bookings';
    if (path.includes('subscription')) return 'Subscription';
    if (path.includes('reels') || path.includes('reel')) return 'Reels';
    if (path.includes('profile')) return 'Profile';
    return '';
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/hotel/dashboard' },
    { name: 'Bookings', icon: Briefcase, route: '/hotel/bookings' },
    { name: 'Subscription', icon: Crown, route: '/hotel/subscriptions', isCenter: true },
    { name: 'Reels', icon: Clapperboard, route: '/reels' },
    { name: 'Profile', icon: UserCircle, route: '/hotel/profile' },
  ];

  const handleNavClick = (item) => {
    navigate(item.route);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] print:hidden pb-safe">
      <div className="
        bg-white/95 backdrop-blur-md 
        rounded-t-[28px] 
        shadow-[0_-8px_30px_rgba(0,0,0,0.08)] 
        border-t border-gray-100/80 
        px-2 h-[68px] 
        grid grid-cols-5 items-center 
        relative
      ">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = getActiveTab() === item.name;

          if (item.isCenter) {
            return (
              <div key={item.name} className="relative flex justify-center items-center h-full">
                <button
                  onClick={() => handleNavClick(item)}
                  className={`
                    absolute -top-4 w-14 h-14 bg-[#003836] hover:bg-[#002624] 
                    rounded-full flex items-center justify-center 
                    shadow-lg shadow-[#003836]/30 transition-transform active:scale-95 
                    border-[3px] border-white
                    ${isActive ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
                  `}
                  aria-label="Subscription"
                >
                  <Crown className="w-7 h-7 text-[#f59e0b]" strokeWidth={2.4} />
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item)}
              className="relative flex flex-col items-center justify-center h-full gap-1 p-1"
            >
              {isActive && (
                <motion.div
                  layoutId="partner-active-pill"
                  className="absolute inset-x-2 inset-y-1.5 bg-[#003836]/10 rounded-xl -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <Icon
                size={22}
                className={`transition-colors duration-200 ${isActive ? 'text-[#003836] fill-[#003836]/10' : 'text-gray-400'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${isActive ? 'text-[#003836]' : 'text-gray-400'}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PartnerBottomNavbar;

