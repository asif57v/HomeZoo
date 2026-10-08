import React, { useEffect, useState } from 'react';
import { propertyService, userService } from '../../services/apiService';
import PropertyCard from './PropertyCard';
import { Loader2 } from 'lucide-react';

const PropertyFeed = ({ selectedType, selectedCity, viewMode = 'grid', limit, extraFilters = {} }) => {
  const [properties, setProperties] = useState([]);
  const [savedHotelIds, setSavedHotelIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPropertiesAndSaved = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = {};
        // Add extra filters only if they have a value
        Object.keys(extraFilters).forEach(key => {
          if (extraFilters[key] !== undefined && extraFilters[key] !== null) {
            filters[key] = extraFilters[key];
          }
        });

        // Only add type filter if a specific category is selected (not null/empty/All)
        if (selectedType && selectedType !== 'All' && selectedType !== null && selectedType !== '') {
          filters.type = selectedType;
        }

        // Fetch properties and saved status in parallel if logged in
        const promises = [propertyService.getPublic(filters)];
        if (localStorage.getItem('token')) {
          promises.push(userService.getSavedHotels());
        }

        const [data, savedRes] = await Promise.all(promises);

        if (savedRes) {
          const list = savedRes.savedHotels || [];
          setSavedHotelIds(list.map(h => (typeof h === 'object' ? h._id : h)));
        }

        let filteredData = data;
        if (selectedCity && selectedCity !== 'All') {
          filteredData = data.filter(p => p.address?.city?.toLowerCase() === selectedCity.toLowerCase());
        }

        setProperties(filteredData);
      } catch (err) {
        console.error("Failed to fetch properties:", err);
        setError("Could not load properties. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertiesAndSaved();
  }, [selectedType, selectedCity, JSON.stringify(extraFilters)]);

  if (loading) {
    if (viewMode === 'list') {
      return (
        <div className="px-4 md:px-0 grid md:grid-cols-2 md:gap-x-8">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex items-center gap-2.5 py-2 md:gap-3 md:py-3 animate-pulse">
              <div className="w-28 h-24 md:w-36 md:h-28 rounded-2xl bg-gray-200/80 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 bg-gray-200/80 rounded" />
                <div className="h-2.5 w-1/2 bg-gray-200/80 rounded" />
                <div className="h-3.5 w-1/3 bg-gray-200/80 rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (viewMode === 'stay-carousel') {
      return (
        <div className="flex gap-2.5 md:gap-4 overflow-hidden px-4 md:px-0 pt-1 pb-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="w-[58vw] min-w-[58vw] max-w-64 md:w-64 md:min-w-64 shrink-0 rounded-2xl overflow-hidden ring-1 ring-gray-100 animate-pulse">
              <div className="h-32 md:h-40 bg-gray-200/80" />
              <div className="p-2.5 space-y-2">
                <div className="h-3.5 w-3/4 bg-gray-200/80 rounded" />
                <div className="h-2.5 w-1/2 bg-gray-200/80 rounded" />
                <div className="h-4 w-1/3 bg-gray-200/80 rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (viewMode === 'photo-carousel') {
      return (
        <div className="flex gap-2.5 md:gap-5 overflow-hidden px-4 md:px-0">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="w-[62vw] min-w-[62vw] md:w-auto md:min-w-65 shrink-0 animate-pulse">
              <div className="aspect-[4/3] rounded-2xl bg-gray-200/80" />
              <div className="h-3.5 w-3/4 bg-gray-200/80 rounded mt-2.5" />
              <div className="h-2.5 w-1/2 bg-gray-200/80 rounded mt-1.5" />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className={`flex justify-center items-center ${viewMode === 'carousel' ? 'h-56' : 'py-20'}`}>
        <Loader2 className="animate-spin text-surface" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        {error}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className={`text-center text-gray-500 ${viewMode === 'grid' ? 'py-20' : 'py-8 text-sm'}`}>
        <p>No properties found in this category.</p>
      </div>
    );
  }

  const displayedProperties = limit ? properties.slice(0, limit) : properties;

  if (viewMode === 'list') {
    return (
      <div className="px-4 md:px-0 grid md:grid-cols-2 md:gap-x-8 divide-y divide-gray-100 md:divide-y-0">
        {displayedProperties.map(property => (
          <PropertyCard
            key={property._id}
            data={property}
            variant="horizontal"
            className="md:border-b md:border-gray-100"
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
      </div>
    );
  }

  if (viewMode === 'stay-carousel') {
    return (
      <div className="flex gap-2.5 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-0 scroll-pl-4 md:scroll-pl-0 pt-1 pb-3">
        {displayedProperties.map(property => (
          <PropertyCard
            key={property._id}
            data={property}
            variant="stay"
            className="w-[58vw] min-w-[58vw] max-w-64 md:w-64 md:min-w-64 snap-start shrink-0"
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
        <div className="w-1 shrink-0" />
      </div>
    );
  }

  if (viewMode === 'photo-carousel') {
    return (
      <div className="flex gap-2.5 md:gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-0 scroll-pl-4 md:scroll-pl-0 pb-1">
        {displayedProperties.map(property => (
          <PropertyCard
            key={property._id}
            data={property}
            variant="photo"
            className="w-[62vw] min-w-[62vw] max-w-72 md:w-65 md:min-w-65 snap-start shrink-0"
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
        <div className="w-1 shrink-0" />
      </div>
    );
  }

  if (viewMode === 'carousel') {
    return (
      <div className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-2 pl-3.5 pr-3.5 md:px-0 scroll-pl-3.5 pb-1">
        {displayedProperties.map(property => (
          <PropertyCard
            key={property._id}
            data={property}
            compact
            className="w-[calc(50vw-20px)] min-w-[calc(50vw-20px)] md:w-auto md:min-w-[270px] snap-start shrink-0"
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
        {/* Spacer for right padding */}
        <div className="w-2 shrink-0" />
      </div>
    );
  }

  return (
    <div className="px-3.5 md:px-0 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {displayedProperties.map(property => (
        <PropertyCard
          key={property._id}
          data={property}
          isSaved={savedHotelIds.includes(property._id)}
        />
      ))}
    </div>
  );
};

export default PropertyFeed;
