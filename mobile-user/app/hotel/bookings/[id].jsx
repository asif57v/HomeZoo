import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Calendar, User, Phone, Mail, MapPin, CreditCard, CheckCircle, XCircle, Clock, AlertTriangle, LogIn, LogOut, Lock, Crown, Eye, PhoneCall, Send, Target, Navigation, Smartphone, BedDouble } from 'lucide-react-native';
import { Text, Input, Sheet } from '../../../src/components/ui';
import { PartnerBack } from '../../../src/components/partner/PartnerKit';
import { bookingService } from '../../../src/services/apiService';
import toast from '../../../src/store/toastStore';
import { errMsg } from '../../../src/utils/format';
import { colors } from '../../../src/theme';
import { getCurrentEnquiry } from '../../../src/lib/enquiryState';

const P = '#005CA8';
const confirm = (title, msg, okText = 'Confirm') => new Promise((res) => Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel', onPress: () => res(false) }, { text: okText, onPress: () => res(true) }], { cancelable: true, onDismiss: () => res(false) }));

const Section = ({ icon: Icon, title, children }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon size={16} color={colors.gray400} /><Text style={{ fontWeight: '700', color: colors.gray900 }}>{title}</Text></View>
    {children}
  </View>
);
const Kv = ({ k, v }) => <View style={{ width: '50%', marginBottom: 8 }}><Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '700' }}>{k}</Text><Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray900 }}>{v}</Text></View>;

// Lead actions (backend utils/leadTracker.js). Older leads have no `source`: infer it from the id prefix.
const LEAD_SOURCES = {
  enquiry_form: { label: 'Enquiry form', desc: 'User sent an enquiry from the property page', Icon: Send, fg: '#7C3AED', bg: '#F5F3FF' },
  contact_reveal: { label: 'Contact revealed', desc: 'User revealed your contact number', Icon: Phone, fg: '#D97706', bg: '#FFFBEB' },
  call_click: { label: 'Call tapped', desc: 'User tapped Call owner', Icon: PhoneCall, fg: '#16A34A', bg: '#F0FDF4' },
  property_view: { label: 'Property view', desc: 'User opened your property page', Icon: Eye, fg: P, bg: '#EFF6FF' },
};
const inferSource = (b) => {
  const s = b.inquiryMetadata?.source;
  if (s && LEAD_SOURCES[s]) return s;
  const bid = String(b.bookingId || '');
  if (bid.startsWith('INQ')) return 'enquiry_form';
  if (bid.startsWith('CALL')) return 'contact_reveal';
  if (bid.startsWith('LEAD')) return 'property_view';
  return null;
};
const dtStr = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const Row = ({ Icon, label, value }) => (value ? (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center' }}><Icon size={14} color={colors.gray500} /></View>
    <View style={{ flex: 1 }}><Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '700' }}>{label}</Text><Text style={{ fontSize: 13, fontWeight: '600', color: colors.gray900 }}>{value}</Text></View>
  </View>
) : null);

