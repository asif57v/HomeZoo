import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Modal, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Users, BedDouble, ArrowLeft, CheckCircle, X, ChevronRight, Clock, Calendar, Phone, ExternalLink, Check, AlertCircle, Eye, Building2, FileText, Image as ImageIcon, Utensils } from 'lucide-react-native';
import { Text } from '../../../src/components/ui';
import { propertyService } from '../../../src/services/apiService';
import { errMsg } from '../../../src/utils/format';
import { colors } from '../../../src/theme';

const P = '#005CA8';
const Card = ({ icon: Icon, title, badge, children }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.gray50 }}>
      <Icon size={18} color={P} /><Text style={{ flex: 1, fontWeight: '800', color: colors.gray900, fontSize: 15 }}>{title}</Text>
      {badge ? <View style={{ backgroundColor: colors.blue50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '700', color: P }}>{badge}</Text></View> : null}
    </View>
    <View style={{ padding: 14, gap: 10 }}>{children}</View>
  </View>
);
const Kv = ({ k, v }) => (v === undefined || v === null || v === '' ? null : <View style={{ width: '50%', marginBottom: 10, paddingRight: 8 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase' }}>{k}</Text><Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray900 }}>{String(v)}</Text></View>);

export default function PartnerPropertyDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await propertyService.getDetails(id);
        const p = res.property || {};
        if (res.documents && res.documents.documents) p.documents = res.documents.documents;
        setProperty(p); setRoomTypes(res.roomTypes || []);
      } catch (e) { setError(errMsg(e, 'Failed to load property details')); } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}><ActivityIndicator size="large" color={P} /><Text style={{ color: colors.gray500 }}>Loading Property Details...</Text></View>;
  if (error || !property) return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }}>
      <AlertCircle size={28} color={colors.red500} /><Text style={{ fontSize: 18, fontWeight: '800' }}>Unable to Load Property</Text><Text style={{ color: colors.gray500, textAlign: 'center' }}>{error || 'Property not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}><ArrowLeft size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Go Back to Listings</Text></TouchableOpacity>
    </SafeAreaView>
  );

  const pType = property.propertyType?.toLowerCase() || '';
  const isPg = ['pg', 'hostel', 'pg/co-living', 'co-living'].includes(pType);
  const all = [...(property.coverImage ? [property.coverImage] : []), ...(property.propertyImages || [])];
  const unit = ['pg', 'hostel', 'rent'].includes(pType) ? '/ month' : ['buy', 'plot'].includes(pType) ? '' : '/ night';

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 12, gap: 8 }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/hotel/properties'))} style={{ padding: 8 }}><ArrowLeft size={20} color={colors.gray700} /></TouchableOpacity>
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 16, color: colors.gray900 }}>{property.propertyName}</Text><Text style={{ fontSize: 11, color: colors.gray500 }}>{property.propertyType} • {property.address?.city || 'Location'}</Text></View>
          <View style={{ backgroundColor: property.isLive ? colors.green100 : colors.amber100, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '700', color: property.isLive ? colors.green700 : colors.amber700 }}>{property.isLive ? 'Live' : property.status || 'Pending'}</Text></View>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {!property.isLive && property.status !== 'rejected' ? (
          <View style={{ backgroundColor: colors.amber50, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10 }}>
            <Clock size={16} color={colors.amber600} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: '#78350F' }}>Team is reviewing your request</Text><Text style={{ fontSize: 12, color: colors.amber700, marginTop: 2 }}>Your listing details are currently under review. Usually confirmed within 24–48 hours. All information submitted is displayed below on this page.</Text></View>
          </View>
        ) : null}
        <View style={{ height: 200, borderRadius: 16, backgroundColor: colors.gray200, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {property.coverImage ? <TouchableOpacity activeOpacity={0.9} style={{ width: '100%', height: '100%' }} onPress={() => setLightbox(property.coverImage)}><Image source={{ uri: property.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /></TouchableOpacity> : <ImageIcon size={48} color={colors.gray400} />}
          <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{property.dynamicCategory?.displayName || property.propertyType}</Text></View>
          <View style={{ position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}><ImageIcon size={14} color="#fff" /><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{all.length} Photos</Text></View>
        </View>
        <View><Text style={{ fontSize: 20, fontWeight: '900', color: colors.gray900 }}>{property.propertyName}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><MapPin size={13} color={colors.gray400} /><Text style={{ fontSize: 12, color: colors.gray500, flex: 1 }}>{property.address?.fullAddress || `${property.address?.city || ''}, ${property.address?.state || ''}`}</Text></View></View>

        <TouchableOpacity onPress={() => router.push(`/hotel/inventory/${id}`)} style={{ backgroundColor: P, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Calendar size={22} color="#fff" /><View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: '#fff', fontSize: 15 }}>Manage Inventory</Text><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Availability, Rates & Manual Blocks</Text></View><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Manage</Text><ChevronRight size={18} color="#fff" />
        </TouchableOpacity>

        <Card icon={Building2} title="Basic Information" badge={property.propertyType}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Kv k="Property Name" v={property.propertyName} /><Kv k="Contact Number" v={property.contactNumber || 'Not provided'} />
            <Kv k="Category" v={property.dynamicCategory?.displayName} /><Kv k="Hotel Category" v={property.hotelCategory} /><Kv k="Star Rating" v={property.starRating ? `★ ${property.starRating} Star` : null} /><Kv k="Resort Type" v={property.resortType} />
            {pType === 'pg' ? (<><Kv k="PG Gender / Type" v={property.pgType || property.pgDetails?.gender || 'Co-ed'} /><Kv k="Occupancy Type" v={property.pgDetails?.occupancy} /><Kv k="Security Deposit" v={property.pgDetails?.securityDeposit ? `₹${property.pgDetails.securityDeposit}` : null} /><Kv k="Minimum Stay" v={property.pgDetails?.minStay} /></>) : null}
            {pType === 'hostel' ? <Kv k="Hostel Type" v={property.hostelType} /> : null}
            {pType === 'plot' && property.plotDetails ? (<><Kv k="Plot Area" v={`${property.plotDetails.plotArea} ${property.plotDetails.unit || 'sqyrd'}`} /><Kv k="Expected Price" v={`₹${property.plotDetails.expectedPrice?.toLocaleString() || 'N/A'}`} /><Kv k="Facing" v={property.plotDetails.facing} /><Kv k="Land Type" v={property.plotDetails.landType} /></>) : null}
            {pType === 'buy' && property.buyDetails ? (<><Kv k="Property Type" v={property.buyDetails.type || 'Residential'} /><Kv k="Expected Price" v={`₹${property.buyDetails.expectedPrice?.toLocaleString() || 'N/A'}`} /><Kv k="Carpet Area" v={property.buyDetails.area?.carpet ? `${property.buyDetails.area.carpet} ${property.buyDetails.area.unit || 'sqft'}` : null} /></>) : null}
            {pType === 'rent' && property.rentDetails ? (<><Kv k="Type" v={property.rentDetails.type || 'Apartment'} /><Kv k="Furnishing" v={property.rentDetails.furnishing} /><Kv k="Monthly Rent" v={`₹${property.rentDetails.monthlyRent?.toLocaleString() || 'N/A'}`} /><Kv k="Security" v={property.rentDetails.securityDeposit !== undefined || property.rentDetails.maintenanceCharges !== undefined ? `₹${(property.rentDetails.securityDeposit ?? property.rentDetails.maintenanceCharges)?.toLocaleString() || '0'}` : null} /><Kv k="Tenant Preference" v={property.rentDetails.tenantPreference} /></>) : null}
          </View>
          {property.description ? <View><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', marginBottom: 4 }}>Description</Text><Text style={{ fontSize: 13, color: colors.gray600, lineHeight: 20 }}>{property.description}</Text></View> : null}
          {pType === 'pg' && property.pgDetails?.foodIncluded ? (
            <View><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', marginBottom: 6 }}>Food Included</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>{['breakfast', 'lunch', 'dinner'].map((m) => <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: property.pgDetails.foodIncluded[m] ? colors.green50 : colors.gray50 }}><Utensils size={13} color={property.pgDetails.foodIncluded[m] ? colors.green600 : colors.gray400} /><Text style={{ fontSize: 12, textTransform: 'capitalize', color: colors.gray700 }}>{m} {property.pgDetails.foodIncluded[m] ? '✓' : '✗'}</Text></View>)}</View></View>
          ) : null}
        </Card>

        <Card icon={ImageIcon} title="Photos & Media" badge={`${all.length} Photos`}>
          {all.length > 0 ? (<>
            {property.coverImage ? <View><Image source={{ uri: property.coverImage }} style={{ width: '100%', height: 160, borderRadius: 12 }} contentFit="cover" /><View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>Cover Photo</Text></View></View> : null}
            {property.propertyImages?.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{property.propertyImages.map((img, i) => <TouchableOpacity key={i} onPress={() => setLightbox(img)}><Image source={{ uri: img }} style={{ width: (width - 32 - 28 - 16) / 3, aspectRatio: 1, borderRadius: 10 }} contentFit="cover" /></TouchableOpacity>)}</View> : null}
          </>) : <Text style={{ textAlign: 'center', color: colors.gray400 }}>No photos added yet.</Text>}
        </Card>

        {roomTypes.length > 0 || ['hotel', 'resort', 'villa', 'homestay', 'tent', 'hostel', 'pg'].includes(pType) ? (
          <Card icon={BedDouble} title={pType === 'tent' ? 'Tent & Units Pricing' : 'Rooms & Pricing'} badge={`${roomTypes.length} Types`}>
            {roomTypes.length > 0 ? roomTypes.map((room) => (
              <View key={room._id} style={{ borderWidth: 1, borderColor: colors.gray100, borderRadius: 12, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: colors.gray900 }}>{room.name}</Text><View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>{room.roomCategory ? <Text style={{ fontSize: 10, color: P, fontWeight: '700' }}>{room.roomCategory}</Text> : null}{room.inventoryType ? <Text style={{ fontSize: 10, color: colors.gray500 }}>{room.inventoryType}</Text> : null}</View></View>
                  <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 18, fontWeight: '900', color: P }}>₹{room.pricePerNight}</Text><Text style={{ fontSize: 10, color: colors.gray400 }}>{unit}</Text></View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[[Users, room.maxAdults || 0, 'Adults'], [Users, room.maxChildren || 0, 'Children'], [BedDouble, room.totalInventory || 0, 'Units']].map(([I, v, l]) => <View key={l} style={{ flex: 1, backgroundColor: colors.gray50, borderRadius: 10, padding: 8, alignItems: 'center' }}><I size={14} color={colors.gray400} /><Text style={{ fontWeight: '800', color: colors.gray800 }}>{v}</Text><Text style={{ fontSize: 10, color: colors.gray500 }}>{l}</Text></View>)}
                </View>
                {room.extraAdultPrice > 0 || room.extraChildPrice > 0 ? <View style={{ flexDirection: 'row', gap: 12 }}>{room.extraAdultPrice > 0 ? <Text style={{ fontSize: 12, color: colors.gray600 }}>Extra Adult: <Text style={{ fontSize: 12, fontWeight: '800', color: colors.gray900 }}>₹{room.extraAdultPrice}</Text></Text> : null}{room.extraChildPrice > 0 ? <Text style={{ fontSize: 12, color: colors.gray600 }}>Extra Child: <Text style={{ fontSize: 12, fontWeight: '800', color: colors.gray900 }}>₹{room.extraChildPrice}</Text></Text> : null}</View> : null}
                {room.amenities?.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{room.amenities.map((a, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.green50, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}><Check size={11} color={colors.green600} /><Text style={{ fontSize: 11, color: colors.green700 }}>{a}</Text></View>)}</View> : null}
                {room.images?.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{room.images.map((r, i) => <TouchableOpacity key={i} onPress={() => setLightbox(typeof r === 'string' ? r : r.url)}><Image source={{ uri: typeof r === 'string' ? r : r.url }} style={{ width: 90, height: 70, borderRadius: 8 }} contentFit="cover" /></TouchableOpacity>)}</ScrollView> : null}
              </View>
            )) : <Text style={{ textAlign: 'center', color: colors.gray400 }}>No room types configured yet.</Text>}
          </Card>
        ) : null}

        <Card icon={CheckCircle} title="Amenities & Facilities" badge={`${property.amenities?.length || 0} Listed`}>
          {property.amenities?.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{property.amenities.map((a, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gray50, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}><CheckCircle size={14} color={P} /><Text style={{ fontSize: 12, color: colors.gray700 }}>{a}</Text></View>)}</View> : <Text style={{ textAlign: 'center', color: colors.gray400 }}>No amenities added.</Text>}
        </Card>

        <Card icon={MapPin} title="Location & Address">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}><Kv k="Full Address" v={property.address?.fullAddress || 'Address not specified'} /><Kv k="Area" v={property.address?.area} /><Kv k="City" v={property.address?.city || 'N/A'} /><Kv k="State" v={property.address?.state || 'N/A'} /><Kv k="Pincode" v={property.address?.pincode} /></View>
          <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address?.fullAddress || `${property.propertyName} ${property.address?.city || ''}`)}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ExternalLink size={14} color={P} /><Text style={{ color: P, fontWeight: '700', fontSize: 13 }}>Open Location in Google Maps</Text></TouchableOpacity>
        </Card>

        <Card icon={Clock} title="Rules & Policies">
          {!['pg', 'hostel', 'rent', 'buy', 'plot'].includes(pType) ? <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}><Kv k="Check-in Time" v={property.checkInTime || '12:00 PM'} /><Kv k="Check-out Time" v={property.checkOutTime || '11:00 AM'} /></View> : null}
          <View><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase' }}>Cancellation Policy</Text><Text style={{ fontSize: 13, color: colors.gray700 }}>{property.cancellationPolicy || 'Standard cancellation policy applies.'}</Text></View>
          <View><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', marginBottom: 4 }}>House Rules</Text>
            {property.houseRules?.length > 0 ? property.houseRules.map((r, i) => <Text key={i} style={{ fontSize: 13, color: colors.gray700 }}>• {typeof r === 'string' ? r : JSON.stringify(r)}</Text>) : <Text style={{ fontSize: 13, color: colors.gray400 }}>No specific house rules specified.</Text>}
          </View>
          {pType === 'pg' && property.pgDetails?.rules ? (
            <View><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', marginBottom: 4 }}>PG Specific Rules</Text>
              {[['smoking', 'Smoking', false], ['drinking', 'Drinking', false], ['visitors', 'Visitors', true]].map(([k, l, goodWhenTrue]) => <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}><Text style={{ fontSize: 13, color: colors.gray600 }}>{l}</Text><Text style={{ fontSize: 13, fontWeight: '700', color: property.pgDetails.rules[k] === goodWhenTrue ? colors.emerald600 : colors.amber600 }}>{property.pgDetails.rules[k] ? 'Allowed' : 'Not Allowed'}</Text></View>)}
              {property.pgDetails.rules.curfew ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}><Text style={{ fontSize: 13, color: colors.gray600 }}>Curfew Time</Text><Text style={{ fontSize: 13, fontWeight: '700' }}>{property.pgDetails.rules.curfew}</Text></View> : null}
            </View>
          ) : null}
        </Card>

        {!isPg && property.nearbyPlaces?.length > 0 ? (
          <Card icon={MapPin} title="Nearby Places" badge={`${property.nearbyPlaces.length} Places`}>
            {property.nearbyPlaces.map((pl, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontWeight: '800', color: P }}>{pl.name?.charAt(0) || '•'}</Text></View><View><Text style={{ fontWeight: '600', color: colors.gray800, fontSize: 13 }}>{pl.name}</Text><Text style={{ fontSize: 11, color: colors.gray500 }}>{pl.type?.replace('_', ' ')} • {pl.distanceKm} km</Text></View></View>)}
          </Card>
        ) : null}

        {property.documents?.length > 0 ? (
          <Card icon={FileText} title="Uploaded Documents" badge={`${property.documents.length} Files`}>
            {property.documents.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: colors.gray50, borderRadius: 12 }}>
                <FileText size={18} color={P} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: '600', color: colors.gray800, fontSize: 13 }}>{d.name}</Text><Text style={{ fontSize: 10, color: d.fileUrl ? colors.green600 : colors.red500 }}>{d.fileUrl ? 'Uploaded' : 'Missing'}</Text></View>
                {d.fileUrl ? <TouchableOpacity onPress={() => (/\.(png|jpe?g|webp)$/i.test(d.fileUrl) ? setLightbox(d.fileUrl) : Linking.openURL(d.fileUrl))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.blue50 }}><Eye size={13} color={P} /><Text style={{ fontSize: 12, fontWeight: '700', color: P }}>View</Text></TouchableOpacity> : null}
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => setLightbox(null)} style={{ position: 'absolute', top: 48, right: 20, zIndex: 5, padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999 }}><X size={22} color="#fff" /></TouchableOpacity>
          {lightbox ? <Image source={{ uri: lightbox }} style={{ width: '100%', height: '80%' }} contentFit="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}
