import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Search, MapPin, Plus, Trash2, Loader2, Camera, CheckCircle, FileText, AlertCircle, Navigation, X } from 'lucide-react-native';
import { Text, Input } from '../../ui';
import { colors } from '../../../theme';
import { hotelService } from '../../../services/apiService';
import { searchPlaceResults, withoutCountryOnly, parseSuggestionAddress } from '../../../utils/placeSuggestions';
import { getCurrentCoords } from '../../../utils/userLocation';
import { pickImages } from '../../../lib/imagePicker';
import { errMsg } from '../../../utils/format';

export const P = '#005CA8';

// Web: <div className="text-red-600 text-sm mb-3">{error}</div>
export const ErrorBanner = ({ error }) => (error ? (
  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 12 }}>
    <AlertCircle size={16} color={colors.red600} style={{ marginTop: 2 }} /><Text style={{ flex: 1, fontSize: 14, color: colors.red600 }}>{error}</Text>
  </View>
) : null);

// Web: text-xs font-semibold text-gray-500 mb-1
export const Label = ({ children }) => <Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray500, marginBottom: 4, marginTop: 12 }}>{children}</Text>;

// Web .input: px-4 py-3 rounded-xl border-2 border-gray-200 bg-white font-medium shadow-sm (focus -> brand border)
export const TInput = ({ value, onChange, placeholder, keyboardType, multiline, prefix, suffix, maxLength, autoCapitalize }) => {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: 6, borderWidth: 2, borderColor: focus ? P : colors.gray200, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: multiline ? 6 : 0, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
      {prefix ? <Text style={{ color: colors.gray500 }}>{prefix}</Text> : null}
      <Input value={value === undefined || value === null ? '' : String(value)} onChangeText={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder} placeholderTextColor={colors.gray400} keyboardType={keyboardType} multiline={multiline} maxLength={maxLength} autoCapitalize={autoCapitalize} style={{ flex: 1, paddingVertical: 12, fontWeight: '500', color: colors.gray900, minHeight: multiline ? 96 : undefined, textAlignVertical: multiline ? 'top' : 'center' }} />
      {suffix ? <Text style={{ color: colors.gray500, fontSize: 12 }}>{suffix}</Text> : null}
    </View>
  );
};

// Replaces <select>: horizontal wrap of option chips
export const Choice = ({ options, value, onChange, allowClear }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map((o) => {
      const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label;
      const on = value === v;
      return <TouchableOpacity key={v} onPress={() => onChange(allowClear && on ? '' : v)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? P : colors.gray200, backgroundColor: on ? P : '#fff' }}><Text style={{ fontSize: 12, fontWeight: '600', color: on ? '#fff' : colors.gray600 }}>{l}</Text></TouchableOpacity>;
    })}
  </View>
);

export const Check = ({ label, value, onChange }) => (
  <TouchableOpacity onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
    <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: value ? P : colors.gray300, backgroundColor: value ? P : '#fff', alignItems: 'center', justifyContent: 'center' }}>{value ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text> : null}</View>
    <Text style={{ fontSize: 13, color: colors.gray700 }}>{label}</Text>
  </TouchableOpacity>
);

export const YesNo = ({ value, onChange }) => <Choice options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} value={!!value} onChange={onChange} />;

export const Chips = ({ options, selected, onToggle }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map((o) => {
      const name = typeof o === 'string' ? o : o.name || o.label; const on = selected.includes(name);
      return <TouchableOpacity key={name} onPress={() => onToggle(name)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: on ? P : colors.gray200, backgroundColor: on ? colors.blue50 : '#fff' }}>{on ? <CheckCircle size={14} color={P} /> : null}<Text style={{ fontSize: 12, fontWeight: '600', color: on ? P : colors.gray600 }}>{name}</Text></TouchableOpacity>;
    })}
  </View>
);

export const SectionTitle = ({ icon: Icon, children }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>{Icon ? <Icon size={18} color={P} /> : null}<Text style={{ fontSize: 17, fontWeight: '800', color: colors.gray900 }}>{children}</Text></View>;

// ---- image upload (camera/gallery -> hotelService.uploadImages (field "images") -> urls)
export const uploadFiles = async (files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('images', { uri: f.uri, name: f.name, type: f.type }));
  const res = await hotelService.uploadImages(fd);
  if (Array.isArray(res?.urls) && res.urls.length) return res.urls;
  if (Array.isArray(res?.files)) return res.files.map((f) => f.url).filter(Boolean);
  return [];
};
const uploadErr = (err) => {
  let msg = 'Upload failed. Please try again.';
  if (typeof err === 'string') msg = err.includes('<html') ? 'Upload failed: Image file is too large for the server.' : err;
  else if (err?.response?.data?.message) msg = err.response.data.message;
  else if (err?.message) msg = err.message.includes('<html') ? 'Upload failed: Image file is too large for the server.' : err.message;
  if (msg === 'Network Error' || err?.response?.status === 413) msg = 'Upload failed: File size exceeds the server upload limit.';
  return msg;
};

