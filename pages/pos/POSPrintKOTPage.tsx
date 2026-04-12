import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const POSPrintKOTPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [searchParams] = useSearchParams();
    const stationId = searchParams.get('station_id');
    const roundNumber = searchParams.get('round');

    const [order, setOrder] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [stationName, setStationName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (orderId) {
            loadData();
        } else {
            setError("No order ID provided.");
            setLoading(false);
        }
    }, [orderId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Fetch order and items
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select(`
                    *,
                    table_info:table_id(table_name),
                    customer:user_id(full_name, phone)
                `)
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;

            // Fetch Items
            let itemsQuery = supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            if (stationId) {
                itemsQuery = itemsQuery.eq('station_id', stationId);
                const { data: sData } = await supabase.from('stations').select('name').eq('id', stationId).single();
                if (sData) setStationName(sData.name);
            }
            if (roundNumber) {
                itemsQuery = itemsQuery.eq('round_number', parseInt(roundNumber));
            }

            const { data: itemsData, error: itemsError } = await itemsQuery;
            if (itemsError) throw itemsError;

            // Fetch Restaurant Settings
            const { data: restData, error: restError } = await supabase
                .rpc('get_restaurant_settings', { p_id: orderData.restaurant_id });
            if (!restError && restData) {
                 setSettings(Array.isArray(restData.data) ? restData.data[0] : restData.data || restData);
            }

            setOrder({
                ...orderData,
                order_items: itemsData || []
            });

            // Auto-print after a short delay
            setTimeout(() => {
                window.print();
            }, 800);

        } catch (err: any) {
            console.error('Error loading KOT data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-500">Preparing Kitchen Ticket View...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <h1 className="text-lg font-bold text-gray-900 mb-2">Print Failed</h1>
                <p className="text-sm text-gray-500 mb-6">{error}</p>
                <button 
                    onClick={() => window.close()}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold"
                >
                    Close
                </button>
            </div>
        );
    }

    if (!order || !order.order_items || order.order_items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
                <h1 className="text-lg font-bold text-gray-900 mb-2">No Items Found</h1>
                <p className="text-sm text-gray-500 mb-6">There are no items to print for this station.</p>
                <button 
                    onClick={() => window.close()}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold"
                >
                    Close
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen p-4 text-black font-sans w-full max-w-[500px] mx-auto">
            <style>
                {`
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none; }
                }
                `}
            </style>

            {/* Huge KOT Header */}
            <div className="text-center border-b-4 border-black pb-4 mb-6">
                <h1 className="text-4xl font-black uppercase tracking-wider mb-2">
                    {stationName ? `${stationName} TICKET` : 'KITCHEN TICKET'}
                </h1>
                <div className="flex gap-2 justify-center flex-wrap mb-4">
                    <span className="bg-black text-white px-4 py-1 text-xl font-bold uppercase tracking-widest rounded-lg">
                        {order.order_type === 'dine_in' ? 'Dine In' : 
                         order.order_type === 'delivery' ? 'Delivery' : 
                         order.order_type === 'collection' ? 'Collection' : 
                         order.order_source === 'online' ? 'Online' : 'Walk In'}
                    </span>
                    {order.table_info?.table_name && (
                        <span className="bg-orange-500 text-white px-4 py-1 text-xl font-black uppercase tracking-widest rounded-lg">
                            Table {order.table_info.table_name}
                        </span>
                    )}
                </div>
                <div className="flex justify-between items-end">
                    <h2 className="text-2xl font-bold">#{order.daily_order_number || order.id.slice(0, 8)}</h2>
                    <p className="text-lg font-medium text-gray-700">{format(new Date(), 'HH:mm')}</p>
                </div>
            </div>

            {/* Items Section (HUGE FONTS) */}
            <div className="space-y-6">
                {order.order_items.map((item: any) => {
                    const itemName = item.name_snapshot || item.menu_item?.name || 'Unknown Item';
                    const modifiers = item.selected_modifiers || item.selected_addons || [];
                    const exclusions = item.excluded_toppings || [];

                    return (
                        <div key={item.id} className="border-b-2 border-dashed border-gray-400 pb-4">
                            {/* Quantity and Item Name Container via Flex Box */}
                            <div className="flex gap-4 items-start">
                                {/* Large Quantity Box */}
                                <div className="border-[3px] border-black rounded flex items-center justify-center p-2 min-w-[50px] font-black text-3xl shrink-0 leading-none">
                                    {item.quantity}
                                </div>
                                
                                {/* Item Data */}
                                <div className="flex-1 pt-1">
                                    <h3 className="text-3xl font-black uppercase leading-tight tracking-tight">
                                        {itemName}
                                    </h3>
                                    
                                    {/* Modifiers Container */}
                                    <div className="mt-2 pl-2 space-y-1">
                                        {/* Modifiers / Addons */}
                                        {Array.isArray(modifiers) && modifiers.map((mod: any, idx: number) => {
                                            const modName = mod.name || mod.modifier_item_name || mod.modifier_name;
                                            return (
                                                <div key={idx} className="text-2xl font-bold text-gray-800 uppercase flex items-center gap-2">
                                                    <span className="text-gray-400">+</span>
                                                    <span>
                                                        {modName}
                                                        {mod.location && mod.location !== 'whole' && ` (${mod.location})`}
                                                        {mod.intensity && mod.intensity !== 'normal' && ` (${mod.intensity})`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Exclusions */}
                                        {Array.isArray(exclusions) && exclusions.map((excl: any, idx: number) => (
                                            <div key={`excl-${idx}`} className="text-2xl font-black text-red-600 uppercase flex items-start gap-2">
                                                <span className="text-red-400">-</span>
                                                <span className="line-through decoration-[3px] opacity-80">NO {excl.name}</span>
                                            </div>
                                        ))}

                                        {/* Notes */}
                                        {item.notes && (
                                            <div className="text-xl font-bold italic text-blue-800 mt-2 p-2 bg-blue-50 border-l-4 border-blue-600">
                                                " {item.notes} "
                                            </div>
                                        )}

                                        {/* Ingredient Replacers */}
                                        {Array.isArray(item.selected_replacers) && item.selected_replacers.map((repl: any, idx: number) => (
                                            <div key={`repl-${idx}`} className="text-2xl font-black text-red-600 uppercase flex items-start gap-2">
                                                <span className="text-red-400">✕</span>
                                                <span>
                                                    {repl.is_exclusion_only
                                                        ? repl.name
                                                        : (repl.ingredient_name?.toLowerCase().startsWith('no') 
                                                            ? `${repl.ingredient_name} → ${repl.name}`
                                                            : `No ${repl.ingredient_name} → ${repl.name}`)
                                                    }
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Customer Information removed for Kitchen Tickets */}

            <div className="text-center mt-8 space-y-1">
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">— END OF ORDER —</p>
            </div>

            {/* Action Buttons (Hidden when printing) */}
            <div className="no-print mt-12 flex flex-col gap-3">
                <button
                    onClick={() => window.print()}
                    className="w-full bg-black text-white py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                    <Printer size={24} />
                    PRINT AGAIN
                </button>
                <button
                    onClick={() => window.close()}
                    className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl text-lg font-black active:scale-95 transition-transform"
                >
                    CLOSE WINDOW
                </button>
            </div>
        </div>
    );
};

export default POSPrintKOTPage;
