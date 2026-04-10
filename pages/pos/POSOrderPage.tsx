import React, { useState, useEffect, useMemo, useRef } from 'react';

import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { useAlert } from '../../context/AlertContext';
import { useAdmin } from '../../context/AdminContext';
import { usePOS } from '../../context/POSContext';
import { useMenu } from '../../context/MenuContext';
import { useOffline } from '../../context/OfflineContext';

import POSCategoryTabs from '../../components/pos/POSCategoryTabs';
import POSMenuGrid from '../../components/pos/POSMenuGrid';
import POSModifierModal from '../../components/pos/POSModifierModal';
import OrderSuccessModal from '../../components/pos/OrderSuccessModal';
import OrderUpdatedModal from '../../components/pos/OrderUpdatedModal';
import POSPaymentModal from '../../components/pos/POSPaymentModal';
import MiscItemModal from '../../components/pos/MiscItemModal';
import HeldOrdersModal from '../../components/pos/HeldOrdersModal';
import NotificationModal from '../../components/pos/NotificationModal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { receiptService } from '../../services/ReceiptService';
import { Pause, X, Trash2, Printer, Check, Send, ShoppingCart, CreditCard, Pencil } from 'lucide-react';

interface CartItem {
    tempId: string; // unique for cart
    id: string | null; // menu item id (null for misc items)
    name: string;
    price: number;
    basePrice: number;
    quantity: number;
    modifiers: any[];
    excluded_toppings?: any[]; // toppings removed with optional replacements
    selected_replacers?: any[]; // structured swaps/replacements
    notes?: string;
    course: string; // 'Starter', 'Main', 'Dessert', 'Drink'
    isMiscellaneous?: boolean; // Flag for custom items
    station_id?: string; // Target station for this item
    category_id?: string; // Add this for tax calculation
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
    const { showAlert, showConfirm } = useAlert();
    const { staff } = usePOS();
    const { user } = useAdmin();
    const { isOnline, addToQueue } = useOffline();

    // Check if this is a walk-in order
    const isWalkIn = tableId === 'walk-in';

    const { categories, menuItems, itemModifiersMap, loading: menuLoading, isSyncing } = useMenu();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [loading, setLoading] = useState(false); // Action loading state
    const [tableName, setTableName] = useState('');



