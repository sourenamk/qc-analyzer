import React from 'react';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories, activeCategory, onSelectCategory }) => {
  return (
    <div className="mb-6 border-b border-gray-700">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeCategory === category
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-800 rounded-t-md
            `}
            aria-current={activeCategory === category ? 'page' : undefined}
          >
            {category}
          </button>
        ))}
      </nav>
    </div>
  );
};