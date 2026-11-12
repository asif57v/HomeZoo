import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, MapPin, Edit, Save, Camera, CreditCard, Bell, Loader2, Lock } from 'lucide-react';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import usePartnerStore from '../store/partnerStore';
import { userService, authService, hotelService } from '../../../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { isFlutterApp, openFlutterCamera, uploadBase64Image } from '../../../utils/flutterBridge';
import { pickImageSource, pickFlutterImages, pickGalleryFiles } from '../../../utils/imageSource';
import { requestNotificationPermission, detectPlatform } from '../../../utils/firebase';
import { compressImage } from '../../../utils/imageCompressor';

const Field = ({ label, value, icon: Icon, isEditing, onChange, isReadOnly = false, badge = null, helperText = null }) => {
    const canEdit = isEditing && !isReadOnly;

    return (
        <div className="mb-4 sm:mb-5 group">
            <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] truncate">{label}</label>
                {badge}
            </div>
            <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 min-w-0 ${
                canEdit
                    ? 'bg-white border-[#005CA8] ring-4 ring-[#005CA8]/10 shadow-inner'
                    : isReadOnly && isEditing
                    ? 'bg-gray-100/70 border-gray-200/80'
                    : 'bg-gray-50/60 border-gray-100 hover:border-gray-200'
            }`}>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center transition-colors ${
                    canEdit
                        ? 'bg-[#005CA8] text-white shadow-xs'
                        : isReadOnly && isEditing
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-white text-gray-400 shadow-xs'
                }`}>
                    <Icon size={17} />
                </div>
                {canEdit ? (
                    <input
                        type="text"
                        value={value}
                        onChange={onChange}
                        className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none placeholder:text-gray-300"
                        placeholder={`Enter ${label}`}
                    />
                ) : (
                    <span className={`flex-1 min-w-0 text-xs sm:text-sm font-bold truncate ${isReadOnly && isEditing ? 'text-slate-600' : 'text-slate-900'}`}>
                        {value || 'Not set'}
                    </span>
                )}
                {isReadOnly && (
                    <div className="shrink-0 text-gray-400 ml-1" title="Locked - Cannot be changed">
                        <Lock size={14} />
                    </div>
                )}
            </div>
            {helperText && (
                <p className="text-[10px] text-gray-400 mt-1 pl-1 leading-tight">{helperText}</p>
            )}
        </div>
    );
};