export const useUploader = (setError) => {
  const [uploading, setUploading] = useState(null);
  const run = async (type, multiple, onDone) => {
    const files = await pickImages({ multiple });
    if (!files.length) return;
    try { setUploading(type); setError(''); const urls = await uploadFiles(files); if (!urls.length) throw new Error('Upload failed'); onDone(urls); }
    catch (e) { setError(uploadErr(e)); } finally { setUploading(null); }
  };
  return { uploading, run };
};

export const removeRemoteImage = async (url) => { try { if (url && url.includes('cloudinary.com') && url.includes('rukkoin')) await hotelService.deleteImage(url); } catch {} };

export const ImageSlot = ({ url, uploading, onPick, onRemove, label = 'Upload Cover Image', height = 160 }) => (
  <View>
    <TouchableOpacity activeOpacity={0.85} onPress={onPick} style={{ height, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.gray300, borderRadius: 16, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {uploading ? <><ActivityIndicator color={P} /><Text style={{ fontSize: 12, color: colors.gray500, marginTop: 6 }}>Uploading...</Text></>
        : url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        : <><Camera size={30} color={colors.gray400} /><Text style={{ fontSize: 12, color: colors.gray500, marginTop: 6 }}>{label}</Text></>}
    </TouchableOpacity>
    {url && onRemove ? <TouchableOpacity onPress={onRemove} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Remove</Text></TouchableOpacity> : null}
  </View>
);

export const Gallery = ({ images, uploading, onAdd, onRemove, size = 90 }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {images.map((img, i) => (
      <View key={img + i} style={{ width: size, height: size }}>
        <Image source={{ uri: img }} style={{ width: size, height: size, borderRadius: 12 }} contentFit="cover" />
        <TouchableOpacity onPress={() => onRemove(img, i)} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.65)', padding: 5, borderRadius: 999 }}><Trash2 size={12} color="#fff" /></TouchableOpacity>
      </View>
    ))}
    <TouchableOpacity onPress={onAdd} style={{ width: size, height: size, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50 }}>
      {uploading ? <ActivityIndicator color={P} /> : <Plus size={24} color={colors.gray400} />}
    </TouchableOpacity>
  </View>
);

// ---- Location step (shared)
export const LocationStep = ({ form, update, error, setError }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [locating, setLocating] = useState(false);
  const autoRef = React.useRef(false);

  const fillFromCoords = async (lat, lng) => {
    const res = await hotelService.getAddressFromCoordinates(lat, lng);
    update(['location', 'coordinates'], [String(lng), String(lat)]);
    update('address', { country: res.country || '', state: res.state || '', city: res.city || '', area: res.area || '', fullAddress: res.fullAddress || '', pincode: res.pincode || '' });
  };
  const locateCurrent = async (isAuto = false) => {
    if (!isAuto) setError('');
    setLocating(true);
    try { const { lat, lng } = await getCurrentCoords(); await fillFromCoords(lat, lng); }
    catch (e) { if (!isAuto) setError(/denied/i.test(errMsg(e, '')) ? 'Location permission denied. Please enable it in settings.' : (e?.response?.data?.message || errMsg(e, 'Failed to fetch address from coordinates'))); }
    finally { setLocating(false); }
  };
  useEffect(() => {
    const empty = !form.address.state && !form.address.city && !form.address.fullAddress;
    if (empty && !autoRef.current) { autoRef.current = true; locateCurrent(true); }
  }, []);

  useEffect(() => {
    const t = q.trim();
    if (!t) { setResults([]); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        let r = await searchPlaceResults(t);
        if (!r.length) { const res = await hotelService.searchLocation(t); r = withoutCountryOnly(Array.isArray(res?.results) ? res.results : []).map((x) => ({ description: x.display_name || x.name, lat: x.lat, lng: x.lng })); }
        if (!cancelled) { setResults(r); if (!r.length) setError('No locations found. You can enter the address manually below.'); else setError(''); }
      } catch (e) { if (!cancelled) setError(errMsg(e, 'Failed to search location')); }
    }, 350);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q]);

  const pick = async (place) => {
    try {
      setError('');
      const prefill = parseSuggestionAddress(place.description);
      update('address', { ...prefill, pincode: '' });
      let { lat, lng } = place;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        const res = await hotelService.searchLocation(place.description);
        const first = Array.isArray(res?.results) ? res.results[0] : null; lat = first?.lat; lng = first?.lng;
      }
      if (typeof lat !== 'number' || typeof lng !== 'number') { setError('Could not get exact coordinates for this place. Please verify the address below.'); setResults([]); setQ(''); return; }
      let rev = {};
      try { rev = await hotelService.getAddressFromCoordinates(lat, lng); } catch {}
      update(['location', 'coordinates'], [String(lng), String(lat)]);
      update('address', { country: rev.country || prefill.country, state: rev.state || prefill.state, city: rev.city || prefill.city, area: rev.area || prefill.area, fullAddress: rev.fullAddress || prefill.fullAddress, pincode: rev.pincode || '' });
      setResults([]); setQ('');
    } catch (e) { setError(errMsg(e, 'Failed to use selected location')); }
  };

  return (
    <View>
      <ErrorBanner error={error} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.gray200, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 12 }}>
        <Search size={20} color={P} />
        <Input value={q} onChangeText={setQ} placeholder="Search area, street or landmark..." style={{ flex: 1, paddingVertical: 12 }} />
        {q ? <TouchableOpacity onPress={() => { setQ(''); setResults([]); }}><X size={16} color={colors.gray400} /></TouchableOpacity> : null}
      </View>
      {results.length > 0 ? (
        <View style={{ borderWidth: 1, borderColor: colors.gray100, borderRadius: 12, backgroundColor: '#fff', marginTop: 6, overflow: 'hidden' }}>
          {results.slice(0, 8).map((p, i) => <TouchableOpacity key={i} onPress={() => pick(p)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.gray50, flexDirection: 'row', gap: 8, alignItems: 'center' }}><MapPin size={14} color={colors.gray400} /><Text style={{ flex: 1, fontSize: 13, color: colors.gray700 }}>{p.description}</Text></TouchableOpacity>)}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 }}><View style={{ flex: 1, height: 1, backgroundColor: colors.gray100 }} /><Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray400 }}>OR ENTER MANUALLY</Text><View style={{ flex: 1, height: 1, backgroundColor: colors.gray100 }} /></View>
      <Label>State/Province</Label><TInput value={form.address.state} onChange={(v) => update(['address', 'state'], v)} placeholder="State/Province" />
      <Label>City</Label><TInput value={form.address.city} onChange={(v) => update(['address', 'city'], v)} placeholder="City" />
      <Label>Full Street Address</Label><TInput value={form.address.fullAddress} onChange={(v) => update(['address', 'fullAddress'], v)} placeholder="House/Flat No, Building Name..." multiline />
      <TouchableOpacity disabled={locating} onPress={() => locateCurrent(false)} style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blue50, borderWidth: 1, borderColor: colors.partnerBorder, paddingVertical: 14, borderRadius: 14 }}>
        {locating ? <ActivityIndicator color={P} /> : <Navigation size={20} color={P} />}<Text style={{ fontWeight: '700', color: P }}>{locating ? 'Fetching Location...' : 'Use Current Location'}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ---- Nearby places step