    // Walk-in/Phone customer selection
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Additional Customer fields for Phone Orders
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerPostcode, setCustomerPostcode] = useState('');
    const [isPhoneOrder, setIsPhoneOrder] = useState(false);
    const [callLogId, setCallLogId] = useState<string | null>(null);
    const [phoneOrderType, setPhoneOrderType] = useState<'delivery' | 'collection' | null>(null);
    const [phoneOrderTimeslot, setPhoneOrderTimeslot] = useState<{ date: string, time: string } | null>(null);

    // Mobile Responsive State
    const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

    // Cart State
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [currentMaxRound, setCurrentMaxRound] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemForModal, setItemForModal] = useState<any>(null);
    const [editingTempId, setEditingTempId] = useState<string | null>(null);
    const [initialModalData, setInitialModalData] = useState<{
        variant?: any;
        selections?: any;
        exclusions?: any;
        replacers?: any;
    }>({});

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

    // Cart Auto-scroll
    const cartEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        cartEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [cartItems.length]);

    // Totals Calculation
    const subtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [cartItems]);

    const discountAmount = useMemo(() => {
        if (discountValue <= 0) return 0;
        let amt = 0;
        if (discountType === 'flat') {
            amt = discountValue;
        } else {
            amt = subtotal * (discountValue / 100);
        }
        return Math.min(amt, subtotal);
    }, [subtotal, discountValue, discountType]);

    const tax = useMemo(() => {
        if (settings?.show_tax === false) return 0;
        const discountFactor = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
        let t = 0;
        cartItems.forEach(item => {
            const category = categories.find(c => c.id === item.category_id);
            const taxPercent = category?.tax_rate || 0;
            const itemTotal = item.price * item.quantity;
            const itemTaxable = itemTotal * discountFactor;
            t += itemTaxable * (taxPercent / 100);
        });
        return t;
    }, [cartItems, categories, subtotal, discountAmount, settings?.show_tax]);

    const total = useMemo(() => {
        return (subtotal - discountAmount) + tax;
    }, [subtotal, discountAmount, tax]);

    // Notification Modal
    const [showNotification, setShowNotification] = useState(false);
    const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('success');
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');


    useEffect(() => {
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
        const state = location.state as { heldOrder?: any; customer?: any; isPhoneOrder?: boolean; repeatItems?: any[] };
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
            if (state.customer.address) setCustomerAddress(state.customer.address);
            if (state.customer.postcode) setCustomerPostcode(state.customer.postcode);

            if (state.isPhoneOrder) {
                setIsPhoneOrder(true);
                const explicitState = state as any;
                if (explicitState.orderType) setPhoneOrderType(explicitState.orderType);
                if (explicitState.timeslot) setPhoneOrderTimeslot(explicitState.timeslot);
                if (explicitState.callLogId) setCallLogId(explicitState.callLogId);
            }
            if (state.repeatItems) {
                setCartItems(state.repeatItems);
            }
            // Clear the navigation state 
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    // fetchData has been moved to MenuContext


    // Search for customers (for walk-in orders)
    const searchCustomers = async (query: string) => {
        if (!query || query.length < 2) {
            setCustomerResults([]);
            return;
        }

        try {
            const { data, error } = await supabase.rpc('get_pos_customers', {
                p_restaurant_id: settings?.id,
                p_search_query: query
            });

            if (error) throw error;
            setCustomerResults(data || []);
            setShowCustomerDropdown(true);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    };

    // Cancel / Clear Order
    const handleCancelOrder = async () => {
        const confirmed = await showConfirm(
            'Cancel Order?',
            'This will clear the current cart and reset any unsaved changes. Are you sure?',
            'warning'
        );

        if (confirmed) {
            setCartItems([]);
            setDiscountValue(0);
            if (isWalkIn && mode === 'new') {
                setSelectedCustomer(null);
                setCustomerSearch('');
                setCustomerAddress('');
                setCustomerPostcode('');
                setPhoneOrderType(null);
                setPhoneOrderTimeslot(null);
            }
            if (mobileTab === 'cart') setMobileTab('menu');
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

    // Auto-select first category if none selected
    useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id);
        }
    }, [categories, selectedCategory]);

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
            `);

        if (tableId && !isWalkIn) {
            query = query.eq('table_id', tableId);
        } else if (currentOrder?.id) {
            query = query.eq('id', currentOrder.id);
        } else if (createdOrderId) {
            query = query.eq('id', createdOrderId);
        } else {
            return; // Nothing to fetch
        }

        // If specific ID requested, fetch that one
        if (specificOrderId) {
            query = query.eq('id', specificOrderId);
        } else if (tableId && !isWalkIn) {
            // For tables, fetch any open status
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
        // Revert back to original flow: open modal if item has options
        const hasOptions = itemModifiersMap.has(item.id) || (item.price_variants && item.price_variants.length > 1) || item.flags?.includes('half_half');
        
        if (hasOptions) {
            setInitialModalData({});
            setEditingTempId(null);
            setItemForModal(item);
            setIsModalOpen(true);
        } else {
            // Direct add for items without options
            const initialPrice = (item.price_variants && item.price_variants.length > 0) 
                ? item.price_variants[0].price 
                : item.price;
                
            addToCart(item, [], initialPrice);
        }
    };

    const handleEditCartItem = (tempId: string) => {
        const item = cartItems.find(i => i.tempId === tempId);
        if (!item) return;

        const menuItem = menuItems.find(mi => mi.id === item.id);
        if (!menuItem) return;

        // Map flat data back to modal structures
        const initialVariant = menuItem.price_variants?.find((v: any) => 
            `${menuItem.name} (${v.name})` === item.name
        );

        const selections: any = {};
        item.modifiers.forEach((m: any) => {
            if (!selections[m.modifier_group_id]) selections[m.modifier_group_id] = {};
            selections[m.modifier_group_id][m.modifier_item_id] = {
                modifier_group_id: m.modifier_group_id,
                modifier_group_name: m.modifier_group_name,
                modifier_item_id: m.modifier_item_id,
                name: m.name,
                location: m.location || 'whole',
                intensity: m.intensity || 'normal'
            };
        });

        const replacers: any = {};
        item.selected_replacers?.forEach((r: any) => {
            if (!replacers[r.group_id]) replacers[r.group_id] = {};
            replacers[r.group_id][r.id] = true;
        });

        setInitialModalData({
            variant: initialVariant,
            selections,
            exclusions: item.excluded_toppings,
            replacers
        });

        setEditingTempId(tempId);
        setItemForModal(menuItem);
        setIsModalOpen(true);
    };

    const addToCart = (item: any, modifiers: any[], finalPrice: number, excludedToppings?: any[], selectedReplacers?: any[]) => {
        if (editingTempId) {
            // Update existing item
            setCartItems(prev => prev.map(cartItem => 
                cartItem.tempId === editingTempId 
                    ? {
                        ...cartItem,
                        name: item.name,
                        price: finalPrice,
                        modifiers: modifiers,
                        excluded_toppings: excludedToppings,
                        selected_replacers: selectedReplacers
                      }
                    : cartItem
            ));
            setEditingTempId(null);
            setInitialModalData({});
            return;
        }

        // Check if item with same ID, price, and modifiers already exists
        const existingItemIndex = cartItems.findIndex(cartItem => {
            if (cartItem.id !== item.id || cartItem.price !== finalPrice) return false;
            if (cartItem.modifiers.length !== modifiers.length) return false;
            
            // If there are exclusions or replacers, we treat them as unique (don't stack)
            if (excludedToppings?.length || selectedReplacers?.length) return false;
            if (cartItem.excluded_toppings?.length || cartItem.selected_replacers?.length) return false;

            const cartModifiers = cartItem.modifiers.map(m => `${m.modifier_item_id}-${m.location}-${m.intensity}`).sort();
            const newModifiers = modifiers.map(m => `${m.modifier_item_id}-${m.location}-${m.intensity}`).sort();
            return JSON.stringify(cartModifiers) === JSON.stringify(newModifiers);
        });

        if (existingItemIndex !== -1 && !excludedToppings?.length) {
            // Item exists (and no exclusions to track), increment quantity
            setCartItems(prev => prev.map((cartItem, index) =>
                index === existingItemIndex
                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                    : cartItem
            ));
        } else {
            // New item (or has exclusions — always add as separate line)
            const newItem: CartItem = {
                tempId: crypto.randomUUID(),
                id: item.id,
                name: item.name,
                basePrice: item.price,
                price: finalPrice,
                quantity: 1,
                modifiers: modifiers,
                excluded_toppings: excludedToppings,
                selected_replacers: selectedReplacers,
                course: 'Main',
                station_id: item.station_id,
                category_id: (item as any).category_id
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
                p_order_type: isWalkIn ? 'takeaway' : 'dine_in',
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
                excluded_toppings: item.excluded_toppings || [],
                selected_replacers: item.selected_replacers || [],
                notes: item.notes || null,
                course: item.course,
                is_miscellaneous: item.isMiscellaneous || false,
                custom_item_name: item.isMiscellaneous ? item.name : null,
                name: item.name,
                station_id: item.station_id
            }));

            // 1. If it's a Phone/Walk-in order and we have customer details, upsert the customer
            let finalCustomerId = selectedCustomer?.id || null;

            // For phone orders: the customer details are stored in selectedCustomer
            const callerPhone = isPhoneOrder ? (selectedCustomer?.phone || null) : null;

            if (isWalkIn && (customerSearch || customerAddress || customerPostcode || callerPhone)) {
                const isPhone = /^[+\d\s-]+$/.test(customerSearch) && customerSearch.length > 5;
                const name = !isPhone && customerSearch ? customerSearch : (selectedCustomer?.full_name || selectedCustomer?.name || null);
                const phone = isPhone ? customerSearch : (selectedCustomer?.phone || callerPhone || null);

                if (finalCustomerId) {
                    // Update existing profile with address/phone if needed
                    await supabase.from('profiles').update({
                        address: customerAddress || null,
                        postcode: customerPostcode || null,
                        ...(phone && !selectedCustomer?.phone ? { phone } : {})
                    }).eq('id', finalCustomerId)
                        .eq('restaurant_id', settings?.id);
                } else if (phone) {
                    // Try to find an existing profile by phone number first
                    const normalizedPhone = phone.replace(/\D/g, '');
                    const { data: existingProfiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, phone')
                        .eq('restaurant_id', settings?.id)
                        .filter('phone', 'ilike', `%${normalizedPhone.slice(-9)}%`)
                        .limit(1);

                    if (existingProfiles && existingProfiles.length > 0) {
                        finalCustomerId = existingProfiles[0].id;
                        // Update name if we now have one and they didn't before
                        if (name && !existingProfiles[0].full_name) {
                            await supabase.from('profiles')
                                .update({ full_name: name })
                                .eq('id', finalCustomerId)
                                .eq('restaurant_id', settings?.id);
                        }
                    } else {
                        // Create a new profile with at least the phone number and default 'Guest' name
                        const { data: newProfile } = await supabase
                            .from('profiles')
                            .insert({
                                full_name: name || 'Guest',
                                phone: phone,
                                restaurant_id: settings?.id,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .select('id')
                            .single();
                        if (newProfile) finalCustomerId = newProfile.id;
                    }
                }
            }

            const { data, error: rpcError } = await supabase.rpc('create_walkin_order', {
                p_restaurant_id: settings?.id,
                p_staff_id: staff?.id,
                p_order_items: orderItems,
                p_total_amount: total,
                p_user_id: finalCustomerId,
                p_discount_type: discountType || null,
                p_discount_amount: discountAmount || 0,
                p_payment_method: method === 'unpaid' ? null : method,
                p_payment_transaction_id: transactionId || null,
                p_customer_name: (customerSearch && !/^[+\d\s-]+$/.test(customerSearch)) ? customerSearch : null,
                p_customer_postcode: customerPostcode || null,
                p_order_type: isPhoneOrder ? (phoneOrderType || 'takeaway') : 'takeaway',
                p_order_source: isPhoneOrder ? 'phone' : 'pos',
                p_metadata: {
                    subtotal: subtotal,
                    tax: tax,
                    discount_amount: discountAmount,
                    discount_type: discountType
                }

            });


            if (rpcError) throw rpcError;

            const result = data as any;
            if (!result.success) {
                throw new Error(result.error || 'Failed to create walk-in order');
            }

            // Success - show modal
            const finalOrderId = result.order_uuid || result.order_id;
            setCreatedOrderId(finalOrderId);
            setCreatedDailyOrderNumber(result.daily_order_number);
            setShowSuccessModal(true);
            setCartItems([]);

            // Auto-print receipt if enabled
            if (finalOrderId && settings?.id) {
                await receiptService.printOrder(finalOrderId, settings.id, false, method, showAlert);
            }

            // Link the order to the originating call log (if the flow started from a call)
            if (isPhoneOrder && callLogId && finalOrderId) {
                await supabase
                    .from('call_logs')
                    .update({ order_id: finalOrderId })
                    .eq('id', callLogId);
            }

        } catch (error) {
            console.error('Order failed:', error);
            showAlert('Order Failed', 'Failed to create order. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceOrder = async (isSilent: boolean = false) => {
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
                            user_id: null,
                            metadata: {
                                subtotal: subtotal,
                                tax: tax,
                                discount_amount: discountAmount,
                                discount_type: discountType
                            }
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
                // Use dynamic tax and total from useMemo (calculated per item category)
                const newTotal = (currentOrder.total_amount || 0) + total;


                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        total_amount: newTotal,
                        metadata: {
                            ...(currentOrder.metadata || {}),
                            subtotal: (currentOrder.metadata?.subtotal || 0) + subtotal,
                            tax: (currentOrder.metadata?.tax || 0) + tax
                        }
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
                excluded_toppings: item.excluded_toppings || [],
                selected_replacers: item.selected_replacers || [],
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

            // If silent update (for printing), we need to refresh the submitted items FIRST
            // to avoid a flash of emptiness
            if (isSilent) {
                await fetchExistingOrder();
                setCartItems([]);
            } else {
                setShowUpdateModal(true);
                setCartItems([]);
            }

            // Auto-print receipt if enabled (for new orders or updates)
            if (orderId && settings?.id && !isSilent) {
                await receiptService.printOrder(orderId, settings.id, true, undefined, showAlert);
            }
            // navigate('/pos'); // Handled by modal close
        } catch (error) {
            console.error('Order failed:', error);
            showAlert('Order Error', 'Failed to place order.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintKitchen = async () => {
        if (!settings?.id) return;
        
        if (cartItems.length === 0 && !currentOrder) {
            showAlert('Nothing to Print', 'Add items to the cart or select an existing order first.', 'info');
            return;
        }

        // If there are no unsaved items but we have an order, reprint the whole order as KOT
        if (cartItems.length === 0 && currentOrder) {
             await receiptService.printKitchenTickets(currentOrder.id, settings.id, undefined, showAlert);
             return;
        }

        // Prepare local print data (No DB save - for unsaved cart items)
        const orderData = {
            type: 'kot',
            items: cartItems,
            subtotal: subtotal,
            tax: tax,
            total: total,
            customer: selectedCustomer,
            tableName: tableName,
            orderType: isWalkIn ? (isPhoneOrder ? 'Phone Order' : 'Walk-In') : 'Table Order',
        };

        await receiptService.printLocalOrder(settings.id, orderData);
    };

    const completeOrder = async () => {
        if (!currentOrder?.id) return;

        showAlert(
            'Confirm Completion',
            'Are you sure you want to complete this order and free the table?',
            'warning',
            {
                showCancel: true,
                onConfirm: async () => {
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
                        showAlert('Error', 'Failed to complete order', 'error');
                        setLoading(false);
                    }
                }
            }
        );
    };




    const filteredItems = menuItems.filter(item => item.category_id === selectedCategory);

    return (
        <div className="flex h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden relative transition-colors duration-300">
            {/* Modal */}
            <POSModifierModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTempId(null);
                    setInitialModalData({});
                }}
                menuItem={itemForModal}
                onAddToCart={addToCart}
                currency={settings?.currency}
                initialVariant={initialModalData?.variant}
                initialSelections={initialModalData?.selections}
                initialExclusions={initialModalData?.exclusions}
                initialReplacers={initialModalData?.replacers}
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
                                {isWalkIn ? (isPhoneOrder ? `Phone Order (${phoneOrderType || 'takeaway'})` : 'Walk-In Order') : (tableName || 'Unknown Table')}
                                {phoneOrderTimeslot && (
                                    <span className="text-xs font-normal bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                        {phoneOrderTimeslot.date} {phoneOrderTimeslot.time}
                                    </span>
                                )}
                                <span className="md:hidden text-xs font-normal text-gray-500">
                                    ({filteredItems.length} items)
                                </span>
                                {isSyncing && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 animate-pulse bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        SYNCING
                                    </span>
                                )}
                            </h2>

                        </div>
                        {isWalkIn && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search customer (name, phone)..."
                                    value={selectedCustomer ? `${selectedCustomer.full_name || selectedCustomer.name || 'Guest'}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''}` : customerSearch}
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
                                            setCustomerAddress('');
                                            setCustomerPostcode('');
                                            setCustomerResults([]);
                                            setShowCustomerDropdown(false);
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
                                                    const selected = customer;
                                                    setSelectedCustomer(selected);
                                                    setCustomerSearch(selected.full_name || selected.phone || '');
                                                    setCustomerAddress(selected.address || '');
                                                    setCustomerPostcode(selected.postcode || '');
                                                    setShowCustomerDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-0"
                                            >
                                                <div className="font-medium text-gray-900 dark:text-white">{customer.full_name || 'Guest'}</div>
                                                {customer.phone && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {customer.phone}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Only show address and postcode fields for Phone Delivery orders */}
                                {(isPhoneOrder && phoneOrderType === 'delivery') && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            placeholder="Address..."
                                            value={customerAddress}
                                            onChange={(e) => setCustomerAddress(e.target.value)}
                                            className="w-2/3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Postcode"
                                            value={customerPostcode}
                                            onChange={(e) => setCustomerPostcode(e.target.value)}
                                            className="w-1/3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        />
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

                {/* Split View: Categories Sidebar + Menu Grid */}
                <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                    {/* Categories Sidebar (Scrollable wrapper) */}
                    <div className="md:w-1/4 md:max-w-[240px] flex flex-col h-auto md:h-full overflow-hidden">
                        <POSCategoryTabs
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onSelect={setSelectedCategory}
                        />
                    </div>

                    {/* Right: Menu Grid */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {menuLoading && categories.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-gray-500">Loading Menu...</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto scrollbar-hide pb-20 md:pb-0 relative">
                                {loading && (
                                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-50 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-color)]"></div>
                                    </div>
                                )}
                                <POSMenuGrid 
                                    items={filteredItems.map(item => ({
                                        ...item,
                                        hasOptions: itemModifiersMap.has(item.id) || (item.price_variants && item.price_variants.length > 1)
                                    }))} 
                                    onItemClick={handleItemClick} 
                                    onModifierClick={(item) => {
                                        setEditingTempId(null);
                                        setInitialModalData({});
                                        setItemForModal(item);
                                        setIsModalOpen(true);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

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
                    {/* Unified Cart Items List */}
                    {submittedItems.length === 0 && cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2 opacity-50 my-10">
                            <ShoppingCart className="w-12 h-12" />
                            <p>No items added</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Render Submitted/Sent Items */}
                            {submittedItems.map((item, idx) => (
                                <div key={`submitted-${item.id || idx}`} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 flex justify-between shadow-sm relative overflow-hidden group">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 opacity-50"></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {item.quantity}x {item.menu_item?.name || item.name_snapshot || 'Unknown Item'}
                                                </span>
                                                <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Sent</span>
                                            </div>
                                            <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                                                {settings?.currency || '$'}{((item.price_snapshot || item.price) * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                        {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                            <div className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-300">
                                                {item.selected_modifiers.map((m: any, i: number) => (
                                                    <div key={i} className="flex gap-1 flex-wrap">
                                                        <span>+ {m.name} {m.modifier_group_name ? `(${m.modifier_group_name})` : ''}</span>
                                                        {m.location && m.location !== 'whole' && (
                                                            <span className="text-[10px] bg-gray-100 px-1 rounded uppercase font-bold text-gray-400">({m.location})</span>
                                                        )}
                                                        {m.intensity && m.intensity !== 'normal' && (
                                                            <span className="text-[10px] bg-gray-100 px-1 rounded uppercase font-bold text-gray-400">({m.intensity})</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {item.notes && <div className="text-xs text-orange-500 mt-1 italic">"{item.notes}"</div>}
                                    </div>
                                </div>
                            ))}

                            {/* Render New/Local Items */}
                            {cartItems.map((item) => {
                                const menuItem = menuItems.find(mi => mi.id === item.id);
                                const hasOptions = menuItem ? (itemModifiersMap.has(item.id) || (menuItem.price_variants && menuItem.price_variants.length > 1) || menuItem.flags?.includes('half_half')) : false;

                                return (
                                <div key={item.tempId} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex justify-between group animate-fadeIn transition-colors shadow-sm relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--theme-color)]"></div>
                                    <div className="flex-1">
                                        <div className="flex flex-col gap-3">
                                            {/* Row 1: Name and Cost */}
                                            <div className="flex justify-between items-start gap-4">
                                                <span className="text-gray-900 dark:text-white font-bold leading-tight flex-1">{item.name}</span>
                                                <span className="text-gray-900 dark:text-white font-mono font-bold text-lg whitespace-nowrap">
                                                    {settings?.currency || '$'}{(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                            
                                            {/* Row 2: Actions and Quantity */}
                                            <div className="flex justify-between items-center">
                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-3">
                                                    {hasOptions && (
                                                        <button
                                                            onClick={() => handleEditCartItem(item.tempId)}
                                                            className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-xl transition-colors border border-blue-100 dark:border-blue-800 shadow-sm"
                                                            title="Edit Item Options"
                                                        >
                                                            <Pencil size={20} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => removeFromCart(item.tempId)}
                                                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-xl transition-colors border border-red-100 dark:border-red-800 shadow-sm"
                                                        title="Remove Item"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => decrementQuantity(item.tempId)}
                                                        className="w-10 h-10 flex items-center justify-center bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded-xl transition-colors shadow-sm"
                                                        title="Decrease quantity"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                                        </svg>
                                                    </button>
                                                    <span className="w-6 text-center text-lg font-bold text-gray-900 dark:text-white">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => incrementQuantity(item.tempId)}
                                                        className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
                                                        title="Increase quantity"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {item.modifiers && item.modifiers.length > 0 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1 border-t border-gray-300 dark:border-gray-600 pt-1">
                                                {item.modifiers.map((mod, idx) => (
                                                    <div key={idx} className="flex justify-between items-center">
                                                        <div className="flex gap-1 flex-wrap">
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">+ {mod.name} {mod.modifier_group_name ? `(${mod.modifier_group_name})` : ''}</span>
                                                            {mod.location && mod.location !== 'whole' && (
                                                                <span className="text-[9px] bg-gray-200 dark:bg-gray-600 px-1 rounded uppercase font-bold">({mod.location})</span>
                                                            )}
                                                            {mod.intensity && mod.intensity !== 'normal' && (
                                                                <span className="text-[9px] bg-gray-200 dark:bg-gray-600 px-1 rounded uppercase font-bold">({mod.intensity})</span>
                                                            )}
                                                        </div>
                                                        {Number(mod.price) > 0 && (
                                                            <span className="font-mono text-gray-400">
                                                                {settings?.currency || '$'}{Number(mod.price).toFixed(2)}
                                                            </span>
                                                        )}
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
                                );
                            })}
                            <div ref={cartEndRef} />
                        </div>
                    )}
                </div>
                {/* The orphaned </div> was here */}

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

                    {settings?.show_tax !== false && (
                        <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                            <span>Tax</span>
                            <span>{settings?.currency || '$'}{tax.toFixed(2)}</span>
                        </div>
                    )}
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

                    <div className="flex gap-2 items-stretch h-14">
                        <button
                            onClick={handleCancelOrder}
                            disabled={cartItems.length === 0 && !selectedCustomer && !currentOrder}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 rounded-xl font-bold shadow-lg hover:bg-red-600 hover:text-white transition-all flex items-center justify-center min-w-[56px] h-full"
                            title="Cancel Order"
                        >
                            <Trash2 className="h-6 w-6" />
                        </button>
                        <button
                            onClick={handleHoldOrder}
                            disabled={cartItems.length === 0 || isHoldingOrder}
                            className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center min-w-[56px] disabled:opacity-50 h-full"
                            title="Hold Order"
                        >
                            <Pause className="h-6 w-6" />
                        </button>

                        {currentOrder && (
                            currentOrder.payment_status === 'paid' ? (
                                <button
                                    onClick={completeOrder}
                                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 rounded-xl font-bold shadow-lg flex items-center justify-center min-w-[56px] h-full"
                                    title="Free Table"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate(`/pos/payment/${currentOrder.id}`)}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-xl font-bold shadow-lg flex items-center justify-center min-w-[56px] h-full"
                                    title="Pay Now"
                                >
                                    <CreditCard className="h-6 w-6" />
                                </button>
                            )
                        )}

                        <button
                            onClick={handlePrintKitchen}
                            className="bg-gray-800 text-white px-4 rounded-xl font-bold shadow-lg hover:bg-gray-700 transition-all flex items-center justify-center min-w-[56px] h-full"
                            title="Print to Kitchen"
                        >
                            <Printer className="h-6 w-6" />
                        </button>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={cartItems.length === 0}
                            style={{ backgroundColor: 'var(--theme-color)' }}
                            className="flex-1 text-white rounded-xl font-bold shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2 px-4 h-full"
                        >
                            <Check className="h-6 w-6" />
                            <span className="hidden sm:inline whitespace-nowrap">
                                {currentOrder && ['pending', 'confirmed'].includes(currentOrder.status) && mode !== 'new' ? 'Update Order' : 'Place Order'}
                            </span>
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
                <Elements stripe={stripePromise}>
                    <POSPaymentModal
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        amount={total}
                        onPaymentSuccess={handlePaymentSuccess}
                    />
                </Elements>

                {/* Success Modal */}
                <OrderSuccessModal
                    isOpen={showSuccessModal}
                    onClose={() => {
                        setShowSuccessModal(false);
                        navigate(isPhoneOrder ? '/pos/calls' : '/pos/walk-in');
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
