import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { SectionHeader } from './home/HomeLayout';

const PopularCategories = ({
  categories = [],
  loading = false,
  onSelectCategory,
  title = 'Popular Categories'
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-4 pb-2">
        <div className="h-5 w-40 bg-gray-200/70 rounded-md animate-pulse mb-3" />
        <div className="flex items-start gap-4 overflow-x-auto no-scrollbar">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200/70 rounded-full animate-pulse" />
              <div className="h-2.5 w-12 bg-gray-200/70 rounded animate-pulse" />
            </div>
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
    <section className="w-full max-w-7xl mx-auto pt-4 pb-2 md:pt-6">
      <SectionHeader size="sm" title={title} onAction={() => navigate('/search')} className="mb-2.5!" />

      <div className="flex items-start gap-2.5 md:gap-6 overflow-x-auto no-scrollbar px-4 md:px-0 pb-1">
        {categories.map((cat, index) => {
          const Icon = LucideIcons[cat.icon] || LucideIcons.Building2;
          const img = cat.image || cat.bgImage;
          const label = cat.displayName || cat.name;

          return (
            <motion.button
              key={cat._id || index}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleCategoryClick(cat)}
              className="group flex flex-col items-center gap-1.5 shrink-0 w-[68px] md:w-20"
            >
              {/* Gradient ring, story-style */}
              <span className="p-[2.5px] rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300">
                <span className="block p-[2px] rounded-full bg-white">
                  <span
                    className="relative w-14 h-14 md:w-[70px] md:h-[70px] rounded-full overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: cat.color || '#0f766e' }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={label}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <Icon size={24} className="text-white" />
                    )}
                  </span>
                </span>
              </span>
              <span className="w-full text-center text-[11px] md:text-xs font-semibold text-gray-700 leading-tight line-clamp-2">
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default PopularCategories;
