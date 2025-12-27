import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { ShoppingBag, Users, DollarSign, TrendingUp, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardBookings from '../../components/admin/DashboardBookings';

const DashboardPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        revenue: 0,
        activeOrders: 0,
        bookingsToday: 0,
        avgOrderValue: 0,
        smsCredits: 0
    });

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchDashboardStats();
        }
    }, [selectedRestaurantId]);

    const fetchDashboardStats = async () => {
        if (!selectedRestaurantId) return;
        setLoading(true);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const todayStr = today.toISOString().split('T')[0];

        try {
            // 1. Total Revenue (Current Month)
            const { data: revenueData, error: revenueError } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('restaurant_id', selectedRestaurantId)
                .eq('status', 'completed')
                .gte('created_at', firstDayOfMonth);

            if (revenueError) throw revenueError;

            const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

            // 2. Active Orders (Today)
            // Assuming active means not completed and not cancelled
            const { count: activeOrdersCount, error: activeOrdersError } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', selectedRestaurantId)
                .neq('status', 'completed')
                .neq('status', 'cancelled')
                .gte('created_at', todayStr + 'T00:00:00'); // From start of today

            if (activeOrdersError) throw activeOrdersError;

            // 3. Bookings Today
            const { count: bookingsCount, error: bookingsError } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('restaurant_id', selectedRestaurantId)
                .eq('booking_date', todayStr);

            if (bookingsError) throw bookingsError;

            // 4. Average Order Value (via RPC)
            const { data: aovData, error: aovError } = await supabase
                .rpc('get_aov', { p_restaurant_id: selectedRestaurantId });

            if (aovError) throw aovError;

            // 5. SMS Credits
            const { data: creditsData, error: creditsError } = await supabase
                .from('restaurant_credits')
                .select('balance')
                .eq('restaurant_id', selectedRestaurantId)
                .maybeSingle();

            if (creditsError) console.error('Error fetching credits:', creditsError);

            setStats({
                revenue: totalRevenue,
                activeOrders: activeOrdersCount || 0,
                bookingsToday: bookingsCount || 0,
                avgOrderValue: aovData?.aov || 0,
                smsCredits: creditsData?.balance || 0
            });

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!selectedRestaurantId) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Please select a restaurant context from the sidebar.
            </div>
        );
    }

    const statCards = [
        {
            title: 'Total Revenue (Month)',
            value: `£${stats.revenue.toFixed(2)}`,
            icon: DollarSign,
            color: 'bg-green-500'
        },
        {
            title: 'Active Orders',
            value: stats.activeOrders.toString(),
            icon: ShoppingBag,
            color: 'bg-blue-500'
        },
        {
            title: 'Bookings Today',
            value: stats.bookingsToday.toString(),
            icon: Users,
            color: 'bg-purple-500'
        },
        {
            title: 'Avg. Order Value',
            value: `£${stats.avgOrderValue.toFixed(2)}`,
            icon: TrendingUp,
            color: 'bg-orange-500'
        },
        {
            title: 'SMS Credits',
            value: stats.smsCredits.toString(),
            icon: MessageSquare,
            color: 'bg-brand-gold',
            link: '/admin/credits'
        }
    ];

    return (
        <div>
            <h2 className="text-3xl font-serif font-bold text-gray-800 mb-8">Dashboard Overview</h2>

            {loading ? (
                <div className="text-center py-10">Loading stats...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                        {statCards.map((stat, index) => (
                            <div
                                key={index}
                                className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${stat.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                                onClick={() => stat.link && navigate(stat.link)}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-full ${stat.color} bg-opacity-10`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                                    </div>
                                    {stat.link && <div className="text-xs text-gray-400">View &rarr;</div>}
                                </div>
                                <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mb-8">
                        <DashboardBookings />
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardPage;
