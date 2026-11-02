import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPin, IndianRupee, Users, BedDouble, ArrowLeft, CheckCircle,
  X, ChevronRight, Info, FileText, Image as ImageIcon, Shield, List,
  Clock, Map, Building2, Calendar, ChevronLeft, Phone, ExternalLink,
  Sparkles, Check, AlertCircle, Eye, Download, ShieldCheck, Home, Utensils
} from 'lucide-react';
import { propertyService } from '../../../services/apiService';

const PartnerPropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [activeNavSection, setActiveNavSection] = useState('overview');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await propertyService.getDetails(id);

        // Merge documents into property if they exist separately
        const propData = res.property || {};
        if (res.documents && res.documents.documents) {
          propData.documents = res.documents.documents;
        }

        setProperty(propData);
        setRoomTypes(res.roomTypes || []);
      } catch (e) {
        setError(e?.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  // ESC key to close document or lightbox viewer
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        if (selectedDocument) setSelectedDocument(null);
        if (selectedRoom) setSelectedRoom(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedDocument, lightboxImage, selectedRoom]);

  const scrollToSection = (secId) => {
    setActiveNavSection(secId);
    const element = document.getElementById(`section-${secId}`);
    if (element) {
      const yOffset = -120; // header + sticky tabs offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#005CA8] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Loading Property Details...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Unable to Load Property</h2>
        <p className="text-sm text-red-600 mb-6 max-w-sm">{error || 'Property not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005CA8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#004b8a] transition"
        >
          <ArrowLeft size={16} /> Go Back to Listings
        </button>
      </div>
    );
  }

  const pType = property?.propertyType?.toLowerCase() || '';
  const isPgOrHostel = ['pg', 'hostel', 'pg/co-living', 'co-living'].includes(pType);
  const isRealEstate = ['buy', 'plot', 'rent'].includes(pType);
  const totalImages = (property?.coverImage ? 1 : 0) + (property?.propertyImages?.length || 0);
  const allImages = [
    ...(property?.coverImage ? [property.coverImage] : []),
    ...(property?.propertyImages || [])
  ];

  // Price label helper
  const getPriceUnit = () => {
    if (['pg', 'hostel', 'rent'].includes(pType)) return '/ month';
    if (['buy', 'plot'].includes(pType)) return '';
    return '/ night';
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'photos', label: `Photos (${totalImages})` },
    ...(roomTypes.length > 0 || ['hotel', 'resort', 'villa', 'homestay', 'tent', 'hostel', 'pg'].includes(pType)
      ? [{ id: 'rooms', label: `Rooms (${roomTypes.length})` }]
      : []),
    { id: 'amenities', label: `Amenities (${property?.amenities?.length || 0})` },
    { id: 'location', label: 'Location' },
    { id: 'rules', label: 'Policies' },
    ...(!isPgOrHostel && property?.nearbyPlaces?.length > 0
      ? [{ id: 'nearby', label: `Nearby (${property.nearbyPlaces.length})` }]
      : []),
    ...(property?.documents?.length > 0
      ? [{ id: 'documents', label: `Docs (${property.documents.length})` }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 font-sans antialiased">
      {/* 1. TOP STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-full flex items-center justify-center text-gray-700 transition flex-shrink-0"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">{property.propertyName}</h1>
              <p className="text-[11px] text-gray-400 capitalize truncate">
                {property.propertyType} • {property.address?.city || 'Location'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs ${
                property.isLive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : property.status === 'published' || property.status === 'approved'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : property.status === 'rejected'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  property.isLive
                    ? 'bg-emerald-500 animate-pulse'
                    : property.status === 'rejected'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`}
              />
              {property.isLive ? 'Live' : property.status || 'Pending'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. REVIEW BANNER (IF PENDING REVIEW) */}
      {!property.isLive && property.status !== 'rejected' && (
        <div className="max-w-4xl mx-auto px-4 pt-3">
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock size={16} />
            </div>
            <div className="text-xs">
              <p className="font-bold text-amber-900">Team is reviewing your request</p>
              <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                Your listing details are currently under review. Usually confirmed within 24–48 hours.
                All information submitted is displayed below on this page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. HERO BANNER */}
      <div className="max-w-4xl mx-auto px-4 pt-3">
        <div className="relative w-full h-56 sm:h-72 rounded-3xl overflow-hidden shadow-sm bg-gray-200 border border-gray-100">
          {property.coverImage ? (
            <img
              src={property.coverImage}
              alt={property.propertyName}
              className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform duration-300"
              onClick={() => setLightboxImage(property.coverImage)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ImageIcon size={48} opacity={0.3} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 pointer-events-none" />

          {/* Type Badge */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold uppercase tracking-wider">
              {property.dynamicCategory?.displayName || property.propertyType}
            </span>
          </div>

          {/* Photo Count Pill */}
          <button
            onClick={() => scrollToSection('photos')}
            className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-gray-800 text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition"
          >
            <ImageIcon size={14} className="text-[#005CA8]" />
            <span>{totalImages} Photos</span>
          </button>

          {/* Title & Location */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-md mb-1.5">
              {property.propertyName}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-200 font-medium">
              <MapPin size={13} className="text-white flex-shrink-0" />
              <span className="truncate">
                {property.address?.fullAddress || `${property.address?.city || ''}, ${property.address?.state || ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MANAGE INVENTORY ACTION BUTTON */}
      <div className="max-w-4xl mx-auto px-4 pt-3">
        <button
          onClick={() => navigate(`/hotel/inventory/${id}`)}
          className="w-full bg-[#005CA8] hover:bg-[#004b8a] text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-between shadow-md shadow-blue-900/10 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center text-white flex-shrink-0">
              <Calendar size={22} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm sm:text-base">Manage Inventory</h3>
              <p className="text-blue-100 text-[11px] sm:text-xs">Availability, Rates & Manual Blocks</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-100 text-xs font-semibold">
            <span>Manage</span>
            <ChevronRight size={18} />
          </div>
        </button>
      </div>

      {/* 5. STICKY HORIZONTAL ANCHOR BAR */}
      <nav className="sticky top-[57px] z-30 bg-slate-50/95 backdrop-blur-md py-2.5 border-b border-gray-200/60 mt-3">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide py-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  activeNavSection === item.id
                    ? 'bg-[#005CA8] text-white border-[#005CA8] shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 6. MAIN CONTENT - ALL INFORMATION SHOWN ONE BY ONE */}
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">

        {/* SECTION 1: OVERVIEW / BASIC INFO */}
        <section id="section-overview" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#005CA8] flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Basic Information</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 uppercase">
              {property.propertyType}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Property Name</span>
              <p className="text-base font-semibold text-gray-900">{property.propertyName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Contact Number</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Phone size={14} className="text-emerald-600" />
                <span>{property.contactNumber || 'Not provided'}</span>
              </div>
            </div>

            {property.dynamicCategory?.displayName && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Category</span>
                <p className="text-sm font-semibold text-gray-900">{property.dynamicCategory.displayName}</p>
              </div>
            )}

            {/* Hotel / Resort Category & Star Rating */}
            {property.hotelCategory && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Hotel Category</span>
                <p className="text-sm font-semibold text-gray-900">{property.hotelCategory}</p>
              </div>
            )}
            {property.starRating && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Star Rating</span>
                <p className="text-sm font-semibold text-amber-500">★ {property.starRating} Star</p>
              </div>
            )}
            {property.resortType && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Resort Type</span>
                <p className="text-sm font-semibold text-gray-900 capitalize">{property.resortType}</p>
              </div>
            )}

            {/* PG Specific Info */}
            {pType === 'pg' && (
              <>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">PG Gender / Type</span>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{property.pgType || property.pgDetails?.gender || 'Co-ed'}</p>
                </div>
                {property.pgDetails?.occupancy && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Occupancy Type</span>
                    <p className="text-sm font-semibold text-gray-900">{property.pgDetails.occupancy}</p>
                  </div>
                )}
                {property.pgDetails?.securityDeposit && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Security Deposit</span>
                    <p className="text-sm font-semibold text-gray-900">₹{property.pgDetails.securityDeposit}</p>
                  </div>
                )}
                {property.pgDetails?.minStay && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Minimum Stay</span>
                    <p className="text-sm font-semibold text-gray-900">{property.pgDetails.minStay}</p>
                  </div>
                )}
              </>
            )}

            {/* Hostel Specific Info */}
            {pType === 'hostel' && property.hostelType && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Hostel Type</span>
                <p className="text-sm font-semibold text-gray-900 capitalize">{property.hostelType}</p>
              </div>
            )}

            {/* Real Estate / Plot details */}
            {pType === 'plot' && property.plotDetails && (
              <>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Plot Area</span>
                  <p className="text-sm font-semibold text-gray-900">{property.plotDetails.plotArea} {property.plotDetails.unit || 'sqyrd'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Expected Price</span>
                  <p className="text-sm font-semibold text-emerald-700">₹{property.plotDetails.expectedPrice?.toLocaleString() || 'N/A'}</p>
                </div>
                {property.plotDetails.facing && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Facing</span>
                    <p className="text-sm font-semibold text-gray-900">{property.plotDetails.facing}</p>
                  </div>
                )}
                {property.plotDetails.landType && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Land Type</span>
                    <p className="text-sm font-semibold text-gray-900">{property.plotDetails.landType}</p>
                  </div>
                )}
              </>
            )}

            {/* Real Estate / Buy details */}
            {pType === 'buy' && property.buyDetails && (
              <>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Property Type</span>
                  <p className="text-sm font-semibold text-gray-900">{property.buyDetails.type || 'Residential'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Expected Price</span>
                  <p className="text-sm font-semibold text-emerald-700">₹{property.buyDetails.expectedPrice?.toLocaleString() || 'N/A'}</p>
                </div>
                {property.buyDetails.area?.carpet && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Carpet Area</span>
                    <p className="text-sm font-semibold text-gray-900">{property.buyDetails.area.carpet} {property.buyDetails.area.unit || 'sqft'}</p>
                  </div>
                )}
              </>
            )}

            {/* Real Estate / Rent details */}
            {pType === 'rent' && property.rentDetails && (
              <>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Type</span>
                  <p className="text-sm font-semibold text-gray-900">{property.rentDetails.type || 'Apartment'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Monthly Rent</span>
                  <p className="text-sm font-semibold text-emerald-700">₹{property.rentDetails.monthlyRent?.toLocaleString() || 'N/A'}</p>
                </div>
                {(property.rentDetails.securityDeposit !== undefined || property.rentDetails.maintenanceCharges !== undefined) && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Security</span>
                    <p className="text-sm font-semibold text-gray-900">₹{(property.rentDetails.securityDeposit ?? property.rentDetails.maintenanceCharges)?.toLocaleString() || '0'}</p>
                  </div>
                )}
                {property.rentDetails.furnishing && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Furnishing</span>
                    <p className="text-sm font-semibold text-gray-900">{property.rentDetails.furnishing}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="pt-3 border-t border-gray-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Description
              </span>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                {property.description}
              </p>
            </div>
          )}

          {/* PG Food Included Section */}
          {pType === 'pg' && property.pgDetails?.foodIncluded && (
            <div className="pt-3 border-t border-gray-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Food Included
              </span>
              <div className="flex flex-wrap gap-2">
                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                  <span
                    key={meal}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      property.pgDetails.foodIncluded[meal]
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Utensils size={13} />
                    <span className="capitalize">{meal}</span>
                    {property.pgDetails.foodIncluded[meal] ? '✓' : '✗'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: PHOTOS GALLERY */}
        <section id="section-photos" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ImageIcon size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Photos & Media</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {totalImages} Photos
            </span>
          </div>

          {allImages.length > 0 ? (
            <div className="space-y-3">
              {/* Cover Photo */}
              {property.coverImage && (
                <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden shadow-sm bg-gray-100 border border-gray-200 group">
                  <img
                    src={property.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover group-hover:scale-102 transition duration-300 cursor-pointer"
                    onClick={() => setLightboxImage(property.coverImage)}
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white text-[11px] font-bold flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" /> Cover Photo
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
              )}

              {/* Gallery Images Grid */}
              {property.propertyImages && property.propertyImages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gallery Images</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {property.propertyImages.map((img, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer"
                        onClick={() => setLightboxImage(img)}
                      >
                        <img
                          src={img}
                          alt={`Gallery ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye size={20} className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
              <p>No photos added yet.</p>
            </div>
          )}
        </section>

        {/* SECTION 3: ROOMS & PRICING */}
        {(roomTypes.length > 0 || ['hotel', 'resort', 'villa', 'homestay', 'tent', 'hostel', 'pg'].includes(pType)) && (
          <section id="section-rooms" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BedDouble size={18} />
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  {pType === 'tent' ? 'Tent & Units Pricing' : 'Rooms & Pricing'}
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {roomTypes.length} Types
              </span>
            </div>

            {roomTypes.length > 0 ? (
              <div className="space-y-4">
                {roomTypes.map((room) => (
                  <div
                    key={room._id}
                    className="p-4 bg-slate-50/70 border border-gray-200 rounded-2xl space-y-3 hover:border-blue-200 transition"
                  >
                    {/* Room Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">{room.name}</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {room.roomCategory && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                              {room.roomCategory}
                            </span>
                          )}
                          {room.inventoryType && (
                            <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 text-[10px] font-medium capitalize">
                              {room.inventoryType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-700">₹{room.pricePerNight}</div>
                        <span className="text-[11px] text-gray-400 font-medium">{getPriceUnit()}</span>
                      </div>
                    </div>

                    {/* Room Capacity Badges */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <Users size={14} className="mx-auto text-gray-400 mb-0.5" />
                        <p className="text-xs font-bold text-gray-900">{room.maxAdults || 0}</p>
                        <p className="text-[9px] uppercase font-semibold text-gray-400">Adults</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <Users size={14} className="mx-auto text-gray-400 mb-0.5" />
                        <p className="text-xs font-bold text-gray-900">{room.maxChildren || 0}</p>
                        <p className="text-[9px] uppercase font-semibold text-gray-400">Children</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <BedDouble size={14} className="mx-auto text-gray-400 mb-0.5" />
                        <p className="text-xs font-bold text-gray-900">{room.totalInventory || 0}</p>
                        <p className="text-[9px] uppercase font-semibold text-gray-400">Units</p>
                      </div>
                    </div>

                    {/* Extra Pricing Details */}
                    {(room.extraAdultPrice > 0 || room.extraChildPrice > 0) && (
                      <div className="flex items-center gap-4 text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100">
                        {room.extraAdultPrice > 0 && (
                          <span>Extra Adult: <strong className="text-gray-900">₹{room.extraAdultPrice}</strong></span>
                        )}
                        {room.extraChildPrice > 0 && (
                          <span>Extra Child: <strong className="text-gray-900">₹{room.extraChildPrice}</strong></span>
                        )}
                      </div>
                    )}

                    {/* Room Amenities */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {room.amenities.map((am, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-700 font-medium flex items-center gap-1"
                          >
                            <Check size={11} className="text-emerald-500" />
                            {am}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Room Photos Thumbnails */}
                    {room.images && room.images.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                          Room Photos ({room.images.length})
                        </p>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                          {room.images.map((rImg, rIdx) => (
                            <img
                              key={rIdx}
                              src={rImg}
                              alt=""
                              onClick={() => {
                                setSelectedRoom(room);
                                setCurrentImageIndex(rIdx);
                              }}
                              className="w-16 h-16 rounded-xl object-cover cursor-pointer border border-gray-200 hover:opacity-80 transition flex-shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expand / View Full Room Details Button */}
                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setCurrentImageIndex(0);
                      }}
                      className="w-full mt-2 py-2 bg-white hover:bg-gray-100 rounded-xl text-xs font-bold text-[#005CA8] border border-gray-200 flex items-center justify-center gap-1.5 transition active:scale-98"
                    >
                      <Eye size={14} /> View Room Modal Details
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <BedDouble size={32} className="mx-auto mb-2 opacity-30" />
                <p>No room types configured yet.</p>
              </div>
            )}
          </section>
        )}

        {/* SECTION 4: AMENITIES */}
        <section id="section-amenities" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <List size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Amenities & Facilities</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {property.amenities?.length || 0} Listed
            </span>
          </div>

          {property.amenities && property.amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity, i) => (
                <span
                  key={i}
                  className="px-3 py-2 bg-slate-50 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-2 shadow-2xs"
                >
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  {amenity}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <List size={28} className="mx-auto mb-1.5 opacity-30" />
              <p>No amenities added.</p>
            </div>
          )}
        </section>

        {/* SECTION 5: LOCATION & ADDRESS */}
        <section id="section-location" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Location & Address</h2>
            </div>
            {property.address?.city && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {property.address.city}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Full Address</span>
              <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                {property.address?.fullAddress || 'Address not specified'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs text-gray-600">
                {property.address?.area && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Area</span>
                    <strong>{property.address.area}</strong>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">City</span>
                  <strong>{property.address?.city || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">State</span>
                  <strong>{property.address?.state || 'N/A'}</strong>
                </div>
                {property.address?.pincode && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Pincode</span>
                    <strong>{property.address.pincode}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Google Maps External Button */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                property.address?.fullAddress || `${property.propertyName} ${property.address?.city || ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#005CA8] rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <ExternalLink size={14} /> Open Location in Google Maps
            </a>
          </div>
        </section>

        {/* SECTION 6: RULES & POLICIES */}
        <section id="section-rules" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Rules & Policies</h2>
            </div>
          </div>

          <div className="space-y-4">
            {/* Check-in / Check-out (For Stay types) */}
            {!['pg', 'hostel', 'rent', 'buy', 'plot'].includes(pType) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Check-in Time</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{property.checkInTime || '12:00 PM'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Check-out Time</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{property.checkOutTime || '11:00 AM'}</p>
                </div>
              </div>
            )}

            {/* Cancellation Policy */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Cancellation Policy</span>
              <p className="text-xs text-gray-700 bg-slate-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                {property.cancellationPolicy || 'Standard cancellation policy applies.'}
              </p>
            </div>

            {/* House Rules */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">House Rules</span>
              {property.houseRules && property.houseRules.length > 0 ? (
                <ul className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-gray-100">
                  {property.houseRules.map((rule, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic bg-slate-50 p-3 rounded-xl border border-gray-100">
                  No specific house rules specified.
                </p>
              )}
            </div>

            {/* PG Rules */}
            {pType === 'pg' && property.pgDetails?.rules && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">PG Specific Rules</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-gray-100">
                    <span className="text-gray-400 text-[10px] block">Smoking</span>
                    <strong className={property.pgDetails.rules.smoking ? 'text-amber-600' : 'text-emerald-600'}>
                      {property.pgDetails.rules.smoking ? 'Allowed' : 'Not Allowed'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-gray-100">
                    <span className="text-gray-400 text-[10px] block">Drinking</span>
                    <strong className={property.pgDetails.rules.drinking ? 'text-amber-600' : 'text-emerald-600'}>
                      {property.pgDetails.rules.drinking ? 'Allowed' : 'Not Allowed'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-gray-100">
                    <span className="text-gray-400 text-[10px] block">Visitors</span>
                    <strong className={property.pgDetails.rules.visitors ? 'text-emerald-600' : 'text-amber-600'}>
                      {property.pgDetails.rules.visitors ? 'Allowed' : 'Not Allowed'}
                    </strong>
                  </div>
                  {property.pgDetails.rules.curfew && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-gray-100">
                      <span className="text-gray-400 text-[10px] block">Curfew Time</span>
                      <strong className="text-gray-900">{property.pgDetails.rules.curfew}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 7: NEARBY PLACES */}
        {!isPgOrHostel && property.nearbyPlaces && property.nearbyPlaces.length > 0 && (
          <section id="section-nearby" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Map size={18} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Nearby Places</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {property.nearbyPlaces.length} Places
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {property.nearbyPlaces.map((place, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {place.name?.charAt(0) || '•'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{place.name}</p>
                    <p className="text-[11px] text-gray-500 capitalize">
                      {place.type?.replace('_', ' ')} • {place.distanceKm} km
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 8: DOCUMENTS & VERIFICATION */}
        {property.documents && property.documents.length > 0 && (
          <section id="section-documents" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#005CA8] flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Uploaded Documents</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {property.documents.length} Files
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {property.documents.map((doc, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-slate-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-3 hover:border-blue-200 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      doc.fileUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-gray-900 truncate">{doc.name}</p>
                      <span className={`text-[10px] font-bold uppercase ${doc.fileUrl ? 'text-emerald-600' : 'text-red-500'}`}>
                        {doc.fileUrl ? 'Uploaded' : 'Missing'}
                      </span>
                    </div>
                  </div>

                  {doc.fileUrl && (
                    <button
                      onClick={() => setSelectedDocument(doc)}
                      className="px-3 py-1.5 bg-white hover:bg-[#005CA8] hover:text-white border border-gray-200 text-[#005CA8] rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 flex-shrink-0 shadow-2xs"
                    >
                      <Eye size={13} /> View
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 7. FULLSCREEN LIGHTBOX PHOTO VIEWER */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition shadow-lg z-10"
          >
            <X size={22} />
          </button>
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 8. ROOM DETAILS MODAL (FOR DEEP INSPECTION & CAROUSEL) */}
      {selectedRoom && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRoom(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-[100] rounded-t-[2rem] shadow-2xl transition-transform duration-300 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-full">
            {/* Image Carousel */}
            <div
              className="relative h-60 sm:h-72 w-full bg-gray-100 rounded-t-[2rem] overflow-hidden flex-shrink-0"
              onTouchStart={(e) => {
                setTouchEnd(null);
                setTouchStart(e.targetTouches[0].clientX);
              }}
              onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
              onTouchEnd={() => {
                if (!touchStart || !touchEnd) return;
                const distance = touchStart - touchEnd;
                if (distance > 50 && currentImageIndex < (selectedRoom.images?.length || 1) - 1) {
                  setCurrentImageIndex(currentImageIndex + 1);
                }
                if (distance < -50 && currentImageIndex > 0) {
                  setCurrentImageIndex(currentImageIndex - 1);
                }
              }}
            >
              {selectedRoom.images && selectedRoom.images.length > 0 ? (
                <img
                  src={selectedRoom.images[currentImageIndex]}
                  className="w-full h-full object-cover transition-all duration-300"
                  alt={selectedRoom.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <BedDouble size={48} opacity={0.3} />
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedRoom(null);
                  setCurrentImageIndex(0);
                }}
                className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-full text-gray-800 hover:bg-white transition shadow-lg z-10"
              >
                <X size={20} />
              </button>

              {/* Navigation Arrows */}
              {selectedRoom.images && selectedRoom.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-md rounded-full text-gray-800 hover:bg-white shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(Math.min(selectedRoom.images.length - 1, currentImageIndex + 1))}
                    disabled={currentImageIndex === selectedRoom.images.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-md rounded-full text-gray-800 hover:bg-white shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {selectedRoom.images?.length > 1 && (
                <span className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-medium shadow-lg">
                  {currentImageIndex + 1} / {selectedRoom.images.length}
                </span>
              )}
            </div>

            {/* Room Details Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-white space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{selectedRoom.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide">
                      {selectedRoom.roomCategory}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium capitalize">
                      {selectedRoom.inventoryType}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-700">₹{selectedRoom.pricePerNight}</div>
                  <div className="text-xs text-gray-400 font-medium">{getPriceUnit()}</div>
                </div>
              </div>

              {/* Room Capacity */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Room Capacity</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center gap-1">
                    <Users size={20} className="text-gray-400 mb-1" />
                    <span className="text-base sm:text-lg font-bold text-gray-900">{selectedRoom.maxAdults}</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase">Adults</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center gap-1">
                    <Users size={20} className="text-gray-400 mb-1" />
                    <span className="text-base sm:text-lg font-bold text-gray-900">{selectedRoom.maxChildren}</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase">Children</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center gap-1">
                    <BedDouble size={20} className="text-gray-400 mb-1" />
                    <span className="text-base sm:text-lg font-bold text-gray-900">{selectedRoom.totalInventory}</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase">Units</span>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowPricing(!showPricing)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <IndianRupee size={16} className="text-emerald-600" />
                    Pricing Details
                  </span>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${showPricing ? 'rotate-90' : ''}`} />
                </button>
                {showPricing && (
                  <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Base Price</span>
                      <span className="font-medium text-gray-900">₹{selectedRoom.pricePerNight} {getPriceUnit()}</span>
                    </div>
                    {selectedRoom.extraAdultPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Extra Adult Price</span>
                        <span className="font-medium text-gray-900">₹{selectedRoom.extraAdultPrice}</span>
                      </div>
                    )}
                    {selectedRoom.extraChildPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Extra Child Price</span>
                        <span className="font-medium text-gray-900">₹{selectedRoom.extraChildPrice}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Room Amenities */}
              {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Room Amenities</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRoom.amenities.map((am, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 bg-white border border-gray-100 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={12} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate">{am}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 9. DOCUMENT PREVIEW MODAL */}
      {selectedDocument && (
        <>
          <div
            className="fixed inset-0 bg-black/90 z-[110] backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDocument(null)}
          />
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex-none px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedDocument.name}</h3>
                    <p className="text-xs text-gray-500">Document Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedDocument.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={16} />
                    Download
                  </a>
                  <button
                    onClick={() => setSelectedDocument(null)}
                    className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Document Display Area */}
              <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-6 relative">
                <div className="relative max-w-full max-h-full">
                  <img
                    src={selectedDocument.fileUrl}
                    alt={selectedDocument.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-full h-64 items-center justify-center text-gray-400 flex-col gap-2">
                    <FileText size={48} opacity={0.3} />
                    <p className="text-sm">Unable to preview this document directly</p>
                    <a
                      href={selectedDocument.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 px-4 py-2 bg-[#005CA8] text-white rounded-lg text-sm font-semibold hover:bg-[#004b8a]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open in New Tab
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-none px-6 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Click outside or press ESC to close</span>
                  <span className="text-emerald-600 font-semibold">
                    {selectedDocument.type?.toUpperCase() || 'DOCUMENT'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PartnerPropertyDetails;
