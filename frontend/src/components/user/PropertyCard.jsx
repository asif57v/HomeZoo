import React, { useState, useEffect } from 'react';
import { MapPin, Star, IndianRupee, Heart, BadgeCheck, BedDouble, Sofa, Users, UtensilsCrossed, ChevronRight, Ruler, Compass, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requireLogin } from '../../utils/authGate';
import { userService, propertyService } from '../../services/apiService';
import toast from 'react-hot-toast';

// Indian-style short price for sale/plot cards: 1,00,000 -> "1 Lac", 12,500,000 -> "1.25 Cr"
const formatCompactPrice = (n) => {
  if (n >= 1e7) return `${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${+(n / 1e5).toFixed(2)} Lac`;
  return n.toLocaleString('en-IN');
};

/**
 * variant:
 *  - 'default'    boxed card (search, saved, listing pages)
 *  - 'horizontal' borderless row: image left, details right (home list sections)
 *  - 'photo'      borderless, photo-first card with text below (home carousels)
 *  - 'featured'   large image with text overlaid (home hero carousel)
 *  - 'tile'       rent: compact 3:4 catalog tile, details overlaid on the photo (home "Properties for rent")
 *  - 'sale'       poster card: tall photo with a glass info panel (home "Dream homes for sale")
 *  - 'plot'       white card with an area / price stat strip (home "Premium plots & land")
 *  - 'stay'       PG/hostel card: gender, sharing, meals, starting rent (home "Find your perfect stay")
 */
