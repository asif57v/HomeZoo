import React, { useEffect, useState } from 'react';
import { propertyService, userService } from '../../services/apiService';
import PropertyCard from './PropertyCard';
import { Band, SectionHeader } from './home/HomeLayout';

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
      <section className="max-w-7xl mx-auto w-full px-4 md:px-0 py-3 md:py-8">
        <div className="h-7 w-48 bg-gray-200/70 rounded-md animate-pulse mb-4" />
        <div className="flex gap-2.5 md:gap-4 overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[64vw] md:min-w-85 h-48 md:h-72 bg-gray-200/70 rounded-3xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!config?.enabled || properties.length === 0) return null;

  return (
    <Band tone="white" spacing="normal">
      <SectionHeader
        size="lg"
        icon="🔥"
        title={config.title || 'Top Properties'}
        subtitle={config.subtitle}
      />

      <div className="flex overflow-x-auto gap-2.5 md:gap-5 no-scrollbar snap-x snap-mandatory px-4 md:px-0 scroll-pl-4 md:scroll-pl-0 pb-1">
        {properties.map((property) => (
          <PropertyCard
            key={property._id}
            data={property}
            variant="featured"
            className="w-[64vw] min-w-[64vw] max-w-xs md:w-85 md:min-w-85 snap-start shrink-0"
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
        <div className="w-1 shrink-0" />
      </div>
    </Band>
  );
};

export default TopPropertiesSection;
