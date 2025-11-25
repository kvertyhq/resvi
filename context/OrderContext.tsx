import React, { createContext, useContext, useState, useMemo } from 'react';
import { RESTAURANT_POSTCODE, MAX_DELIVERY_DISTANCE_KM, GETADDRESS_API_BASE } from '../constants/delivery';
import { supabase } from '../supabaseClient';

// Types
export interface MenuItemData {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  tags?: string[];
}

export interface CartItem extends MenuItemData {
  quantity: number;
}

type OrderType = 'delivery' | 'collection';

interface OrderState {
  orderType: OrderType | null;
  postcode: string;
  deliveryAvailable: boolean | null;
  deliveryDistance: number | null; // Distance in km
  deliveryError: string | null;
  collectionDate: string;
  collectionTime: string;
  cart: CartItem[];
  deliveryFee: number;
  deliverySettings: {
    delivery_fee: number;
    delivery_fee_mode: 'flat' | 'per_km' | 'zone';
    delivery_minimum: number;
  } | null;
}

interface OrderContextType extends OrderState {
  setOrderType: (type: OrderType) => void;
  checkPostcode: (postcode: string) => Promise<void>;
  getAddressList: (postcode: string) => Promise<string[]>;
  setCollectionSlot: (date: string, time: string) => void;
  addToCart: (item: MenuItemData) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeFromCart: (itemId: number) => void;
  clearCart: () => void;
  submitOrder: (orderDetails: any) => Promise<{ success: boolean; error?: any }>;
  cartCount: number;
  cartTotal: number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OrderState>({
    orderType: null,
    postcode: '',
    deliveryAvailable: null,
    deliveryDistance: null,
    deliveryError: null,
    collectionDate: '',
    collectionTime: '',
    cart: [],
    deliveryFee: 0,
    deliverySettings: null,
  });

  // Fetch delivery settings on mount
  React.useEffect(() => {
    const fetchSettings = async () => {
      const restaurantId = import.meta.env.VITE_RESTAURANT_ID;
      if (!restaurantId) return;

      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('delivery_fee, delivery_fee_mode, delivery_minimum')
        .eq('id', restaurantId)
        .single();

      if (data) {
        setState(s => ({
          ...s,
          deliverySettings: {
            delivery_fee: data.delivery_fee || 0,
            delivery_fee_mode: data.delivery_fee_mode || 'flat',
            delivery_minimum: data.delivery_minimum || 0
          }
        }));
      }
    };
    fetchSettings();
  }, []);

  // Calculate delivery fee whenever relevant state changes
  React.useEffect(() => {
    if (!state.deliverySettings || state.orderType !== 'delivery') {
      if (state.deliveryFee !== 0) setState(s => ({ ...s, deliveryFee: 0 }));
      return;
    }

    const { delivery_fee, delivery_fee_mode, delivery_minimum } = state.deliverySettings;
    const cartValue = state.cart.reduce((total, item) => total + item.price * item.quantity, 0);

    // Check for free delivery threshold
    if (delivery_minimum > 0 && cartValue >= delivery_minimum) {
      if (state.deliveryFee !== 0) setState(s => ({ ...s, deliveryFee: 0 }));
      return;
    }

    let fee = 0;
    if (delivery_fee_mode === 'flat') {
      fee = delivery_fee;
    } else if (delivery_fee_mode === 'per_km' && state.deliveryDistance) {
      fee = delivery_fee * state.deliveryDistance;
      // Optional: Round up to nearest 0.50 or similar? For now, keep exact or 2 decimals.
      fee = Math.round(fee * 100) / 100;
    }

    // Ensure fee doesn't change if it's already correct to avoid loops
    if (state.deliveryFee !== fee) {
      setState(s => ({ ...s, deliveryFee: fee }));
    }
  }, [state.deliverySettings, state.orderType, state.deliveryDistance, state.cart]);

  const setOrderType = (type: OrderType) => {
    setState(s => ({
      ...s,
      orderType: type,
      // Reset other type's data
      postcode: type === 'collection' ? '' : s.postcode,
      deliveryAvailable: type === 'collection' ? null : s.deliveryAvailable,
      deliveryDistance: type === 'collection' ? null : s.deliveryDistance,
      deliveryError: type === 'collection' ? null : s.deliveryError,
      collectionDate: type === 'delivery' ? '' : s.collectionDate,
      collectionTime: type === 'delivery' ? '' : s.collectionTime,
    }));
  };

