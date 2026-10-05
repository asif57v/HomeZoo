import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

const PopularCategories = ({ categories = [], loading = false, onSelectCategory }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-10 w-28 bg-gray-200/70 rounded-full animate-pulse shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  const handleCategoryClick = (cat) => {
    if (onSelectCategory) {
      onSelectCategory(cat._id, cat.displayName || cat.name);
    } else {
      navigate(`/search?category=${cat.slug || cat.name}`);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 pt-3 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat, index) => {
          const IconComponent = LucideIcons[cat.icon] || LucideIcons.Building2;

          return (
            <motion.button
              key={cat._id || index}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCategoryClick(cat)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-100/90 rounded-full shadow-xs hover:shadow-sm transition-all shrink-0 group text-left"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs transition-transform group-hover:scale-110"
                style={{ backgroundColor: cat.color || '#0284c7' }}
              >
                <IconComponent size={13} />
              </div>
              <span className="text-xs font-bold text-gray-800 tracking-tight whitespace-nowrap">
                {cat.displayName || cat.name}
              </span>
              {cat.badge && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-blue-50 text-blue-600 rounded-full">
                  {cat.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default PopularCategories;
