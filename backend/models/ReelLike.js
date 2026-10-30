import mongoose from 'mongoose';

const reelLikeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
    },
  },
  { timestamps: true }
);

reelLikeSchema.index({ user: 1, reel: 1 }, { unique: true });
reelLikeSchema.index({ reel: 1 });

reelLikeSchema.post('save', async function (doc) {
  try {
    const Reel = mongoose.model('Reel');
    const PlatformSettings = mongoose.model('PlatformSettings');
    const Offer = mongoose.model('Offer');

    const reel = await Reel.findById(doc.reel);
    if (!reel) return;

    // Get settings
    // Cannot access static method easily here without importing class, so query directly
    // Fall back to the defaults when no settings document exists yet
    const settings = await PlatformSettings.findOne();
    const target = settings?.reelCouponTarget || 1000;
    const discount = settings?.reelCouponDiscount || 500;

    // Count Likes
    const totalLikes = await mongoose.model('ReelLike').countDocuments({ reel: doc.reel });

    if (totalLikes >= target) {
      const code = `REELWINNER_${reel.user}_${reel._id}`;
      const existing = await Offer.findOne({ code });

      if (!existing) {
        await Offer.create({
          title: 'Reel Star Reward',
          subtitle: `You hit ${target} likes!`,
          description: 'Congrats on your viral reel! Enjoy a discount on your next PG stay.',
          code,
          discountType: 'flat',
          discountValue: discount,
          minBookingAmount: 0,
          image: 'https://cdn-icons-png.flaticon.com/512/612/612803.png', // Generic reward icon
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          usageLimit: 1,
          userLimit: 1,
          isActive: true,
          allowedPropertyType: 'pg',
          ownerUserId: reel.user // personal coupon: only the reel creator can see/use it
        });
        console.log(`Coupon generated for user ${reel.user} on reel ${reel._id}`);

        // Tell the creator they earned it (never block the like on a notification failure)
        const { default: notificationService } = await import('../services/notificationService.js');
        notificationService
          .sendToUser(
            reel.user,
            {
              title: 'You earned a Reel Star Reward!',
              body: `Your reel hit ${target} likes. Flat ₹${discount} off your next PG stay: ${code}`
            },
            { type: 'reel_reward', code },
            reel.creatorType === 'vendor' ? 'partner' : 'user'
          )
          .catch((err) => console.error('Failed to send reel reward notification:', err));
      }
    }
  } catch (e) {
    console.error('Error generating reel coupon:', e);
  }
});

const ReelLike = mongoose.model('ReelLike', reelLikeSchema);
export default ReelLike;
