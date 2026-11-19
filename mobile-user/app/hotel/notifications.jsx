import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Bell, Calendar, Tag, Info, Trash2, CheckCircle, Circle } from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { PartnerBack } from '../../src/components/partner/PartnerKit';
import { hotelService } from '../../src/services/apiService';
import toast from '../../src/store/toastStore';
import { colors } from '../../src/theme';

const P = '#005CA8';
const ICON = { booking: [Calendar, colors.green100, colors.green600], offer: [Tag, '#F3E8FF', '#9333EA'] };

export default function PartnerNotifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [selMode, setSelMode] = useState(false);
  const fetchList = async () => { try { const d = await hotelService.getNotifications(1, 100); if (d.success) setList(d.notifications); } catch { toast.error('Failed to load notifications'); } finally { setLoading(false); } };
  useEffect(() => { (async () => { try { await hotelService.markAllNotificationsRead(); } catch {} fetchList(); })(); }, []);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const del = () => {
    if (!selected.length) return;
    Alert.alert('Delete', `Delete ${selected.length} notification(s)?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await hotelService.deleteNotifications(selected); toast.success('Notifications deleted'); const rest = list.filter((n) => !selected.includes(n._id)); setList(rest); setSelected([]); if (!rest.length) setSelMode(false); } catch { toast.error('Failed to delete'); }
    } }]);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerBack title="Notifications" subtitle={`${list.length} ${list.length === 1 ? 'notification' : 'notifications'}`} right={list.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {selMode ? <TouchableOpacity onPress={() => setSelected(selected.length === list.length ? [] : list.map((n) => n._id))} style={{ padding: 6 }}>{selected.length === list.length ? <CheckCircle size={18} color={P} /> : <Circle size={18} color={colors.gray500} />}</TouchableOpacity> : null}
          {selMode && selected.length > 0 ? <TouchableOpacity onPress={del} style={{ padding: 6, backgroundColor: colors.red500, borderRadius: 999 }}><Trash2 size={16} color="#fff" /></TouchableOpacity> : null}
          <TouchableOpacity onPress={() => { if (selMode) setSelected([]); setSelMode(!selMode); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.blue50 }}><Text style={{ fontSize: 12, fontWeight: '700', color: P }}>{selMode ? 'Cancel' : 'Select'}</Text></TouchableOpacity>
        </View>
      ) : null} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {loading ? <ActivityIndicator color={P} size="large" style={{ paddingVertical: 60 }} /> : list.map((n) => {
          const [Icon, bg, fg] = ICON[n.type] || [Info, colors.blue100, colors.blue600];
          return (
            <TouchableOpacity key={n._id} activeOpacity={selMode ? 0.7 : 1} onPress={() => selMode && toggle(n._id)} style={{ backgroundColor: n.isRead ? colors.gray50 : '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: selected.includes(n._id) ? P : colors.gray100, flexDirection: 'row', gap: 12 }}>
              {selMode ? <View style={{ justifyContent: 'center' }}><View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: P, backgroundColor: selected.includes(n._id) ? P : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selected.includes(n._id) ? <CheckCircle size={12} color="#fff" /> : null}</View></View> : null}
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={fg} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ flex: 1, fontWeight: '700', fontSize: 14, color: colors.gray900 }}>{n.title}</Text>{!n.isRead && !selMode ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red500, marginTop: 6 }} /> : null}</View>
                <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>{n.body}</Text>
                <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 8 }}>{new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {!loading && list.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: 60 }}><Bell size={40} color={colors.gray300} /><Text style={{ color: colors.gray500, fontWeight: '700', marginTop: 8 }}>No notifications</Text></View> : null}
      </ScrollView>
    </View>
  );
}
