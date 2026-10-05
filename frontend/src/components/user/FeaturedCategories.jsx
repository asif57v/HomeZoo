import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const FeaturedCategories = ({
  categories = [],
  loading = false,
  onSelectCategory,
  title = 'Featured Categories',
  subtitle = 'Explore curated property types for every need'
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-4">
        <div className="h-6 w-44 bg-gray-200 rounded-md animate-pulse mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 sm:h-52 bg-gray-200/80 rounded-2xl animate-pulse" />
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
    <section className="max-w-7xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
            <Sparkles size={18} className="text-amber-500 fill-amber-500" />
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Grid of Featured Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((cat, index) => {
          const IconComponent = LucideIcons[cat.icon] || LucideIcons.Building2;
          const bgImg = cat.image || cat.bgImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';

          return (
            <motion.div
              key={cat._id || index}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategoryClick(cat)}
              className="group relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer bg-gray-900 border border-gray-100 flex flex-col justify-end p-3.5 sm:p-4"
            >
              {/* Card Image */}
              <img
                src={bgImg}
                alt={cat.displayName || cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

              {/* Badge if available */}
              {cat.badge && (
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-blue-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                  {cat.badge}
                </div>
              )}

              {/* Icon Bubble */}
              <div
                className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: cat.color || '#0284c7' }}
              >
                <IconComponent size={16} />
              </div>

              {/* Card Content */}
              <div className="relative z-10 text-white space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black tracking-tight leading-snug">
                    {cat.displayName || cat.name}
                  </h3>
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={12} className="text-white" />
                  </div>
                </div>

                {cat.tagline && (
                  <p className="text-[11px] sm:text-xs text-gray-200 line-clamp-2 leading-tight font-medium opacity-90">
                    {cat.tagline}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedCategories;
