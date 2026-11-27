import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, User, Phone, Mail, MapPin,
  CreditCard, CheckCircle, XCircle, Clock,
  ChevronLeft, AlertTriangle, LogIn, LogOut,
  Lock, Crown, Home, BedDouble, Eye, PhoneCall, Send, Target, Smartphone
} from 'lucide-react';
import { bookingService } from '../../../services/apiService';
import toast from 'react-hot-toast';

// Lead actions (backend utils/leadTracker.js). Older leads have no `source`: infer it from the id prefix.
const LEAD_SOURCES = {
  enquiry_form: { label: 'Enquiry form', desc: 'User sent an enquiry from the property page', Icon: Send, cls: 'bg-purple-50 text-purple-700' },
  contact_reveal: { label: 'Contact revealed', desc: 'User revealed your contact number', Icon: Phone, cls: 'bg-amber-50 text-amber-700' },
  call_click: { label: 'Call tapped', desc: 'User tapped Call owner', Icon: PhoneCall, cls: 'bg-green-50 text-green-700' },
  property_view: { label: 'Property view', desc: 'User opened your property page', Icon: Eye, cls: 'bg-blue-50 text-blue-700' },
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
const SHARING = { triple: 'Triple Sharing', double: 'Double Sharing', private: 'Private Room', shared: 'Shared Dorm', entire: 'Entire Unit' };
const sharingOf = (rt) => (rt?.roomCategory ? SHARING[String(rt.roomCategory).toLowerCase()] || rt.roomCategory : null);
const inr = (n) => (Number(n) > 0 ? `₹${Number(n).toLocaleString('en-IN')}` : null);
const dt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null);
const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : null);

const Kv = ({ k, v }) => (v === null || v === undefined || v === '' ? null : (
  <div className="p-2.5 bg-gray-50 rounded-xl">
    <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">{k}</p>
    <p className="font-bold text-gray-900 text-sm break-words">{v}</p>
  </div>
));

// Key facts of the listing for its type (what the user was looking at)
const propertyFacts = (p, t) => {
  if (['pg', 'hostel'].includes(t)) {
    const pg = p.pgDetails || {};
    const food = Object.entries(pg.foodIncluded || {}).filter(([, on]) => on).map(([m]) => m[0].toUpperCase() + m.slice(1)).join(', ');
    return [
      ['PG For', pg.gender], ['PG Type', p.pgType], ['Food Included', food || null], ['Food Type', p.foodType],
      ['Security Deposit', inr(pg.securityDeposit)], ['Notice Period', pg.noticePeriod], ['Min Stay', pg.minStay],
      ['Available From', pg.availableFrom ? new Date(pg.availableFrom).toLocaleDateString('en-IN') : null],
    ];
  }
  if (t === 'rent') {
    const r = p.rentDetails || {};
    return [
      ['Type', r.type], ['Monthly Rent', inr(r.monthlyRent)], ['Security Deposit', inr(r.securityDeposit)],
      ['Maintenance', inr(r.maintenanceCharges)], ['Furnishing', r.furnishing ? `${r.furnishing}${r.furnishing === 'Unfurnished' ? '' : ' Furnished'}` : null],
      ['Tenant Preference', r.tenantPreference], ['Society', r.societyName], ['Built Year', r.builtYear],
      ['Electricity Included', yesNo(r.electricityIncluded)], ['Lift', yesNo(r.lift)],
    ];
  }
  if (t === 'buy') {
    const b = p.buyDetails || {};
    const unit = b.area?.unit || 'sqft';
    return [
      ['Type', b.type], ['Expected Price', inr(b.expectedPrice)],
      ['Super Built-up', b.area?.superBuiltUp ? `${b.area.superBuiltUp} ${unit}` : null], ['Carpet Area', b.area?.carpet ? `${b.area.carpet} ${unit}` : null],
      ['Floor', b.floor?.current !== undefined && b.floor?.current !== null ? `${b.floor.current}${b.floor.total ? ` of ${b.floor.total}` : ''}` : null],
      ['Facing', b.facing], ['Ownership', b.ownership], ['Property Age', b.propertyAge], ['Builder', b.builderName],
      ['Loan Eligible', yesNo(b.loanEligible)],
    ];
  }
  if (t === 'plot') {
    const pl = p.plotDetails || {};
    return [
      ['Expected Price', inr(pl.expectedPrice)], ['Plot Area', pl.plotArea ? `${pl.plotArea} ${pl.unit || 'sqyrd'}` : null],
      ['Dimensions', pl.dimensions?.length && pl.dimensions?.breadth ? `${pl.dimensions.length} x ${pl.dimensions.breadth} ft` : null],
      ['Land Type', pl.landType], ['Facing', pl.facing], ['Road Width', pl.roadWidth], ['Approval', pl.approvalAuthority],
    ];
  }
  return [['Category', p.hotelCategory || p.resortType], ['Star Rating', p.starRating ? `${p.starRating} Star` : null], ['Check-in Time', p.checkInTime], ['Check-out Time', p.checkOutTime]];
};

const PartnerBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getPartnerBookingDetail(id);
      setBooking(data);
    } catch (error) {
      toast.error("Failed to load booking details");
      navigate('/hotel/bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleMarkPaid = async () => {
    if (!window.confirm("Confirm: Guest has paid the full amount at the hotel?")) return;
    try {
      await bookingService.markAsPaid(id);
      toast.success("Marked as Paid Successfully");
      fetchBooking(); // Refresh
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleNoShow = async () => {
    if (!window.confirm("Confirm: Guest did NOT arrive? This will cancel the booking and release inventory.")) return;
    try {
      await bookingService.markNoShow(id);
      toast.success("Marked as No Show");
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleCheckIn = async () => {
    if (!window.confirm("Confirm Guest Check-In?")) return;
    try {
      await bookingService.checkIn(id);
      toast.success("Checked In Successfully");
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleCheckOut = async () => {
    try {
      if (!window.confirm("Confirm Guest Check-Out?")) return;
      await bookingService.checkOut(id);
      toast.success("Checked Out Successfully");
      fetchBooking();
    } catch (error) {
      if (error.requirePayment) {
        if (window.confirm(`${error.message}\n\nDo you want to FORCE check-out anyway?`)) {
          try {
            await bookingService.checkOut(id, true);
            toast.success("Checked Out (Forced)");
            fetchBooking();
          } catch (e) {
            toast.error(e.message || "Force Check-out Failed");
          }
        }
      } else {
        toast.error(error.message || "Action Failed");
      }
    }
  };

  const handleUpdateInquiry = async (status) => {
    const msg = prompt(`Any message/note for the user about status "${status}"?`, "");
    try {
      await bookingService.updateInquiryStatus(id, status, msg);
      toast.success(`Inquiry marked as ${status}`);
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Update Failed");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  if (!booking) return null;

  const user = booking.userId || {};
  const property = booking.propertyId || {};
  const room = booking.roomTypeId || {};

  const isInquiry = booking.isInquiry === true;
  const isPayAtHotel = booking.paymentStatus !== 'paid';
  const canMarkPaid = !isInquiry && isPayAtHotel && ['confirmed', 'checked_in'].includes(booking.bookingStatus);
  const canMarkNoShow = !isInquiry && ['confirmed'].includes(booking.bookingStatus);
  const canCheckIn = !isInquiry && booking.bookingStatus === 'confirmed';
  const canCheckOut = !isInquiry && booking.bookingStatus === 'checked_in';

  // Inquiry Specifics
  const pType = (property?.propertyType || '').toLowerCase();
  const isPG = ['pg', 'hostel'].includes(pType);
  const isRent = pType === 'rent';
  const isBuyPlot = ['buy', 'plot'].includes(pType);

  const checkInLabel = isPG || isRent ? 'Move-in' : (isBuyPlot ? 'Preferred Date' : 'Check-in');
  const checkOutLabel = isPG || isRent ? 'Move-out' : 'Check-out';
  const durationLabel = isPG || isRent ? (booking.totalNights >= 30 ? 'Months' : 'Days') : 'Nights';
  // For PG, 'totalNights' usually represents 'totalMonths' if stored that way, 
  // OR we need to convert. Assuming backend stores 'nights' for all, we might show 'Days' or 'Months' based on usage.
  // If backend purely stores 'nights' (e.g. 30), for PG we might want to say '1 Month' if it's exactly 30?
  // simpler for now: just use 'Month' if the logic implies it, but be careful.
  // Let's stick to safe labels: 
  // If isPG, show "Duration" instead of "Nights" to be generic if we can't be sure of the unit?
  // Or better, per user request: "termology ko thik karo".
  // Let's assume standard booking for PG is often 30 days = 1 Month. 
  // We will use "Duration" and show "X Days/Months".

  const meta = booking.inquiryMetadata || {};
  const srcKey = isInquiry ? inferSource(booking) : null;
  const src = srcKey ? LEAD_SOURCES[srcKey] : null;
  const activity = Array.isArray(meta.activity) ? [...meta.activity].reverse() : [];
  const roomOptions = Array.isArray(booking.propertyRoomTypes) ? booking.propertyRoomTypes : [];
  const pickedRoomId = String(room._id || '');
  const pickedSharing = meta.sharingType || sharingOf(room) || null;
  const roomLabel = room.name || meta.roomName || null;
  const roomRent = meta.roomPrice || room.pricePerNight || null;
  const perLabel = isPG || isRent ? ' / month' : ' / night';
  const coverImg = property.coverImage || property.propertyImages?.[0] || property.images?.[0];
  const addr = typeof property.address === 'object' && property.address
    ? (property.address.fullAddress || [property.address.area, property.address.city, property.address.state, property.address.pincode].filter(Boolean).join(', '))
    : (property.address || '');
  const facts = propertyFacts(property, pType).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const isOptionPicked = (rt) => (pickedRoomId && String(rt._id) === pickedRoomId) || (!pickedRoomId && pickedSharing && sharingOf(rt) === pickedSharing);
  const unitText = meta.beds > 1
    ? `${meta.beds} ${booking.bookingUnit === 'room' ? 'Rooms' : 'Beds'}`
    : booking.bookingUnit === 'entire' ? '1 Unit' : (booking.bookingUnit === 'bed' || isPG) ? '1 Bed' : '1 Room';


  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/hotel/bookings')} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Enquiry Details</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Status Card - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Enquiry ID</span>
            <p className="text-sm font-black text-gray-900 break-all">#{booking.bookingId || booking._id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${booking.bookingStatus === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
            booking.bookingStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
              booking.bookingStatus === 'no_show' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-100'
            }`}>
            {isInquiry ? booking.inquiryMetadata?.status?.replace('_', ' ') : booking.bookingStatus.replace('_', ' ')}
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
            {coverImg ? <img src={coverImg} alt="property" className="w-full h-full object-cover" /> : <MapPin size={24} className="text-gray-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Enquiry for property</p>
            <h2 className="font-black text-slate-900 text-base leading-tight uppercase">{property.propertyName || 'Property Name'}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 bg-gray-100 text-[9px] font-bold rounded text-gray-500 uppercase">{pType}</span>
              {property.propertyCode && <span className="px-2 py-0.5 bg-blue-50 text-[9px] font-bold rounded text-blue-700">{property.propertyCode}</span>}
            </div>
            {addr && <p className="text-xs text-gray-500 font-medium mt-1.5 leading-snug">{addr}</p>}
          </div>
        </div>

        {/* What the user is interested in */}
        {isInquiry && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <BedDouble size={16} className="text-gray-400" /> Interested In
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {isPG && <Kv k="Sharing" v={pickedSharing || 'Not selected'} />}
              {!isBuyPlot && <Kv k={isPG ? 'Room / Bed' : 'Room Type'} v={roomLabel || (isPG || isRent ? null : 'Not selected')} />}
              {!isBuyPlot && <Kv k={isPG || isRent ? 'Rent' : 'Room Price'} v={roomRent ? `${inr(roomRent)}${perLabel}` : null} />}
              {!isBuyPlot && <Kv k="Unit" v={unitText} />}
              {isRent && <Kv k="Type" v={property.rentDetails?.type} />}
              {isRent && <Kv k="Monthly Rent" v={inr(property.rentDetails?.monthlyRent)} />}
              {isBuyPlot && <Kv k="Asking Price" v={inr(property.buyDetails?.expectedPrice || property.plotDetails?.expectedPrice)} />}
              <Kv k="Budget" v={inr(meta.budget)} />
            </div>
            {isPG && !pickedSharing && (
              <p className="text-[11px] text-gray-500 mt-3">User has not picked a sharing yet. All options of this property are listed below.</p>
            )}
          </div>
        )}

        {/* Lead source + activity */}
        {isInquiry && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <Target size={16} className="text-gray-400" /> Lead Source
            </h3>
            {src && (
              <div className={`flex items-center gap-3 rounded-xl p-3 mb-3 ${src.cls}`}>
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0"><src.Icon size={18} /></div>
                <div>
                  <p className="font-black text-sm">{src.label}</p>
                  <p className="text-[11px] text-gray-600">{src.desc}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Kv k="Lead Created" v={dt(booking.createdAt)} />
              <Kv k="Platform" v={meta.platform === 'app' ? 'Hoomzo app' : meta.platform === 'web' ? 'Hoomzo website' : null} />
              <Kv k="Found From" v={meta.sourceScreen} />
            </div>
            {activity.length > 0 && (
              <div className="mt-4">
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-2">Activity</p>
                <div className="space-y-3">
                  {activity.map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1" />
                        {i < activity.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 mt-1" />}
                      </div>
                      <div className="pb-1">
                        <p className="text-xs font-bold text-gray-900">{a.label || LEAD_SOURCES[a.action]?.label || 'Activity'}</p>
                        <p className="text-[11px] text-gray-500">{[dt(a.at), a.screen, a.sharingType].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Listing facts for the property type */}
        {facts.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <Home size={16} className="text-gray-400" /> Property Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {facts.map(([k, v]) => <Kv key={k} k={k} v={v} />)}
            </div>
          </div>
        )}

        {/* Rooms / sharing options of the property */}
        {roomOptions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <BedDouble size={16} className="text-gray-400" /> {isPG ? 'Sharing Options' : 'Room Options'}
            </h3>
            <div className="space-y-2">
              {roomOptions.map((rt) => {
                const picked = isInquiry && isOptionPicked(rt);
                return (
                  <div key={rt._id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${picked ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">
                        {rt.name}
                        {picked && <span className="ml-2 text-[9px] font-black uppercase text-blue-700 bg-white border border-blue-200 rounded px-1.5 py-0.5">User's choice</span>}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {[sharingOf(rt), rt.bathroomType ? `${rt.bathroomType} bathroom` : null, rt.maxAdults ? `Up to ${rt.maxAdults} ${rt.maxAdults === 1 ? 'person' : 'people'}` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900 text-sm">{inr(rt.pricePerNight) || '-'}</p>
                      <p className="text-[10px] text-gray-500">{perLabel.replace(' / ', 'per ')}</p>
                      {rt.securityDeposit > 0 && <p className="text-[10px] text-gray-400">Deposit {inr(rt.securityDeposit)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Guest Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <User size={16} className="text-gray-400" /> Guest Details
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-base text-gray-500">
              {user.name?.[0] || 'G'}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{user.name || 'Guest'}</p>
              <p className="text-xs text-gray-500">Joined via App</p>
            </div>
          </div>
          {booking.isLocked ? (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 mb-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
                <Lock size={16} className="text-amber-600" />
                <span>Contact Details Locked</span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed mb-3">
                Full customer contact number and email are locked. An active partner subscription is required to unlock leads and communicate directly.
              </p>
              <button
                onClick={() => navigate('/hotel/subscriptions')}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl hover:from-amber-600 hover:to-orange-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
              >
                <Crown size={14} />
                <span>Subscribe to Unlock Contact</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <a href={`tel:${user.phone}`} className="flex flex-col p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Phone</p>
                <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-xs">
                  <Phone size={12} className="text-gray-400" /> {user.phone || 'N/A'}
                </div>
              </a>
              <div className="flex flex-col p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Email</p>
                <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-xs truncate">
                  <Mail size={12} className="text-gray-400" /> <span className="truncate">{user.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Total Guests</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">
              {booking.guests?.adults || 1} Adult{(booking.guests?.adults || 1) !== 1 ? 's' : ''}
              {booking.guests?.children > 0 ? `, ${booking.guests.children} Child${booking.guests.children !== 1 ? 'ren' : ''}` : ''}
            </p>
          </div>
        </div>

        {/* Stay Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" /> {isInquiry ? 'Inquiry Details' : (isPG || isRent ? 'Tenancy Details' : 'Stay Details')}
          </h3>
          <div className={`grid gap-3 mb-3 ${(!isBuyPlot && (!isInquiry || booking.checkOutDate)) ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">{checkInLabel}</p>
              <p className="font-bold text-gray-900 text-sm">{booking.checkInDate || booking.inquiryMetadata?.preferredDate ? new Date(booking.checkInDate || booking.inquiryMetadata?.preferredDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            {!isBuyPlot && (!isInquiry || booking.checkOutDate) && (
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">{checkOutLabel}</p>
                <p className="font-bold text-gray-900 text-sm">{booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            )}
          </div>
          {!isBuyPlot && (
            <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase">{isPG ? 'Selection' : 'Room Type'}</p>
                <p className="font-bold text-gray-900 text-sm">{room.name || room.type || 'Standard'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-900 font-bold">
                  {booking.bookingUnit === 'entire' ? '1 Unit' : booking.bookingUnit === 'bed' ? '1 Bed' : '1 Room'}
                </p>
                {!isInquiry && (
                  <p className="text-[10px] text-gray-500 font-medium">
                    {booking.totalNights} {durationLabel}
                  </p>
                )}
              </div>
            </div>
          )}

          {isInquiry && booking.inquiryMetadata?.message && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[9px] text-blue-400 font-bold uppercase mb-1">User Message</p>
              <p className="text-sm text-blue-900 font-medium italic">"{booking.inquiryMetadata.message}"</p>
            </div>
          )}
        </div>

        {/* Payment/Price Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" /> {isInquiry ? 'Financial Details' : 'Payment & Payout'}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">{isInquiry ? 'Expected Price / Budget' : 'Total Amount (Collect)'}</span>
              <span className="font-bold text-gray-900 text-base">{isInquiry ? (inr(meta.budget) || 'Not specified') : `₹${booking.totalAmount}`}</span>
            </div>
            {!isInquiry && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Partner Payout (Earnings)</span>
                <span className="font-bold text-green-700 text-sm">₹{booking.partnerPayout}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-gray-600">Status</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isInquiry ? 'Lead' : (booking.paymentStatus === 'paid' ? 'PAID' : 'PAY AT HOTEL')}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {isInquiry && (
          <>
            <button
              onClick={() => handleUpdateInquiry('scheduled')}
              className="bg-purple-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-1"
            >
              <Calendar size={18} /> Schedule Visit
            </button>
            <button
              onClick={() => handleUpdateInquiry('negotiating')}
              className="bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-1"
            >
              <Clock size={18} /> Negotiating
            </button>
            <button
              onClick={() => handleUpdateInquiry(isBuyPlot ? 'sold' : 'rented')}
              className="bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-2"
            >
              <CheckCircle size={20} /> Mark as {isBuyPlot ? 'Sold' : 'Rented'}
            </button>
            <button
              onClick={() => handleUpdateInquiry('dropped')}
              className="bg-white border border-gray-200 text-red-600 font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-2"
            >
              <XCircle size={20} /> Drop Lead
            </button>
          </>
        )}

        {canCheckIn && (
          <button
            onClick={handleCheckIn}
            className="col-span-2 bg-black text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <LogIn size={20} /> {checkInLabel} Guest
          </button>
        )}

        {canCheckOut && (
          <button
            onClick={handleCheckOut}
            className="col-span-2 bg-black text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <LogOut size={20} /> {checkOutLabel} Guest
          </button>
        )}

        {canMarkPaid && (
          <button
            onClick={handleMarkPaid}
            className={`bg-green-600 text-white font-bold py-3 rounded-xl shadow-green-200 active:scale-95 transition-transform flex items-center justify-center gap-2 ${canCheckIn || canCheckOut ? 'col-span-1' : 'col-span-2'}`}
          >
            <CheckCircle size={18} /> Mark Paid
          </button>
        )}

        {canMarkNoShow && (
          <button
            onClick={handleNoShow}
            className={`bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-transform flex items-center justify-center gap-2 ${canCheckIn || canCheckOut ? 'col-span-1' : 'col-span-2'}`}
          >
            <AlertTriangle size={18} /> No Show
          </button>
        )}
      </div>
    </div>
  );
};

export default PartnerBookingDetail;
