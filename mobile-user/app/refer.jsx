import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Gift, Copy, Share2, Users, Wallet, Clock, CheckCircle, TrendingUp, Sparkles, MessageCircle, Mail } from 'lucide-react-native';
import { Text } from '../src/components/ui';
import { referralService } from '../src/services/apiService';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

const HOW = [
  { step: 1, title: 'Share Your Code', desc: 'Send your unique referral code to friends', icon: Share2 },
  { step: 2, title: 'Friend Signs Up', desc: 'They register using your referral code', icon: Users },
  { step: 3, title: 'They Book a Stay', desc: 'When they complete their first booking', icon: CheckCircle },
  { step: 4, title: 'You Both Earn', desc: '₹200 credited to both wallets!', icon: Gift },
];

export default function Refer() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('invite');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ code: '...', link: '', earnings: { total: 0, pending: 0, thisMonth: 0 }, stats: { invited: 0, joined: 0, bookings: 0 }, history: [] });

  useEffect(() => {
    (async () => {
      try {
        const res = await referralService.getMyStats();
        if (res.success) { const d = res.data; setData({ code: d.code, link: d.link, earnings: { total: d.earningsTotal || 0, pending: 0, thisMonth: 0 }, stats: d.stats, history: d.history || [] }); }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const copy = async () => { await Clipboard.setStringAsync(data.code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const share = () => Share.share({ title: 'Join HoomZo & Get ₹200!', message: `Hey! Book hotels at amazing prices on HoomZo. Use my referral code ${data.code} to get ₹200 OFF on your first booking! ${data.link || 'https://hoomzo.in'}` }).catch(() => {});
  const text = encodeURIComponent(`Book hotels at amazing prices! Use my referral code ${data.code} to get ₹200 OFF. ${data.link}`);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999 }}><ArrowLeft size={20} color="#fff" /></TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Refer & Earn</Text>
          <TouchableOpacity onPress={() => router.push('/wallet')} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999 }}><Wallet size={20} color="#fff" /></TouchableOpacity>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={[{ paddingBottom: 110 }, CENTER]}>
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 32 }}>
          <LinearGradient colors={[colors.honey, '#ea580c']} style={{ width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 10 }}>
            <Gift size={48} color="#fff" />
            <View style={{ position: 'absolute', top: -8, right: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={16} color={colors.honey} /></View>
          </LinearGradient>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 6 }}>Earn ₹200</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' }}>For every friend who books their first stay using your code</Text>
          <View style={{ flexDirection: 'row', gap: 28, marginTop: 28 }}>
            {[['Invited', data.stats.invited, '#fff'], ['Joined', data.stats.joined, colors.accent], ['Bookings', data.stats.bookings, colors.honey]].map(([k, v, c], i) => (
              <React.Fragment key={k}>
                {i > 0 ? <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} /> : null}
                <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 24, fontWeight: '900', color: c }}>{v}</Text><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>{k}</Text></View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: colors.gray50, borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingTop: 20, paddingHorizontal: 20, minHeight: 420 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {['invite', 'earnings', 'history'].map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: tab === t ? colors.surface : '#fff', borderWidth: tab === t ? 0 : 1, borderColor: colors.gray200 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: tab === t ? '#fff' : colors.gray500 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'invite' ? (
            <View style={{ gap: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray100, elevation: 3 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray400, marginBottom: 12 }}>Your Referral Code</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(0,92,168,0.3)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(0,92,168,0.05)' }}><Text style={{ fontSize: 24, fontWeight: '900', color: colors.surface }}>{data.code}</Text></View>
                  <TouchableOpacity onPress={copy} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: copied ? colors.green500 : colors.surface, alignItems: 'center', justifyContent: 'center' }}>{copied ? <CheckCircle size={24} color="#fff" /> : <Copy size={24} color="#fff" />}</TouchableOpacity>
                </View>
                {copied ? <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.green600, marginTop: 8 }}>✓ Copied to clipboard!</Text> : null}
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray400, marginBottom: 12 }}>Share Via</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[[MessageCircle, 'WhatsApp', '#25D366', () => Linking.openURL(`https://wa.me/?text=${text}`)], [Share2, 'More', '#4267B2', share], [Mail, 'Email', colors.gray600, () => Linking.openURL(`mailto:?subject=${encodeURIComponent('Get ₹200 off on HoomZo')}&body=${text}`)]].map(([Icon, label, bg, act]) => (
                    <TouchableOpacity key={label} onPress={act} style={{ flex: 1, alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.gray100 }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon size={22} color="#fff" /></View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray600 }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray400, marginBottom: 12 }}>How It Works</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray100 }}>
                  {HOW.map((it, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 16 }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,92,168,0.1)', alignItems: 'center', justifyContent: 'center' }}><it.icon size={18} color={colors.surface} /></View>
                        {i < HOW.length - 1 ? <View style={{ width: 2, height: 24, backgroundColor: colors.gray200 }} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16 }}><Text style={{ fontSize: 14, fontWeight: '700', color: colors.surface }}>{it.title}</Text><Text style={{ fontSize: 12, color: colors.gray500 }}>{it.desc}</Text></View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {tab === 'earnings' ? (
            <View style={{ gap: 20 }}>
              <LinearGradient colors={[colors.surface, '#004b8a']} style={{ borderRadius: 16, padding: 24 }}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 }}>Total Earnings</Text>
                <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 16 }}>₹{data.earnings.total}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Pending</Text><Text style={{ fontSize: 18, fontWeight: '700', color: colors.honey }}>₹{data.earnings.pending}</Text></View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}><Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>This Month</Text><Text style={{ fontSize: 18, fontWeight: '700', color: colors.accent }}>₹{data.earnings.thisMonth}</Text></View>
                </View>
              </LinearGradient>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gray100, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><TrendingUp size={16} color={colors.surface} /><Text style={{ fontWeight: '700', color: colors.surface, fontSize: 14 }}>Earnings Breakdown</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.green50, borderRadius: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><CheckCircle size={16} color={colors.green600} /><Text style={{ fontSize: 14, fontWeight: '500', color: colors.gray700 }}>Completed Referrals</Text></View><Text style={{ fontWeight: '700', color: colors.green600 }}>₹{data.earnings.total}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#FEFCE8', borderRadius: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Clock size={16} color="#CA8A04" /><Text style={{ fontSize: 14, fontWeight: '500', color: colors.gray700 }}>Pending Referrals</Text></View><Text style={{ fontWeight: '700', color: '#CA8A04' }}>₹{data.earnings.pending}</Text></View>
              </View>
              <TouchableOpacity onPress={() => router.push('/wallet')} style={{ backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Wallet size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Withdraw to Wallet</Text></TouchableOpacity>
            </View>
          ) : null}

          {tab === 'history' ? (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray400 }}>Referral Activity</Text>
              {data.history.map((it, i) => (
                <View key={it.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <LinearGradient colors={[colors.surface, colors.accent]} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{it.avatar}</Text></LinearGradient>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: colors.surface, fontSize: 14 }}>{it.name}</Text><Text style={{ fontSize: 12, color: colors.gray400 }}>{new Date(it.date).toLocaleDateString()}</Text></View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: it.status === 'completed' || it.status === 'credited' ? colors.green600 : '#CA8A04' }}>+₹{it.reward}</Text>
                    <View style={{ backgroundColor: it.status === 'completed' || it.status === 'credited' ? colors.green50 : '#FEFCE8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '700', color: it.status === 'completed' || it.status === 'credited' ? colors.green600 : '#CA8A04' }}>{it.status}</Text></View>
                  </View>
                </View>
              ))}
              {data.history.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: 48 }}><View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Users size={32} color={colors.gray400} /></View><Text style={{ fontWeight: '700', color: colors.gray600 }}>No referrals yet</Text><Text style={{ fontSize: 12, color: colors.gray400, marginTop: 4 }}>Share your code to start earning!</Text></View> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24 }}>
        <TouchableOpacity onPress={share} activeOpacity={0.9}>
          <LinearGradient colors={[colors.surface, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 10 }}>
            <Share2 size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>Invite Friends & Earn ₹200</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
