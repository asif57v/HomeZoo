import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Bell, Calendar, Tag, Info, Trash2, CheckCircle, Circle } from 'lucide-react-native';
import { Text } from '../src/components/ui';
import { BlueHeader } from '../src/components/Common';
import { userService } from '../src/services/apiService';
import toast from '../src/store/toastStore';
import { colors } from '../src/theme';
import { CENTER } from '../src/lib/responsive';

const ICON = { booking: [Calendar, colors.green100, colors.green600], offer: [Tag, '#F3E8FF', '#9333EA'] };

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [selMode, setSelMode] = useState(false);

  const fetchList = async () => {
    try { const d = await userService.getNotifications(1, 100); if (d.success) setList(d.notifications); }
    catch { toast.error('Failed to load notifications'); } finally { setLoading(false); }
  };
  useEffect(() => { (async () => { try { await userService.markAllNotificationsRead(); } catch {} fetchList(); })(); }, []);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const deleteSelected = () => {
    if (selected.length === 0) return;
    Alert.alert('Delete', `Delete ${selected.length} notification(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await userService.deleteNotifications(selected);
          toast.success('Notifications deleted');
          const rest = list.filter((n) => !selected.includes(n._id));
          setList(rest); setSelected([]); if (rest.length === 0) setSelMode(false);
        } catch { toast.error('Failed to delete'); }
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <BlueHeader title="Notifications" right={list.length > 0 ? <TouchableOpacity onPress={() => { if (selMode) setSelected([]); setSelMode(!selMode); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: selMode ? '#fff' : 'rgba(255,255,255,0.1)' }}><Text style={{ fontSize: 12, fontWeight: '700', color: selMode ? colors.surface : '#fff' }}>{selMode ? 'Cancel' : 'Select'}</Text></TouchableOpacity> : null}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff' }}>Recent Updates</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{list.length} {list.length === 1 ? 'Notification' : 'Notifications'}</Text>
          </View>
          {selMode ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setSelected(selected.length === list.length ? [] : list.map((n) => n._id))} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999 }}>{selected.length === list.length ? <CheckCircle size={18} color="#fff" /> : <Circle size={18} color="#fff" />}</TouchableOpacity>
              {selected.length > 0 ? <TouchableOpacity onPress={deleteSelected} style={{ padding: 8, backgroundColor: colors.red500, borderRadius: 999 }}><Trash2 size={18} color="#fff" /></TouchableOpacity> : null}
            </View>
          ) : null}
        </View>
      </BlueHeader>
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 12 }, CENTER]}>
        {loading ? <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator size="large" color={colors.surface} /></View> : (<>
          {list.map((n) => {
            const [Icon, bg, fg] = ICON[n.type] || [Info, colors.blue100, colors.blue600];
            return (
              <TouchableOpacity key={n._id} activeOpacity={selMode ? 0.7 : 1} onPress={() => selMode && toggle(n._id)} style={{ backgroundColor: n.isRead ? colors.gray50 : '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: selected.includes(n._id) ? colors.surface : colors.gray100, flexDirection: 'row', gap: 14 }}>
                {selMode ? <View style={{ justifyContent: 'center' }}><View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.surface, backgroundColor: selected.includes(n._id) ? colors.surface : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selected.includes(n._id) ? <CheckCircle size={12} color="#fff" /> : null}</View></View> : null}
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={fg} /></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ flex: 1, fontWeight: '700', fontSize: 14, color: colors.gray900 }}>{n.title}</Text>
                    {!n.isRead && !selMode ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red500, marginTop: 6 }} /> : null}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>{n.body}</Text>
                  <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 8, fontWeight: '500' }}>{new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {list.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: 60 }}><Bell size={48} color={colors.gray300} style={{ marginBottom: 8 }} /><Text style={{ color: colors.gray500, fontWeight: '700' }}>No new notifications</Text></View> : null}
        </>)}
      </ScrollView>
    </View>
  );
}
