import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, BackHandler, Keyboard, TextInput, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, X, CheckCircle, Home, MapPin, Plus, Trash2, FileText, Bed } from 'lucide-react-native';
import { Text } from '../../ui';
import { colors } from '../../../theme';
import { propertyService, hotelService } from '../../../services/apiService';
import { categoryService } from '../../../services/categoryService';
import { checkPartnerCanAddProperty } from '../../../utils/subscriptionGuard';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../../../utils/phone';
import { getWizardParams, clearWizardParams } from '../../../lib/wizardState';
import draftStore from '../../../lib/draftStore';
import DatePickerField from '../../DatePickerField';
import toast from '../../../store/toastStore';
import { errMsg } from '../../../utils/format';
import { CENTER } from '../../../lib/responsive';
import {
  P, ErrorBanner, Label, TInput, Choice, Check, YesNo, Chips, SectionTitle, useUploader, removeRemoteImage,
  ImageSlot, Gallery, LocationStep, NearbyStep, DocsStep,
} from './parts';

const PG_AMENITIES = ['Wi-Fi', 'AC', 'Food', 'Laundry', 'Housekeeping', 'CCTV', 'Security', 'RO Water', 'Gym', 'Lift', 'Power Backup', 'Geyser', 'Fridge', 'Parking', 'TV', 'Kitchen', 'Smoking Allowed', 'Drinking Allowed', 'Visitors Allowed', 'Guardian Allowed'];
const ROOM_AMENITIES = ['Bed', 'Personal Locker', 'Fan', 'AC', 'Geyser', 'Washing Machine', 'Table', 'Chair', 'LED TV', 'Water 24*7', 'Attached Washroom', 'Common Washroom', 'Sofa', 'Almirah'];
const RENT_AMENITIES = ['Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV', 'Comfort Amenities', 'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning'];
const SELL_AMENITIES = ['Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV', 'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning', 'Club House'];
const HOTEL_AMENITIES = ['Lift', 'Restaurant', 'Room Service', 'Swimming Pool', 'Parking', 'Gym', 'Spa', 'Bar'];
const REQUIRED_DOCS_PG = [{ type: 'rent_agreement', name: 'Rent Agreement' }, { type: 'owner_id_proof', name: 'Owner ID Proof' }];
const REQUIRED_DOCS_HOTEL = [{ type: 'trade_license', name: 'Trade License' }, { type: 'gst_certificate', name: 'GST Certificate' }, { type: 'fssai_license', name: 'FSSAI License' }, { type: 'fire_safety', name: 'Fire Safety Certificate' }];
const FACING = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];

const emptyForm = (kind) => ({
  propertyName: '', propertyType: kind === 'pg' ? 'pg' : '', pgType: 'boys', description: '', shortDescription: '', coverImage: '', propertyImages: [], videoUrl: '',
  address: { state: '', city: '', fullAddress: '', pincode: '' }, location: { type: 'Point', coordinates: ['', ''] }, nearbyPlaces: [], amenities: [],
  checkInTime: '', checkOutTime: '', contactNumber: '', cancellationPolicy: kind === 'pg' ? 'No refund after check-in' : '', houseRules: [],
  documents: (kind === 'pg' ? REQUIRED_DOCS_PG : REQUIRED_DOCS_HOTEL).map((d) => ({ type: d.type, name: d.name, fileUrl: '' })),
  minStay: '', noticePeriod: '', securityDeposit: '', availableFrom: '', foodIncluded: { breakfast: false, lunch: false, dinner: false }, smoking: false, drinking: false, visitors: false, curfew: '', ageRange: '',
  rentDetails: { type: '1BHK', furnishing: 'Semi', tenantPreference: 'Any', builtYear: '', securityDeposit: '', maintenanceCharges: '', electricityIncluded: false, waterSupply: '', societyName: '', lift: false },
  buyDetails: { type: 'Apartment', area: { superBuiltUp: '', carpet: '', unit: 'sqft' }, ownership: 'Freehold', propertyAge: 'New', floor: { current: '', total: '' }, facing: '', registrationIncluded: false, stampDutyIncluded: false, propertyTax: '', legalVerified: false, loanEligible: false, builderName: '' },
  plotDetails: { plotArea: '', unit: 'sqyrd', dimensions: { length: '', breadth: '' }, facing: '', landType: 'Residential', roadWidth: '', boundaryMarked: false, approvalAuthority: '', soilType: '', electricityAvailable: false, waterSource: '', nearbyLandmark: '' },
  isVerified: false, isFeatured: false, isUrgent: false, isNegotiable: false, virtualTourLink: '', availabilityStatus: 'Available',
});

// pgDetails.occupancy mirrors the owner's room categories (was hardcoded 'Single'); search and the Private Room filter use it
const OCC = { private: 'Single', double: 'Double', triple: 'Triple', shared: 'Other' };
const occupancyFromRooms = (list) => { const o = [...new Set((list || []).map((r) => OCC[String(r.roomCategory || '').toLowerCase()]).filter(Boolean))]; return o.length === 1 ? o[0] : o.length ? (o.find((x) => x !== 'Other') || 'Other') : 'Single'; };
const newRoom = () => ({ id: Date.now().toString() + Math.random().toString(36).slice(2), name: '', inventoryType: 'bed', roomCategory: 'shared', maxAdults: '', maxChildren: 0, bedsPerRoom: '', totalInventory: 99, pricePerNight: '', securityDeposit: '', availableFrom: '', extraAdultPrice: 0, extraChildPrice: 0, images: [], amenities: [], isActive: true });

