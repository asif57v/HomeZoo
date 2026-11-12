import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, LogOut, FileText, Shield, Info, Phone, LayoutDashboard, Building, User } from 'lucide-react';
import { authService } from '../../services/apiService';
import { detectPlatform } from '../../utils/firebase';

const SettingsPage = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = Boolean(localStorage.getItem('adminToken') || user.role === 'admin');

    const sections = [
        {
            title: "Switch Mode & Dashboards",
            items: [
                {
                    icon: LayoutDashboard,
                    label: "Host / Partner Dashboard",
                    subtitle: "Manage listings, view guest enquiries & bookings",
                    type: "nav",
                    path: "/hotel/partner-dashboard",
                    badge: "Switch",
                    badgeColor: "bg-amber-500 text-slate-950 font-black",
                    highlight: true
                },
                ...(isAdmin ? [{
                    icon: Shield,
                    label: "Admin Control Dashboard",
                    subtitle: "Access master administration portal",
                    type: "nav",
                    path: "/admin",
                    badge: "Admin",
                    badgeColor: "bg-purple-600 text-white font-black",
                }] : []),
                {
                    icon: User,
                    label: "Edit Profile Details",
                    subtitle: "Personal information, photo & address",
                    type: "nav",
                    path: "/profile/edit"
                }
            ]
        },
        {
            title: "About & Legal",
            items: [
                { icon: Info, label: "About HoomZo", type: "nav", path: "/about" },
                { icon: Phone, label: "Contact Us", type: "nav", path: "/contact" },
                { icon: Shield, label: "Privacy Policy", type: "nav", path: "/login/privacy" },
                { icon: FileText, label: "Terms & Conditions", type: "nav", path: "/login/terms" },
            ]
        },
    ];

    const handleLogout = async () => {
        await authService.logout(detectPlatform());
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-surface text-white p-6 pb-12 rounded-b-[30px] shadow-lg sticky top-0 z-20">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition cursor-pointer">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">Settings</h1>
                </div>
                <h2 className="text-2xl font-black">App Preferences</h2>
            </div>

            <div className="px-5 -mt-6 relative z-10 space-y-6 pb-24 max-w-2xl mx-auto">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-3 ml-2">{section.title}</h3>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            {section.items.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => item.type === 'nav' && item.path && navigate(item.path)}
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/80 transition-colors active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                            item.highlight
                                                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20'
                                                : 'bg-surface/10 text-surface'
                                        }`}>
                                            <item.icon size={19} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-sm font-bold text-gray-800 block truncate leading-tight">{item.label}</span>
                                            {item.subtitle && (
                                                <span className="text-[11px] text-gray-400 font-medium block truncate mt-0.5">
                                                    {item.subtitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {item.badge ? (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className={`${item.badgeColor || 'bg-red-500 text-white'} text-[10px] px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wide`}>
                                                {item.badge}
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 shrink-0">
                                            {item.value && <span className="text-xs text-gray-400 font-medium">{item.value}</span>}
                                            <ChevronRight size={16} className="text-gray-300" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleLogout}
                    className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mt-4 hover:bg-red-100 transition cursor-pointer"
                >
                    <LogOut size={18} />
                    Log Out
                </button>

                <p className="text-center text-xs text-gray-400 mt-4">HoomZo App • Version 1.0.2</p>
            </div>
        </div>
    );
};

export default SettingsPage;
