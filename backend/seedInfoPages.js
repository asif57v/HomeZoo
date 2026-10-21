import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InfoPage from './models/InfoPage.js';

dotenv.config();

const uri = process.env.MONGODB_URL;

if (!uri) {
  console.error('MONGODB_URL is not set');
  process.exit(1);
}

// Content format (rendered by the apps): "# Heading", "## Sub heading", "- bullet", blank line = new paragraph.
// These are starter drafts only - the admin panel (Legal & Content) is the source of truth.
// Seeding never overwrites a page the admin has already saved.
const docs = [
  {
    audience: 'user',
    slug: 'terms',
    title: 'Terms & Conditions',
    content: `# 1. Acceptance of terms
By creating an account or booking through HoomZo you agree to these Terms & Conditions.

# 2. Bookings & payments
- A booking is confirmed only after successful payment and confirmation from the property.
- Prices include applicable taxes shown at checkout.
- Each property may have its own check-in time, ID proof and house rules which you must follow.

# 3. Cancellation & refunds
- Cancellation rules are shown on each property before you pay.
- Eligible refunds are returned to the original payment method within 5-7 working days.

# 4. Your responsibilities
- Provide accurate details and valid government ID at check-in.
- Do not damage the property or misuse the platform.

# 5. Changes to these terms
We may update these terms from time to time. Continued use of HoomZo means you accept the updated terms.`
  },
  {
    audience: 'user',
    slug: 'privacy',
    title: 'Privacy Policy',
    content: `# 1. Information we collect
- Profile details such as name, phone number and email.
- Booking history, saved properties and reviews.
- Device and usage data to keep the app secure and improve it.

# 2. How we use it
- To process bookings and payments.
- To send booking updates and notifications.
- To improve recommendations and customer support.

# 3. Sharing
We share only the details needed to complete your stay with the property you book. We never sell your personal data.

# 4. Your choices
You can edit your profile, manage notifications or request deletion of your account from Settings or by contacting support.

# 5. Security
Your data is stored securely and access is restricted to authorised systems and team members.`
  },
  {
    audience: 'user',
    slug: 'support',
    title: 'Help & Support',
    content: `Having trouble with a booking, payment or your account? Reach out and our team will get back to you as soon as possible.

# Before you contact us
- Keep your booking ID handy.
- Check the FAQs below for quick answers.`,
    supportEmail: 'support@hoomzo.in',
    supportPhone: '9111384535',
    supportWhatsapp: '919111384535',
    supportHours: 'Every day, 9:00 AM - 9:00 PM'
  },
  {
    audience: 'user',
    slug: 'about',
    title: 'About HoomZo',
    content: 'HoomZo is a mobile-first platform to discover, compare and book stays across hotels, PGs, homestays and villas. Our goal is to make city stays simple and transparent for young travellers and working professionals.'
  },
  {
    audience: 'user',
    slug: 'contact',
    title: 'Contact Us',
    content: 'For support related to bookings, payments or account access, write to us or call our helpdesk during business hours.'
  },
  {
    audience: 'partner',
    slug: 'terms',
    title: 'Partner Agreement',
    content: `# 1. Relationship with HoomZo
By listing your property you act as an independent service provider. HoomZo is an intermediary platform that connects you with guests.

# 2. Accuracy
Keep availability, pricing, photos and property details accurate and up to date.

# 3. Payouts & commission
- Commission and payout schedule are shared during onboarding.
- Payouts are processed for completed stays.

# 4. Bookings
- Honour all confirmed bookings.
- Repeated cancellations or poor guest feedback may lead to delisting.`
  },
  {
    audience: 'partner',
    slug: 'privacy',
    title: 'Partner Data Policy',
    content: `# What we store
Your property, booking and payout information, used to run reports, process payments and help you manage performance.

# Guest data
Guest details shared with you are for fulfilling the booking only and must not be used for any other purpose.

# Access
Access to this data is restricted to authorised systems and team members.`
  },
  {
    audience: 'partner',
    slug: 'support',
    title: 'Partner Support',
    content: 'Questions about onboarding, payouts or your listings? Our partner support team is here to help.',
    supportEmail: 'partners@rokkooin.com',
    supportPhone: '9111384535',
    supportWhatsapp: '919111384535',
    supportHours: 'Mon - Sat, 10:00 AM - 7:00 PM'
  },
  {
    audience: 'partner',
    slug: 'about',
    title: 'About HoomZo Partner',
    content: 'HoomZo Partner is a dashboard for hotels, PGs and homestays to manage listings, track bookings and view payouts in a mobile-first way.'
  },
  {
    audience: 'partner',
    slug: 'contact',
    title: 'Contact HoomZo Team',
    content: 'For questions about onboarding, payouts or property performance, reach our partner support team.'
  }
];

const run = async () => {
  try {
    await mongoose.connect(uri);

    for (const doc of docs) {
      await InfoPage.updateOne(
        { audience: doc.audience, slug: doc.slug },
        { $setOnInsert: doc },
        { upsert: true }
      );
    }

    console.log('InfoPage seed completed');
    process.exit(0);
  } catch (error) {
    console.error('InfoPage seed failed', error);
    process.exit(1);
  }
};

run();
