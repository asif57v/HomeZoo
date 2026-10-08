import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const BAND_TONES = {
  white: 'bg-white',
  tint: 'bg-gradient-to-b from-emerald-50/80 to-teal-50/40',
  cream: 'bg-[#FBF7F0]',
  muted: 'bg-slate-50',
  blush: 'bg-gradient-to-b from-rose-50 to-orange-50/40',
  dark: 'bg-slate-950'
};

const BAND_SPACING = {
  tight: 'py-2 md:py-5',
  normal: 'py-3 md:py-8',
  loose: 'py-4 md:py-12'
};

/**
 * Full-width background band for a home section. Bands with different tones
 * stacked on top of each other replace borders/dividers as section separators.
 * Content fades in once when scrolled into view.
 */
export const Band = ({ tone = 'white', spacing = 'normal', rounded = false, className = '', children }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full ${BAND_TONES[tone] || BAND_TONES.white} ${BAND_SPACING[spacing]} ${rounded ? 'rounded-[1.75rem] md:rounded-none' : ''} ${className}`}
    >
      <div className="max-w-7xl mx-auto w-full">{children}</div>
    </motion.section>
  );
};

const TITLE_SIZES = {
  lg: 'text-xl sm:text-2xl md:text-3xl font-extrabold',
  md: 'text-[17px] sm:text-xl md:text-2xl font-bold',
  sm: 'text-[15px] sm:text-lg md:text-xl font-bold'
};

/**
 * Shared section heading. Uses a round arrow button instead of a "View All" text link.
 */
export const SectionHeader = ({
  title,
  subtitle,
  icon,
  size = 'md',
  dark = false,
  onAction,
  actionLabel = 'See all',
  className = ''
}) => (
  <div className={`flex items-end justify-between gap-3 px-4 md:px-0 mb-2 md:mb-4 ${className}`}>
    <div className="min-w-0">
      <h2
        className={`${TITLE_SIZES[size] || TITLE_SIZES.md} tracking-tight leading-tight flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}
      >
        {icon && <span className="shrink-0 text-[1.1em] leading-none">{icon}</span>}
        <span className="truncate">{title}</span>
      </h2>
      {subtitle && (
        <p className={`text-xs md:text-sm mt-1 ${dark ? 'text-white/60' : 'text-gray-500'}`}>{subtitle}</p>
      )}
    </div>
    {onAction && (
      <button
        type="button"
        onClick={onAction}
        aria-label={`${actionLabel}: ${title}`}
        className={`group shrink-0 flex items-center gap-1.5 text-xs md:text-sm font-semibold transition-colors ${dark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-emerald-700'}`}
      >
        <span className="hidden md:inline">{actionLabel}</span>
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5 ${dark ? 'bg-white/10' : 'bg-gray-100 group-hover:bg-emerald-50'}`}
        >
          <ArrowRight size={16} />
        </span>
      </button>
    )}
  </div>
);
