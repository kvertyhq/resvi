import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';

const POSReportPrintPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') as 'x' | 'z';
    const restaurantId = searchParams.get('restaurant_id');

    const [stats, setStats] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [receiptSettings, setReceiptSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (restaurantId) {
            fetchStats();
        }
    }, [restaurantId, type]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const today = new Date();
            const startStr = startOfDay(today).toISOString();
            const endStr = endOfDay(today).toISOString();

            // 1. Fetch Restaurant Settings
            const { data: restData } = await supabase.rpc('get_restaurant_settings', { p_id: restaurantId });
            setSettings(restData?.data || restData);

            // 2. Fetch Receipt Settings
            const { data: recData } = await supabase.rpc('get_receipt_settings', { p_restaurant_id: restaurantId });
            setReceiptSettings(recData);

            // 3. Fetch Orders for Today
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .gte('created_at', startStr)
                .lte('created_at', endStr)
                .neq('status', 'cancelled');

            if (ordersError) throw ordersError;

            // 4. Calculate Stats
            const revenue = orders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
            const payments: Record<string, number> = {};
            
            orders.forEach(o => {
                const method = (o.payment_method || 'Unpaid').toLowerCase();
                payments[method] = (payments[method] || 0) + (o.total_amount || 0);
            });

            setStats({
                total_revenue: revenue,
                order_count: orders.length,
                payments,
                date: today
            });

            // 5. If Z-REPORT, save to database
            if (type === 'z') {
                const { error: saveError } = await supabase
                    .from('daily_reports')
                    .upsert({
                        restaurant_id: restaurantId,
                        report_type: 'z',
                        report_date: format(today, 'yyyy-MM-dd'),
                        total_revenue: revenue,
                        order_count: orders.length,
                        payment_breakdown: payments,
                        created_at: new Date().toISOString()
                    }, { onConflict: 'restaurant_id, report_date, report_type' });

                if (saveError) console.error('Error saving Z-Report:', saveError);
            }

            // Auto-print after a short delay
            setTimeout(() => {
                window.print();
            }, 1000);

        } catch (err: any) {
            console.error('Error fetching report stats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-500">Generating {type?.toUpperCase()} Report...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <h1 className="text-lg font-bold text-gray-900 mb-2">Report Failed</h1>
                <p className="text-sm text-gray-500 mb-6">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-10 px-4">
            <style>
                {`
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; }
                    .no-print { display: none; }
                }
                ${receiptSettings?.custom_css || ''}
                `}
            </style>

            <div className="max-w-[400px] mx-auto text-sm font-mono leading-relaxed text-black">
                {/* Header */}
                <div className="text-center mb-6">
                    {receiptSettings?.show_logo && (receiptSettings.logo_url || settings?.logo_url) && (
                        <img
                            src={receiptSettings.logo_url || settings.logo_url}
                            alt="Logo"
                            className="h-16 w-16 mx-auto rounded-full object-cover mb-2"
                        />
                    )}
                    <h1 className="text-xl font-bold uppercase">{settings?.name || 'Restaurant'}</h1>
                    <div className="border-y border-dashed border-black py-2 my-4">
                        <h2 className="text-lg font-black tracking-widest">{type === 'z' ? 'Z-REPORT' : 'X-REPORT'}</h2>
                        <p className="text-xs">{type === 'z' ? 'Final End of Day' : 'Current Snapshot'}</p>
                    </div>
                    <p>{settings?.address_line1}</p>
                    <p>{settings?.phone}</p>
                    <p className="mt-2">{format(stats.date, 'PPPP p')}</p>
                </div>

                <div className="border-b border-dashed border-black pb-4 mb-4">
                    <div className="flex justify-between font-bold text-base mb-2">
                        <span>NET TOTAL SALES</span>
                        <span>{settings?.currency || '£'}{stats.total_revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>TOTAL ORDERS</span>
                        <span>{stats.order_count}</span>
                    </div>
                </div>

                {/* Payments Breakdown */}
                <div className="mb-6">
                    <h3 className="font-bold border-b border-black mb-2 pb-1">PAYMENT BREAKDOWN</h3>
                    {Object.entries(stats.payments).map(([method, amount]: [string, any]) => (
                        <div key={method} className="flex justify-between py-1">
                            <span className="capitalize">{method}</span>
                            <span>{settings?.currency || '£'}{amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                <div className="text-center border-t border-dashed border-black pt-6 mt-10">
                    <p className="font-bold">End of Report</p>
                    <p className="text-xs text-gray-500 mt-2 italic">Thank you for using our POS system</p>
                </div>

                {/* Action Buttons (Hidden when printing) */}
                <div className="no-print mt-10 flex flex-col gap-2">
                    <button
                        onClick={() => window.print()}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Print Report
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-bold"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POSReportPrintPage;
