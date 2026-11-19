import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Camera, Edit, Save, Lock, User, Mail, Phone, MapPin, CreditCard, LogOut } from 'lucide-react-native';
import { Text, Input } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import { userService, authService, hotelService } from '../../src/services/apiService';
import useAuthStore from '../../src/store/authStore';
import { pickImages } from '../../src/lib/imagePicker';
import toast from '../../src/store/toastStore';
import { errMsg } from '../../src/utils/format';
import { colors } from '../../src/theme';

const P = '#005CA8';

// Mirrors web PartnerProfile <Field>: black uppercase label (tracking .15em) + optional badge on the right,
// row with a 36px icon box; view = gray-50/60 bg, edit = white + brand border, locked-while-editing = gray-100
const Field = ({ label, value, Icon, editing, onChange, readOnly, badge, helper, keyboardType }) => {
  const can = editing && !readOnly;
  const lockedEdit = readOnly && editing;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 10, fontWeight: '900', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</Text>
        {badge ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.slate100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Lock size={9} color={colors.slate500} /><Text style={{ fontSize: 9, fontWeight: '700', color: colors.slate500 }}>{badge}</Text></View> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: can ? 2 : 1, borderColor: can ? P : lockedEdit ? colors.gray200 : colors.gray100, backgroundColor: can ? '#fff' : lockedEdit ? 'rgba(243,244,246,0.7)' : 'rgba(249,250,251,0.6)' }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: can ? P : lockedEdit ? colors.gray200 : '#fff', shadowColor: '#000', shadowOpacity: can || lockedEdit ? 0 : 0.05, shadowRadius: 2, elevation: can || lockedEdit ? 0 : 1 }}>
          <Icon size={17} color={can ? '#fff' : lockedEdit ? colors.gray500 : colors.gray400} />
        </View>
        {can
          ? <Input value={value} onChangeText={onChange} placeholder={`Enter ${label}`} keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} style={{ flex: 1, paddingVertical: 4, fontSize: 13, fontWeight: '700', color: colors.slate900 }} />
          : <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '700', color: lockedEdit ? colors.slate600 : colors.slate900 }}>{value || 'Not set'}</Text>}
        {readOnly ? <Lock size={14} color={colors.gray400} /> : null}
      </View>
      {helper ? <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 4, paddingLeft: 4 }}>{helper}</Text> : null}
    </View>
  );
};

