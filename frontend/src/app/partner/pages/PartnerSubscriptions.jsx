import useFeatureFlagsStore, { RAZORPAY_UNAVAILABLE_MESSAGE } from '../../../store/featureFlagsStore';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle, ShieldCheck, Package, Clock,
    Crown, Zap, Star, Layout, MapPin, AlertCircle, Check,
    CalendarDays, Home, Users, TrendingUp, Sparkles, Award, ArrowRight,
    Flame, PauseCircle, Info, BadgeCheck, Sparkle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import subscriptionService from '../../../services/subscriptionService';

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

/**
 * Bespoke Luxury Themes for Subscription Packs by Ranking Weight:
 * Weight 1: Polished Brushed Titanium & Pure Silver
 * Weight 2: Warm Sunset Bronze & Copper (Gold Basic)
 * Weight 3: 24K Royal Gold & Champagne Amber (Most Popular)
 * Weight 4: Sapphire Blue & Executive Platinum
 * Weight 5: Cosmic Royal Purple & Fuchsia Diamond (Max Boost VIP)
 */
export const getSubscriptionWeightTheme = (plan) => {
    const rawWeight = plan?.rankingWeight;
    const tier = (plan?.tier || '').toLowerCase();
    const name = (plan?.name || '').toLowerCase();

    let weight = rawWeight;
    if (!weight || weight < 1) {
        if (tier === 'diamond' || name.includes('diamond')) weight = 5;
        else if (tier === 'platinum' || name.includes('platinum')) weight = 4;
        else if (tier === 'gold' || (name.includes('gold') && !name.includes('basic'))) weight = 3;
        else if (tier === 'gold_basic' || name.includes('basic') || name.includes('bronze')) weight = 2;
        else weight = 1;
    }

    // Weight 5: Diamond Elite (VIP Max Boost)
    if (weight >= 5 || tier === 'diamond' || name.includes('diamond')) {
        return {
            weight: 5,
            tierKey: 'diamond',
            tierName: 'Diamond Elite',
            tagline: 'Maximum priority & city-level prominence',
            popularBadge: '👑 MAX BOOST • VIP ELITE',
            icon: Zap,
            cardBg: 'bg-gradient-to-b from-purple-50/90 via-fuchsia-50/30 to-white',
            borderColor: 'border-2 border-purple-300 hover:border-purple-400',
            activeRing: 'ring-2 ring-purple-600/70 border-2 border-purple-500 shadow-2xl shadow-purple-500/20',
            cardShadow: 'shadow-[0_10px_35px_-8px_rgba(168,85,247,0.18)] hover:shadow-[0_16px_45px_-8px_rgba(168,85,247,0.28)]',
            topSheen: 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-600',
            headerBg: 'bg-gradient-to-br from-[#1d072b] via-[#2c0e44] to-[#581c87]',
            iconContainer: 'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-violet-700 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-300/70',
            tierPill: 'bg-purple-100/90 text-purple-900 border border-purple-300 font-extrabold',
            rankingTag: 'bg-purple-100 text-purple-900 font-extrabold border border-purple-200',
            weightBarFilled: 'bg-gradient-to-r from-purple-600 to-fuchsia-500 shadow-xs',
            checkBg: 'bg-purple-100 text-purple-900 border border-purple-200/80',
            featureTag: 'bg-purple-100 text-purple-900 border border-purple-200 font-bold',
            chooseButton: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-700 hover:via-fuchsia-700 hover:to-indigo-700 text-white font-black shadow-lg shadow-purple-500/35 active:scale-[0.98]',
            activeButton: 'bg-purple-950 text-purple-100 border-2 border-purple-500/60 font-black shadow-md cursor-default',
            accentTextColor: 'text-purple-700'
        };
    }

    // Weight 4: Platinum Plus
    if (weight === 4 || tier === 'platinum' || name.includes('platinum')) {
        return {
            weight: 4,
            tierKey: 'platinum',
            tierName: 'Platinum Plus',
            tagline: 'High volume growth with city banners',
            popularBadge: '⚡ HIGH IMPACT • 4x BOOST',
            icon: ShieldCheck,
            cardBg: 'bg-gradient-to-b from-sky-50/80 via-blue-50/25 to-white',
            borderColor: 'border-2 border-sky-300 hover:border-sky-400',
            activeRing: 'ring-2 ring-sky-600/70 border-2 border-sky-500 shadow-xl shadow-sky-500/20',
            cardShadow: 'shadow-[0_10px_30px_-8px_rgba(14,165,233,0.15)] hover:shadow-[0_16px_40px_-8px_rgba(14,165,233,0.22)]',
            topSheen: 'bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600',
            headerBg: 'bg-gradient-to-br from-[#031d33] via-[#08335c] to-[#0284c7]',
            iconContainer: 'bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/35 ring-2 ring-sky-200/70',
            tierPill: 'bg-sky-100/90 text-sky-900 border border-sky-300 font-extrabold',
            rankingTag: 'bg-sky-100 text-sky-900 font-extrabold border border-sky-200',
            weightBarFilled: 'bg-gradient-to-r from-cyan-500 to-sky-600 shadow-xs',
            checkBg: 'bg-sky-100 text-sky-800 border border-sky-200/80',
            featureTag: 'bg-sky-100 text-sky-900 border border-sky-200 font-bold',
            chooseButton: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:via-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-sky-500/30 active:scale-[0.98]',
            activeButton: 'bg-slate-900 text-sky-200 border-2 border-sky-500/60 font-black shadow-md cursor-default',
            accentTextColor: 'text-sky-700'
        };
    }

    // Weight 3: Professional Gold (Most Popular)
    if (weight === 3 || tier === 'gold' || (name.includes('gold') && !name.includes('basic'))) {
        return {
            weight: 3,
            tierKey: 'gold',
            tierName: 'Professional Gold',
            tagline: 'Best value for high-inquiry partner listings',
            popularBadge: '⭐ MOST POPULAR • 3x BOOST',
            icon: Crown,
            cardBg: 'bg-gradient-to-b from-amber-50/95 via-yellow-50/40 to-white',
            borderColor: 'border-2 border-amber-400 hover:border-amber-500',
            activeRing: 'ring-2 ring-amber-500/80 border-2 border-amber-500 shadow-2xl shadow-amber-500/25',
            cardShadow: 'shadow-[0_10px_35px_-8px_rgba(245,158,11,0.22)] hover:shadow-[0_16px_45px_-8px_rgba(245,158,11,0.32)] ring-1 ring-amber-400/40',
            topSheen: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500',
            headerBg: 'bg-gradient-to-br from-[#261502] via-[#3d2303] to-[#78350f]',
            iconContainer: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-stone-950 shadow-lg shadow-amber-500/40 ring-2 ring-yellow-300/80',
            tierPill: 'bg-amber-100 text-amber-950 border border-amber-400 font-extrabold',
            rankingTag: 'bg-amber-100 text-amber-950 font-extrabold border border-amber-300',
            weightBarFilled: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-xs',
            checkBg: 'bg-amber-100 text-amber-900 border border-amber-300/80',
            featureTag: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold',
            chooseButton: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:via-yellow-600 hover:to-amber-600 text-stone-950 font-black shadow-lg shadow-amber-500/35 active:scale-[0.98]',
            activeButton: 'bg-stone-900 text-amber-300 border-2 border-amber-400/80 font-black shadow-md cursor-default',
            accentTextColor: 'text-amber-800'
        };
    }

    // Weight 2: Gold Basic / Bronze (Fast Track)
    if (weight === 2 || tier === 'gold_basic' || name.includes('basic') || name.includes('bronze')) {
        return {
            weight: 2,
            tierKey: 'gold_basic',
            tierName: 'Gold Basic',
            tagline: 'Accelerated inquiries & lead generation',
            popularBadge: '🔥 FAST TRACK • 2x BOOST',
            icon: Star,
            cardBg: 'bg-gradient-to-b from-orange-50/80 via-amber-50/30 to-white',
            borderColor: 'border-2 border-orange-300 hover:border-orange-400',
            activeRing: 'ring-2 ring-orange-500/70 border-2 border-orange-500 shadow-xl shadow-orange-500/20',
            cardShadow: 'shadow-[0_10px_30px_-8px_rgba(234,88,12,0.15)] hover:shadow-[0_16px_40px_-8px_rgba(234,88,12,0.22)]',
            topSheen: 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600',
            headerBg: 'bg-gradient-to-br from-[#2a1306] via-[#451e0c] to-[#9a3412]',
            iconContainer: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-200/70',
            tierPill: 'bg-orange-100 text-orange-900 border border-orange-300 font-extrabold',
            rankingTag: 'bg-orange-100 text-orange-950 font-extrabold border border-orange-200',
            weightBarFilled: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-xs',
            checkBg: 'bg-orange-100 text-orange-900 border border-orange-200/80',
            featureTag: 'bg-orange-100 text-orange-900 border border-orange-200 font-bold',
            chooseButton: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-md shadow-orange-500/25 active:scale-[0.98]',
            activeButton: 'bg-stone-900 text-orange-200 border-2 border-orange-500/60 font-black shadow-md cursor-default',
            accentTextColor: 'text-orange-800'
        };
    }

    // Weight 1: Starter Silver (Polished Titanium & Pure Brushed Silver)
    return {
        weight: 1,
        tierKey: 'silver',
        tierName: 'Starter Silver',
        tagline: 'Essential presence with verified leads',
        popularBadge: null,
        icon: Package,
        cardBg: 'bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/70 to-white',
        borderColor: 'border-2 border-slate-300/90 hover:border-slate-400',
        activeRing: 'ring-2 ring-slate-900 border-2 border-slate-700 shadow-2xl shadow-slate-900/12',
        cardShadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgb(0,0,0,0.1)]',
        topSheen: 'bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400',
        headerBg: 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]',
        iconContainer: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 text-white shadow-md shadow-slate-700/25 ring-2 ring-slate-300/80',
        tierPill: 'bg-slate-200/90 text-slate-800 border border-slate-300 font-extrabold',
        rankingTag: 'bg-slate-200 text-slate-900 font-extrabold border border-slate-300',
        weightBarFilled: 'bg-slate-900 shadow-xs',
        checkBg: 'bg-slate-200/90 text-slate-900 border border-slate-300/70',
        featureTag: 'bg-slate-100 text-slate-800 border border-slate-200 font-bold',
        chooseButton: 'bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md hover:shadow-lg shadow-slate-900/20 active:scale-[0.98]',
        activeButton: 'bg-slate-900 text-white border-2 border-slate-800 font-black shadow-md cursor-default',
        accentTextColor: 'text-slate-800'
    };
};

