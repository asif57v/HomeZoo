import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Landmark, Edit, Save, Trash2, User, CreditCard, Building2 } from 'lucide-react-native';
import { Text, Input } from '../../src/components/ui';
import { PartnerBack } from '../../src/components/partner/PartnerKit';
import walletService from '../../src/services/walletService';
import toast from '../../src/store/toastStore';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

const P = '#005CA8';
const EMPTY = { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' };

const Field = ({ label, Icon, k, ph, kb, value, editing, details, setDetails }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray400, marginBottom: 6 }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.gray50, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 12, paddingVertical: editing ? 4 : 13 }}>
      <Icon size={18} color={colors.gray400} />
      {editing ? <Input value={details[k]} onChangeText={(v) => setDetails({ ...details, [k]: k === 'ifscCode' ? v.toUpperCase() : v })} placeholder={ph} keyboardType={kb} autoCapitalize={k === 'ifscCode' ? 'characters' : 'words'} style={{ flex: 1, paddingVertical: 10, fontWeight: '600' }} /> : <Text style={{ fontWeight: '600', color: colors.gray800 }}>{value ?? details[k]}</Text>}
    </View>
  </View>
);

export default function PartnerBankDetails() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(EMPTY);
  const [existing, setExisting] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await walletService.getWallet();
      const bank = data.wallet?.bankDetails;
      if (bank && bank.accountNumber) { setExisting(bank); setDetails({ accountHolderName: bank.accountHolderName || '', accountNumber: bank.accountNumber || '', ifscCode: bank.ifscCode || '', bankName: bank.bankName || '' }); setEditing(false); }
      else { setExisting(null); setEditing(true); }
    } catch { toast.error('Failed to load bank details'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { accountHolderName, accountNumber, ifscCode, bankName } = details;
    if (!accountNumber || !ifscCode || !accountHolderName || !bankName) { toast.error('Please fill all fields'); return; }
    if (accountHolderName.trim().length < 3) { toast.error('Account holder name must be at least 3 characters'); return; }
    if (!/^[0-9]{9,18}$/.test(accountNumber)) { toast.error('Enter a valid account number (9-18 digits)'); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) { toast.error('Enter a valid IFSC code (e.g. HDFC0001234)'); return; }
    if (bankName.trim().length < 2) { toast.error('Enter a valid bank name'); return; }
    try { setSaving(true); await walletService.updateBankDetails(details); toast.success('Bank details saved successfully'); await load(); }
    catch { toast.error('Failed to save bank details'); } finally { setSaving(false); }
  };
  const remove = () => Alert.alert('Remove account', "Are you sure you want to remove these bank details? You won't be able to withdraw funds until you add them again.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { try { setSaving(true); await walletService.deleteBankDetails(); toast.success('Bank details removed'); setExisting(null); setDetails(EMPTY); setEditing(true); } catch { toast.error('Failed to remove details'); } finally { setSaving(false); } } },
  ]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={P} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerBack title="Bank Account" />
      <ScrollView contentContainerStyle={[{ padding: 16, paddingBottom: 40 }, CENTER]} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Landmark size={32} color={P} /></View>
          <Text style={{ color: colors.gray500, fontSize: 13 }}>Manage your payout account</Text>
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.gray100 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View><Text style={{ fontWeight: '800', color: colors.gray900, fontSize: 16 }}>{editing ? (existing ? 'Edit Account' : 'Add Account') : 'Saved Account'}</Text><Text style={{ fontSize: 11, color: colors.gray500 }}>{editing ? 'Enter your official bank details' : 'Verified for Payouts'}</Text></View>
            {!editing && existing ? <TouchableOpacity onPress={() => setEditing(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.blue50 }}><Edit size={14} color={P} /><Text style={{ fontSize: 12, fontWeight: '700', color: P }}>Edit</Text></TouchableOpacity> : null}
            {editing && existing ? <TouchableOpacity onPress={() => { setEditing(false); load(); }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500 }}>Cancel</Text></TouchableOpacity> : null}
          </View>
          <Field editing={editing} details={details} setDetails={setDetails} label="Account Holder" Icon={User} k="accountHolderName" ph="Name as per Passbook" />
          <Field editing={editing} details={details} setDetails={setDetails} label="Account Number" Icon={CreditCard} k="accountNumber" ph="Enter Account Number" kb="number-pad" value={`•••• •••• ${details.accountNumber.slice(-4)}`} />
          <Field editing={editing} details={details} setDetails={setDetails} label="IFSC Code" Icon={Building2} k="ifscCode" ph="IFSC" />
          <Field editing={editing} details={details} setDetails={setDetails} label="Bank Name" Icon={Landmark} k="bankName" ph="e.g. HDFC Bank" />
          {editing ? (
            <TouchableOpacity disabled={saving} onPress={save} style={{ backgroundColor: P, paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: saving ? 0.6 : 1 }}>{saving ? <ActivityIndicator color="#fff" /> : <Save size={18} color="#fff" />}<Text style={{ color: '#fff', fontWeight: '700' }}>Save Details</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity disabled={saving} onPress={remove} style={{ backgroundColor: colors.red50, paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>{saving ? <ActivityIndicator color={colors.red600} /> : <Trash2 size={18} color={colors.red600} />}<Text style={{ color: colors.red600, fontWeight: '700' }}>Remove Account</Text></TouchableOpacity>
          )}
        </View>
        <Text style={{ marginTop: 16, fontSize: 11, color: colors.gray500, lineHeight: 17 }}><Text style={{ fontSize: 11, fontWeight: '700' }}>Note:</Text> Ensuring these details are correct is crucial. Withdrawals will be processed directly to this account via IMPS.</Text>
      </ScrollView>
    </View>
  );
}