export default function PartnerBookingDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState(() => getCurrentEnquiry(id));
  const [loading, setLoading] = useState(() => !getCurrentEnquiry(id));
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    // Never bounce back to the list: keep the tapped enquiry on screen and surface the error instead
    try {
      setLoadError('');
      if (!getCurrentEnquiry(id)) setLoading(true);
      const data = await bookingService.getPartnerBookingDetail(id);
      if (data && typeof data === 'object' && data._id) setBooking(data);
      else if (data?.booking) setBooking(data.booking);
      else throw new Error('Unexpected response');
    } catch (e) {
      const msg = errMsg(e, 'Failed to load booking details');
      setLoadError(msg);
      if (getCurrentEnquiry(id)) toast.error(msg);
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okMsg) => { if (busy) return; setBusy(true); try { await fn(); toast.success(okMsg); await load(); } catch (e) { toast.error(errMsg(e, 'Action Failed')); } finally { setBusy(false); } };

  const markPaid = async () => { if (await confirm('Mark Paid', 'Confirm: Guest has paid the full amount at the hotel?')) run(() => bookingService.markAsPaid(id), 'Marked as Paid Successfully'); };
  const noShow = async () => { if (await confirm('No Show', 'Confirm: Guest did NOT arrive? This will cancel the booking and release inventory.')) run(() => bookingService.markNoShow(id), 'Marked as No Show'); };
  const checkIn = async () => { if (await confirm('Check-In', 'Confirm Guest Check-In?')) run(() => bookingService.checkIn(id), 'Checked In Successfully'); };
  const checkOut = async () => {
    if (!(await confirm('Check-Out', 'Confirm Guest Check-Out?'))) return;
    setBusy(true);
    try { await bookingService.checkOut(id); toast.success('Checked Out Successfully'); await load(); }
    catch (error) {
      if (error?.requirePayment) {
        if (await confirm('Payment pending', `${error.message}\n\nDo you want to FORCE check-out anyway?`, 'Force')) {
          try { await bookingService.checkOut(id, true); toast.success('Checked Out (Forced)'); await load(); } catch (e) { toast.error(errMsg(e, 'Force Check-out Failed')); }
        }
      } else toast.error(errMsg(error, 'Action Failed'));
    } finally { setBusy(false); }
  };
  const submitInquiry = async () => {
    const status = noteFor; setNoteFor(null);
    run(() => bookingService.updateInquiryStatus(id, status, note), `Inquiry marked as ${status}`);
    setNote('');
  };

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={P} /></View>;
  if (!booking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
        <PartnerBack title="Enquiry Details" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <AlertTriangle size={36} color={colors.amber600} />
          <Text style={{ fontWeight: '700', color: colors.gray900, textAlign: 'center' }}>Could not load this enquiry</Text>
          <Text style={{ fontSize: 12, color: colors.gray500, textAlign: 'center' }}>{loadError || 'Please try again.'}</Text>
          <TouchableOpacity onPress={load} style={{ backgroundColor: P, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  const user = booking.userId || {}; const property = booking.propertyId || {}; const room = booking.roomTypeId || {};
  const isInquiry = booking.isInquiry === true;
  const payAtHotel = booking.paymentStatus !== 'paid';
  const canMarkPaid = !isInquiry && payAtHotel && ['confirmed', 'checked_in'].includes(booking.bookingStatus);
  const canNoShow = !isInquiry && booking.bookingStatus === 'confirmed';
  const canCheckIn = !isInquiry && booking.bookingStatus === 'confirmed';
  const canCheckOut = !isInquiry && booking.bookingStatus === 'checked_in';
  const t = (property?.propertyType || '').toLowerCase();
  const isPG = ['pg', 'hostel'].includes(t); const isRent = t === 'rent'; const isBuyPlot = ['buy', 'plot'].includes(t);
  const inLabel = isPG || isRent ? 'Move-in' : isBuyPlot ? 'Preferred Date' : 'Check-in';
  const outLabel = isPG || isRent ? 'Move-out' : 'Check-out';
  const durLabel = isPG || isRent ? (booking.totalNights >= 30 ? 'Months' : 'Days') : 'Nights';
  const status = isInquiry ? booking.inquiryMetadata?.status?.replace('_', ' ') : booking.bookingStatus?.replace('_', ' ');
  const dstr = (d) => (d ? new Date(d).toLocaleDateString() : 'N/A');
  const meta = booking.inquiryMetadata || {};
  const srcKey = isInquiry ? inferSource(booking) : null;
  const src = srcKey ? LEAD_SOURCES[srcKey] : null;
  const activity = Array.isArray(meta.activity) ? [...meta.activity].reverse() : [];
  const userCity = typeof user.address === 'object' ? [user.address?.city, user.address?.state].filter(Boolean).join(', ') : user.address;
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;
  const roomLabel = room.name || meta.roomName;
  const Act = ({ onPress, Icon, label, bg, fg = '#fff', border }) => <TouchableOpacity disabled={busy} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: bg, borderWidth: border ? 1 : 0, borderColor: border, opacity: busy ? 0.6 : 1 }}><Icon size={18} color={fg} /><Text style={{ fontWeight: '700', color: fg }}>{label}</Text></TouchableOpacity>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerBack title="Enquiry Details" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '700' }}>ENQUIRY ID</Text><Text style={{ fontWeight: '800', color: colors.gray900 }}>#{booking.bookingId || booking._id}</Text></View>
          <View style={{ backgroundColor: colors.blue50, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 11, fontWeight: '700', color: colors.blue700, textTransform: 'uppercase' }}>{status}</Text></View>
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{property.images?.[0] ? <Image source={{ uri: property.images[0] }} style={{ width: '100%', height: '100%' }} /> : <MapPin size={24} color={colors.gray400} />}</View>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: colors.gray900, fontSize: 16 }}>{property.propertyName || 'Property Name'}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: P, textTransform: 'uppercase' }}>{t}</Text>
            <Text style={{ fontSize: 12, color: colors.gray500 }}>{typeof property.address === 'object' ? `${property.address.city || ''}${property.address.city && property.address.area ? ', ' : ''}${property.address.area || ''}` : property.address || 'Location'}</Text></View>
        </View>

        {isInquiry ? (
          <Section icon={Target} title="Lead Source">
            {src ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: src.bg, borderRadius: 12, padding: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><src.Icon size={18} color={src.fg} /></View>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: src.fg }}>{src.label}</Text><Text style={{ fontSize: 11, color: colors.gray600 }}>{src.desc}</Text></View>
              </View>
            ) : null}
            <Row Icon={Navigation} label="Found the property from" value={meta.sourceScreen || (src ? 'Not recorded (older lead)' : null)} />
            <Row Icon={Smartphone} label="Platform" value={meta.platform === 'app' ? 'Hoomzo mobile app' : meta.platform === 'web' ? 'Hoomzo website' : null} />
            <Row Icon={Clock} label="Lead created" value={dtStr(booking.createdAt)} />
            {activity.length > 0 ? (
              <View style={{ marginTop: 4, gap: 10 }}>
                <Text style={{ fontSize: 10, color: colors.gray400, fontWeight: '700' }}>ACTIVITY</Text>
                {activity.map((a, i) => {
                  const s = LEAD_SOURCES[a.action] || LEAD_SOURCES.property_view;
                  return (
                    <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.fg, marginTop: 4 }} />
                        {i < activity.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.gray100, marginTop: 2 }} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray900 }}>{a.label || s.label}</Text>
                        <Text style={{ fontSize: 11, color: colors.gray500 }}>{[dtStr(a.at), a.screen, a.sharingType].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Section>
        ) : null}

        <Section icon={User} title="Guest Details">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {user.profileImage ? <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontWeight: '800', color: P }}>{user.name?.[0] || 'G'}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.gray900 }}>{user.name || 'Guest'}</Text>
              <Text style={{ fontSize: 11, color: colors.gray500 }}>{joined ? `Hoomzo member since ${joined}` : 'Hoomzo user'}</Text>
            </View>
          </View>
          {userCity ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MapPin size={14} color={colors.gray400} /><Text style={{ fontSize: 13, color: colors.gray700 }}>{userCity}</Text></View> : null}
          {booking.isLocked ? (
            <View style={{ backgroundColor: colors.amber50, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Lock size={16} color={colors.amber600} /><Text style={{ fontWeight: '700', color: '#78350F' }}>Contact Details Locked</Text></View>
              <Text style={{ fontSize: 12, color: colors.amber700 }}>Full customer contact number and email are locked. An active partner subscription is required to unlock leads and communicate directly.</Text>
              <TouchableOpacity onPress={() => router.push('/hotel/subscriptions')} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.amber600, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}><Crown size={14} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Subscribe to Unlock Contact</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TouchableOpacity onPress={() => user.phone && Linking.openURL(`tel:${user.phone}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Phone size={14} color={colors.green600} /><Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray800 }}>{user.phone || 'N/A'}</Text></TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Mail size={14} color={colors.gray400} /><Text style={{ fontSize: 14, color: colors.gray700 }}>{user.email || 'N/A'}</Text></View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><User size={14} color={colors.gray400} /><Text style={{ fontSize: 12, color: colors.gray500 }}>Total Guests:</Text><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray800 }}>{booking.guests?.adults || 1} Adult{(booking.guests?.adults || 1) !== 1 ? 's' : ''}{booking.guests?.children > 0 ? `, ${booking.guests.children} Child${booking.guests.children !== 1 ? 'ren' : ''}` : ''}</Text></View>
        </Section>

        <Section icon={Calendar} title={isInquiry ? 'Inquiry Details' : isPG || isRent ? 'Tenancy Details' : 'Stay Details'}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Kv k={inLabel} v={dstr(booking.checkInDate || booking.inquiryMetadata?.preferredDate)} />
            {!isBuyPlot && (!isInquiry || booking.checkOutDate) ? <Kv k={outLabel} v={dstr(booking.checkOutDate)} /> : null}
            {isPG && meta.sharingType ? <Kv k="Sharing" v={meta.sharingType} /> : null}
            {!isBuyPlot && (roomLabel || !isInquiry) ? <Kv k={isPG ? 'Selection' : 'Room Type'} v={roomLabel || room.type || 'Standard'} /> : null}
            {!isBuyPlot && meta.roomPrice ? <Kv k={isPG || isRent ? 'Room Rent' : 'Room Price'} v={`₹${Number(meta.roomPrice).toLocaleString('en-IN')}${isPG || isRent ? ' / month' : ''}`} /> : null}
            {!isBuyPlot ? <Kv k="Unit" v={meta.beds > 1 ? `${meta.beds} ${booking.bookingUnit === 'room' ? 'Rooms' : 'Beds'}` : booking.bookingUnit === 'entire' ? '1 Unit' : booking.bookingUnit === 'bed' || isPG ? '1 Bed' : '1 Room'} /> : null}
            {!isInquiry ? <Kv k="Duration" v={`${booking.totalNights} ${durLabel}`} /> : null}
          </View>
          {isInquiry && booking.inquiryMetadata?.message ? <View style={{ backgroundColor: colors.gray50, padding: 12, borderRadius: 12 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400 }}>User Message</Text><Text style={{ fontSize: 13, color: colors.gray700, fontStyle: 'italic' }}>"{booking.inquiryMetadata.message}"</Text></View> : null}
        </Section>

        <Section icon={CreditCard} title={isInquiry ? 'Financial Details' : 'Payment & Payout'}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 13, color: colors.gray500 }}>{isInquiry ? 'Expected Price / Budget' : 'Total Amount (Collect)'}</Text><Text style={{ fontWeight: '800', color: colors.gray900 }}>{isInquiry ? (meta.budget > 0 ? `₹${Number(meta.budget).toLocaleString('en-IN')}` : 'Not specified') : `₹${booking.totalAmount}`}</Text></View>
            {!isInquiry ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 13, color: colors.gray500 }}>Partner Payout (Earnings)</Text><Text style={{ fontWeight: '800', color: colors.green600 }}>₹{booking.partnerPayout}</Text></View> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 13, color: colors.gray500 }}>Status</Text><Text style={{ fontWeight: '700', color: colors.gray800 }}>{isInquiry ? 'Lead' : booking.paymentStatus === 'paid' ? 'PAID' : 'PAY AT HOTEL'}</Text></View>
          </View>
        </Section>

        <View style={{ gap: 10 }}>
          {isInquiry ? (<>
            <Act onPress={() => setNoteFor('scheduled')} Icon={Calendar} label="Schedule Visit" bg={colors.purple600} />
            <Act onPress={() => setNoteFor('negotiating')} Icon={Clock} label="Negotiating" bg={colors.orange500} />
            <Act onPress={() => setNoteFor(isBuyPlot ? 'sold' : 'rented')} Icon={CheckCircle} label={`Mark as ${isBuyPlot ? 'Sold' : 'Rented'}`} bg={colors.green600} />
            <Act onPress={() => setNoteFor('dropped')} Icon={XCircle} label="Drop Lead" bg="#fff" fg={colors.red600} border={colors.red100} />
          </>) : null}
          {canCheckIn ? <Act onPress={checkIn} Icon={LogIn} label={`${inLabel} Guest`} bg={P} /> : null}
          {canCheckOut ? <Act onPress={checkOut} Icon={LogOut} label={`${outLabel} Guest`} bg={colors.purple600} /> : null}
          {canMarkPaid ? <Act onPress={markPaid} Icon={CheckCircle} label="Mark Paid" bg={colors.green600} /> : null}
          {canNoShow ? <Act onPress={noShow} Icon={AlertTriangle} label="No Show" bg="#fff" fg={colors.gray700} border={colors.gray200} /> : null}
        </View>
      </ScrollView>
      <Sheet visible={!!noteFor} onClose={() => setNoteFor(null)} title={`Mark as ${noteFor || ''}`}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
          <Text style={{ fontSize: 13, color: colors.gray600 }}>Any message/note for the user about status "{noteFor}"?</Text>
          <Input value={note} onChangeText={setNote} placeholder="Optional note" multiline style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' }} />
          <TouchableOpacity onPress={submitInquiry} style={{ backgroundColor: P, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>Update</Text></TouchableOpacity>
        </View>
      </Sheet>
    </View>
  );
}