export default function PropertyWizard({ kind, categoryId: routeCategoryId }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const footerPad = Math.max(insets.bottom, 12) + 14;
  const params = useRef(getWizardParams()).current;
  const existing = params.property || null;
  const isEdit = !!existing;

  const [categoryId, setCategoryId] = useState(routeCategoryId || params.categoryId || null);
  const [categoryName, setCategoryName] = useState(params.categoryName || (kind === 'pg' ? 'PG/Co-living' : ''));
  const cn = (categoryName || '').toLowerCase();
  const isTent = cn.includes('tent') || cn.includes('camp');
  const isRent = kind === 'dynamic' && (cn.includes('rent') || cn.includes('residential') || cn.includes('apartment'));
  const isBuy = kind === 'dynamic' && (cn.includes('buy') || cn.includes('sell'));
  const isPlot = kind === 'dynamic' && cn.includes('plot');
  const isPg = kind === 'pg';

  const steps = (() => {
    if (isPg) return [{ key: 'basic', label: 'Basic Info' }, { key: 'location', label: 'Location' }, { key: 'amenities', label: 'Amenities' }, { key: 'rooms', label: 'Bed Inventory' }, { key: 'images', label: 'Property Images' }, { key: 'review', label: 'Review & Submit' }];
    const s = [{ key: 'basic', label: 'Basic Info' }];
    if (isRent || isBuy || isPlot) s.push({ key: 'details', label: 'Property Details' });
    s.push({ key: 'location', label: 'Location' });
    if (!isPlot) s.push({ key: 'amenities', label: 'Amenities' });
    if (!isRent && !isPlot) s.push({ key: 'nearby', label: 'Nearby Places' });
    s.push({ key: 'images', label: 'Images' });
    if (!isRent && !isBuy && !isPlot) s.push({ key: 'rooms', label: isTent ? 'Tents/Units' : 'Room Types' });
    if (!isPlot && !isBuy && !isRent) s.push({ key: 'rules', label: 'Policies' });
    if (!isRent) s.push({ key: 'docs', label: 'Documents' });
    s.push({ key: 'review', label: 'Review' });
    return s;
  })();
  const total = steps.length;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(existing);
  const [form, setForm] = useState(() => emptyForm(kind));
  const [rooms, setRooms] = useState([]);
  const [editRoom, setEditRoom] = useState(null);
  const [editRoomIdx, setEditRoomIdx] = useState(null);
  const [originalRoomIds, setOriginalRoomIds] = useState([]);
  const [done, setDone] = useState(false);
  const [booted, setBooted] = useState(false);
  const scrollRef = useRef(null);
  const scrollY = useRef(0);
  // Keyboard: the Android window does not shrink (edge-to-edge), so pad the form by the keyboard height,
  // hide the sticky footer and scroll the focused field (e.g. About Property) above the keyboard.
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const h = e?.endCoordinates?.height || 0;
      const kbTop = e?.endCoordinates?.screenY || (Dimensions.get('screen').height - h);
      setKbH(h);
      setTimeout(() => {
        const input = TextInput.State?.currentlyFocusedInput?.();
        if (!input?.measureInWindow) return;
        input.measureInWindow((x, y, w, ih) => {
          const overflow = y + Math.min(ih, 140) + 24 - kbTop;
          if (overflow > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overflow, animated: true });
        });
      }, 120);
    });
    const hide = Keyboard.addListener(hideEvt, () => setKbH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const { uploading, run } = useUploader(setError);

  const STORAGE_KEY = isPg ? `hoomzo_pg_wizard_draft_${existing?._id || 'new'}` : `hoomzo_hotel_wizard_draft_${existing?._id || (categoryId ? `dynamic_${categoryId}` : 'new')}`;

  const update = useCallback((path, value) => {
    setForm((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      const keys = Array.isArray(path) ? path : String(path).split('.');
      let ref = clone;
      for (let i = 0; i < keys.length - 1; i++) { if (typeof ref[keys[i]] !== 'object' || ref[keys[i]] === null) ref[keys[i]] = {}; ref = ref[keys[i]]; }
      ref[keys[keys.length - 1]] = value;
      return clone;
    });
  }, []);

  // Subscription gate (only for new listings)
  useEffect(() => {
    if (isEdit) return;
    let m = true;
    (async () => {
      const check = await checkPartnerCanAddProperty();
      if (!m) return;
      if (!check.canAdd) { toast.error(check.message, { duration: 4000 }); router.replace({ pathname: '/hotel/subscriptions', params: { reason: check.reason, alertMessage: check.message } }); }
    })();
    return () => { m = false; };
  }, []);

  // Category name / id lookups
  useEffect(() => {
    (async () => {
      try {
        const cats = await categoryService.getActiveCategories();
        if (isPg && !categoryId) { const pg = cats.find((c) => ['hostel', 'pg', 'pg/co-living', 'co-living'].includes((c.displayName || '').toLowerCase()) || ['hostel', 'pg', 'pg/co-living', 'co-living'].includes((c.name || '').toLowerCase())); if (pg?._id) setCategoryId(pg._id); }
        if (!isPg && categoryId && !params.categoryName) { const m = cats.find((c) => c._id === categoryId); if (m) setCategoryName(m.displayName || m.name); }
      } catch {}
    })();
  }, []);

  // Restore draft (local first, then server) / load property for edit
  useEffect(() => {
    (async () => {
      if (isEdit) {
        setLoading(true);
        try {
          const res = await propertyService.getDetails(existing._id);
          const prop = res.property || existing; const docs = res.documents?.documents || []; const rts = res.roomTypes || [];
          setCreated(prop);
          const base = emptyForm(kind);
          setForm({
            ...base, propertyName: prop.propertyName || '', pgType: prop.pgType || 'boys', description: prop.description || '', shortDescription: prop.shortDescription || '',
            coverImage: prop.coverImage || '', propertyImages: prop.propertyImages || [], videoUrl: prop.videoUrl || '',
            rentDetails: prop.rentDetails || base.rentDetails, buyDetails: prop.buyDetails || base.buyDetails, plotDetails: prop.plotDetails || base.plotDetails,
            isVerified: prop.isVerified || false, isFeatured: prop.isFeatured || false, isUrgent: prop.isUrgent || false, isNegotiable: prop.isNegotiable || false, virtualTourLink: prop.virtualTourLink || '', availabilityStatus: prop.availabilityStatus || 'Available',
            address: { country: prop.address?.country || '', state: prop.address?.state || '', city: prop.address?.city || '', area: prop.address?.area || '', fullAddress: prop.address?.fullAddress || '', pincode: prop.address?.pincode || '' },
            location: { type: 'Point', coordinates: [typeof prop.location?.coordinates?.[0] === 'number' ? String(prop.location.coordinates[0]) : '', typeof prop.location?.coordinates?.[1] === 'number' ? String(prop.location.coordinates[1]) : ''] },
            nearbyPlaces: Array.isArray(prop.nearbyPlaces) ? prop.nearbyPlaces.map((p) => ({ name: p.name || '', type: p.type || 'tourist', distanceKm: typeof p.distanceKm === 'number' ? String(p.distanceKm) : '' })) : [],
            amenities: prop.amenities || [], checkInTime: prop.checkInTime || '', checkOutTime: prop.checkOutTime || '', cancellationPolicy: prop.cancellationPolicy || base.cancellationPolicy, houseRules: prop.houseRules || [],
            contactNumber: sanitizePhoneNumber(prop.contactNumber || ''),
            documents: docs.length ? docs.map((d) => ({ type: d.type || d.name, name: d.name, fileUrl: d.fileUrl || '' })) : base.documents,
            minStay: prop.pgDetails?.minStay || '', noticePeriod: prop.pgDetails?.noticePeriod || '', securityDeposit: prop.pgDetails?.securityDeposit || '',
            availableFrom: prop.pgDetails?.availableFrom ? new Date(prop.pgDetails.availableFrom).toISOString().split('T')[0] : '',
            foodIncluded: { breakfast: prop.pgDetails?.foodIncluded?.breakfast || false, lunch: prop.pgDetails?.foodIncluded?.lunch || false, dinner: prop.pgDetails?.foodIncluded?.dinner || false },
            smoking: prop.pgDetails?.rules?.smoking || false, drinking: prop.pgDetails?.rules?.drinking || false, visitors: prop.pgDetails?.rules?.visitors || false, curfew: prop.pgDetails?.rules?.curfew || '', ageRange: prop.pgDetails?.rules?.ageRange || '',
          });
          if (rts.length) { setRooms(rts.map((rt) => ({ id: rt._id, backendId: rt._id, name: rt.name || '', inventoryType: rt.inventoryType || 'bed', roomCategory: rt.roomCategory || 'shared', maxAdults: rt.maxAdults ?? 1, maxChildren: rt.maxChildren ?? 0, bedsPerRoom: rt.bedsPerRoom ?? 4, totalInventory: rt.totalInventory ?? 20, pricePerNight: rt.pricePerNight ?? '', securityDeposit: rt.securityDeposit ?? '', availableFrom: rt.availableFrom || '', extraAdultPrice: rt.extraAdultPrice ?? 0, extraChildPrice: rt.extraChildPrice ?? 0, images: rt.images || [], amenities: rt.amenities || [], isActive: typeof rt.isActive === 'boolean' ? rt.isActive : true }))); setOriginalRoomIds(rts.map((rt) => rt._id)); }
        } catch (e) { setError(errMsg(e, 'Failed to load property details')); } finally { setLoading(false); setBooted(true); }
        return;
      }
      const apply = (d) => {
        if (!d || !d.propertyForm || !(d.step >= 1) || d.step >= total + 1) return false;
        if (d.propertyForm.contactNumber) d.propertyForm.contactNumber = sanitizePhoneNumber(d.propertyForm.contactNumber);
        setStep(d.step); setForm({ ...emptyForm(kind), ...d.propertyForm }); setRooms(d.roomTypes || []); if (d.createdProperty) setCreated(d.createdProperty);
        return true;
      };
      const local = await draftStore.loadLocal(STORAGE_KEY);
      if (!apply(local)) { const remote = await draftStore.fetchRemote(STORAGE_KEY); apply(remote); }
      setBooted(true);
    })();
  }, []);

  // Autosave draft
  useEffect(() => {
    if (!booted || isEdit || done) return;
    const t = setTimeout(() => draftStore.save(STORAGE_KEY, JSON.stringify({ step, propertyForm: form, roomTypes: rooms, createdProperty: created })), 1000);
    return () => clearTimeout(t);
  }, [step, form, rooms, created, booted, done]);

  // Android back: previous step instead of leaving the wizard
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { handleBack(); return true; });
    return () => sub.remove();
  });
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [step]);

  const cur = steps[step - 1] || steps[steps.length - 1];
  const subEditing = (cur.key === 'rooms' && editRoom !== null);

  // ---- validation
  const next = () => {
    setError('');
    const k = cur.key;
    if (k === 'basic') { if (!form.propertyName?.trim()) { setError(isPg ? 'Property name is required' : 'Property name required'); return; } if (form.contactNumber && (form.contactNumber.length !== 10 || !isValidPhoneNumber(form.contactNumber))) { setError('Please enter a valid 10-digit contact number'); return; } }
    if (k === 'details') {
      if (isRent) { if (!form.rentDetails.monthlyRent) return setError('Monthly Rent is required'); if (!form.rentDetails.type) return setError('Property Type is required'); }
      if (isBuy) { if (!form.buyDetails.expectedPrice) return setError('Expected Price is required'); if (!form.buyDetails.type) return setError('Property Type is required'); }
      if (isPlot) { if (!form.plotDetails.expectedPrice) return setError('Expected Price is required'); if (!form.plotDetails.plotArea) return setError('Plot Area is required'); }
    }
    if (k === 'location') {
      if (isPg) { const { state, city, fullAddress } = form.address; if (!state || !city || !fullAddress) return setError('Please fill all address fields (State, City, Full address).'); }
      else if (!form.address.fullAddress) return setError('Address required');
    }
    if (k === 'nearby' && !isBuy && form.nearbyPlaces.length < 1) return setError('Please add at least 1 nearby place');
    if (k === 'images') {
      if (!form.coverImage) return setError('Cover image is required');
      if (form.propertyImages.filter(Boolean).length < 4) return setError('Please upload at least 4 property images');
    }
    if (k === 'rooms') {
      if (!rooms.length) return setError(isPg ? 'At least one RoomType required' : 'At least one RoomType required');
      for (const rt of rooms) { if (!rt.name || !rt.pricePerNight) return setError('Room type name and price required'); if (!isPg && (rt.images || []).filter(Boolean).length < 3) return setError('Each room type must have at least 3 images'); }
    }
    if (k === 'rules' && (!form.checkInTime || !form.checkOutTime)) return setError('Check-in and check-out times are required');
    if (k === 'review') { submit(); return; }
    setStep((s) => s + 1);
  };

  const resolveCoords = async () => {
    const c0 = form.location?.coordinates?.[0]; const c1 = form.location?.coordinates?.[1];
    if (c0 != null && c1 != null && Number(c0) && Number(c1)) return [Number(c0), Number(c1)];
    const a = form.address; const q = [a.area, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', ');
    if (!q.trim()) return [77.0, 21.0];
    try { const res = await hotelService.searchLocation(q); const f = res?.results?.[0]; if (f?.lat != null && f?.lng != null) return [Number(f.lng), Number(f.lat)]; } catch {}
    return [77.0, 21.0];
  };

  const roomPayload = (rt) => ({
    name: rt.name, inventoryType: isPg ? 'bed' : isTent ? 'tent' : 'room', roomCategory: rt.roomCategory, bathroomType: rt.bathroomType,
    maxAdults: Number(rt.maxAdults), maxChildren: Number(rt.maxChildren || 0), ...(isPg ? { bedsPerRoom: Number(rt.bedsPerRoom), securityDeposit: Number(rt.securityDeposit || 0), availableFrom: rt.availableFrom || '' } : {}),
    totalInventory: Number(rt.totalInventory || 0), pricePerNight: Number(rt.pricePerNight), extraAdultPrice: Number(rt.extraAdultPrice || 0), extraChildPrice: Number(rt.extraChildPrice || 0),
    images: (rt.images || []).filter(Boolean), amenities: rt.amenities,
  });

  const submit = async () => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const [lng, lat] = await resolveCoords();
      const payload = {
        propertyType: isPg ? 'pg' : isTent ? 'tent' : isRent ? 'rent' : isBuy ? 'buy' : isPlot ? 'plot' : 'hotel',
        ...(isPg ? (categoryId ? { dynamicCategory: categoryId } : {}) : { dynamicCategory: categoryId }),
        propertyName: form.propertyName, contactNumber: form.contactNumber, description: form.description,
        shortDescription: form.shortDescription || (isPg ? form.description?.slice(0, 60) || form.propertyName || '' : ''),
        coverImage: form.coverImage, propertyImages: form.propertyImages.filter(Boolean), address: form.address, location: { type: 'Point', coordinates: [lng, lat] },
        nearbyPlaces: form.nearbyPlaces.map((p) => ({ name: p.name, type: p.type, distanceKm: Number(p.distanceKm || 0) })),
        amenities: form.amenities, checkInTime: form.checkInTime, checkOutTime: form.checkOutTime, cancellationPolicy: form.cancellationPolicy, houseRules: form.houseRules, documents: form.documents,
        ...(isPg ? {
          pgType: form.pgType,
          pgDetails: { occupancy: occupancyFromRooms(rooms), gender: form.pgType === 'boys' ? 'Boys' : form.pgType === 'girls' ? 'Girls' : 'Co-ed', minStay: form.minStay, noticePeriod: form.noticePeriod, securityDeposit: Number(form.securityDeposit || 0), availableFrom: form.availableFrom, foodIncluded: { breakfast: form.foodIncluded?.breakfast || false, lunch: form.foodIncluded?.lunch || false, dinner: form.foodIncluded?.dinner || false }, rules: { smoking: form.smoking, drinking: form.drinking, visitors: form.visitors, curfew: form.curfew, ageRange: form.ageRange } },
        } : {
          rentDetails: isRent ? form.rentDetails : undefined, buyDetails: isBuy ? form.buyDetails : undefined, plotDetails: isPlot ? form.plotDetails : undefined, videoUrl: form.videoUrl,
        }),
      };
      let propId = created?._id;
      if (propId) {
        const updated = await propertyService.update(propId, payload);
        propId = updated.property?._id || propId;
        const existingIds = new Set(isEdit ? originalRoomIds : []); const persisted = [];
        for (const rt of rooms) {
          const p = roomPayload(rt);
          if (rt.backendId) { await propertyService.updateRoomType(propId, rt.backendId, p); persisted.push(rt.backendId); }
          else { const c = await propertyService.addRoomType(propId, p); if (c.roomType?._id) persisted.push(c.roomType._id); }
        }
        for (const id of existingIds) if (!persisted.includes(id)) await propertyService.deleteRoomType(propId, id);
        if (!isPg && (created?.status === 'draft' || existing?.status === 'draft')) await propertyService.publishDraft(propId);
      } else {
        payload.roomTypes = rooms.map(roomPayload);
        const res = await propertyService.create(payload);
        propId = res.property?._id; setCreated(res.property);
      }
      draftStore.clear(STORAGE_KEY);
      setDone(true);
    } catch (e) {
      const msg = e?.message || (typeof e === 'string' ? e : 'Failed to submit property');
      setError(msg);
      const limit = e?.limitReached || e?.requiresSubscription || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('subscript');
      if (limit) {
        const saved = e?.property || e?.response?.data?.property;
        if (saved?._id) setCreated(saved);
        toast.success('Property details saved as draft! Redirecting to choose a plan...', { duration: 4000 });
        draftStore.flushNow();
        setTimeout(() => router.push({ pathname: '/hotel/subscriptions', params: { reason: 'limit', alertMessage: msg } }), 1200);
      }
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    if (done) { clearWizardParams(); router.replace('/hotel/properties'); return; }
    if (subEditing) { setEditRoom(null); setEditRoomIdx(null); setError(''); return; }
    if (step > 1) { setError(''); setStep((s) => s - 1); return; }
    draftStore.flushNow(); clearWizardParams(); router.back();
  };
  const exit = () => {
    if (done) { clearWizardParams(); router.replace('/hotel/properties'); return; }
    draftStore.flushNow(); clearWizardParams(); router.replace('/hotel/dashboard');
  };

  // ---- rooms
  const saveRoom = () => {
    if (!editRoom) return;
    if (!editRoom.name || !editRoom.pricePerNight) return setError('Room type name and price required');
    if (!isPg && (editRoom.images || []).filter(Boolean).length < 3) return setError('Please upload at least 3 room images');
    const arr = [...rooms]; if (editRoomIdx === -1 || editRoomIdx == null) arr.push(editRoom); else arr[editRoomIdx] = editRoom;
    setRooms(arr); setEditRoom(null); setEditRoomIdx(null); setError('');
  };
  const er = (patch) => setEditRoom((p) => ({ ...p, ...patch }));

  const progress = done ? 100 : Math.round((step / total) * 100);
  const amenityOptions = isPg ? PG_AMENITIES : isRent ? RENT_AMENITIES : isBuy ? SELL_AMENITIES : isTent ? [...HOTEL_AMENITIES] : HOTEL_AMENITIES;

  const renderStep = () => {
    const k = cur.key;
    if (k === 'basic') return (
      <View>
        <ErrorBanner error={error} />
        <SectionTitle icon={Home}>Basic Info</SectionTitle>
        <Label>{isPg ? 'Property Name' : isTent ? 'Property / Camp Name' : isPlot ? 'Project / Plot Name' : isBuy ? 'Property Title' : isRent ? 'Property / Society Name' : 'Property / Hotel Name'}</Label>
        <TInput value={form.propertyName} onChange={(v) => update('propertyName', v)} placeholder={isPg ? 'e.g. Hoomzo PG' : isRent ? 'e.g. Green Valley Apartments' : isPlot ? 'e.g. Palm Meadows Phase 1' : isBuy ? 'e.g. Luxury 3 BHK Villa' : 'Property name'} />
        {isPg ? (<>
          <Label>Category</Label><View style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.gray100, borderRadius: 12 }}><Text style={{ color: colors.gray600, fontWeight: '600' }}>PG / Co-living</Text></View>
          <Label>PG Type</Label><Choice options={[{ value: 'boys', label: 'Boys' }, { value: 'girls', label: 'Girls' }, { value: 'unisex', label: 'Unisex' }]} value={form.pgType} onChange={(v) => update('pgType', v)} />
          <Label>Min Stay</Label><TInput value={form.minStay} onChange={(v) => update('minStay', v)} placeholder="e.g. 1 Month" />
          <Label>Notice Period</Label><TInput value={form.noticePeriod} onChange={(v) => update('noticePeriod', v)} placeholder="e.g. 1 Month" />
          <Label>Food Included</Label>
          <Check label="Breakfast" value={form.foodIncluded?.breakfast} onChange={(v) => update(['foodIncluded', 'breakfast'], v)} />
          <Check label="Lunch" value={form.foodIncluded?.lunch} onChange={(v) => update(['foodIncluded', 'lunch'], v)} />
          <Check label="Dinner" value={form.foodIncluded?.dinner} onChange={(v) => update(['foodIncluded', 'dinner'], v)} />
        </>) : null}
        {!(isRent || isBuy || isPlot) && !isPg ? (<><Label>Short Description</Label><TInput value={form.shortDescription} onChange={(v) => update('shortDescription', v)} placeholder="Brief summary for listings..." multiline /></>) : null}
        <Label>{isPg ? 'About Property' : (isRent || isBuy || isPlot) ? 'Description' : 'Detailed Description'}</Label>
        <TInput value={form.description} onChange={(v) => update('description', v)} placeholder={isPg ? 'Describe the vibe, facilities, and what makes your PG unique...' : isRent ? 'Describe your property, amenities, etc...' : 'Describe your property...'} multiline />
      </View>
    );
    if (k === 'details') return (
      <View>
        <ErrorBanner error={error} />
        <SectionTitle icon={Home}>Property Details</SectionTitle>
        {isRent ? (<>
          <Label>Type</Label><Choice options={[{ value: '1BHK', label: '1 BHK' }, { value: '2BHK', label: '2 BHK' }, { value: '3BHK', label: '3 BHK' }, 'Villa', 'Studio']} value={form.rentDetails.type} onChange={(v) => update(['rentDetails', 'type'], v)} />
          <Label>Furnishing</Label><Choice options={[{ value: 'Fully', label: 'Fully Furnished' }, { value: 'Semi', label: 'Semi Furnished' }, 'Unfurnished']} value={form.rentDetails.furnishing} onChange={(v) => update(['rentDetails', 'furnishing'], v)} />
          <Label>Monthly Rent (₹)</Label><TInput value={form.rentDetails.monthlyRent} onChange={(v) => update(['rentDetails', 'monthlyRent'], v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" prefix="₹" />
          <Label>Security (₹)</Label><TInput value={form.rentDetails.securityDeposit ?? form.rentDetails.maintenanceCharges} onChange={(v) => { update(['rentDetails', 'securityDeposit'], v.replace(/[^0-9]/g, '')); update(['rentDetails', 'maintenanceCharges'], v.replace(/[^0-9]/g, '')); }} keyboardType="number-pad" placeholder="Security Deposit" prefix="₹" />
          <Label>Tenant Preference</Label><Choice options={['Family', 'Bachelors', 'Corporate']} value={form.rentDetails.tenantPreference} onChange={(v) => update(['rentDetails', 'tenantPreference'], v)} allowClear />
        </>) : null}
        {isBuy ? (<>
          <Label>Expected Price (₹)</Label><TInput value={form.buyDetails.expectedPrice} onChange={(v) => update(['buyDetails', 'expectedPrice'], v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" prefix="₹" />
          <Label>Super Built-up Area</Label><TInput value={form.buyDetails.area?.superBuiltUp} onChange={(v) => update(['buyDetails', 'area', 'superBuiltUp'], v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" suffix="sqft" />
          <Label>Type</Label><Choice options={['Apartment', 'Villa', 'Independent House']} value={form.buyDetails.type} onChange={(v) => update(['buyDetails', 'type'], v)} />
          <Label>Ownership</Label><Choice options={[{ value: 'Freehold', label: 'Freehold' }, { value: 'Leasehold', label: 'Leasehold' }, { value: 'Co-operative', label: 'Co-operative Society' }, 'Power of Attorney']} value={form.buyDetails.ownership} onChange={(v) => update(['buyDetails', 'ownership'], v)} />
        </>) : null}
        {isPlot ? (<>
          <Label>Expected Price (₹)</Label><TInput value={form.plotDetails.expectedPrice} onChange={(v) => update(['plotDetails', 'expectedPrice'], v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" prefix="₹" />
          <Label>Plot Area (sqyrd)</Label><TInput value={form.plotDetails.plotArea} onChange={(v) => update(['plotDetails', 'plotArea'], v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
          <Label>Dimensions (ft)</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><TInput value={form.plotDetails.dimensions?.length} onChange={(v) => update(['plotDetails', 'dimensions', 'length'], v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="Length" /></View><Text>x</Text><View style={{ flex: 1 }}><TInput value={form.plotDetails.dimensions?.breadth} onChange={(v) => update(['plotDetails', 'dimensions', 'breadth'], v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="Breadth" /></View></View>
          <Label>Facing</Label><Choice options={FACING} value={form.plotDetails.facing} onChange={(v) => update(['plotDetails', 'facing'], v)} allowClear />
          <Label>Land Type</Label><Choice options={['Residential', 'Commercial', 'Agricultural', 'Industrial']} value={form.plotDetails.landType} onChange={(v) => update(['plotDetails', 'landType'], v)} />
          <Label>Road Width (ft)</Label><TInput value={form.plotDetails.roadWidth} onChange={(v) => update(['plotDetails', 'roadWidth'], v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="e.g. 30" />
          <Label>Boundary Marked</Label><YesNo value={form.plotDetails.boundaryMarked} onChange={(v) => update(['plotDetails', 'boundaryMarked'], v)} />
          <Label>Electricity Available</Label><YesNo value={form.plotDetails.electricityAvailable} onChange={(v) => update(['plotDetails', 'electricityAvailable'], v)} />
          <Label>Water Source</Label><TInput value={form.plotDetails.waterSource} onChange={(v) => update(['plotDetails', 'waterSource'], v)} placeholder="e.g. Borewell, Municipal" />
          <Label>Approval Authority</Label><TInput value={form.plotDetails.approvalAuthority} onChange={(v) => update(['plotDetails', 'approvalAuthority'], v)} placeholder="e.g. DTCP, RERA" />
          <Label>Soil Type</Label><TInput value={form.plotDetails.soilType} onChange={(v) => update(['plotDetails', 'soilType'], v)} placeholder="e.g. Red Soil, Black Soil" />
          <Label>Nearby Landmark</Label><TInput value={form.plotDetails.nearbyLandmark} onChange={(v) => update(['plotDetails', 'nearbyLandmark'], v)} placeholder="e.g. Near XYZ Mall" />
        </>) : null}
      </View>
    );
    if (k === 'location') return (<View><SectionTitle icon={MapPin}>Location</SectionTitle><View style={{ height: 8 }} /><LocationStep form={form} update={update} error={error} setError={setError} /></View>);
    if (k === 'amenities') return (
      <View>
        <ErrorBanner error={error} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}><Text style={{ fontWeight: '800', color: colors.gray900, fontSize: 16 }}>Select Available Amenities</Text><Text style={{ fontSize: 12, color: colors.gray500 }}>{form.amenities.length} Selected</Text></View>
        <Chips options={amenityOptions} selected={form.amenities} onToggle={(a) => update('amenities', form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a])} />
      </View>
    );
    if (k === 'nearby') return <NearbyStep form={form} update={update} error={error} setError={setError} />;
    if (k === 'images') return (
      <View>
        <ErrorBanner error={error} />
        <Label>Cover Image</Label>
        <ImageSlot url={form.coverImage} uploading={uploading === 'cover'} onPick={() => run('cover', false, (u) => update('coverImage', u[0]))} onRemove={() => { removeRemoteImage(form.coverImage); update('coverImage', ''); }} />
        <Label>{isPg ? 'Property Gallery (Min 4)' : 'Gallery'}  <Text style={{ fontSize: 11, color: colors.gray400 }}>{form.propertyImages.length} / 4 minimum</Text></Label>
        <Gallery images={form.propertyImages} uploading={uploading === 'gallery'} onAdd={() => run('gallery', true, (u) => update('propertyImages', [...form.propertyImages, ...u]))} onRemove={(url, i) => { removeRemoteImage(url); update('propertyImages', form.propertyImages.filter((_, k2) => k2 !== i)); }} />
        {!isPg ? (<><Label>Property Video URL</Label><TInput value={form.videoUrl} onChange={(v) => update('videoUrl', v)} placeholder="e.g. YouTube or Drive Link" autoCapitalize="none" /></>) : null}
      </View>
    );
    if (k === 'rooms') {
      if (editRoom) return (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 14 }}>
          <ErrorBanner error={error} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', color: colors.gray900 }}>{editRoomIdx === -1 ? 'Add Inventory' : 'Edit Inventory'}</Text><TouchableOpacity onPress={() => { setEditRoom(null); setEditRoomIdx(null); setError(''); }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500 }}>Close</Text></TouchableOpacity></View>
          <Label>Category</Label><Choice options={isPg ? [{ value: 'private', label: 'Private Room' }, { value: 'double', label: 'Double Sharing' }, { value: 'triple', label: 'Triple Sharing' }, { value: 'shared', label: 'Shared Dorm' }] : ['private', 'shared']} value={editRoom.roomCategory} onChange={(v) => er({ roomCategory: v })} />
          <Label>Name</Label><TInput value={editRoom.name} onChange={(v) => { setError(''); er({ name: v }); }} placeholder={isPg ? 'e.g. 4 Sharing Air Conditioned Dorm' : 'e.g. Deluxe Room'} />
          <Label>{isPg ? 'Monthly Rent (₹)' : 'Price per night (₹)'}</Label><TInput value={editRoom.pricePerNight} onChange={(v) => { setError(''); er({ pricePerNight: v.replace(/[^0-9]/g, '') }); }} keyboardType="number-pad" prefix="₹" />
          {isPg ? (<>
            <Label>Security Amount (₹)</Label><TInput value={editRoom.securityDeposit} onChange={(v) => er({ securityDeposit: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" placeholder="5000" prefix="₹" />
            <Label>Beds per Room</Label><TInput value={editRoom.bedsPerRoom} onChange={(v) => er({ bedsPerRoom: v.replace(/[^0-9]/g, ''), maxAdults: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" placeholder="1" />
            <Label>Available From</Label><DatePickerField date={editRoom.availableFrom ? String(editRoom.availableFrom).slice(0, 10) : ''} onChange={(v) => er({ availableFrom: v })} onClear={() => er({ availableFrom: '' })} placeholder="Select date" />
          </>) : (<>
            <Label>Max Adults</Label><TInput value={editRoom.maxAdults} onChange={(v) => er({ maxAdults: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
            <Label>Max Children</Label><TInput value={editRoom.maxChildren} onChange={(v) => er({ maxChildren: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
            <Label>Total Units</Label><TInput value={editRoom.totalInventory} onChange={(v) => er({ totalInventory: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
            <Label>Extra Adult Price (₹)</Label><TInput value={editRoom.extraAdultPrice} onChange={(v) => er({ extraAdultPrice: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" prefix="₹" />
            <Label>Extra Child Price (₹)</Label><TInput value={editRoom.extraChildPrice} onChange={(v) => er({ extraChildPrice: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" prefix="₹" />
            <Label>Room Images (min 3)</Label>
            <Gallery images={(editRoom.images || []).filter(Boolean)} uploading={uploading === 'room'} onAdd={() => run('room', true, (u) => er({ images: [...(editRoom.images || []).filter(Boolean), ...u] }))} onRemove={(url, i) => { removeRemoteImage(url); er({ images: (editRoom.images || []).filter(Boolean).filter((_, k2) => k2 !== i) }); }} />
          </>)}
          <Label>Room/Bed Amenities</Label>
          <Chips options={isPg ? ROOM_AMENITIES : ['AC', 'WiFi', 'TV', 'Geyser', 'Balcony', 'Tea/Coffee']} selected={editRoom.amenities} onToggle={(a) => er({ amenities: editRoom.amenities.includes(a) ? editRoom.amenities.filter((x) => x !== a) : [...editRoom.amenities, a] })} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <TouchableOpacity onPress={() => { setEditRoom(null); setEditRoomIdx(null); setError(''); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.gray100, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: colors.gray700 }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={saveRoom} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: '#fff' }}>{editRoomIdx === -1 ? 'Add Inventory' : 'Save Changes'}</Text></TouchableOpacity>
          </View>
        </View>
      );
      return (
        <View>
          <ErrorBanner error={error} />
          <Text style={{ fontSize: 13, color: colors.gray500, marginBottom: 10 }}>{isPg ? 'Manage your PG inventory (Beds/Rooms).' : 'Manage your room types / units.'}</Text>
          {rooms.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: 28 }}><Bed size={24} color={colors.gray300} /><Text style={{ fontWeight: '700', color: colors.gray500, marginTop: 6 }}>No inventory added yet</Text><Text style={{ fontSize: 12, color: colors.gray400 }}>Add beds, dorms or private rooms</Text></View> : rooms.map((rt, i) => (
            <View key={rt.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100, borderRadius: 14, padding: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.gray900 }}>{rt.name}</Text><Text style={{ fontSize: 11, color: colors.gray500 }}>{rt.roomCategory} • ₹{rt.pricePerNight} {isPg ? '/ month' : '/ night'}{isPg ? ` • Beds: ${rt.bedsPerRoom}` : ''} • Inventory: {rt.totalInventory}</Text></View>
              <TouchableOpacity onPress={() => { setError(''); setEditRoomIdx(i); setEditRoom({ ...rt, images: Array.isArray(rt.images) ? rt.images : [], amenities: Array.isArray(rt.amenities) ? rt.amenities : [] }); }} style={{ padding: 6 }}><FileText size={16} color={colors.gray500} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setRooms((p) => p.filter((_, k2) => k2 !== i))} style={{ padding: 6 }}><Trash2 size={16} color={colors.red500} /></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => { setError(''); setEditRoomIdx(-1); setEditRoom(newRoom()); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.partnerBorder, borderRadius: 14, paddingVertical: 14 }}><Plus size={20} color={P} /><Text style={{ fontWeight: '700', color: P }}>Add Inventory</Text></TouchableOpacity>
        </View>
      );
    }
    if (k === 'rules') return (
      <View>
        <ErrorBanner error={error} />
        <Label>Check-in Time</Label><TInput value={form.checkInTime} onChange={(v) => update('checkInTime', v)} placeholder="e.g. 12:00 PM" />
        <Label>Check-out Time</Label><TInput value={form.checkOutTime} onChange={(v) => update('checkOutTime', v)} placeholder="e.g. 11:00 AM" />
        <Label>Cancellation Policy</Label><Choice options={['No refund after check-in', 'Free cancellation up to 24hrs', 'Strict']} value={form.cancellationPolicy} onChange={(v) => update('cancellationPolicy', v)} />
        <Label>House Rules</Label><TInput value={form.houseRules.join(', ')} onChange={(v) => update('houseRules', v.split(',').map((s) => s.trimStart()))} placeholder="No smoking, No pets, ID required at check-in" multiline />
        <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 4 }}>Separate rules with commas.</Text>
      </View>
    );
    if (k === 'docs') return <DocsStep form={form} update={update} error={error} setError={setError} />;
    if (k === 'review') {
      const R = ({ k2, v }) => (v === undefined || v === '' || v === null ? null : <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}><Text style={{ fontSize: 12, color: colors.gray500 }}>{k2}</Text><Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray900, flexShrink: 1, textAlign: 'right' }}>{String(v)}</Text></View>);
      return (
        <View>
          <ErrorBanner error={error} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.gray900, marginBottom: 10 }}>Review Compliance</Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.gray900 }}>{form.propertyName || 'No Name'}</Text>
            <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 8 }}>{form.address.fullAddress}</Text>
            {isRent ? <><R k2="Type" v={form.rentDetails.type} /><R k2="Monthly Rent" v={form.rentDetails.monthlyRent ? `₹${form.rentDetails.monthlyRent}` : ''} /></> : null}
            {isBuy ? <><R k2="Type" v={form.buyDetails.type} /><R k2="Expected Price" v={`₹${form.buyDetails.expectedPrice || '0'}`} /></> : null}
            {isPlot ? <><R k2="Plot Area" v={form.plotDetails.plotArea ? `${form.plotDetails.plotArea} ${form.plotDetails.unit}` : ''} /><R k2="Expected Price" v={`₹${Number(form.plotDetails.expectedPrice || 0).toLocaleString()}`} /></> : null}
            {isPg ? <><R k2="PG Type" v={form.pgType} /><R k2="Min Stay" v={form.minStay} /><R k2="Notice Period" v={form.noticePeriod} /></> : null}
            {form.contactNumber ? <R k2="Contact" v={form.contactNumber} /> : null}
            <R k2="Amenities" v={form.amenities.length ? `${form.amenities.length} selected` : ''} />
            <R k2="Photos" v={`${(form.coverImage ? 1 : 0) + form.propertyImages.length}`} />
            {rooms.length ? <R k2={isPg ? 'Inventory types' : 'Room types'} v={rooms.length} /> : null}
            {!isRent ? <R k2="Documents" v={`${form.documents.filter((d) => d.fileUrl).length}/${form.documents.length} uploaded`} /> : null}
          </View>
        </View>
      );
    }
    return null;
  };

  if (!booted) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator size="large" color={P} /></View>;

  if (done) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Web: w-20 h-20 bg-emerald-100 text-emerald-600 (brand-blue palette) */}
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.emerald100, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><CheckCircle size={48} color={colors.emerald600} /></View>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.gray900, marginBottom: 8, textAlign: 'center' }}>Registration Submitted!</Text>
      <Text style={{ fontSize: 15, color: colors.gray500, textAlign: 'center', marginBottom: 28, maxWidth: 360 }}>Your property registration has been sent for verification. Our team will review it and get back to you shortly.</Text>
      <TouchableOpacity onPress={() => { clearWizardParams(); router.replace('/hotel/properties'); }} style={{ backgroundColor: colors.emerald600, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, shadowColor: colors.emerald600, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Go to My Properties</Text></TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.gray50 }}>
      {/* Web header: h-16 white, border-b gray-100, shadow-sm, "Step x of y" text-sm bold gray-900; progress h-1 gray-200 -> emerald-600 */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64, paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={handleBack} style={{ padding: 8 }}><ArrowLeft size={20} color={colors.gray600} /></TouchableOpacity>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray900 }}>Step {step} of {total}</Text>
          <TouchableOpacity onPress={exit} style={{ padding: 8 }}><X size={20} color={colors.gray600} /></TouchableOpacity>
        </View>
      </View>
      <View style={{ height: 4, backgroundColor: colors.gray200 }}><View style={{ height: 4, width: `${progress}%`, backgroundColor: colors.emerald600 }} /></View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={32} contentContainerStyle={[{ padding: 16, paddingBottom: kbH ? kbH + 48 : 120 + footerPad }, CENTER]} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.gray900, marginBottom: 20 }}>{cur.label}</Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 16 }}>
            {loading && isEdit && !booted ? <ActivityIndicator color={P} /> : renderStep()}
          </View>
        </ScrollView>
        {!subEditing && !kbH ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.97)', padding: 16, paddingBottom: footerPad, borderTopWidth: 1, borderTopColor: colors.gray100, flexDirection: 'row', alignItems: 'stretch', gap: 10 }}>
            {/* Web footer: [Back] [Clear Step] [Continue] */}
            <TouchableOpacity disabled={step === 1 || loading} onPress={handleBack} style={{ paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, justifyContent: 'center', opacity: step === 1 || loading ? 0.5 : 1 }}><Text style={{ fontWeight: '700', color: colors.gray700 }}>Back</Text></TouchableOpacity>
            {cur.key !== 'docs' && cur.key !== 'review' ? <TouchableOpacity disabled={loading} onPress={() => { Alert.alert('Clear step', 'Clear all fields in this step?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => {
              const k = cur.key;
              if (k === 'basic') setForm((p) => ({ ...p, propertyName: '', description: '', shortDescription: '', contactNumber: '', minStay: '', noticePeriod: '' }));
              else if (k === 'location') { update('address', { state: '', city: '', fullAddress: '', pincode: '' }); update(['location', 'coordinates'], ['', '']); }
              else if (k === 'amenities') update('amenities', []);
              else if (k === 'nearby') update('nearbyPlaces', []);
              else if (k === 'images') setForm((p) => ({ ...p, coverImage: '', propertyImages: [] }));
              else if (k === 'rooms') setRooms([]);
              else if (k === 'rules') setForm((p) => ({ ...p, checkInTime: '', checkOutTime: '', cancellationPolicy: '', houseRules: [] }));
              else if (k === 'docs') update('documents', form.documents.map((d) => ({ ...d, fileUrl: '' })));
            } }]); }} style={{ paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.red100, justifyContent: 'center' }}><Text style={{ fontSize: 13, fontWeight: '700', color: colors.red600 }}>Clear Step</Text></TouchableOpacity> : null}
            <TouchableOpacity disabled={loading || !!uploading || (cur.key === 'rooms' && rooms.length === 0)} onPress={next} style={{ flex: 1, backgroundColor: colors.emerald600, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: loading || uploading || (cur.key === 'rooms' && rooms.length === 0) ? 0.5 : 1, shadowColor: colors.emerald600, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5 }}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : null}<Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{cur.key === 'review' ? (loading ? 'Submitting...' : 'Submit Property') : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
