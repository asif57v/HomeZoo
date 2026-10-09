
import React from 'react';
import { useLenis } from '../../shared/hooks/useLenis';
import PartnerHeader from '../components/PartnerHeader';
import usePartnerDashboard from '../hooks/usePartnerDashboard';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import RecentBookingsTable from '../components/dashboard/RecentBookingsTable';
import ActionRequired from '../components/dashboard/ActionRequired';
import { Calendar, Wallet, Building2, Star, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PartnerDashboard = () => {
    // Lenis handled globally
    const navigate = useNavigate();
    const { stats, recentBookings, actionItems, loading, user } = usePartnerDashboard();

    // Init Notifications
    React.useEffect(() => {
        const initNotifications = async () => {
            try {
                // Import dynamically to avoid circular deps if any, or just standard import
                const { requestNotificationPermission } = await import('../../../utils/firebase');
                const { userService } = await import('../../../services/apiService');

                const token = await requestNotificationPermission();
                if (token) {
                    await userService.updateFcmToken(token, 'web');
                }
            } catch (error) {
                console.error("Partner Notification Init Failed:", error);
            }
        };
        if (user) {
            initNotifications();
        }
    }, [user]);

    // Helper for formatting Currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#005CA8] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24">
            <PartnerHeader />

            {/* One spacing unit (space-y-4 / md:space-y-6) between every block keeps gaps even */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 md:py-8 space-y-4 md:space-y-6">
                {/* Header & Greeting */}
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight truncate">
                            Welcome back, {user?.name?.split(' ')[0] || 'Partner'}! 👋
                        </h1>
                        <p className="text-gray-500 mt-0.5 text-xs md:text-sm font-medium line-clamp-1">
                            Here's what's happening with your properties today.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/hotel/join')}
                        className="shrink-0 flex items-center gap-1.5 bg-[#005CA8] hover:bg-[#004b8a] text-white pl-3 pr-4 py-2 md:px-5 md:py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
                    >
                        <Plus size={16} />
                        Add Property
                    </button>
                </div>

                {/* Priority Actions */}
                <ActionRequired items={actionItems} />

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <DashboardStatCard
                        icon={Calendar}
                        label="Total Bookings"
                        value={stats.totalBookings}
                        subtext={stats.bookingsThisWeek > 0 ? `+${stats.bookingsThisWeek} this week` : 'No new bookings this week'}
                        actionLabel="View all"
                        onAction={() => navigate('/hotel/bookings')}
                        tone="blue"
                    />

                    <DashboardStatCard
                        icon={Wallet}
                        label="Wallet Balance"
                        value={formatCurrency(stats.walletBalance)}
                        valueClass={stats.walletBalance < 0 ? 'text-red-600' : ''}
                        subtext="Available to withdraw"
                        actionLabel="Withdraw"
                        onAction={() => navigate('/hotel/wallet')}
                        tone="sky"
                    />

                    <DashboardStatCard
                        icon={Building2}
                        label="Active Properties"
                        value={stats.activeProperties}
                        subtext="Online & Bookable"
                        actionLabel="Manage"
                        onAction={() => navigate('/hotel/properties')}
                        tone="purple"
                    />

                    <DashboardStatCard
                        icon={Star}
                        label="Pending Reviews"
                        value={stats.pendingReviews}
                        subtext="Action required"
                        actionLabel="Reply"
                        onAction={() => navigate('/hotel/reviews')}
                        tone="orange"
                    />
                </div>

                {/* Recent Activity Section */}
                <RecentBookingsTable bookings={recentBookings} />

            </main>
        </div>
    );
};

export default PartnerDashboard;
