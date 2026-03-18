import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Printer } from 'lucide-react';

const PublicReceiptPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [searchParams] = useSearchParams();
    const stationId = searchParams.get('station_id');

    const [order, setOrder] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [receiptSettings, setReceiptSettings] = useState<any>(null);
    const [stationName, setStationName] = useState<string>('');
    const [round, setRound] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            fetchOrderData();
        }
        const r = searchParams.get('round');
        if (r) setRound(parseInt(r));
    }, [orderId, searchParams]);

    useEffect(() => {
        if (stationId && order?.restaurant_id) {
            // Fetch station name for display
            supabase
                .from('stations')
                .select('name')
                .eq('id', stationId)
                .single()
                .then(({ data }) => {
                    if (data) setStationName(data.name);
                });
        }
    }, [stationId, order]);

    const fetchOrderData = async () => {
        try {
            // Fetch Order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select(`
                    *,
                    daily_order_number,
                    order_items (
                        quantity,
                        name_snapshot,
                        price_snapshot,
                        selected_modifiers,
                        station_id,
                        round_number
                    )
                `)
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;
            setOrder(orderData);

            if (orderData?.restaurant_id) {
                // Fetch Restaurant Settings
                const { data: restData } = await supabase
                    .rpc('get_restaurant_settings', { p_id: orderData.restaurant_id });

                const rData = Array.isArray(restData?.data) ? restData.data[0] : restData?.data || restData;
                setSettings(rData);

                // Fetch Receipt Settings
                const { data: recData } = await supabase
                    .rpc('get_receipt_settings', { p_restaurant_id: orderData.restaurant_id });
                setReceiptSettings(recData);
            }

        } catch (error) {
            console.error('Error loading receipt:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10">Loading Receipt...</div>;
    if (!order) return <div className="flex justify-center p-10 text-red-500">Receipt not found.</div>;

    // Filter items if stationId or round is present
    const displayedItems = order.order_items.filter((item: any) => {
        const stationMatch = !stationId || item.station_id === stationId;
        const roundMatch = round === null || item.round_number === round;
        return stationMatch && roundMatch;
    });

    if (stationId && displayedItems.length === 0) {
        return <div className="flex justify-center p-10 text-gray-500">No items for this station.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4">
            <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                <style dangerouslySetInnerHTML={{ __html: receiptSettings?.custom_css || '' }} />

                {/* Receipt Content */}
                <div className="p-6 text-sm font-mono leading-relaxed" id="receipt-content">

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
                        {stationName && <h2 className="text-lg font-bold mt-1 border-b inline-block">{stationName} Ticket</h2>}
                        <p className="text-gray-500">{settings?.address_line1}</p>
                        <p className="text-gray-500">{settings?.phone}</p>

                        {receiptSettings?.header_text && (
                            <div className="mt-4 border-t border-dashed border-gray-300 pt-2 whitespace-pre-wrap">
                                {receiptSettings.header_text}
                            </div>
                        )}
                    </div>

                    {/* Order Info */}
                    <div className="mb-4 text-center border-b border-dashed border-gray-300 pb-2">
                        <p className="font-bold text-lg">Order #{order.daily_order_number || order.readable_id}</p>
                        <p className="text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-6">
                        {displayedItems.map((item: any, i: number) => (
                            <div key={i}>
                                <div className="flex justify-between font-bold">
                                    <span>{item.quantity}x {item.name_snapshot}</span>
                                    <span>{stationId ? '' : `£${(item.price_snapshot * item.quantity).toFixed(2)}`}</span>
                                </div>
                                {item.selected_modifiers?.map((mod: any, j: number) => (
                                    <div key={j} className="flex justify-between text-xs text-gray-500 pl-4 italic">
                                        <span>
                                            + {mod.name}
                                            {mod.location && mod.location !== 'whole' && ` (${mod.location})`}
                                            {mod.intensity && mod.intensity !== 'normal' && ` (${mod.intensity})`}
                                        </span>
                                        <span>{stationId ? '' : `£${mod.price.toFixed(2)}`}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>£{(order.metadata?.subtotal || 0).toFixed(2)}</span>
                        </div>
                        {(order.metadata?.delivery_fee || 0) > 0 && (
                            <div className="flex justify-between">
                                <span>Delivery Fee</span>
                                <span>£{order.metadata.delivery_fee.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-400 mt-2">
                            <span>TOTAL</span>
                            <span>£{order.total_amount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    {receiptSettings?.footer_text && (
                        <div className="mt-6 border-t border-dashed border-gray-300 pt-4 text-center whitespace-pre-wrap">
                            {receiptSettings.footer_text}
                        </div>
                    )}

                    <div className="mt-8 text-center text-xs text-gray-400">
                        Digital Receipt • {settings?.website_url}
                    </div>

                </div>

                {/* Actions */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-center">
                    <button
                        onClick={() => window.print()}
                        className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-black transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublicReceiptPage;
