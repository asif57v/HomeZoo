import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Band, SectionHeader } from './home/HomeLayout';

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
      <section className="w-full max-w-7xl mx-auto px-4 md:px-0 py-4 md:py-8">
        <div className="h-6 w-44 bg-gray-200 rounded-md animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[104px] md:auto-rows-[160px] gap-2 md:gap-3">
          <div className="row-span-2 md:col-span-2 bg-gray-200/80 rounded-3xl animate-pulse" />
          <div className="bg-gray-200/80 rounded-3xl animate-pulse" />
          <div className="bg-gray-200/80 rounded-3xl animate-pulse" />
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

  // Bento layout: the first tile is large, the rest fill around it.
  // Spans are chosen per count so neither the 2-col (mobile) nor 4-col (desktop) grid leaves holes.
  const total = categories.length;
  const MD_COL_SPAN = { 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4' };
  const getSpanClass = (index) => {
    const isLast = index === total - 1;
    const classes = [];

    // Mobile (2 columns): hero is 1 col x 2 rows
    if (total === 1) classes.push('col-span-2 row-span-2');
    else if (index === 0 || (total === 2 && index === 1)) classes.push('row-span-2');
    else if (isLast && index >= 3 && (total - 3) % 2 === 1) classes.push('col-span-2');

    // Desktop (4 columns): hero is 2 cols x 2 rows
    if (total === 1) classes.push('md:col-span-4');
    else if (total === 2) classes.push('md:col-span-2 md:row-span-2');
    else if (index === 0) classes.push(total === 3 ? 'md:col-span-2 md:row-span-1' : 'md:col-span-2 md:row-span-2');
    else if (isLast && total === 4) classes.push('md:col-span-2 md:row-span-1');
    else if (isLast && total > 5 && (total - 5) % 4 !== 0) classes.push(MD_COL_SPAN[5 - ((total - 5) % 4)], 'md:row-span-1');
    else if (index > 0 && total > 3) classes.push('md:row-span-1');

    return classes.join(' ');
  };

  return (
    <Band tone="cream" spacing="loose" rounded>
      <SectionHeader
        size="md"
        icon="✨"
        title={title}
        subtitle={subtitle}
        onAction={() => navigate('/search')}
      />

      <div className="px-4 md:px-0 grid grid-cols-2 md:grid-cols-4 auto-rows-[104px] md:auto-rows-[160px] gap-2 md:gap-3">
        {categories.map((cat, index) => {
          const Icon = LucideIcons[cat.icon] || LucideIcons.Building2;
          const img = cat.image || cat.bgImage || FALLBACK_IMG;
          const isHero = index === 0;
          const spanClass = getSpanClass(index);

          return (
            <motion.button
              type="button"
              key={cat._id || index}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCategoryClick(cat)}
              className={`group relative rounded-3xl overflow-hidden text-left cursor-pointer ${spanClass}`}
              style={{ backgroundColor: cat.color || '#0f766e' }}
            >
              <img
                src={img}
                alt={cat.displayName || cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

              {cat.badge && (
                <span className="absolute top-2.5 left-2.5 bg-white/90 text-gray-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {cat.badge}
                </span>
              )}

              <div className={`absolute inset-x-0 bottom-0 ${isHero ? 'p-3.5 md:p-5' : 'p-3'} text-white`}>
                <span
                  className={`${isHero ? 'w-8 h-8 md:w-10 md:h-10 mb-2' : 'w-6 h-6 mb-1.5'} rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-md`}
                >
                  <Icon size={isHero ? 18 : 13} />
                </span>
                <h3 className={`${isHero ? 'text-lg md:text-2xl' : 'text-[13px] md:text-base'} font-extrabold leading-tight line-clamp-2`}>
                  {cat.displayName || cat.name}
                </h3>
                {isHero && cat.tagline && (
                  <p className="text-[11px] md:text-sm text-white/80 mt-1 line-clamp-2">{cat.tagline}</p>
                )}
                {isHero && (
                  <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] md:text-xs font-bold text-white/90">
                    Explore <ChevronRight size={13} />
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </Band>
  );
};

export default FeaturedCategories;
