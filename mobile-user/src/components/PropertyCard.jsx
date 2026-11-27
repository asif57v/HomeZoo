import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { MapPin, Star, IndianRupee, Heart, BadgeCheck, BedDouble, ChevronRight, UtensilsCrossed } from 'lucide-react-native';
import { Text } from './ui';
import { userService } from '../services/apiService';
import { storage } from '../lib/storage';
import toast from '../store/toastStore';
import { colors } from '../theme';
import { useResponsive } from '../lib/responsive';
import { formatCompactPrice, cleanImageUrl, errMsg, roomSharingLabel, realRating } from '../utils/format';

const PLACEHOLDER = 'https://via.placeholder.com/400x300?text=No+Image';

const TYPE_COLORS = {
  Hotel: colors.blue600, Villa: colors.purple600, Resort: colors.orange500, Homestay: colors.indigo600,
  Hostel: '#EC4899', PG: colors.rose500,
};

const CardImg = ({ uri }) => <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={100} cachePolicy="memory-disk" recyclingKey={uri} />;
const Fade = ({ colorsArr = ['transparent', 'rgba(0,0,0,0.75)'], start = { x: 0, y: 0.3 }, end = { x: 0, y: 1 } }) => (
  <LinearGradient colors={colorsArr} start={start} end={end} style={StyleSheet.absoluteFill} pointerEvents="none" />
);

const Premium = ({ small }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
    <Star size={small ? 8 : 9} color="#000" fill="#000" />
    <Text style={{ fontSize: small ? 8 : 9, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 }}>Premium</Text>
  </View>
);

// Web: <BadgeCheck className="fill-blue-500 text-white" /> (solid blue badge, white tick)
const Verified = ({ size = 13 }) => <BadgeCheck size={size} color="#fff" fill="#3B82F6" />;

