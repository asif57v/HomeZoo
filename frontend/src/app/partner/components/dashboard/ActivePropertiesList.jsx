import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Building2, MapPin } from 'lucide-react';

const ActivePropertiesList = ({ properties }) => {
  const navigate = useNavigate();

  if (!properties || properties.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-4 py-3 md:px-5 md:py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 text-base md:text-lg">Active Properties</h3>
        <button
          onClick={() => navigate('/hotel/properties')}
          className="text-xs font-semibold text-[#005CA8] hover:text-[#004b8a] flex items-center gap-1 hover:gap-2 transition-all"
        >
          View All <ChevronRight size={14} />
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {properties.map((property) => {
          const location = [property.address?.city, property.address?.state].filter(Boolean).join(', ');
          return (
            <div
              key={property._id}
              onClick={() => navigate('/hotel/properties')}
              className="flex items-center gap-3 px-4 py-3 md:px-5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-14 h-14 rounded-xl bg-[#005CA8]/5 overflow-hidden shrink-0 flex items-center justify-center">
                {property.coverImage ? (
                  <img src={property.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={22} className="text-[#005CA8]/60" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm truncate">{property.propertyName || 'Property'}</p>
                {location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{location}</span>
                  </p>
                )}
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {property.propertyType}
                </span>
              </div>

              <span className="shrink-0 px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide">
                Live
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivePropertiesList;
