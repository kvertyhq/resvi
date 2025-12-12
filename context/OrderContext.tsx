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
    max_delivery_radius_miles: number;
    max_delivery_order_value: number;
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

  // State for Delivery Zones
  const [globalDeliverySettings, setGlobalDeliverySettings] = useState<OrderState['deliverySettings']>(null);

  // Fetch delivery settings on mount (Zones are now checked dynamically via RPC)
  React.useEffect(() => {
    const fetchData = async () => {
      const restaurantId = import.meta.env.VITE_RESTAURANT_ID;
      if (!restaurantId) return;

      // Fetch Settings
      const { data: settingsData } = await supabase
        .from('restaurant_settings')
        .select('delivery_fee, delivery_fee_mode, delivery_minimum, max_delivery_radius_miles, max_delivery_order_value')
        .eq('id', restaurantId)
        .single();

      let initialSettings = null;
      if (settingsData) {
        initialSettings = {
          delivery_fee: settingsData.delivery_fee || 0,
          delivery_fee_mode: settingsData.delivery_fee_mode || 'flat',
          delivery_minimum: settingsData.delivery_minimum || 0,
          max_delivery_radius_miles: settingsData.max_delivery_radius_miles || 5,
          max_delivery_order_value: settingsData.max_delivery_order_value || 1000
        };
        setGlobalDeliverySettings(initialSettings);
        setState(s => ({ ...s, deliverySettings: initialSettings }));
      }
    };
    fetchData();
  }, []);

  // Calculate delivery fee whenever relevant state changes
  React.useEffect(() => {
    // If a zone is active (implied by modified deliverySettings matching a zone), fee is already set by checkPostcode.
    // However, if we are in "Radius Mode" (fallback), we might need to recalculate per_km fee.
    // We can check if the current settings match the global settings to determine "mode".

    if (!state.deliverySettings || state.orderType !== 'delivery') {
      if (state.deliveryFee !== 0) setState(s => ({ ...s, deliveryFee: 0 }));
      return;
    }

    // Check if we are using a specific Zone (simple check: if min/max/fee differ from global, likely a zone)
    // Or simpler: checkPostcode sets the fee for Zones. Radius logic sets fee.
    // Here we mainly handle the "per_km" updates for Radius mode.

    const isZoneActive = state.deliverySettings !== globalDeliverySettings;
    // Note: object identity comparison works if we be careful not to create new objects unnecessarily for global.
    // But checkPostcode creates new object for Zone. So if they differ, it's a zone (or modified).

    if (isZoneActive) {
      // Zone rules apply: Fee is fixed to the zone's fee (set during checkPostcode).
      // Nothing to do here unless we want to enforce it again.
      return;
    }

    const { delivery_fee, delivery_fee_mode } = state.deliverySettings;

    let fee = 0;
    if (delivery_fee_mode === 'flat') {
      fee = delivery_fee;
    } else if (delivery_fee_mode === 'per_km' && state.deliveryDistance) {
      fee = delivery_fee * state.deliveryDistance;
      fee = Math.round(fee * 100) / 100;
    }

    if (state.deliveryFee !== fee) {
      setState(s => ({ ...s, deliveryFee: fee }));
    }
  }, [state.deliverySettings, state.orderType, state.deliveryDistance, state.cart, globalDeliverySettings]);

  const setOrderType = (type: OrderType) => {
    setState(s => ({
      ...s,
      orderType: type,
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
    const cleanPostcode = postcode.trim().replace(/\s+/g, '').toUpperCase();
    console.log("Checking postcode:", cleanPostcode);

    // 1. Check for Configured Delivery Zones First via RPC
    const { data: zoneMatches, error: zoneError } = await supabase.rpc('get_matching_delivery_zone', {
      p_postcode: cleanPostcode
    });

    if (zoneError) console.error("Error checking zones:", zoneError);

    if (zoneMatches && zoneMatches.length > 0) {
      console.log("Zone match found:", zoneMatches[0]);
      const matchedZone = zoneMatches[0];
      // Zone Match Found! Override settings.
      const defaults = {
        delivery_fee: 0,
        delivery_fee_mode: 'flat' as const,
        delivery_minimum: 0,
        max_delivery_radius_miles: 5,
        max_delivery_order_value: 1000
      };

      const baseSettings = globalDeliverySettings || defaults;

      const zoneSettings = {
        ...baseSettings,
        delivery_fee: matchedZone.delivery_fee, // Use Zone Fee
        delivery_minimum: matchedZone.min_order_amount, // Use Zone Min
        max_delivery_order_value: matchedZone.max_order_amount, // Use Zone Max
        delivery_fee_mode: 'flat' as const // Zones are always flat fee currently
      };

      setState(s => ({
        ...s,
        postcode: cleanPostcode,
        deliveryAvailable: true,
        deliveryDistance: null, // Distance irrelevant for fixed zones
        deliveryError: null,
        deliverySettings: zoneSettings,
        deliveryFee: matchedZone.delivery_fee
      }));
      return;
    }

    // 2. Fallback to Radius Check
    console.log("No zone match, falling back to radius check...");

    // Ensure we are using the base global settings (resetting any previous zone overrides)
    const currentGlobalSettings = globalDeliverySettings || {
      delivery_fee: 0,
      delivery_fee_mode: 'flat' as const,
      delivery_minimum: 0,
      max_delivery_radius_miles: 5,
      max_delivery_order_value: 1000
    };

    if (!apiKey) {
      console.error("No API Key found for address lookup.");
      setState(s => ({
        ...s,
        postcode,
        deliveryAvailable: false,
        deliveryDistance: null,
        deliveryError: 'Configuration error. Please contact the restaurant.',
        deliverySettings: currentGlobalSettings
      }));
      return;
    }

    try {
      const url = `${GETADDRESS_API_BASE}/distance/${encodeURIComponent(RESTAURANT_POSTCODE)}/${encodeURIComponent(cleanPostcode)}?api-key=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          setState(s => ({
            ...s,
            postcode: cleanPostcode,
            deliveryAvailable: false,
            deliveryDistance: null,
            deliveryError: 'Invalid postcode. Please check and try again.',
            deliverySettings: currentGlobalSettings
          }));
          return;
        }

        if (response.status === 401) {
          setState(s => ({
            ...s,
            postcode: cleanPostcode,
            deliveryAvailable: false,
            deliveryDistance: null,
            deliveryError: 'Configuration error. Please contact the restaurant.',
            deliverySettings: currentGlobalSettings
          }));
          return;
        }

        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const distanceMetres = data.metres;
      const distanceKm = distanceMetres / 1000;

      // Use dynamic radius directly (converted to km) or fallback to 5 miles
      // 1 mile = 1.60934 km
      const radiusMiles = currentGlobalSettings.max_delivery_radius_miles || 5;
      const maxDistanceKm = radiusMiles * 1.60934;

      console.log(`Distance: ${distanceKm}km, Max Radius: ${radiusMiles} miles (${maxDistanceKm}km)`);

      const isWithinRange = distanceKm <= maxDistanceKm;

      setState(s => ({
        ...s,
        postcode: cleanPostcode,
        deliveryAvailable: isWithinRange,
        deliveryDistance: distanceKm,
        deliveryError: isWithinRange ? null : `Sorry, we only deliver within ${radiusMiles} miles.`,
        deliverySettings: currentGlobalSettings
      }));

    } catch (error) {
      console.error('Error checking postcode distance:', error);
      setState(s => ({
        ...s,
        postcode: cleanPostcode,
        deliveryAvailable: false,
        deliveryDistance: null,
        deliveryError: 'Unable to verify postcode. Please try again or contact us.',
        deliverySettings: currentGlobalSettings
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
      let dateForCheck = null;
      let timeForCheck = null;

      if (finalOrderType === 'collection' && state.collectionDate && state.collectionTime) {
        scheduledTime = `${state.collectionDate} ${state.collectionTime}`;
        dateForCheck = state.collectionDate;
        timeForCheck = state.collectionTime;
      } else if (finalOrderType === 'delivery' && state.deliveryDate && state.deliveryTime) {
        scheduledTime = `${state.deliveryDate} ${state.deliveryTime}`;
        dateForCheck = state.deliveryDate;
        timeForCheck = state.deliveryTime;

        // DELIVERY MIN/MAX CHECK
        if (state.deliverySettings) {
          const cartValue = state.cart.reduce((total, item) => {
            const addonsPrice = item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
            return total + (item.price + addonsPrice) * item.quantity;
          }, 0);

          if (state.deliverySettings.delivery_minimum > 0 && cartValue < state.deliverySettings.delivery_minimum) {
            return { success: false, error: `Minimum delivery order value is £${state.deliverySettings.delivery_minimum.toFixed(2)}` };
          }

          if (state.deliverySettings.max_delivery_order_value > 0 && cartValue > state.deliverySettings.max_delivery_order_value) {
            return { success: false, error: `Maximum delivery order value is £${state.deliverySettings.max_delivery_order_value.toFixed(2)}` };
          }
        }
      }

      // Final Capacity Check
      if (dateForCheck && timeForCheck) {
        const { data: capacityData, error: capacityError } = await supabase.rpc('check_timeslot_capacity', {
          p_restaurant_id: import.meta.env.VITE_RESTAURANT_ID,
          p_date: dateForCheck,
          p_time: timeForCheck,
          p_order_type: finalOrderType
        });

        if (capacityError) {
          console.error('Final capacity check error:', capacityError);
          // Fallback: Proceed if check fails? Or block? usually block to be safe.
          // For now, let's block to prevent overbooking if DB is reachable but errors.
          return { success: false, error: "Unable to verify timeslot availability. Please try again." };
        }

        if (capacityData && !(capacityData.message === 'slot available' || capacityData.unlimited === true)) {
          return { success: false, error: "Sorry, this timeslot became fully booked while you were ordering. Please select another time." };
        }
      }

      // OrderFormModal passes 'paymentType' (from OrderDetails interface), not 'paymentMethod'
      const paymentMethod = orderDetails.paymentType || 'cash';
      const isCardPayment = paymentMethod === 'card';

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
        p_mark_payment_completed: isCardPayment, // Mark paid if card (since creating order after successful stripe flow)
        p_name: orderDetails.name,
        p_notes: `
Address: ${orderDetails.address}
Notes: ${orderDetails.notes}
        `.trim(),
        p_order_type: finalOrderType,
        p_payment_method: paymentMethod,
        p_phone: orderDetails.phone,
        p_restaurant_id: import.meta.env.VITE_RESTAURANT_ID,
        p_scheduled_time: scheduledTime,
        p_transaction_id: orderDetails.paymentIntentId || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
