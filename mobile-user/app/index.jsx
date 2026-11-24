import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import HeroSection from '../src/components/home/HeroSection';
import PropertyTypeFilter from '../src/components/home/PropertyTypeFilter';
import PayHostelFees from '../src/components/home/PayHostelFees';
import HomeBottomSections from '../src/components/home/HomeBottomSections';
import {
  Band, SectionHeader, PopularCategories, BannerCarousel, ExclusiveOffers, FeaturedCategories, TopPropertiesSection,
  PropertyFeed, ReelSection, LatestProjectsBanner, CollectionSection,
} from '../src/components/home/HomeSections';
import { categoryService } from '../src/services/categoryService';
import homeService from '../src/services/homeService';
import { useFeatureFlags } from '../src/store/featureFlagsStore';
import { getStoredLocation, subscribeLocation } from '../src/utils/userLocation';
import { CENTER_WIDE } from '../src/lib/responsive';

const ART = {
  pg: [require('../assets/hero/pg_hero_art.png'), require('../assets/hero/pg_hero_art_2.png')],
  rent: [require('../assets/hero/rent_hero_art.png'), require('../assets/hero/rent_hero_art_2.png')],
  buy: [require('../assets/hero/buy_hero_art.png'), require('../assets/hero/buy_hero_art_2.png')],
  plot: [require('../assets/hero/plot_hero_art.png'), require('../assets/hero/plot_hero_art_2.png')],
};

// Category theme map (same palettes as web Home.jsx)
const THEME_MAP = {
  Hotel: { dark: ['#002240', '#005CA8'], pageBg: '#F8FAFC', accent: '#005CA8', art: ART.pg },
  'PG/Co-Living': { dark: ['#881337', '#9F1239'], pageBg: '#FFF1F2', accent: '#E11D48', art: ART.pg },
  Rent: { dark: ['#4C1D95', '#5B21B6'], pageBg: '#F5F3FF', accent: '#8B5CF6', art: ART.rent },
  Buy: { dark: ['#1E3A8A', '#1E40AF'], pageBg: '#EFF6FF', accent: '#3B82F6', art: ART.buy },
  Plot: { dark: ['#A84900', '#D97706'], pageBg: '#FFFBEB', accent: '#F59E0B', art: ART.plot },
  default: { dark: ['#002240', '#005CA8'], pageBg: '#FFFFFF', accent: '#005CA8', art: ART.buy },
};

