import { resolvePartnerForUser } from '../utils/partnerResolver.js';
import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import Offer from '../models/Offer.js';
import PlatformSettings from '../models/PlatformSettings.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Razorpay from 'razorpay';
import { getFeatureFlags, RAZORPAY_DISABLED_MESSAGE } from '../middlewares/featureGuards.js';
import PaymentConfig from '../config/payment.config.js';
import mongoose from 'mongoose';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import referralService from '../services/referralService.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

/**
 * Helper: Check if a partner has a valid subscription or free trial lead allowance
 */
export const checkPartnerSubscriptionValid = async (partnerId) => {
  try {
    const { subscriptionEnabled } = await getFeatureFlags();
    if (!subscriptionEnabled) {
      return { isValid: true, reason: 'subscription_disabled' };
    }

    const partner = await Partner.findById(partnerId).populate('subscription.planId');
    if (!partner) {
      return { isValid: false, reason: 'partner_not_found' };
    }

    const sub = partner.subscription;
    const plan = sub?.planId;

    // 1. Check Active Paid Subscription
    if (sub && sub.status === 'active' && !sub.isPaused) {
      const isNotExpired = !sub.expiryDate || new Date(sub.expiryDate) > new Date();
      if (isNotExpired) {
        // If tier has leadCap, check monthly limit
        if (plan && plan.leadCap > 0 && (sub.leadsUsedThisMonth || 0) >= plan.leadCap) {
          return { isValid: false, reason: 'lead_cap_reached', partner, plan };
        }
        return { isValid: true, reason: 'active_subscription', partner, plan };
      }
    }

    // 2. Check Free Trial leads
    if (partner.freeTrial && partner.freeTrial.granted === true) {
      const leadsLimit = partner.freeTrial.leadsLimit || 0;
      const leadsUsed = partner.freeTrial.leadsUsed || 0;
      if (leadsUsed < leadsLimit) {
        return { 
          isValid: true, 
          reason: 'free_trial', 
          partner, 
          remainingLeads: leadsLimit - leadsUsed 
        };
      }
    }

    return { isValid: false, reason: 'no_active_subscription', partner };
  } catch (error) {
    console.error('Check Partner Subscription Error:', error);
    return { isValid: false, reason: 'error_checking_subscription' };
  }
};

// Helper: Trigger Notifications
const triggerBookingNotifications = async (booking) => {
  try {
    const fullBooking = await Booking.findById(booking._id)
      .populate('userId')
      .populate('propertyId');

    if (!fullBooking) return;

    const user = fullBooking.userId;
    const property = fullBooking.propertyId;

    // 1. User Email
    if (user && user.email) {
      emailService.sendBookingConfirmationEmail(user, fullBooking).catch(err => console.error('Email trigger failed:', err));
    }

    // 2. User Push
    if (user) {
      notificationService.sendToUser(user._id, {
        title: 'Booking Confirmed! 🎉',
        body: `Your reservation at ${property ? property.propertyName : 'property'} is confirmed. Booking ID: #${fullBooking.bookingId || fullBooking._id.toString().slice(-6)}`
      }, { type: 'booking', bookingId: fullBooking._id, url: '/bookings' }, 'user').catch(err => console.error('User Push failed:', err));
    }

    // 3. Partner Notifications
    if (property && property.partnerId) {
      // Push
      notificationService.sendToUser(property.partnerId, {
        title: 'New Booking Alert! 🔔',
        body: `${user?.name || 'A guest'} booked ${property.propertyName || 'your property'} for ${fullBooking.totalNights || 1} Night, ${fullBooking.guests?.adults || 1} Guests.`
      }, { type: 'new_booking', bookingId: fullBooking._id, url: '/partner/bookings' }, 'partner').catch(err => console.error('Partner Push failed:', err));

      // SMS
      // Need to find Partner Phone. Property has partnerId, need to fetch Partner User.
      try {
        const Partner = (await import('../models/Partner.js')).default;
        const partner = await Partner.findById(property.partnerId);
        if (partner && partner.phone) {
          smsService.sendSMS(partner.phone, `New Booking Alert! ${fullBooking.totalNights} Night, ${fullBooking.guests.adults} Guests. Check App.`)
            .catch(e => console.error('Partner SMS failed:', e));
        }
      } catch (smsErr) {
        console.error('Partner SMS Lookup Error:', smsErr);
      }
    }

    // 4. Admin Push
    notificationService.sendToAdmins({
      title: 'New Booking Placed 📋',
      body: `Booking #${fullBooking.bookingId || fullBooking._id.toString().slice(-6)} at ${property?.propertyName || 'Property'} (₹${fullBooking.totalAmount || 0})`
    }, { type: 'admin_booking', bookingId: fullBooking._id, url: '/admin/bookings' }).catch(e => console.error('Admin Push failed:', e));

  } catch (err) {
    console.error('Trigger Notification Error:', err);
  }
};

