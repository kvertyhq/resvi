import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import POSCategoryTabs from '../../components/pos/POSCategoryTabs';
import POSMenuGrid from '../../components/pos/POSMenuGrid';
import POSModifierModal from '../../components/pos/POSModifierModal';
import OrderSuccessModal from '../../components/pos/OrderSuccessModal';
import OrderUpdatedModal from '../../components/pos/OrderUpdatedModal';
import POSPaymentModal from '../../components/pos/POSPaymentModal';
import MiscItemModal from '../../components/pos/MiscItemModal';
import HeldOrdersModal from '../../components/pos/HeldOrdersModal';
import NotificationModal from '../../components/pos/NotificationModal';
import { usePOS } from '../../context/POSContext';
import { useOffline } from '../../context/OfflineContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { receiptService } from '../../services/ReceiptService';
import { Pause, X } from 'lucide-react';

interface CartItem {
    tempId: string; // unique for cart
    id: string | null; // menu item id (null for misc items)
    name: string;
    price: number;
    basePrice: number;
    quantity: number;
    modifiers: any[];
    notes?: string;
    course: string; // 'Starter', 'Main', 'Dessert', 'Drink'
    isMiscellaneous?: boolean; // Flag for custom items
    station_id?: string; // Target station for this item
}

const COURSES = ['Starter', 'Main', 'Dessert', 'Drink'];

