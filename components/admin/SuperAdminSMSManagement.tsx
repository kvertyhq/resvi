import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, Trash2, Edit2, Tag, Percent } from 'lucide-react';

interface SMSPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    currency: string;
    is_active: boolean;
}

interface Coupon {
    id: string;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    usage_count: number;
    is_active: boolean;
    valid_until: string | null;
}

const SuperAdminSMSManagement: React.FC = () => {
    const [packages, setPackages] = useState<SMSPackage[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
    const [isCpnModalOpen, setIsCpnModalOpen] = useState(false);

    // Package Form
    const [pkgForm, setPkgForm] = useState<Partial<SMSPackage>>({
        name: '', credits: 100, price: 10, currency: 'GBP', is_active: true
    });

    // Coupon Form
    const [cpnForm, setCpnForm] = useState<Partial<Coupon>>({
        code: '', discount_type: 'percent', discount_value: 10, max_uses: null, is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [pkgRes, cpnRes] = await Promise.all([
            supabase.from('sms_packages').select('*').order('credits', { ascending: true }),
            supabase.from('coupons').select('*').order('created_at', { ascending: false })
        ]);

        if (pkgRes.error) console.error('Error fetching packages:', pkgRes.error);
        if (cpnRes.error) console.error('Error fetching coupons:', cpnRes.error);

        setPackages(pkgRes.data || []);
        setCoupons(cpnRes.data || []);
        setLoading(false);
    };

    const handleSavePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (pkgForm.id) {
                const { error } = await supabase.from('sms_packages').update(pkgForm).eq('id', pkgForm.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('sms_packages').insert([pkgForm]);
                if (error) throw error;
            }
            setIsPkgModalOpen(false);
            setPkgForm({ name: '', credits: 100, price: 10, currency: 'GBP', is_active: true });
            fetchData();
        } catch (error: any) {
            alert('Error saving package: ' + error.message);
        }
    };

    const handleDeletePackage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        try {
            const { error } = await supabase.from('sms_packages').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error: any) {
            alert('Error deleting package: ' + error.message);
        }
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (cpnForm.id) {
                const { error } = await supabase.from('coupons').update(cpnForm).eq('id', cpnForm.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('coupons').insert([cpnForm]);
                if (error) throw error;
            }
            setIsCpnModalOpen(false);
            setCpnForm({ code: '', discount_type: 'percent', discount_value: 10, max_uses: null, is_active: true });
            fetchData();
        } catch (error: any) {
            alert('Error saving coupon: ' + error.message);
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;
        try {
            const { error } = await supabase.from('coupons').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error: any) {
            alert('Error deleting coupon: ' + error.message);
        }
    };

    if (loading) return <div>Loading SMS Settings...</div>;

    return (
        <div className="space-y-8">

            {/* Packages Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center">
                        <Tag className="w-5 h-5 mr-2 text-brand-gold" />
                        SMS Packages
                    </h3>
                    <button
                        onClick={() => {
                            setPkgForm({ name: '', credits: 100, price: 10, currency: 'GBP', is_active: true });
                            setIsPkgModalOpen(true);
                        }}
                        className="text-sm bg-brand-dark-gray text-white px-3 py-1.5 rounded hover:bg-gray-800 flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Add Package
                    </button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {packages.map(pkg => (
                            <tr key={pkg.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pkg.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.credits}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Intl.NumberFormat('en-GB', { style: 'currency', currency: pkg.currency }).format(pkg.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => { setPkgForm(pkg); setIsPkgModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeletePackage(pkg.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Coupons Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center">
                        <Percent className="w-5 h-5 mr-2 text-brand-gold" />
                        Coupons
                    </h3>
                    <button
                        onClick={() => {
                            setCpnForm({ code: '', discount_type: 'percent', discount_value: 10, max_uses: null, is_active: true });
                            setIsCpnModalOpen(true);
                        }}
                        className="text-sm bg-brand-dark-gray text-white px-3 py-1.5 rounded hover:bg-gray-800 flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Add Coupon
                    </button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {coupons.map(cpn => (
                            <tr key={cpn.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">{cpn.code}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {cpn.discount_type === 'percent' ? `${cpn.discount_value}%` : `£${cpn.discount_value}`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {cpn.usage_count} {cpn.max_uses ? `/ ${cpn.max_uses}` : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cpn.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {cpn.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => { setCpnForm(cpn); setIsCpnModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteCoupon(cpn.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Package Modal */}
            {isPkgModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4">{pkgForm.id ? 'Edit' : 'Add'} Package</h3>
                        <form onSubmit={handleSavePackage}>
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input type="text" value={pkgForm.name || ''} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} className="w-full border rounded p-2" required />
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">Credits</label>
                                <input type="number" value={pkgForm.credits || 0} onChange={e => setPkgForm({ ...pkgForm, credits: parseInt(e.target.value) })} className="w-full border rounded p-2" required />
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">Price</label>
                                <input type="number" step="0.01" value={pkgForm.price || 0} onChange={e => setPkgForm({ ...pkgForm, price: parseFloat(e.target.value) })} className="w-full border rounded p-2" required />
                            </div>
                            <div className="mb-3">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={pkgForm.is_active} onChange={e => setPkgForm({ ...pkgForm, is_active: e.target.checked })} className="mr-2" />
                                    Active
                                </label>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsPkgModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Coupon Modal */}
            {isCpnModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4">{cpnForm.id ? 'Edit' : 'Add'} Coupon</h3>
                        <form onSubmit={handleSaveCoupon}>
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">Code</label>
                                <input type="text" value={cpnForm.code || ''} onChange={e => setCpnForm({ ...cpnForm, code: e.target.value.toUpperCase() })} className="w-full border rounded p-2" required />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select value={cpnForm.discount_type} onChange={e => setCpnForm({ ...cpnForm, discount_type: e.target.value as any })} className="w-full border rounded p-2">
                                        <option value="percent">Percentage</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Value</label>
                                    <input type="number" step="0.01" value={cpnForm.discount_value || 0} onChange={e => setCpnForm({ ...cpnForm, discount_value: parseFloat(e.target.value) })} className="w-full border rounded p-2" required />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">Max Uses (Optional)</label>
                                <input type="number" value={cpnForm.max_uses || ''} onChange={e => setCpnForm({ ...cpnForm, max_uses: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded p-2" />
                            </div>
                            <div className="mb-3">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={cpnForm.is_active} onChange={e => setCpnForm({ ...cpnForm, is_active: e.target.checked })} className="mr-2" />
                                    Active
                                </label>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsCpnModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminSMSManagement;
