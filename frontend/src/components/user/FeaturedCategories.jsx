import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';

const FeaturedCategories = ({
  categories = [],
  loading = false,
  onSelectCategory,
  title = 'Featured Categories',
  subtitle = ''
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="w-full max-w-7xl mx-auto px-4 py-4">
        <div className="h-6 w-44 bg-gray-200 rounded-md animate-pulse mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-28 bg-gray-200/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
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
    <section className="w-full max-w-7xl mx-auto px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs md:text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((cat, index) => {
          const Icon = LucideIcons[cat.icon] || LucideIcons.Building2;
          const img = cat.image || cat.bgImage || FALLBACK_IMG;

          return (
            <motion.div
              key={cat._id || index}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategoryClick(cat)}
              className="relative flex items-center gap-3.5 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="relative w-28 h-24 sm:w-32 sm:h-28 rounded-xl overflow-hidden shrink-0">
                <img
                  src={img}
                  alt={cat.displayName || cat.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {cat.badge && (
                  <span className="absolute top-1.5 left-1.5 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {cat.badge}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight truncate">
                  {cat.displayName || cat.name}
                </h3>
                {cat.tagline && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.tagline}</p>
                )}
                <div className="mt-2 inline-flex items-center gap-1.5">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: cat.color || '#0f766e' }}
                  >
                    <Icon size={13} />
                  </span>
                  <span className="text-xs font-bold text-teal-700">Explore</span>
                </div>
              </div>

              <ChevronRight size={18} className="text-gray-300 shrink-0" />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedCategories;
