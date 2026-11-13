import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, ArrowLeft, Save, Loader2, MapPin, Navigation, Home, Camera, Bell, Lock, Building, Trash2, AlertTriangle } from 'lucide-react';
import { authService, userService, hotelService } from '../../services/apiService';
import { searchPlaceResults, resolvePlaceDetails, parseSuggestionAddress } from '../../utils/placeSuggestions';
import toast from 'react-hot-toast';
import { isFlutterApp, openFlutterCamera, uploadBase64Image } from '../../utils/flutterBridge';
import { pickImageSource, pickFlutterImages, pickGalleryFiles } from '../../utils/imageSource';
import { requestNotificationPermission, detectPlatform } from '../../utils/firebase';

const ProfileEdit = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [testNotifLoading, setTestNotifLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profileImage: '',
    profileImagePublicId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      coordinates: { lat: null, lng: null }
    }
  });

  useEffect(() => {
    // Load user data from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setFormData({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          profileImage: user.profileImage || '',
          profileImagePublicId: user.profileImagePublicId || '',
          address: user.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India',
            coordinates: { lat: null, lng: null }
          }
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  }, []);

  const autoFillAddress = async (lat, lng) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
    if (!apiKey) return;

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results?.[0]) {
        const result = data.results[0];
        const addressComponents = result.address_components;

        let streetNumber = '';
        let route = '';
        let neighborhood = '';
        let city = '';
        let state = '';
        let pincode = '';
        let country = '';

        addressComponents.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) streetNumber = component.long_name;
          if (types.includes('route')) route = component.long_name;
          if (types.includes('neighborhood') || types.includes('sublocality')) neighborhood = component.long_name;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_1')) state = component.long_name;
          if (types.includes('postal_code')) pincode = component.long_name;
          if (types.includes('country')) country = component.long_name;
        });

        if (!city) {
          const sublocality = addressComponents.find(c => c.types.includes('sublocality_level_1'))?.long_name;
          city = sublocality || '';
        }

        const street = [streetNumber, route, neighborhood].filter(Boolean).join(', ') || result.formatted_address.split(',')[0];

        setFormData(prev => ({
          ...prev,
          address: {
            street: street,
            city: city,
            state: state,
            zipCode: pincode,
            country: country || 'India',
            coordinates: { lat, lng }
          }
        }));

        toast.success('Address auto-filled!');
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      toast.error('Failed to get address details.');
    }
  };

  const handleGetCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported');
      return;
    }

    setFetchingLocation(true);
    try {
      // Check permission status first (if Permissions API is available)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          console.log('[handleGetCurrentLocation] Permission status:', permission.state);
        } catch (permErr) {
          console.warn('[handleGetCurrentLocation] Permissions API not supported:', permErr);
        }
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (geoErr) => {
            console.error('[handleGetCurrentLocation] Geolocation error:', geoErr);
            reject(geoErr);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      const { latitude, longitude } = position.coords;
      console.log('[handleGetCurrentLocation] Got coordinates:', latitude, longitude);
      await autoFillAddress(latitude, longitude);
    } catch (error) {
      console.error('[handleGetCurrentLocation] Error:', error);
      if (error && typeof error.code === 'number') {
        if (error.code === 1) {
          toast.error('Location permission denied. Please enable it in browser settings.');
        } else if (error.code === 2) {
          toast.error('Location unavailable. Check your GPS/network.');
        } else if (error.code === 3) {
          toast.error('Location request timed out.');
        } else {
          toast.error('Unable to retrieve location');
        }
      } else {
        toast.error('Unable to retrieve location');
      }
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleImageFile = async (file) => {
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG and WebP images supported');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('files', file);

    try {
      setImageUploading(true);
      const response = await authService.uploadDocs(uploadData);

      if (response && response.files && response.files.length > 0) {
        const { url, publicId } = response.files[0];
        setFormData(prev => ({
          ...prev,
          profileImage: url,
          profileImagePublicId: publicId
        }));
        toast.success('Photo uploaded successfully');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleBase64Upload = async (base64, mimeType, fileName) => {
    try {
      setImageUploading(true);
      const uploadResult = await uploadBase64Image(base64, mimeType, fileName);

      if (uploadResult && uploadResult.success && uploadResult.files && uploadResult.files.length > 0) {
        const { url, publicId } = uploadResult.files[0];
        setFormData(prev => ({
          ...prev,
          profileImage: url,
          profileImagePublicId: publicId
        }));
        toast.success('Photo uploaded successfully');
      }
    } catch (err) {
      console.error('Base64 upload failed:', err);
      toast.error('Failed to upload photo');
    } finally {
      setImageUploading(false);
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
              await handleBase64Upload(img.base64, img.mimeType, img.fileName);
              return;
            }
          } catch (e) {
            console.warn('Flutter gallery error, falling back to file picker', e);
          }
        }
        const files = await pickGalleryFiles(false);
        if (files && files.length > 0) {
          await handleImageFile(files[0]);
        }
        return;
      }

      if (source === 'camera') {
        if (isFlutterApp()) {
          try {
            setImageUploading(true);
            const cameraResult = await openFlutterCamera();
            if (!cameraResult || !cameraResult.success || !cameraResult.base64) {
              return;
            }
            await handleBase64Upload(
              cameraResult.base64,
              cameraResult.mimeType,
              cameraResult.fileName
            );
          } catch (err) {
            console.error('Camera upload failed:', err);
            // Don't show toast if user merely closed/cancelled the camera
            if (err?.message && !err.message.includes('cancelled') && !err.message.includes('closed')) {
              toast.error('Unable to capture photo');
            }
          } finally {
            setImageUploading(false);
          }
        } else {
          fileInputRef.current?.click();
        }
      }
    } catch (err) {
      console.error('Photo select error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || formData.name.length < 3) {
      toast.error('Name must be at least 3 characters');
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.updateProfile(formData);

      // Update localStorage with new user data
      localStorage.setItem('user', JSON.stringify(response.user));

      toast.success('Profile updated successfully!');
      navigate(-1);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await userService.deleteAccount();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Your account has been deleted successfully');
      setShowDeleteModal(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error(error?.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleCameraClick = () => {
    handlePhotoSelect();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pt-safe-top px-6 pb-24 md:pb-0">

      {/* Sticky Header */}
      <div className="sticky top-0 left-0 right-0 w-full z-20 bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-b border-gray-50 shadow-sm mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Edit Profile</h1>
        <div className="w-10"></div> {/* Spacer for balance */}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-6"
      >

        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer" onClick={handlePhotoSelect}>
            <div className="w-24 h-24 rounded-full bg-surface text-white flex items-center justify-center shadow-lg shadow-surface/20 overflow-hidden border-4 border-white">
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={32} />
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-white" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePhotoSelect();
              }}
              disabled={imageUploading}
              className="absolute bottom-0 right-0 p-2 bg-surface text-white rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-surface-dark transition-colors"
              aria-label="Change photo"
            >
              <Camera size={16} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
              }}
              disabled={imageUploading}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">Tap icon to change photo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Section: Personal Info */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Full Name</label>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2 focus-within:border-surface transition-colors">
                <User size={16} className="text-gray-300" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="flex-1 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                  placeholder="Your Name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Email Address</label>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2 focus-within:border-surface transition-colors">
                <Mail size={16} className="text-gray-300" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="flex-1 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Phone (login identity - not editable) */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Phone Number</label>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <Phone size={16} className="text-gray-300" />
                <input
                  type="tel"
                  value={formData.phone}
                  readOnly
                  disabled
                  className="flex-1 text-sm font-bold text-gray-500 bg-transparent outline-none cursor-not-allowed"
                />
                <Lock size={14} className="text-gray-300" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Phone number is your login ID and can't be changed.</p>
            </div>
          </div>


          {/* Section: Address */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Address Details</label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={fetchingLocation}
                className="flex items-center gap-1 text-[10px] font-bold text-surface bg-surface/5 px-2 py-1 rounded-md hover:bg-surface/10 transaction-colors"
              >
                {fetchingLocation ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
                Auto-Detect
              </button>
            </div>

            {/* Address Inputs - Minimalist Style */}
            <div className="space-y-4 pt-1">
              {/* Street */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Street Address</label>
                <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                    placeholder="House No, Street, Area"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* City */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">City</label>
                  <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                      placeholder="City"
                    />
                  </div>
                </div>

                {/* Pincode */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Pincode</label>
                  <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={formData.address.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                      placeholder="000000"
                    />
                  </div>
                </div>
              </div>

              {/* State */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">State</label>
                <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                    placeholder="State"
                  />
                </div>
              </div>
            </div>
          </div>




          {/* Host & Listings Hub Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-lg border border-indigo-500/20 mt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Building size={12} /> Host / Partner Hub
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5 truncate">Post & Manage Properties</h4>
                <p className="text-[11px] text-white/70 line-clamp-1">View enquiries, bookings, listings & analytics</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/hotel/partner-dashboard')}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Action Buttons: Delete Account placed before Update Profile */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={loading || imageUploading || deleting}
              className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={16} />
              <span>Delete Account</span>
            </button>

            <button
              type="submit"
              disabled={loading || imageUploading || deleting}
              className="flex-[1.5] bg-surface hover:bg-surface/90 text-white py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-xl shadow-surface/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Profile'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1">Delete Account?</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Are you sure you want to delete your account? This action is permanent and cannot be undone. All your profile information and data will be permanently removed.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEdit;