export default function Home() {
  const { razorpayEnabled, phonepeHostelFeesEnabled } = useFeatureFlags();
  const scrollRef = useRef(null);
  const [selectedType, setSelectedType] = useState({ id: null, label: 'All' });
  const [pgFilters, setPgFilters] = useState({ gender: undefined, occupancy: undefined, foodIncluded: undefined });
  const [sectionIds, setSectionIds] = useState({ pg: null, rent: null, buy: null, plot: null });
  const [homeData, setHomeData] = useState({ popularCategories: [], featuredCategories: [], banners: { HOME_TOP: [], HOME_MIDDLE: [], CATEGORY_PAGE: [] }, offers: [], sections: {} });
  const [homeLoading, setHomeLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(getStoredLocation);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const currentCity = userLocation.city;
  const nearLocation = useMemo(() => ({ lat: userLocation.lat, lng: userLocation.lng, city: userLocation.city }), [userLocation.lat, userLocation.lng, userLocation.city]);

  useEffect(() => subscribeLocation(setUserLocation), []);

  const fetchHome = useCallback(async () => {
    try {
      setHomeLoading(true);
      const data = await homeService.getHomeData(currentCity);
      if (data) setHomeData({
        popularCategories: data.popularCategories || [], featuredCategories: data.featuredCategories || [],
        banners: data.banners || { HOME_TOP: [], HOME_MIDDLE: [], CATEGORY_PAGE: [] }, offers: data.offers || [], sections: data.sections || {},
      });
    } finally { setHomeLoading(false); }
  }, [currentCity]);
  useEffect(() => { fetchHome(); }, [fetchHome]);

  const [categoriesData, setCategoriesData] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const categories = await categoryService.getActiveCategories();
        setCategoriesData(categories);
        const find = (names) => {
          const list = Array.isArray(names) ? names : [names];
          const found = categories.filter((c) => list.some((n) => (c.displayName || '').toLowerCase() === n.toLowerCase() || (c.name || '').toLowerCase() === n.toLowerCase()));
          return found.length ? found.map((c) => c._id).join(',') : null;
        };
        setSectionIds({ pg: find(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig']), rent: find('Rent'), buy: find('Buy'), plot: find(['Plot', 'Plots']) });
      } catch {}
    })();
  }, []);

  const theme = useMemo(() => {
    if (!selectedType.label || selectedType.label === 'All' || !selectedType.id) return THEME_MAP.default;
    return THEME_MAP[selectedType.label] || THEME_MAP.default;
  }, [selectedType]);

  const selectType = (id, label) => {
    setSelectedType({ id, label });
    setPgFilters({ gender: undefined, occupancy: undefined, foodIncluded: undefined });
  };
  const openCategory = (id, label) => { selectType(id, label); scrollRef.current?.scrollTo({ y: 0, animated: true }); };

  const onRefresh = async () => { setRefreshing(true); await fetchHome(); setRefreshKey((k) => k + 1); setRefreshing(false); };

  const isAll = !selectedType.id || selectedType.label === 'All';
  const showHostelFees = razorpayEnabled && phonepeHostelFeesEnabled !== false && homeData.sections?.hostelFeePayment?.enabled !== false;
  const showOffers = Boolean(homeData.offers && homeData.offers.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ zIndex: 40 }}>
          <LinearGradient colors={theme.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' }]}>
            <View style={{ ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} pointerEvents="none">
              <Image source={theme.art[0]} style={{ width: 240, height: 240, marginLeft: -64, transform: [{ translateY: -32 }] }} contentFit="cover" />
              <Image source={theme.art[1]} style={{ width: 240, height: 240, marginRight: -64, transform: [{ translateY: -32 }] }} contentFit="cover" />
            </View>
          </LinearGradient>
          <SafeAreaView edges={['top']} style={CENTER_WIDE}>
            <HeroSection theme={theme} selectedType={selectedType} />
            <View style={{ paddingTop: 4, paddingBottom: 8 }}>
              <PropertyTypeFilter selectedType={selectedType.id} onSelectType={selectType} theme={theme} />
            </View>
          </SafeAreaView>
        </View>

        <View style={CENTER_WIDE}>
        {isAll ? (
          <View style={{ gap: 12, marginTop: 12 }}>
            <PopularCategories categories={homeData.popularCategories} loading={homeLoading} onSelectCategory={openCategory} />
            <BannerCarousel banners={homeData.banners?.HOME_TOP} loading={homeLoading} placement="HOME_TOP" />
            {(showOffers || showHostelFees) ? (
              <Band tone="tint" rounded style={{ marginVertical: 4, paddingVertical: 14, gap: 12 }}>
                {showOffers ? <ExclusiveOffers offers={homeData.offers} loading={homeLoading} /> : null}
                {showHostelFees ? <PayHostelFees title={homeData.sections?.hostelFeePayment?.title} /> : null}
              </Band>
            ) : null}
            <TopPropertiesSection config={homeData.sections?.topProperties} loading={homeLoading} />
            <FeaturedCategories categories={homeData.featuredCategories} loading={homeLoading} onSelectCategory={openCategory} title={homeData.sections?.featuredCategories?.title || 'Featured Categories'} subtitle={homeData.sections?.featuredCategories?.subtitle} />
            {sectionIds.pg ? (
              <Band tone="white">
                <SectionHeader title="Find your perfect stay" subtitle={`Top rated PGs and hostels in ${currentCity}`} onAction={() => openCategory(sectionIds.pg, 'PG/Co-Living')} />
                <PropertyFeed key={`pg${refreshKey}`} nearLocation={nearLocation} selectedType={sectionIds.pg} viewMode="stay-carousel" limit={8} source="Home · Find your perfect stay" />
              </Band>
            ) : null}
            <BannerCarousel banners={homeData.banners?.HOME_MIDDLE} loading={homeLoading} placement="HOME_MIDDLE" />
            <ReelSection key={`r${refreshKey}`} category={selectedType.label} banded />
            {sectionIds.rent ? (
              <Band tone="violet" rounded>
                <SectionHeader title="Properties for rent" subtitle={`Apartments, homes and villas in ${currentCity}`} onAction={() => openCategory(sectionIds.rent, 'Rent')} />
                <PropertyFeed key={`rent${refreshKey}`} nearLocation={nearLocation} selectedType={sectionIds.rent} viewMode="rent-grid" limit={8} source="Home · Properties for rent" />
              </Band>
            ) : null}
            {sectionIds.buy ? (
              <Band tone="white">
                <SectionHeader title="Dream homes for sale" subtitle={`Buy your perfect home in ${currentCity}`} onAction={() => openCategory(sectionIds.buy, 'Buy')} />
                <PropertyFeed key={`buy${refreshKey}`} nearLocation={nearLocation} selectedType={sectionIds.buy} viewMode="sale-grid" limit={8} source="Home · Dream homes for sale" />
              </Band>
            ) : null}
            {sectionIds.plot ? (
              <Band tone="sand" rounded>
                <SectionHeader title="Premium plots & land" subtitle={`Invest in the best locations in ${currentCity}`} onAction={() => openCategory(sectionIds.plot, 'Plot')} />
                <PropertyFeed key={`plot${refreshKey}`} nearLocation={nearLocation} selectedType={sectionIds.plot} viewMode="plot-grid" limit={8} source="Home · Premium plots & land" />
              </Band>
            ) : null}
          </View>
        ) : (
          <View style={{ marginTop: 8, gap: 8 }}>
            {homeData.banners?.CATEGORY_PAGE?.length > 0 ? <BannerCarousel banners={homeData.banners.CATEGORY_PAGE} placement="CATEGORY_PAGE" /> : null}
            <LatestProjectsBanner categoryId={selectedType.id} categoryName={selectedType.label} theme={theme} />
            {selectedType.label === 'PG/Co-Living' ? <CollectionSection onFilter={setPgFilters} activeFilters={pgFilters} /> : null}
            <ReelSection category={selectedType.label} />
            <PropertyFeed key={`g${refreshKey}`} nearLocation={nearLocation} selectedType={selectedType.id} viewMode="grid" extraFilters={pgFilters} source={`Category · ${selectedType.label}`} />
          </View>
        )}

        {isAll ? <View style={{ marginTop: 24, paddingHorizontal: 0 }}><HomeBottomSections /></View> : null}
        </View>
      </ScrollView>
    </View>
  );
}
