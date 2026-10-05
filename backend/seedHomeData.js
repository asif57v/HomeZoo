/**
 * Seed script for home screen data: Categories (with popular/featured flags), Banners, and Offers.
 * 
 * Usage: node seedHomeData.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import PropertyCategory from './models/PropertyCategory.js';
import Banner from './models/Banner.js';
import Offer from './models/Offer.js';

const MONGO_URL = process.env.MONGODB_URL || "mongodb+srv://rukkooin:rukkooin@cluster0.6mzfrnp.mongodb.net/?appName=Cluster0";

async function seed() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // ──────────────────────────────────────
    //  1. Update existing categories with popular/featured flags
    // ──────────────────────────────────────

    const popularFeaturedMap = [
      { slug: 'pg-co-living', isPopular: true, popularOrder: 1, isFeatured: true, featuredOrder: 1, tagline: 'Affordable co-living spaces near you', image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80' },
      { slug: 'hostel', isPopular: true, popularOrder: 2, isFeatured: false, tagline: 'Budget-friendly stays for students', image: 'https://images.unsplash.com/photo-1520277739336-7bf67edfa768?w=600&q=80' },
      { slug: 'rent', isPopular: true, popularOrder: 3, isFeatured: true, featuredOrder: 2, tagline: 'Find your dream rental home', image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80' },
      { slug: 'buy', isPopular: true, popularOrder: 4, isFeatured: true, featuredOrder: 3, tagline: 'Own your dream property', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
      { slug: 'plot', isPopular: true, popularOrder: 5, isFeatured: false, tagline: 'Premium plots and land', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80' },
      { slug: 'hotel', isPopular: true, popularOrder: 6, isFeatured: true, featuredOrder: 4, tagline: 'Luxury stays at best prices', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80' },
    ];

    for (const item of popularFeaturedMap) {
      const cat = await PropertyCategory.findOne({ slug: item.slug });
      if (cat) {
        cat.isPopular = item.isPopular;
        cat.popularOrder = item.popularOrder;
        cat.isFeatured = item.isFeatured || false;
        cat.featuredOrder = item.featuredOrder || 999;
        cat.tagline = item.tagline || '';
        if (!cat.image || cat.image === '') cat.image = item.image || '';
        await cat.save();
        console.log(`  ✅ Updated category: ${cat.name} (popular: ${cat.isPopular}, featured: ${cat.isFeatured})`);
      } else {
        console.log(`  ⚠️ Category with slug "${item.slug}" not found, skipping.`);
      }
    }

    // ──────────────────────────────────────
    //  2. Seed Banners
    // ──────────────────────────────────────

    const bannerSeeds = [
      {
        title: 'Find Your Dream PG',
        subtitle: 'Verified PGs and hostels near your college',
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
        placement: 'HOME_TOP',
        linkType: 'CATEGORY',
        linkValue: 'pg-co-living',
        cities: [],
        priority: 1,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      },
      {
        title: 'Festive Offer: 20% Off',
        subtitle: 'Use code FESTIVE20 on your first booking',
        image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80',
        placement: 'HOME_TOP',
        linkType: 'OFFER',
        linkValue: 'FESTIVE20',
        cities: [],
        priority: 2,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Premium Properties in Indore',
        subtitle: 'Handpicked luxury homes and apartments',
        image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
        placement: 'HOME_MIDDLE',
        linkType: 'EXTERNAL_URL',
        linkValue: '/search?city=Indore',
        cities: ['Indore'],
        priority: 1,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const banner of bannerSeeds) {
      const exists = await Banner.findOne({ title: banner.title });
      if (!exists) {
        await Banner.create(banner);
        console.log(`  ✅ Created banner: ${banner.title}`);
      } else {
        console.log(`  ⏭️ Banner "${banner.title}" already exists, skipping.`);
      }
    }

    // ──────────────────────────────────────
    //  3. Seed Offers (if not existing)
    // ──────────────────────────────────────

    const offerSeeds = [
      {
        title: 'New User Special',
        subtitle: 'Flat ₹100 Off on your first booking',
        description: 'Applicable on all properties for new users.',
        code: 'HOOMZO100',
        discountType: 'flat',
        discountValue: 100,
        minBookingAmount: 500,
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
        bg: 'bg-[#004F4D]',
        btnText: 'Apply Now',
        userLimit: 1,
        usageLimit: 5000,
        firstBookingOnly: true,
        showOnHome: true,
        cities: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        title: 'Festive Bonanza',
        subtitle: 'Get 20% Off up to ₹1000',
        description: 'Celebrate with amazing discounts on premium stays.',
        code: 'FESTIVE20',
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 1000,
        minBookingAmount: 2000,
        image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
        bg: 'bg-[#1A1A1A]',
        btnText: 'Grab Deal',
        userLimit: 2,
        usageLimit: 10000,
        firstBookingOnly: false,
        showOnHome: true,
        cities: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        title: 'Weekend Getaway',
        subtitle: 'Flat ₹250 Off on weekend bookings',
        description: 'Book any hotel or resort for the weekend and save.',
        code: 'WEEKEND250',
        discountType: 'flat',
        discountValue: 250,
        minBookingAmount: 1000,
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
        bg: 'bg-[#2D1B4E]',
        btnText: 'Book Now',
        userLimit: 3,
        usageLimit: 3000,
        firstBookingOnly: false,
        showOnHome: true,
        cities: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];

    for (const offer of offerSeeds) {
      const exists = await Offer.findOne({ code: offer.code });
      if (!exists) {
        await Offer.create(offer);
        console.log(`  ✅ Created offer: ${offer.title} (${offer.code})`);
      } else {
        console.log(`  ⏭️ Offer "${offer.code}" already exists, skipping.`);
      }
    }

    console.log('\n🎉 Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error);
    process.exit(1);
  }
}

seed();