export default function PartnerProfile() {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const confirmLogout = () => Alert.alert('Log out', 'Are you sure you want to log out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log Out', style: 'destructive', onPress: async () => { await useAuthStore.getState().logout(); router.replace('/login'); } },
  ]);
  const [approval, setApproval] = useState('pending');
  const [memberSince, setMemberSince] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '', aadhaarNumber: '', panNumber: '', profileImage: '', profileImagePublicId: '' });

  useEffect(() => {
    (async () => {
      try {
        const data = await userService.getProfile();
        const d = data.user || data;
        const a = d.address || {};
        setProfile({ name: d.name || '', email: d.email || '', phone: d.phone || '', address: [a.street, a.city, a.state].filter(Boolean).join(', '), aadhaarNumber: d.aadhaarNumber || '', panNumber: d.panNumber || '', profileImage: d.profileImage || '', profileImagePublicId: d.profileImagePublicId || '' });
        setApproval(d.partnerApprovalStatus || 'pending'); setMemberSince(d.createdAt || d.partnerSince || '');
      } catch { setProfile((p) => ({ ...p, name: p.name || 'Partner' })); }
    })();
  }, []);

  const parseAddress = (str) => { const parts = (str || '').split(',').map((s) => s.trim()).filter(Boolean); return { street: parts[0] || '', city: parts[1] || '', state: parts[2] || '', zipCode: '', country: 'India' }; };
  const toggleEdit = async () => {
    if (!editing) { setEditing(true); return; }
    setSaving(true);
    try {
      const res = await authService.updateProfile({ name: profile.name, email: profile.email, address: parseAddress(profile.address) });
      const u = res.user || {};
      const a = u.address || parseAddress(profile.address);
      setProfile((p) => ({ ...p, name: u.name || p.name, email: u.email || p.email, phone: u.phone || p.phone, address: [a.street, a.city, a.state].filter(Boolean).join(', ') }));
      useAuthStore.getState().setUser({ ...(useAuthStore.getState().user || {}), ...u });
      toast.success('Profile updated successfully');
    } catch (e) { toast.error(e?.response?.data?.message || errMsg(e, 'Failed to update profile')); } finally { setSaving(false); setEditing(false); }
  };

  const changePhoto = async () => {
    const files = await pickImages({ multiple: false });
    const f = files[0]; if (!f) return;
    try {
      setUploading(true);
      const fd = new FormData(); fd.append('images', { uri: f.uri, name: f.name, type: f.type });
      const res = await hotelService.uploadImages(fd);
      if (res.files && res.files.length > 0) {
        const { url, publicId } = res.files[0];
        const up = await authService.updateProfile({ profileImage: url, profileImagePublicId: publicId });
        if (up.success) { setProfile((p) => ({ ...p, profileImage: url, profileImagePublicId: publicId })); useAuthStore.getState().setUser({ ...(useAuthStore.getState().user || {}), profileImage: url, profileImagePublicId: publicId }); toast.success('Profile photo updated successfully'); }
      }
    } catch (e) { const m = typeof e === 'string' ? (e.includes('<html') ? 'File size exceeds server upload limit' : e) : e?.response?.data?.message || e?.message || 'Image upload failed'; toast.error(m); } finally { setUploading(false); }
  };

  // Web status pill: green / red / orange 50 bg with 600 text, uppercase tracking-widest
  const statusLabel = approval === 'approved' ? 'Verified Partner' : approval === 'rejected' ? 'Rejected' : 'Pending Approval';
  const [sbg, sfg] = approval === 'approved' ? [colors.green50, colors.green600] : approval === 'rejected' ? [colors.red50, colors.red600] : [colors.orange50, '#EA580C'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      {/* Web uses the plain partner header (logo, guest view, bell, wallet); Wallet / Settings / Log out live in the drawer */}
      <PartnerHeader />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {/* Avatar section (web: 80px circle, blue gradient, white 4px border, white camera button) */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={changePhoto} disabled={uploading} activeOpacity={0.85}>
            <LinearGradient colors={[P, '#006BC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: P, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
              {uploading
                ? <View style={{ alignItems: 'center', gap: 2 }}><ActivityIndicator color="#fff" /><Text style={{ fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>Saving...</Text></View>
                : profile.profileImage
                  ? <Image source={{ uri: profile.profileImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  : <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>{(profile.name || 'P').substring(0, 2).toUpperCase()}</Text>}
            </LinearGradient>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray100, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 }}><Camera size={14} color={P} /></View>
          </TouchableOpacity>
          <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '900', color: colors.slate900, marginTop: 12, paddingHorizontal: 8 }}>{profile.name || 'Partner'}</Text>
          <View style={{ backgroundColor: sbg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, marginTop: 4 }}><Text style={{ fontSize: 9, fontWeight: '900', color: sfg, textTransform: 'uppercase', letterSpacing: 1.5 }}>{statusLabel}</Text></View>
        </View>

        {/* Details card (web: white, rounded-2xl, shadow-xl gray-200/50, border gray-100) */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, paddingBottom: 24, borderWidth: 1, borderColor: colors.gray100, marginBottom: 24, shadowColor: '#6b7280', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '900', color: P, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 2 }}>Account & Settings</Text>
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '900', color: colors.slate900 }}>Personal Profile</Text>
            </View>
            <TouchableOpacity disabled={saving} onPress={toggleEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: editing ? P : colors.gray100, shadowColor: editing ? P : '#000', shadowOpacity: editing ? 0.2 : 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : editing ? <Save size={15} color="#fff" /> : <Edit size={15} color={colors.gray700} />}
              <Text style={{ fontSize: 12, fontWeight: '700', color: editing ? '#fff' : colors.gray700 }}>{editing ? 'Save' : 'Edit Profile'}</Text>
            </TouchableOpacity>
          </View>
          <Field label="Full Name" value={profile.name} Icon={User} editing={editing} onChange={(v) => setProfile({ ...profile, name: v })} />
          <Field label="Email Address" value={profile.email} Icon={Mail} editing={editing} onChange={(v) => setProfile({ ...profile, email: v })} keyboardType="email-address" />
          <Field label="Phone Number" value={profile.phone} Icon={Phone} editing={editing} readOnly badge="Registered ID" helper={editing ? 'Phone number is your registered login identity and cannot be edited.' : null} />
          <Field label="Address" value={profile.address} Icon={MapPin} editing={editing} onChange={(v) => setProfile({ ...profile, address: v })} />
          <Field label="Aadhaar Number" value={profile.aadhaarNumber} Icon={CreditCard} editing={editing} readOnly badge="Verified KYC" />
          <Field label="PAN Number" value={profile.panNumber} Icon={CreditCard} editing={editing} readOnly badge="Verified KYC" />
        </View>

        <Text style={{ textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 1.5 }}>Member since {memberSince ? new Date(memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}</Text>

        <TouchableOpacity onPress={confirmLogout} activeOpacity={0.85} style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.red50, borderWidth: 1, borderColor: colors.red100, paddingVertical: 14, borderRadius: 14 }}>
          <LogOut size={18} color={colors.red500} />
          <Text style={{ color: colors.red500, fontWeight: '800', fontSize: 14 }}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
