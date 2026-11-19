import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { User, Phone, Mail, Lock, Camera, Navigation, Building, Trash2, AlertTriangle, ArrowLeft, LogOut } from 'lucide-react-native';
import { Text, Input, Sheet } from '../../src/components/ui';
import { authService, userService } from '../../src/services/apiService';
import useAuthStore from '../../src/store/authStore';
import { pickImages } from '../../src/lib/imagePicker';
import { getCurrentCoords } from '../../src/utils/userLocation';
import { GOOGLE_MAP_API_KEY } from '../../src/config';
import { storage } from '../../src/lib/storage';
import toast from '../../src/store/toastStore';
import { errMsg } from '../../src/utils/format';
import { colors } from '../../src/theme';

const EMPTY_ADDR = { street: '', city: '', state: '', zipCode: '', country: 'India', coordinates: { lat: null, lng: null } };

const Line = ({ label, icon, children, locked, hint }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100, paddingBottom: 6 }}>
      {icon}{children}{locked ? <Lock size={14} color={colors.gray300} /> : null}
    </View>
    {hint ? <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 4 }}>{hint}</Text> : null}
  </View>
);
const inp = { flex: 1, fontSize: 14, fontWeight: '700', color: colors.gray800, paddingVertical: 4 };

export default function ProfileEdit() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', profileImage: '', profileImagePublicId: '', address: EMPTY_ADDR });

  useEffect(() => {
    try {
      const u = JSON.parse(storage.getItem('user') || 'null');
      if (u) setForm({ name: u.name || '', phone: u.phone || '', email: u.email || '', profileImage: u.profileImage || '', profileImagePublicId: u.profileImagePublicId || '', address: u.address || EMPTY_ADDR });
    } catch {}
  }, []);

  const setAddr = (k, v) => setForm((p) => ({ ...p, address: { ...p.address, [k]: v } }));

  const autoFillAddress = async (lat, lng) => {
    if (!GOOGLE_MAP_API_KEY) return;
    try {
      const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAP_API_KEY}`);
      const data = await r.json();
      if (data.status === 'OK' && data.results?.[0]) {
        const result = data.results[0];
        let streetNumber = '', route = '', neighborhood = '', city = '', state = '', pincode = '', country = '';
        result.address_components.forEach((c) => {
          const t = c.types;
          if (t.includes('street_number')) streetNumber = c.long_name;
          if (t.includes('route')) route = c.long_name;
          if (t.includes('neighborhood') || t.includes('sublocality')) neighborhood = c.long_name;
          if (t.includes('locality')) city = c.long_name;
          if (t.includes('administrative_area_level_1')) state = c.long_name;
          if (t.includes('postal_code')) pincode = c.long_name;
          if (t.includes('country')) country = c.long_name;
        });
        if (!city) city = result.address_components.find((c) => c.types.includes('sublocality_level_1'))?.long_name || '';
        const street = [streetNumber, route, neighborhood].filter(Boolean).join(', ') || result.formatted_address.split(',')[0];
        setForm((p) => ({ ...p, address: { street, city, state, zipCode: pincode, country: country || 'India', coordinates: { lat, lng } } }));
        toast.success('Address auto-filled!');
      }
    } catch { toast.error('Failed to get address details.'); }
  };
  const detect = async () => {
    setLocating(true);
    try { const { lat, lng } = await getCurrentCoords(); await autoFillAddress(lat, lng); }
    catch (e) { toast.error(/denied/i.test(errMsg(e, '')) ? 'Location permission denied. Please enable it in settings.' : 'Unable to retrieve location'); }
    finally { setLocating(false); }
  };

  const changePhoto = async () => {
    const files = await pickImages({ multiple: false });
    const file = files[0];
    if (!file) return;
    if (file.size && file.size > 5 * 1024 * 1024) { toast.error('Image size must be less than 5MB'); return; }
    const fd = new FormData();
    fd.append('files', { uri: file.uri, name: file.name, type: file.type });
    try {
      setUploading(true);
      const res = await authService.uploadDocs(fd);
      if (res && res.files && res.files.length > 0) { const { url, publicId } = res.files[0]; setForm((p) => ({ ...p, profileImage: url, profileImagePublicId: publicId })); toast.success('Photo uploaded successfully'); }
    } catch { toast.error('Failed to upload image'); } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.name || form.name.length < 3) { toast.error('Name must be at least 3 characters'); return; }
    if (form.phone && form.phone.length !== 10) { toast.error('Please enter a valid 10-digit phone number'); return; }
    if (loading) return;
    try {
      setLoading(true);
      const res = await authService.updateProfile(form);
      useAuthStore.getState().setUser(res.user);
      toast.success('Profile updated successfully!');
      router.back();
    } catch (e) { toast.error(errMsg(e, 'Failed to update profile')); } finally { setLoading(false); }
  };

  const confirmLogout = () => Alert.alert('Log out', 'Are you sure you want to log out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log Out', style: 'destructive', onPress: async () => { await useAuthStore.getState().logout(); router.replace('/login'); } },
  ]);

  const deleteAccount = async () => {
    try {
      setDeleting(true);
      await userService.deleteAccount();
      storage.removeItem('token'); storage.removeItem('user');
      useAuthStore.getState().expire();
      toast.success('Your account has been deleted successfully');
      setShowDelete(false);
      router.replace('/login');
    } catch (e) { toast.error(errMsg(e, 'Failed to delete account. Please try again.')); } finally { setDeleting(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Web: sticky white header, border-b gray-50, shadow-sm */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray50, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 8 }}><ArrowLeft size={20} color={colors.gray700} /></TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gray900 }}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={changePhoto}>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', overflow: 'hidden', elevation: 6 }}>
                {form.profileImage ? <Image source={{ uri: form.profileImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <User size={32} color="#fff" />}
                {uploading ? <View style={{ position: 'absolute', inset: 0, top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View> : null}
              </View>
              <View style={{ position: 'absolute', bottom: 0, right: 0, padding: 8, backgroundColor: colors.surface, borderRadius: 999, borderWidth: 2, borderColor: '#fff' }}><Camera size={16} color="#fff" /></View>
            </TouchableOpacity>
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.gray400 }}>Tap icon to change photo</Text>
          </View>

          <Line label="Full Name" icon={<User size={16} color={colors.gray300} />}><Input value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Your Name" style={inp} /></Line>
          <Line label="Email Address" icon={<Mail size={16} color={colors.gray300} />}><Input value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" style={inp} /></Line>
          <Line label="Phone Number" icon={<Phone size={16} color={colors.gray300} />} locked hint="Phone number is your login ID and can't be changed."><Input value={form.phone} editable={false} style={{ ...inp, color: colors.gray500 }} /></Line>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.8 }}>Address Details</Text>
            <TouchableOpacity disabled={locating} onPress={detect} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,92,168,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              {locating ? <ActivityIndicator size="small" color={colors.surface} /> : <Navigation size={10} color={colors.surface} />}<Text style={{ fontSize: 10, fontWeight: '700', color: colors.surface }}>Auto-Detect</Text>
            </TouchableOpacity>
          </View>
          <Line label="Street Address" icon={null}><Input value={form.address.street} onChangeText={(v) => setAddr('street', v)} placeholder="House No, Street, Area" style={inp} /></Line>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View style={{ flex: 1 }}><Line label="City" icon={null}><Input value={form.address.city} onChangeText={(v) => setAddr('city', v)} placeholder="City" style={inp} /></Line></View>
            <View style={{ flex: 1 }}><Line label="Pincode" icon={null}><Input value={form.address.zipCode} onChangeText={(v) => setAddr('zipCode', v.replace(/\D/g, ''))} placeholder="000000" keyboardType="number-pad" maxLength={6} style={inp} /></Line></View>
          </View>
          <Line label="State" icon={null}><Input value={form.address.state} onChangeText={(v) => setAddr('state', v)} placeholder="State" style={inp} /></Line>

          <LinearGradient colors={['#312e81', '#1e1b4b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16, padding: 16, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Building size={12} color={colors.amber400} /><Text style={{ fontSize: 10, fontWeight: '700', color: colors.amber400, letterSpacing: 0.8 }}>HOST / PARTNER HUB</Text></View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 }}>Post & Manage Properties</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>View enquiries, bookings, listings & analytics</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/hotel/partner-dashboard')} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.amber500, borderRadius: 12 }}><Text style={{ fontWeight: '800', fontSize: 12, color: '#020617' }}>Dashboard</Text></TouchableOpacity>
          </LinearGradient>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <TouchableOpacity disabled={loading || uploading || deleting} onPress={() => setShowDelete(true)} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.red50, borderWidth: 1, borderColor: 'rgba(254,202,202,0.8)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Trash2 size={16} color={colors.red600} /><Text style={{ fontWeight: '700', fontSize: 12, color: colors.red600 }}>Delete Account</Text></TouchableOpacity>
            <TouchableOpacity disabled={loading || uploading || deleting} onPress={submit} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '700', fontSize: 12, color: '#fff' }}>Update Profile</Text>}</TouchableOpacity>
          </View>
          <TouchableOpacity disabled={loading || deleting} onPress={confirmLogout} activeOpacity={0.85} style={{ marginTop: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.red100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={16} color={colors.red500} />
            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.red500 }}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={showDelete} onClose={() => !deleting && setShowDelete(false)}>
        <View style={{ padding: 24 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><AlertTriangle size={24} color={colors.red600} /></View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.gray900, marginBottom: 4 }}>Delete Account?</Text>
          <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 24, lineHeight: 18 }}>Are you sure you want to delete your account? This action is permanent and cannot be undone. All your profile information and data will be permanently removed.</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity disabled={deleting} onPress={() => setShowDelete(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.gray100, alignItems: 'center' }}><Text style={{ fontWeight: '700', fontSize: 12, color: colors.gray700 }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity disabled={deleting} onPress={deleteAccount} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.red600, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>{deleting ? <ActivityIndicator color="#fff" size="small" /> : <Trash2 size={14} color="#fff" />}<Text style={{ fontWeight: '700', fontSize: 12, color: '#fff' }}>{deleting ? 'Deleting...' : 'Yes, Delete'}</Text></TouchableOpacity>
          </View>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
