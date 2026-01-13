import React from 'react';

interface Category {
    id: string;
    name: string;
}

interface POSCategoryTabsProps {
    categories: Category[];
    selectedCategory: string;
    onSelect: (id: string) => void;
}

const POSCategoryTabs: React.FC<POSCategoryTabsProps> = ({ categories, selectedCategory, onSelect }) => {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={() => onSelect('all')}
                style={selectedCategory === 'all' ? { backgroundColor: 'var(--theme-color)' } : {}}
                className={`
                    px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all
                    ${selectedCategory === 'all'
                        ? 'text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}
                `}
            >
                ALL ITEMS
            </button>
            {categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => onSelect(cat.id)}
                    style={selectedCategory === cat.id ? { backgroundColor: 'var(--theme-color)' } : {}}
                    className={`
                        px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all uppercase
                        ${selectedCategory === cat.id
                            ? 'text-white shadow-lg scale-105'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}
                    `}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    );
};

export default POSCategoryTabs;
