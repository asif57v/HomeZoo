import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ArrowUpRight, ArrowDownLeft, Clock, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { Text, Input, Sheet } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import walletService from '../../src/services/walletService';
import paymentService from '../../src/services/paymentService';
import { useFeatureFlags, RAZORPAY_UNAVAILABLE_MESSAGE } from '../../src/store/featureFlagsStore';
import useAuthStore from '../../src/store/authStore';
import toast from '../../src/store/toastStore';
import { errMsg } from '../../src/utils/format';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

const P = '#005CA8';
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function PartnerWallet() {
  const { razorpayEnabled } = useFeatureFlags();
  const user = useAuthStore((s) => s.user) || {};
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('transactions');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bank, setBank] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' });

  const load = useCallback(async (silent) => {
    try {
      if (!silent) setLoading(true); setError(null);
      const [w, s, t] = await Promise.all([walletService.getWallet(), walletService.getWalletStats(), walletService.getTransactions({ limit: 10 })]);
      setWallet(w.wallet); setStats(s.stats); setTxns(t.transactions);
    } catch (e) { setError(e?.response?.data?.message || 'Failed to load wallet data'); toast.error('Failed to load wallet details'); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const showBankForm = modal === 'withdraw' && !wallet?.bankDetails?.accountNumber;

  const submit = async () => {
    if (submitting) return;
    const amt = parseFloat(amount);
    try {
      if (modal === 'withdraw') {
        if (showBankForm) {
          const { accountNumber, ifscCode, accountHolderName, bankName } = bank;
          if (!accountNumber || !ifscCode || !accountHolderName || !bankName) { toast.error('Please fill all bank details'); return; }
          if (accountHolderName.trim().length < 3) { toast.error('Account holder name must be at least 3 characters'); return; }
          if (!/^[0-9]{9,18}$/.test(accountNumber)) { toast.error('Enter a valid account number (9-18 digits)'); return; }
          if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) { toast.error('Enter a valid IFSC code'); return; }
          if (bankName.trim().length < 2) { toast.error('Enter a valid bank name'); return; }
          setSubmitting(true); await walletService.updateBankDetails(bank); toast.success('Bank details saved!'); await load(true); return;
        }
        if (!amt || amt <= 0) { toast.error('Please enter a valid amount'); return; }
        if (amt < 500) { toast.error('Minimum withdrawal is ₹500'); return; }
        if (amt > (wallet?.balance || 0)) { toast.error('Insufficient balance'); return; }
        setSubmitting(true); await walletService.requestWithdrawal(amt); toast.success('Withdrawal request submitted successfully'); setModal(null); setAmount(''); await load(true);
      } else if (modal === 'add_money') {
        if (!amt || isNaN(amt) || amt < 10) { toast.error('Minimum amount is ₹10'); return; }
        if (!razorpayEnabled) { toast.error(RAZORPAY_UNAVAILABLE_MESSAGE); return; }
        setSubmitting(true);
        const res = await walletService.addMoney(amt);
        const order = res?.order;
        if (!order || !order.id) { toast.error('Failed to create payment order'); return; }
        let r;
        try { r = await paymentService.openCheckout({ key: order.key, amount: order.amount, currency: order.currency || 'INR', name: 'HoomZo Partner', description: 'Wallet Top-up', order_id: order.id, prefill: { name: user.name || 'Partner', contact: user.phone || '', email: user.email || '' }, theme: { color: P } }); }
        catch (e) { toast.error(errMsg(e, 'Payment failed')); return; }
        try {
          const v = await walletService.verifyAddMoney({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature, amount: amt });
          if (v.success) { toast.success('Money added successfully!'); setModal(null); setAmount(''); await load(true); } else toast.error(v.message || 'Payment verification failed');
        } catch (e) { toast.error(e?.response?.data?.message || 'Payment verification failed'); }
      }
    } catch (e) { toast.error(e?.response?.data?.message || errMsg(e, 'Transaction failed')); } finally { setSubmitting(false); }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.gray50 }}><PartnerHeader title="Wallet" /><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={P} /></View></View>;
  if (error) return <View style={{ flex: 1, backgroundColor: colors.gray50 }}><PartnerHeader title="Wallet" /><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}><AlertCircle size={40} color={colors.red500} /><Text style={{ fontWeight: '800', fontSize: 17 }}>Connection Error</Text><Text style={{ color: colors.gray500, textAlign: 'center' }}>{error}</Text><TouchableOpacity onPress={() => load()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 }}><RefreshCw size={14} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text></TouchableOpacity></View></View>;

  const valid = modal === 'withdraw' ? Number(amount) >= 500 && Number(amount) <= (wallet?.balance || 0) : Number(amount) >= 10;
  const disabled = submitting || (showBankForm ? !bank.accountNumber || !bank.ifscCode : !amount || !valid);
  const Stat = ({ k, v }) => <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.gray100 }}><Text style={{ fontSize: 11, color: colors.gray500, fontWeight: '600' }}>{k}</Text><Text style={{ fontSize: 18, fontWeight: '900', color: colors.gray900, marginTop: 4 }}>{v}</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Wallet" subtitle="Balance & payouts" />
      <ScrollView contentContainerStyle={[{ padding: 16, gap: 16, paddingBottom: 40 }, CENTER]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}>
        <LinearGradient colors={[P, '#003768']} style={{ borderRadius: 24, padding: 22 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>Available Balance</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}><Text style={{ fontSize: 22, color: '#fff', marginTop: 4 }}>₹</Text><Text style={{ fontSize: 40, fontWeight: '900', color: '#fff' }}>{wallet?.balance?.toLocaleString('en-IN') || '0'}</Text></View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
            <TouchableOpacity onPress={() => setModal('add_money')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12 }}><Plus size={16} color={P} strokeWidth={3} /><Text style={{ color: P, fontWeight: '700' }}>Add Money</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModal('withdraw')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}><ArrowUpRight size={16} color="#fff" strokeWidth={3} /><Text style={{ color: '#fff', fontWeight: '700' }}>Withdraw</Text></TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={{ flexDirection: 'row', backgroundColor: colors.gray100, borderRadius: 12, padding: 4 }}>
          {[['transactions', 'Transactions'], ['analytics', 'Analytics']].map(([k, l]) => <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: tab === k ? '#fff' : 'transparent' }}><Text style={{ fontWeight: '700', fontSize: 13, color: tab === k ? P : colors.gray500 }}>{l}</Text></TouchableOpacity>)}
        </View>
        {tab === 'transactions' ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontWeight: '800', color: colors.gray800 }}>Recent Activity</Text>
            {txns.length > 0 ? txns.map((t, i) => {
              const credit = t.type === 'credit';
              return (
                <TouchableOpacity key={t._id || i} onPress={() => setSelected(t)} activeOpacity={0.85} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: credit ? colors.green50 : colors.gray100, alignItems: 'center', justifyContent: 'center' }}>{credit ? <ArrowDownLeft size={16} color={colors.green600} strokeWidth={2.5} /> : <ArrowUpRight size={16} color={colors.gray600} strokeWidth={2.5} />}</View>
                  <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 13, color: colors.gray900 }}>{t.description}</Text><Text style={{ fontSize: 10, color: colors.gray500 }}>{new Date(t.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></View>
                  <View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '900', color: credit ? colors.green600 : colors.gray900 }}>{credit ? '+' : '-'}{money(t.amount)}</Text><Text style={{ fontSize: 9, fontWeight: '700', color: t.status === 'completed' ? colors.green600 : colors.amber600 }}>{t.status === 'completed' ? 'Success' : t.status}</Text></View>
                </TouchableOpacity>
              );
            }) : <View style={{ alignItems: 'center', paddingVertical: 40 }}><Clock size={40} color={colors.gray300} /><Text style={{ color: colors.gray400, marginTop: 8 }}>No recent transactions</Text></View>}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ fontWeight: '800', color: colors.gray800 }}>Performance Stats</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
              <Stat k="Total Earnings" v={money(stats?.totalEarnings)} /><Stat k="This Month" v={money(stats?.thisMonthEarnings)} /><Stat k="Withdrawals" v={money(stats?.totalWithdrawals)} /><Stat k="Transactions" v={stats?.transactionCount || 0} />
            </View>
            <View style={{ backgroundColor: colors.amber50, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Clock size={20} color={colors.amber600} /><View><Text style={{ fontSize: 11, color: colors.amber700, fontWeight: '600' }}>Pending Clearance</Text><Text style={{ fontSize: 18, fontWeight: '900', color: '#78350F' }}>{money(stats?.pendingClearance)}</Text></View></View>
          </View>
        )}
      </ScrollView>

      <Sheet visible={!!modal} onClose={() => !submitting && setModal(null)} title={showBankForm ? 'Add Bank Details' : modal === 'withdraw' ? 'Withdraw Funds' : 'Add Money'} maxHeight="90%">
        <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={[{ gap: 12, paddingBottom: 12 }, CENTER]} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 12, color: colors.gray500 }}>{showBankForm ? 'We need your bank details to process payouts via Razorpay.' : modal === 'withdraw' ? 'Transfer funds directly to your verified bank account.' : 'Add funds to your wallet using UPI or Cards.'}</Text>
          {showBankForm ? [['accountHolderName', 'Account Holder Name', 'default'], ['accountNumber', 'Account Number', 'number-pad'], ['ifscCode', 'IFSC Code', 'default'], ['bankName', 'Bank Name', 'default']].map(([k, ph, kb]) => (
            <Input key={k} value={bank[k]} onChangeText={(v) => setBank({ ...bank, [k]: k === 'ifscCode' ? v.toUpperCase() : v })} placeholder={ph} keyboardType={kb} autoCapitalize={k === 'ifscCode' ? 'characters' : 'words'} style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, backgroundColor: colors.gray50 }} />
          )) : (<>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray600 }}>Amount (₹)</Text>
            <Input value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} placeholder="0" keyboardType="numeric" autoFocus style={{ fontSize: 28, fontWeight: '800', borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, backgroundColor: colors.gray50 }} />
            {modal === 'withdraw' ? (!amount ? <Text style={{ fontSize: 12, color: colors.gray400 }}>Min. withdrawal: ₹500  •  Available: ₹{wallet?.balance}</Text> : Number(amount) < 500 ? <Text style={{ fontSize: 12, color: colors.red500 }}>Minimum withdrawal is ₹500</Text> : Number(amount) > (wallet?.balance || 0) ? <Text style={{ fontSize: 12, color: colors.red500 }}>Insufficient balance • Max: ₹{wallet?.balance}</Text> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} color={colors.green600} /><Text style={{ fontSize: 12, color: colors.green600 }}>Valid for withdrawal</Text></View>)
            : (!amount ? <Text style={{ fontSize: 12, color: colors.gray400 }}>Min. amount: ₹10</Text> : Number(amount) < 10 ? <Text style={{ fontSize: 12, color: colors.red500 }}>Minimum amount is ₹10</Text> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} color={colors.green600} /><Text style={{ fontSize: 12, color: colors.green600 }}>Valid amount</Text></View>)}
          </>)}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <TouchableOpacity disabled={disabled} onPress={submit} style={{ backgroundColor: disabled ? colors.gray200 : P, paddingVertical: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>{submitting ? <ActivityIndicator color="#fff" /> : null}<Text style={{ color: disabled ? colors.gray400 : '#fff', fontWeight: '700' }}>{submitting ? 'Processing...' : showBankForm ? 'Save Bank Details' : 'Proceed Securely'}</Text></TouchableOpacity>
        </View>
      </Sheet>

      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <View style={{ padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: selected.type === 'credit' ? colors.green100 : colors.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{selected.type === 'credit' ? <ArrowDownLeft size={28} color={colors.green600} /> : <ArrowUpRight size={28} color={colors.gray600} />}</View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: colors.gray900 }}>{selected.type === 'credit' ? '+' : '-'}{money(selected.amount)}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1 }}>{(selected.status || 'Success').toUpperCase()}</Text>
            </View>
            <View style={{ backgroundColor: colors.gray50, borderRadius: 16, padding: 12, gap: 8 }}>
              {[['Description', selected.description], ['Date & Time', new Date(selected.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })], ['Transaction ID', `#${selected._id?.slice(-8).toUpperCase()}`], selected.referenceId ? ['Reference', `#${selected.referenceId}`] : null].filter(Boolean).map(([k, v]) => <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400 }}>{k}</Text><Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray900, flexShrink: 1, textAlign: 'right' }}>{v}</Text></View>)}
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
