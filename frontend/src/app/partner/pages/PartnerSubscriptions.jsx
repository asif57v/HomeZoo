import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle, ShieldCheck, Package, Clock,
    Crown, Zap, Star, Layout, MapPin, AlertCircle, Check, CalendarDays, Home, Users
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

const TIER_CONFIG = {
    silver: {
        color: 'from-slate-400 to-slate-600',
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        icon: Package,
        accent: 'slate'
    },
    gold_basic: {
        color: 'from-amber-300 to-amber-500',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: Star,
        accent: 'amber'
    },
    gold: {
        color: 'from-yellow-400 to-yellow-600',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        icon: Crown,
        accent: 'yellow'
    },
    platinum: {
        color: 'from-blue-400 to-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        icon: ShieldCheck,
        accent: 'blue'
    },
    diamond: {
        color: 'from-purple-500 to-indigo-600',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        icon: Zap,
        accent: 'purple'
    }
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
                // Sort plans by price/tier order if possible
                const tierOrder = ['silver', 'gold_basic', 'gold', 'platinum', 'diamond'];
                const sorted = plansData.plans.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
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
                theme: { color: "#0d9488" }
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(amount);
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

    return (
        <div className="px-4 py-5 md:p-8 max-w-7xl mx-auto space-y-6 pb-28">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Subscription</h1>
                <p className="text-sm text-gray-500 mt-1">Pick a plan that matches your growth.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-[#005CA8] rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Current plan */}
                    {currentSub && currentSub.planId && (
                        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-5 bg-gradient-to-br from-[#0b1f3a] to-[#005CA8] text-white">
                                <div className="flex items-center justify-between">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${isActive ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-red-300'}`} />
                                        {isActive ? 'Active' : 'Expired'}
                                    </span>
                                    <ShieldCheck size={20} className="text-white/80" />
                                </div>
                                <p className="mt-4 text-xs text-white/60">Current plan</p>
                                <h2 className="text-xl font-bold leading-tight">{currentSub.planId.name}</h2>
                                {currentSub.planId.description && (
                                    <p className="mt-1.5 text-xs text-white/70 leading-relaxed line-clamp-2">{currentSub.planId.description}</p>
                                )}
                            </div>

                            <div className="p-5 space-y-4">
                                <UsageRow
                                    icon={Home}
                                    label="Properties"
                                    used={currentSub.propertiesAdded}
                                    cap={currentSub.planId.maxProperties}
                                    percent={usagePercent(currentSub.propertiesAdded, currentSub.planId.maxProperties)}
                                />
                                <UsageRow
                                    icon={Users}
                                    label="Leads this month"
                                    used={currentSub.leadsUsedThisMonth}
                                    cap={currentSub.planId.leadCap}
                                    percent={usagePercent(currentSub.leadsUsedThisMonth, currentSub.planId.leadCap)}
                                />
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <span className="flex items-center gap-2 text-xs text-gray-500">
                                        <CalendarDays size={14} /> {isActive ? 'Valid until' : 'Expired on'}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">{formatDate(currentSub.expiryDate)}</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Plans */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Available plans</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {plans.map((plan) => {
                                const config = TIER_CONFIG[plan.tier] || TIER_CONFIG.silver;
                                const Icon = config.icon;
                                const isCurrent = currentSub?.planId?._id === plan._id && isActive;

                                return (
                                    <div
                                        key={plan._id}
                                        className={`relative bg-white rounded-2xl border flex flex-col p-5 ${isCurrent ? 'border-[#005CA8] ring-1 ring-[#005CA8]/30 shadow-md' : 'border-gray-200 shadow-sm'}`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                                                <Icon className="text-white" size={20} />
                                            </div>
                                            {isCurrent && (
                                                <span className="text-[11px] font-semibold text-[#005CA8] bg-blue-50 px-2.5 py-1 rounded-full">Current plan</span>
                                            )}
                                        </div>

                                        <h4 className="text-base font-semibold text-gray-900 leading-tight">{plan.name}</h4>
                                        <div className="flex items-baseline gap-1 mt-1 mb-4">
                                            <span className="text-2xl font-bold text-gray-900">₹{plan.price}</span>
                                            <span className="text-xs text-gray-400">/ {plan.durationDays} days</span>
                                        </div>

                                        <ul className="space-y-2.5 mb-5 pt-4 border-t border-gray-100">
                                            <FeatureItem text={`Up to ${plan.maxProperties} properties`} />
                                            <FeatureItem text={plan.leadCap > 0 ? `${plan.leadCap} leads / month` : 'Unlimited leads'} />
                                            {plan.rankingWeight > 1 && <FeatureItem text={`Ranking boost (Level ${plan.rankingWeight})`} />}
                                            {plan.hasVerifiedTag && <FeatureItem text="Verified partner badge" />}
                                            {plan.bannerType !== 'none' && <FeatureItem text={`${plan.bannerType.charAt(0).toUpperCase() + plan.bannerType.slice(1)} banner`} />}
                                        </ul>

                                        <button
                                            onClick={() => handlePurchase(plan)}
                                            disabled={processing || isCurrent}
                                            className={`mt-auto w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${isCurrent
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-[#005CA8] text-white hover:bg-[#004a87] shadow-sm'
                                                }`}
                                        >
                                            {isCurrent ? 'Active' : 'Choose plan'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3 border border-gray-200">
                        <AlertCircle className="text-gray-400 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Subscription plans are non-refundable. For higher tiers (Platinum & Diamond),
                            exclusive city-level banner slots are subject to availability.
                            Contact support for bulk listing packages.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

const UsageRow = ({ icon: Icon, label, used, cap, percent }) => (
    <div>
        <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-2 text-xs text-gray-500"><Icon size={14} /> {label}</span>
            <span className="text-sm font-semibold text-gray-900">
                {used}
                <span className="text-gray-400 font-medium"> / {cap > 0 ? cap : '∞'}</span>
            </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
                className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : 'bg-[#005CA8]'}`}
                style={{ width: cap > 0 ? `${Math.max(percent, used > 0 ? 4 : 0)}%` : '0%' }}
            />
        </div>
    </div>
);

const FeatureItem = ({ text }) => (
    <li className="flex items-center gap-2.5">
        <span className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Check size={10} className="text-emerald-600" strokeWidth={3} />
        </span>
        <span className="text-[13px] text-gray-700">{text}</span>
    </li>
);

export default PartnerSubscriptions;