const PartnerSubscriptions = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [plans, setPlans] = useState([]);
    const [currentSub, setCurrentSub] = useState(null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansData, subData] = await Promise.all([
                subscriptionService.getActivePlans(),
                subscriptionService.getCurrentSubscription()
            ]);

            if (plansData.success) {
                const tierOrder = ['silver', 'gold_basic', 'gold', 'platinum', 'diamond'];
                // Sort plans strictly by rankingWeight first, then price
                const sorted = plansData.plans.sort((a, b) => {
                    const weightA = a.rankingWeight || (tierOrder.indexOf(a.tier) + 1);
                    const weightB = b.rankingWeight || (tierOrder.indexOf(b.tier) + 1);
                    if (weightA !== weightB) return weightA - weightB;
                    return a.price - b.price;
                });
                setPlans(sorted);
            }
            if (subData.success) {
                setCurrentSub(subData.subscription);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (plan) => {
        if (processing) return;
        if (!useFeatureFlagsStore.getState().razorpayEnabled) {
            toast.error(RAZORPAY_UNAVAILABLE_MESSAGE);
            return;
        }
        setProcessing(true);
        const toastId = toast.loading('Initializing payment...');

        try {
            const isLoaded = await loadRazorpay();
            if (!isLoaded) throw new Error("Razorpay SDK failed to load");

            const { order, key } = await subscriptionService.createSubscriptionOrder(plan._id);

            const options = {
                key: key,
                amount: order.amount,
                currency: order.currency,
                name: "HoomZo Partner",
                description: `Subscription: ${plan.name}`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        toast.loading('Verifying payment...', { id: toastId });
                        const verifyPayload = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId: plan._id
                        };

                        const verifyRes = await subscriptionService.verifySubscription(verifyPayload);
                        if (verifyRes.success) {
                            toast.success("Subscription Activated!", { id: toastId });
                            setCurrentSub(verifyRes.subscription);
                            fetchData();
                        } else {
                            toast.error("Verification Failed", { id: toastId });
                        }
                    } catch (err) {
                        toast.error("Payment verification failed", { id: toastId });
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: user.phone
                },
                theme: { color: "#005CA8" }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (r) => toast.error(r.error.description || "Payment Failed", { id: toastId }));
            rzp.open();

        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to initiate purchase", { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const isExpired = currentSub?.status === 'expired' || (currentSub?.expiryDate && new Date(currentSub.expiryDate) < new Date());
    const isActive = currentSub?.status === 'active' && !isExpired;
    const usagePercent = (used, cap) => (cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0);

    const activePlanTheme = currentSub?.planId ? getSubscriptionWeightTheme(currentSub.planId) : null;

    return (
        <div className="px-4 py-5 md:p-8 max-w-7xl mx-auto space-y-8 pb-28 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold mb-2 shadow-sm">
                        <TrendingUp size={13} className="text-amber-400" /> Partner Visibility Boosters
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Subscription Plans
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Rank higher in search results with weighted listing priority and verified leads.
                    </p>
                </div>

                {/* Ranking Weight Hierarchy Pill */}
                <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs shadow-sm">
                    <span className="text-slate-500 font-semibold">Priority Weight:</span>
                    <span className="px-2 py-0.5 rounded-md font-extrabold bg-slate-200 text-slate-800">1x Silver</span>
                    <span className="text-slate-300">→</span>
                    <span className="px-2 py-0.5 rounded-md font-extrabold bg-amber-100 text-amber-900">3x Gold</span>
                    <span className="text-slate-300">→</span>
                    <span className="px-2 py-0.5 rounded-md font-extrabold bg-purple-100 text-purple-900">5x Diamond</span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                    <p className="text-xs font-semibold text-slate-400">Loading subscription plans...</p>
                </div>
            ) : (
                <>
                    {/* Active Subscription Summary Box */}
                    {currentSub && currentSub.planId && (
                        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-md overflow-hidden transition-all">
                            {/* Color header matching current plan's weight */}
                            <div className={`p-6 ${activePlanTheme?.headerBg || 'bg-slate-900'} text-white relative overflow-hidden`}>
                                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                            isActive
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                                : 'bg-red-500/20 text-red-300 border border-red-400/30'
                                        }`}>
                                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#10b981] animate-pulse' : 'bg-red-400'}`} />
                                            {isActive ? 'Active Subscription' : 'Expired'}
                                        </span>

                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white/95 text-xs font-extrabold backdrop-blur-sm border border-white/15">
                                            <TrendingUp size={12} className="text-amber-300" />
                                            Weight: {activePlanTheme?.weight || currentSub.planId.rankingWeight || 1}x Boost
                                        </span>
                                    </div>

                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/15">
                                        <ShieldCheck size={20} className="text-white" />
                                    </div>
                                </div>

                                <div className="mt-5 relative z-10">
                                    <p className="text-xs uppercase tracking-wider text-white/70 font-bold">Your Current Plan</p>
                                    <h2 className="text-2xl md:text-3xl font-black mt-0.5 tracking-tight flex items-center gap-2">
                                        {currentSub.planId.name}
                                    </h2>
                                    {currentSub.planId.description && (
                                        <p className="mt-1.5 text-xs text-white/80 leading-relaxed max-w-2xl line-clamp-2">
                                            {currentSub.planId.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Usage Statistics */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
                                <UsageRow
                                    icon={Home}
                                    label="Properties Listed"
                                    used={currentSub.propertiesAdded}
                                    cap={currentSub.planId.maxProperties}
                                    percent={usagePercent(currentSub.propertiesAdded, currentSub.planId.maxProperties)}
                                    accentColor={activePlanTheme?.weightBarFilled || 'bg-slate-900'}
                                />
                                <UsageRow
                                    icon={Users}
                                    label="Monthly Buyer Leads"
                                    used={currentSub.leadsUsedThisMonth}
                                    cap={currentSub.planId.leadCap}
                                    percent={usagePercent(currentSub.leadsUsedThisMonth, currentSub.planId.leadCap)}
                                    accentColor={activePlanTheme?.weightBarFilled || 'bg-slate-900'}
                                />
                                <div className="flex flex-col justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <CalendarDays size={15} className="text-slate-500" />
                                            {isActive ? 'Plan Renewal Date' : 'Expired on'}
                                        </span>
                                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                                            isActive ? 'bg-slate-900 text-white' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {isActive ? 'Active' : 'Expired'}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-lg font-black text-slate-900">{formatDate(currentSub.expiryDate)}</span>
                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Upgrade anytime to boost your listing weight</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Available Plans Section */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                                    Available Plans
                                </h3>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                    {plans.length} options
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select the tier and search ranking weight that best fits your portfolio.
                            </p>
                        </div>

                        {/* Cards Grid: 1 col on mobile, up to 5 on large screen */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-stretch">
                            {plans.map((plan) => {
                                const theme = getSubscriptionWeightTheme(plan);
                                const Icon = theme.icon;
                                const isCurrent = currentSub?.planId?._id === plan._id && isActive;
                                const isSilver = theme.weight === 1 || plan.tier === 'silver';
                                const isPopular = theme.weight === 3 || plan.tier === 'gold';
                                const isMaxBoost = theme.weight >= 5 || plan.tier === 'diamond';

                                return (
                                    <div
                                        key={plan._id}
                                        className={`group relative rounded-3xl flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${theme.cardBg} ${
                                            isCurrent
                                                ? theme.activeRing
                                                : `${theme.borderColor} ${theme.cardShadow}`
                                        }`}
                                    >
                                        {/* Top Sheen Line matching subscription weight */}
                                        <div className={`h-2 w-full ${theme.topSheen}`} />

                                        {/* Floating Badge (e.g. Most Popular or Max Boost) */}
                                        {theme.popularBadge && !isCurrent && (
                                            <div className="px-5 pt-3 -mb-1">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    isPopular
                                                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 shadow-sm'
                                                        : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm'
                                                }`}>
                                                    {theme.popularBadge}
                                                </span>
                                            </div>
                                        )}

                                        <div className="p-5 md:p-6 flex-1 flex flex-col">
                                            {/* Top Row: Icon + Weight Pill / Current Plan Status */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`w-12 h-12 rounded-2xl ${theme.iconContainer} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
                                                    <Icon size={24} strokeWidth={2.4} />
                                                </div>

                                                {isCurrent ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 px-3 py-1 rounded-full shadow-sm">
                                                        <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                                                        Current Plan
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full ${theme.tierPill}`}>
                                                        Weight {theme.weight}x
                                                    </span>
                                                )}
                                            </div>

                                            {/* Plan Name & Tagline */}
                                            <div>
                                                <h4 className="text-xl font-black text-slate-950 leading-tight tracking-tight">
                                                    {plan.name}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-medium leading-relaxed">
                                                    {plan.description || theme.tagline}
                                                </p>
                                            </div>

                                            {/* Visual Ranking Weight Instrument */}
                                            <div className="mt-4 mb-4.5 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                                                <div className="flex items-center justify-between text-xs mb-2">
                                                    <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                                                        <TrendingUp size={13} className={theme.accentTextColor} />
                                                        Ranking Power
                                                    </span>
                                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${theme.rankingTag}`}>
                                                        {theme.weight}x Priority {isMaxBoost ? '(MAX)' : ''}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-5 gap-1.5 h-2">
                                                    {[1, 2, 3, 4, 5].map((step) => (
                                                        <div
                                                            key={step}
                                                            className={`rounded-full transition-all duration-300 ${
                                                                step <= theme.weight
                                                                    ? theme.weightBarFilled
                                                                    : 'bg-slate-200/80'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Pricing Display */}
                                            <div className="pb-4 border-b border-slate-200/70">
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight font-sans">
                                                        ₹{plan.price.toLocaleString('en-IN')}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">
                                                        / {plan.durationDays} days
                                                    </span>
                                                </div>
                                                {plan.durationDays > 30 ? (
                                                    <p className="text-[11px] font-bold text-slate-500 mt-1">
                                                        ≈ ₹{Math.round((plan.price / plan.durationDays) * 30).toLocaleString('en-IN')} / month
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                                                        {isSilver ? '⚡ Affordable entry for local listing' : '⚡ 30-day listing & inquiries'}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Feature List */}
                                            <ul className="space-y-3 my-5 flex-1 text-xs">
                                                <FeatureRow
                                                    checkBg={theme.checkBg}
                                                    text={
                                                        <span>
                                                            Up to <strong className="font-black text-slate-900">{plan.maxProperties} properties</strong> listed
                                                        </span>
                                                    }
                                                />

                                                <FeatureRow
                                                    checkBg={theme.checkBg}
                                                    text={
                                                        <span>
                                                            <strong className="font-black text-slate-900">
                                                                {plan.leadCap > 0 ? `${plan.leadCap} Leads` : 'Unlimited leads'}
                                                            </strong> / month
                                                        </span>
                                                    }
                                                    highlightTag={plan.leadCap === 0 ? "Unlimited" : null}
                                                    theme={theme}
                                                />

                                                <FeatureRow
                                                    checkBg={theme.checkBg}
                                                    text={
                                                        <span>
                                                            Ranking boost (<strong className="font-black text-slate-900">Level {theme.weight}</strong> Priority)
                                                        </span>
                                                    }
                                                    highlightTag={theme.weight >= 3 ? `${theme.weight}x Priority` : null}
                                                    theme={theme}
                                                />

                                                {plan.hasVerifiedTag && (
                                                    <FeatureRow
                                                        checkBg={theme.checkBg}
                                                        text={
                                                            <span className="font-bold text-slate-900">
                                                                Verified partner badge & trust seal
                                                            </span>
                                                        }
                                                        highlightTag="Verified"
                                                        theme={theme}
                                                    />
                                                )}

                                                {plan.bannerType && plan.bannerType !== 'none' && (
                                                    <FeatureRow
                                                        checkBg={theme.checkBg}
                                                        text={
                                                            <span className="capitalize font-bold text-slate-900">
                                                                {plan.bannerType} banner presence
                                                            </span>
                                                        }
                                                        highlightTag="Banner"
                                                        theme={theme}
                                                    />
                                                )}

                                                {plan.pauseDaysAllowed > 0 && (
                                                    <FeatureRow
                                                        checkBg={theme.checkBg}
                                                        text={
                                                            <span>
                                                                <strong className="font-black text-slate-900">{plan.pauseDaysAllowed} days</strong> subscription pause
                                                            </span>
                                                        }
                                                    />
                                                )}
                                            </ul>

                                            {/* Action Button */}
                                            <div className="pt-2 mt-auto">
                                                <button
                                                    onClick={() => handlePurchase(plan)}
                                                    disabled={processing || isCurrent}
                                                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                                                        isCurrent
                                                            ? theme.activeButton
                                                            : `${theme.chooseButton} cursor-pointer`
                                                    }`}
                                                >
                                                    {isCurrent ? (
                                                        <>
                                                            <CheckCircle size={18} className="text-[#10b981]" />
                                                            <span>Current Active Plan</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>Choose {theme.tierName}</span>
                                                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Weight & Algorithm Explainer */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 border border-slate-700 shadow-md flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-400/30">
                            <TrendingUp size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-base font-black text-white">How Subscription Weight Powers Your Visibility</h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                Our search algorithm prioritizes listings based on your subscription weight. Higher weight plans (such as Level 3 Gold and Level 5 Diamond) position your listings at the top of locality and city feeds, yielding significantly more verified buyer calls.
                            </p>
                        </div>
                    </div>

                    {/* Non-refundable / Policy note */}
                    <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-3 border border-slate-200 text-slate-500">
                        <AlertCircle className="text-slate-400 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs leading-relaxed">
                            Subscription plans are non-refundable. For higher tiers (Platinum & Diamond), exclusive city-level banner slots are subject to availability.
                            Upgrade anytime; your remaining validity will be credited towards your upgraded tier.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

const UsageRow = ({ icon: Icon, label, used, cap, percent, accentColor }) => (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Icon size={15} className="text-slate-400" /> {label}
            </span>
            <span className="text-xs font-black text-slate-900">
                {used}
                <span className="text-slate-400 font-medium"> / {cap > 0 ? cap : '∞'}</span>
            </span>
        </div>
        <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        percent >= 90 ? 'bg-red-500' : accentColor
                    }`}
                    style={{ width: cap > 0 ? `${Math.max(percent, used > 0 ? 5 : 0)}%` : '0%' }}
                />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>{cap > 0 ? `${percent}% utilized` : 'Unlimited quota'}</span>
                {cap > 0 && <span>{Math.max(0, cap - used)} remaining</span>}
            </div>
        </div>
    </div>
);

const FeatureRow = ({ checkBg, text, highlightTag = null, theme }) => (
    <li className="flex items-start gap-2.5">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${checkBg}`}>
            <Check size={11} strokeWidth={3} />
        </span>
        <div className="flex-1 flex flex-wrap items-center gap-1.5 leading-snug text-slate-800">
            <span>{text}</span>
            {highlightTag && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${theme?.featureTag || 'bg-slate-200 text-slate-800'}`}>
                    {highlightTag}
                </span>
            )}
        </div>
    </li>
);

export default PartnerSubscriptions;

