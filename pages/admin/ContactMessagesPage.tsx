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

const ContactMessagesPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchMessages();
        }
    }, [selectedRestaurantId]);

    const fetchMessages = async () => {
        if (!selectedRestaurantId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('contact_messages')
            .select('*')
            .eq('restaurant_id', selectedRestaurantId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            setMessages(data || []);
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
            alert('Failed to update status');
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
            </div>
        </div>
    );
};

export default ContactMessagesPage;
