import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAlert } from './AlertContext';

interface OfflineAction {
    type: 'place_order';
    payload: any;
    timestamp: number;
}

interface OfflineContextType {
    isOnline: boolean;
    queueLength: number;
    addToQueue: (action: OfflineAction) => void;
    sync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
    isOnline: true,
    queueLength: 0,
    addToQueue: () => { },
    sync: async () => { },
});

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showAlert } = useAlert();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState<OfflineAction[]>([]);

    useEffect(() => {
        // Load initial queue
        const stored = localStorage.getItem('offlineQueue');
        if (stored) {
            try {
                setQueue(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse offline queue', e);
            }
        }

        // Listeners
        const handleOnline = () => {
            setIsOnline(true);
            attemptSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const saveQueue = (newQueue: OfflineAction[]) => {
        setQueue(newQueue);
        localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
    };

    const addToQueue = (action: OfflineAction) => {
        // Fallback IDs usually needed for offline items (e.g., negative IDs or UUIDs generated locally)
        // For simplicity, we assume payload has what it needs.
        const newQueue = [...queue, { ...action, timestamp: Date.now() }];
        saveQueue(newQueue);
        showAlert('Offline', 'You are offline. Action saved to queue.', 'info');
    };

    const attemptSync = async () => {
        const stored = localStorage.getItem('offlineQueue');
        if (!stored) return;

        const currentQueue: OfflineAction[] = JSON.parse(stored);
        if (currentQueue.length === 0) return;

        console.log('Attempting Sync of', currentQueue.length, 'items');

        const failed: OfflineAction[] = [];

        for (const action of currentQueue) {
            try {
                if (action.type === 'place_order') {
                    // Reconstruct Supabase call
                    const { table_id, items, total, staff_id, restaurant_id } = action.payload;

                    // 1. Create Order
                    const { data: order, error: orderError } = await supabase
                        .from('orders')
                        .insert({
                            restaurant_id,
                            table_id,
                            total_amount: total,
                            status: 'pending',
                            order_type: 'dine_in',
                            is_pos: true,
                            staff_id
                        })
                        .select()
                        .single();

                    if (orderError) throw orderError;

                    // 2. Insert Items
                    const orderItems = items.map((item: any) => ({
                        order_id: order.id,
                        menu_item_id: item.id,
                        quantity: item.quantity,
                        notes: item.notes,
                        course_name: item.course,
                        selected_modifiers: item.modifiers
                    }));

                    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
                    if (itemsError) throw itemsError;

                    console.log('Synced Order:', order.id);
                }
            } catch (error) {
                console.error('Sync failed for item', action, error);
                failed.push(action); // Keep in queue
            }
        }

        saveQueue(failed);
        if (failed.length === 0) {
            showAlert('Sync Success', 'All offline data synced successfully!', 'success');
        } else {
            showAlert('Sync Partial', `Sync complete. ${failed.length} items failed and kept in queue.`, 'warning');
        }
    };

    return (
        <OfflineContext.Provider value={{ isOnline, queueLength: queue.length, addToQueue, sync: attemptSync }}>
            {children}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => useContext(OfflineContext);
