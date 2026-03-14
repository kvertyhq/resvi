import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Check, X, Mail, Calendar, User, MessageSquare } from 'lucide-react';

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    message: string;
    created_at: string;
    processed: boolean;
}

import { useAdmin } from '../../context/AdminContext';
import { useAlert } from '../../context/AlertContext';

const ContactMessagesPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const { showAlert } = useAlert();
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        if (selectedRestaurantId) {
            setCurrentPage(1);
            fetchMessages();
        }
    }, [selectedRestaurantId]);

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchMessages();
        }
    }, [currentPage]);

    const fetchMessages = async () => {
        if (!selectedRestaurantId) return;
        setLoading(true);

        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await supabase
            .from('contact_messages')
            .select('*', { count: 'exact' })
            .eq('restaurant_id', selectedRestaurantId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching messages:', error);
            setMessages([]);
            setTotalCount(0);
        } else {
            setMessages(data || []);
            setTotalCount(count || 0);
        }
        setLoading(false);
    };

    const toggleProcessed = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('contact_messages')
            .update({ processed: !currentStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating message:', error);
            showAlert('Error', 'Failed to update status', 'error');
        } else {
            // Optimistic update
            setMessages(messages.map(msg =>
                msg.id === id ? { ...msg, processed: !currentStatus } : msg
            ));
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading messages...</div>;
    }

    if (!selectedRestaurantId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 bg-white rounded-lg border border-gray-200 mt-8 max-w-6xl mx-auto">
                <p className="text-xl font-medium mb-2">No Restaurant Selected</p>
                <p>Please select a restaurant context to view messages.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-gray-800 mb-8">Contact Messages</h2>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {messages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        No messages found.
                                    </td>
                                </tr>
                            ) : (
                                messages.map((msg) => (
                                    <tr key={msg.id} className={msg.processed ? 'bg-gray-50' : 'bg-white'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${msg.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {msg.processed ? 'Processed' : 'New'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                {new Date(msg.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                                <div className="text-sm font-medium text-gray-900">{msg.name}</div>
                                            </div>
                                            <div className="flex items-center mt-1">
                                                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                                <div className="text-sm text-gray-500">{msg.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start">
                                                <MessageSquare className="h-4 w-4 mr-2 text-gray-400 mt-1 flex-shrink-0" />
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap max-w-xs">{msg.message}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => toggleProcessed(msg.id, msg.processed)}
                                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${msg.processed
                                                    ? 'text-yellow-600 hover:bg-yellow-50 border border-yellow-200'
                                                    : 'text-green-600 hover:bg-green-50 border border-green-200'
                                                    }`}
                                            >
                                                {msg.processed ? (
                                                    <>
                                                        <X className="h-4 w-4 mr-1" /> Mark Unprocessed
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4 mr-1" /> Mark Processed
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(page => Math.min(page + 1, Math.ceil(totalCount / itemsPerPage)))}
                                disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                                    <span className="font-medium">{totalCount}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                                ? 'bg-brand-gold text-white focus:z-20'
                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(page => Math.min(page + 1, Math.ceil(totalCount / itemsPerPage)))}
                                        disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactMessagesPage;
