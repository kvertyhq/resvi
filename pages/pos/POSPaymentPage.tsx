import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { usePOS } from '../../context/POSContext';
import { PrinterService } from '../../utils/sunmiPrinter';

const POSPaymentPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { staff } = usePOS();

    const [order, setOrder] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment State
    const [amountToPay, setAmountToPay] = useState<string>(''); // String for input handling
    const [splitMode, setSplitMode] = useState<'full' | 'equal' | 'custom'>('full');
    const [numSplits, setNumSplits] = useState(2);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (orderId) fetchOrderAndPayments();
    }, [orderId]);

    const fetchOrderAndPayments = async () => {
        setLoading(true);
        try {
            // Get order details with items
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select(`
                    *, 
                    table_info(table_name),
                    order_items (
                        quantity,
                        menu_items ( name, price ),
                        selected_modifiers
                    )
                `)
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;
            setOrder(orderData);

            // Get existing payments
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false });

            if (paymentsError) throw paymentsError;
            setPayments(paymentsData || []);

            // Set initial amount based on remaining
            const total = orderData.total_amount || 0;
            const paid = (paymentsData || []).reduce((sum: number, p: any) => sum + p.amount, 0);
            const remaining = Math.max(0, total - paid);
            setAmountToPay(remaining.toFixed(2));

        } catch (error) {
            console.error('Error fetching payment data:', error);
            alert('Could not load order');
            navigate('/pos');
        } finally {
            setLoading(false);
        }
    };

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = order ? Math.max(0, order.total_amount - totalPaid) : 0;

    // Recalculate default amount when mode changes
    useEffect(() => {
        if (splitMode === 'full') {
            setAmountToPay(remainingBalance.toFixed(2));
        } else if (splitMode === 'equal') {
            setAmountToPay((remainingBalance / numSplits).toFixed(2));
        } else {
            setAmountToPay(''); // Custom mode starts empty
        }
    }, [splitMode, numSplits, remainingBalance]);

    const processPayment = async () => {
        const amount = parseFloat(amountToPay);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (amount > remainingBalance + 0.01) { // Float tolerance
            alert('Amount exceeds remaining balance');
            return;
        }

        setProcessing(true);
        try {
            // 1. Record Payment
            const { error: payError } = await supabase
                .from('payments')
                .insert({
                    order_id: orderId,
                    amount: amount,
                    payment_method: paymentMethod,
                    status: 'completed',
                    created_by: staff?.id
                });

            if (payError) throw payError;

            // 2. Check if order is fully paid
            const newTotalPaid = totalPaid + amount;
            if (newTotalPaid >= (order.total_amount - 0.01)) {
                // Update order to paid
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ status: 'paid' })
                    .eq('id', orderId);

                if (updateError) throw updateError;

                // Clear table occupation (if enabled in your logic) - assuming status 'paid' clears it visually on map
                // In a real app, we might also reset the table occupation status in `table_info` if using that separate from orders.
                // For now, order status 'paid' is sufficient for history.

                alert('Order Paid in Full!');
                navigate('/pos');
            } else {
                alert(`Payment of $${amount.toFixed(2)} recorded. Remaining: $${(remainingBalance - amount).toFixed(2)}`);
                fetchOrderAndPayments(); // Refresh to show new balance
            }

        } catch (error: any) {
            alert('Payment execution failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="text-gray-900 dark:text-white p-8">Loading Payment...</div>;

    return (
        <div className="flex h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
            {/* Left: Bill Details */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-4">{order.table_info?.table_name} - Bill</h2>

                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-2">
                    <span>Total Amount</span>
                    <span>${order.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400 mb-2">
                    <span>Paid So Far</span>
                    <span>${totalPaid.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                <div className="flex justify-between text-3xl font-bold text-gray-900 dark:text-white mb-8">
                    <span>Due</span>
                    <span>${remainingBalance.toFixed(2)}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Payment History</h3>
                    {payments.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-600 text-sm">No payments yet.</p>
                    ) : (
                        payments.map(p => (
                            <div key={p.id} className="bg-white dark:bg-gray-800 p-3 rounded mb-2 text-sm flex justify-between shadow-sm border border-gray-100 dark:border-gray-700">
                                <div>
                                    <span className="capitalize text-gray-900 dark:text-white">{p.payment_method}</span>
                                    <div className="text-gray-500 dark:text-gray-500 text-xs">{new Date(p.created_at).toLocaleTimeString()}</div>
                                </div>
                                <span className="font-bold">${p.amount.toFixed(2)}</span>
                            </div>
                        ))
                    )}

                    <button onClick={() => navigate('/pos')} className="mt-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        &larr; Back to Order / Tables
                    </button>

                    <button
                        onClick={() => {
                            // Map structure for printer
                            const items = order.order_items.map((i: any) => ({
                                name: i.menu_items?.name,
                                price: i.menu_items?.price,
                                quantity: i.quantity,
                                modifiers: i.selected_modifiers
                            }));
                            PrinterService.printReceipt(order, items);
                        }}
                        className="mt-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 rounded font-bold transition-colors"
                    >
                        🖨️ Print Receipt
                    </button>
                </div>

                {/* Right: Payment Controls */}
                <div className="flex-1 p-6 flex flex-col items-center">
                    <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Process Payment</h1>

                    {/* Split Modes */}
                    <div className="flex gap-4 mb-8 w-full max-w-lg">
                        <button
                            onClick={() => setSplitMode('full')}
                            style={splitMode === 'full' ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}
                            className={`flex-1 py-4 rounded-xl font-bold text-lg border ${splitMode === 'full' ? 'text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}`}
                        >
                            Full Bill
                        </button>
                        <button
                            onClick={() => setSplitMode('equal')}
                            style={splitMode === 'equal' ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}
                            className={`flex-1 py-4 rounded-xl font-bold text-lg border ${splitMode === 'equal' ? 'text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}`}
                        >
                            Split Equal
                        </button>
                        <button
                            onClick={() => setSplitMode('custom')}
                            style={splitMode === 'custom' ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}
                            className={`flex-1 py-4 rounded-xl font-bold text-lg border ${splitMode === 'custom' ? 'text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}`}
                        >
                            Custom
                        </button>
                    </div>

                    {/* Only show split count for Equal mode */}
                    {splitMode === 'equal' && (
                        <div className="mb-8 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                            <button onClick={() => setNumSplits(Math.max(2, numSplits - 1))} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg text-xl font-bold shadow-sm">-</button>
                            <span className="text-xl font-bold w-32 text-center text-gray-900 dark:text-white">{numSplits} People</span>
                            <button onClick={() => setNumSplits(numSplits + 1)} className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg text-xl font-bold shadow-sm">+</button>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div className="mb-8 w-full max-w-lg">
                        <label className="block text-gray-500 dark:text-gray-400 mb-2 uppercase text-sm font-bold">Amount to Charge</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-500 dark:text-gray-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                value={amountToPay}
                                onChange={(e) => setSplitMode('custom') || setAmountToPay(e.target.value)}
                                onFocus={() => setSplitMode('custom')}
                                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl py-4 pl-10 pr-4 text-4xl font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[var(--theme-color)] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Method & Pay */}
                    <div className="w-full max-w-lg grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={`py-6 rounded-xl font-bold text-xl flex flex-col items-center justify-center border-2 transition-colors ${paymentMethod === 'card' ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-500 text-blue-700 dark:text-blue-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-500'}`}
                        >
                            <span>💳 Card</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('cash')}
                            className={`py-6 rounded-xl font-bold text-xl flex flex-col items-center justify-center border-2 transition-colors ${paymentMethod === 'cash' ? 'bg-green-50 dark:bg-green-900/50 border-green-500 text-green-700 dark:text-green-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-500'}`}
                        >
                            <span>💵 Cash</span>
                        </button>

                        <button
                            onClick={processPayment}
                            disabled={processing || !amountToPay}
                            style={{ backgroundColor: 'var(--theme-color)' }}
                            className="col-span-2 text-white py-6 rounded-xl font-bold text-2xl shadow-lg transform active:scale-95 transition-all mt-4 disabled:opacity-50 hover:brightness-110"
                        >
                            {processing ? 'Processing...' : `Charge $${parseFloat(amountToPay || '0').toFixed(2)}`}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default POSPaymentPage;
