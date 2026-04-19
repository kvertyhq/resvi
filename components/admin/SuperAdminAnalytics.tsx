import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend 
} from 'recharts';
import { ShoppingBag, Phone, BarChart3, Loader2 } from 'lucide-react';
import { subDays, format, startOfDay, parseISO } from 'date-fns';

const COLORS = ['#c9a96e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AnalyticsData {
    ordersPerDay: { date: string, count: number }[];
    callsPerDay: { date: string, count: number }[];
    orderTypes: { name: string, value: number }[];
    totalOrders: number;
    totalCalls: number;
}

const SuperAdminAnalytics: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const sevenDaysAgo = subDays(new Date(), 7);
            
            // 1. Total Counts
            const { count: totalOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true });

            const { count: totalCalls } = await supabase
                .from('call_logs')
                .select('*', { count: 'exact', head: true });

            // 2. Orders for last 7 days
            const { data: ordersData } = await supabase
                .from('orders')
                .select('created_at, order_type')
                .gte('created_at', sevenDaysAgo.toISOString());

            // 3. Call logs for last 7 days
            const { data: callsData } = await supabase
                .from('call_logs')
                .select('created_at')
                .gte('created_at', sevenDaysAgo.toISOString());

            // Process Data
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = subDays(new Date(), 6 - i);
                return format(date, 'MMM dd');
            });

            // Orders Per Day
            const ordersPerDayMap: Record<string, number> = {};
            last7Days.forEach(day => ordersPerDayMap[day] = 0);
            
            const orderTypesMap: Record<string, number> = {};

            ordersData?.forEach(order => {
                const day = format(parseISO(order.created_at), 'MMM dd');
                if (ordersPerDayMap[day] !== undefined) {
                    ordersPerDayMap[day]++;
                }
                
                const type = order.order_type || 'Unknown';
                orderTypesMap[type] = (orderTypesMap[type] || 0) + 1;
            });

            // Calls Per Day
            const callsPerDayMap: Record<string, number> = {};
            last7Days.forEach(day => callsPerDayMap[day] = 0);

            callsData?.forEach(call => {
                const day = format(parseISO(call.created_at), 'MMM dd');
                if (callsPerDayMap[day] !== undefined) {
                    callsPerDayMap[day]++;
                }
            });

            setData({
                totalOrders: totalOrders || 0,
                totalCalls: totalCalls || 0,
                ordersPerDay: last7Days.map(day => ({ date: day, count: ordersPerDayMap[day] })),
                callsPerDay: last7Days.map(day => ({ date: day, count: callsPerDayMap[day] })),
                orderTypes: Object.entries(orderTypesMap).map(([name, value]) => ({ 
                    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
                    value 
                }))
            });

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <Loader2 className="h-10 w-10 text-brand-gold animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Aggregating system-wide reports...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                    <div className="p-4 bg-yellow-50 rounded-lg mr-4 text-brand-gold">
                        <ShoppingBag className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase">Total Orders (System-wide)</p>
                        <h4 className="text-3xl font-bold text-gray-900">{data.totalOrders.toLocaleString()}</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                    <div className="p-4 bg-blue-50 rounded-lg mr-4 text-blue-500">
                        <Phone className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase">Total Call Logs</p>
                        <h4 className="text-3xl font-bold text-gray-900">{data.totalCalls.toLocaleString()}</h4>
                    </div>
                </div>
            </div>

            {/* Charts Row 1: Line Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <ShoppingBag className="h-5 w-5 mr-2 text-brand-gold" />
                            Order Volume (Last 7 Days)
                        </h3>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.ordersPerDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 12, fill: '#9ca3af'}} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 12, fill: '#9ca3af'}} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#c9a96e" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#c9a96e', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Phone className="h-5 w-5 mr-2 text-blue-500" />
                            Call Log Activity (Last 7 Days)
                        </h3>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.callsPerDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 12, fill: '#9ca3af'}} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 12, fill: '#9ca3af'}} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Pie Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                        Order Type Distribution (Last 7 Days)
                    </h3>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-around h-80">
                    <div className="h-full w-full md:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.orderTypes}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.orderTypes.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 mt-4 md:mt-0 px-4">
                        <div className="grid grid-cols-2 gap-4">
                            {data.orderTypes.map((type, index) => (
                                <div key={type.name} className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div 
                                        className="h-3 w-3 rounded-full mr-3 shrink-0" 
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">{type.name}</p>
                                        <p className="text-sm font-bold text-gray-800">{type.value} orders</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminAnalytics;
