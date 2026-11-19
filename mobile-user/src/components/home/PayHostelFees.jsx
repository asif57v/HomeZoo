import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, ChevronRight, Lock, Sparkles, CheckCircle2, Building, User, Hash, IndianRupee, Calendar } from 'lucide-react-native';
import { Text, Sheet, Button, Input } from '../ui';
import apiService from '../../services/apiService';
import paymentService from '../../services/paymentService';
import toast from '../../store/toastStore';
import { colors } from '../../theme';
import { errMsg } from '../../utils/format';

const Label = ({ icon: Icon, children }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
    <Icon size={13} color={colors.gray500} />
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.gray600, textTransform: 'uppercase' }}>{children}</Text>
  </View>
);
const Box = ({ ...p }) => (
  <Input {...p} style={{ borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.gray50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 }} />
);

export default function PayHostelFees({ title }) {
  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({ studentName: '', studentId: '', hostelName: '', feePeriod: month, amount: '8500' });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const verifySim = async (hostelFeeId, receiptNumber, orderId) => {
    await new Promise((r) => setTimeout(r, 1200));
    const res = await apiService.post('/hostel-fees/verify', { razorpay_order_id: orderId, razorpay_payment_id: 'pay_hz_' + Date.now().toString().slice(-8), hostelFeeId, receiptNumber, isSimulated: true });
    if (res.data.success) setReceipt(res.data.receipt); else toast.error('Payment processing failed. Please try again.');
  };

  const proceed = async () => {
    if (!form.studentName || !form.studentId || !form.hostelName || !form.amount) { toast.error('Please fill in all required payment details.'); return; }
    if (loading) return;
    setLoading(true);
    try {
      const orderRes = await apiService.post('/hostel-fees/create-order', {
        amount: Number(form.amount), studentName: form.studentName, studentId: form.studentId,
        hostelName: form.hostelName, feePeriod: form.feePeriod, paymentMethod: 'PhonePe',
      });
      const { order, hostelFeeId, receiptNumber, razorpayKeyId } = orderRes.data;
      const isDemo = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo' || String(order.id).startsWith('order_sim_');
      if (!isDemo) {
        let response;
        try {
          response = await paymentService.openCheckout({
            key: razorpayKeyId, amount: order.amount, currency: order.currency || 'INR', name: 'HoomZo Hostel Rent',
            description: `Hostel Fee Payment - ${form.hostelName}`, order_id: order.id, prefill: { name: form.studentName }, theme: { color: '#005CA8' },
          });
        } catch (e) {
          toast.error(errMsg(e, 'Payment cancelled')); // no simulated fallback on a real gateway order
          return;
        }
        const verifyRes = await apiService.post('/hostel-fees/verify', {
          razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature, hostelFeeId, receiptNumber,
        });
        if (verifyRes.data.success) setReceipt(verifyRes.data.receipt); else toast.error('Payment verification failed: ' + (verifyRes.data.message || 'Unknown error'));
      } else {
        await verifySim(hostelFeeId, receiptNumber, order.id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process payment. Please try again.');
    } finally { setLoading(false); }
  };

  const shareReceipt = () => {
    if (!receipt) return;
    Share.share({ message: `HoomZo Hostel Fee Receipt\nReceipt No: ${receipt.receiptNumber}\nStudent: ${receipt.studentName}\nRoom/Roll: ${receipt.studentId}\nHostel: ${receipt.hostelName}\nPeriod: ${receipt.feePeriod}\nAmount: ₹${receipt.amount?.toLocaleString('en-IN')}\nMethod: ${receipt.paymentMethod}\nDate: ${receipt.transactionDate}` }).catch(() => {});
  };

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gray900 }}>{title || 'Pay Hostel Fees'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.emerald50 }}>
          <ShieldCheck size={12} color={colors.emerald600} /><Text style={{ fontSize: 10, fontWeight: '600', color: colors.emerald700 }}>0% Extra Fee</Text>
        </View>
      </View>
      <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen(true)} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.gray100, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LinearGradient colors={['#5f259f', '#7b2cbf']} style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>पे</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray900 }}>PhonePe UPI</Text>
              <View style={{ backgroundColor: 'rgba(243,232,255,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}><Text style={{ fontSize: 9, fontWeight: '700', color: '#7e22ce' }}>INSTANT SLIP</Text></View>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 11, color: colors.gray500, fontWeight: '500', marginTop: 2 }}>Hostel Rent, Mess & Maintenance via UPI</Text>
            <Text numberOfLines={1} style={{ fontSize: 10, color: colors.gray400, marginTop: 4 }}>GPay • Paytm • Cards • NetBanking</Text>
          </View>
          <LinearGradient colors={['#5f259f', '#7b2cbf']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 2 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Pay Now</Text><ChevronRight size={14} color="#fff" />
          </LinearGradient>
        </View>
        <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.gray100, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Lock size={10} color={colors.emerald600} /><Text style={{ fontSize: 10, color: colors.gray500, fontWeight: '500' }}>100% Secure UPI Gateway</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Sparkles size={10} color="#7e22ce" /><Text style={{ fontSize: 10, color: '#7e22ce', fontWeight: '600' }}>Instant Digital Receipt</Text></View>
        </View>
      </TouchableOpacity>

      <Sheet visible={open && !receipt} onClose={() => !loading && setOpen(false)} title="Hostel Fee Payment" maxHeight="92%">
        <ScrollView style={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
          <Label icon={User}>Student Name</Label><Box value={form.studentName} onChangeText={(v) => set('studentName', v)} placeholder="Enter student full name" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}><Label icon={Hash}>Roll / Room No</Label><Box value={form.studentId} onChangeText={(v) => set('studentId', v)} placeholder="e.g. Room 204" /></View>
            <View style={{ flex: 1 }}><Label icon={Calendar}>Fee Period</Label><Box value={form.feePeriod} onChangeText={(v) => set('feePeriod', v)} placeholder="August 2026" /></View>
          </View>
          <View style={{ marginTop: 14 }}><Label icon={Building}>Hostel / PG Name</Label><Box value={form.hostelName} onChangeText={(v) => set('hostelName', v)} placeholder="Enter Hostel or PG name" /></View>
          <View style={{ marginTop: 14 }}><Label icon={IndianRupee}>Amount (₹)</Label><Box value={form.amount} onChangeText={(v) => set('amount', v.replace(/[^0-9.]/g, ''))} placeholder="8500" keyboardType="numeric" /></View>
          <Button title={`Proceed to Pay ₹${form.amount || '0'}`} onPress={proceed} loading={loading} style={{ marginTop: 20, backgroundColor: '#6d28d9', borderRadius: 12 }} />
        </ScrollView>
      </Sheet>

      <Sheet visible={!!receipt} onClose={() => { setReceipt(null); setOpen(false); }} maxHeight="92%">
        {receipt ? (
          <ScrollView>
            <LinearGradient colors={['#3b93d6', '#005CA8']} style={{ alignItems: 'center', padding: 24 }}>
              <CheckCircle2 size={40} color="#fff" />
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 8 }}>Payment Successful!</Text>
              <Text style={{ fontSize: 12, color: '#dceef9', marginTop: 4 }}>Hostel fee credited to admin account</Text>
            </LinearGradient>
            <View style={{ padding: 20, gap: 10 }}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 1 }}>AMOUNT PAID</Text>
                <Text style={{ fontSize: 30, fontWeight: '900', color: colors.gray900 }}>₹{receipt.amount?.toLocaleString('en-IN')}</Text>
              </View>
              {[['Receipt No', receipt.receiptNumber], ['Student Name', receipt.studentName], ['Roll / Room No', receipt.studentId], ['Hostel Name', receipt.hostelName], ['Fee Period', receipt.feePeriod], ['Payment Method', receipt.paymentMethod], ['Date & Time', receipt.transactionDate]].map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ color: colors.gray500, fontSize: 13 }}>{k}:</Text><Text style={{ fontWeight: '700', color: colors.gray900, fontSize: 13, flexShrink: 1, textAlign: 'right' }}>{v}</Text>
                </View>))}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button title="Share Receipt" variant="outline" onPress={shareReceipt} style={{ flex: 1 }} />
                <Button title="Done" onPress={() => { setReceipt(null); setOpen(false); setForm({ studentName: '', studentId: '', hostelName: '', feePeriod: month, amount: '8500' }); }} style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}
