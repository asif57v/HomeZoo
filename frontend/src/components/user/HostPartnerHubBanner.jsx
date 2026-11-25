import React from 'react';
import { Building, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleNavigateToAddProperty } from '../../utils/subscriptionGuard';
import { requireLogin } from '../../utils/authGate';

const HostPartnerHubBanner = ({ className = '' }) => {
  const navigate = useNavigate();

  const handlePostClick = () => {
    if (!requireLogin(navigate, 'Please login to post your property', '/hotel/join')) return;
    handleNavigateToAddProperty(navigate);
  };

  const handleDashboardClick = (e) => {
    e.stopPropagation();
    if (!requireLogin(navigate, 'Please login to continue', '/hotel/partner-dashboard')) return;
    navigate('/hotel/partner-dashboard');
  };

  return (
    <div
      onClick={handlePostClick}
      className={`group relative overflow-hidden rounded-[28px] p-5 sm:p-6 md:p-7 text-white transition-all duration-300 cursor-pointer hover:-translate-y-0.5 ${className}`}
      style={{
        // Gradient outline (sky -> indigo -> violet) over the dark card + soft blue glow
        border: '2px solid transparent',
        background: 'linear-gradient(90deg, #020617, #0B132B, #0f172a) padding-box, linear-gradient(135deg, #38BDF8 0%, #6366F1 50%, #A78BFA 100%) border-box',
        boxShadow: '0 10px 28px rgba(56, 189, 248, 0.22)'
      }}
    >
      {/* Background Glow Accents */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none group-hover:bg-sky-500/15 transition-all" />
      <div className="absolute left-1/4 -bottom-16 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-black uppercase tracking-[0.18em] text-sky-300 mb-1.5">
            <Building size={14} className="text-sky-300 shrink-0" />
            <span>HOST / PARTNER HUB</span>
          </div>

          <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Post & Manage Properties</span>
            <ArrowRight size={18} className="text-sky-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 hidden sm:inline-block" />
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
            View enquiries, bookings, listings & analytics
          </p>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 pt-1 md:pt-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePostClick();
            }}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-full border border-white/20 shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus size={15} className="text-sky-300" strokeWidth={3} />
            <span>Post Property</span>
          </button>

          <button
            type="button"
            onClick={handleDashboardClick}
            className="px-6 py-2.5 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 active:scale-95 text-white font-black text-xs sm:text-sm rounded-full shadow-lg shadow-sky-500/30 transition-all flex items-center gap-1.5"
          >
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostPartnerHubBanner;

