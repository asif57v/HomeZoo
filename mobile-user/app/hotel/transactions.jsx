import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { PartnerHeader } from '../../src/components/partner/PartnerKit';
import walletService from '../../src/services/walletService';
import { colors } from '../../src/theme';
import { CENTER } from '../../src/lib/responsive';

const P = '#005CA8';

export default function PartnerTransactions() {
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState([]);
  const load = useCallback(async () => {
    try { setLoading(true); const d = await walletService.getTransactions({ type: filter === 'all' ? undefined : filter }); if (d.success) setTxns(d.transactions); }
    catch {} finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerHeader title="Transactions" subtitle="History & Statements" />
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 }}>
        {[['all', 'All'], ['credit', 'Credits'], ['debit', 'Debits']].map(([k, l]) => <TouchableOpacity key={k} onPress={() => setFilter(k)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: filter === k ? P : '#fff', borderWidth: 1, borderColor: filter === k ? P : colors.gray200 }}><Text style={{ fontSize: 12, fontWeight: '700', color: filter === k ? '#fff' : colors.gray600 }}>{l}</Text></TouchableOpacity>)}
      </View>
      <ScrollView contentContainerStyle={[{ padding: 16, paddingTop: 8, gap: 10, paddingBottom: 40 }, CENTER]}>
        {loading ? <ActivityIndicator color={P} style={{ paddingVertical: 50 }} /> : txns.length === 0 ? <Text style={{ textAlign: 'center', color: colors.gray400, paddingVertical: 40 }}>No transactions found</Text> : txns.map((t) => {
          const credit = t.type === 'credit';
          return (
            <View key={t._id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: credit ? colors.green50 : colors.gray100, alignItems: 'center', justifyContent: 'center' }}>{credit ? <ArrowDownLeft size={18} color={colors.green600} /> : <ArrowUpRight size={18} color={colors.gray600} />}</View>
              <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: '700', color: colors.gray900, fontSize: 13 }}>{t.description}</Text><Text style={{ fontSize: 10, color: colors.gray400 }}>{t._id?.slice(-8).toUpperCase()} • {new Date(t.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '900', color: credit ? colors.green600 : colors.gray900 }}>{credit ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray500 }}>{t.status}</Text></View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