  const checkPostcode = async (postcode: string) => {
    const apiKey = import.meta.env.VITE_GETADDRESS_API_KEY;

    if (!apiKey) {
      setState(s => ({
        ...s,
        postcode,
        deliveryAvailable: false,
        deliveryDistance: null,
        deliveryError: 'Configuration error. Please contact the restaurant.'
      }));
      return;
    }

    const cleanPostcode = postcode.trim().toUpperCase();

    try {
      // Call getaddress.io Distance API
      const url = `${GETADDRESS_API_BASE}/distance/${encodeURIComponent(RESTAURANT_POSTCODE)}/${encodeURIComponent(cleanPostcode)}?api-key=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          setState(s => ({
            ...s,
            postcode: cleanPostcode,
            deliveryAvailable: false,
            deliveryDistance: null,
            deliveryError: 'Invalid postcode. Please check and try again.'
          }));
          return;
        }

        if (response.status === 401) {
          setState(s => ({
            ...s,
            postcode: cleanPostcode,
            deliveryAvailable: false,
            deliveryDistance: null,
            deliveryError: 'Configuration error. Please contact the restaurant.'
          }));
          return;
        }

        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const distanceMetres = data.metres;
      const distanceKm = distanceMetres / 1000;
      const isWithinRange = distanceKm <= MAX_DELIVERY_DISTANCE_KM;

      setState(s => ({
        ...s,
        postcode: cleanPostcode,
        deliveryAvailable: isWithinRange,
        deliveryDistance: distanceKm,
        deliveryError: null
      }));

    } catch (error) {
      console.error('Error checking postcode:', error);
      setState(s => ({
        ...s,
        postcode: cleanPostcode,
        deliveryAvailable: false,
        deliveryDistance: null,
        deliveryError: 'Unable to verify postcode. Please try again or contact us.'
      }));
    }
  };

  const getAddressList = async (postcode: string): Promise<string[]> => {
    const apiKey = import.meta.env.VITE_GETADDRESS_API_KEY;
    if (!apiKey || !postcode) return [];

    try {
      const url = `${GETADDRESS_API_BASE}/find/${encodeURIComponent(postcode)}?api-key=${apiKey}&expand=true`;
      const response = await fetch(url);

      if (!response.ok) return [];

      const data = await response.json();
      // data.addresses is an array of objects if expand=true, or strings if not.
      // With expand=true, it returns { formatted_address: [], thoroughfare: "", ... }
      // Actually, getaddress.io find endpoint with expand=true returns:
      // { addresses: [ { formatted_address: ["Line 1", "Line 2", ...], ... } ] }
      // But let's check the documentation or assume standard behavior. 
      // If we use expand=true, we get more details. If we don't, we get strings.
      // The user request linked to autocomplete, but find is easier for a dropdown.
      // Let's use expand=true to get a nice formatted string or just join the lines.

      if (data.addresses && Array.isArray(data.addresses)) {
        return data.addresses.map((addr: any) => {
          // If it's a string (expand=false)
          if (typeof addr === 'string') return addr;
          // If it's an object (expand=true), usually formatted_address is an array of lines
          if (Array.isArray(addr.formatted_address)) {
            return addr.formatted_address.filter((line: string) => line).join(', ');
          }
          return '';
        }).filter((a: string) => a !== '');
      }
      return [];
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return [];
    }
  };

  const setCollectionSlot = (date: string, time: string) => {
    setState(s => ({ ...s, collectionDate: date, collectionTime: time }));
  };

  const addToCart = (itemToAdd: MenuItemData) => {
    setState(s => {
      const existingItem = s.cart.find(item => item.id === itemToAdd.id);
      if (existingItem) {
        return {
          ...s,
          cart: s.cart.map(item =>
            item.id === itemToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { ...s, cart: [...s.cart, { ...itemToAdd, quantity: 1 }] };
    });
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setState(s => ({
        ...s,
        cart: s.cart.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      }));
    }
  };

  const removeFromCart = (itemId: number) => {
    setState(s => ({
      ...s,
      cart: s.cart.filter(item => item.id !== itemId),
    }));
  };

  const clearCart = () => {
    setState(s => ({ ...s, cart: [] }));
  }

  const submitOrder = async (orderDetails: any) => {
    console.log('Submitting order with details:', orderDetails);
    try {
      // Use orderType passed in details or fall back to state
      // Default to 'collection' if both are missing to match UI behavior
      const finalOrderType = orderDetails.orderType || state.orderType || 'collection';

      const { data, error } = await supabase.rpc('create_order_by_phone', {
        p_delivery_address_id: null,
        p_delivery_fee: state.deliveryFee,
        p_items: state.cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        p_mark_payment_completed: false,
        p_name: orderDetails.name,
        p_notes: `
Address: ${orderDetails.address}
Notes: ${orderDetails.notes}
        `.trim(),
        p_order_type: finalOrderType,
        p_payment_method: 'card',
        p_phone: orderDetails.phone,
        p_restaurant_id: import.meta.env.VITE_RESTAURANT_ID,
        p_scheduled_time: (finalOrderType === 'collection' && state.collectionDate && state.collectionTime) ? `${state.collectionDate} ${state.collectionTime}` : null,
        p_transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      // Check if the RPC returned success: true
      // The RPC might return data directly or wrapped, depending on definition.
      // Assuming the user said "response has 'success': true", we check for that property.
      if (data && data.success === true) {
        console.log('Order submitted successfully:', data);
        clearCart();
        return { success: true };
      } else {
        console.warn('Order submission returned data but success was not true:', data);
        return { success: false, error: data };
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      return { success: false, error };
    }
  };

  const cartCount = useMemo(() => {
    return state.cart.reduce((total, item) => total + item.quantity, 0);
  }, [state.cart]);

  const cartTotal = useMemo(() => {
    return state.cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [state.cart]);

  return (
    <OrderContext.Provider
      value={{
        ...state,
        setOrderType,
        checkPostcode,
        getAddressList,
        setCollectionSlot,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        submitOrder,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