export const createBooking = async (req, res) => {
  try {
    const {
      propertyId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      guests,
      paymentMethod,
      paymentDetails,
      bookingUnit,
      couponCode,
      useWallet,
      walletDeduction
    } = req.body;

    // Fetch Property
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    let pType = property.propertyType.toLowerCase();
    const BOOKABLE_TYPES = ['villa', 'resort', 'hotel', 'homestay', 'tent'];
    // Dynamic-category listings (e.g. Apartment for rent/sale) without room types are inquiries
    const isDynamicListing = !['buy', 'plot', 'rent', ...BOOKABLE_TYPES].includes(pType) && !roomTypeId;
    const isInquiry = ['buy', 'plot', 'rent', 'pg', 'hostel'].includes(pType) || isDynamicListing;
    if (isDynamicListing) {
      pType = /sale|buy/i.test(property.transactionType || '') ? 'buy' : 'rent';
    }

    // Basic Validation - different for inquiries
    if (!isInquiry) {
      if (!roomTypeId || !checkInDate || !checkOutDate) {
        return res.status(400).json({ message: 'Missing required booking details' });
      }
    }

    const roomType = roomTypeId ? await RoomType.findById(roomTypeId) : null;
    if (!isInquiry && !roomType) return res.status(404).json({ message: 'Room type not found' });

    // --- HANDLE INQUIRY FLOW (BUY/PLOT/RENT/PG/HOSTEL) ---
    if (isInquiry) {
      const bookingId = `INQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const userModel = req.user.constructor.modelName;

      const inquiryBudget = req.body.budget || Number(property.dynamicData?.expectedPrice) || (
        pType === 'buy' ? property.buyDetails?.expectedPrice : (
          pType === 'rent' ? property.rentDetails?.monthlyRent : (
            ['pg', 'hostel'].includes(pType) ? (property.pgDetails?.monthlyRent || property.startingPrice || property.minPrice || 0) :
            property.plotDetails?.expectedPrice
          )
        )
      ) || 0;

      const inquiry = new Booking({
        bookingId,
        userModel,
        userId: req.user._id,
        propertyId,
        propertyType: pType,
        roomTypeId: roomTypeId || null,
        isInquiry: true,
        bookingStatus: 'pending',
        inquiryMetadata: {
          preferredDate: checkInDate ? new Date(checkInDate) : new Date(),
          message: req.body.message || 'I am interested in this property.',
          budget: inquiryBudget,
          status: 'new'
        }
      });

      await inquiry.save();

      // Notify Partner
      if (property.partnerId) {
        notificationService.sendToUser(property.partnerId, {
          title: 'New Property Inquiry! 🎯',
          body: `You have a new inquiry for ${property.propertyName} from ${req.user.name || 'a guest'}.`
        }, { type: 'new_inquiry', bookingId: inquiry._id, url: '/partner/bookings' }, 'partner').catch(e => console.error(e));
      }

      // Notify User
      notificationService.sendToUser(req.user._id, {
        title: 'Inquiry Sent Successfully 📨',
        body: `Your inquiry for ${property.propertyName} has been sent to the property owner.`
      }, { type: 'inquiry_sent', bookingId: inquiry._id, url: '/bookings' }, 'user').catch(e => console.error(e));

      return res.status(201).json({
        success: true,
        message: 'Inquiry submitted successfully',
        booking: inquiry
      });
    }

    // --- CONTINUE STANDARD BOOKING FLOW ---
    // Fetch Settings
    const settings = await PlatformSettings.getSettings();
    const gstRate = settings.getTaxRateFor(pType);

    // Default commission from global settings
    let commissionRate = settings.defaultCommission || 10;

    // --- REVENUE STRATEGY: Dynamic Commission ---
    // Check Partner's Subscription Plan
    // We need to fetch the Partner to see their plan
    if (property.partnerId) {
      try {
        // Dynamic import to avoid circular dependency if any, though Partner model is safe here
        const Partner = (await import('../models/Partner.js')).default;
        const partner = await Partner.findById(property.partnerId).populate('subscription.planId');

        if (partner && partner.subscription && partner.subscription.status === 'active' && partner.subscription.planId) {
          const plan = partner.subscription.planId;
          const isExpired = partner.subscription.expiryDate && new Date(partner.subscription.expiryDate) < new Date();

          if (!isExpired && plan.commissionPercentage !== undefined) {
            // Use the Plan's confidential commission rate
            commissionRate = plan.commissionPercentage;
          }
        }
        // If no plan or expired, we stick to 'settings.defaultCommission' (Higher rate for non-subscribers)
      } catch (err) {
        console.error('Error fetching partner subscription for commission:', err);
      }
    }

    // Calculate Nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (totalNights <= 0) {
      return res.status(400).json({ message: 'Invalid check-in/check-out dates' });
    }

    // Check Availability
    const requiredUnits = guests.rooms || 1;
    const ledgerEntries = await AvailabilityLedger.aggregate([
      {
        $match: {
          propertyId: new mongoose.Types.ObjectId(propertyId),
          roomTypeId: new mongoose.Types.ObjectId(roomTypeId),
          startDate: { $lt: checkOut },
          endDate: { $gt: checkIn }
        }
      },
      {
        $group: {
          _id: null,
          blockedUnits: { $sum: '$units' }
        }
      }
    ]);

    const blockedUnits = ledgerEntries.length > 0 ? ledgerEntries[0].blockedUnits : 0;
    const totalInventory = roomType.totalInventory || 0;

    if (totalInventory - blockedUnits < requiredUnits) {
      return res.status(400).json({ message: `Only ${Math.max(0, totalInventory - blockedUnits)} rooms available for selected dates` });
    }

    // Calculate Base Amount
    const units = requiredUnits; // Use validated units
    const pricePerNight = roomType.pricePerNight || 0;
    // PG / Hostel rooms are priced per month (pricePerNight holds the monthly rent), so bill 1 unit, not one per night
    const billingPeriods = ["pg", "hostel"].includes(pType) ? 1 : totalNights;
    const baseAmount = pricePerNight * billingPeriods * units;

    // Calculate Extra Charges
    const extraAdults = guests.extraAdults || 0;
    const extraChildren = guests.extraChildren || 0;
    const extraAdultPrice = (roomType.extraAdultPrice || 0) * extraAdults * billingPeriods;
    const extraChildPrice = (roomType.extraChildPrice || 0) * extraChildren * billingPeriods;
    const extraCharges = extraAdultPrice + extraChildPrice;

    // Gross Amount
    const grossAmount = baseAmount + extraCharges;

    // Calculate Discount
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const offer = await Offer.findOne({ code: couponCode, isActive: true });
      if (offer) {
        // Validate Offer Constraints
        const isValidDate = (!offer.startDate || new Date() >= offer.startDate) &&
          (!offer.endDate || new Date() <= offer.endDate);
        const isValidAmount = grossAmount >= (offer.minBookingAmount || 0);

        // User Usage Limit
        const userUsageCount = await Booking.countDocuments({
          userId: req.user._id,
          couponCode: offer.code,
          bookingStatus: { $nin: ['cancelled', 'rejected'] }
        });
        const isUnderUserLimit = userUsageCount < (offer.userLimit || 1);
        // Total limit + personal-coupon owner (validate endpoint enforces these, booking must too)
        const isUnderTotalLimit = !offer.usageLimit || (offer.usageCount || 0) < offer.usageLimit;
        const isOwnerAllowed = offer.isUsableBy(req.user._id);

        // --- ENFORCE PROPERTY TYPE RESTRICTION ---
        const isAllowedType = !offer.allowedPropertyType ||
          offer.allowedPropertyType === 'all' ||
          offer.allowedPropertyType === pType;

        if (isValidDate && isValidAmount && isUnderUserLimit && isUnderTotalLimit && isOwnerAllowed && isAllowedType) {
          if (offer.discountType === 'percentage') {
            discountAmount = (grossAmount * offer.discountValue) / 100;
            if (offer.maxDiscount) {
              discountAmount = Math.min(discountAmount, offer.maxDiscount);
            }
          } else {
            discountAmount = offer.discountValue;
          }
          discountAmount = Math.floor(discountAmount);
          discountAmount = Math.min(discountAmount, grossAmount); // Cannot exceed gross
          appliedCoupon = offer.code;
        } else if (!isAllowedType) {
          console.log(`Coupon ${couponCode} not allowed for property type ${pType}`);
        }
      }
    }

    // Calculate Tax (On Gross Amount as per Frontend logic)
    const commissionableAmount = grossAmount;
    const taxes = Math.round((commissionableAmount * gstRate) / 100);

    // Calculate Total Amount (User Pays)
    // User Pays = (Gross - Discount) + Tax
    const taxableAmount = grossAmount - discountAmount;
    const totalAmount = taxableAmount + taxes;

    // Calculate Commission (On Gross Amount)
    let adminCommission = Math.round((grossAmount * commissionRate) / 100);
    if (adminCommission < PaymentConfig.minCommission) {
      adminCommission = PaymentConfig.minCommission;
    }

    // Calculate Partner Payout
    // Partner Payout = (Gross - Discount) - Commission
    // Verification: TotalAmount - Tax - Commission = ((Gross - Discount) + Tax) - Tax - Commission = Gross - Discount - Commission.
    const partnerPayout = Math.floor(totalAmount - taxes - adminCommission);

    const bookingId = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Determine User Model based on mongoose document model name
    const userModel = req.user.constructor.modelName;

    // Create Booking Object
    const booking = new Booking({
      bookingId,
      userModel,
      userId: req.user._id,
      propertyId,
      propertyType: property.propertyType.toLowerCase(),
      roomTypeId,
      bookingUnit: bookingUnit || 'room',
      checkInDate,
      checkOutDate,
      totalNights,
      guests: {
        adults: guests.adults || 1,
        children: guests.children || 0
      },
      pricePerNight,
      baseAmount,
      extraAdultPrice,
      extraChildPrice,
      extraCharges,
      taxes,
      adminCommission,
      partnerPayout,
      discount: discountAmount,
      couponCode: appliedCoupon,
      totalAmount,
      paymentMethod,
      bookingStatus: 'confirmed', // Default confirmed for pay_at_hotel/wallet, pending for razorpay
      paymentStatus: paymentMethod === 'pay_at_hotel' ? 'pending' : 'paid'
    });

    // Handle Wallet Payment (Partial or Full)
    if (paymentMethod === 'wallet' || (useWallet && walletDeduction > 0)) {
      const wallet = await Wallet.getUnifiedWallet(req.user._id);
      const deductionAmount = walletDeduction || totalAmount;

      if (!wallet || wallet.balance < deductionAmount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      await wallet.debit(deductionAmount, `Booking #${bookingId}`, bookingId, 'booking');

      if (paymentMethod === 'wallet' || (['online', 'razorpay'].includes(paymentMethod) && (totalAmount - (walletDeduction || 0) <= 0))) {
        booking.paymentStatus = 'paid';

        // --- DISTRIBUTE TO PARTNER & ADMIN (Immediate Settlement for Wallet Payment) ---

        // 1. Credit Partner
        if (partnerPayout > 0 && property.partnerId) {
          let partnerWallet = await Wallet.getUnifiedWallet(property.partnerId);

          await partnerWallet.credit(partnerPayout, `Payment for Booking #${bookingId}`, bookingId, 'booking_payment');

          // NOTIFICATION: Wallet Credit
          notificationService.sendToUser(property.partnerId, {
            title: 'Wallet Credited',
            body: `Wallet Credited: ₹${partnerPayout} for Booking #${bookingId}`
          }, { type: 'wallet_credit', bookingId: booking._id }, 'partner').catch(e => console.error(e));
        }

        // 2. Credit Admin (Commission + Tax)
        const totalAdminCredit = (adminCommission || 0) + (taxes || 0);
        if (totalAdminCredit > 0) {
          // Find Admin Wallet (assuming single admin wallet or specific logic)
          let adminWallet = await Wallet.findOne({ role: 'admin' });

          // If no admin wallet exists, we might need to find an admin user to create one
          if (!adminWallet) {
            const AdminUser = mongoose.model('User');
            const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
            if (adminUser) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                role: 'admin',
                balance: 0
              });
            }
          }

          if (adminWallet) {
            await adminWallet.credit(totalAdminCredit, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_tax');
          }
        }

        // REFERRAL: Trigger Referral Reward (Immediate Wallet Payment)
        referralService.processBookingCompletion(req.user._id, booking._id).catch(e => console.error('Referral Trigger Error (Wallet):', e));
      }
    }

    // Handle Online Payment (Razorpay)
    let razorpayOrder = null;
    if (paymentMethod === 'razorpay' || paymentMethod === 'online') {
      if (paymentDetails && paymentDetails.paymentId) {
        // Already paid (Legacy check)
        booking.paymentStatus = 'paid';
        booking.paymentId = paymentDetails.paymentId;
      } else {
        // Initiate New Payment
        booking.bookingStatus = 'pending'; // Pending until payment
        booking.paymentStatus = 'pending';

        // Calculate amount to pay via Gateway
        const amountToPay = totalAmount - (useWallet ? (walletDeduction || 0) : 0);

        if (amountToPay > 0) {
          // Admin kill-switch: block creating a NEW Razorpay order (other payment methods are unaffected)
          const featureFlags = await getFeatureFlags();
          if (!featureFlags.razorpayEnabled) {
            return res.status(503).json({ success: false, code: 'RAZORPAY_DISABLED', message: RAZORPAY_DISABLED_MESSAGE });
          }
          try {
            const instance = new Razorpay({
              key_id: PaymentConfig.razorpayKeyId,
              key_secret: PaymentConfig.razorpayKeySecret,
            });

            const options = {
              amount: Math.round(amountToPay * 100), // amount in paisa
              currency: PaymentConfig.currency || "INR",
              receipt: bookingId,
              notes: {
                bookingId: booking._id.toString(),
                userId: req.user._id.toString(),
                propertyId: propertyId.toString(),
                roomTypeId: roomTypeId.toString(),
                bookingUnit: (bookingUnit || 'room').toString(),
                rooms: units.toString(), // Pass rooms count for ledger
                // Store financial info for verification consistency
                adminCommission: adminCommission.toString(),
                partnerPayout: partnerPayout.toString(),
                taxes: taxes.toString(),
                discount: discountAmount.toString(),
                totalAmount: totalAmount.toString(),
                type: 'booking_init'
              }
            };

            razorpayOrder = await instance.orders.create(options);

            // Set status to awaiting_payment so it doesn't show in user's list until paid
            booking.bookingStatus = 'awaiting_payment';
            booking.paymentStatus = 'pending';
          } catch (error) {
            console.error("Razorpay Order Creation Failed:", error?.error || error);
            const reason = String(error?.error?.description || '');
            if (/maximum amount/i.test(reason)) {
              return res.status(400).json({
                success: false,
                message: `₹${Math.round(amountToPay).toLocaleString('en-IN')} is above the online payment limit. Please choose "Pay at Move-In" or pay part of it with your wallet.`
              });
            }
            return res.status(500).json({ message: reason || "Failed to initiate payment gateway" });
          }
        } else {
          // Fully paid by wallet (Covered by loop above, but double check status)
          booking.paymentStatus = 'paid';
          booking.bookingStatus = 'confirmed';
        }
      }
    }

    // Handle Pay at Hotel (Partner Deduction)
    if (paymentMethod === 'pay_at_hotel') {
      const deductionAmount = (taxes || 0) + (adminCommission || 0);

      if (deductionAmount > 0 && property.partnerId) {
        // 1. Debit Partner
        let partnerWallet = await Wallet.getUnifiedWallet(property.partnerId);

        // Check balance (Optional: enforce positive balance?)
        // We will proceed with debit, which might throw if insufficient balance 
        // depending on Wallet implementation. 
        // If we want to allow overdraft, we should check Wallet.js.
        // Assuming standard debit for now.
        try {
          await partnerWallet.debit(deductionAmount, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_deduction');

          // 2. Credit Admin
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            const AdminUser = mongoose.model('User');
            const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
            if (adminUser) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                role: 'admin',
                balance: 0
              });
            }
          }

          if (adminWallet) {
            await adminWallet.credit(deductionAmount, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_tax');
          }
        } catch (err) {
          console.error("Pay at Hotel Wallet Deduction Failed:", err.message);
          // Optionally: revert booking? Or just log? 
          // For now, we log.
        }
      }
    }

    await booking.save();

    // Update Inventory (Block Room) - Only if confirmed (Pay at Hotel or Paid)
    // If Razorpay pending, we still block inventory to avoid race conditions? 
    // Usually yes, with a timeout. For now, we block it.
    await AvailabilityLedger.create({
      propertyId,
      roomTypeId,
      inventoryType: booking.bookingUnit || 'room',
      source: 'platform',
      referenceId: booking._id,
      startDate: new Date(checkInDate),
      endDate: new Date(checkOutDate),
      units: units, // Use 'units' here (rooms count)
      createdBy: 'system'
    });

    // Increment Offer Usage if applied and confirmed
    if (appliedCoupon && booking.bookingStatus === 'confirmed') {
      await Offer.findOneAndUpdate({ code: appliedCoupon }, { $inc: { usageCount: 1 } });
    }

    // Trigger Notifications (only if confirmed)
    if (booking.bookingStatus === 'confirmed') {
      triggerBookingNotifications(booking);
    }

    // Populate booking details for frontend confirmation page
    const populatedBooking = await Booking.findById(booking._id)
      .populate('propertyId')
      .populate('roomTypeId');

    res.status(201).json({
      success: true,
      booking: populatedBooking,
      paymentRequired: !!razorpayOrder,
      order: razorpayOrder,
      key: PaymentConfig.razorpayKeyId
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ message: 'Server error creating booking' });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const { type } = req.query; // 'upcoming', 'ongoing', 'completed', 'cancelled'
    const query = { userId: req.user._id };

    if (type === 'upcoming') {
      // Upcoming: Confirmed. NOT checked-in.
      // Hiding 'pending'/'awaiting_payment' to ensure only finalized bookings appear
      query.bookingStatus = { $in: ['confirmed'] };
    } else if (type === 'ongoing') {
      // Ongoing: Checked In
      query.bookingStatus = 'checked_in';
    } else if (type === 'completed') {
      // Completed: Checked Out (and legacy completed)
      query.bookingStatus = { $in: ['completed', 'checked_out'] };
    } else if (type === 'cancelled') {
      // Cancelled, No Show, Rejected
      query.bookingStatus = { $in: ['cancelled', 'no_show', 'rejected'] };
    }

    const bookings = await Booking.find(query)
      .populate('propertyId', 'propertyName address location coverImage avgRating')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (e) {
    console.error('Get My Bookings Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('propertyId')
      .populate('roomTypeId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow User (Owner) or Admin/Partner (if needed, but separate endpoints exist usually)
    // For this specific 'user' endpoint, strictly check ownership
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (e) {
    console.error('Get Booking Detail Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getPartnerBookings = async (req, res) => {
  try {
    const partner = await resolvePartnerForUser(req.user);
    const partnerId = partner ? partner._id : req.user._id;

    // Check Partner's subscription status (admin always has full access)
    const subCheck = req.user.role === 'admin'
      ? { isValid: true, reason: 'admin' }
      : await checkPartnerSubscriptionValid(partnerId);

    // 1. Find all properties owned by this partner
    const properties = await Property.find({ partnerId }).select('_id');
    const propertyIds = properties.map(p => p._id);

    // 2. Find bookings for these properties
    const { status } = req.query;
    const query = { propertyId: { $in: propertyIds } };

    if (status) {
      if (status === 'upcoming') {
        // Upcoming: Confirmed guests arriving or New Inquiries / Leads
        query.$or = [
          { bookingStatus: 'confirmed', isInquiry: false },
          { bookingStatus: 'pending', isInquiry: true }, // New Inquiries
          { 'inquiryMetadata.status': 'new' }
        ];
      } else if (status === 'in_house') {
        // In-House: Active guests or Negotiating Inquiries
        query.$or = [
          { bookingStatus: 'checked_in' },
          { 'inquiryMetadata.status': { $in: ['scheduled', 'negotiating'] } }
        ];
      } else if (status === 'completed') {
        // Completed: Guests checked out or Sold Properties
        query.$or = [
          { bookingStatus: { $in: ['completed', 'checked_out'] } },
          { 'inquiryMetadata.status': { $in: ['closed', 'sold', 'rented'] } }
        ];
      } else if (status === 'cancelled') {
        query.$or = [
          { bookingStatus: { $in: ['cancelled', 'no_show', 'rejected'] } },
          { 'inquiryMetadata.status': 'dropped' }
        ];
      } else {
        // Direct status match fallback
        query.bookingStatus = status;
      }
    }

    const rawBookings = await Booking.find(query)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'propertyName address location coverImage')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    // 3. Subscription gating & contact masking
    const bookings = rawBookings.map(b => {
      const bObj = b.toObject();
      const isLeadInquiry = bObj.isInquiry === true;

      // If it's an inquiry/lead and partner does NOT have a valid subscription, lock & mask contact details
      if (isLeadInquiry && !subCheck.isValid) {
        bObj.isLocked = true;
        bObj.hasValidSubscription = false;
        if (bObj.userId) {
          const rawPhone = bObj.userId.phone || '';
          bObj.userId.phone = rawPhone.length > 4
            ? `${rawPhone.slice(0, 3)}••••••${rawPhone.slice(-2)}`
            : '••••••••••';
          const rawEmail = bObj.userId.email || '';
          bObj.userId.email = rawEmail.includes('@')
            ? `${rawEmail.slice(0, 2)}••••@••••`
            : '••••@••••';
        }
      } else {
        bObj.isLocked = false;
        bObj.hasValidSubscription = true;
      }

      return bObj;
    });

    res.json({
      success: true,
      hasValidSubscription: subCheck.isValid,
      subscriptionReason: subCheck.reason,
      bookings
    });
  } catch (error) {
    console.error('Get Partner Bookings Error:', error);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
};

export const getPartnerBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('propertyId') // Need full property for partnerId check
      .populate('roomTypeId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify ownership
    if (!booking.propertyId || !booking.propertyId.partnerId) {
      return res.status(403).json({ message: 'Booking data invalid (property link missing)' });
    }

    if (req.user.role !== 'admin' && booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    const bObj = booking.toObject();

    // Check subscription if inquiry
    if (bObj.isInquiry) {
      const subCheck = req.user.role === 'admin'
        ? { isValid: true, reason: 'admin' }
        : await checkPartnerSubscriptionValid(req.user._id);

      if (!subCheck.isValid) {
        bObj.isLocked = true;
        bObj.hasValidSubscription = false;
        if (bObj.userId) {
          const rawPhone = bObj.userId.phone || '';
          bObj.userId.phone = rawPhone.length > 4
            ? `${rawPhone.slice(0, 3)}••••••${rawPhone.slice(-2)}`
            : '••••••••••';
          const rawEmail = bObj.userId.email || '';
          bObj.userId.email = rawEmail.includes('@')
            ? `${rawEmail.slice(0, 2)}••••@••••`
            : '••••@••••';
        }
      } else {
        bObj.isLocked = false;
        bObj.hasValidSubscription = true;
      }
    }

    res.json(bObj);
  } catch (error) {
    console.error('Get Partner Booking Detail Error:', error);
    res.status(500).json({ message: 'Server error fetching booking details' });
  }
};

/**
 * @desc    Generate a view lead when a user views a property listing
 * @route   POST /api/bookings/view-lead
 * @access  Public / Optional Protect
 */
export const generateViewLead = async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // 1. Identify User or fallback to guest user
    let user = req.user;
    let userModel = 'User';

    if (user) {
      userModel = user.constructor.modelName || (user.isPartner ? 'Partner' : 'User');

      // Prevent self-lead if owner views their own property
      if (property.partnerId && property.partnerId.toString() === user._id.toString()) {
        return res.json({ success: true, message: 'Owner viewing own property, lead skipped', skipped: true });
      }
    } else {
      // Find or create fallback system guest user
      user = await User.findOne({ phone: '9999999999' });
      if (!user) {
        user = await User.create({
          name: 'Interested Guest',
          phone: '9999999999',
          email: 'guest@hoomzo.com',
          password: 'GuestUser12345!'
        });
      }
      userModel = 'User';
    }

    // 2. Deduplication check: Has this user viewed this property in the last 4 hours?
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const recentLead = await Booking.findOne({
      userId: user._id,
      propertyId: property._id,
      isInquiry: true,
      createdAt: { $gte: fourHoursAgo }
    });

    if (recentLead) {
      return res.json({
        success: true,
        message: 'Lead already generated recently',
        booking: recentLead,
        deduplicated: true
      });
    }

    // 3. Create lead as Booking inquiry
    const pType = (property.propertyType || 'pg').toLowerCase();
    const bookingId = `LEAD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const leadBudget = pType === 'buy'
      ? (property.buyDetails?.expectedPrice || 0)
      : (pType === 'rent'
        ? (property.rentDetails?.monthlyRent || 0)
        : (property.pgDetails?.monthlyRent || property.startingPrice || 0));

    const lead = new Booking({
      bookingId,
      userModel,
      userId: user._id,
      propertyId: property._id,
      propertyType: pType,
      isInquiry: true,
      bookingStatus: 'pending',
      guests: { adults: 1, children: 0 },
      inquiryMetadata: {
        preferredDate: new Date(),
        message: `Viewed property on Hoomzo (${new Date().toLocaleDateString('en-GB')})`,
        budget: leadBudget,
        status: 'new'
      }
    });

    await lead.save();

    // 4. Real-time Notification to Partner
    if (property.partnerId) {
      notificationService.sendToUser(property.partnerId, {
        title: 'New Lead Generated! 🎯',
        body: `${user.name || 'A customer'} viewed ${property.propertyName || 'your property'}. Check your enquiries!`
      }, { type: 'new_lead', bookingId: lead._id, url: '/hotel/bookings' }, 'partner').catch(e => console.error('Partner lead notification error:', e));
    }

    return res.status(201).json({
      success: true,
      message: 'Lead generated successfully',
      booking: lead
    });

  } catch (error) {
    console.error('Generate View Lead Error:', error);
    res.status(500).json({ success: false, message: 'Server error generating lead' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow user to cancel or admin/partner
    if (booking.userId.toString() !== req.user._id.toString()) {
      // Add logic for partner/admin override if needed
      // return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    // Update Status
    booking.bookingStatus = 'cancelled';
    booking.cancellationReason = req.body.reason || 'User cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    // --- WALLET REVERSAL LOGIC ---
    // Pay at Hotel: Reverse Commission Deduction (Refund Partner, Debit Admin)
    if (booking.paymentMethod === 'pay_at_hotel') {
      const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);

      // Fetch full booking for partnerId
      const fullBooking = await Booking.findById(booking._id).populate('propertyId').populate('userId');

      if (refundAmount > 0 && fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.getUnifiedWallet(fullBooking.propertyId.partnerId);
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner (Refund)
          await partnerWallet.credit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin (Refund)
          await adminWallet.debit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }

      // Release Inventory
      await AvailabilityLedger.deleteMany({ referenceId: booking._id });

      // Trigger Cancellation Notifications
      if (fullBooking) {
        if (fullBooking.userId && fullBooking.userId.email) {
          emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, 0)
            .catch(e => console.error('Cancel Email failed', e));
        }

        if (fullBooking.userId) {
          notificationService.sendToUser(fullBooking.userId._id || fullBooking.userId, {
            title: 'Booking Cancelled ℹ️',
            body: `Your booking #${fullBooking.bookingId} at ${fullBooking.propertyId?.propertyName || 'property'} has been cancelled.`
          }, { type: 'booking_cancelled', bookingId: booking._id, url: '/bookings' }, 'user').catch(e => console.error('Cancel User Push failed', e));
        }

        if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
          notificationService.sendToUser(fullBooking.propertyId.partnerId, {
            title: 'Booking Cancelled ⚠️',
            body: `Booking #${fullBooking.bookingId} was cancelled by user. Inventory has been released.`
          }, { type: 'booking_cancelled', bookingId: booking._id, url: '/partner/bookings' }, 'partner').catch(e => console.error('Cancel Partner Push failed', e));
        }
      }

      return res.json({ success: true, message: 'Booking cancelled successfully (Pay at Hotel - Commission Refunded)', booking });
    }

    // 1. Refund User (If paid)
    if (booking.paymentStatus === 'paid') {
      let userWallet = await Wallet.getUnifiedWallet(booking.userId);

      await userWallet.credit(booking.totalAmount, `Refund for Booking #${booking.bookingId}`, booking.bookingId, 'refund');
    }

    // 2. Deduct Partner (If payout was credited)
    // We assume payout is credited on 'confirmed'/'paid'. 
    // Check if Partner Payout > 0
    if (booking.partnerPayout > 0 && booking.paymentStatus === 'paid') {
      const fullBooking = await Booking.findById(booking._id).populate('propertyId');
      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.getUnifiedWallet(fullBooking.propertyId.partnerId);
        if (partnerWallet) {
          try {
            await partnerWallet.debit(
              booking.partnerPayout,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Partner Refund Deduction Failed:", err.message);
          }
        }
      }
    }

    // 3. Deduct Admin (Commission + Tax)
    if (booking.paymentStatus === 'paid') {
      const adminDeduction = (booking.adminCommission || 0) + (booking.taxes || 0);
      if (adminDeduction > 0) {
        const adminWallet = await Wallet.findOne({ role: 'admin' });
        if (adminWallet) {
          try {
            await adminWallet.debit(
              adminDeduction,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Admin Refund Deduction Failed:", err.message);
          }
        }
      }
    }

    // Trigger Cancellation Notifications
    const fullBooking = await Booking.findById(booking._id).populate('userId').populate('propertyId');
    if (fullBooking) {
      if (fullBooking.userId && fullBooking.userId.email) {
        emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, booking.paymentStatus === 'paid' ? booking.totalAmount : 0)
          .catch(e => console.error('Cancel Email failed', e));
      }

      if (fullBooking.userId) {
        notificationService.sendToUser(fullBooking.userId._id || fullBooking.userId, {
          title: 'Booking Cancelled & Refunded 💰',
          body: `Booking #${fullBooking.bookingId} cancelled. ₹${booking.totalAmount} has been refunded to your wallet.`
        }, { type: 'booking_cancelled', bookingId: booking._id, url: '/wallet' }, 'user').catch(e => console.error('Cancel User Push failed', e));
      }

      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        notificationService.sendToUser(fullBooking.propertyId.partnerId, {
          title: 'Booking Cancelled ⚠️',
          body: `Booking #${fullBooking.bookingId} was cancelled by user. Inventory has been released.`
        }, { type: 'booking_cancelled', bookingId: booking._id, url: '/partner/bookings' }, 'partner').catch(e => console.error('Cancel Push failed', e));
      }
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (e) {
    console.error('Cancel Booking Error:', e);
    res.status(500).json({ message: e.message });
  }
};

