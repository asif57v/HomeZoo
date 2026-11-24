import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Keyboard, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Search, Filter, Navigation, X } from 'lucide-react-native';
import { Text, Input, Sheet, Chip } from '../src/components/ui';
import PropertyCard from '../src/components/PropertyCard';
import ResponsiveGrid from '../src/components/ResponsiveGrid';
import PropertyTypeFilter from '../src/components/home/PropertyTypeFilter';
import { propertyService } from '../src/services/propertyService';
import { userService, api } from '../src/services/apiService';
import { fetchIndianPlaces, rankLocations, MASTER_LOCATIONS } from '../src/utils/placeSuggestions';
import { getCurrentCoords } from '../src/utils/userLocation';
import { storage } from '../src/lib/storage';
import toast from '../src/store/toastStore';
import { colors } from '../src/theme';
import { CENTER_WIDE } from '../src/lib/responsive';

const asList = (v) => (v ? String(v).split(',') : []);

// Map backend query params back to the UI labels (same mapping as web SearchPage)
const initialFilters = (p) => {
  const ams = asList(p.amenities);
  if (p.foodIncluded === 'true') ams.push('Food');
  asList(p.bhkType).forEach((v) => { if (v === '1BHK') ams.push('1 BHK'); else if (v === '2BHK') ams.push('2 BHK'); else if (v === '3BHK') ams.push('3 BHK'); else if (v === 'Villa') ams.push('Villa'); else if (v === 'Studio') ams.push('Studio'); });
  asList(p.furnishing).forEach((v) => { if (v === 'Fully') ams.push('Fully Furnished'); else if (v === 'Semi') ams.push('Semi Furnished'); else if (v === 'Unfurnished') ams.push('Unfurnished'); });
  asList(p.gender).forEach((v) => { if (v === 'Boys') ams.push('Boys Only'); else if (v === 'Girls') ams.push('Girls Only'); else if (v === 'Co-ed') ams.push('Coliving'); });
  asList(p.occupancy).forEach((v) => { if (v === 'Single') ams.push('Single Occupancy'); else if (v === 'Double') ams.push('Double Occupancy'); else if (v === 'Triple') ams.push('Triple Occupancy'); });
  asList(p.landType).forEach((v) => ams.push(v));
  return {
    search: p.search || '', type: p.type ? (p.type === 'all' ? 'all' : String(p.type).split(',')) : 'all',
    minPrice: p.minPrice || '', maxPrice: p.maxPrice || '', sort: p.sort || 'newest', amenities: [...new Set(ams)],
    radius: parseInt(p.radius) || 50, foodIncluded: p.foodIncluded === 'true',
  };
};

const SORTS = [{ label: 'Newest', value: 'newest' }, { label: 'Price: Low to High', value: 'price_low' }, { label: 'Price: High to Low', value: 'price_high' }, { label: 'Top Rated', value: 'rating' }];

