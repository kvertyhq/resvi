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
                    customer:user_id(full_name, phone, address, postcode),
                    order_items (
                        quantity,
                        name_snapshot,
                        price_snapshot,
                        selected_modifiers,
                        excluded_toppings,
                        selected_replacers,
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
                    <div className="mb-4 text-center border-b border-dashed border-gray-300 pb-4">
                        <div className="mb-2">
                            <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {order.order_type === 'dine_in' ? 'Dine In' : 
                                 order.order_type === 'delivery' ? 'Delivery' : 
                                 order.order_type === 'collection' ? 'Collection' : 
                                 (order.order_source === 'pos' && order.order_type === 'takeaway') ? 'Walk In' : 
                                 order.order_type?.replace('_', ' ') || 'Order'}
                            </span>
                        </div>
                        <p className="font-bold text-lg">Order #{order.daily_order_number || order.readable_id || order.id?.slice(0, 8)}</p>
                        <p className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleString()}</p>
                        
                        {(order.customer || order.customer_name || order.customer_phone) && (
                            <div className="mt-3 text-xs pt-2 border-t border-gray-100 italic">
                                <p className="font-bold">{order.customer?.full_name || order.customer_name || 'Guest'}</p>
                                { (order.customer?.phone || order.customer_phone) && <p>{order.customer?.phone || order.customer_phone}</p> }
                                { order.order_type === 'delivery' && (order.customer?.address || order.customer_address) && (
                                    <p className="mt-1">{order.customer?.address || order.customer_address}{ (order.customer?.postcode || order.customer_postcode) ? `, ${order.customer?.postcode || order.customer_postcode}` : '' }</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-6">
                        {displayedItems.map((item: any, i: number) => (
                            <div key={i}>
                                <div className="flex justify-between font-bold">
                                    <span>{item.quantity}x {item.name_snapshot}</span>
                                    <span>{stationId ? '' : (item.price_snapshot * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                    <div className="text-xs text-gray-500 pl-4 italic">
                                        {(() => {
                                            const grouped = item.selected_modifiers.reduce((acc: any, mod: any) => {
                                                const gn = mod.modifier_group_name || 'Extras';
                                                if (!acc[gn]) acc[gn] = [];
                                                acc[gn].push(mod);
                                                return acc;
                                            }, {});

                                            return Object.entries(grouped).map(([gn, ms]: [string, any[]], j) => {
                                                const totalPrice = ms.reduce((sum, m) => sum + Number(m.price || 0), 0);
                                                return (
                                                    <div key={j} className="flex justify-between">
                                                        <span>
                                                            + {gn}: {ms.map(m => {
                                                                let s = m.name;
                                                                if (m.location && m.location !== 'whole') s += ` (${m.location})`;
                                                                if (m.intensity && m.intensity !== 'normal') s += ` (${m.intensity})`;
                                                                return s;
                                                            }).join(', ')}
                                                        </span>
                                                        <span>{stationId || totalPrice <= 0 ? '' : totalPrice.toFixed(2)}</span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                                {item.excluded_toppings?.map((excl: any, j: number) => (
                                    <div key={`excl-${j}`} className="flex justify-between text-xs text-red-500 pl-4 italic">
                                        <span>
                                            - NO {excl.name} {excl.group_name ? `(${excl.group_name})` : ''}
                                            {excl.replacement && (
                                                <span className="text-green-600 ml-1">
                                                    → {excl.replacement.name} {excl.replacement.group_name ? `(${excl.replacement.group_name})` : ''}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                                {item.selected_replacers?.map((repl: any, j: number) => (
                                    <div key={`repl-${j}`} className="flex justify-between text-xs text-red-600 pl-4 italic">
                                        <span>
                                            ✕ {repl.is_exclusion_only
                                                ? repl.name
                                                : (repl.ingredient_name?.toLowerCase().startsWith('no') 
                                                    ? `${repl.ingredient_name} → ${repl.name}`
                                                    : `No ${repl.ingredient_name} → ${repl.name}`)
                                            }
                                        </span>
                                        <span className="text-gray-400">
                                            {stationId || !repl.price_adjustment ? '' : repl.price_adjustment.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    {((settings?.show_tax !== false && order.tax_amount > 0) || (order.metadata?.delivery_fee || 0) > 0) ? (
                        <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
                            {settings?.show_tax !== false && order.tax_amount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tax</span>
                                    <span className="font-medium">{settings?.currency}{order.tax_amount?.toFixed(2)}</span>
                                </div>
                            )}
                            {(order.metadata?.delivery_fee || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span>Delivery Fee</span>
                                    <span>{settings?.currency || '£'}{order.metadata.delivery_fee.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-400 mt-2">
                                <span>TOTAL</span>
                                <span>{settings?.currency || '£'}{order.total_amount.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed border-gray-400 mt-2">
                            <span>TOTAL</span>
                            <span>{settings?.currency || '£'}{order.total_amount.toFixed(2)}</span>
                        </div>
                    )}

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
