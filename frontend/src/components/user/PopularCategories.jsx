import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

const PopularCategories = ({
  categories = [],
  loading = false,
  onSelectCategory,
  title = 'Popular Categories'
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-3">
        <div className="h-6 w-44 bg-gray-200/70 rounded-md animate-pulse mb-3" />
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 w-36 bg-gray-200/70 rounded-2xl animate-pulse shrink-0" />
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
    <section className="w-full max-w-7xl mx-auto px-4 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900 tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700"
        >
          View All
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {categories.map((cat, index) => {
          const Icon = LucideIcons[cat.icon] || LucideIcons.Building2;
          const img = cat.image || cat.bgImage;

          return (
            <motion.button
              key={cat._id || index}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => handleCategoryClick(cat)}
              className="relative w-36 h-28 sm:w-44 sm:h-32 rounded-2xl overflow-hidden shrink-0 text-left shadow-sm"
              style={{ backgroundColor: cat.color || '#0f766e' }}
            >
              {img ? (
                <img
                  src={img}
                  alt={cat.displayName || cat.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Icon size={40} className="absolute top-3 right-3 text-white/40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute bottom-2.5 left-3 right-3 text-white text-sm font-bold drop-shadow truncate">
                {cat.displayName || cat.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default PopularCategories;
