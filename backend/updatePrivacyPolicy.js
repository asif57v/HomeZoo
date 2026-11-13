import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InfoPage from './models/InfoPage.js';

dotenv.config();

const uri = process.env.MONGODB_URL || process.env.MONGO_URI;

if (!uri) {
  console.error('MONGODB_URL is not set');
  process.exit(1);
}

const userPrivacyContent = `# 1. Introduction
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
- Hours: Monday to Saturday, 9:00 AM - 8:00 PM IST`;

const partnerPrivacyContent = `# 1. Partner Privacy & Scope
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
- Operating Hours: Monday to Saturday, 9:00 AM - 8:00 PM IST`;

async function updatePrivacy() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully.');

    // 1. Update User Privacy Policy
    const userRes = await InfoPage.findOneAndUpdate(
      { audience: 'user', slug: 'privacy' },
      {
        audience: 'user',
        slug: 'privacy',
        title: 'Privacy Policy',
        content: userPrivacyContent,
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('User Privacy Policy updated:', userRes._id);

    // 2. Update Partner Privacy Policy
    const partnerRes = await InfoPage.findOneAndUpdate(
      { audience: 'partner', slug: 'privacy' },
      {
        audience: 'partner',
        slug: 'privacy',
        title: 'Partner Data & Privacy Policy',
        content: partnerPrivacyContent,
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('Partner Privacy Policy updated:', partnerRes._id);

    console.log('All privacy policies successfully updated in database!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error updating privacy policies:', err);
    process.exit(1);
  }
}

updatePrivacy();

