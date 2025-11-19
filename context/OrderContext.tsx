import React, { createContext, useContext, useState, useMemo } from 'react';
import { RESTAURANT_POSTCODE, MAX_DELIVERY_DISTANCE_KM, GETADDRESS_API_BASE } from '../constants/delivery';

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
}

interface OrderContextType extends OrderState {
  setOrderType: (type: OrderType) => void;
  checkPostcode: (postcode: string) => Promise<void>;
  setCollectionSlot: (date: string, time: string) => void;
  addToCart: (item: MenuItemData) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeFromCart: (itemId: number) => void;
  clearCart: () => void;
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
  });

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
        setCollectionSlot,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
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
