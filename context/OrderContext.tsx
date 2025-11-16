import React, { createContext, useContext, useState, useMemo } from 'react';

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
        collectionDate: type === 'delivery' ? '' : s.collectionDate,
        collectionTime: type === 'delivery' ? '' : s.collectionTime,
    }));
  };

  const checkPostcode = async (postcode: string) => {
    // Dummy check
    await new Promise(resolve => setTimeout(resolve, 500));
    const isValid = postcode.trim().toUpperCase() === 'NW10 1AA';
    setState(s => ({ ...s, postcode: postcode, deliveryAvailable: isValid }));
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
    setState(s => ({...s, cart: []}));
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