const POSOrderPage: React.FC = () => {
    const { tableId } = useParams<{ tableId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');
    const specificOrderId = searchParams.get('orderId');
    const { settings } = useSettings();
    const { staff } = usePOS();
    const { isOnline, addToQueue } = useOffline();

    // Check if this is a walk-in order
    const isWalkIn = tableId === 'walk-in';

    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [itemModifiersMap, setItemModifiersMap] = useState<Set<string>>(new Set()); // Set of itemIds that have modifiers

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(true);
    const [tableName, setTableName] = useState('');

    // Walk-in customer selection
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Mobile Responsive State
    const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

    // Cart State
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [currentMaxRound, setCurrentMaxRound] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemForModal, setItemForModal] = useState<any>(null);

    // Discount State
    const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('percentage');
    const [discountValue, setDiscountValue] = useState(0);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

    // Success Modal
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateModalTitle, setUpdateModalTitle] = useState('');
    const [createdOrderId, setCreatedOrderId] = useState('');
    const [createdDailyOrderNumber, setCreatedDailyOrderNumber] = useState<number | undefined>(undefined);

    // Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
    const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
    const [showCashDrawerButton, setShowCashDrawerButton] = useState(false);
    const [stripePromise, setStripePromise] = useState<any>(null);

    // Misc Item Modal
    const [showMiscItemModal, setShowMiscItemModal] = useState(false);

    // Held Orders
    const [heldOrders, setHeldOrders] = useState<any[]>([]);
    const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
    const [isHoldingOrder, setIsHoldingOrder] = useState(false);

    // Notification Modal
    const [showNotification, setShowNotification] = useState(false);
    const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('success');
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');

    useEffect(() => {
        if (settings?.id) {
            fetchData();
        }
        // Initialize Stripe
        if (settings?.payment_settings?.stripe_config?.publishable_key) {
            setStripePromise(loadStripe(settings.payment_settings.stripe_config.publishable_key));
        }
    }, [settings?.id]);

    useEffect(() => {
        if (tableId && !isWalkIn) {
            supabase.from('table_info').select('table_name').eq('id', tableId).single()
                .then(({ data }) => {
                    if (data) setTableName(data.table_name);
                });
        }
    }, [tableId, isWalkIn]);

    // Check for held order data from navigation state
    useEffect(() => {
        const state = location.state as { heldOrder?: any; customer?: any };
        if (state?.heldOrder) {
            const heldOrder = state.heldOrder;

            // Populate cart with held order items
            setCartItems(heldOrder.items);

            // Set discount if any
            if (heldOrder.discount_type) {
                setDiscountType(heldOrder.discount_type);
                // Calculate discount value for display
                if (heldOrder.discount_type === 'flat') {
                    setDiscountValue(heldOrder.discount_amount);
                } else {
                    // For percentage, calculate from subtotal
                    const subtotalFromItems = heldOrder.items.reduce((sum: number, item: any) =>
                        sum + (item.price * item.quantity), 0);
                    const percentageValue = (heldOrder.discount_amount / subtotalFromItems) * 100;
                    setDiscountValue(percentageValue);
                }
            }

            // Clear the navigation state to prevent re-loading on refresh
            navigate(location.pathname, { replace: true, state: {} });
        } else if (state?.customer) {
            // Populate walk-in order customer from incoming call
            setSelectedCustomer(state.customer);
            // Clear the navigation state 
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Categories
            const { data: catData } = await supabase
                .from('menu_categories')
                .select('*')
                .eq('restaurant_id', settings?.id)
                .order('order_index');
            if (catData) setCategories(catData);

            // Menu Items
            const { data: itemData } = await supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', settings?.id)
                .eq('is_available', true);

            if (itemData) {
                setMenuItems(itemData);

                // Check which items have modifiers
                const itemIds = itemData.map(i => i.id);
                const { data: modLinks } = await supabase
                    .from('menu_item_modifiers')
                    .select('menu_item_id')
                    .in('menu_item_id', itemIds);

                if (modLinks) {
                    const modSet = new Set(modLinks.map(l => l.menu_item_id));
                    setItemModifiersMap(modSet as any); // TS nuance
                }
            }

        } catch (error) {
            console.error('Error fetching POS data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Search for customers (for walk-in orders)
    const searchCustomers = async (query: string) => {
        if (!query || query.length < 2) {
            setCustomerResults([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .eq('restaurant_id', settings?.id)
                .eq('role', 'customer')
                .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;
            setCustomerResults(data || []);
            setShowCustomerDropdown(true);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    };

    // Debounced customer search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isWalkIn && customerSearch) {
                searchCustomers(customerSearch);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [customerSearch, isWalkIn]);


    // Fetch existing open order for table (skip for walk-in)
    useEffect(() => {
        if (tableId && !isWalkIn) {
            fetchExistingOrder();
        }
    }, [tableId, isWalkIn]);

    // Existing Items State
    const [submittedItems, setSubmittedItems] = useState<any[]>([]);

    const fetchExistingOrder = async () => {
        // If mode is new, don't fetch any existing order (start fresh)
        if (mode === 'new') return;

        let query = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    menu_item: menu_items ( name )
                )
            `)
            .eq('table_id', tableId);

        // If specific ID requested, fetch that one
        if (specificOrderId) {
            query = query.eq('id', specificOrderId);
        } else {
            // Otherwise fetch any open status
            query = query.in('status', ['pending', 'preparing', 'ready']);
        }

        const { data } = await query.maybeSingle();

        if (data) {
            setCurrentOrder(data);
            if (data.order_items) {
                setSubmittedItems(data.order_items);
                // Calculate Max Round
                const rounds = data.order_items.map((i: any) => i.round_number || 1);
                const maxRound = Math.max(0, ...rounds);
                setCurrentMaxRound(maxRound);
            }
        }
    };

    const handleItemClick = (item: any) => {
        if (itemModifiersMap.has(item.id)) {
            // Open Modal
            setItemForModal(item);
            setIsModalOpen(true);
        } else {
            // Add directly
            addToCart(item, [], item.price);
        }
    };

    const addToCart = (item: any, modifiers: any[], finalPrice: number) => {
        // Check if item with same ID, price, and modifiers already exists
        const existingItemIndex = cartItems.findIndex(cartItem => {
            // Check if same item ID and price
            if (cartItem.id !== item.id || cartItem.price !== finalPrice) {
                return false;
            }

            // Check if modifiers match
            if (cartItem.modifiers.length !== modifiers.length) {
                return false;
            }

            // Compare each modifier
            const cartModifierIds = cartItem.modifiers.map(m => m.id).sort();
            const newModifierIds = modifiers.map(m => m.id).sort();

            return JSON.stringify(cartModifierIds) === JSON.stringify(newModifierIds);
        });

        if (existingItemIndex !== -1) {
            // Item exists, increment quantity
            setCartItems(prev => prev.map((cartItem, index) =>
                index === existingItemIndex
                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                    : cartItem
            ));
        } else {
            // New item, add to cart
            const newItem: CartItem = {
                tempId: crypto.randomUUID(),
                id: item.id,
                name: item.name,
                basePrice: item.price,
                price: finalPrice,
                quantity: 1,
                modifiers: modifiers,
                course: 'Main', // Default
                station_id: item.station_id
            };
            setCartItems(prev => [...prev, newItem]);
        }
    };

    const removeFromCart = (tempId: string) => {
        setCartItems(prev => prev.filter(i => i.tempId !== tempId));
    };

    const incrementQuantity = (tempId: string) => {
        setCartItems(prev => prev.map(i =>
            i.tempId === tempId ? { ...i, quantity: i.quantity + 1 } : i
        ));
    };

    const decrementQuantity = (tempId: string) => {
        setCartItems(prev => {
            const updated = prev.map(i => {
                if (i.tempId === tempId) {
                    const newQuantity = i.quantity - 1;
                    // Only remove if quantity would become 0
                    if (newQuantity <= 0) {
                        return null; // Mark for removal
                    }
                    return { ...i, quantity: newQuantity };
                }
                return i;
            }).filter(i => i !== null); // Remove null items

            return updated as CartItem[];
        });
    };

    const updateItemNote = (tempId: string, note: string) => {
        setCartItems(prev => prev.map(i => i.tempId === tempId ? { ...i, notes: note } : i));
    };

    const handleAddMiscItem = (name: string, price: number, notes?: string) => {
        const miscItem: CartItem = {
            tempId: `misc-${Date.now()}-${Math.random()}`,
            id: null, // No menu item ID for misc items
            name: name,
            price: price,
            basePrice: price,
            quantity: 1,
            modifiers: [],
            course: 'Main',
            isMiscellaneous: true,
            notes: notes
        };
        setCartItems(prev => [...prev, miscItem]);
    };

    const updateItemCourse = (tempId: string, course: string) => {
        setCartItems(prev => prev.map(i => i.tempId === tempId ? { ...i, course } : i));
    };

    // Fetch cash drawer button setting and held orders
    useEffect(() => {
        const fetchSetting = async () => {
            if (!settings?.id) return;
            try {
                const { data } = await supabase.rpc('get_receipt_settings', {
                    p_restaurant_id: settings.id
                });
                setShowCashDrawerButton(data?.show_cash_drawer_button ?? false);
            } catch (error) {
                console.error('Error fetching cash drawer setting:', error);
            }
        };
        fetchSetting();
        fetchHeldOrders();
    }, [settings?.id]);

    const handleOpenCashDrawer = async () => {
        await receiptService.openCashDrawer();
    };

    // Fetch held orders
    const fetchHeldOrders = async () => {
        if (!settings?.id) return;

        try {
            const { data, error } = await supabase.rpc('get_held_orders', {
                p_restaurant_id: settings.id
            });

            if (error) throw error;
            setHeldOrders(data || []);
        } catch (error) {
            console.error('Error fetching held orders:', error);
        }
    };

    // Hold current order
    const handleHoldOrder = async () => {
        if (cartItems.length === 0) return;
        if (!settings?.id) return;

        setIsHoldingOrder(true);
        try {
            const { error } = await supabase.rpc('create_held_order', {
                p_restaurant_id: settings.id,
                p_staff_id: staff?.id || null,
                p_customer_id: selectedCustomer?.id || null,
                p_items: cartItems,
                p_subtotal: subtotal,
                p_discount_type: discountType,
                p_discount_amount: discountAmount,
                p_tax: tax,
                p_total: total,
                p_order_type: isWalkIn ? 'walkin' : 'table',
                p_table_id: currentOrder?.table_id || null,
                p_notes: null
            });

            if (error) throw error;

            // Clear cart and reset state
            setCartItems([]);
            setSelectedCustomer(null);
            setDiscountType(null);
            setDiscountValue(0);

            // Refresh held orders
            fetchHeldOrders();

            // Show success notification
            setNotificationType('success');
            setNotificationTitle('Order Held Successfully!');
            setNotificationMessage('The order has been saved and you can retrieve it later.');
            setShowNotification(true);
        } catch (error) {
            console.error('Error holding order:', error);
            setNotificationType('error');
            setNotificationTitle('Failed to Hold Order');
            setNotificationMessage('Please try again.');
            setShowNotification(true);
        } finally {
            setIsHoldingOrder(false);
        }
    };

    // Retrieve held order
    const handleRetrieveHeldOrder = async (heldOrder: any) => {
        try {
            // Populate cart with held order items
            setCartItems(heldOrder.items);

            // Set discount if any
            if (heldOrder.discount_type) {
                setDiscountType(heldOrder.discount_type);
                // Calculate discount value for display
                if (heldOrder.discount_type === 'flat') {
                    setDiscountValue(heldOrder.discount_amount);
                } else {
                    // For percentage, we need to calculate from subtotal
                    const subtotalFromItems = heldOrder.items.reduce((sum: number, item: any) =>
                        sum + (item.price * item.quantity), 0);
                    const percentageValue = (heldOrder.discount_amount / subtotalFromItems) * 100;
                    setDiscountValue(percentageValue);
                }
            }

            // Delete held order from database
            await supabase.rpc('delete_held_order', {
                p_held_order_id: heldOrder.id
            });

            // Close modal
            setShowHeldOrdersModal(false);

            // Refresh held orders list
            fetchHeldOrders();
        } catch (error) {
            console.error('Error retrieving held order:', error);
            setNotificationType('error');
            setNotificationTitle('Failed to Retrieve Order');
            setNotificationMessage('Please try again.');
            setShowNotification(true);
        }
    };

    const handlePaymentSuccess = async (method: string, transactionId?: string) => {
        setPaymentMethod(method);
        setPaymentTransactionId(transactionId || null);
        setShowPaymentModal(false);

        // Create order with payment details
        setLoading(true);
        try {
            const orderItems = cartItems.map(item => ({
                menu_item_id: item.isMiscellaneous ? null : item.id,
                quantity: item.quantity,
                price: item.price,
                modifiers: item.modifiers,
                notes: item.notes || null,
                course: item.course,
                is_miscellaneous: item.isMiscellaneous || false,
                custom_item_name: item.isMiscellaneous ? item.name : null,
                name: item.name,
                station_id: item.station_id
            }));

            const { data, error: rpcError } = await supabase.rpc('create_walkin_order', {
                p_restaurant_id: settings?.id,
                p_staff_id: staff?.id,
                p_order_items: orderItems,
                p_total_amount: total,
                p_user_id: selectedCustomer?.id || null,
                p_discount_type: discountType || null,
                p_discount_amount: discountAmount || 0,
                p_payment_method: method,
                p_payment_transaction_id: transactionId || null
            });

            if (rpcError) throw rpcError;

            const result = data as any;
            if (!result.success) {
                throw new Error(result.error || 'Failed to create walk-in order');
            }

            // Success - show modal
            setCreatedOrderId(result.order_uuid || result.order_id); // Prefer explicit UUID
            setCreatedDailyOrderNumber(result.daily_order_number);
            setShowSuccessModal(true);
            setCartItems([]);

            // Auto-print receipt if enabled
            const orderId = result.order_uuid || result.order_id;
            if (orderId && settings?.id) {
                await receiptService.printOrder(orderId, settings.id);
            }
        } catch (error) {
            console.error('Order failed:', error);
            alert('Failed to create order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) return;
        if (!settings?.id) return;

        // For walk-in orders, show payment modal first
        if (isWalkIn) {
            setShowPaymentModal(true);
            return;
        }

        // Offline Handling
        if (!isOnline) {
            // ... existing offline logic (omitted for brevity, ideally needs update to support append too, but focus on online first)
            // simplified for unchanged blocks
            addToQueue({
                type: 'place_order',
                payload: {
                    table_id: tableId,
                    items: cartItems,
                    total: total, // Logic needs update for partial
                    staff_id: staff?.id,
                    restaurant_id: settings.id
                }
            });
            setCartItems([]);
            navigate('/pos');
            return;
        }

        setLoading(true);
        if (!tableId) return;

        try {
            // Only update if status is pending or confirmed (and not in new mode)
            const canUpdate = currentOrder && ['pending', 'confirmed'].includes(currentOrder.status) && mode !== 'new';

            let orderId = canUpdate ? currentOrder.id : null;
            let currentRound = 1;

            if (!orderId) {
                // 1. Create New Order
                // Walk-in orders are now handled by payment modal
                if (!isWalkIn) {
                    // Regular table order - use direct insert
                    const { data: orderData, error: orderError } = await supabase
                        .from('orders')
                        .insert({
                            restaurant_id: settings?.id,
                            table_id: tableId,
                            total_amount: total,
                            status: 'pending',
                            order_type: 'dine_in',
                            is_pos: true,
                            staff_id: staff?.id,
                            discount_amount: discountAmount,
                            discount_type: discountType,
                            user_id: null
                        })
                        .select()
                        .single();

                    if (orderError) throw orderError;
                    if (orderError) throw orderError;
                    orderId = orderData.id;
                    if (orderData.daily_order_number) setCreatedDailyOrderNumber(orderData.daily_order_number);
                    setUpdateModalTitle('Order Created Successfully!');
                }
            } else {
                currentRound = currentMaxRound + 1;
                setUpdateModalTitle(`Order Updated! (Round ${currentRound} sent)`);
                // 2. Update Existing Order Total
                // Calculate new items total (with tax logic matching main render)
                const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                // Discount logic for cart items?
                // Assuming discount is applied globally or per transaction. 
                // For simplicity in Append mode, we apply tax to the new items directly without new discounts unless specified.
                // Replicating Line 253 logic:
                // Note: If we want to support discounts on add-ons, we need more complex logic.
                // For now, let's assume no new discount on add-ons or simple tax.
                const cartTax = cartSubtotal * 0.10;
                const cartTotal = cartSubtotal + cartTax;

                const newTotal = (currentOrder.total_amount || 0) + cartTotal;

                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        total_amount: newTotal,
                    })
                    .eq('id', orderId);

                if (currentOrder.daily_order_number) {
                    setCreatedDailyOrderNumber(currentOrder.daily_order_number);
                }

                if (updateError) throw updateError;
            }

            // 3. Create Order Items (New Items Only) - Only for table orders
            const orderItems = cartItems.map(item => ({
                order_id: orderId,
                menu_item_id: item.isMiscellaneous ? null : item.id,
                quantity: item.quantity,
                price_snapshot: item.price,
                selected_modifiers: item.modifiers,
                notes: item.notes,
                course_name: item.course,
                round_number: currentRound,
                is_miscellaneous: item.isMiscellaneous || false,
                custom_item_name: item.isMiscellaneous ? item.name : null,
                name_snapshot: item.name, // Always store the name
                station_id: item.station_id
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Success
            setCreatedOrderId(orderId);
            setShowUpdateModal(true);
            setCartItems([]);

            // Auto-print receipt if enabled (for new orders or updates)
            if (orderId && settings?.id) {
                await receiptService.printOrder(orderId, settings.id);
            }
            // navigate('/pos'); // Handled by modal close
        } catch (error) {
            console.error('Order failed:', error);
            alert('Failed to place order.');
        } finally {
            setLoading(false);
        }
    };

    const completeOrder = async () => {
        if (!currentOrder?.id) return;
        if (!window.confirm('Are you sure you want to complete this order and free the table?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', currentOrder.id);

            if (error) throw error;
            navigate('/pos');
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Failed to complete order');
            setLoading(false);
        }
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate Discount
    let discountAmount = 0;
    if (discountValue > 0) {
        if (discountType === 'flat') {
            discountAmount = discountValue;
        } else {
            discountAmount = subtotal * (discountValue / 100);
        }
    }
    // ensure discount doesn't exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const tax = taxableAmount * 0.10; // 10% tax on discounted amount
    const total = taxableAmount + tax;

    const filteredItems = selectedCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category_id === selectedCategory);

    return (
        <div className="flex h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden relative transition-colors duration-300">
            {/* Modal */}
            <POSModifierModal
                isOpen={isModalOpen}
                menuItem={itemForModal}
                onClose={() => setIsModalOpen(false)}
                onAddToCart={addToCart}
            />

            <OrderUpdatedModal
                isOpen={showUpdateModal}
                orderId={createdOrderId}
                dailyOrderNumber={createdDailyOrderNumber}
                title={updateModalTitle}
                onClose={() => {
                    setShowUpdateModal(false);
                    navigate('/pos');
                }}
            />

            {/* Left Side: Menu Area */}
            <div className={`flex-1 flex flex-col p-4 gap-4 overflow-hidden border-r border-gray-200 dark:border-gray-800 transition-colors duration-300 ${mobileTab === 'menu' ? 'flex' : 'hidden md:flex'}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate(isWalkIn ? '/pos/walk-in' : '/pos')}
                                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title={isWalkIn ? 'Back to Walk-In Orders' : 'Back to Map'}
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {isWalkIn ? 'Walk-In Order' : (tableName || 'Unknown Table')}
                                <span className="md:hidden text-xs font-normal text-gray-500">
                                    ({filteredItems.length} items)
                                </span>
                            </h2>
                        </div>
                        {isWalkIn && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search customer (name, phone)..."
                                    value={selectedCustomer ? selectedCustomer.full_name : customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        if (selectedCustomer) setSelectedCustomer(null);
                                    }}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                                {selectedCustomer && (
                                    <button
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            setCustomerSearch('');
                                        }}
                                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                                {showCustomerDropdown && customerResults.length > 0 && !selectedCustomer && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {customerResults.map((customer) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setShowCustomerDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-0"
                                            >
                                                <div className="font-medium text-gray-900 dark:text-white">{customer.full_name}</div>
                                                {customer.phone && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {customer.phone}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="md:hidden">
                        <button
                            onClick={() => setMobileTab('cart')}
                            className="bg-[var(--theme-color)] text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg animate-pulse"
                        >
                            Cart ({cartItems.length})
                        </button>
                    </div>
                </div>

                <POSCategoryTabs
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelect={setSelectedCategory}
                />

                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">Loading Menu...</div>
                ) : (
                    <div className="flex-1 overflow-y-auto scrollbar-hide pb-20 md:pb-0">
                        <POSMenuGrid items={filteredItems} onItemClick={handleItemClick} />
                    </div>
                )}
            </div>

            {/* Right Side: Cart Panel */}
            <div className={`w-full md:w-96 bg-white dark:bg-gray-800 flex flex-col shadow-2xl relative z-10 border-l border-gray-200 dark:border-gray-700 transition-colors duration-300 ${mobileTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-gray-900 dark:text-white font-bold text-lg">Order Summary</h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {submittedItems.length > 0 && `${submittedItems.length} Submitted • `}
                            {cartItems.length} New Items
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                fetchHeldOrders();
                                setShowHeldOrdersModal(true);
                            }}
                            className="relative text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                            title="View Held Orders"
                        >
                            <Pause className="h-3 w-3" />
                            Held
                            {heldOrders.length > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                    {heldOrders.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setShowMiscItemModal(true)}
                            className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title="Add Custom Item"
                        >
                            + Misc
                        </button>
                        <button
                            onClick={() => setMobileTab('menu')}
                            className="md:hidden text-gray-500 hover:text-gray-900"
                        >
                            Back to Menu
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Submitted Items (Read-Only) */}
                    {submittedItems.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sent to Kitchen</h4>
                            {submittedItems.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex justify-between opacity-80">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-gray-900 dark:text-white font-medium">
                                                {item.quantity}x {item.menu_item?.name || 'Unknown Item'}
                                            </span>
                                            <span className="text-gray-900 dark:text-white font-mono text-sm">
                                                {settings?.currency || '$'}{((item.price_snapshot || item.price) * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                        {/* Modifiers? */}
                                        {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                            <div className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-300">
                                                {item.selected_modifiers.map((m: any, i: number) => (
                                                    <div key={i}>+ {m.name}</div>
                                                ))}
                                            </div>
                                        )}
                                        {item.notes && <div className="text-xs text-orange-500 mt-1 italic">"{item.notes}"</div>}
                                    </div>
                                </div>
                            ))}
                            <div className="border-b border-gray-200 dark:border-gray-700 my-2"></div>
                        </div>
                    )}

                    {/* New Cart Items */}
                    {cartItems.length === 0 && submittedItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2 opacity-50 my-10">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            <p>No items added</p>
                        </div>
                    ) : (
                        cartItems.map((item) => (
                            <div key={item.tempId} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex justify-between group animate-fadeIn transition-colors">
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-900 dark:text-white font-bold">{item.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-gray-900 dark:text-white font-mono">{settings?.currency || '$'}{(item.price * item.quantity).toFixed(2)}</span>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => decrementQuantity(item.tempId)}
                                                    className="w-6 h-6 flex items-center justify-center bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded transition-colors"
                                                    title="Decrease quantity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                                    </svg>
                                                </button>
                                                <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => incrementQuantity(item.tempId)}
                                                    className="w-6 h-6 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                    title="Increase quantity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.tempId)}
                                                className="text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-xs"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>

                                    {/* Course Selector */}
                                    <div className="mt-2">
                                        <select
                                            value={item.course}
                                            onChange={(e) => updateItemCourse(item.tempId, e.target.value)}
                                            style={{ color: 'var(--theme-color)' }}
                                            className="bg-white dark:bg-gray-800 text-xs rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 outline-none focus:border-[var(--theme-color)] transition-colors"
                                        >
                                            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-0.5 border-t border-gray-300 dark:border-gray-600 pt-1">
                                            {item.modifiers.map((mod, idx) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span>+ {mod.name}</span>
                                                    {Number(mod.price) > 0 && <span>{settings?.currency || '$'}{Number(mod.price).toFixed(2)}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Notes Section */}
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            placeholder="Add note..."
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[var(--theme-color)] outline-none transition-colors"
                                            value={item.notes || ''}
                                            onChange={(e) => updateItemNote(item.tempId, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2 transition-colors duration-300">
                    {/* Discount Button */}
                    <button
                        onClick={() => setIsDiscountModalOpen(true)}
                        className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        {discountValue > 0
                            ? `Discount Applied: ${discountType === 'flat' ? (settings?.currency || '$') + discountValue : discountValue + '%'}`
                            : 'Apply Discount'}
                    </button>

                    <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                        <span>Subtotal</span>
                        <span>{settings?.currency || '$'}{subtotal.toFixed(2)}</span>
                    </div>

                    {discountValue > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400 text-sm">
                            <span>Discount ({discountType === 'flat' ? 'Flat' : `${discountValue}%`})</span>
                            <span>-{settings?.currency || '$'}{discountAmount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                        <span>Tax (10%)</span>
                        <span>{settings?.currency || '$'}{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-900 dark:text-white font-bold text-xl pt-2 border-t border-gray-200 dark:border-gray-800">
                        <span>Cart Total</span>
                        <span>{settings?.currency || '$'}{total.toFixed(2)}</span>
                    </div>

                    {currentOrder && (
                        <div className="flex justify-between text-orange-500 font-bold text-lg pt-1">
                            <span>Grand Total</span>
                            <span>{settings?.currency || '$'}{((currentOrder.total_amount || 0) + total).toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {currentOrder && (
                            currentOrder.payment_status === 'paid' ? (
                                <button
                                    onClick={completeOrder}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl font-bold shadow-lg text-xl"
                                >
                                    Free Table
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate(`/pos/payment/${currentOrder.id}`)}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold shadow-lg text-xl"
                                >
                                    Pay
                                </button>
                            )
                        )}
                        <button
                            onClick={handleHoldOrder}
                            disabled={cartItems.length === 0 || isHoldingOrder}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-4 rounded-xl font-bold shadow-lg text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isHoldingOrder ? 'Holding...' : 'HOLD'}
                        </button>
                        <button
                            onClick={handlePlaceOrder}
                            disabled={cartItems.length === 0}
                            style={{ backgroundColor: 'var(--theme-color)' }}
                            className={`flex-[2] text-white py-4 rounded-xl font-bold shadow-lg text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all`}
                        >
                            {currentOrder && ['pending', 'confirmed'].includes(currentOrder.status) && mode !== 'new' ? 'Update Order' : 'Place Order'}
                        </button>
                    </div>

                    {/* Cash Drawer Button - Walk-in Mode Only */}
                    {isWalkIn && showCashDrawerButton && (
                        <button
                            onClick={handleOpenCashDrawer}
                            className="w-full mt-2 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-medium shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            🔓 Open Cash Drawer
                        </button>
                    )}
                </div>

                {/* Discount Modal */}
                {isDiscountModalOpen && (
                    <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scaleIn">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Apply Discount</h3>

                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setDiscountType('flat')}
                                    className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${discountType === 'flat'
                                        ? 'border-[var(--theme-color)] text-[var(--theme-color)] bg-[var(--theme-color)]/10'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                >
                                    Flat ({settings?.currency || '$'})
                                </button>
                                <button
                                    onClick={() => setDiscountType('percentage')}
                                    className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${discountType === 'percentage'
                                        ? 'border-[var(--theme-color)] text-[var(--theme-color)] bg-[var(--theme-color)]/10'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                >
                                    Percentage (%)
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-500 mb-1">Value</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                    className="w-full text-3xl font-bold text-center bg-gray-100 dark:bg-gray-700 rounded-xl py-4 outline-none focus:ring-2 focus:ring-[var(--theme-color)]"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsDiscountModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setIsDiscountModalOpen(false)}
                                    className="flex-1 py-3 bg-[var(--theme-color)] text-white rounded-xl font-bold hover:brightness-110"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Modal */}
                {stripePromise && (
                    <Elements stripe={stripePromise}>
                        <POSPaymentModal
                            isOpen={showPaymentModal}
                            onClose={() => setShowPaymentModal(false)}
                            amount={total}
                            onPaymentSuccess={handlePaymentSuccess}
                        />
                    </Elements>
                )}

                {/* Success Modal */}
                <OrderSuccessModal
                    isOpen={showSuccessModal}
                    onClose={() => {
                        setShowSuccessModal(false);
                        navigate('/pos/walk-in');
                    }}
                    orderId={createdOrderId}
                    dailyOrderNumber={createdDailyOrderNumber}
                    orderType="walkin"
                />

                {/* Misc Item Modal */}
                <MiscItemModal
                    isOpen={showMiscItemModal}
                    onClose={() => setShowMiscItemModal(false)}
                    onAdd={handleAddMiscItem}
                    currency={settings?.currency || '£'}
                />

                {/* Held Orders Modal */}
                <HeldOrdersModal
                    isOpen={showHeldOrdersModal}
                    onClose={() => setShowHeldOrdersModal(false)}
                    heldOrders={heldOrders}
                    onRetrieve={handleRetrieveHeldOrder}
                />

                {/* Notification Modal */}
                <NotificationModal
                    isOpen={showNotification}
                    onClose={() => setShowNotification(false)}
                    type={notificationType}
                    title={notificationTitle}
                    message={notificationMessage}
                />
            </div>
        </div>
    );
};

export default POSOrderPage;
