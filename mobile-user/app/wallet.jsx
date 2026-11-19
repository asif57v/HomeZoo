import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Plus, ArrowUpRight, ArrowDownLeft, X, IndianRupee, Calendar, Wallet, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { Text, Input, Sheet } from '../src/components/ui';
import { api } from '../src/services/apiService';
import paymentService from '../src/services/paymentService';
import { useFeatureFlags, RAZORPAY_UNAVAILABLE_MESSAGE } from '../src/store/featureFlagsStore';
import toast from '../src/store/toastStore';
import { errMsg } from '../src/utils/format';
import { colors } from '../src/theme';

const QUICK = [500, 1000, 2000];

export default function WalletPage() {
  const router = useRouter();
  const { razorpayEnabled } = useFeatureFlags();
  const [balance, setBalance] = useState(0);
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchStats = async () => { try { const r = await api.get('/wallet/stats'); if (r.data.success) setBalance(r.data.stats.currentBalance ?? r.data.wallet?.balance ?? 0); } catch {} };
  const fetchTx = async () => { try { const r = await api.get('/wallet/transactions'); if (r.data.success) setTx(r.data.transactions); } catch {} finally { setLoading(false); setRefreshing(false); } };
  useEffect(() => { fetchStats(); fetchTx(); }, []);

  const addMoney = async () => {
    const amount = Number(amountStr);
    if (!amount || amount < 10) { toast.error('Minimum amount is ₹10'); return; }
    if (processing) return;
    try {
      setProcessing(true);
      const { data } = await api.post('/wallet/add-money', { amount });
      if (!data.success) throw new Error('Order creation failed');
      let response;
      try {
        response = await paymentService.openCheckout({ key: data.order.key, amount: data.order.amount, currency: data.order.currency, name: 'HoomZo', description: 'Wallet Top-up', order_id: data.order.id, theme: { color: '#B45309' } });
      } catch (e) { toast.error(errMsg(e, 'Payment cancelled')); return; }
      try {
        const v = await api.post('/wallet/verify-add-money', { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, amount });
        if (v.data.success) { toast.success('Money added successfully!'); setBalance(v.data.newBalance); fetchTx(); fetchStats(); setShowAdd(false); setAmountStr(''); }
      } catch { toast.error('Payment verification failed'); }
    } catch (e) { toast.error(e?.response?.data?.message || errMsg(e, 'Failed to initiate payment')); } finally { setProcessing(false); }
  };

  const valid = Number(amountStr) >= 10;
  const iconFor = (t) => (t.isBooking ? [Calendar, '#FFEDD5', '#EA580C'] : t.type === 'credit' ? [ArrowDownLeft, colors.green100, colors.green600] : [ArrowUpRight, colors.gray100, colors.gray600]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50 }}><ActivityIndicator size="large" color={colors.gray400} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <LinearGradient colors={['#B45309', '#92400E']} style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 6 }}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: 24, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 12 }}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ position: 'absolute', left: 0, padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999 }}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>My Wallet</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: 'rgba(254,243,199,0.6)', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>Available Balance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}><Text style={{ fontSize: 24, color: '#fff', marginTop: 4 }}>₹</Text><Text style={{ fontSize: 48, fontWeight: '900', color: '#fff' }}>{balance.toLocaleString('en-IN')}</Text></View>
          </View>
          <View style={{ marginTop: 28 }}>
            {!razorpayEnabled ? <Text style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>{RAZORPAY_UNAVAILABLE_MESSAGE}</Text> : null}
            <TouchableOpacity disabled={!razorpayEnabled} onPress={() => setShowAdd(true)} style={{ backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: razorpayEnabled ? 1 : 0.5 }}><Plus size={18} color={colors.amber700} strokeWidth={3} /><Text style={{ color: colors.amber700, fontWeight: '700', fontSize: 14 }}>Add Money</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 10 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); fetchTx(); }} />}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray400 }}>Recent Transactions</Text>
        {tx.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: colors.gray100 }}>
            <View style={{ width: 64, height: 64, backgroundColor: colors.gray50, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Wallet size={24} color={colors.gray300} /></View>
            <Text style={{ color: colors.gray400, fontSize: 14, fontWeight: '500' }}>No transactions yet</Text>
          </View>
        ) : tx.map((t, i) => {
          const [Icon, bg, fg] = iconFor(t);
          const st = (t.status || 'Success');
          return (
            <TouchableOpacity key={t._id || i} activeOpacity={0.85} onPress={() => setSelected(t)} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={fg} /></View>
                <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: '700', color: colors.gray900, fontSize: 12 }}>{t.description || 'Transaction'}</Text><Text style={{ fontSize: 10, color: colors.gray500, fontWeight: '500', marginTop: 2 }}>{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '900', fontSize: 14, color: t.type === 'credit' ? colors.green600 : colors.gray900 }}>{t.type === 'credit' ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}</Text>
                <View style={{ backgroundColor: /success|completed/i.test(st) ? colors.green100 : /pending/i.test(st) ? '#FEF9C3' : colors.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 2 }}><Text style={{ fontSize: 9, fontWeight: '700', color: /success|completed/i.test(st) ? colors.green700 : /pending/i.test(st) ? '#A16207' : colors.gray600 }}>{st}</Text></View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title="Add Money to Wallet">
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <View style={{ backgroundColor: colors.gray50, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.gray200 }}>
            <IndianRupee size={24} color={colors.gray400} />
            <Input value={amountStr} onChangeText={(v) => setAmountStr(v.replace(/[^0-9.]/g, ''))} placeholder="Enter amount" keyboardType="numeric" autoFocus style={{ flex: 1, fontSize: 28, fontWeight: '700', color: colors.gray900 }} />
          </View>
          <View style={{ marginTop: 8, marginBottom: 20 }}>
            {!amountStr ? <Text style={{ fontSize: 12, color: colors.gray400, fontWeight: '500' }}>Minimum amount required is ₹10</Text>
            : !valid ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><AlertCircle size={12} color={colors.red500} /><Text style={{ fontSize: 12, color: colors.red500, fontWeight: '500' }}>Minimum amount must be ₹10</Text></View>
            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} color={colors.green600} /><Text style={{ fontSize: 12, color: colors.green600, fontWeight: '500' }}>Valid amount</Text></View>}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {QUICK.map((a) => <TouchableOpacity key={a} onPress={() => setAmountStr(String(a))} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200 }}><Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray600 }}>+₹{a}</Text></TouchableOpacity>)}
          </View>
          <TouchableOpacity disabled={processing || !valid} onPress={addMoney} style={{ paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: processing || !valid ? colors.gray200 : colors.amber700 }}>
            {processing ? <ActivityIndicator color="#fff" /> : null}
            <Text style={{ fontWeight: '700', fontSize: 17, color: processing || !valid ? colors.gray400 : '#fff' }}>{processing ? 'Processing...' : 'Proceed to Pay'}</Text>
          </TouchableOpacity>
        </View>
      </Sheet>

      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <View style={{ padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: selected.type === 'credit' ? colors.green100 : colors.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{selected.type === 'credit' ? <ArrowDownLeft size={28} color={colors.green600} /> : <ArrowUpRight size={28} color={colors.gray600} />}</View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#78350F', marginBottom: 4 }}>{selected.type === 'credit' ? '+' : '-'}₹{selected.amount?.toLocaleString('en-IN')}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1 }}>{(selected.status || 'Success').toUpperCase()}</Text>
            </View>
            <View style={{ backgroundColor: colors.gray50, borderRadius: 16, padding: 12, gap: 8 }}>
              {[['Description', selected.description], ['Date', new Date(selected.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })], ['Transaction ID', `#${selected._id?.slice(-8).toUpperCase()}`], selected.bookingId ? ['Reference', `#${selected.bookingId}`] : null].filter(Boolean).map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, backgroundColor: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray100 }}><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray400 }}>{k}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray900, flexShrink: 1, textAlign: 'right' }}>{v}</Text></View>
              ))}
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
