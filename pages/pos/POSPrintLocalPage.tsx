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
                        <h2 className="text-lg font-black tracking-widest uppercase">{data.type === 'kot' ? 'Kitchen Ticket' : 'Bill Estimate'}</h2>
                        <p className="text-xs">{tableName || orderType || 'Order'}</p>
                    </div>
                    {customer && (
                        <div className="mb-2">
                             <p className="font-bold">{customer.full_name || customer.name}</p>
                             {customer.phone && <p>{customer.phone}</p>}
                        </div>
                    )}
                    <p className="mt-2 text-xs">{format(new Date(), 'PPPP p')}</p>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-6 border-b border-dashed border-black pb-4">
                    {items.map((item: any, i: number) => (
                        <div key={i}>
                            <div className="flex justify-between font-bold">
                                <span>{item.quantity}x {item.name}</span>
                                <span>{settings?.currency || '£'}{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.modifiers?.map((mod: any, j: number) => (
                                <div key={j} className="flex justify-between text-xs pl-4 italic">
                                    <span>+ {mod.name}</span>
                                    {mod.price > 0 && <span>{settings?.currency || '£'}{mod.price.toFixed(2)}</span>}
                                </div>
                            ))}
                            {item.notes && <p className="text-xs pl-4 text-gray-600 mt-1 italic">"{item.notes}"</p>}
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 mb-6">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{settings?.currency || '£'}{subtotal.toFixed(2)}</span>
                    </div>
                    {tax > 0 && (
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
