import React, { useEffect, useState } from 'react';
import { propertyService, userService } from '../../services/apiService';
import PropertyCard from './PropertyCard';

/**
 * Admin-curated "Top Properties" section.
 * `config` comes from GET /api/home -> sections.topProperties ({ title, subtitle, propertyIds }).
 */
const TopPropertiesSection = ({ config, loading: configLoading = false }) => {
  const ids = config?.propertyIds || [];
  const idsKey = ids.join(',');

  const [properties, setProperties] = useState([]);
  const [savedHotelIds, setSavedHotelIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!idsKey) {
      setProperties([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const promises = [propertyService.getPublic({ ids: idsKey })];
        if (localStorage.getItem('token')) promises.push(userService.getSavedHotels());
        const [data, savedRes] = await Promise.all(promises);

        if (cancelled) return;

        if (savedRes) {
          const list = savedRes.savedHotels || [];
          setSavedHotelIds(list.map((h) => (typeof h === 'object' ? h._id : h)));
        }

        // Keep the order the admin chose
        const byId = new Map((data || []).map((p) => [String(p._id), p]));
        setProperties(idsKey.split(',').map((id) => byId.get(id)).filter(Boolean));
      } catch (err) {
        console.error('Failed to load top properties:', err);
        if (!cancelled) setProperties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (configLoading || loading) {
    if (!configLoading && !idsKey) return null;
    return (
      <section className="max-w-7xl mx-auto w-full px-3.5 md:px-0 py-2.5">
        <div className="h-6 w-40 bg-gray-200/70 rounded-md animate-pulse mb-3" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[75vw] md:min-w-[270px] h-56 bg-gray-200/70 rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!config?.enabled || properties.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto w-full py-2.5 md:py-4">
      <div className="px-3.5 md:px-0 mb-1.5 md:mb-2">
        <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">{config.title || 'Top Properties'}</h2>
        {config.subtitle && <p className="text-xs md:text-sm text-gray-500 mt-0.5">{config.subtitle}</p>}
      </div>

      <div className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-2 pl-3.5 pr-3.5 md:px-0 scroll-pl-3.5 pb-1">
        {properties.map((property) => (
          <PropertyCard
            key={property._id}
            data={property}
            className="min-w-[75vw] md:min-w-[270px] snap-start shrink-0"
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
        <div className="w-2 shrink-0" />
      </div>
    </section>
  );
};

export default TopPropertiesSection;
