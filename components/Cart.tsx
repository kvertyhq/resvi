import React from 'react';
import { MenuItem } from '../data/menu';

interface CartProps {
  cartItems: (MenuItem & { quantity: number })[];
  onUpdateCart: (item: MenuItem, quantity: number) => void;
}

const Cart = ({ cartItems, onUpdateCart }: CartProps) => {
  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace('$', ''));
      return total + price * item.quantity;
    }, 0);
  };

  return (
    <div className="p-8 border rounded-lg">
      <h3 className="text-2xl font-bold mb-4">Your Cart</h3>
      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div>
          {cartItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xl font-bold">{item.name}</h4>
                <p className="text-gray-600">{item.price}</p>
              </div>
              <div className="flex items-center">
                <button onClick={() => onUpdateCart(item, item.quantity - 1)} className="px-2 border rounded-l-lg">-</button>
                <span className="px-4 border-t border-b">{item.quantity}</span>
                <button onClick={() => onUpdateCart(item, item.quantity + 1)} className="px-2 border rounded-r-lg">+</button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between mt-8">
            <h4 className="text-2xl font-bold">Total:</h4>
            <span className="text-2xl font-bold">${getTotalPrice().toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
