import React, { useState, useEffect } from 'react';
import { X, Loader2, Upload, Trash2, Star } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const toList = (arr) => (Array.isArray(arr) ? arr.join(', ') : '');
const fromList = (str) => str.split(',').map(s => s.trim()).filter(Boolean);
const numOrUndef = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

const buildForm = (p) => ({
    propertyName: p.propertyName || '',
    contactNumber: p.contactNumber || '',
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    address: {
        country: p.address?.country || '',
        state: p.address?.state || '',
        city: p.address?.city || '',
        area: p.address?.area || '',
        fullAddress: p.address?.fullAddress || '',
        pincode: p.address?.pincode || '',
    },
    coverImage: p.coverImage || '',
    propertyImages: Array.isArray(p.propertyImages) ? p.propertyImages.map(i => (typeof i === 'string' ? i : i?.url)).filter(Boolean) : [],
    amenities: toList(p.amenities),
    houseRules: toList(p.houseRules),
    checkInTime: p.checkInTime || '',
    checkOutTime: p.checkOutTime || '',
    cancellationPolicy: p.cancellationPolicy || '',
    hotelCategory: p.hotelCategory || '',
    starRating: p.starRating ?? '',
    availabilityStatus: p.availabilityStatus || 'Available',
    videoUrl: p.videoUrl || '',
    virtualTourLink: p.virtualTourLink || '',
    isVerified: !!p.isVerified,
    isFeatured: !!p.isFeatured,
    isUrgent: !!p.isUrgent,
    isNegotiable: !!p.isNegotiable,
    monthlyRent: p.rentDetails?.monthlyRent ?? '',
    buyPrice: p.buyDetails?.expectedPrice ?? '',
    plotPrice: p.plotDetails?.expectedPrice ?? '',
});

const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-black transition-all';
const labelCls = 'block text-[10px] font-bold uppercase text-gray-500 mb-1';

const Field = ({ label, children, className = '' }) => (
    <div className={className}>
        <label className={labelCls}>{label}</label>
        {children}
    </div>
);

const Section = ({ title, children }) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">{title}</h4>
        {children}
    </div>
);