const SaveBtn = ({ saved, onPress, size = 14, bg = 'rgba(255,255,255,0.9)', inactive = colors.gray600, box = 28 }) => (
  <TouchableOpacity onPress={onPress} style={{ width: box, height: box, borderRadius: box / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Heart size={size} color={saved ? colors.red500 : inactive} fill={saved ? colors.red500 : 'transparent'} />
  </TouchableOpacity>
);

const Price = ({ price, formatted, suffix, size = 16, color = '#fff', suffixColor = 'rgba(255,255,255,0.7)' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <IndianRupee size={size - 2} color={color} strokeWidth={2.5} />
    <Text style={{ fontSize: size, fontWeight: '800', color }}>{formatted}</Text>
    {price ? <Text style={{ fontSize: 11, color: suffixColor, marginLeft: 2 }}>{suffix}</Text> : null}
  </View>
);

// Fallback lead source when the parent does not pass one
const SCREEN_NAMES = { '/': 'Home', '/search': 'Search results', '/saved-places': 'Wishlist' };

const PropertyCard = ({ property, data, style, isSaved: initialIsSaved, compact = false, variant = 'default', onSavedChange, source }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isTablet } = useResponsive();
  const [isSaved, setIsSaved] = useState(initialIsSaved || false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (initialIsSaved !== undefined) setIsSaved(initialIsSaved);
  }, [initialIsSaved]);

  const item = property || data;
  if (!item) return null;
  const { _id, name, address, images, propertyType, rating, startingPrice } = item;

  const handleToggleSave = async () => {
    if (!storage.getItem('token')) { toast.error('Please login to save properties'); return; }
    const targetId = _id || item?._id || item?.id;
    if (!targetId) { toast.error('Invalid property'); return; }
    if (saveLoading) return;
    setSaveLoading(true);
    const newState = !isSaved;
    setIsSaved(newState);
    try {
      await userService.toggleSavedHotel(targetId);
      toast.success(newState ? 'Added to wishlist' : 'Removed from wishlist');
      onSavedChange && onSavedChange(targetId, newState);
    } catch (error) {
      setIsSaved(!newState);
      toast.error(errMsg(error, 'Failed to update wishlist'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleView = () => {
    const targetId = _id || item._id || item.id;
    if (targetId) {
      // The property page records the view lead with this source (one lead per open)
      const from = source || SCREEN_NAMES[pathname] || 'App';
      router.push({ pathname: '/property/[id]', params: { id: String(targetId), from } });
    }
  };

  const displayName = name || item.propertyName || 'Untitled';
  const dynamicCatName = item.dynamicCategory?.displayName || item.dynamicCategory?.name;
  const typeRaw = (propertyType || '').toString();
  const normalizedType = typeRaw ? (typeRaw.toLowerCase() === 'pg' ? 'PG' : typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).toLowerCase()) : '';
  const typeLabel = dynamicCatName ? dynamicCatName.toUpperCase() : (normalizedType || typeRaw).toString().toUpperCase();
  const reviewCount = item.totalReviews || 0;
  const displayRating = realRating({ ...item, avgRating: item.avgRating ?? item.rating ?? rating });
  const rawPrice = startingPrice ?? item.rentDetails?.monthlyRent ?? item.pgDetails?.monthlyRent ?? item.buyDetails?.expectedPrice
    ?? item.plotDetails?.expectedPrice ?? item.minPrice ?? item.min_price ?? item.price ?? item.costPerNight ?? item.amount ?? null;
  const displayPrice = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : null;
  const imageSrc = images?.cover || cleanImageUrl(item.coverImage) || cleanImageUrl(Array.isArray(item.propertyImages) ? item.propertyImages[0] : '') || PLACEHOLDER;
  const badgeTypeKey = normalizedType || typeRaw;
  const formattedPrice = displayPrice ? displayPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 'Price on Request';
  const priceSuffix = ['PG', 'Hostel', 'Rent'].includes(badgeTypeKey) ? '/month' : ['Buy', 'Plot'].includes(badgeTypeKey) ? '' : '/night';
  // Real address only (no default city): area, city, state as the owner entered them
  const city = address?.city || item.city;
  const area = address?.area && address.area !== city ? address.area : null;
  const locationText = [area || city, area ? city : (address?.state || item.state)].filter(Boolean).join(', ') || 'Location not added';
  const isPremium = item.hasPremiumTag || item.isFeatured;
  const badgeLabel = badgeTypeKey === 'Rent' ? 'For Rent' : badgeTypeKey === 'Buy' ? 'For Sale' : typeLabel;
  // Readable property code (HZ-PG-1001), shown on every card like the web
  const codeLine = (color) => (item.propertyCode
    ? <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.6, color }}>ID: {item.propertyCode}</Text>
    : null);


  if (variant === 'featured') {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={handleView} style={[{ height: isTablet ? 280 : 192, borderRadius: 20, backgroundColor: colors.gray200, overflow: 'hidden' }, style]}>
        <CardImg uri={imageSrc} /><Fade />
        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {isPremium ? <Premium /> : badgeLabel ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badgeLabel}</Text>
            </View>) : <View />}
          <SaveBtn saved={isSaved} onPress={handleToggleSave} size={16} bg="rgba(255,255,255,0.25)" inactive="#fff" box={32} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={11} color="rgba(255,255,255,0.8)" />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{locationText}</Text>
            {displayRating ? <><Star size={11} color={colors.amber400} fill={colors.amber400} /><Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{displayRating}</Text></> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: '800', color: '#fff' }}>{displayName}</Text>
            {item.hasVerifiedTag && <BadgeCheck size={16} color="#fff" />}
          </View>
          {codeLine('rgba(255,255,255,0.7)')}
          <View style={{ marginTop: 6 }}><Price price={displayPrice} formatted={formattedPrice} suffix={priceSuffix} /></View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'stay') {
    const gender = item.pgDetails?.gender || item.pgType;
    const GENDER = { Boys: '#0EA5E9', Girls: '#EC4899', 'Co-ed': '#8B5CF6' };
    const sharing = roomSharingLabel(item.roomTypes, item.pgDetails?.occupancy);
    const food = item.pgDetails?.foodIncluded || {};
    const mealCount = ['breakfast', 'lunch', 'dinner'].filter((m) => food[m]).length;
    const mealsLabel = mealCount === 3 ? 'All meals' : mealCount > 0 ? `${mealCount} meal${mealCount > 1 ? 's' : ''}/day` : null;
    const chips = [sharing && { Icon: BedDouble, label: sharing }, mealsLabel && { Icon: UtensilsCrossed, label: mealsLabel }].filter(Boolean);
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={handleView} style={[{ borderRadius: 18, shadowColor: '#7C3AED', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, marginVertical: 4 }, style]}>
        {/* Same violet -> indigo -> teal gradient frame as the rent tiles */}
        <LinearGradient colors={['#C084FC', '#818CF8', '#5EEAD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 1.5, flex: 1 }}>
        <View style={{ borderRadius: 16.5, backgroundColor: '#fff', overflow: 'hidden', flex: 1 }}>
        <View style={{ height: isTablet ? 170 : 128, backgroundColor: colors.gray100 }}>
          <CardImg uri={imageSrc} /><Fade colorsArr={['transparent', 'rgba(0,0,0,0.35)']} start={{ x: 0, y: 0.5 }} />
          {gender ? <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: GENDER[gender] || colors.gray700, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{gender}</Text></View> : null}
          <View style={{ position: 'absolute', top: 8, right: 8 }}><SaveBtn saved={isSaved} onPress={handleToggleSave} /></View>
          {displayRating && (
          <View style={{ position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Star size={10} color={colors.amber400} fill={colors.amber400} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray900 }}>{displayRating}</Text>
            {reviewCount > 0 ? <Text style={{ fontSize: 10, color: colors.gray400 }}>({reviewCount})</Text> : null}
          </View>
          )}
          {isPremium ? <View style={{ position: 'absolute', bottom: 8, right: 8 }}><Premium small /></View> : null}
        </View>
        <View style={{ padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.gray900 }}>{displayName}</Text>
            {item.hasVerifiedTag && <Verified size={14} />}
          </View>
          {codeLine(colors.gray400)}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <MapPin size={10} color={colors.gray400} /><Text numberOfLines={1} style={{ flex: 1, fontSize: 11, color: colors.gray500 }}>{locationText}</Text>
          </View>
          {chips.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {chips.map(({ Icon, label }) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.emerald50, borderWidth: 1, borderColor: colors.emerald100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Icon size={11} color={colors.emerald600} /><Text style={{ fontSize: 10, fontWeight: '600', color: colors.emerald700 }}>{label}</Text>
                </View>))}
            </View>)}
          <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BFDBFE', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              {displayPrice ? <Text style={{ fontSize: 9, fontWeight: '600', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.4 }}>Starts from</Text> : null}
              <Price price={displayPrice} formatted={formattedPrice} suffix="/month" size={14} color={colors.gray900} suffixColor={colors.gray500} />
            </View>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.emerald600, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} color="#fff" /></View>
          </View>
        </View>
        </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'tile') {
    const r = item.rentDetails || {};
    const bhk = r.type || r.bhkType || item.bhkType || item.bhk || item.roomType || 'For Rent';
    const furnish = r.furnishing || item.furnishing;
    // Gradient-border card: violet -> indigo -> teal frame, photo on top, white info panel below.
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={handleView} style={[{ borderRadius: 18, shadowColor: '#7C3AED', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, style]}>
        <LinearGradient colors={['#C084FC', '#818CF8', '#5EEAD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 1.5 }}>
          <View style={{ borderRadius: 16.5, backgroundColor: '#fff', overflow: 'hidden' }}>
            <View style={{ aspectRatio: 1 / 0.82, backgroundColor: colors.gray100 }}>
              <CardImg uri={imageSrc} />
              <View style={{ position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {isPremium ? <Premium small /> : <View />}
                <SaveBtn saved={isSaved} onPress={handleToggleSave} bg="#fff" inactive={colors.gray700} box={30} size={15} />
              </View>
              <View style={{ position: 'absolute', bottom: 8, left: 8, maxWidth: '85%', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C3AED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                <BedDouble size={11} color="#fff" /><Text numberOfLines={1} style={{ flexShrink: 1, color: '#fff', fontSize: 10, fontWeight: '800' }}>{bhk}</Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
              {displayPrice ? <Price price={displayPrice} formatted={formattedPrice} suffix="/mo" size={15} color={colors.gray900} suffixColor={colors.gray500} /> : <Text style={{ color: colors.gray900, fontSize: 13, fontWeight: '800' }}>Price on request</Text>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.gray900, fontSize: 13, fontWeight: '800' }}>{displayName}</Text>
                {item.hasVerifiedTag && <Verified size={13} />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                <MapPin size={10} color={colors.gray400} /><Text numberOfLines={1} style={{ flex: 1, fontSize: 10.5, color: colors.gray500 }}>{locationText}</Text>
              </View>
              {codeLine(colors.gray400)}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                {displayRating ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Star size={11} color={colors.amber400} fill={colors.amber400} /><Text style={{ fontSize: 11, fontWeight: '800', color: colors.gray900 }}>{displayRating}</Text></View> : <View />}
                {furnish ? <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '700', color: '#7C3AED' }}>{furnish}</Text> : null}
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'sale') {
    const b = item.buyDetails || {};
    const area = b.area?.superBuiltUp || b.area?.carpet;
    const specs = [b.type, area && `${Number(area).toLocaleString('en-IN')} ${b.area?.unit || 'sqft'}`, b.facing && `${b.facing} facing`].filter(Boolean);
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={handleView} style={[{ aspectRatio: 4 / 5, borderRadius: 24, backgroundColor: colors.gray200, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 }, style]}>
        <CardImg uri={imageSrc} /><Fade colorsArr={['rgba(0,0,0,0.25)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.3 }} />
        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.blue600, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>For Sale</Text></View>
            {isPremium ? <Premium small /> : null}
          </View>
          <SaveBtn saved={isSaved} onPress={handleToggleSave} bg="rgba(255,255,255,0.25)" inactive="#fff" box={32} size={16} />
        </View>
        <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {displayPrice ? <View style={{ flexDirection: 'row', alignItems: 'center' }}><IndianRupee size={14} color="#fff" strokeWidth={2.5} /><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{formatCompactPrice(displayPrice)}</Text></View> : <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Price on request</Text>}
            {displayRating && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Star size={11} color={colors.amber400} fill={colors.amber400} /><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{displayRating}</Text></View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, color: '#fff', fontSize: 13, fontWeight: '700' }}>{displayName}</Text>
            {item.hasVerifiedTag && <Verified size={13} />}
          </View>
          {codeLine('rgba(255,255,255,0.7)')}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><MapPin size={9} color="rgba(255,255,255,0.8)" /><Text numberOfLines={1} style={{ flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{locationText}</Text></View>
          {specs.length > 0 ? <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '500', marginTop: 4 }}>{specs.join('  ·  ')}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'plot') {
    const p = item.plotDetails || {};
    const areaText = p.plotArea ? `${Number(p.plotArea).toLocaleString('en-IN')} ${p.unit || 'sqyrd'}` : '—';
    const tag = p.landType || (p.facing && `${p.facing} facing`);
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={handleView} style={[{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#b45309', shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, style]}>
        <View style={{ aspectRatio: 4 / 3, backgroundColor: colors.gray100 }}>
          <CardImg uri={imageSrc} />
          {isPremium ? <View style={{ position: 'absolute', top: 8, left: 8 }}><Premium small /></View> : null}
          <View style={{ position: 'absolute', top: 8, right: 8 }}><SaveBtn saved={isSaved} onPress={handleToggleSave} /></View>
          {tag ? <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: colors.amber500, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{tag}</Text></View> : null}
          {displayRating && (
          <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Star size={9} color={colors.amber400} fill={colors.amber400} /><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{displayRating}</Text>
          </View>
          )}
        </View>
        <View style={{ padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.gray900 }}>{displayName}</Text>
            {item.hasVerifiedTag && <Verified size={13} />}
          </View>
          {codeLine(colors.gray400)}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <MapPin size={9} color={colors.gray400} /><Text numberOfLines={1} style={{ flex: 1, fontSize: 10, color: colors.gray500 }}>{locationText}</Text>
          </View>
          {/* Web: grid-cols-2 divide-x divide-amber-200 rounded-xl bg-amber-50; labels uppercase tracking-wider amber-700/70 */}
          <View style={{ marginTop: 8, flexDirection: 'row', backgroundColor: colors.amber50, borderRadius: 12, paddingVertical: 6 }}>
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}><Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(180,83,9,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Area</Text><Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: colors.gray900 }}>{areaText}</Text></View>
            <View style={{ width: 1, backgroundColor: '#FDE68A' }} />
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}><Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(180,83,9,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Price</Text><Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: colors.gray900 }}>{displayPrice ? `₹${formatCompactPrice(displayPrice)}` : 'On request'}</Text></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // default boxed card (search, saved, listing pages)
  const bhkLabel = item.rentDetails?.type || item.rentDetails?.bhkType || item.bhkType || item.bhk || item.roomType;
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={handleView} style={[{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }, style]}>
      <View style={{ width: '100%', height: compact ? 120 : 176, backgroundColor: colors.gray100 }}>
        <CardImg uri={imageSrc} /><Fade colorsArr={['transparent', 'rgba(0,0,0,0.35)']} start={{ x: 0, y: 0.5 }} />
        <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {typeLabel ? <View style={{ backgroundColor: TYPE_COLORS[badgeTypeKey] || colors.emerald600, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{typeLabel}</Text></View> : null}
          {item.hasVerifiedTag ? <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', padding: 2, borderRadius: 999 }}><BadgeCheck size={14} color={colors.blue600} /></View> : null}
        </View>
        <View style={{ position: 'absolute', top: 8, right: 8, alignItems: 'flex-end', gap: 8 }}>
          <TouchableOpacity onPress={handleToggleSave} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999 }}>
            <Heart size={14} color={isSaved ? colors.red500 : colors.gray500} fill={isSaved ? colors.red500 : 'transparent'} />
          </TouchableOpacity>
          {displayRating && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ color: colors.green600, fontSize: 10, fontWeight: '800' }}>{displayRating}</Text><Star size={9} color={colors.green600} fill={colors.green600} />
          </View>
          )}
        </View>
      </View>
      <View style={{ padding: compact ? 8 : 10, gap: 4 }}>
        {codeLine(colors.gray400)}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: compact ? 13 : 15, fontWeight: '700', color: colors.gray900 }}>{displayName}</Text>
          {(badgeTypeKey === 'PG' || badgeTypeKey === 'Hostel') && (item.pgDetails?.gender || item.pgType) ? (
            <View style={{ backgroundColor: colors.red50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.red100 }}><Text style={{ color: colors.red700, fontSize: 9, fontWeight: '700' }}>{item.pgDetails?.gender || item.pgType}</Text></View>) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MapPin size={9} color={colors.gray400} /><Text numberOfLines={1} style={{ flex: 1, fontSize: 10, color: colors.gray500 }}>{locationText}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {bhkLabel ? <View style={{ backgroundColor: colors.emerald50, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.emerald100 }}><Text style={{ color: colors.emerald700, fontSize: 9, fontWeight: '700' }}>{bhkLabel}</Text></View>
            : badgeTypeKey === 'Rent' ? <View style={{ backgroundColor: colors.emerald50, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.emerald100 }}><Text style={{ color: colors.emerald700, fontSize: 9, fontWeight: '700' }}>RENT PROPERTY</Text></View> : null}
          {badgeTypeKey === 'Buy' && (item.buyDetails?.type || item.buyDetails?.area?.superBuiltUp) ? (
            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#DBEAFE' }}><Text style={{ color: colors.blue700, fontSize: 9, fontWeight: '700' }}>{item.buyDetails?.type || `${item.buyDetails?.area?.superBuiltUp} ${item.buyDetails?.area?.unit || 'sqft'}`}</Text></View>) : null}
          {isPremium ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Star size={10} color="#000" fill="#000" /><Text style={{ fontSize: 8, fontWeight: '900', color: '#000' }}>PREMIUM Listing</Text></View> : null}
          {(item.rentDetails?.furnishing || item.furnishing) ? <Text style={{ fontSize: 9, color: colors.gray500, fontWeight: '500' }}>• {item.rentDetails?.furnishing || item.furnishing}</Text> : null}
        </View>
        <View style={{ marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.gray50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Price price={displayPrice} formatted={formattedPrice} suffix={priceSuffix} size={compact ? 13 : 15} color={colors.gray900} suffixColor={colors.gray500} />
            {['PG', 'Hostel', 'Rent'].includes(badgeTypeKey) && displayPrice ? <Text style={{ fontSize: 8, color: colors.emerald600, fontWeight: '700' }}>Monthly Rent</Text> : null}
            {badgeTypeKey === 'Buy' && displayPrice ? <Text style={{ fontSize: 8, color: colors.blue600, fontWeight: '700' }}>Total Price</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.emerald600, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>View</Text><ChevronRight size={12} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(PropertyCard);
