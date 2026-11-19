// Single theme file built from the web's tokens (frontend/src/index.css @theme + Tailwind palette used by the screens)
export const colors = {
  background: '#F8FAFC',
  surface: '#005CA8', // brand primary
  accent: '#006BC4',
  textLight: '#F0F8FF',
  textDark: '#002240',
  honey: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  primary: '#005CA8',
  primarySoft: '#F0F8FF',
  partnerBorder: '#B3D9FF',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue500: '#3B82F6', blue600: '#2563eb', blue700: '#1d4ed8',
  navActive: '#1a56db',
  navInactive: '#788292',
  amber50: '#FFFBEB', amber100: '#FEF3C7', amber400: '#FBBF24', amber500: '#F59E0B', amber600: '#D97706', amber700: '#B45309',
  orange50: '#FFF7ED', orange100: '#FFEDD5',
  slate50: '#F8FAFC', slate100: '#F1F5F9', slate200: '#E2E8F0', slate300: '#CBD5E1', slate400: '#94A3B8',
  slate500: '#64748B', slate600: '#475569', slate700: '#334155', slate800: '#1E293B', slate900: '#0F172A',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray300: '#D1D5DB', gray400: '#9CA3AF',
  gray500: '#6B7280', gray600: '#4B5563', gray700: '#374151', gray800: '#1F2937', gray900: '#111827',
  red50: '#FEF2F2', red100: '#FEE2E2', red500: '#EF4444', red600: '#DC2626', red700: '#B91C1C',
  green50: '#F0FDF4', green100: '#DCFCE7', green500: '#22C55E', green600: '#16A34A', green700: '#15803D',
  emerald50: '#f0f7fd', emerald100: '#dceef9', emerald500: '#3b93d6', emerald600: '#005CA8', emerald700: '#004b8a',
  teal50: '#F0FDFA', teal500: '#14B8A6', teal600: '#0D9488',
  yellow400: '#FACC15', yellow500: '#EAB308',
  purple50: '#FAF5FF', purple500: '#A855F7', purple600: '#9333EA', indigo600: '#4F46E5', orange500: '#F97316', rose500: '#F43F5E',
};

export const fonts = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
  black: 'Poppins_900Black',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, full: 999 };

export const shadow = {
  sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  lg: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
};

export const fontFor = (weight) => {
  const w = String(weight || '400');
  if (w === '300') return fonts.light;
  if (w === '500') return fonts.medium;
  if (w === '600') return fonts.semibold;
  if (w === '700' || w === 'bold') return fonts.bold;
  if (w === '800') return fonts.extrabold;
  if (w === '900') return fonts.black;
  return fonts.regular;
};