const EditPropertyModal = ({ isOpen, onClose, propertyId, onSaved }) => {
    const [form, setForm] = useState(null);
    const [propertyType, setPropertyType] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!isOpen || !propertyId) return;
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setForm(null);
                const data = await adminService.getHotelDetails(propertyId);
                if (!cancelled && data.success) {
                    setPropertyType(data.hotel.propertyType);
                    setForm(buildForm(data.hotel));
                }
            } catch {
                toast.error('Failed to load property');
                onClose();
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, propertyId]);

    if (!isOpen) return null;

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    const setAddr = (key, value) => setForm(prev => ({ ...prev, address: { ...prev.address, [key]: value } }));

    const uploadFiles = async (files) => {
        const fd = new FormData();
        Array.from(files).forEach(f => fd.append('images', f));
        setUploading(true);
        try {
            const res = await adminService.uploadImage(fd);
            return res.urls || [];
        } catch {
            toast.error('Image upload failed');
            return [];
        } finally {
            setUploading(false);
        }
    };

    const handleCoverUpload = async (e) => {
        if (!e.target.files?.length) return;
        const [url] = await uploadFiles([e.target.files[0]]);
        if (url) set('coverImage', url);
        e.target.value = '';
    };

    const handleGalleryUpload = async (e) => {
        if (!e.target.files?.length) return;
        const urls = await uploadFiles(e.target.files);
        if (urls.length) set('propertyImages', [...form.propertyImages, ...urls]);
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.propertyName.trim()) return toast.error('Property name is required');
        if (!form.coverImage) return toast.error('Cover image is required');

        const payload = {
            propertyName: form.propertyName.trim(),
            contactNumber: form.contactNumber,
            shortDescription: form.shortDescription,
            description: form.description,
            address: form.address,
            coverImage: form.coverImage,
            propertyImages: form.propertyImages,
            amenities: fromList(form.amenities),
            houseRules: fromList(form.houseRules),
            checkInTime: form.checkInTime,
            checkOutTime: form.checkOutTime,
            cancellationPolicy: form.cancellationPolicy,
            videoUrl: form.videoUrl,
            virtualTourLink: form.virtualTourLink,
            availabilityStatus: form.availabilityStatus,
            isVerified: form.isVerified,
            isFeatured: form.isFeatured,
            isUrgent: form.isUrgent,
            isNegotiable: form.isNegotiable,
        };
        if (propertyType === 'hotel') {
            payload.hotelCategory = form.hotelCategory;
            payload.starRating = numOrUndef(form.starRating);
        }
        if (propertyType === 'rent') payload.rentDetails = { monthlyRent: numOrUndef(form.monthlyRent) };
        if (propertyType === 'buy') payload.buyDetails = { expectedPrice: numOrUndef(form.buyPrice) };
        if (propertyType === 'plot') payload.plotDetails = { expectedPrice: numOrUndef(form.plotPrice) };

        try {
            setSaving(true);
            const res = await adminService.updateHotel(propertyId, payload);
            if (res.success) {
                toast.success('Property updated successfully');
                onSaved?.(res.property);
                onClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update property');
        } finally {
            setSaving(false);
        }
    };

    const isStay = !['rent', 'buy', 'plot'].includes(propertyType);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Edit Property</h3>
                        {propertyType && <p className="text-[10px] font-bold uppercase text-gray-400">{propertyType}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
                </div>

                {loading || !form ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
                        <Section title="Basic Info">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Property Name *"><input className={inputCls} value={form.propertyName} onChange={e => set('propertyName', e.target.value)} /></Field>
                                <Field label="Contact Number"><input className={inputCls} value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} /></Field>
                                {propertyType === 'hotel' && (
                                    <>
                                        <Field label="Hotel Category">
                                            <select className={inputCls} value={form.hotelCategory} onChange={e => set('hotelCategory', e.target.value)}>
                                                <option value="">—</option>
                                                <option value="Budget">Budget</option>
                                                <option value="Premium">Premium</option>
                                                <option value="Luxury">Luxury</option>
                                            </select>
                                        </Field>
                                        <Field label="Star Rating (1-7)"><input type="number" min="1" max="7" className={inputCls} value={form.starRating} onChange={e => set('starRating', e.target.value)} /></Field>
                                    </>
                                )}
                                {propertyType === 'rent' && <Field label="Monthly Rent (₹)"><input type="number" min="0" className={inputCls} value={form.monthlyRent} onChange={e => set('monthlyRent', e.target.value)} /></Field>}
                                {propertyType === 'buy' && <Field label="Expected Price (₹)"><input type="number" min="0" className={inputCls} value={form.buyPrice} onChange={e => set('buyPrice', e.target.value)} /></Field>}
                                {propertyType === 'plot' && <Field label="Expected Price (₹)"><input type="number" min="0" className={inputCls} value={form.plotPrice} onChange={e => set('plotPrice', e.target.value)} /></Field>}
                                {!isStay && (
                                    <Field label="Availability">
                                        <select className={inputCls} value={form.availabilityStatus} onChange={e => set('availabilityStatus', e.target.value)}>
                                            <option value="Available">Available</option>
                                            <option value="Sold">Sold</option>
                                            <option value="Rented">Rented</option>
                                        </select>
                                    </Field>
                                )}
                            </div>
                            <Field label="Short Description"><input className={inputCls} value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} /></Field>
                            <Field label="Description"><textarea rows={4} className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} /></Field>
                        </Section>

                        <Section title="Location">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Area"><input className={inputCls} value={form.address.area} onChange={e => setAddr('area', e.target.value)} /></Field>
                                <Field label="City"><input className={inputCls} value={form.address.city} onChange={e => setAddr('city', e.target.value)} /></Field>
                                <Field label="State"><input className={inputCls} value={form.address.state} onChange={e => setAddr('state', e.target.value)} /></Field>
                                <Field label="Country"><input className={inputCls} value={form.address.country} onChange={e => setAddr('country', e.target.value)} /></Field>
                                <Field label="Pincode"><input className={inputCls} value={form.address.pincode} onChange={e => setAddr('pincode', e.target.value)} /></Field>
                            </div>
                            <Field label="Full Address"><input className={inputCls} value={form.address.fullAddress} onChange={e => setAddr('fullAddress', e.target.value)} /></Field>
                        </Section>

                        <Section title="Images">
                            <div className="flex flex-wrap gap-3">
                                <div className="relative w-28 h-28 rounded-lg overflow-hidden border-2 border-black bg-gray-50">
                                    {form.coverImage && <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />}
                                    <span className="absolute top-1 left-1 bg-black text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5"><Star size={8} /> Cover</span>
                                    <label className="absolute bottom-1 right-1 bg-white/90 hover:bg-white p-1.5 rounded cursor-pointer shadow">
                                        <Upload size={12} />
                                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
                                    </label>
                                </div>
                                {form.propertyImages.map((url, i) => (
                                    <div key={url + i} className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 group">
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button type="button" title="Make cover" onClick={() => set('coverImage', url)} className="bg-white p-1.5 rounded"><Star size={12} /></button>
                                            <button type="button" title="Remove" onClick={() => set('propertyImages', form.propertyImages.filter((_, idx) => idx !== i))} className="bg-white p-1.5 rounded text-red-600"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                                <label className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 hover:border-black flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-black transition-colors">
                                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                    <span className="text-[9px] font-bold uppercase mt-1">Add Photos</span>
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploading} />
                                </label>
                            </div>
                        </Section>

                        <Section title="Amenities & Policies">
                            <Field label="Amenities (comma separated)"><input className={inputCls} value={form.amenities} onChange={e => set('amenities', e.target.value)} placeholder="WiFi, Parking, AC" /></Field>
                            <Field label="House Rules (comma separated)"><input className={inputCls} value={form.houseRules} onChange={e => set('houseRules', e.target.value)} /></Field>
                            {isStay && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field label="Check-in Time"><input className={inputCls} value={form.checkInTime} onChange={e => set('checkInTime', e.target.value)} placeholder="12:00 PM" /></Field>
                                    <Field label="Check-out Time"><input className={inputCls} value={form.checkOutTime} onChange={e => set('checkOutTime', e.target.value)} placeholder="11:00 AM" /></Field>
                                </div>
                            )}
                            <Field label="Cancellation Policy"><textarea rows={2} className={inputCls} value={form.cancellationPolicy} onChange={e => set('cancellationPolicy', e.target.value)} /></Field>
                        </Section>

                        <Section title="Media Links">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Video URL"><input className={inputCls} value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} /></Field>
                                <Field label="Virtual Tour Link"><input className={inputCls} value={form.virtualTourLink} onChange={e => set('virtualTourLink', e.target.value)} /></Field>
                            </div>
                        </Section>

                        <Section title="Flags">
                            <div className="flex flex-wrap gap-4">
                                {[['isVerified', 'Verified'], ['isFeatured', 'Featured'], ['isUrgent', 'Urgent'], ['isNegotiable', 'Negotiable']].map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-700 cursor-pointer">
                                        <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} className="accent-black" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </Section>
                    </form>
                )}

                <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || uploading || !form}
                        className="px-5 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <Loader2 size={12} className="animate-spin" />} Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPropertyModal;
