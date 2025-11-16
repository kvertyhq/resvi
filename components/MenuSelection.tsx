import React from 'react';
import { starters, mainDishes, dessertsAndDrinks, MenuItem } from '../data/menu';

const MenuSection = ({ title, items, onAddToCart }: { title: string; items: MenuItem[]; onAddToCart: (item: MenuItem, quantity: number) => void; }) => (
  <div className="mb-8">
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {items.map((item) => (
        <div key={item.name} className="border rounded-lg p-4">
          <img src={item.image} alt={item.name} className="w-full h-48 object-cover mb-4 rounded-lg" />
          <h4 className="text-xl font-bold mb-2">{item.name}</h4>
          <p className="text-gray-600 mb-4">{item.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold">{item.price}</span>
            <button onClick={() => onAddToCart(item, 1)} className="bg-black text-white py-2 px-4 rounded-lg">Add to Cart</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MenuSelection = ({ onAddToCart }: { onAddToCart: (item: MenuItem, quantity: number) => void; }) => {
  return (
    <div>
      <MenuSection title="Starters" items={starters} onAddToCart={onAddToCart} />
      <MenuSection title="Main Dishes" items={mainDishes} onAddToCart={onAddToCart} />
      <MenuSection title="Desserts and Drinks" items={dessertsAndDrinks} onAddToCart={onAddToCart} />
    </div>
  );
};

export default MenuSelection;
