import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Plus, CheckCircle, AlertTriangle, Globe, Lock, BedDouble } from 'lucide-react-native';
import { Text, Input, Sheet } from '../../../src/components/ui';
import { PartnerBack } from '../../../src/components/partner/PartnerKit';
import DatePickerField, { toYMD } from '../../../src/components/DatePickerField';
import { propertyService, availabilityService } from '../../../src/services/apiService';
import toast from '../../../src/store/toastStore';
import { errMsg } from '../../../src/utils/format';
import { colors } from '../../../src/theme';

const P = '#005CA8';
const addDay = (s) => { const d = new Date(s); d.setDate(d.getDate() + 1); return toYMD(d); };

export default function PartnerInventory() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [current, setCurrent] = useState(new Date());
  const [avail, setAvail] = useState({});
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('walk_in');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({ startDate: '', endDate: '', units: 1, platform: '', referenceNo: '', notes: '' });

  useEffect(() => {
    (async () => {
      try { const res = await propertyService.getDetails(id); setProperty(res.property); const rooms = res.roomTypes || []; setRoomTypes(rooms); if (rooms.length) setSelectedRoom(rooms[0]); }
      catch {} finally { setLoading(false); }
    })();
  }, [id]);

  const loadAvail = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      const year = current.getFullYear(); const month = current.getMonth();
      const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0);
      await availabilityService.check({ propertyId: id, checkIn: first.toISOString(), checkOut: last.toISOString() });
      const ledger = await availabilityService.getLedger({ propertyId: id, roomTypeId: selectedRoom._id, startDate: first.toISOString(), limit: 500 });
      const map = {}; const total = selectedRoom?.totalInventory || 0;
      for (let d = 1; d <= last.getDate(); d++) {
        const dateObj = new Date(year, month, d); let blocked = 0;
        (ledger.entries || []).forEach((e) => { const s = new Date(e.startDate); const en = new Date(e.endDate); if (dateObj >= s && dateObj < en) blocked += e.units; });
        map[d] = Math.max(0, total - blocked);
      }
      setAvail(map);
    } catch {}
  }, [selectedRoom, current, id]);
  useEffect(() => { loadAvail(); }, [loadAvail, refresh]);

  const openFor = (start) => { setForm((f) => ({ ...f, startDate: start, endDate: addDay(start), units: 1 })); setOpen(true); };
  const dayClick = (day) => openFor(toYMD(new Date(current.getFullYear(), current.getMonth(), day)));

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = { propertyId: id, roomTypeId: selectedRoom._id, startDate: form.startDate, endDate: form.endDate, units: Number(form.units) };
      let res;
      if (tab === 'walk_in') res = await availabilityService.createWalkIn(payload);
      else if (tab === 'external') res = await availabilityService.createExternal({ ...payload, platform: form.platform, referenceNo: form.referenceNo });
      else res = await availabilityService.blockDates({ ...payload, notes: form.notes });
      if (res.success) { setOpen(false); toast.success('Inventory updated successfully!'); setRefresh((r) => r + 1); }
    } catch (e) { toast.error(errMsg(e, 'Operation failed')); } finally { setBusy(false); }
  };

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={P} /></View>;

  const year = current.getFullYear(); const month = current.getMonth();
  const firstDow = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate();
  const cells = []; for (let i = 0; i < firstDow; i++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(d); while (cells.length % 7) cells.push(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <PartnerBack title="Inventory Manager" subtitle={property?.propertyName} right={<CalendarIcon size={20} color={P} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 110 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {roomTypes.map((rt) => <TouchableOpacity key={rt._id} onPress={() => setSelectedRoom(rt)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: selectedRoom?._id === rt._id ? P : '#fff', borderWidth: 1, borderColor: selectedRoom?._id === rt._id ? P : colors.gray200 }}><BedDouble size={14} color={selectedRoom?._id === rt._id ? '#fff' : colors.gray600} /><Text style={{ fontSize: 12, fontWeight: '700', color: selectedRoom?._id === rt._id ? '#fff' : colors.gray600 }}>{rt.name}</Text></TouchableOpacity>)}
        </ScrollView>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.gray100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontWeight: '800', color: colors.gray900, fontSize: 16 }}>{current.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => { const d = new Date(current); d.setMonth(d.getMonth() - 1); setCurrent(d); }} style={{ padding: 6, backgroundColor: colors.gray100, borderRadius: 8 }}><ChevronLeft size={16} color={colors.gray700} /></TouchableOpacity>
              <TouchableOpacity onPress={() => { const d = new Date(current); d.setMonth(d.getMonth() + 1); setCurrent(d); }} style={{ padding: 6, backgroundColor: colors.gray100, borderRadius: 8 }}><ChevronRight size={16} color={colors.gray700} /></TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.gray400 }}>{d}</Text>)}</View>
          {Array.from({ length: cells.length / 7 }).map((_, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
              {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                if (!d) return <View key={i} style={{ flex: 1, height: 52 }} />;
                const a = avail[d]; const sold = a === 0; const low = a > 0 && a <= 2;
                return (
                  <TouchableOpacity key={i} onPress={() => dayClick(d)} style={{ flex: 1, height: 52, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderColor: sold ? colors.red100 : low ? '#FED7AA' : colors.gray100, backgroundColor: sold ? colors.red50 : low ? colors.orange50 : '#fff' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray800 }}>{d}</Text>
                    {selectedRoom ? (sold ? <Text style={{ fontSize: 7, fontWeight: '800', color: colors.red600 }}>SOLD OUT</Text> : <Text style={{ fontSize: 8, color: low ? colors.orange500 : colors.green600, fontWeight: '600' }}>{a !== undefined ? a : '-'} left</Text>) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {[['Available', colors.green600], ['Low Stock', colors.orange500], ['Sold Out', colors.red600]].map(([l, c]) => <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /><Text style={{ fontSize: 10, color: colors.gray500 }}>{l}</Text></View>)}
          </View>
        </View>
      </ScrollView>
      <TouchableOpacity onPress={() => openFor(toYMD(new Date()))} style={{ position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: P, alignItems: 'center', justifyContent: 'center', elevation: 8 }}><Plus size={28} color="#fff" /></TouchableOpacity>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Update Inventory" maxHeight="90%">
        <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ gap: 12, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 12, color: colors.gray500, marginTop: -6 }}>{selectedRoom?.name}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ id: 'walk_in', label: 'Walk-in', Icon: Users }, { id: 'external', label: 'Ext. Booking', Icon: Globe }, { id: 'block', label: 'Block', Icon: Lock }].map((t) => (
              <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: tab === t.id ? P : colors.gray100 }}><t.Icon size={18} color={tab === t.id ? '#fff' : colors.gray600} /><Text style={{ fontSize: 11, fontWeight: '700', color: tab === t.id ? '#fff' : colors.gray600 }}>{t.label}</Text></TouchableOpacity>
            ))}
          </View>
          <DatePickerField label="Check-in" date={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v, endDate: f.endDate <= v ? addDay(v) : f.endDate }))} />
          <DatePickerField label="Check-out" date={form.endDate} minDate={form.startDate ? addDay(form.startDate) : undefined} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} />
          <View>
            <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>Number of Rooms</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={() => setForm((f) => ({ ...f, units: Math.max(1, f.units - 1) }))} style={{ padding: 10, backgroundColor: colors.gray100, borderRadius: 10 }}><ChevronLeft size={20} color={colors.gray700} /></TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '800', minWidth: 30, textAlign: 'center' }}>{form.units}</Text>
              <TouchableOpacity onPress={() => setForm((f) => ({ ...f, units: f.units + 1 }))} style={{ padding: 10, backgroundColor: colors.gray100, borderRadius: 10 }}><ChevronRight size={20} color={colors.gray700} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 4 }}>Maximum {selectedRoom?.totalInventory} units available in total.</Text>
          </View>
          {tab === 'external' ? (<>
            <View><Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 6 }}>Platform Name</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Booking.com', 'MakeMyTrip', 'Airbnb', 'Goibibo', 'Agoda', 'Other'].map((pl) => <TouchableOpacity key={pl} onPress={() => setForm((f) => ({ ...f, platform: pl }))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: form.platform === pl ? P : colors.gray200, backgroundColor: form.platform === pl ? P : '#fff' }}><Text style={{ fontSize: 12, fontWeight: '600', color: form.platform === pl ? '#fff' : colors.gray600 }}>{pl}</Text></TouchableOpacity>)}</View>
            </View>
            <View><Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>Reference No.</Text><Input value={form.referenceNo} onChangeText={(v) => setForm((f) => ({ ...f, referenceNo: v }))} placeholder="Booking reference" style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12 }} /></View>
          </>) : null}
          {tab === 'block' ? <View><Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>Notes</Text><Input value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Reason for blocking" multiline style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: 'top' }} /></View> : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <TouchableOpacity disabled={busy} onPress={submit} style={{ backgroundColor: P, paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{tab === 'walk_in' ? 'Add Walk-in' : tab === 'external' ? 'Add External Booking' : 'Block Dates'}</Text>}</TouchableOpacity>
        </View>
      </Sheet>
    </View>
  );
}
