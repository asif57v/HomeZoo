import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import * as Icons from 'lucide-react-native';
import { Search, Menu, Wallet, X, MapPin, Navigation } from 'lucide-react-native';
import { Text, Input } from '../ui';
import MobileMenu from '../MobileMenu';
import walletService from '../../services/walletService';
import { fetchIndianPlaces, rankLocations, MASTER_LOCATIONS } from '../../utils/placeSuggestions';
import { setStoredLocation, reverseGeocode, getCurrentCoords } from '../../utils/userLocation';
import { storage } from '../../lib/storage';
import toast from '../../store/toastStore';
import { inr } from '../../utils/format';

const PLACEHOLDERS = ['Search in Bucharest...', 'Find luxury hotels...', 'Book villas in Bali...', 'Couple friendly stays...', 'Search near Red Square...'];

export default function HeroSection({ theme, selectedType }) {
  const accent = theme?.accent || '#3b93d6';
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const [balance, setBalance] = useState(0);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [location, setLocation] = useState(() => storage.getItem('user_location') || 'Indore');
  const [locating, setLocating] = useState(false);

  // Autocomplete (India-only)
  useEffect(() => {
    const q = query?.trim();
    if (!q || q.length < 2) { setLiveSuggestions([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const places = await fetchIndianPlaces(q);
      if (!cancelled) setLiveSuggestions(places);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  // Auto-detect live location on open (GPS; permission requested on first use)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocating(true);
      try {
        const { lat, lng } = await getCurrentCoords();
        const detected = await reverseGeocode(lat, lng);
        if (cancelled) return;
        const label = detected || storage.getItem('user_location') || 'Indore';
        setLocation(label);
        setStoredLocation(label, { lat, lng });
      } catch { /* permission denied / unavailable: keep last location */ } finally { if (!cancelled) setLocating(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!storage.getItem('token')) return;
        const w = await walletService.getWallet();
        if (w.success && w.wallet) setBalance(w.wallet.balance);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPhIdx((p) => (p + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const go = (override) => {
    const term = override !== undefined ? override : (query.trim() || location);
    const params = {};
    if (term) params.search = term;
    if (selectedType && selectedType.id && selectedType.label !== 'All') params.type = selectedType.id;
    router.push({ pathname: '/search', params });
    setFocused(false);
    Keyboard.dismiss();
  };

  const detect = async (goToSearch = true) => {
    setLocating(true);
    try {
      const { lat, lng } = await getCurrentCoords();
      const detected = await reverseGeocode(lat, lng);
      if (detected) {
        setLocation(detected);
        setStoredLocation(detected, { lat, lng });
        if (!goToSearch) return;
        const params = { search: detected.split(',').pop().trim() };
        if (selectedType && selectedType.id && selectedType.label !== 'All') params.type = selectedType.id;
        router.push({ pathname: '/search', params });
        setFocused(false);
      } else if (goToSearch) {
        router.push({ pathname: '/search', params: { lat: String(lat), lng: String(lng) } });
        setFocused(false);
      }
    } catch {
      toast.error('Unable to retrieve your location. Please allow location access.');
    } finally { setLocating(false); }
  };

  const suggestions = rankLocations(query, { curated: MASTER_LOCATIONS, live: liveSuggestions });
  const balanceText = inr(balance);

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6, gap: 10, zIndex: 50 }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(220,238,249,0.2)', borderWidth: 1, borderColor: 'rgba(220,238,249,0.3)' }}>
          <Menu size={16} color="#f0f7fd" />
        </TouchableOpacity>
        <View style={{ marginLeft: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>HOOM<Text style={{ fontSize: 20, fontWeight: '900', color: accent }}>ZO</Text></Text>
          <View style={{ height: 2.5, width: 24, borderRadius: 2, backgroundColor: accent }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={() => detect(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
            {locating ? <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.6 }] }} /> : <MapPin size={12} color="#fff" />}
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: '#fff', flexShrink: 1 }}>{locating ? 'Locating...' : location}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/wallet')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(96,174,227,0.2)', borderWidth: 1, borderColor: 'rgba(110,231,183,0.25)' }}>
          <View style={{ width: 20, height: 20, backgroundColor: '#60aee3', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}><Wallet size={11} color="#fff" /></View>
          <View>
            <Text style={{ fontSize: 7.5, fontWeight: '700', color: 'rgba(253,230,138,0.9)', letterSpacing: 0.8 }}>WALLET</Text>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{balanceText}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={{ zIndex: 50, marginTop: 8 }}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, borderBottomLeftRadius: focused ? 0 : 12, borderBottomRightRadius: focused ? 0 : 12, paddingLeft: 10, paddingRight: 6, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', elevation: 6 }}>
          <Search size={16} color={accent} />
          <View style={{ flex: 1, justifyContent: 'center', height: '100%' }}>
            <Input value={query} onChangeText={(v) => { setQuery(v); setFocused(true); }} onFocus={() => setFocused(true)} onSubmitEditing={() => go()} returnKeyType="search" style={{ fontSize: 12, paddingRight: 20 }} />
            {!query ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 8 }}><Text numberOfLines={1} style={{ fontSize: 12, color: colors400 }}>{selectedType?.label === 'Plot' ? 'Search locality, project or builder...' : PLACEHOLDERS[phIdx]}</Text></View> : null}
            {query ? <TouchableOpacity onPress={() => setQuery('')} style={{ position: 'absolute', right: 2 }}><X size={14} color="#9CA3AF" /></TouchableOpacity> : null}
          </View>
          <TouchableOpacity onPress={() => go()} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(243,244,246,0.7)' }}>
            <Icons.SlidersHorizontal size={15} color={accent} />
          </TouchableOpacity>
        </View>
        {focused ? (
          <View style={{ position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderWidth: 1, borderTopWidth: 0, borderColor: '#F3F4F6', maxHeight: 360, elevation: 12, overflow: 'hidden' }}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, paddingHorizontal: 8, paddingTop: 8 }}>Locations & Suggestions:</Text>
              <TouchableOpacity onPress={() => detect(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                {locating ? <ActivityIndicator size="small" color="#3b93d6" /> : <Navigation size={20} color="#3b93d6" />}
                <View>
                  <Text style={{ fontWeight: '700', color: '#005CA8', fontSize: 14 }}>{locating ? 'Detecting location...' : 'Use current location'}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(96,174,227,0.8)', letterSpacing: 1 }}>USING GPS</Text>
                </View>
              </TouchableOpacity>
              {suggestions.length > 0 ? suggestions.map((loc, i) => (
                <TouchableOpacity key={i} onPress={() => { setLocation(loc); setQuery(loc); setStoredLocation(loc, null); go(loc); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                  <MapPin size={20} color="#9CA3AF" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#1F2937', fontSize: 14 }}>{loc}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 }}>LOCALITY / CITY</Text>
                  </View>
                </TouchableOpacity>
              )) : <Text style={{ padding: 16, textAlign: 'center', fontSize: 12, fontWeight: '500', color: '#9CA3AF' }}>No matching location found</Text>}
            </ScrollView>
          </View>
        ) : null}
      </View>
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}
const colors400 = '#9CA3AF';
