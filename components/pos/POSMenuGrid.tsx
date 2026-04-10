import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { SlidersHorizontal } from 'lucide-react';

interface MenuItem {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    hasOptions?: boolean;
}


interface POSMenuGridProps {
    items: MenuItem[];
    onItemClick: (item: MenuItem) => void;
    onModifierClick?: (item: MenuItem) => void;
}

const POSMenuGrid: React.FC<POSMenuGridProps> = ({ items, onItemClick, onModifierClick }) => {
    const { settings } = useSettings();
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 overflow-y-auto pb-20">
            {items.map(item => (
                <button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className="bg-white dark:bg-gray-800 border-2 border-transparent hover:border-orange-500 rounded-xl p-4 flex flex-col items-start gap-2 h-40 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group text-left"
                >
                    {/* Background Image Overlay if available */}
                    {item.image_url && (
                        <div
                            className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.image_url})` }}
                        />
                    )}

                    {/* Modifier Icon hidden temporarily as per request 
                    {item.hasOptions && (
                        <div 
                            className="absolute top-0 right-0 z-20 p-3 text-orange-400 opacity-80 hover:opacity-100 transition-opacity hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-bl-xl" 
                            title="Open customization"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onModifierClick) onModifierClick(item);
                            }}
                        >
                            <SlidersHorizontal size={20} />
                        </div>
                    )}
                    */}

                    <div className="relative z-10 w-full flex flex-col h-full">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight line-clamp-2">{item.name}</h3>
                        {item.description && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <div className="mt-auto pt-2 font-mono text-orange-400 text-xl font-bold">
                            {settings?.currency || '$'}{Number(item.price).toFixed(2)}
                        </div>
                    </div>
                </button>
            ))}

            {items.length === 0 && (
                <div className="col-span-full flex items-center justify-center h-64 text-gray-500 italic">
                    No items in this category
                </div>
            )}
        </div>
    );
};

export default POSMenuGrid;
