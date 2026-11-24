import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, Share, Linking, useWindowDimensions, StyleSheet, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MapPin, Star, Share2, Heart, ArrowLeft, Users, X, Gift, CheckCircle, Shield, Info, Clock, Wifi, Car, Phone, Wind, Droplets, Zap,
  Thermometer, Shirt, Sparkles, Camera, Dumbbell, Box, Flame, ArrowUpCircle, Tv, Utensils, User, Tag, ChevronLeft, ChevronRight,
} from 'lucide-react-native';
import { Text, Input } from '../../../src/components/ui';
import DatePickerField, { toYMD } from '../../../src/components/DatePickerField';
import { propertyService, legalService, reviewService, offerService, availabilityService, userService, bookingService } from '../../../src/services/apiService';
import { storage } from '../../../src/lib/storage';
import toast from '../../../src/store/toastStore';
import { colors } from '../../../src/theme';
import { errMsg, roomSharingLabel } from '../../../src/utils/format';
import { setCheckoutState } from '../../../src/lib/checkoutState';
import { useKeyboardOpen } from '../../../src/hooks/useKeyboardOpen';
import { CENTER, CONTENT_MAX, TABLET_MIN } from '../../../src/lib/responsive';

const DEFAULT_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
];
const AMENITY_ICONS = { 'wi-fi': Wifi, wifi: Wifi, ac: Wind, 'air conditioning': Wind, 'ro water': Droplets, water: Droplets, 'power backup': Zap, backup: Zap, geyser: Thermometer, laundry: Shirt, 'washing machine': Shirt, housekeeping: Sparkles, cleaning: Sparkles, cctv: Camera, security: Shield, parking: Car, gym: Dumbbell, fridge: Box, refrigerator: Box, kitchen: Flame, induction: Flame, lift: ArrowUpCircle, tv: Tv, television: Tv, food: Utensils, meal: Utensils, 'single occupancy': User, 'double occupancy': Users, 'triple occupancy': Users };

