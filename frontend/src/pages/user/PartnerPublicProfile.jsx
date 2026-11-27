import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, User, Building2, CalendarDays, Loader2 } from 'lucide-react';
import { propertyService, userService } from '../../services/apiService';
import PropertyCard from '../../components/user/PropertyCard';

const TYPE_LABEL = { pg: 'PG', hostel: 'Hostel', rent: 'Rent', buy: 'Buy', plot: 'Plot', hotel: 'Hotel', villa: 'Villa', resort: 'Resort', homestay: 'Homestay' };
const typeLabel = (t) => TYPE_LABEL[String(t || '').toLowerCase()] || (t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : 'Other');

// Public profile of a Top Rated Partner: who they are and every live listing they posted
const PartnerPublicProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [partner, setPartner] = useState(null);
    const [properties, setProperties] = useState([]);
    const [savedIds, setSavedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [type, setType] = useState('all');

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError('');
        Promise.all([
            propertyService.getPartnerProfile(id),
            propertyService.getPublic({ partner: id }),
            localStorage.getItem('token') ? userService.getSavedHotels().catch(() => null) : Promise.resolve(null),
        ])
            .then(([p, list, saved]) => {
                if (!alive) return;
                setPartner(p);
                setProperties(Array.isArray(list) ? list : list?.properties || []);
                const s = saved?.savedHotels || [];
                setSavedIds(s.map((h) => (typeof h === 'object' ? h._id : h)));
            })
            .catch((e) => alive && setError(e?.message || 'Partner not found'))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [id]);

    const types = useMemo(() => {
        const counts = {};
        properties.forEach((p) => { const k = String(p.propertyType || 'other').toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
        return Object.entries(counts);
    }, [properties]);
    const shown = type === 'all' ? properties : properties.filter((p) => String(p.propertyType || 'other').toLowerCase() === type);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#005CA8]" /></div>;
    }

    if (error || !partner) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-gray-600 font-semibold">{error || 'Partner not found'}</p>
                <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl bg-[#005CA8] text-white font-bold text-sm">Go Home</button>
            </div>
        );
    }

    const place = [partner.address?.city, partner.address?.state].filter(Boolean).join(', ');
    const since = partner.partnerSince ? new Date(partner.partnerSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
                    <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="p-2 -ml-2 rounded-full hover:bg-gray-100" aria-label="Back">
                        <ArrowLeft className="w-5 h-5 text-gray-800" />
                    </button>
                    <h1 className="font-bold text-gray-900 truncate">Partner Profile</h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 pt-5">
                {/* Profile */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-[#005CA8] flex items-center justify-center shrink-0">
                        {partner.profileImage ? <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover" /> : <User className="w-9 h-9 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-extrabold text-gray-900 truncate">{partner.name}</h2>
                            {partner.isVerified && <BadgeCheck className="w-5 h-5 text-[#005CA8] shrink-0" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                            {partner.plan?.name && <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#005CA8] text-xs font-bold">{partner.plan.name}</span>}
                            {place && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{place}</span>}
                            {since && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Partner since {since}</span>}
                        </div>
                    </div>
                    <div className="flex gap-3 sm:gap-4">
                        <div className="px-4 py-2.5 rounded-xl bg-gray-50 text-center min-w-[88px]">
                            <p className="text-[10px] font-bold text-gray-500 tracking-wide">LISTINGS</p>
                            <p className="text-lg font-extrabold text-gray-900">{properties.length}</p>
                        </div>
                        <div className="px-4 py-2.5 rounded-xl bg-gray-50 text-center min-w-[88px]">
                            <p className="text-[10px] font-bold text-gray-500 tracking-wide">EXPERIENCE</p>
                            <p className="text-lg font-extrabold text-gray-900">{partner.experienceYears || 0}+ Yrs</p>
                        </div>
                    </div>
                </div>

                {/* Listings */}
                <div className="mt-7 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-extrabold text-gray-900">Properties by {partner.name}</h3>
                </div>

                {types.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
                        {[['all', properties.length], ...types].map(([k, n]) => (
                            <button
                                key={k}
                                onClick={() => setType(k)}
                                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold border transition-colors ${type === k ? 'bg-[#005CA8] text-white border-[#005CA8]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                            >
                                {k === 'all' ? 'All' : typeLabel(k)} ({n})
                            </button>
                        ))}
                    </div>
                )}

                {shown.length === 0 ? (
                    <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500 font-medium">No live properties right now.</div>
                ) : (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {shown.map((p) => (
                            <PropertyCard key={p._id} property={p} isSaved={savedIds.includes(p._id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerPublicProfile;
