import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { ShoppingBag, Users, DollarSign, TrendingUp } from 'lucide-react';

const DashboardPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();

    if (!selectedRestaurantId) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Please select a restaurant context from the sidebar.
            </div>
        );
    }

    // Mock Data - in real app, fetch based on selectedRestaurantId
    const stats = [
        { title: 'Total Revenue', value: '£12,450', change: '+12%', icon: DollarSign, color: 'bg-green-500' },
        { title: 'Active Orders', value: '24', change: '+4', icon: ShoppingBag, color: 'bg-blue-500' },
        { title: 'Bookings Today', value: '18', change: '-2', icon: Users, color: 'bg-purple-500' },
        { title: 'Avg. Order Value', value: '£42.50', change: '+5%', icon: TrendingUp, color: 'bg-orange-500' },
    ];

    return (
        <div>
            <h2 className="text-3xl font-serif font-bold text-gray-800 mb-8">Dashboard Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-full ${stat.color} bg-opacity-10`}>
                                <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                            </div>
                            <span className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity Placeholder */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                <div className="w-2 h-2 bg-brand-gold rounded-full mr-3"></div>
                                <p className="text-sm text-gray-600">New order #10{20 + i} received from Table {i}</p>
                                <span className="ml-auto text-xs text-gray-400">{i * 5}m ago</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Popular Items Placeholder */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Popular Items</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center">
                                <div className="h-10 w-10 bg-gray-200 rounded-md mr-3"></div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Spicy Beef Burger</p>
                                    <p className="text-xs text-gray-500">24 orders today</p>
                                </div>
                                <span className="ml-auto font-bold text-gray-700">£12.99</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
