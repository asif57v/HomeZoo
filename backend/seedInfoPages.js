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
    content: `# 1. Introduction
Welcome to Hoomzo. We are committed to protecting your privacy and ensuring your personal information is handled in a safe, transparent, and responsible manner. This Privacy Policy outlines how we collect, use, store, share, and protect your information when you use the Hoomzo Mobile Application, Website, and related services.

By accessing or using Hoomzo, you agree to the collection and use of information in accordance with this Privacy Policy and applicable data protection regulations, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.

# 2. Information We Collect
We collect information to provide, maintain, and improve our accommodation discovery, booking, and hostel fee payment features.

## Personal Identification Details
- Full name, mobile phone number, email address, and profile photo.
- Gender and date of birth (used for guest verification and hostel/PG tenant preferences).
- Government ID proof details (Aadhaar, Passport, Driving License, or Voter ID) provided at check-in or booking verification as required by hospitality regulations.

## Inquiries & Booking Details
- Booking history, reserved dates, property preferences, saved/wishlisted properties, and inquiries.
- Direct communications between you and property hosts or customer support.

## Media & Reels Content
- Photos and short videos (reels) uploaded by users to share accommodation experiences or property reviews.

## Payment & Transaction Information
- Payments on Hoomzo are securely processed via certified third-party payment gateways (including Razorpay and PhonePe).
- Hoomzo does not store credit/debit card numbers or CVVs on its servers.
- We retain transaction IDs, order IDs, amount paid, and in-app wallet balance records for transaction history, refunds, and accounting.

## Device & Technical Information
- Device model, operating system version, app version, IP address, and unique device identifiers.
- Approximate or precise location data (with your explicit permission) to help you discover stays, hostels, and PGs nearest to you.

# 3. Device Permissions & Purpose
To provide seamless booking and property exploration, Hoomzo may request the following permissions:
- Location Permission: To find and display hostels, PGs, hotels, and rentals near your current location.
- Camera & Photos/Media: To upload profile photos, property reels, or review photos.
- Phone Calling: To enable direct one-touch calls to verified property owners and hosts.
- Notifications: To send real-time booking updates, check-in details, and wallet credit alerts.

You can manage or revoke these permissions at any time through your device system settings.

# 4. How We Use Your Information
We use the collected information for the following purposes:
- To facilitate, confirm, and manage property bookings and check-in procedures.
- To process secure payments, wallet top-ups, hostel fee payments, and eligible refunds.
- To display personalized property recommendations and short video reels.
- To provide customer support and resolve booking or payment issues.
- To prevent spam, fraud, identity impersonation, and illegal activities.
- To comply with statutory requirements under Indian law.

# 5. Sharing of Your Information
We respect your privacy and never sell or rent your personal data to third parties. We share information only in the following scenarios:
- With Property Hosts: We share only the details necessary to confirm your booking and ensure a smooth stay (such as your name and contact phone number).
- With Payment Gateway Partners: Razorpay and banking partners receive necessary payment metadata to process and verify transactions.
- With Cloud Infrastructure: Secure cloud hosting and storage providers bound by strict confidentiality and security protocols.
- Legal & Regulatory Compliance: When strictly required by law enforcement, court orders, or government agencies.

# 6. Data Security & Storage
- All communication between your device and Hoomzo servers is encrypted using industry-standard SSL/TLS protocols.
- Access to user data is strictly restricted to authorized personnel on a need-to-know basis.
- While we follow industry best practices, please remember that no electronic transmission over the internet can be guaranteed 100% secure.

# 7. Data Retention & Account Deletion
- We retain your personal data for as long as your account remains active or as required by applicable law and accounting standards.
- You have the absolute right to delete your account at any time.
- To delete your account: Open the Hoomzo App, go to Profile -> Edit Profile -> Delete Account, or submit a deletion request to support@hoomzo.in.
- Upon deletion, your personal profile and identifiers will be permanently deleted from our active databases.

# 8. Children's Privacy
Hoomzo is intended for individuals aged 18 and older. We do not knowingly collect personal data from minors. If you believe a minor has registered on Hoomzo, please contact us for immediate deletion.

# 9. Changes to This Privacy Policy
We may update this Privacy Policy periodically. Any modifications will be updated on this page with a revised date. Continued use of Hoomzo signifies your acceptance of any updates.

# 10. Grievance Officer & Contact Us
For any questions, concerns, or data privacy requests, you can contact our Grievance Officer:
- Entity: Hoomzo Technologies / Hoomzo Hub
- Email: support@hoomzo.in / hoomzohub@gmail.com
- Phone / WhatsApp: +91 6232314147 / +91 9111384535
- Address: Indore, Madhya Pradesh, India
- Hours: Monday to Saturday, 9:00 AM - 8:00 PM IST`
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
    title: 'Partner Data & Privacy Policy',
    content: `# 1. Partner Privacy & Scope
This Partner Privacy Policy explains how Hoomzo collects, uses, and safeguards information provided by property owners, managers, hosts, and accommodation partners ("Partners") on the Hoomzo Partner Portal and Mobile Application.

# 2. Information We Collect from Partners
To list properties and manage bookings, we collect:
- Host Account Details: Partner full name, phone number, email address, and profile credentials.
- Business & Property Details: Property name, category (Hotel, Hostel, PG, Homestay, Villa, Resort, Plot), complete address, amenities, room types, pricing, and uploaded property photographs.
- Payout & Bank Information: Account holder name, bank account number, IFSC code, and bank name strictly for disbursing booking payouts and wallet withdrawals.
- KYC & Verification: Ownership or management authorization documents and government identity proof required for partner onboarding and platform safety.

# 3. How Partner Information is Used
- To publish and showcase your properties to prospective guests across Hoomzo.
- To process guest bookings, reservations, and real-time stay confirmations.
- To manage the Partner Wallet, calculate platform commissions, and disburse payouts directly to your verified bank account.
- To display property performance statistics, booking history, and analytics in your Partner Dashboard.
- To send operational alerts, booking updates, and support messages.

# 4. Protection of Guest Data
- Guest information (such as guest name and phone number) shared with you is solely for the purpose of fulfilling confirmed bookings and managing check-ins.
- Partners must not use guest information for unsolicited marketing, external solicitations, or any unauthorized purpose.

# 5. Data Security & Storage
- Partner banking information and sensitive transaction records are stored with high-grade database encryption and access controls.
- Payout transactions and withdrawal verifications follow secure protocols.

# 6. Partner Account Deletion & Data Rights
- Partners may update property listings, bank details, and contact information at any time from the Partner Dashboard.
- If you wish to deactivate or delete your partner account, please contact partner support at support@hoomzo.in or 6232314147. All pending bookings and payout settlements must be concluded prior to account closure.

# 7. Contact Partner Support
For any questions regarding partner data, onboarding, or payouts:
- Partner Email: support@hoomzo.in / hoomzohub@gmail.com
- Helpdesk: +91 6232314147 / +91 9111384535
- Operating Hours: Monday to Saturday, 9:00 AM - 8:00 PM IST`
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