const PropertyCard = ({ property, data, className = "", isSaved: initialIsSaved, compact = false, variant = 'default' }) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(initialIsSaved || false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync with initialIsSaved if it changes
  useEffect(() => {
    if (initialIsSaved !== undefined) {
      setIsSaved(initialIsSaved);
    }
  }, [initialIsSaved]);

  const item = property || data;

  if (!item) return null;

  const {
    _id,
    name,
    address,
    images,
    propertyType,
    rating,
    startingPrice,
    details
  } = item;

  const handleToggleSave = async (e) => {
    e.stopPropagation(); // Don't navigate to details
    if (!requireLogin(navigate, 'Please login to save properties')) return;

    const targetId = _id || item?._id || item?.id;
    if (!targetId) {
      toast.error("Invalid property");
      return;
    }

    if (saveLoading) return;

    setSaveLoading(true);
    const newState = !isSaved;
    setIsSaved(newState); // Optimistic update

    try {
      await userService.toggleSavedHotel(targetId);
      toast.success(newState ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      setIsSaved(!newState); // Revert
      const msg = error?.response?.data?.message || error?.message || "Failed to update wishlist";
      toast.error(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleView = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const targetId = _id || item._id || item.id;
    if (targetId) {
      propertyService.recordViewLead(targetId).catch(() => {});
      navigate(`/hotel/${targetId}`);
    }
  };

  // Function to clean dirty URLs (handles backticks, spaces, quotes)
  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    // Remove backticks, single quotes, double quotes, and surrounding whitespace
    return url.replace(/[`'"]/g, '').trim();
  };
  const displayName = name || item.propertyName || 'Untitled';
  const dynamicCatName = item.dynamicCategory?.displayName || item.dynamicCategory?.name;

  const typeRaw = (propertyType || item.propertyType || '').toString();
  const normalizedType = typeRaw
    ? typeRaw.toLowerCase() === 'pg'
      ? 'PG'
      : typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).toLowerCase()
    : '';

  const typeLabel = dynamicCatName ? dynamicCatName.toUpperCase() : (normalizedType || typeRaw).toString().toUpperCase();


  // Improved Rating Logic
  const rawRating =
    item.avgRating !== undefined ? item.avgRating :
      item.rating !== undefined ? item.rating :
        rating;

  const reviewCount = item.totalReviews || item.reviews || 0;

  // Rating only when real reviews exist (schema defaults avgRating to 3). No reviews: "New" only while
  // the API says the listing is inside the admin-set window (Admin → Settings → Show "New" tag for).
  const displayRating = (Number(reviewCount) > 0 && Number(rawRating) > 0) ? Number(rawRating).toFixed(1) : (item.isNewListing === true ? 'New' : null);

  // Improved Price Logic - Check more fields
  const rawPrice =
    startingPrice ??
    item.startingPrice ??
    item.rentDetails?.monthlyRent ??
    item.pgDetails?.monthlyRent ??
    item.buyDetails?.expectedPrice ??
    item.plotDetails?.expectedPrice ??
    item.minPrice ??
    item.min_price ??
    item.price ??
    item.costPerNight ??
    item.amount ??
    null;

  const displayPrice =
    typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : null;

  const imageSrc =
    images?.cover ||
    cleanImageUrl(item.coverImage) ||
    cleanImageUrl(
      Array.isArray(item.propertyImages) ? item.propertyImages[0] : ''
    ) ||
    'https://via.placeholder.com/400x300?text=No+Image';

  const badgeTypeKey = normalizedType || typeRaw;

  // Housing.com style colors often use distinct semantic colors for types
  const getTypeColor = (type) => {
    switch (type) {
      case 'Hotel': return 'bg-blue-600 text-white border-blue-600';
      case 'Villa': return 'bg-purple-600 text-white border-purple-600';
      case 'Resort': return 'bg-orange-500 text-white border-orange-500';
      case 'Homestay': return 'bg-indigo-500 text-white border-indigo-500';
      case 'Hostel': return 'bg-pink-500 text-white border-pink-500';
      case 'PG': return 'bg-rose-500 text-white border-rose-500';
      default: return 'bg-emerald-600 text-white border-emerald-600';
    }
  };

  const formattedPrice = displayPrice
    ? displayPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : 'Price on Request';

  const priceSuffix = ['PG', 'Hostel', 'Rent'].includes(badgeTypeKey)
    ? '/month'
    : ['Buy', 'Plot'].includes(badgeTypeKey)
      ? ''
      : '/night';

  const locationText = `${address?.city || item.city || 'Indore'}, ${address?.state || item.state || 'Madhya Pradesh'}`;
  const isPremium = item.hasPremiumTag || item.isFeatured;
  const badgeLabel = badgeTypeKey === 'Rent' ? 'For Rent' : badgeTypeKey === 'Buy' ? 'For Sale' : typeLabel;
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
  };

  if (variant === 'featured') {
    return (
      <div
        onClick={handleView}
        className={`group relative h-48 md:h-72 rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer bg-gray-200 ${className}`}
      >
        <img
          src={imageSrc}
          alt={displayName}
          loading="lazy"
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {isPremium ? (
            <span className="flex items-center gap-1 bg-[#FFD700] text-black px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
              <Star size={9} className="fill-black" /> Premium
            </span>
          ) : badgeLabel ? (
            <span className="bg-white/20 text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
              {badgeLabel}
            </span>
          ) : <span />}
          <button
            onClick={handleToggleSave}
            aria-label="Save property"
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Heart size={16} className={isSaved ? 'fill-red-500 text-red-500' : 'text-white'} />
          </button>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-3 md:p-4 text-white">
          <div className="flex items-center gap-1.5 text-[11px] text-white/80">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{locationText}</span>
            {displayRating && (
            <span className="ml-auto flex items-center gap-0.5 font-bold text-white">
              <Star size={11} className="fill-amber-400 text-amber-400" /> {displayRating}
            </span>
            )}
          </div>
          <h3 className="mt-0.5 text-[15px] md:text-xl font-extrabold leading-tight line-clamp-1 flex items-center gap-1.5">
            <span className="truncate">{displayName}</span>
            {item.hasVerifiedTag && <BadgeCheck size={16} className="shrink-0 fill-blue-500 text-white" />}
          </h3>
          {item.propertyCode && <p className="text-[9px] font-bold tracking-wider text-white/70">ID: {item.propertyCode}</p>}
          <div className="mt-1.5 flex items-baseline gap-0.5">
            <IndianRupee size={14} className="self-center" strokeWidth={2.5} />
            <span className="text-base font-extrabold">{formattedPrice}</span>
            {displayPrice && <span className="text-[11px] text-white/70 ml-0.5">{priceSuffix}</span>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'stay') {
    const gender = item.pgDetails?.gender || item.pgType;
    const GENDER_STYLES = {
      Boys: 'bg-sky-500',
      Girls: 'bg-pink-500',
      'Co-ed': 'bg-violet-500'
    };
    const occupancy = item.pgDetails?.occupancy;
    const food = item.pgDetails?.foodIncluded || {};
    const mealCount = ['breakfast', 'lunch', 'dinner'].filter((m) => food[m]).length;
    const mealsLabel = mealCount === 3 ? 'All meals' : mealCount > 0 ? `${mealCount} meal${mealCount > 1 ? 's' : ''}/day` : null;
    const chips = [
      occupancy && { Icon: BedDouble, label: occupancy === 'Other' ? 'Sharing' : `${occupancy} sharing` },
      mealsLabel && { Icon: UtensilsCrossed, label: mealsLabel }
    ].filter(Boolean);

    return (
      <div
        onClick={handleView}
        className={`group rounded-[18px] p-[1.5px] bg-linear-to-br from-purple-400 via-indigo-400 to-teal-300 cursor-pointer shadow-[0_6px_16px_rgba(124,58,237,0.16)] active:scale-[0.98] transition-transform ${className}`}
      >
        {/* Same violet -> indigo -> teal gradient frame as the rent tiles */}
        <div className="bg-white rounded-[16.5px] overflow-hidden h-full">
        <div className="relative h-32 md:h-40 overflow-hidden bg-gray-100">
          <img
            src={imageSrc}
            alt={displayName}
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

          {gender && (
            <span className={`absolute top-2 left-2 ${GENDER_STYLES[gender] || 'bg-gray-800'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
              {gender}
            </span>
          )}
          <button
            onClick={handleToggleSave}
            aria-label="Save property"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'} />
          </button>
          {displayRating && (
          <span className="absolute bottom-2 left-2 flex items-center gap-0.5 bg-white/95 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            <Star size={10} className="fill-amber-400 text-amber-400" /> {displayRating}
            {reviewCount > 0 && <span className="text-gray-400 font-medium">({reviewCount})</span>}
          </span>
          )}
          {isPremium && (
            <span className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-[#FFD700] text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
              <Star size={8} className="fill-black" /> Premium
            </span>
          )}
        </div>

        <div className="p-2.5 md:p-3">
          <h3 className="text-[13px] md:text-[15px] font-bold text-gray-900 truncate flex items-center gap-1">
            <span className="truncate">{displayName}</span>
            {item.hasVerifiedTag && <BadgeCheck size={14} className="shrink-0 fill-blue-500 text-white" />}
          </h3>
          <p className="flex items-center gap-0.5 text-[11px] text-gray-500 truncate mt-0.5">
            <MapPin size={10} className="shrink-0 text-gray-400" />
            <span className="truncate">{locationText}</span>
          </p>

          {chips.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
              {chips.map(({ Icon, label }) => (
                <span key={label} className="shrink-0 flex items-center gap-1 bg-gray-50 text-gray-700 text-[10px] font-semibold px-2 py-1 rounded-lg">
                  <Icon size={11} className="text-emerald-600" />
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {displayPrice && <p className="text-[9px] uppercase tracking-wide font-semibold text-gray-400 leading-none">Starts from</p>}
              <div className="flex items-baseline gap-0.5 text-gray-900 mt-0.5">
                <IndianRupee size={12} className="self-center" strokeWidth={2.5} />
                <span className="text-sm md:text-base font-extrabold">{formattedPrice}</span>
                {displayPrice && <span className="text-[10px] text-gray-500 ml-0.5">/month</span>}
              </div>
            </div>
            <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
              <ChevronRight size={16} />
            </span>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (variant === 'tile') {
    const r = item.rentDetails || {};
    const bhk = r.type || r.bhkType || item.bhkType || item.bhk || item.roomType || 'For Rent';
    const furnish = r.furnishing || item.furnishing;

    // Gradient-border card: violet -> indigo -> teal frame, photo on top, white info panel below.
    return (
      <div
        onClick={handleView}
        className={`group rounded-[18px] p-[1.5px] bg-linear-to-br from-purple-400 via-indigo-400 to-teal-300 cursor-pointer shadow-[0_6px_16px_rgba(124,58,237,0.18)] active:scale-[0.97] transition-transform ${className}`}
      >
        <div className="rounded-[16.5px] bg-white overflow-hidden h-full">
          <div className="relative aspect-[1/0.82] bg-gray-100 overflow-hidden">
            <img
              src={imageSrc}
              alt={displayName}
              loading="lazy"
              onError={handleImageError}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
              {isPremium ? (
                <span className="flex items-center gap-0.5 bg-[#FFD700] text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                  <Star size={8} className="fill-black" /> Premium
                </span>
              ) : <span />}
              <button
                onClick={handleToggleSave}
                aria-label="Save property"
                className="w-[30px] h-[30px] rounded-full bg-white shadow-sm flex items-center justify-center active:scale-90 transition-transform"
              >
                <Heart size={15} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'} />
              </button>
            </div>
            <span className="absolute bottom-2 left-2 max-w-[85%] flex items-center gap-1 bg-violet-600 text-white text-[10px] font-extrabold px-[7px] py-[3px] rounded-[7px]">
              <BedDouble size={11} className="shrink-0" /> <span className="truncate">{bhk}</span>
            </span>
          </div>

          <div className="px-2.5 pt-2 pb-2.5">
            {displayPrice ? (
              <div className="flex items-baseline gap-0.5 text-gray-900">
                <IndianRupee size={13} className="self-center" strokeWidth={2.5} />
                <span className="text-[15px] font-extrabold leading-tight">{formattedPrice}</span>
                <span className="text-[11px] text-gray-500 ml-0.5">/mo</span>
              </div>
            ) : (
              <span className="text-[13px] font-extrabold text-gray-900 leading-tight">Price on request</span>
            )}
            <h3 className="text-[13px] font-extrabold text-gray-900 flex items-center gap-1 mt-1">
              <span className="truncate">{displayName}</span>
              {item.hasVerifiedTag && <BadgeCheck size={13} className="shrink-0 fill-blue-500 text-white" />}
            </h3>
            <p className="flex items-center gap-[3px] text-[10.5px] text-gray-500 mt-[3px]">
              <MapPin size={10} className="shrink-0 text-gray-400" /> <span className="truncate">{locationText}</span>
            </p>
            <div className="flex items-center justify-between mt-2">
              {displayRating ? (
                <span className="flex items-center gap-[3px] text-[11px] font-extrabold text-gray-900">
                  <Star size={11} className="fill-amber-400 text-amber-400" /> {displayRating}
                </span>
              ) : <span />}
              {furnish && <span className="text-[10.5px] font-bold text-violet-600 truncate">{furnish}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'sale') {
    const b = item.buyDetails || {};
    const area = b.area?.superBuiltUp || b.area?.carpet;
    const specs = [
      b.type,
      area && `${Number(area).toLocaleString('en-IN')} ${b.area?.unit || 'sqft'}`,
      b.facing && `${b.facing} facing`
    ].filter(Boolean);

    return (
      <div
        onClick={handleView}
        className={`group relative aspect-4/5 rounded-3xl overflow-hidden cursor-pointer bg-gray-200 shadow-[0_10px_28px_rgba(15,23,42,0.18)] active:scale-[0.98] transition-transform ${className}`}
      >
        <img
          src={imageSrc}
          alt={displayName}
          loading="lazy"
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/35 via-transparent to-black/30" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">For Sale</span>
            {isPremium && (
              <span className="flex items-center gap-0.5 bg-[#FFD700] text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-1 rounded-full">
                <Star size={8} className="fill-black" /> Premium
              </span>
            )}
          </div>
          <button
            onClick={handleToggleSave}
            aria-label="Save property"
            className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Heart size={16} className={isSaved ? 'fill-red-500 text-red-500' : 'text-white'} />
          </button>
        </div>

        {/* Glass info panel */}
        <div className="absolute bottom-2.5 inset-x-2.5 rounded-2xl bg-black/35 border border-white/25 p-2.5 text-white">
          <div className="flex items-center justify-between gap-2">
            {displayPrice ? (
              <span className="flex items-baseline gap-0.5">
                <IndianRupee size={14} className="self-center" strokeWidth={2.5} />
                <span className="text-lg font-extrabold leading-none">{formatCompactPrice(displayPrice)}</span>
              </span>
            ) : (
              <span className="text-sm font-bold leading-none">Price on request</span>
            )}
            {displayRating && (
            <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold">
              <Star size={11} className="fill-amber-400 text-amber-400" /> {displayRating}
            </span>
            )}
          </div>
          <h3 className="text-[13px] font-bold truncate flex items-center gap-1 mt-1.5">
            <span className="truncate">{displayName}</span>
            {item.hasVerifiedTag && <BadgeCheck size={13} className="shrink-0 fill-blue-500 text-white" />}
          </h3>
          <p className="flex items-center gap-0.5 text-[10px] text-white/80 truncate">
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{locationText}</span>
          </p>
          {specs.length > 0 && (
            <p className="text-[10px] text-white/90 font-medium truncate mt-1">{specs.join('  ·  ')}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'plot') {
    const p = item.plotDetails || {};
    const areaText = p.plotArea ? `${Number(p.plotArea).toLocaleString('en-IN')} ${p.unit || 'sqyrd'}` : '—';
    const tag = p.landType || (p.facing && `${p.facing} facing`);

    return (
      <div
        onClick={handleView}
        className={`group bg-white rounded-2xl overflow-hidden cursor-pointer ring-1 ring-amber-200 shadow-[0_4px_14px_rgba(180,83,9,0.10)] active:scale-[0.98] transition-transform ${className}`}
      >
        <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
          <img
            src={imageSrc}
            alt={displayName}
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {isPremium && (
            <span className="absolute top-2 left-2 flex items-center gap-0.5 bg-[#FFD700] text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
              <Star size={8} className="fill-black" /> Premium
            </span>
          )}
          <button
            onClick={handleToggleSave}
            aria-label="Save property"
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'} />
          </button>
          {tag && (
            <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
              {tag}
            </span>
          )}
          {displayRating && (
          <span className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/45 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            <Star size={9} className="fill-amber-400 text-amber-400" /> {displayRating}
          </span>
          )}
        </div>

        <div className="p-2.5">
          <h3 className="text-[13px] font-bold text-gray-900 truncate flex items-center gap-1">
            <span className="truncate">{displayName}</span>
            {item.hasVerifiedTag && <BadgeCheck size={13} className="shrink-0 fill-blue-500 text-white" />}
          </h3>
          <p className="flex items-center gap-0.5 text-[10px] text-gray-500 truncate mt-0.5">
            <MapPin size={9} className="shrink-0 text-gray-400" />
            <span className="truncate">{locationText}</span>
          </p>

          {/* Area / Price strip */}
          <div className="mt-2 grid grid-cols-2 divide-x divide-amber-200 rounded-xl bg-amber-50 py-1.5 text-center">
            <div className="px-1 min-w-0">
              <p className="text-[8px] uppercase tracking-wider font-bold text-amber-700/70">Area</p>
              <p className="text-[11px] font-extrabold text-gray-900 leading-tight truncate">{areaText}</p>
            </div>
            <div className="px-1 min-w-0">
              <p className="text-[8px] uppercase tracking-wider font-bold text-amber-700/70">Price</p>
              <p className="text-[11px] font-extrabold text-gray-900 leading-tight truncate">
                {displayPrice ? `₹${formatCompactPrice(displayPrice)}` : 'On request'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'photo') {
    return (
      <div onClick={handleView} className={`group cursor-pointer ${className}`}>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
          <img
            src={imageSrc}
            alt={displayName}
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {isPremium && (
            <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#FFD700] text-black px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
              <Star size={8} className="fill-black" /> Premium
            </span>
          )}
          <button
            onClick={handleToggleSave}
            aria-label="Save property"
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Heart
              size={20}
              className={`drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${isSaved ? 'fill-red-500 text-red-500' : 'fill-black/25 text-white'}`}
            />
          </button>
        </div>

        <div className="pt-2 px-0.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] md:text-[15px] font-bold text-gray-900 truncate flex items-center gap-1">
              <span className="truncate">{displayName}</span>
              {item.hasVerifiedTag && <BadgeCheck size={14} className="shrink-0 fill-blue-500 text-white" />}
            </h3>
            {displayRating && (
            <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-semibold text-gray-800">
              <Star size={11} className="fill-gray-900 text-gray-900" /> {displayRating}
            </span>
            )}
          </div>
          <p className="text-[11px] md:text-xs text-gray-500 truncate mt-0.5">{locationText}</p>
          <div className="mt-1 flex items-baseline gap-0.5 text-gray-900">
            <IndianRupee size={12} className="self-center" strokeWidth={2.5} />
            <span className="text-[13px] md:text-sm font-extrabold">{formattedPrice}</span>
            {displayPrice && <span className="text-[10px] text-gray-500 ml-0.5">{priceSuffix}</span>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'horizontal') {
    const bhk = item.rentDetails?.type || item.rentDetails?.bhkType || item.bhkType || item.bhk || item.roomType;
    const furnishing = item.rentDetails?.furnishing || item.furnishing;
    const tenant = item.rentDetails?.tenantPreference;
    const specs = [
      bhk && { Icon: BedDouble, label: bhk },
      furnishing && { Icon: Sofa, label: furnishing },
      tenant && { Icon: Users, label: tenant }
    ].filter(Boolean);

    return (
      <div
        onClick={handleView}
        className={`group relative flex items-center gap-2.5 py-2 md:gap-3 md:py-3 cursor-pointer ${className}`}
      >
        {/* Image */}
        <div className="relative w-28 h-24 md:w-36 md:h-28 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
          <img
            src={imageSrc}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={handleImageError}
          />
          {badgeLabel && (
            <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              {badgeLabel}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] md:text-base font-bold text-gray-900 leading-tight line-clamp-1 flex items-center gap-1 group-hover:text-emerald-700 transition-colors">
              <span className="truncate">{displayName}</span>
              {item.hasVerifiedTag && <BadgeCheck size={14} className="shrink-0 fill-blue-500 text-white" />}
            </h3>
            <button
              onClick={handleToggleSave}
              className="shrink-0 -mt-0.5 active:scale-90 transition-transform"
              aria-label="Save property"
            >
              <Heart size={18} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-500'} />
            </button>
          </div>

          <div className="flex items-center gap-1 text-gray-500 text-[11px]">
            <MapPin size={10} className="shrink-0 text-gray-400" />
            <span className="truncate">{locationText}</span>
            {displayRating && (
            <span className="ml-auto shrink-0 flex items-center gap-0.5 font-semibold text-gray-800">
              <Star size={10} className="fill-amber-400 text-amber-400" /> {displayRating}
            </span>
            )}
          </div>

          {(specs.length > 0 || isPremium) && (
            <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[10px] md:text-[11px] text-gray-600">
              {specs.map(({ Icon, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <Icon size={12} className="text-gray-500" />
                  {label}
                </span>
              ))}
              {isPremium && (
                <span className="flex items-center gap-0.5 bg-[#FFD700] text-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                  <Star size={8} className="fill-black" />
                  Premium
                </span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-0.5 mt-0.5">
            <IndianRupee size={13} className="text-emerald-700 self-center" strokeWidth={2.5} />
            <span className="text-sm md:text-base font-extrabold text-emerald-700 tracking-tight">
              {formattedPrice}
            </span>
            {displayPrice && (
              <span className="text-[10px] text-gray-500 font-medium ml-0.5">{priceSuffix}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleView}
      className={`group bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 hover:-translate-y-1 ${className}`}
    >
      {/* Image Container - Reduced height for compact look */}
      <div className={`relative ${compact ? 'h-[104px]' : 'h-40'} w-full bg-gray-100 overflow-hidden`}>
        <img
          src={imageSrc}
          alt={displayName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70" />

        {/* Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-1.5">
            {typeLabel && (
              <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wide shadow-sm flex items-center gap-1 ${getTypeColor(badgeTypeKey)}`}>
                {typeLabel}
              </span>
            )}
            {item.hasVerifiedTag && (
              <div className="bg-white/90 p-0.5 rounded-full shadow-sm">
                <BadgeCheck size={14} className="fill-blue-500 text-white" />
              </div>
            )}
          </div>

          {/* Subscription/Premium Tag */}
        </div>

        {/* Top Right: Wishlist & Rating */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-2 items-end">
          <button
            onClick={handleToggleSave}
            className="p-1.5 bg-white/90 rounded-full shadow-md z-20 hover:bg-white active:scale-95 transition-all"
          >
            <Heart
              size={14}
              className={`${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
            />
          </button>

          <div className="flex items-center gap-1 bg-white/90 px-1.5 py-0.5 rounded-[4px] shadow-sm text-[10px] font-bold text-gray-800">
            {displayRating && (
            <span className="text-green-600 font-extrabold">{displayRating}</span>
            )}
            <Star size={9} className="fill-green-600 text-green-600" />
          </div>
        </div>
      </div>

      {/* Content Section - Compact & Optimized */}
      <div className={`${compact ? 'p-2 gap-0.5' : 'p-2.5 gap-1'} flex flex-col`}>
        {/* Title & Info */}
        <div>
          {item.propertyCode && (
            <p className="text-[9px] font-bold tracking-wider text-gray-400 leading-none mb-0.5">ID: {item.propertyCode}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-bold ${compact ? 'text-[13px]' : 'text-sm'} text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors`}>
              {displayName}
            </h3>
            {(badgeTypeKey === 'PG' || badgeTypeKey === 'Hostel') && (item.pgDetails?.gender || item.pgType) && (
              <span className="shrink-0 bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-rose-100 italic">
                {item.pgDetails?.gender || item.pgType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-gray-500 text-[10px] mt-0.5">
            <MapPin size={9} className="shrink-0 text-gray-400" />
            <span className="line-clamp-1 truncate">
              {address?.city || item.city || 'Indore'}, {address?.state || item.state || 'Madhya Pradesh'}
            </span>
          </div>

          {/* Quick Specs - Compact Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {/* Rent/Sale Type */}
            {(item.rentDetails?.type || item.rentDetails?.bhkType || item.bhkType || item.bhk || item.roomType) ? (
              <span className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded text-[9px] font-bold border border-emerald-100">
                {item.rentDetails?.type || item.rentDetails?.bhkType || item.bhkType || item.bhk || item.roomType}
              </span>
            ) : badgeTypeKey === 'Rent' ? (
              <span className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded text-[9px] font-bold border border-emerald-100">
                RENT PROPERTY
              </span>
            ) : null}

            {/* Buy Type */}
            {badgeTypeKey === 'Buy' && (item.buyDetails?.type || item.buyDetails?.area?.superBuiltUp) && (
              <span className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded text-[9px] font-bold border border-blue-100">
                {item.buyDetails?.type || `${item.buyDetails?.area?.superBuiltUp} ${item.buyDetails?.area?.unit || 'sqft'}`}
              </span>
            )}

            {/* PG/Gender */}
            {(item.hasPremiumTag || item.isFeatured) && (
              <span className="bg-[#FFD700] text-black px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Star size={10} className="fill-black" />
                PREMIUM Listing
              </span>
            )}

            {/* Furnishing */}
            {(item.rentDetails?.furnishing || item.furnishing) && (
              <span className="text-[9px] text-gray-500 font-medium">
                • {item.rentDetails?.furnishing || item.furnishing}
              </span>
            )}
          </div>
        </div>

        {/* Price & Actions Row - Integrated */}
        <div className={`${compact ? 'mt-1 pt-1.5' : 'mt-1.5 pt-2'} border-t border-gray-50 flex items-center justify-between`}>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-0.5">
              <IndianRupee size={13} className="text-gray-900" strokeWidth={2.5} />
              <span className={`${compact ? 'text-sm' : 'text-base'} font-bold text-gray-900 tracking-tight`}>
                {formattedPrice}
              </span>
              {displayPrice && (
                <span className="text-[9px] text-gray-500 font-medium ml-0.5">
                  {priceSuffix}
                </span>
              )}
            </div>
            {['PG', 'Hostel', 'Rent'].includes(badgeTypeKey) && displayPrice && (
              <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-tighter -mt-0.5">Monthly Rent</span>
            )}
            {badgeTypeKey === 'Buy' && displayPrice && (
              <span className="text-[8px] text-blue-600 font-bold uppercase tracking-tighter -mt-0.5">Total Price</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleView}
              className={`${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'} text-[10px] font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm active:scale-95`}
            >
              View
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
