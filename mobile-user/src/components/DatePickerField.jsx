import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react-native';
import { Text } from './ui';
import { colors } from '../theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
export const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtPretty = (s) => { const d = parse(s); return d ? `${pad(d.getDate())} ${MON[d.getMonth()]}, ${d.getFullYear()}` : ''; };

// Native replacement for web ModernDatePicker. `date`/`minDate` are 'YYYY-MM-DD' strings (same as the web `<input type=date>` value)
export default function DatePickerField({ label, date, onChange, minDate, placeholder = 'Select Date', onClear, style }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(date ? parse(date) : new Date());
  useEffect(() => { if (date) setMonth(parse(date)); }, [date]);

  const min = minDate ? parse(minDate) : null;
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7) cells.push(null);
  const sel = date ? parse(date) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <View style={style}>
      {label ? <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 4, fontWeight: '500' }}>{label}</Text> : null}
      <TouchableOpacity onPress={() => setOpen(true)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: open ? colors.surface : colors.gray200, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Calendar size={16} color={date ? colors.surface : colors.gray400} />
          <Text style={{ fontSize: 14, fontWeight: date ? '500' : '400', color: date ? colors.gray800 : colors.gray400 }}>{date ? fmtPretty(date) : placeholder}</Text>
        </View>
        {date && onClear ? <TouchableOpacity onPress={onClear} style={{ padding: 4 }}><X size={14} color={colors.gray400} /></TouchableOpacity> : null}
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Pressable style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, width: 316 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
              <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ padding: 4 }}><ChevronLeft size={20} color={colors.gray600} /></TouchableOpacity>
              <Text style={{ fontWeight: '700', color: colors.gray800, fontSize: 14 }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ padding: 4 }}><ChevronRight size={20} color={colors.gray600} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.gray400 }}>{d}</Text>)}
            </View>
            {Array.from({ length: cells.length / 7 }).map((_, r) => (
              <View key={r} style={{ flexDirection: 'row', marginBottom: 4, gap: 4 }}>
                {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                  if (!d) return <View key={i} style={{ flex: 1, height: 36 }} />;
                  const disabled = min && d < min;
                  const isSel = sel && d.getTime() === sel.getTime();
                  const isToday = d.getTime() === today.getTime();
                  return (
                    <TouchableOpacity key={i} disabled={disabled} onPress={() => { onChange(toYMD(d)); setOpen(false); }}
                      style={{ flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? colors.surface : 'transparent', borderWidth: isToday && !isSel ? 1 : 0, borderColor: colors.surface, opacity: disabled ? 0.3 : 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: isSel || isToday ? '700' : '400', color: isSel ? '#fff' : isToday ? colors.surface : colors.gray700 }}>{d.getDate()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
