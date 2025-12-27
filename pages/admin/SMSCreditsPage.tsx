import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';
import { MessageSquare, CreditCard, History, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import CreditPaymentModal from '../../components/admin/CreditPaymentModal';

interface SMSPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    currency: string;
}

interface Transaction {
    id: string;
    amount: number;
    credits_added: number;
    transaction_type: string;
    created_at: string;
    description: string;
}

const SMSCreditsPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [balance, setBalance] = useState<number>(0);
    const [packages, setPackages] = useState<SMSPackage[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<SMSPackage | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchData();
        }
    }, [selectedRestaurantId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Balance
            const { data: creditData, error: creditError } = await supabase
                .from('restaurant_credits')
                .select('balance')
                .eq('restaurant_id', selectedRestaurantId)
                .maybeSingle(); // Changed to maybeSingle to handle no row

            if (creditError) {
                console.error('Error fetching balance:', creditError);
            }
            setBalance(creditData?.balance || 0);

            // 2. Get Packages
            const { data: pkgData, error: pkgError } = await supabase
                .from('sms_packages')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (pkgError) console.error('Error fetching packages:', pkgError);
            setPackages(pkgData || []);

            // 3. Get Transactions
            const { data: txData, error: txError } = await supabase
                .from('credit_transactions')
                .select('*')
                .eq('restaurant_id', selectedRestaurantId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (txError) console.error('Error fetching transactions:', txError);
            setTransactions(txData || []);

        } catch (error) {
            console.error('Error loading SMS data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyPackage = (pkg: SMSPackage) => {
        setSelectedPackage(pkg);
        setIsPaymentModalOpen(true);
    };

    if (!selectedRestaurantId) return <div className="p-8 text-center text-gray-500">Please select a restaurant context.</div>;
    if (loading) return <div className="p-8 text-center text-gray-500">Loading credits info...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-gray-800 flex items-center mb-6">
                <MessageSquare className="h-8 w-8 mr-3 text-brand-gold" />
                SMS Credits
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Balance & Packages */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Balance Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Current Balance</h3>
                            <div className="mt-2 flex items-baseline">
                                <span className="text-4xl font-bold text-gray-900">{balance}</span>
                                <span className="ml-2 text-gray-500">credits</span>
                            </div>
                        </div>
                        <div className="bg-brand-gold bg-opacity-10 p-4 rounded-full">
                            <MessageSquare className="h-8 w-8 text-brand-gold" />
                        </div>
                    </div>

                    {/* Packages Grid */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <CreditCard className="h-5 w-5 mr-2 text-gray-400" />
                            Purchase Credits
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {packages.map(pkg => (
                                <div key={pkg.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative flex flex-col">
                                    <h4 className="font-bold text-lg text-gray-900">{pkg.name}</h4>
                                    <div className="mt-4 mb-6 flex-grow">
                                        <span className="text-3xl font-bold text-gray-900">£{pkg.price}</span>
                                        <div className="text-sm text-gray-500 mt-1">{pkg.credits} credits</div>
                                    </div>
                                    <button
                                        onClick={() => handleBuyPackage(pkg)}
                                        className="w-full py-2 px-4 bg-brand-dark-gray text-white rounded hover:bg-gray-800 transition-colors flex items-center justify-center font-medium"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Transaction History */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 flex items-center">
                                <History className="h-5 w-5 mr-2 text-gray-400" />
                                History
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                            {transactions.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">No transactions yet.</div>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full 
                                                ${tx.transaction_type === 'purchase' ? 'bg-green-100 text-green-800' :
                                                    tx.transaction_type === 'usage' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                                {tx.transaction_type}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-sm text-gray-600 font-medium truncate w-32" title={tx.description}>
                                                {tx.description || 'Transaction'}
                                            </div>
                                            <div className={`font-bold text-sm ${tx.credits_added > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.credits_added > 0 ? '+' : ''}{tx.credits_added}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CreditPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                pkg={selectedPackage}
                restaurantId={selectedRestaurantId}
                onSuccess={() => {
                    fetchData();
                    // show success alert or toast if needed
                }}
            />
        </div>
    );
};

export default SMSCreditsPage;