export const NearbyStep = ({ form, update, error, setError }) => {
  const [editIdx, setEditIdx] = useState(null);
  const [temp, setTemp] = useState({ name: '', type: 'tourist', distanceKm: '' });
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const TYPES = [{ value: 'tourist', label: 'Tourist' }, { value: 'airport', label: 'Airport' }, { value: 'market', label: 'Market' }, { value: 'railway', label: 'Railway' }, { value: 'bus_stop', label: 'Bus Stop' }, { value: 'hospital', label: 'Hospital' }, { value: 'restaurant', label: 'Restaurant' }, { value: 'other', label: 'Other' }];
  const search = async () => {
    try { setError(''); if (!q.trim()) { setResults([]); return; } const res = await hotelService.searchLocation(q.trim()); setResults(Array.isArray(res?.results) ? res.results : []); } catch { setError('Failed to search places'); }
  };
  const selectPlace = async (place) => {
    try {
      const oLat = Number(form.location.coordinates[1] || 0); const oLng = Number(form.location.coordinates[0] || 0);
      let km = '';
      if (oLat && oLng && place.lat && place.lng) { const d = await hotelService.calculateDistance(oLat, oLng, place.lat, place.lng); km = d?.distanceKm ? String(d.distanceKm) : ''; }
      setTemp((p) => ({ ...p, name: place.name || '', distanceKm: km })); setResults([]); setQ('');
    } catch { setTemp((p) => ({ ...p, name: place.name || '' })); }
  };
  const save = () => {
    if (!temp.name || !temp.distanceKm) { setError('Name and Distance are required'); return; }
    const arr = [...form.nearbyPlaces]; if (editIdx === -1) arr.push(temp); else arr[editIdx] = temp;
    update('nearbyPlaces', arr); setEditIdx(null); setError('');
  };
  return (
    <View>
      <ErrorBanner error={error} />
      {editIdx === null ? (<>
        {form.nearbyPlaces.map((pl, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100, borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <MapPin size={18} color={P} />
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.gray900 }}>{pl.name}</Text><Text style={{ fontSize: 11, color: colors.gray500 }}>{pl.type} • {pl.distanceKm} km</Text></View>
            <TouchableOpacity onPress={() => { setError(''); setEditIdx(i); setTemp({ ...pl }); }} style={{ padding: 6 }}><FileText size={18} color={colors.gray500} /></TouchableOpacity>
            <TouchableOpacity onPress={() => update('nearbyPlaces', form.nearbyPlaces.filter((_, k) => k !== i))} style={{ padding: 6 }}><Trash2 size={18} color={colors.red500} /></TouchableOpacity>
          </View>
        ))}
        {form.nearbyPlaces.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: 28 }}><MapPin size={24} color={colors.gray300} /><Text style={{ fontWeight: '700', color: colors.gray500, marginTop: 6 }}>No nearby places added yet</Text><Text style={{ fontSize: 12, color: colors.gray400 }}>Add tourist spots, transport hubs, etc.</Text></View> : null}
        <TouchableOpacity onPress={() => { if (form.nearbyPlaces.length >= 5) { setError('Maximum 5 nearby places allowed'); return; } setError(''); setEditIdx(-1); setTemp({ name: '', type: 'tourist', distanceKm: '' }); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.partnerBorder, borderRadius: 14, paddingVertical: 14, marginTop: 4 }}><Plus size={20} color={P} /><Text style={{ fontWeight: '700', color: P }}>Add Nearby Place</Text></TouchableOpacity>
      </>) : (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', color: colors.gray900 }}>{editIdx === -1 ? 'Add New Place' : 'Edit Place'}</Text><TouchableOpacity onPress={() => { setEditIdx(null); setError(''); }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500 }}>Close</Text></TouchableOpacity></View>
          <Label>Search Place</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><TInput value={q} onChange={setQ} placeholder="Type to search..." /></View><TouchableOpacity onPress={search} style={{ backgroundColor: P, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Search</Text></TouchableOpacity></View>
          {results.slice(0, 6).map((p, i) => <TouchableOpacity key={i} onPress={() => selectPlace(p)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray50 }}><Text style={{ fontSize: 13, fontWeight: '600' }}>{p.name}</Text><Text numberOfLines={1} style={{ fontSize: 11, color: colors.gray400 }}>{p.display_name}</Text></TouchableOpacity>)}
          <Label>Name</Label><TInput value={temp.name} onChange={(v) => setTemp({ ...temp, name: v })} placeholder="Place name" />
          <Label>Type</Label><Choice options={TYPES} value={temp.type} onChange={(v) => setTemp({ ...temp, type: v })} />
          <Label>Distance (km)</Label><TInput value={temp.distanceKm} onChange={(v) => setTemp({ ...temp, distanceKm: v })} keyboardType="decimal-pad" placeholder="0" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={() => { setEditIdx(null); setError(''); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.gray100, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: colors.gray700 }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={save} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}><Text style={{ fontWeight: '700', color: '#fff' }}>Save Place</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ---- Documents step (images / pdf -> upload)
export const DocsStep = ({ form, update, error, setError }) => {
  const { uploading, run } = useUploader(setError);
  return (
    <View>
      <ErrorBanner error={error} />
      <Text style={{ fontSize: 13, color: colors.gray500, marginBottom: 10 }}>Please provide the following documents</Text>
      {form.documents.map((doc, idx) => (
        <View key={doc.type + idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.gray100, padding: 12, marginBottom: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: doc.fileUrl ? colors.green50 : colors.gray100, alignItems: 'center', justifyContent: 'center' }}>{doc.fileUrl ? <CheckCircle size={18} color={colors.green600} /> : <FileText size={18} color={colors.gray400} />}</View>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.gray900, fontSize: 13 }}>{doc.name}</Text><Text style={{ fontSize: 11, color: colors.gray400 }}>Optional document</Text></View>
          <TouchableOpacity disabled={uploading === `doc_${idx}`} onPress={() => run(`doc_${idx}`, false, (urls) => { const next = form.documents.map((d, i) => (i === idx ? { ...d, fileUrl: urls[0] } : d)); update('documents', next); })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.blue50 }}>
            {uploading === `doc_${idx}` ? <ActivityIndicator size="small" color={P} /> : <Plus size={14} color={P} />}<Text style={{ fontSize: 12, fontWeight: '700', color: P }}>{uploading === `doc_${idx}` ? 'Uploading...' : doc.fileUrl ? 'Change' : 'Upload'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};
