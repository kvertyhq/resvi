import React, { createContext, useContext, useState, useMemo } from 'react';
import { RESTAURANT_POSTCODE, MAX_DELIVERY_DISTANCE_KM, GETADDRESS_API_BASE } from '../constants/delivery';
import { supabase } from '../supabaseClient';

// Types
export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags?: string[];
  image_url?: string;
  is_available?: boolean;
}

export interface CartItem extends MenuItemData {
  cartId: string; // Unique ID for this specific cart entry (item + addons)
  quantity: number;
  selectedAddons: Addon[];
}

type OrderType = 'delivery' | 'collection';

interface OrderState {
  orderType: OrderType | null;
  postcode: string;
  deliveryAvailable: boolean | null;
  deliveryDistance: number | null; // Distance in km
  deliveryError: string | null;
  deliveryDate: string;
  deliveryTime: string;
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
  setDeliverySlot: (date: string, time: string) => void;
  addToCart: (item: MenuItemData, addons?: Addon[]) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  removeFromCart: (cartId: string) => void;
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
    deliveryDate: '',
    deliveryTime: '',
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

    // Calculate cart value including addons
    const cartValue = state.cart.reduce((total, item) => {
      const addonsPrice = item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
      return total + (item.price + addonsPrice) * item.quantity;
    }, 0);

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
      deliveryDate: type === 'collection' ? '' : s.deliveryDate,
      deliveryTime: type === 'collection' ? '' : s.deliveryTime,
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
      if (data.addresses && Array.isArray(data.addresses)) {
        return data.addresses.map((addr: any) => {
          if (typeof addr === 'string') return addr;
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

  const setDeliverySlot = (date: string, time: string) => {
    setState(s => ({ ...s, deliveryDate: date, deliveryTime: time }));
  };

  const addToCart = (itemToAdd: MenuItemData, addons: Addon[] = []) => {
    setState(s => {
      // Create a unique key based on item ID and sorted addon IDs
      const addonIds = addons.map(a => a.id).sort().join(',');

      // Check if exact same item configuration exists
      const existingItemIndex = s.cart.findIndex(
        item => item.id === itemToAdd.id &&
          item.selectedAddons.map(a => a.id).sort().join(',') === addonIds
      );

      if (existingItemIndex > -1) {
        const newCart = [...s.cart];
        newCart[existingItemIndex].quantity += 1;
        return { ...s, cart: newCart };
      }

      // Add new item
      const newItem: CartItem = {
        ...itemToAdd,
        cartId: `${itemToAdd.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        quantity: 1,
        selectedAddons: addons
      };

      return { ...s, cart: [...s.cart, newItem] };
    });
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else {
      setState(s => ({
        ...s,
        cart: s.cart.map(item =>
          item.cartId === cartId ? { ...item, quantity } : item
        ),
      }));
    }
  };

  const removeFromCart = (cartId: string) => {
    setState(s => ({
      ...s,
      cart: s.cart.filter(item => item.cartId !== cartId),
    }));
  };

  const clearCart = () => {
    setState(s => ({ ...s, cart: [] }));
  }

  const submitOrder = async (orderDetails: any) => {
    console.log('Submitting order with details:', orderDetails);
    try {
      const finalOrderType = orderDetails.orderType || state.orderType || 'collection';

      let scheduledTime = null;
      if (finalOrderType === 'collection' && state.collectionDate && state.collectionTime) {
        scheduledTime = `${state.collectionDate} ${state.collectionTime}`;
      } else if (finalOrderType === 'delivery' && state.deliveryDate && state.deliveryTime) {
        scheduledTime = `${state.deliveryDate} ${state.deliveryTime}`;
      }

      const { data, error } = await supabase.rpc('create_order_by_phone', {
        p_delivery_address_id: null,
        p_delivery_fee: state.deliveryFee,
        p_items: state.cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          selected_addons: item.selectedAddons.map(a => ({ id: a.id, name: a.name, price: a.price }))
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
        p_scheduled_time: scheduledTime,
        p_transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

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
    return state.cart.reduce((total, item) => {
      const addonsPrice = item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
      return total + (item.price + addonsPrice) * item.quantity;
    }, 0);
  }, [state.cart]);

  return (
    <OrderContext.Provider
      value={{
        ...state,
        setOrderType,
        checkPostcode,
        getAddressList,
        setCollectionSlot,
        setDeliverySlot,
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
