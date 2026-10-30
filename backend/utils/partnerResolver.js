import Partner from '../models/Partner.js';
import User from '../models/User.js';
import PlatformSettings from '../models/PlatformSettings.js';
import bcrypt from 'bcryptjs';

/**
 * Given a logged-in user (from User or Partner collection), returns their Partner document.
 * If the user does not have a Partner record yet, auto-creates one using their single phone number
 * so they can post and manage properties seamlessly without a separate partner login.
 */
export const resolvePartnerForUser = async (userObj) => {
  if (!userObj) return null;

  // 1. If userObj is already a Partner document
  let partner = await Partner.findById(userObj._id).populate('subscription.planId');
  if (partner) return partner;

  // 2. If userObj has a phone, find matching Partner
  if (userObj.phone) {
    partner = await Partner.findOne({ phone: userObj.phone }).populate('subscription.planId');
    if (partner) {
      if (!userObj.isPartner) {
        await User.findByIdAndUpdate(userObj._id, { isPartner: true, partnerApprovalStatus: partner.partnerApprovalStatus });
      }
      return partner;
    }
  }

  // 3. Auto-bridge: create Partner record using their User profile info
  let trialGranted = true;
  let freeProperties = 1;
  let freeLeads = 5;

  try {
    const platformSettings = await PlatformSettings.getSettings();
    const trial = platformSettings?.partnerFreeTrial || {};
    trialGranted = trial.enabled !== false;
    freeProperties = trial.freeProperties ?? 1;
    freeLeads = trial.freeLeads ?? 5;
  } catch (err) {
    console.warn('[resolvePartnerForUser] Failed to read platformSettings, using defaults:', err.message);
  }

  const randomPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  partner = new Partner({
    freeTrial: {
      granted: trialGranted,
      propertiesLimit: trialGranted ? freeProperties : 1,
      leadsLimit: trialGranted ? freeLeads : 5,
      leadsUsed: 0
    },
    name: userObj.name || 'HoomZoo Partner',
    email: userObj.email || (userObj.phone ? `${userObj.phone}@hoomzo.com` : undefined),
    phone: userObj.phone,
    password: passwordHash,
    role: 'partner',
    isPartner: true,
    partnerApprovalStatus: 'pending',
    isVerified: userObj.isVerified || false,
    address: userObj.address || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    termsAccepted: true
  });

  await partner.save();

  // Mark user as partner
  await User.findByIdAndUpdate(userObj._id, {
    isPartner: true,
    partnerApprovalStatus: partner.partnerApprovalStatus
  });

  console.log(`[resolvePartnerForUser] Auto-bridged user ${userObj.name} (${userObj.phone}) to partner ${partner._id}`);
  return partner;
};
