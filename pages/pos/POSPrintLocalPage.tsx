import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const POSPrintLocalPage: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [receiptSettings, setReceiptSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const savedData = localStorage.getItem('pos_temp_print_data');
            if (!savedData) {
                throw new Error('No print data found.');
            }

            const parsedData = JSON.parse(savedData);
            setData(parsedData);

            if (parsedData.restaurant_id) {
                // 1. Fetch Restaurant Settings
                const { data: restData } = await supabase.rpc('get_restaurant_settings', { p_id: parsedData.restaurant_id });
                setSettings(restData?.data || restData);

                // 2. Fetch Receipt Settings
                const { data: recData } = await supabase.rpc('get_receipt_settings', { p_restaurant_id: parsedData.restaurant_id });
                setReceiptSettings(recData);
            }

            // Auto-print after a short delay
            setTimeout(() => {
                window.print();
            }, 1000);

        } catch (err: any) {
            console.error('Error loading local print data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-500">Preparing Print View...</p>
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

    const { items, subtotal, tax, total, customer, tableName, orderType } = data;

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
                        <div className="mb-2">
                            <span className="bg-black text-white px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                                {orderType === 'dine_in' ? 'Dine In' : 
                                 orderType === 'delivery' ? 'Delivery' : 
                                 orderType === 'collection' ? 'Collection' : 
                                 orderType === 'takeaway' ? 'Walk In' : 
                                 orderType?.replace('_', ' ') || 'Order'}
                            </span>
                        </div>
                        <h2 className="text-lg font-black tracking-widest uppercase">{data.type === 'kot' ? 'Kitchen Ticket' : 'Bill Estimate'}</h2>
                        {tableName && <p className="text-xs font-bold mt-1">Table: {tableName}</p>}
                    </div>
                    {customer && (
                        <div className="mb-4 text-xs italic border-b border-dashed border-black pb-2">
                             <p className="font-bold text-sm not-italic">{customer.full_name || customer.name}</p>
                             {customer.phone && <p>Tel: {customer.phone}</p>}
                             {orderType === 'delivery' && (customer.address || customer.postcode) && (
                                 <p className="mt-1">{customer.address}{customer.postcode ? `, ${customer.postcode}` : ''}</p>
                             )}
                        </div>
                    )}
                    <p className="mt-2 text-xs">{format(new Date(), 'PPPP p')}</p>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-6 border-b border-dashed border-black pb-4">
                    {(() => {
                        const renderLocalItem = (item: any, isChild: boolean = false) => {
                            const uniqueKey = item.id || item.tempId || Math.random().toString();
                            return (
                                <div key={uniqueKey} className="mb-2">
                                    <div className={`flex justify-between font-bold ${isChild ? 'pl-4 text-[13px] text-gray-700' : ''}`}>
                                        <span>{item.quantity || 1}x {item.name || item.name_snapshot}</span>
                                        <span>{(() => {
                                            const q = Number(item.quantity || 1);
                                            const p = Number(item.price || item.price_snapshot || 0);
                                            const lineTotal = q * p;
                                            return (isChild && lineTotal <= 0) ? '' : lineTotal.toFixed(2);
                                        })()}</span>
                                    </div>
                                    
                                    {/* Unified Meta Details Rendering */}
                                    <div className="space-y-0.5">
                                        {/* Modifiers */}
                                        {(item.selected_modifiers || item.modifiers)?.map((mod: any, j: number) => (
                                            <div key={j} className={`flex justify-between text-[11px] italic text-gray-600 ${isChild ? 'pl-8' : 'pl-4'}`}>
                                                <span>
                                                    + {mod.modifier_group_name || mod.group_name ? `${mod.modifier_group_name || mod.group_name}: ` : ''}{mod.name} 
                                                </span>
                                                {mod.price > 0 && <span>{mod.price.toFixed(2)}</span>}
                                            </div>
                                        ))}
                                        
                                        {/* Exclusions */}
                                        {item.excluded_toppings?.map((excl: any, j: number) => (
                                            <div key={`excl-${j}`} className={`flex justify-between text-[11px] text-red-500 italic ${isChild ? 'pl-8' : 'pl-4'}`}>
                                                <span>- NO {excl.name}</span>
                                            </div>
                                        ))}

                                        {/* Replacers */}
                                        {item.selected_replacers?.map((repl: any, j: number) => (
                                            <div key={`repl-${j}`} className={`flex justify-between text-[11px] text-red-600 italic ${isChild ? 'pl-8' : 'pl-4'}`}>
                                                <span>✕ {repl.name}</span>
                                                {Number(repl.price_adjustment) > 0 && (
                                                    <span className="text-gray-400">{Number(repl.price_adjustment).toFixed(2)}</span>
                                                )}
                                            </div>
                                        ))}

                                        {item.notes && <p className={`text-[11px] text-blue-600 mt-0.5 italic ${isChild ? 'pl-8' : 'pl-4'}`}>"{item.notes}"</p>}
                                    </div>
                                </div>
                            );
                        };

                        // 1. Identify Saved Components (Hierarchy from parent_item_id)
                        const rootItems = items.filter((i: any) => !i.parent_item_id);
                        const allChildren = items.filter((i: any) => i.parent_item_id);
                        const rootIds = new Set(rootItems.map(i => i.id));

                        const components: React.ReactNode[] = [];

                        rootItems.forEach(item => {
                            components.push(renderLocalItem(item));
                            
                            // A: Check for children in basic items (Saved Deal components)
                            if (item.id) {
                                allChildren.filter(c => c.parent_item_id === item.id).forEach(c => {
                                    components.push(renderLocalItem(c, true));
                                });
                            }

                            // B: Check for in-memory selections (Unsaved Deal components)
                            if (item.isDeal && item.selections && Array.isArray(item.selections)) {
                                item.selections.forEach((sel: any) => {
                                    components.push(renderLocalItem(sel, true));
                                });
                            }
                        });

                        // 2. Orphans (Children whose parent is missing)
                        allChildren.filter(c => !rootIds.has(c.parent_item_id)).forEach(c => {
                            components.push(<div key={`orphan-label-${c.id}`} className="text-[10px] text-gray-400 pl-4 font-bold uppercase">(PART OF DEAL)</div>);
                            components.push(renderLocalItem(c));
                        });

                        return components;
                    })()}
                </div>

                {/* Totals */}
                <div className="space-y-1 mb-6">
                    {settings?.show_tax && tax > 0 && (
                        <div className="flex justify-between">
                            <span>Tax (10%)</span>
                            <span>{settings?.currency || '£'}{tax.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-black mt-2">
                        <span>TOTAL</span>
                        <span>{settings?.currency || '£'}{total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="text-center border-t border-dashed border-black pt-6 mt-10">
                    <p className="font-bold underline decoration-double">PRO-FORMA BILL</p>
                    <p className="text-xs text-gray-500 mt-2 italic">Not a tax invoice • Temporary estimate</p>
                </div>

                {/* Action Buttons (Hidden when printing) */}
                <div className="no-print mt-10 flex flex-col gap-2">
                    <button
                        onClick={() => window.print()}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Print Again
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

export default POSPrintLocalPage;
