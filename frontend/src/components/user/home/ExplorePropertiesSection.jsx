import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import PropertyFeed from '../PropertyFeed';
import { Band, SectionHeader } from './HomeLayout';

/**
 * One tabbed section replacing separate Rent / Buy / Plot carousels.
 * `tabs`: [{ key, label, title, emoji, typeId, filterLabel }] — tabs without a typeId are skipped.
 */
const ExplorePropertiesSection = ({ tabs = [], onViewAll }) => {
  const available = tabs.filter((t) => t.typeId);
  const [activeKey, setActiveKey] = useState(null);

  if (available.length === 0) return null;

  const active = available.find((t) => t.key === activeKey) || available[0];

  return (
    <Band tone="white" spacing="loose">
      <SectionHeader
        size="lg"
        icon="🏡"
        title="Explore properties"
        subtitle="Rent, buy or invest — all in one place"
      />

      {/* Segmented tabs */}
      <div className="px-4 md:px-0 mb-2">
        <div className="inline-flex p-1 bg-gray-100 rounded-full" role="tablist">
          {available.map((tab) => {
            const isActive = tab.key === active.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveKey(tab.key)}
                className={`relative px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="explore-tab-pill"
                    className="absolute inset-0 rounded-full bg-gray-900"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <span aria-hidden>{tab.emoji}</span>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <PropertyFeed selectedType={active.typeId} viewMode="list" limit={4} />
        </motion.div>
      </AnimatePresence>

      <div className="px-4 md:px-0 mt-1.5 md:mt-3">
        <button
          type="button"
          onClick={() => onViewAll?.(active.typeId, active.filterLabel)}
          className="group w-full md:w-auto md:px-8 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 hover:bg-emerald-50 text-sm font-bold text-gray-900 hover:text-emerald-700 transition-colors"
        >
          See all {active.title}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </Band>
  );
};

export default ExplorePropertiesSection;