// Mark Booking as Paid (Pay at Hotel)
export const markBookingAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as paid.', booking });
    }

    // Update Status
    booking.paymentStatus = 'paid';
    await booking.save();

    // Trigger Notification
    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Payment Received',
        body: `Your payment for booking #${booking.bookingId} has been confirmed by the hotel.`
      }, { type: 'payment_received', bookingId: booking._id }, 'user').catch(console.error);
    }

    // REFERRAL: Trigger Referral Reward (Pay At Hotel Marked Paid)
    if (booking.userId) {
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('Referral Trigger Error (PayAtHotel):', e));
    }

    res.json({ success: true, message: 'Marked as Paid', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Mark as No Show
export const markBookingNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus === 'no_show') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as No Show.', booking });
    }

    booking.bookingStatus = 'no_show';
    // If No Show, should we cancel payment status? 
    // Usually No Show means they didn't come.
    await booking.save();

    // REVERSE DEDUCTION (Pay At Hotel)
    // "partner ke wallet se tax and fees plus admin commission deduct hua h voh uske wallet me vps se credit ho jayega"
    if (booking.paymentMethod === 'pay_at_hotel') {
      const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);

      if (refundAmount > 0 && booking.propertyId.partnerId) {
        const partnerWallet = await Wallet.getUnifiedWallet(booking.propertyId.partnerId);
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner
          await partnerWallet.credit(refundAmount, `Refund (No Show) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin
          await adminWallet.debit(refundAmount, `Refund (No Show) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }
    }
    // HANDLE PAY NOW / ONLINE / WALLET (Partner Earning Deducted -> Admin Credit)
    else if (['online', 'razorpay', 'wallet'].includes(booking.paymentMethod) && booking.paymentStatus === 'paid') {
      const deductionAmount = booking.partnerPayout || 0;

      if (deductionAmount > 0 && booking.propertyId.partnerId) {
        let partnerWallet = await Wallet.getUnifiedWallet(booking.propertyId.partnerId);

        // Ensure Admin Wallet
        let adminWallet = await Wallet.findOne({ role: 'admin' });
        if (!adminWallet) {
          const AdminUser = mongoose.model('User');
          const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
          if (adminUser) {
            adminWallet = await Wallet.create({
              partnerId: adminUser._id,
              role: 'admin',
              balance: 0
            });
          }
        }

        if (partnerWallet && adminWallet) {
          try {
            // Debit Partner (Earning Reversal/Penalty)
            await partnerWallet.debit(deductionAmount, `No Show Penalty for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_penalty');

            // Credit Admin (Funds retained by platform)
            await adminWallet.credit(deductionAmount, `No Show Credit (from Partner) for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_credit');

          } catch (err) {
            console.error("No Show Wallet Deduction Failed (Pay Now):", err.message);
          }
        }
      }
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    // Send No-Show Notifications
    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Booking Marked as No-Show ⚠️',
        body: `Your booking #${booking.bookingId} at ${booking.propertyId?.propertyName || 'property'} was marked as No-Show.`
      }, { type: 'booking_no_show', bookingId: booking._id, url: '/bookings' }, 'user').catch(console.error);
    }
    if (booking.propertyId?.partnerId) {
      notificationService.sendToUser(booking.propertyId.partnerId, {
        title: 'No-Show Recorded ℹ️',
        body: `Booking #${booking.bookingId} recorded as No-Show. Inventory released.`
      }, { type: 'booking_no_show', bookingId: booking._id, url: '/partner/bookings' }, 'partner').catch(console.error);
    }

    res.json({ success: true, message: 'Marked as No Show. Inventory released and commission refunded.', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Check-In Booking
export const markCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Booking must be confirmed to check in.' });
    }

    booking.bookingStatus = 'checked_in';
    await booking.save();

    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Checked In Successfully 🔑',
        body: `Welcome to ${booking.propertyId?.propertyName || 'your stay'}! We hope you have a great stay.`
      }, { type: 'check_in', bookingId: booking._id, url: '/bookings' }, 'user').catch(console.error);
    }

    res.json({ success: true, message: 'Checked In Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check-Out Booking
export const markCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'checked_in') {
      return res.status(400).json({ message: 'Booking must be checked-in to check out.' });
    }

    // Determine if payment is required
    if (booking.paymentStatus !== 'paid') {
      // Allow Partner to override? Or strict? 
      // Let's go strict for now but allow if query param ?force=true
      if (req.query.force !== 'true') {
        return res.status(400).json({ message: 'Payment Pending. Please Mark Paid first.', requirePayment: true });
      }
    }

    booking.bookingStatus = 'checked_out';
    // booking.actualCheckOutDate = new Date(); // Ideally add to schema
    await booking.save();

    // --- RELEASE INVENTORY (Early Checkout) ---
    try {
      const ledger = await AvailabilityLedger.findOne({ referenceId: booking._id });
      if (ledger) {
        const now = new Date();
        // If checking out earlier than the blocked end date, free up the rest
        if (now < new Date(ledger.endDate)) {
          ledger.endDate = now;
          await ledger.save();
          console.log(`[Inventory] Released inventory for Booking ${booking.bookingId} (Early Checkout)`);
        }
      }
    } catch (invErr) {
      console.error('Inventory Release Failed during Check-out:', invErr);
    }

    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Checked Out Successfully ⭐',
        body: `Thank you for staying at ${booking.propertyId?.propertyName || 'our property'}! Please share your review.`
      }, { type: 'check_out', bookingId: booking._id, url: '/reviews' }, 'user').catch(console.error);
    }

    // Referral Trigger (if not already done)
    if (booking.userId && booking.paymentStatus === 'paid') {
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('Referral Trigger Error:', e));
    }

    res.json({ success: true, message: 'Checked Out Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Inquiry Status (Buy/Plot)
export const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const inquiry = await Booking.findById(id).populate('propertyId');
    if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });

    // Auth Check
    if (inquiry.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!inquiry.isInquiry) {
      return res.status(400).json({ message: 'This is not an inquiry' });
    }

    inquiry.inquiryMetadata.status = status;
    if (message) inquiry.inquiryMetadata.message = message;

    await inquiry.save();

    // Notify User
    if (inquiry.userId) {
      notificationService.sendToUser(inquiry.userId, {
        title: 'Inquiry Status Updated 📋',
        body: `Your inquiry for ${inquiry.propertyId?.propertyName || 'property'} has been updated to: ${status}.`
      }, { type: 'inquiry_update', bookingId: inquiry._id, url: '/bookings' }, 'user').catch(console.error);
    }

    res.json({ success: true, message: 'Inquiry status updated', inquiry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
