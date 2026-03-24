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
        <div className="flex flex-row overflow-x-auto md:flex-col md:overflow-y-auto gap-2 pr-2 scrollbar-hide h-full">
            {categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => onSelect(cat.id)}
                    style={selectedCategory === cat.id ? { backgroundColor: 'var(--theme-color)' } : {}}
                    className={`
                        flex-shrink-0 md:w-full px-4 py-3 md:py-4 rounded-xl font-bold transition-all uppercase text-center md:text-left leading-tight
                        ${selectedCategory === cat.id
                            ? 'text-white shadow-lg scale-[1.02]'
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