const Section = ({ title, children, style }) => (
  <View style={[{ marginBottom: 20 }, style]}>
    {title ? <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 10 }}>{title}</Text> : null}
    {children}
  </View>
);
const Kv = ({ k, v }) => (v === undefined || v === null || v === '' ? null : (
  <View style={{ width: '50%', paddingVertical: 6, paddingRight: 8 }}>
    <Text style={{ fontSize: 11, color: colors.gray500 }}>{k}</Text>
    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray900 }}>{String(v)}</Text>
  </View>
));
const Pill = ({ text, bg, fg, border }) => (
  <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: border ? 1 : 0, borderColor: border }}><Text style={{ fontSize: 10, fontWeight: '700', color: fg }}>{text}</Text></View>
);
const Box2 = ({ title, tone = 'yellow', children }) => {
  const t = { yellow: ['#FEFCE8', '#FEF08A', '#713F12'], blue: ['#EFF6FF', '#BFDBFE', '#1E3A8A'], green: ['#f0f7fd', '#c0dff4', '#00264b'], gray: ['#fff', '#F3F4F6', '#111827'], amber: ['#FFFBEB', '#FDE68A', '#78350F'], purple: ['#FAF5FF', '#E9D5FF', '#581C87'], orange: ['#FFF7ED', '#FED7AA', '#7C2D12'], indigo: ['#EEF2FF', '#C7D2FE', '#312E81'] }[tone];
  return (
    <View style={{ backgroundColor: t[0], borderColor: t[1], borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <Text style={{ fontWeight: '700', color: t[2], marginBottom: 10, fontSize: 15 }}>{title}</Text>
      {children}
    </View>
  );
};

export default function PropertyDetails() {
  const { id, from } = useLocalSearchParams();
  // Where the user opened this property from; sent with every lead action
  const leadScreen = (Array.isArray(from) ? from[0] : from) || 'Direct link / other';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Tablet: taller gallery, content in a centered column, bottom bar aligned with it
  const galleryH = width >= TABLET_MIN ? Math.round(Math.min(width * 0.56, 560)) : 280;
  const sidePad = Math.max(16, (width - CONTENT_MAX) / 2 + 16);
  const keyboardOpen = useKeyboardOpen();
  const scrollRef = useRef(null);
  const roomsY = useRef(0);

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0 });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [defaultTaxRate, setTaxRate] = useState(0);
  const [categoryTaxRates, setCategoryTaxRates] = useState({});
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [revealedNumber, setRevealedNumber] = useState(null);
  // Owner viewing their own listing (backend isOwner): no Enquire / Contact, so no self leads
  const [isOwner, setIsOwner] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [offers, setOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [error, setError] = useState(false);

  const taxRate = categoryTaxRates[property?.propertyType?.toLowerCase()] ?? defaultTaxRate;

  const loadDetails = useCallback(async () => {
    try {
      setError(false);
      const response = await propertyService.getDetails(id);
      if (response && response.property) {
        const p = response.property; const rts = response.roomTypes || [];
        setIsOwner(!!response.isOwner);
        setProperty({
          ...p, _id: p._id, name: p.propertyName, description: p.description, address: p.address, avgRating: p.totalReviews > 0 ? (p.avgRating || 0) : 0, // schema default is 3: no reviews => "New"
          images: { cover: p.coverImage, gallery: p.propertyImages || [] },
          propertyType: p.propertyType ? p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1) : '',
          amenities: p.amenities || [],
          inventory: rts.map((rt) => ({
            _id: rt._id, type: rt.name, price: rt.pricePerNight, pricing: rt.pricing, description: rt.description || '', amenities: rt.amenities || [],
            maxAdults: rt.maxAdults, maxChildren: rt.maxChildren, images: rt.images || [],
            inventoryType: rt.inventoryType || (['Hostel', 'PG'].includes(p.propertyType) ? 'bed' : 'room'), roomCategory: rt.roomCategory, bathroomType: rt.bathroomType,
          })),
          policies: { checkInTime: p.checkInTime, checkOutTime: p.checkOutTime, cancellationPolicy: p.cancellationPolicy, houseRules: p.houseRules, petsAllowed: p.petsAllowed, coupleFriendly: p.coupleFriendly },
          config: { pgType: p.pgType, resortType: p.resortType, foodType: p.foodType, hotelCategory: p.hotelCategory, starRating: p.starRating },
        });
      } else setProperty(response);
    } catch { setError(true); } finally { setLoading(false); }
  }, [id]);

  const fetchReviews = useCallback(async () => { try { setReviews(await reviewService.getPropertyReviews(id)); } catch {} }, [id]);

  useEffect(() => {
    legalService.getFinancialSettings().then((res) => { if (res.success) { setTaxRate(res.taxRate ?? 0); setCategoryTaxRates(res.categoryTaxRates || {}); } }).catch(() => {});
  }, []);
  useEffect(() => {
    loadDetails();
    if (id) { propertyService.recordViewLead(id, { sourceScreen: leadScreen }).catch(() => {}); fetchReviews(); offerService.getActive().then((d) => setOffers(d || [])).catch(() => {}); }
  }, [id]);
  useEffect(() => {
    if (storage.getItem('token')) {
      userService.getSavedHotels().then((res) => {
        const list = res.data || res.savedHotels || [];
        if (Array.isArray(list)) setIsSaved(list.some((h) => (typeof h === 'object' ? h._id : h) === id));
      }).catch(() => {});
    }
  }, [id]);

  const displayType = property?.propertyType;
  const BOOKABLE = ['villa', 'resort', 'hotel', 'hostel', 'pg', 'homestay', 'tent', 'rent', 'buy', 'plot'];
  const isDynamicListing = !!property && !!displayType && !BOOKABLE.includes(displayType.toLowerCase()) && !(property.inventory?.length > 0);
  const propertyType = isDynamicListing ? (/sale|buy/i.test(property.transactionType || '') ? 'Buy' : 'Rent') : displayType;
  const pType = propertyType?.toLowerCase();
  const isBedBased = ['hostel', 'pg'].includes(pType);
  const isPgOrHostel = isBedBased;
  const isLeadType = ['buy', 'plot', 'rent', 'pg', 'hostel'].includes(pType);

  useEffect(() => { if (isBedBased) setGuests((p) => ({ ...p, adults: p.rooms, children: 0 })); }, [guests.rooms, isBedBased]);
  useEffect(() => { setImgIdx(0); }, [selectedRoom]);

  const getDefaultPgDates = () => ({ checkIn: toYMD(new Date()), checkOut: toYMD(new Date(Date.now() + 2592000000)) });

  const checkAvailability = async (direct = false) => {
    if (!selectedRoom || (!isPgOrHostel && (!dates.checkIn || !dates.checkOut))) {
      if (direct) toast.error(selectedRoom ? 'Please select dates first' : 'Please select a room/unit first');
      setAvailability(null); return null;
    }
    const pg = getDefaultPgDates();
    const checkIn = isPgOrHostel && !dates.checkIn ? pg.checkIn : dates.checkIn;
    const checkOut = isPgOrHostel && !dates.checkOut ? pg.checkOut : dates.checkOut;
    setChecking(true);
    try {
      const response = await availabilityService.check({ propertyId: id, roomTypeId: selectedRoom._id, checkIn, checkOut, rooms: guests.rooms });
      let result;
      if (Array.isArray(response)) {
        const ra = response.find((r) => String(r.roomTypeId) === String(selectedRoom._id));
        if (ra) {
          const need = guests.rooms || 1;
          result = ra.availableUnits >= need ? { available: true, unitsLeft: ra.availableUnits } : { available: false, message: `Only ${ra.availableUnits} units available`, unitsLeft: ra.availableUnits };
        } else result = { available: false, message: 'Sold Out for these dates', unitsLeft: 0 };
      } else result = response;
      setAvailability(result); return result;
    } catch (e) {
      const r = { available: false, message: errMsg(e, 'Unable to verify availability') };
      setAvailability(r); return r;
    } finally { setChecking(false); }
  };

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator size="large" color={colors.surface} /></View>;
  if (error || !property) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16, color: colors.gray700 }}>{error ? 'Could not load this property' : 'Property not found'}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); loadDetails(); }} style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/search'))}><Text style={{ color: colors.gray500 }}>Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { name, address, images, description, avgRating: rating, inventory, amenities, policies, config, pgDetails, rentDetails, buyDetails, plotDetails, nearbyPlaces, videoUrl, virtualTourLink, isVerified, isFeatured, isUrgent, isNegotiable } = property;
  const hasInventory = inventory && inventory.length > 0;
  const isWholeUnit = propertyType === 'Villa' || (['Homestay', 'Apartment'].includes(propertyType) && !hasInventory);

  const getRoomPrice = (room) => {
    if (!room) return null;
    if (room.pricing) { if (typeof room.pricing.basePrice === 'number') return room.pricing.basePrice; if (typeof room.pricing.weekendPrice === 'number') return room.pricing.weekendPrice; }
    return room.price || null;
  };
  const getNightBreakup = (room) => {
    if (!room) return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: 0 };
    const pricing = room.pricing || {}; const { basePrice, weekendPrice } = pricing; const fallback = getRoomPrice(room);
    const base = typeof basePrice === 'number' ? basePrice : (typeof weekendPrice === 'number' ? weekendPrice : fallback);
    if (!dates.checkIn || !dates.checkOut) return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: base };
    const start = new Date(dates.checkIn); const end = new Date(dates.checkOut);
    if (isNaN(start) || isNaN(end) || end <= start) return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: base };
    let cur = new Date(start); let nights = 0, wd = 0, we = 0, total = 0;
    while (cur < end) {
      const day = cur.getDay(); const isWe = day === 5 || day === 6;
      total += isWe && typeof weekendPrice === 'number' ? weekendPrice : (typeof basePrice === 'number' ? basePrice : fallback) || 0;
      nights += 1; if (isWe) we += 1; else wd += 1; cur.setDate(cur.getDate() + 1);
    }
    return { nights, weekdayNights: wd, weekendNights: we, perNight: nights > 0 ? Math.round(total / nights) : fallback };
  };
  const extraLabels = (room) => {
    if (!room || !room.pricing) return [];
    const isMonth = ['pg', 'hostel', 'rent'].includes(pType); const isSale = ['buy', 'plot'].includes(pType);
    const suffix = isMonth ? 'month' : isSale ? '' : 'night'; const out = [];
    if (typeof room.pricing.extraAdultPrice === 'number') out.push(`Extra adult: ₹${room.pricing.extraAdultPrice}${suffix ? ` / ${suffix}` : ''}`);
    if (typeof room.pricing.extraChildPrice === 'number') out.push(`Extra child: ₹${room.pricing.extraChildPrice}${suffix ? ` / ${suffix}` : ''}`);
    return out;
  };
  const getMaxAdults = () => {
    if (selectedRoom) return (selectedRoom.maxAdults || 12) * (isWholeUnit ? 1 : guests.rooms);
    if (isWholeUnit) return property.structure?.maxGuests || property.maxGuests || 12;
    if (isBedBased) return guests.rooms;
    if (propertyType === 'Resort') return guests.rooms * 4;
    return guests.rooms * 3;
  };
  const getMaxChildren = () => {
    if (selectedRoom && selectedRoom.maxChildren !== undefined) return selectedRoom.maxChildren * (isWholeUnit ? 1 : guests.rooms);
    if (isBedBased) return 0; if (isWholeUnit) return 6; return guests.rooms * 2;
  };
  const unitLabel = propertyType === 'Tent' ? 'Tents' : (propertyType === 'Homestay' || propertyType === 'Villa') ? 'Units' : isBedBased ? 'Beds' : 'Rooms';

  const galleryImages = (() => {
    let list = [];
    if (selectedRoom?.images?.length) list = selectedRoom.images.map((i) => (typeof i === 'string' ? i : i.url)).filter(Boolean);
    if (list.length === 0) { if (images?.cover) list.push(images.cover); if (Array.isArray(images?.gallery)) list.push(...images.gallery); }
    return list.length > 0 ? list : DEFAULT_FALLBACK_IMAGES;
  })();
  const activeRoom = selectedRoom || (hasInventory ? inventory[0] : null);
  const stayPricing = getNightBreakup(activeRoom);
  const bookingRoom = selectedRoom || activeRoom;
  const extraPricingLabels = extraLabels(bookingRoom);

  const getPriceBreakdown = () => {
    if (!selectedRoom || (!isPgOrHostel && (!dates.checkIn || !dates.checkOut))) return null;
    let { nights: stayNights, perNight } = stayPricing;
    const nights = isPgOrHostel ? 1 : stayNights;
    if (nights === 0 && !isPgOrHostel) return null;
    if (isPgOrHostel && !dates.checkIn) perNight = getRoomPrice(selectedRoom);
    const units = isWholeUnit ? 1 : guests.rooms;
    const baseAdultsPerUnit = selectedRoom.maxAdults || property.maxGuests || 2;
    const baseChildrenPerUnit = selectedRoom.maxChildren !== undefined ? selectedRoom.maxChildren : 0;
    const extraAdultsCount = Math.max(0, guests.adults - baseAdultsPerUnit * units);
    const extraChildrenCount = Math.max(0, guests.children - baseChildrenPerUnit * units);
    const pricePerNight = getRoomPrice(selectedRoom);
    const extraAdultPrice = selectedRoom.pricing?.extraAdultPrice || 0;
    const extraChildPrice = selectedRoom.pricing?.extraChildPrice || 0;
    const totalBasePrice = pricePerNight * nights * units;
    const totalExtraAdultCharge = extraAdultsCount * extraAdultPrice * nights;
    const totalExtraChildCharge = extraChildrenCount * extraChildPrice * nights;
    const grossAmount = totalBasePrice + totalExtraAdultCharge + totalExtraChildCharge;
    let discountAmount = 0;
    if (appliedOffer && grossAmount >= (appliedOffer.minBookingAmount || 0)) {
      if (appliedOffer.discountType === 'percentage') {
        discountAmount = (grossAmount * appliedOffer.discountValue) / 100;
        if (appliedOffer.maxDiscount) discountAmount = Math.min(discountAmount, appliedOffer.maxDiscount);
      } else discountAmount = appliedOffer.discountValue;
      discountAmount = Math.floor(discountAmount);
    }
    discountAmount = Math.min(discountAmount, grossAmount);
    const commissionableAmount = grossAmount;
    const taxableAmount = grossAmount - discountAmount;
    const taxAmount = Math.round((commissionableAmount * taxRate) / 100);
    const grandTotal = taxableAmount + taxAmount;
    return { nights, units, baseAdultsPerUnit, extraAdultsCount, extraChildrenCount, pricePerNight, extraAdultPrice, extraChildPrice, totalBasePrice, totalExtraAdultCharge, totalExtraChildCharge, grossAmount, discountAmount, couponCode: appliedOffer && discountAmount > 0 ? appliedOffer.code : null, commissionableAmount, taxableAmount, taxAmount, grandTotal };
  };

  let bookingBarPrice = stayPricing.nights > 0 ? stayPricing.perNight : getRoomPrice(bookingRoom) || property.minPrice;
  if (!bookingBarPrice) {
    const dyn = isDynamicListing ? Number(property.dynamicData?.expectedPrice) || undefined : undefined;
    if (dyn) bookingBarPrice = dyn;
    else if (pType === 'rent') bookingBarPrice = property.rentDetails?.monthlyRent;
    else if (pType === 'buy') bookingBarPrice = property.buyDetails?.expectedPrice;
    else if (pType === 'plot') bookingBarPrice = property.plotDetails?.expectedPrice;
    else if (pType === 'pg') bookingBarPrice = property.pgDetails?.monthlyRent || property.minPrice;
  }
  const priceLabel = isDynamicListing ? 'Expected Price' : ['rent', 'pg', 'hostel'].includes(pType) ? 'Monthly Rent' : ['buy', 'plot'].includes(pType) ? 'Asking Price' : 'Starting from';
  const priceBreakdown = getPriceBreakdown();

  const handleToggleSave = async () => {
    if (!storage.getItem('token')) { toast.error('Please login to save properties'); return; }
    const newState = !isSaved;
    try { setIsSaved(newState); await userService.toggleSavedHotel(id); toast.success(newState ? 'Added to wishlist' : 'Removed from wishlist'); }
    catch (err) { setIsSaved(!newState); toast.error(errMsg(err, 'Failed to update wishlist')); }
  };
  const handleShare = () => Share.share({ message: `Check out ${name || 'this amazing place'} on HoomZo!` }).catch(() => {});
  const handleReviewSubmit = async () => {
    if (!storage.getItem('token')) { toast.error('Please login to submit a review'); return; }
    setReviewLoading(true);
    try {
      await reviewService.createReview({ propertyId: id, ...reviewData });
      toast.success('Review submitted!'); setReviewData({ rating: 5, comment: '' }); setShowReviewForm(false); fetchReviews(); loadDetails();
    } catch (e) { toast.error(errMsg(e, 'Failed to submit review')); } finally { setReviewLoading(false); }
  };

  const sharingLabel = (room) => {
    if (room?.roomCategory) return { triple: 'Triple Sharing', double: 'Double Sharing', private: 'Private Room', shared: 'Shared Dorm' }[room.roomCategory.toLowerCase()] || room.roomCategory;
    if (!room && !inventory?.length && pgDetails?.occupancy && pgDetails.occupancy !== 'Other') return `${pgDetails.occupancy} Sharing`;
    return undefined;
  };

  const handleInquiry = async () => {
    if (!storage.getItem('token')) { toast.error('Please login to send inquiry'); router.push('/login'); return; }
    // PG/Hostel with several sharing options: the owner needs to know which one the user wants
    let room = selectedRoom;
    if (!room && isPgOrHostel && hasInventory) {
      if (inventory.length === 1) room = inventory[0];
      else { toast.error('Please choose a room / sharing type first'); scrollToRooms(); return; }
    }
    setBookingLoading(true);
    try {
      const roomPrice = room ? getRoomPrice(room) : null;
      const leadBudget = roomPrice || property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice || property.rentDetails?.monthlyRent || property.pgDetails?.monthlyRent || property.minPrice || property.startingPrice || Number(property.dynamicData?.expectedPrice) || 0;
      const sharingType = sharingLabel(room);
      const message = `I am interested in this ${propertyType}${sharingType ? ` (${sharingType})` : room?.type ? ` (${room.type})` : ''}. Please contact me.`;
      const response = await bookingService.create({
        propertyId: id, message, budget: leadBudget, propertyType: pType, roomTypeId: room?._id || null, checkInDate: dates.checkIn || new Date(),
        sourceScreen: leadScreen, platform: 'app', sharingType, roomName: room?.type, roomPrice: roomPrice || undefined, beds: isPgOrHostel ? guests.rooms : undefined,
      });
      if (response.success) toast.success('Inquiry sent successfully! The partner will contact you soon.');
    } catch (e) { toast.error(errMsg(e, 'Failed to send inquiry')); } finally { setBookingLoading(false); }
  };

  const scrollToRooms = () => scrollRef.current?.scrollTo({ y: roomsY.current, animated: true });

  const handleBook = async () => {
    if (isLeadType) { handleInquiry(); return; }
    if (!isPgOrHostel && (!dates.checkIn || !dates.checkOut)) { toast.error('Please select check-in and check-out dates'); return; }
    if (!selectedRoom && !['Rent', 'Buy', 'Plot'].includes(propertyType)) {
      if (property?.inventory?.length === 1) { setSelectedRoom(property.inventory[0]); toast.success('Room selected automatically. Please click Book again to proceed.'); scrollToRooms(); return; }
      toast.error('Please select a room/unit'); scrollToRooms(); return;
    }
    let cur = availability;
    if (!cur || checking) cur = await checkAvailability();
    if (!cur || cur.available !== true) { toast.error(cur?.message || (isPgOrHostel ? 'Selected room/bed is not available' : 'Selected room is not available for these dates')); return; }
    if (!storage.getItem('token')) { toast.error('Please login to book'); router.push('/login'); return; }
    if (!priceBreakdown) { toast.error('Unable to calculate price. Please check dates.'); return; }
    // Hand the checkout state to /checkout through the in-memory draft (web used router state)
    setCheckoutState({ property, selectedRoom, dates: isPgOrHostel ? getDefaultPgDates() : dates, guests: { ...guests, rooms: guests.rooms }, priceBreakdown, taxRate, couponCode: priceBreakdown.couponCode });
    router.push('/checkout');
  };

  const handleApplyOffer = (offer) => {
    const gross = priceBreakdown ? priceBreakdown.grossAmount : bookingBarPrice || 0;
    if (offer.minBookingAmount && gross < offer.minBookingAmount) { toast.error(`Min booking amount of ₹${offer.minBookingAmount} required`); return; }
    setAppliedOffer(offer); setShowOffers(false); toast.success(`'${offer.code}' applied!`);
  };
  const handleReveal = async () => {
    if (revealLoading) return;
    setRevealLoading(true);
    try {
      const res = await propertyService.revealContact(id, { sourceScreen: leadScreen, sharingType: sharingLabel(selectedRoom) });
      if (res.success) { setRevealedNumber(res.contactNumber); toast.success('Contact number revealed! Partner notified.'); } else toast.error(res.message || 'Failed to reveal contact');
    } catch (e) { toast.error(e?.response?.data?.message || errMsg(e, 'Failed to reveal contact')); } finally { setRevealLoading(false); }
  };
  const call = () => { propertyService.recordViewLead(id, { action: 'call_click', sourceScreen: leadScreen, sharingType: sharingLabel(selectedRoom) }).catch(() => {}); Linking.openURL(`tel:${revealedNumber}`).catch(() => {}); };

  const roomAmenities = selectedRoom?.amenities?.length > 0;
  const displayAmenities = (roomAmenities ? selectedRoom.amenities : amenities)?.filter((i) => i && typeof i === 'string' && i.trim()) || [];
  const timeStr = (t) => (t ? (t.toString().includes(':') ? t : `${t}:00 AM`) : 'Flexible');

  const policyBadges = [
    { label: 'Pets Allowed', value: policies.petsAllowed || policies.petFriendly },
    { label: 'Smoking Allowed', value: policies.smokingAllowed || policies.smokingAlcohol },
    { label: 'Alcohol Allowed', value: policies.alcoholAllowed },
    { label: 'Couple Friendly', value: policies.coupleFriendly },
  ].filter((b) => b.value !== undefined && b.value !== null);

  const numInput = (key, min, disabled) => (
    <TextInput
      value={String(guests[key] ?? '')} editable={!disabled} keyboardType="number-pad"
      onChangeText={(v) => setGuests({ ...guests, [key]: v === '' ? '' : parseInt(v.replace(/\D/g, '')) || 0 })}
      onBlur={() => setGuests((p) => ({ ...p, [key]: Math.max(min, Number(p[key]) || min) }))}
      style={{ backgroundColor: disabled ? colors.gray100 : '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, padding: 8, fontSize: 14, color: colors.gray800 }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Gallery */}
        <View style={{ height: galleryH, backgroundColor: colors.gray900 }}>
          <FlatList
            data={galleryImages} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(u, i) => u + i}
            onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => { setImgIdx(index); setShowImages(true); }} style={{ width, height: galleryH }}>
                <Image source={{ uri: item }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Pressable>
            )}
          />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/search'))} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={18} color={colors.gray700} /></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={handleShare} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}><Share2 size={16} color={colors.gray700} /></TouchableOpacity>
              <TouchableOpacity onPress={handleToggleSave} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}><Heart size={16} color={isSaved ? colors.red500 : colors.gray600} fill={isSaved ? colors.red500 : 'transparent'} /></TouchableOpacity>
            </View>
          </View>
          {galleryImages.length > 1 ? <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{imgIdx + 1}/{galleryImages.length}</Text></View> : null}
        </View>

        <View style={CENTER}>
        <View style={{ backgroundColor: '#fff', padding: 20 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <Pill text={displayType} bg="rgba(0,92,168,0.1)" fg={colors.surface} />
            {isVerified ? <Pill text="Verified" bg="#EFF6FF" fg={colors.blue600} border="#DBEAFE" /> : null}
            {isFeatured ? <Pill text="Featured" bg={colors.amber50} fg={colors.amber600} border={colors.amber100} /> : null}
            {isUrgent ? <Pill text="Urgent" bg={colors.red50} fg={colors.red600} border={colors.red100} /> : null}
            {isNegotiable ? <Pill text="Negotiable" bg={colors.green50} fg={colors.green600} border={colors.green100} /> : null}
            {rating !== undefined && rating !== null ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}><Star size={10} color={colors.honey} fill={colors.honey} /><Text style={{ fontSize: 10, fontWeight: '700', color: colors.amber700 }}>{Number(rating) > 0 ? Number(rating).toFixed(1) : 'New'}</Text></View> : null}
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textDark, marginBottom: 4 }}>{name}</Text>
          {property.propertyCode ? <Text style={{ fontSize: 11, fontWeight: '600', color: colors.gray400, letterSpacing: 0.5, marginBottom: 4 }}>Property ID: {property.propertyCode}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <MapPin size={14} color={colors.gray500} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.gray500 }}>{address?.fullAddress}{address?.city ? `, ${address.city}` : ''}{address?.state ? `, ${address.state}` : ''}{address?.pincode ? ` - ${address.pincode}` : ''}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.gray100, marginVertical: 20 }} />

          <Section title="About this place">
            {property.shortDescription ? <Text style={{ color: colors.gray500, fontWeight: '700', fontSize: 14, marginBottom: 8 }}>{property.shortDescription}</Text> : null}
            <Text style={{ color: colors.gray600, fontSize: 14, lineHeight: 22 }}>{description || 'No description available.'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {videoUrl ? <TouchableOpacity onPress={() => Linking.openURL(videoUrl)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.red50, borderRadius: 8 }}><Text style={{ color: colors.red600, fontWeight: '700', fontSize: 14 }}>▶ Watch Video</Text></TouchableOpacity> : null}
              {virtualTourLink ? <TouchableOpacity onPress={() => Linking.openURL(virtualTourLink)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EEF2FF', borderRadius: 8 }}><Users size={18} color={colors.indigo600} /><Text style={{ color: colors.indigo600, fontWeight: '700', fontSize: 14 }}>360° Virtual Tour</Text></TouchableOpacity> : null}
            </View>
          </Section>

          {displayAmenities.length > 0 ? (
            <Section title={roomAmenities ? 'Room Amenities' : 'Amenities'}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {displayAmenities.map((item, i) => {
                  const Icon = AMENITY_ICONS[item.toLowerCase().trim()] || CheckCircle;
                  return (
                    <View key={i} style={{ width: '50%', paddingRight: 8, marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: colors.blue50, borderWidth: 1, borderColor: colors.partnerBorder, borderRadius: 12 }}>
                        <View style={{ padding: 7, backgroundColor: '#fff', borderRadius: 8 }}><Icon size={16} color={colors.surface} /></View>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.gray700 }}>{item}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {(pgDetails && (propertyType === 'PG' || propertyType === 'Hostel')) || config?.pgType ? (
            <Box2 title="PG / Co-Living Details" tone="yellow">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Kv k="Sharing" v={roomSharingLabel(inventory, pgDetails?.occupancy)} /><Kv k="Gender" v={pgDetails?.gender || config?.pgType} /><Kv k="Min Stay" v={pgDetails?.minStay} />
                <Kv k="Notice Period" v={pgDetails?.noticePeriod || config?.noticePeriod} /><Kv k="Security Deposit" v={pgDetails?.securityDeposit ? `₹${pgDetails.securityDeposit}` : null} />
                <Kv k="Available From" v={pgDetails?.availableFrom ? new Date(pgDetails.availableFrom).toLocaleDateString() : null} />
                {pgDetails?.foodIncluded ? <Kv k="Food Included" v={[pgDetails.foodIncluded.breakfast && 'Breakfast', pgDetails.foodIncluded.lunch && 'Lunch', pgDetails.foodIncluded.dinner && 'Dinner'].filter(Boolean).join(', ') || 'None'} /> : null}
              </View>
              {pgDetails?.rules ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {[['smoking', 'Smoking'], ['drinking', 'Drinking'], ['visitors', 'Visitors']].map(([k, l]) => pgDetails.rules[k] !== undefined ? <Pill key={k} text={`${l}: ${pgDetails.rules[k] ? 'Allowed' : 'Not allowed'}`} bg={pgDetails.rules[k] ? colors.green50 : colors.red50} fg={pgDetails.rules[k] ? colors.green700 : colors.red700} border={pgDetails.rules[k] ? colors.green100 : colors.red100} /> : null)}
                  {pgDetails.rules.curfew ? <Pill text={`Curfew: ${pgDetails.rules.curfew}`} bg="#FEF9C3" fg="#854D0E" border="#FEF08A" /> : null}
                </View>) : null}
            </Box2>
          ) : null}

          {rentDetails && pType === 'rent' ? (
            <Box2 title="Rental Details" tone="blue">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Kv k="Type" v={rentDetails.type || 'Not specified'} /><Kv k="Furnishing" v={rentDetails.furnishing || 'Not specified'} />
                <Kv k="Monthly Rent" v={`₹${rentDetails.monthlyRent?.toLocaleString() || 'Not set'}`} />
                <Kv k="Security" v={`₹${(rentDetails.securityDeposit !== undefined ? rentDetails.securityDeposit : rentDetails.maintenance) ?? 0}`} />
                <Kv k="Tenant Preference" v={rentDetails.tenantPreference || 'Any'} /><Kv k="Society" v={rentDetails.societyName} /><Kv k="Water Supply" v={rentDetails.waterSupply || 'Not specified'} />
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {rentDetails.electricityIncluded ? <Pill text="Electricity Incl." bg="#DBEAFE" fg={colors.blue700} /> : null}{rentDetails.lift ? <Pill text="Lift Available" bg="#DBEAFE" fg={colors.blue700} /> : null}
              </View>
            </Box2>
          ) : null}

          {buyDetails && pType === 'buy' ? (
            <Box2 title="Property Details" tone="green">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Kv k="Type" v={buyDetails.type} /><Kv k="Super Built-up Area" v={buyDetails.area?.superBuiltUp ? `${buyDetails.area.superBuiltUp} ${buyDetails.area?.unit || 'sqft'}` : null} />
                <Kv k="Carpet Area" v={buyDetails.area?.carpet ? `${buyDetails.area.carpet} ${buyDetails.area?.unit || 'sqft'}` : null} /><Kv k="Ownership" v={buyDetails.ownership} />
                <Kv k="Floor" v={buyDetails.floor?.current !== undefined ? `${buyDetails.floor.current} / ${buyDetails.floor.total}` : null} /><Kv k="Facing" v={buyDetails.facing} /><Kv k="Age" v={buyDetails.propertyAge} />
                <Kv k="Builder" v={buyDetails.builderName} /><Kv k="Property Tax" v={buyDetails.propertyTax ? `₹${buyDetails.propertyTax.toLocaleString()}` : null} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {buyDetails.loanEligible ? <Pill text="Loan Eligible" bg="#dceef9" fg={colors.emerald700} /> : null}{buyDetails.legalVerified ? <Pill text="Legal Verified" bg="#dceef9" fg={colors.emerald700} /> : null}
                {buyDetails.registrationIncluded ? <Pill text="Registration Incl." bg="#dceef9" fg={colors.emerald700} /> : null}{buyDetails.stampDutyIncluded ? <Pill text="Stamp Duty Incl." bg="#dceef9" fg={colors.emerald700} /> : null}
              </View>
            </Box2>
          ) : null}

          {plotDetails && pType === 'plot' ? (
            <Box2 title="Plot Details" tone="gray">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Kv k="Plot Area" v={plotDetails.plotArea ? `${plotDetails.plotArea} ${plotDetails.unit || ''}` : null} />
                <Kv k="Dimensions" v={plotDetails.dimensions?.length ? `${plotDetails.dimensions.length} x ${plotDetails.dimensions.breadth}` : null} />
                <Kv k="Facing" v={plotDetails.facing} /><Kv k="Road Width" v={plotDetails.roadWidth ? `${plotDetails.roadWidth} ft` : 'N/A'} /><Kv k="Land Type" v={plotDetails.landType} />
                <Kv k="Authority" v={plotDetails.approvalAuthority || 'N/A'} /><Kv k="Boundary Wall" v={plotDetails.boundaryMarked ? 'Yes' : 'No'} /><Kv k="Nearby Landmark" v={plotDetails.nearbyLandmark} />
              </View>
            </Box2>
          ) : null}

          {propertyType === 'Hotel' && config && (config.hotelCategory || config.starRating) ? (
            <Box2 title="Hotel Info" tone="blue">{config.hotelCategory ? <Text style={{ fontSize: 13 }}>Category: {config.hotelCategory}</Text> : null}{config.starRating ? <Text style={{ fontSize: 13 }}>Rating: {config.starRating} Stars</Text> : null}</Box2>
          ) : null}
          {propertyType === 'Villa' && property.structure ? (
            <Box2 title="Villa Structure" tone="green">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Kv k="Bedrooms" v={property.structure.bedrooms} /><Kv k="Bathrooms" v={property.structure.bathrooms} /><Kv k="Max Guests" v={property.structure.maxGuests} /><Kv k="Floors" v={property.structure.floors} />
              </View>
            </Box2>
          ) : null}
          {propertyType === 'Resort' && config ? (
            <Box2 title="Resort Highlights" tone="amber">
              <Text style={{ fontSize: 13 }}>Theme: {config.resortTheme || config.resortType || '—'}</Text>
              {config.resortCategory ? <Text style={{ fontSize: 13 }}>Category: {config.resortCategory}</Text> : null}
              <Text style={{ fontSize: 13 }}>Reception: {config.receptionAvailable ? '24/7' : 'Limited Hours'}</Text>
            </Box2>
          ) : null}
          {propertyType === 'Homestay' && config ? (
            <Box2 title="Homestay Experience" tone="amber">
              <Text style={{ fontSize: 13 }}>Food: {config.foodType} ({config.mealsAvailable === 'Yes' ? 'Available' : 'Not Available'})</Text>
              <Text style={{ fontSize: 13 }}>Shared Areas: {config.sharedAreas ? 'Yes' : 'No'}</Text>
              {config.idealFor?.length > 0 ? <Text style={{ fontSize: 13 }}>Ideal For: {Array.isArray(config.idealFor) ? config.idealFor.join(', ') : config.idealFor}</Text> : null}
              {config.stayExperience ? <Text style={{ fontSize: 13 }}>Experience: {config.stayExperience}</Text> : null}
            </Box2>
          ) : null}
          {propertyType === 'Hostel' && config?.hostelType ? (
            <Box2 title="Hostel Info" tone="purple">
              <Text style={{ fontSize: 13 }}>Type: {config.hostelType}</Text><Text style={{ fontSize: 13 }}>Curfew: {config.curfewTime || 'No Curfew'}</Text><Text style={{ fontSize: 13 }}>Age Restriction: {config.ageRestriction ? 'Yes' : 'No'}</Text>
            </Box2>
          ) : null}

          {!isWholeUnit && hasInventory ? (
            <View onLayout={(e) => { roomsY.current = e.nativeEvent.layout.y + 280; }} style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 14 }}>{isBedBased ? 'Choose your Bed/Room' : propertyType === 'Tent' ? 'Choose your tent' : 'Choose your room'}</Text>
              {inventory.map((room) => {
                const cat = room.roomCategory ? ({ triple: ['Triple Sharing', '#f0f7fd', colors.emerald700], double: ['Double Sharing', '#EFF6FF', colors.blue700], private: ['Private Room', '#EEF2FF', colors.indigo600], shared: ['Shared Dorm', colors.gray100, colors.gray700] }[room.roomCategory.toLowerCase()] || [room.roomCategory, 'rgba(0,92,168,0.1)', colors.surface]) : null;
                const sel = selectedRoom?._id === room._id;
                return (
                  <TouchableOpacity key={room._id} activeOpacity={0.9} onPress={() => { setSelectedRoom(room); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} style={{ borderWidth: sel ? 2 : 1, borderColor: sel ? colors.surface : colors.gray200, borderRadius: 12, padding: 16, backgroundColor: sel ? 'rgba(0,92,168,0.05)' : '#fff', marginBottom: 14, overflow: 'hidden' }}>
                    {sel ? <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderBottomLeftRadius: 8 }}><Text style={{ color: '#fff', fontSize: 10 }}>Selected</Text></View> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700', color: colors.textDark, flex: 1 }}>{room.type}</Text>
                      <Text style={{ fontWeight: '700', color: colors.surface }}>₹{getRoomPrice(room) || 'N/A'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 8 }}>{room.description || `Comfortable ${room.type}`}</Text>
                    {extraLabels(room).map((l, i) => <Text key={i} style={{ fontSize: 11, color: colors.gray600 }}>{l}</Text>)}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {cat ? <Pill text={cat[0]} bg={cat[1]} fg={cat[2]} /> : null}
                      {room.bathroomType ? <Pill text={room.bathroomType} bg="#EFF6FF" fg={colors.blue700} /> : null}
                      {room.amenities?.filter((a) => a && typeof a === 'string' && a.trim()).slice(0, 3).map((am, i) => <Pill key={i} text={am} bg={colors.gray100} fg={colors.gray600} />)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {isLeadType ? (
            <View style={{ marginBottom: 24, padding: 20, backgroundColor: '#f0f7fd', borderRadius: 20, borderWidth: 1, borderColor: '#dceef9', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#dceef9', alignItems: 'center', justifyContent: 'center' }}><Phone size={24} color={colors.emerald600} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#00264b' }}>Interested in this property?</Text>
                  <Text style={{ fontSize: 13, color: '#004b8a', fontWeight: '500' }}>Contact the owner directly for more details and visits.</Text>
                </View>
              </View>
              <TouchableOpacity onPress={revealedNumber ? call : handleReveal} disabled={revealLoading} style={{ paddingVertical: 12, backgroundColor: '#005CA8', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {revealLoading ? <ActivityIndicator color="#fff" /> : (<><Phone size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '900' }}>{revealedNumber ? `Call: ${revealedNumber}` : 'Reveal Contact Number'}</Text></>)}
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: '#005CA8', fontWeight: '700', textAlign: 'center' }}>Verified Inquiries Only</Text>
            </View>
          ) : (
            <View style={{ marginBottom: 24, padding: 16, backgroundColor: colors.gray50, borderRadius: 12, borderWidth: 1, borderColor: colors.gray100, gap: 12 }}>
              <Text style={{ fontWeight: '700', color: colors.textDark }}>{isPgOrHostel ? 'Stay Details' : 'Trip Details'}</Text>
              {!isPgOrHostel ? (<>
                <DatePickerField label="Check-in" date={dates.checkIn} onChange={(d) => setDates({ ...dates, checkIn: d })} minDate={toYMD(new Date())} placeholder="Select Check-in" />
                <DatePickerField label="Check-out" date={dates.checkOut} onChange={(d) => setDates({ ...dates, checkOut: d })} minDate={dates.checkIn ? toYMD(new Date(new Date(dates.checkIn).getTime() + 86400000)) : toYMD(new Date())} placeholder="Select Check-out" />
              </>) : null}
              {!isWholeUnit ? <View><Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>{unitLabel}</Text>{numInput('rooms', 1)}</View> : null}
              <View><Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>{isPgOrHostel ? 'Guests' : 'Adults'}</Text>{numInput('adults', 1, isBedBased)}</View>
              {!isBedBased ? <View><Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>Children</Text>{numInput('children', 0)}</View> : null}

              {offers.length > 0 ? (
                <View style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Gift size={16} color={colors.surface} /><Text style={{ fontWeight: '700', color: colors.gray800, fontSize: 14 }}>Offers & Coupons</Text></View>
                    <TouchableOpacity onPress={() => setShowOffers(true)}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.surface }}>View All</Text></TouchableOpacity>
                  </View>
                  {appliedOffer ? (
                    <View style={{ backgroundColor: colors.green50, borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Tag size={16} color={colors.green700} />
                      <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: '#166534', fontSize: 14 }}>{appliedOffer.code}</Text><Text style={{ fontSize: 12, color: colors.green600 }}>{appliedOffer.discountType === 'percentage' ? `${appliedOffer.discountValue}% Off applied` : `₹${appliedOffer.discountValue} Off applied`}</Text></View>
                      <TouchableOpacity onPress={() => { setAppliedOffer(null); toast.success('Coupon removed'); }}><X size={16} color={colors.green700} /></TouchableOpacity>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {offers.slice(0, 3).map((o) => (
                        <TouchableOpacity key={o._id} onPress={() => handleApplyOffer(o)} style={{ width: 170, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, padding: 12 }}>
                          <Text style={{ fontWeight: '700', color: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.surface, alignSelf: 'flex-start', paddingHorizontal: 6, fontSize: 12 }}>{o.code}</Text>
                          <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 12, color: colors.gray800, marginTop: 8 }}>{o.title}</Text>
                          <Text numberOfLines={2} style={{ fontSize: 10, color: colors.gray500 }}>{o.subtitle}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ) : null}

              {priceBreakdown ? (
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.gray200, gap: 6 }}>
                  <Text style={{ fontWeight: '700', color: colors.gray800, fontSize: 14, marginBottom: 4 }}>Price Breakdown</Text>
                  {[
                    [isPgOrHostel ? 'Monthly Rent' : `Base Price (${priceBreakdown.nights} nights x ${priceBreakdown.units} ${unitLabel.toLowerCase()})`, `₹${priceBreakdown.totalBasePrice.toLocaleString()}`],
                    priceBreakdown.totalExtraAdultCharge > 0 && [`Extra Adults (${priceBreakdown.extraAdultsCount})`, `₹${priceBreakdown.totalExtraAdultCharge.toLocaleString()}`],
                    priceBreakdown.totalExtraChildCharge > 0 && [`Extra Children (${priceBreakdown.extraChildrenCount})`, `₹${priceBreakdown.totalExtraChildCharge.toLocaleString()}`],
                    priceBreakdown.discountAmount > 0 && [`Discount (${priceBreakdown.couponCode})`, `- ₹${priceBreakdown.discountAmount.toLocaleString()}`, true],
                    priceBreakdown.taxAmount > 0 && [`Taxes & Fees (${taxRate}%)`, `₹${priceBreakdown.taxAmount.toLocaleString()}`],
                  ].filter(Boolean).map(([k, v, green], i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontSize: 12, color: green ? colors.green600 : colors.gray600, flex: 1 }}>{k}</Text><Text style={{ fontSize: 12, fontWeight: '600', color: green ? colors.green600 : colors.gray800 }}>{v}</Text></View>
                  ))}
                  <View style={{ height: 1, backgroundColor: colors.gray100, marginVertical: 4 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', color: colors.gray900 }}>Total</Text><Text style={{ fontWeight: '800', color: colors.surface }}>₹{priceBreakdown.grandTotal.toLocaleString()}</Text></View>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8 }}>
                <Info size={14} color={colors.blue600} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 11, color: colors.blue700 }}>Max allowed: <Text style={{ fontSize: 11, fontWeight: '700', color: colors.blue700 }}>{getMaxAdults()} {isPgOrHostel ? 'Guests' : 'Adults'}</Text>{!isPgOrHostel ? <> and <Text style={{ fontSize: 11, fontWeight: '700', color: colors.blue700 }}>{getMaxChildren()} Children</Text></> : null} for current selection.</Text>
              </View>
            </View>
          )}

          <Section title="House Rules & Policies">
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Clock size={16} color={colors.gray500} /><Text style={{ fontSize: 13, color: colors.gray600 }}>Check-in: {timeStr(policies.checkInTime)}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Clock size={16} color={colors.gray500} /><Text style={{ fontSize: 13, color: colors.gray600 }}>Check-out: {timeStr(policies.checkOutTime)}</Text></View>
              {policies.cancellationPolicy ? <View style={{ flexDirection: 'row', gap: 8 }}><Shield size={16} color={colors.gray500} /><Text style={{ flex: 1, fontSize: 13, color: colors.gray600 }}>{policies.cancellationPolicy}</Text></View> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {policyBadges.map((b) => <Pill key={b.label} text={`${b.label}: ${b.value ? 'Yes' : 'No'}`} bg={b.value ? colors.green50 : colors.red50} fg={b.value ? colors.green700 : colors.red700} />)}
              </View>
              {Array.isArray(policies.houseRules) && policies.houseRules.length > 0 ? policies.houseRules.map((r, i) => <Text key={i} style={{ fontSize: 13, color: colors.gray600 }}>• {typeof r === 'string' ? r : JSON.stringify(r)}</Text>) : null}
              {policies.houseRules && !Array.isArray(policies.houseRules) && typeof policies.houseRules === 'object' ? Object.entries(policies.houseRules).map(([k, v], i) => <Text key={i} style={{ fontSize: 13, color: colors.gray600 }}>• {k.replace(/([A-Z])/g, ' $1')}: {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</Text>) : null}
            </View>
          </Section>

          {nearbyPlaces && nearbyPlaces.length > 0 ? (
            <Section title="Nearby Places">
              {nearbyPlaces.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray50 }}>
                  <Text style={{ fontSize: 13, color: colors.gray700, flex: 1 }}>{p.name}</Text><Text style={{ fontSize: 12, color: colors.gray500 }}>{p.distance}</Text>
                </View>))}
            </Section>
          ) : null}

          <Section>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textDark }}>Guest Reviews</Text>
              <TouchableOpacity onPress={() => setShowReviewForm(!showReviewForm)}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.surface }}>{showReviewForm ? 'Cancel' : 'Write a Review'}</Text></TouchableOpacity>
            </View>
            {showReviewForm ? (
              <View style={{ backgroundColor: colors.gray50, borderRadius: 12, padding: 14, marginBottom: 14, gap: 10 }}>
                <Text style={{ fontWeight: '700', color: colors.gray800 }}>Rate your experience</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>{[1, 2, 3, 4, 5].map((n) => <TouchableOpacity key={n} onPress={() => setReviewData({ ...reviewData, rating: n })}><Star size={28} color={colors.honey} fill={n <= reviewData.rating ? colors.honey : 'transparent'} /></TouchableOpacity>)}</View>
                <Input value={reviewData.comment} onChangeText={(v) => setReviewData({ ...reviewData, comment: v })} placeholder="Share your experience..." multiline style={{ minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, padding: 10 }} />
                <TouchableOpacity disabled={reviewLoading} onPress={handleReviewSubmit} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: reviewLoading ? 0.6 : 1 }}>{reviewLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Submit Review</Text>}</TouchableOpacity>
              </View>
            ) : null}
            {reviews.length === 0 ? <Text style={{ fontSize: 13, color: colors.gray400, textAlign: 'center', paddingVertical: 16 }}>No reviews yet. Be the first to review!</Text> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {reviews.map((r) => (
                  <View key={r._id} style={{ width: Math.min(width * 0.75, 420), backgroundColor: colors.gray50, borderRadius: 12, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray200, alignItems: 'center', justifyContent: 'center' }}><User size={18} color={colors.gray500} /></View>
                      <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', fontSize: 13, color: colors.gray800 }}>{r.userId?.name || r.user?.name || 'Guest'}</Text><Text style={{ fontSize: 10, color: colors.gray400 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</Text></View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.green50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.green700 }}>{r.rating}</Text><Star size={10} color={colors.green700} fill={colors.green700} /></View>
                    </View>
                    <Text numberOfLines={5} style={{ fontSize: 12, color: colors.gray600 }}>{r.comment}</Text>
                    {r.reply ? <View style={{ marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 8 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray500 }}>Owner reply</Text><Text style={{ fontSize: 12, color: colors.gray600 }}>{r.reply}</Text></View> : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </Section>
        </View>
        </View>
      </ScrollView>

      {/* Sticky bottom booking bar */}
      {!keyboardOpen ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.gray100, paddingHorizontal: sidePad, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 16 }}>
          <View style={{ flexShrink: 1, minWidth: 90 }}>
            <Text style={{ fontSize: 10, color: colors.gray500, fontWeight: '600' }}>{priceBreakdown ? 'Total Amount' : priceLabel}</Text>
            <Text style={{ fontWeight: '900', fontSize: 16, color: colors.surface, marginTop: 2 }}>₹{priceBreakdown?.grandTotal?.toLocaleString() || bookingBarPrice?.toLocaleString() || 'N/A'}</Text>
            {!isLeadType && dates.checkIn && dates.checkOut ? (
              checking ? <Text style={{ fontSize: 10, color: colors.blue500 }}>Checking...</Text>
              : availability?.available === false ? <Text numberOfLines={2} style={{ fontSize: 10, color: colors.red500, fontWeight: '700' }}>{availability.message || 'Not Available'}</Text>
              : availability?.available === true ? <Text style={{ fontSize: 10, color: colors.green600, fontWeight: '700' }}>{availability.unitsLeft !== undefined ? `${availability.unitsLeft} Left!` : 'Available'}</Text> : null
            ) : null}
            {extraPricingLabels.length > 0 ? <Text numberOfLines={1} style={{ fontSize: 10, color: colors.gray400 }}>{extraPricingLabels.join(' • ')}</Text> : null}
          </View>
          {isOwner ? (
            <TouchableOpacity onPress={() => router.push(`/hotel/properties/${id}`)} style={{ flex: 1, backgroundColor: colors.emerald50, borderWidth: 1, borderColor: colors.emerald100, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 12, color: colors.emerald700 }}>This is your property</Text>
              <Text style={{ fontSize: 10, color: colors.gray500, marginTop: 2 }}>Tap to manage it in your hotel dashboard</Text>
            </TouchableOpacity>
          ) : isLeadType ? (
            <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={revealedNumber ? call : handleReveal} disabled={revealLoading} style={{ flex: 1, backgroundColor: revealedNumber ? '#f0f7fd' : '#fff', borderWidth: 2, borderColor: '#005CA8', borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {revealLoading ? <ActivityIndicator color="#005CA8" /> : (<><Phone size={15} color="#005CA8" /><Text style={{ fontWeight: '900', fontSize: 12, color: revealedNumber ? colors.emerald700 : '#005CA8' }}>{revealedNumber ? 'Call Now' : 'Contact'}</Text></>)}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBook} disabled={bookingLoading} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', opacity: bookingLoading ? 0.6 : 1 }}>
                {bookingLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>Enquire Now</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleBook} disabled={bookingLoading || checking} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: bookingLoading || checking ? 0.7 : 1 }}>
              {bookingLoading || checking ? <><ActivityIndicator color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{checking ? 'Checking...' : 'Processing...'}</Text></> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Book Now</Text>}
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* All offers */}
      <Modal visible={showOffers} animationType="slide" onRequestClose={() => setShowOffers(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray50 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff' }}>
            <Text style={{ fontWeight: '700', fontSize: 18, color: colors.gray900 }}>Available Offers</Text>
            <TouchableOpacity onPress={() => setShowOffers(false)} style={{ padding: 8, backgroundColor: colors.gray100, borderRadius: 999 }}><X size={20} color={colors.gray600} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={[{ padding: 16, gap: 12 }, CENTER]}>
            {offers.map((o) => (
              <View key={o._id} style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100 }}>
                <View style={{ backgroundColor: colors.surface, padding: 14 }}>
                  <Text style={{ fontWeight: '900', fontSize: 20, color: '#fff' }}>{o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{o.title}</Text>
                </View>
                <View style={{ padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.gray500 }}>{o.subtitle || o.description}</Text>
                  {o.minBookingAmount ? <Text style={{ fontSize: 11, color: colors.gray500 }}>Min booking ₹{o.minBookingAmount}</Text> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ fontWeight: '800', color: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4 }}>{o.code}</Text>
                    <TouchableOpacity onPress={() => handleApplyOffer(o)} style={{ backgroundColor: colors.surface, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Apply</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Fullscreen gallery */}
      <Modal visible={showImages} animationType="fade" onRequestClose={() => setShowImages(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 }}>{name}</Text>
            <TouchableOpacity onPress={() => setShowImages(false)} style={{ padding: 8 }}><X size={22} color="#fff" /></TouchableOpacity>
          </View>
          <FlatList data={galleryImages} horizontal pagingEnabled initialScrollIndex={Math.min(imgIdx, galleryImages.length - 1)} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })} keyExtractor={(u, i) => u + i} showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <View style={{ width, flex: 1, justifyContent: 'center' }}><Image source={{ uri: item }} style={{ width, height: '80%' }} contentFit="contain" /></View>} />
          <Text style={{ color: '#fff', textAlign: 'center', paddingBottom: insets.bottom + 12, fontSize: 12 }}>{imgIdx + 1} / {galleryImages.length}</Text>
        </View>
      </Modal>
    </View>
  );
}
