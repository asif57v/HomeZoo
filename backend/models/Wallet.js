import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  modelType: {
    type: String,
    required: true,
    enum: ['User', 'Partner', 'Admin'],
    default: 'User'
  },
  role: {
    type: String,
    enum: ['user', 'partner', 'admin'],
    default: 'user',
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0 // Prevent negative balance
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  pendingClearance: {
    type: Number,
    default: 0,
    comment: 'Amount pending settlement'
  },
  lastTransactionAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  razorpayContactId: String,
  razorpayFundAccountId: String
}, { timestamps: true });

// Pre-save hook to ensure valid modelType
walletSchema.pre('save', async function () {
  if (this.role === 'admin') {
    this.modelType = 'Admin';
  } else {
    this.modelType = 'User';
  }
  // Ensure balance never saves as negative
  if (this.balance < 0) {
    this.balance = 0;
  }
});

/**
 * Static method to fetch or create the single unified wallet for any user/partner.
 * Automatically detects and merges legacy duplicate wallets (role: user & role: partner) into one.
 */
walletSchema.statics.getUnifiedWallet = async function (userId) {
  if (!userId) return null;
  const targetId = new mongoose.Types.ObjectId(userId);

  // Find all wallets associated with this userId
  const wallets = await this.find({ partnerId: targetId });

  if (wallets.length === 0) {
    return await this.create({
      partnerId: targetId,
      modelType: 'User',
      role: 'user',
      balance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0
    });
  }

  if (wallets.length === 1) {
    const single = wallets[0];
    if (single.balance < 0) {
      single.balance = 0;
      await single.save();
    }
    return single;
  }

  // Multiple legacy wallets exist (e.g. one for 'user' and one for 'partner')
  // Merge into one single canonical wallet!
  const userWallet = wallets.find(w => w.role === 'user') || wallets[0];
  const primary = userWallet;
  const others = wallets.filter(w => w._id.toString() !== primary._id.toString());

  const Transaction = mongoose.model('Transaction');

  for (const other of others) {
    // If other has positive balance, add it to primary
    if (other.balance > 0) {
      primary.balance = Math.max(0, (primary.balance || 0) + other.balance);
    }
    primary.totalEarnings = Math.max(primary.totalEarnings || 0, other.totalEarnings || 0);
    primary.totalWithdrawals = Math.max(primary.totalWithdrawals || 0, other.totalWithdrawals || 0);
    primary.pendingClearance = Math.max(primary.pendingClearance || 0, other.pendingClearance || 0);

    // Retain bank details if primary does not have them
    if (!primary.bankDetails?.accountNumber && other.bankDetails?.accountNumber) {
      primary.bankDetails = other.bankDetails;
    }
    if (!primary.razorpayContactId && other.razorpayContactId) {
      primary.razorpayContactId = other.razorpayContactId;
    }
    if (!primary.razorpayFundAccountId && other.razorpayFundAccountId) {
      primary.razorpayFundAccountId = other.razorpayFundAccountId;
    }

    // Re-link all transactions of other wallet to primary
    await Transaction.updateMany(
      { walletId: other._id },
      { $set: { walletId: primary._id, partnerId: targetId } }
    );

    // Delete duplicate wallet
    await this.deleteOne({ _id: other._id });
  }

  // Ensure balance is non-negative
  if (primary.balance < 0) {
    primary.balance = 0;
  }
  primary.role = 'user';
  primary.modelType = 'User';
  await primary.save();

  return primary;
};

// Methods
walletSchema.methods.credit = async function (amount, description, reference, type = 'booking_payment') {
  this.balance = Math.max(0, (this.balance || 0) + Number(amount));
  // Only add to totalEarnings for actual earnings (bookings), not topups or refunds
  if (type !== 'topup' && type !== 'refund' && type !== 'commission_refund') {
    this.totalEarnings += Number(amount);
  }
  this.lastTransactionAt = new Date();
  await this.save();

  // Create transaction record
  const Transaction = mongoose.model('Transaction');
  await Transaction.create({
    walletId: this._id,
    partnerId: this.partnerId,
    modelType: this.modelType,
    type: 'credit',
    category: type,
    amount: Number(amount),
    balanceAfter: this.balance,
    description,
    reference,
    status: 'completed'
  });

  return this;
};

walletSchema.methods.debit = async function (amount, description, reference, type = 'withdrawal') {
  const debitAmount = Number(amount);

  if (this.balance < debitAmount) {
    // For automatic deductions, cap debit at available balance so balance never drops below 0
    if (['commission_deduction', 'no_show_penalty', 'refund_deduction'].includes(type)) {
      if (this.balance <= 0) {
        // Nothing to deduct from wallet
        return this;
      }
      this.balance = 0;
    } else {
      throw new Error('Insufficient balance');
    }
  } else {
    this.balance = Math.max(0, this.balance - debitAmount);
  }

  if (type === 'withdrawal') {
    this.totalWithdrawals += debitAmount;
  }

  // If we are reversing a booking payment (refund_deduction), adjust totalEarnings
  if (type === 'refund_deduction' || type === 'no_show_penalty') {
    this.totalEarnings = Math.max(0, (this.totalEarnings || 0) - debitAmount);
  }

  this.lastTransactionAt = new Date();
  await this.save();

  const Transaction = mongoose.model('Transaction');
  await Transaction.create({
    walletId: this._id,
    partnerId: this.partnerId,
    modelType: this.modelType,
    type: 'debit',
    category: type,
    amount: debitAmount,
    balanceAfter: this.balance,
    description,
    reference,
    status: 'completed'
  });

  return this;
};

// Indexes
walletSchema.index({ createdAt: -1 });
walletSchema.index({ partnerId: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