export default function SearchPage() {
  const router = useRouter();
  const routeParams = useLocalSearchParams();
  const [applied, setApplied] = useState(() => {
    const o = {}; Object.entries(routeParams).forEach(([k, v]) => { if (v !== undefined && v !== '') o[k] = Array.isArray(v) ? v.join(',') : String(v); }); return o;
  });
  const [filters, setFilters] = useState(() => initialFilters(applied));
  const [properties, setProperties] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [focused, setFocused] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState([]);
  const [location, setLocation] = useState(null);
  const [types, setTypes] = useState([{ id: 'all', label: 'All' }, { id: 'pg', label: 'PG' }, { id: 'rent', label: 'Rent' }, { id: 'buy', label: 'Buy' }, { id: 'plot', label: 'Plot' }]);
  const [showSort, setShowSort] = useState(false);

  useEffect(() => { setFilters(initialFilters(applied)); }, [applied]);

  useEffect(() => {
    api.get('/categories/active').then((res) => {
      const cats = res.data; if (!cats) return;
      const findId = (names) => { const list = Array.isArray(names) ? names : [names]; const f = cats.find((c) => list.some((n) => (c.displayName || '').toLowerCase() === n.toLowerCase() || (c.name || '').toLowerCase() === n.toLowerCase())); return f ? f._id : null; };
      setTypes([{ id: 'all', label: 'All' }, { id: findId(['pg', 'hostel', 'pg/co-living', 'co-living', 'paying guest']) || 'pg', label: 'PG' }, { id: findId('rent') || 'rent', label: 'Rent' }, { id: findId('buy') || 'buy', label: 'Buy' }, { id: findId(['plot', 'plots']) || 'plot', label: 'Plot' }]);
    }).catch(() => {});
  }, []);

  // Autocomplete
  useEffect(() => {
    const q = filters.search?.trim();
    if (!q || q.length < 2) { setApiSuggestions([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => { const p = await fetchIndianPlaces(q); if (!cancelled) setApiSuggestions(p); }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [filters.search]);

  const fetchProperties = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const params = { ...applied };
      if (location) { params.lat = location.lat; params.lng = location.lng; params.radius = filters.radius; }
      const promises = [propertyService.getPublicProperties(params)];
      if (storage.getItem('token')) promises.push(userService.getSavedHotels());
      const [res, savedRes] = await Promise.all(promises);
      if (savedRes) setSavedIds((savedRes.savedHotels || []).map((h) => (typeof h === 'object' ? h._id : h)));
      if (Array.isArray(res)) setProperties(res);
      else if (res.success && Array.isArray(res.properties)) setProperties(res.properties);
      else setProperties([]);
    } catch { toast.error('Failed to load properties'); } finally { setLoading(false); setRefreshing(false); }
  }, [applied, location]);
  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const updateFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const getAmenitiesOptions = () => {
    const cur = Array.isArray(filters.type) ? filters.type[0] : filters.type;
    if (!cur || cur === 'all') return ['Wi-Fi', 'AC', 'Parking', 'Kitchen', 'Geyser', 'Power Backup'];
    const label = (types.find((t) => t.id === cur)?.label || '').toLowerCase();
    if (label.includes('pg') || label.includes('hostel')) return ['Boys Only', 'Girls Only', 'Coliving', 'Single Occupancy', 'Double Occupancy', 'Triple Occupancy', 'Wi-Fi', 'AC', 'Food', 'Laundry', 'Housekeeping', 'CCTV', 'Security', 'RO Water', 'Gym', 'Lift', 'Power Backup', 'Geyser', 'Fridge', 'Parking', 'TV', 'Kitchen'];
    if (label.includes('rent')) return ['1 BHK', '2 BHK', '3 BHK', 'Villa', 'Studio', 'Fully Furnished', 'Semi Furnished', 'Unfurnished', 'Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV', 'Comfort Amenities', 'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning'];
    if (label.includes('buy')) return ['Apartment', 'Villa', 'Independent House', 'Ready to Move', 'Under Construction', 'East Facing', 'West Facing', 'North Facing', 'South Facing', 'Lift', 'Parking', 'Power Backup', 'Water Supply', 'Security Guard', 'CCTV', 'Gym', 'Garden', 'Balcony', 'Modular Kitchen', 'Air Conditioning', 'Club House'];
    if (label.includes('plot')) return ['Residential', 'Commercial', 'Agricultural', 'Industrial', 'East Facing', 'West Facing', 'North Facing', 'South Facing', 'Boundary Wall', 'Gated Community', 'Red Soil', 'Black Soil', 'Electricity Available', 'Water Source'];
    return ['Wi-Fi', 'AC', 'Parking', 'Kitchen', 'Geyser', 'Power Backup'];
  };

  const buildParams = (f) => {
    const params = {};
    if (f.search) params.search = f.search;
    if (f.type) { if (Array.isArray(f.type)) { if (f.type.length > 0) params.type = f.type.join(','); } else if (f.type !== 'all') params.type = f.type; }
    if (f.minPrice) params.minPrice = f.minPrice;
    if (f.maxPrice) params.maxPrice = f.maxPrice;
    if (f.sort) params.sort = f.sort;
    const fin = [], bhks = [], furn = [], genders = [], occ = [], land = [];
    f.amenities.forEach((am) => {
      if (am === '1 BHK') bhks.push('1BHK'); else if (am === '2 BHK') bhks.push('2BHK'); else if (am === '3 BHK') bhks.push('3BHK');
      else if (am === 'Villa') bhks.push('Villa'); else if (am === 'Studio') bhks.push('Studio');
      else if (am === 'Fully Furnished') furn.push('Fully'); else if (am === 'Semi Furnished') furn.push('Semi'); else if (am === 'Unfurnished') furn.push('Unfurnished');
      else if (am === 'Boys Only') genders.push('Boys'); else if (am === 'Girls Only') genders.push('Girls'); else if (am === 'Coliving') genders.push('Co-ed');
      else if (am === 'Single Occupancy') occ.push('Single'); else if (am === 'Double Occupancy') occ.push('Double'); else if (am === 'Triple Occupancy') occ.push('Triple');
      else if (am === 'Residential' && f.type !== 'all' && /plot|sell/.test(String(f.type).toLowerCase())) land.push('Residential');
      else if (am === 'Commercial') land.push('Commercial'); else if (am === 'Agricultural') land.push('Agricultural'); else if (am === 'Industrial') land.push('Industrial');
      else if (am === 'Food') params.foodIncluded = 'true';
      else fin.push(am);
    });
    if (fin.length) params.amenities = fin.join(',');
    if (bhks.length) params.bhkType = bhks.join(',');
    if (furn.length) params.furnishing = furn.join(',');
    if (genders.length) params.gender = genders.join(',');
    if (occ.length) params.occupancy = occ.join(',');
    if (land.length) params.landType = land.join(',');
    return params;
  };
  const applyFilters = () => { setApplied(buildParams(filters)); setShowFilters(false); };

  const handleNearMe = async () => {
    try {
      toast('Getting location...');
      const loc = await getCurrentCoords();
      toast.success('Location found!');
      setLocation(loc); updateFilter('sort', 'distance'); setApplied((p) => ({ ...p, sort: 'distance' }));
    } catch { toast.error('Could not get location. Please enable permissions.'); }
  };

  const listingSuggestions = properties.map((p) => [p.address?.area || p.address?.street || '', p.city || p.address?.city || ''].filter(Boolean).join(', ')).filter(Boolean);
  const suggestions = rankLocations(filters.search, { listings: listingSuggestions, curated: MASTER_LOCATIONS, live: apiSuggestions });
  const hasFilter = filters.minPrice || filters.maxPrice || (Array.isArray(filters.type) && filters.type.length > 0) || filters.amenities.length > 0;
  const currentTypeId = Array.isArray(filters.type) ? filters.type[0] : filters.type;

  const selectTab = (type) => {
    const newType = type === 'All' || type === null ? 'all' : type;
    const next = { ...filters, type: newType, amenities: [] };
    setFilters(next);
    const p = { ...applied }; if (newType === 'all') delete p.type; else p.type = newType; delete p.amenities;
    setApplied(p);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100, paddingHorizontal: 16, paddingBottom: 6, elevation: 2, zIndex: 20 }}>
        <View style={{ gap: 12, marginBottom: 8, paddingTop: 10 }}>
          <View style={{ zIndex: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243,244,246,0.3)', borderWidth: 1, borderColor: colors.gray300, borderRadius: 12, paddingHorizontal: 12, gap: 8 }}>
              <Search size={18} color={colors.gray500} />
              <Input value={filters.search} onChangeText={(v) => { updateFilter('search', v); setFocused(true); }} onFocus={() => setFocused(true)} onSubmitEditing={() => { setFocused(false); Keyboard.dismiss(); applyFilters(); }} returnKeyType="search" placeholder="Search by city, hotel, or area..." style={{ flex: 1, paddingVertical: 8, fontSize: 14 }} />
              {filters.search ? <TouchableOpacity onPress={() => { updateFilter('search', ''); setFocused(true); }}><X size={16} color={colors.gray400} /></TouchableOpacity> : null}
            </View>
            {focused ? (
              <View style={{ position: 'absolute', top: 46, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 16, maxHeight: 320, elevation: 12, overflow: 'hidden' }}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <TouchableOpacity onPress={() => { setFocused(false); handleNearMe(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.emerald100 || '#dceef9', alignItems: 'center', justifyContent: 'center' }}><Navigation size={15} color={colors.emerald600} /></View>
                    <View><Text style={{ fontWeight: '700', color: colors.emerald700, fontSize: 12 }}>Use current location</Text><Text style={{ fontSize: 10, fontWeight: '600', color: '#3b93d6' }}>Using GPS</Text></View>
                  </TouchableOpacity>
                  <Text style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: 'rgba(249,250,251,0.8)', fontSize: 10, fontWeight: '700', color: colors.gray400 }}>Location Suggestions</Text>
                  {suggestions.length > 0 ? suggestions.map((loc, i) => (
                    <TouchableOpacity key={i} onPress={() => { updateFilter('search', loc); setFocused(false); Keyboard.dismiss(); setApplied((p) => ({ ...p, search: loc })); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.gray50 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }}><MapPin size={15} color={colors.gray500} /></View>
                      <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: colors.gray800, fontSize: 12 }}>{loc}</Text><Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '500' }}>Locality / City</Text></View>
                    </TouchableOpacity>
                  )) : <Text style={{ padding: 16, textAlign: 'center', fontSize: 12, color: colors.gray400, fontWeight: '500' }}>No matching location found</Text>}
                </ScrollView>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[[Navigation, location ? 'Nearby' : 'Near Me', !!location, handleNearMe], [Filter, 'Filters', !!hasFilter, () => setShowFilters(true)]].map(([Icon, label, on, act]) => (
              <TouchableOpacity key={label} onPress={act} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: on ? colors.surface : colors.gray300, backgroundColor: on ? 'rgba(0,92,168,0.05)' : '#fff' }}>
                <Icon size={14} color={on ? colors.surface : colors.gray600} fill={label === 'Nearby' ? colors.surface : 'transparent'} /><Text style={{ fontSize: 11, fontWeight: '700', color: on ? colors.surface : colors.gray600 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {location ? (
          <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.gray100 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MapPin size={12} color={colors.gray500} /><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500 }}>Search Radius</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {[10, 25, 50, 100].map((r) => <TouchableOpacity key={r} onPress={() => updateFilter('radius', r)} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: filters.radius === r ? colors.surface : 'rgba(0,92,168,0.1)' }}><Text style={{ fontSize: 11, fontWeight: '700', color: filters.radius === r ? '#fff' : colors.surface }}>{r} km</Text></TouchableOpacity>)}
              </View>
            </View>
          </View>
        ) : null}
        <PropertyTypeFilter variant="light" selectedType={currentTypeId} onSelectType={(id, label) => selectTab(label === 'All' ? 'all' : id)} />
      </View>

      <ScrollView contentContainerStyle={[{ padding: 16, gap: 20, paddingBottom: 24, flexGrow: 1 }, CENTER_WIDE]} keyboardShouldPersistTaps="handled" onScrollBeginDrag={() => setFocused(false)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProperties(true); }} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray800 }}>{properties.length} properties found</Text>
          <TouchableOpacity onPress={() => setShowSort(true)}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500 }}>Sort by {(SORTS.find((s) => s.value === filters.sort) || SORTS[0]).label} ▾</Text></TouchableOpacity>
        </View>
        {loading ? <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator size="large" color={colors.surface} /></View>
        : properties.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <View style={{ backgroundColor: colors.gray50, padding: 24, borderRadius: 999, marginBottom: 24 }}><Search size={40} color={colors.gray300} /></View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray800, marginBottom: 8 }}>No properties found</Text>
            <Text style={{ fontSize: 14, color: colors.gray500, textAlign: 'center' }}>Try changing your search or filters to find what you're looking for.</Text>
            <TouchableOpacity onPress={() => { setFilters({ search: '', type: 'all', minPrice: '', maxPrice: '', sort: 'newest', amenities: [], radius: 50 }); setLocation(null); setApplied({}); }} style={{ marginTop: 32 }}><Text style={{ fontSize: 14, fontWeight: '700', color: colors.surface }}>Clear all filters</Text></TouchableOpacity>
          </View>
        ) : <ResponsiveGrid gap={20}>{properties.map((p) => <PropertyCard key={p._id} property={p} isSaved={savedIds.includes(p._id)} />)}</ResponsiveGrid>}
      </ScrollView>

      <Sheet visible={showSort} onClose={() => setShowSort(false)} title="Sort by">
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          {SORTS.map((s) => <TouchableOpacity key={s.value} onPress={() => { updateFilter('sort', s.value); setApplied((p) => ({ ...p, sort: s.value })); setShowSort(false); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray50 }}><Text style={{ fontSize: 15, fontWeight: filters.sort === s.value ? '700' : '500', color: filters.sort === s.value ? colors.surface : colors.gray700 }}>{s.label}</Text></TouchableOpacity>)}
        </View>
      </Sheet>

      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} title="Filters" maxHeight="90%">
        <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={[{ paddingBottom: 12, gap: 20 }, CENTER_WIDE]} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500, marginBottom: 8 }}>Property Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {types.map((t) => {
                const on = t.id === 'all' ? filters.type === 'all' : (Array.isArray(filters.type) ? filters.type.includes(t.id) : filters.type === t.id);
                return <Chip key={t.label} label={t.label} active={on} onPress={() => setFilters((p) => ({ ...p, type: t.id === 'all' ? 'all' : t.id, amenities: [] }))} />;
              })}
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500, marginBottom: 8 }}>Price Range</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {['minPrice', 'maxPrice'].map((k, i) => (
                <React.Fragment key={k}>
                  {i ? <Text style={{ color: colors.gray300, fontWeight: '700' }}>-</Text> : null}
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.gray50, borderRadius: 8, paddingHorizontal: 8, gap: 4 }}>
                    <Text style={{ color: colors.gray400, fontSize: 10 }}>₹</Text>
                    <Input value={String(filters[k])} onChangeText={(v) => updateFilter(k, v.replace(/[^0-9]/g, ''))} placeholder={i ? 'Max' : 'Min'} keyboardType="number-pad" style={{ flex: 1, paddingVertical: 6, fontSize: 12 }} />
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500, marginBottom: 8 }}>Amenities & Features</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {getAmenitiesOptions().map((a) => {
                const on = filters.amenities.includes(a);
                return <TouchableOpacity key={a} onPress={() => updateFilter('amenities', on ? filters.amenities.filter((x) => x !== a) : [...filters.amenities, a])} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.surface : colors.gray200, backgroundColor: on ? 'rgba(0,92,168,0.1)' : '#fff' }}><Text style={{ fontSize: 10, fontWeight: '700', color: on ? colors.surface : colors.gray500 }}>{a}</Text></TouchableOpacity>;
              })}
            </View>
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8 }}>
          <TouchableOpacity onPress={() => { const nf = { ...filters, type: 'all', minPrice: '', maxPrice: '', amenities: [] }; setFilters(nf); const p = {}; if (filters.search) p.search = filters.search; if (filters.sort) p.sort = filters.sort; setApplied(p); }} style={{ paddingHorizontal: 20, justifyContent: 'center' }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.red500 }}>Clear</Text></TouchableOpacity>
          <TouchableOpacity onPress={applyFilters} style={{ flex: 1, backgroundColor: colors.surface, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Apply Filters</Text></TouchableOpacity>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
