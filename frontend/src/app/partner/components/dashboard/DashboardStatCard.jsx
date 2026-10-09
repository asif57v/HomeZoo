import React from 'react';
import { ChevronRight } from 'lucide-react';

const TONES = {
  blue: { icon: 'bg-blue-50 text-[#005CA8]', action: 'text-[#005CA8]' },
  sky: { icon: 'bg-sky-50 text-sky-600', action: 'text-sky-700' },
  purple: { icon: 'bg-purple-50 text-purple-600', action: 'text-purple-700' },
  orange: { icon: 'bg-orange-50 text-orange-500', action: 'text-orange-600' }
};

/**
 * Compact KPI tile. The whole card is the action target, so the action label
 * sits at the bottom instead of competing with the icon at the top.
 */
const DashboardStatCard = ({ icon: Icon, label, value, subtext, actionLabel, onAction, tone = 'blue', valueClass = '' }) => {
  const t = TONES[tone] || TONES.blue;

  return (
    <button
      type="button"
      onClick={onAction}
      className="group bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col text-left h-full active:scale-[0.98] hover:border-gray-200 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}>
          <Icon size={16} className="sm:w-5 sm:h-5" />
        </span>
        <p className="text-[11px] sm:text-sm text-gray-500 font-semibold leading-tight line-clamp-2">{label}</p>
      </div>

      <h3 className={`mt-2.5 sm:mt-4 text-lg sm:text-2xl font-extrabold leading-none tracking-tight truncate ${valueClass || 'text-gray-900'}`}>
        {value}
      </h3>

      {subtext && (
        <p className="hidden sm:block text-xs text-gray-400 font-medium mt-1.5 truncate">{subtext}</p>
      )}

      {actionLabel && (
        <span className={`mt-2.5 sm:mt-4 inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-bold ${t.action}`}>
          {actionLabel}
          <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </button>
  );
};

export default DashboardStatCard;
