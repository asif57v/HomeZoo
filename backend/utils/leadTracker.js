import Booking from '../models/Booking.js';

// Actions that can create or update a lead, weakest to strongest. A lead's `source` is the
// strongest action the user has taken so far; every action is also kept in `activity`.
export const LEAD_ACTIONS = {
  property_view: { strength: 1, label: 'Viewed the property' },
  call_click: { strength: 2, label: 'Tapped Call owner' },
  contact_reveal: { strength: 2, label: 'Revealed owner contact number' },
  enquiry_form: { strength: 3, label: 'Sent an enquiry' },
};

// Repeat actions by the same user on the same property within this window update one lead
export const LEAD_MERGE_WINDOW_MS = 4 * 60 * 60 * 1000;

const clean = (v, max = 120) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : undefined);

/**
 * Pull lead context sent by the app/web. Accepts both body fields and query params.
 * screen   : where the user found the property, e.g. "Home · Find your perfect stay"
 * sharing  : chosen sharing / room category, e.g. "Double Sharing"
 */
export const readLeadContext = (src = {}) => ({
  screen: clean(src.sourceScreen || src.from),
  sharingType: clean(src.sharingType, 60),
  roomName: clean(src.roomName, 80),
  roomPrice: num(src.roomPrice),
  beds: num(src.beds),
  platform: clean(src.platform, 20),
});

/**
 * Create a lead, or fold this action into the user's recent open lead for the same property.
 * @returns {Promise<{ lead, created: boolean }>}
 */
export const recordLead = async ({
  userId, userModel = 'User', property, propertyType, action, context = {},
  message, budget, preferredDate, roomTypeId, bookingUnit, guests, bookingIdPrefix = 'LEAD',
}) => {
  const def = LEAD_ACTIONS[action] || LEAD_ACTIONS.property_view;
  const now = new Date();
  const activityEntry = { action, label: def.label, screen: context.screen, sharingType: context.sharingType, at: now };

  const recent = await Booking.findOne({
    userId,
    propertyId: property._id,
    isInquiry: true,
    'inquiryMetadata.status': 'new',
    createdAt: { $gte: new Date(now.getTime() - LEAD_MERGE_WINDOW_MS) },
  }).sort({ createdAt: -1 });

  if (recent) {
    const meta = recent.inquiryMetadata || {};
    const curStrength = LEAD_ACTIONS[meta.source]?.strength || 0;
    if (def.strength >= curStrength) meta.source = action;
    // Keep the first place the user found the property; fill blanks from later actions
    if (!meta.sourceScreen && context.screen) meta.sourceScreen = context.screen;
    if (context.sharingType) meta.sharingType = context.sharingType;
    if (context.roomName) meta.roomName = context.roomName;
    if (context.roomPrice) meta.roomPrice = context.roomPrice;
    if (context.beds) meta.beds = context.beds;
    if (context.platform && !meta.platform) meta.platform = context.platform;
    if (action === 'enquiry_form' && message) meta.message = message;
    if (action === 'enquiry_form' && preferredDate) meta.preferredDate = preferredDate;
    if (budget && (!meta.budget || action === 'enquiry_form')) meta.budget = budget;
    meta.activity = [...(meta.activity || []), activityEntry];
    recent.inquiryMetadata = meta;
    if (roomTypeId && !recent.roomTypeId) recent.roomTypeId = roomTypeId;
    if (bookingUnit && !recent.bookingUnit) recent.bookingUnit = bookingUnit;
    recent.markModified('inquiryMetadata');
    await recent.save();
    return { lead: recent, created: false };
  }

  const lead = new Booking({
    bookingId: `${bookingIdPrefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
    userModel,
    userId,
    propertyId: property._id,
    propertyType,
    roomTypeId: roomTypeId || null,
    bookingUnit,
    isInquiry: true,
    bookingStatus: 'pending',
    guests: guests || { adults: 1, children: 0 },
    inquiryMetadata: {
      preferredDate: preferredDate || now,
      message,
      budget: budget || 0,
      status: 'new',
      source: action,
      sourceScreen: context.screen,
      sharingType: context.sharingType,
      roomName: context.roomName,
      roomPrice: context.roomPrice,
      beds: context.beds,
      platform: context.platform,
      activity: [activityEntry],
    },
  });
  await lead.save();
  return { lead, created: true };
};