const PartnerProfile = () => {
    const { formData } = usePartnerStore();
    const [isEditing, setIsEditing] = useState(false);
    const containerRef = useRef(null);
    const [approvalStatus, setApprovalStatus] = useState('pending');
    const [memberSince, setMemberSince] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [profile, setProfile] = useState({
        name: formData?.propertyName || '',
        email: '',
        phone: '',
        address: '',
        role: 'partner',
        aadhaarNumber: '',
        panNumber: '',
        profileImage: '',
        profileImagePublicId: ''
    });
    const [uploading, setUploading] = useState(false);
    const [testNotifLoading, setTestNotifLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(containerRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await userService.getProfile();
                const addr = data.address || {};
                const addrStr = [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
                setProfile({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: addrStr,
                    role: data.role || 'partner',
                    aadhaarNumber: data.aadhaarNumber || '',
                    panNumber: data.panNumber || '',
                    profileImage: data.profileImage || '',
                    profileImagePublicId: data.profileImagePublicId || ''
                });
                setApprovalStatus(data.partnerApprovalStatus || 'pending');
                setMemberSince(data.createdAt || data.partnerSince || '');
                setPartnerId(data._id || '');
            } catch {
                console.error('Failed to load partner profile');
                setProfile((p) => ({
                    ...p,
                    name: p.name || 'Partner',
                    role: 'partner'
                }));
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (field, e) => {
        setProfile({ ...profile, [field]: e.target.value });
    };

    const parseAddress = (str) => {
        const parts = (str || '').split(',').map(s => s.trim()).filter(Boolean);
        return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zipCode: '',
            country: 'India'
        };
    };

    const handleToggleEdit = async () => {
        if (isEditing) {
            const addressObj = parseAddress(profile.address);
            try {
                const res = await authService.updateProfile({
                    name: profile.name,
                    email: profile.email,
                    address: addressObj
                });
                const updated = res.user || {};
                const addr = updated.address || addressObj;
                const addrStr = [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
                setProfile(prev => ({
                    ...prev,
                    name: updated.name || prev.name,
                    email: updated.email || prev.email,
                    phone: updated.phone || prev.phone,
                    address: addrStr,
                    role: updated.role || prev.role,
                    profileImage: updated.profileImage || prev.profileImage,
                    profileImagePublicId: updated.profileImagePublicId || prev.profileImagePublicId
                }));

                // Sync with localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const updatedUser = { ...user, ...updated };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                toast.success('Profile updated successfully');
                setIsEditing(false);
            } catch (err) {
                console.error('Update profile failed:', err);
                toast.error(err?.response?.data?.message || 'Failed to update profile');
                setIsEditing(false);
            }
        } else {
            setIsEditing(true);
        }
    };

    const handlePartnerFile = async (file) => {
        if (!file) return;

        try {
            setUploading(true);
            const compressed = await compressImage(file, 1200, 1200, 0.85);
            const formData = new FormData();
            formData.append('images', compressed);

            const res = await hotelService.uploadImages(formData);
            if (res.files && res.files.length > 0) {
                const newUrl = res.files[0].url;
                const newPublicId = res.files[0].publicId;
                await updateProfileImage(newUrl, newPublicId);
                toast.success('Profile photo updated successfully');
            }
        } catch (err) {
            console.error('Image upload failed:', err);
            const errorMsg = typeof err === 'string' 
                ? (err.includes('<html') ? 'File size exceeds server upload limit' : err)
                : (err?.response?.data?.message || err?.message || 'Image upload failed');
            toast.error(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleBase64PartnerUpload = async (base64, mimeType, fileName) => {
        try {
            setUploading(true);
            const uploadResult = await uploadBase64Image(base64, mimeType, fileName);

            if (uploadResult && uploadResult.success && uploadResult.files && uploadResult.files.length > 0) {
                const newUrl = uploadResult.files[0].url;
                const newPublicId = uploadResult.files[0].publicId;
                await updateProfileImage(newUrl, newPublicId);
                toast.success('Profile photo updated successfully');
            }
        } catch (err) {
            console.error('Partner base64 upload failed:', err);
            toast.error('Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const handlePhotoSelect = async () => {
        try {
            const source = await pickImageSource();
            if (!source) return;

            if (source === 'gallery') {
                if (isFlutterApp()) {
                    try {
                        const nativeImages = await pickFlutterImages(false);
                        if (nativeImages && nativeImages.length > 0) {
                            const img = nativeImages[0];
                            await handleBase64PartnerUpload(img.base64, img.mimeType, img.fileName);
                            return;
                        }
                    } catch (e) {
                        console.warn('Flutter gallery error, falling back to file picker', e);
                    }
                }
                const files = await pickGalleryFiles(false);
                if (files && files.length > 0) {
                    await handlePartnerFile(files[0]);
                }
                return;
            }

            if (source === 'camera') {
                if (isFlutterApp()) {
                    try {
                        setUploading(true);
                        const cameraResult = await openFlutterCamera();
                        if (!cameraResult || !cameraResult.success || !cameraResult.base64) {
                            return;
                        }
                        await handleBase64PartnerUpload(
                            cameraResult.base64,
                            cameraResult.mimeType,
                            cameraResult.fileName
                        );
                    } catch (err) {
                        console.error('Camera upload failed:', err);
                        if (err?.message && !err.message.includes('cancelled') && !err.message.includes('closed')) {
                            toast.error('Unable to capture photo');
                        }
                    } finally {
                        setUploading(false);
                    }
                } else {
                    fileInputRef.current?.click();
                }
            }
        } catch (err) {
            console.error('Partner photo select error:', err);
        }
    };

    const updateProfileImage = async (newUrl, newPublicId) => {
        // Update Profile with new image
        const updateRes = await authService.updateProfile({
            profileImage: newUrl,
            profileImagePublicId: newPublicId
        });

        if (updateRes.success) {
            setProfile(prev => ({
                ...prev,
                profileImage: newUrl,
                profileImagePublicId: newPublicId
            }));

            // Sync with localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...user, profileImage: newUrl, profileImagePublicId: newPublicId };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const statusLabel = approvalStatus === 'approved' ? 'Verified Partner' : approvalStatus === 'rejected' ? 'Rejected' : 'Pending Approval';
    const statusClass = approvalStatus === 'approved' ? 'text-green-600 bg-green-50' : approvalStatus === 'rejected' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50';

    return (
        <div className="min-h-screen bg-gray-50 pb-28 sm:pb-24">
            {/* Custom Header */}
            <PartnerHeader />

            <main ref={containerRef} className="max-w-xl mx-auto px-3 sm:px-4 pt-4 sm:pt-8">

                {/* Avatar Section */}
                <div className="text-center mb-5 sm:mb-8 relative">
                    <div className="relative inline-block">
                        <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#005CA8] text-white rounded-full flex items-center justify-center text-2xl sm:text-4xl font-black mx-auto shadow-xl shadow-[#005CA8]/20 relative border-4 border-white overflow-hidden bg-gradient-to-br from-[#005CA8] to-[#006BC4]">
                            {uploading ? (
                                <div className="flex flex-col items-center gap-1 sm:gap-2">
                                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white"></div>
                                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-tighter">Saving...</span>
                                </div>
                            ) : profile.profileImage ? (
                                <img src={profile.profileImage} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                (profile.name || 'P').substring(0, 2).toUpperCase()
                            )}
                        </div>

                        {/* Permanent Camera / Gallery Button */}
                        <button
                            type="button"
                            onClick={handlePhotoSelect}
                            disabled={uploading}
                            className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-7 h-7 sm:w-9 sm:h-9 bg-white text-[#005CA8] rounded-full flex items-center justify-center shadow-md border border-gray-100 hover:scale-110 active:scale-95 transition-all z-10 cursor-pointer"
                            aria-label="Change photo"
                        >
                            <Camera size={14} className="sm:hidden" />
                            <Camera size={18} className="hidden sm:inline" />
                        </button>
                    </div>

                    {/* Hidden File Input (Only for Web) */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePartnerFile(file);
                        }}
                        className="hidden"
                        accept="image/*"
                    />

                    <div className="mt-3 sm:mt-4">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 truncate px-2">{profile.name || 'Partner'}</h2>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full ${statusClass}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Details Form Card */}
                <div className="bg-white p-3.5 sm:p-6 pb-6 sm:pb-10 rounded-2xl sm:rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 mb-6 transition-all duration-500">
                    <div className="flex items-center justify-between gap-2 mb-5 sm:mb-8 pb-3 sm:pb-4 border-b border-gray-100">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] sm:text-[10px] text-[#005CA8] font-black uppercase tracking-[0.18em] sm:tracking-[0.2em] mb-0.5 truncate">Account & Settings</p>
                            <h3 className="text-base sm:text-xl font-black text-slate-900 truncate">Personal Profile</h3>
                        </div>
                        <button
                            type="button"
                            onClick={handleToggleEdit}
                            className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${isEditing
                                ? 'bg-[#005CA8] text-white shadow-[#005CA8]/20 hover:bg-[#004b8a]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {isEditing ? <><Save size={15} /> <span>Save</span></> : <><Edit size={15} /> <span>Edit Profile</span></>}
                        </button>
                    </div>

                    <Field
                        label="Full Name"
                        value={profile.name}
                        icon={User}
                        isEditing={isEditing}
                        onChange={(e) => handleChange('name', e)}
                    />
                    <Field
                        label="Email Address"
                        value={profile.email}
                        icon={Mail}
                        isEditing={isEditing}
                        onChange={(e) => handleChange('email', e)}
                    />
                    <Field
                        label="Phone Number"
                        value={profile.phone}
                        icon={Phone}
                        isEditing={isEditing}
                        isReadOnly={true}
                        badge={(
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                <Lock size={9} /> Registered ID
                            </span>
                        )}
                        helperText={isEditing ? "Phone number is your registered login identity and cannot be edited." : null}
                        onChange={() => { }}
                    />
                    <Field
                        label="Address"
                        value={profile.address}
                        icon={MapPin}
                        isEditing={isEditing}
                        onChange={(e) => handleChange('address', e)}
                    />

                    {/* Non-Editable Fields */}
                    <Field
                        label="Aadhaar Number"
                        value={profile.aadhaarNumber}
                        icon={CreditCard}
                        isEditing={isEditing}
                        isReadOnly={true}
                        badge={(
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                <Lock size={9} /> Verified KYC
                            </span>
                        )}
                        onChange={() => { }}
                    />
                    <Field
                        label="PAN Number"
                        value={profile.panNumber}
                        icon={CreditCard}
                        isEditing={isEditing}
                        isReadOnly={true}
                        badge={(
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                <Lock size={9} /> Verified KYC
                            </span>
                        )}
                        onChange={() => { }}
                    />
                </div>

                <div className="mt-4 sm:mt-8 text-center text-xs text-gray-400">
                    <p className="font-bold tracking-widest uppercase text-[10px]">Member since {memberSince ? new Date(memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}</p>
                </div>

            </main >
        </div >
    );
};

export default PartnerProfile;
