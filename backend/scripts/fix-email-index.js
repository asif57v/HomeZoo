import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URL;
if (!MONGO_URI) {
  throw new Error('MONGODB_URL is not defined in environment variables');
}

async function fixEmailIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop the old problematic index
    try {
      await db.collection('users').dropIndex('email_1_role_1');
      console.log('✅ Dropped old email_1_role_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ️  Index email_1_role_1 does not exist (already dropped)');
      } else {
        throw err;
      }
    }

    // Create new partial index
    await db.collection('users').createIndex(
      { email: 1, role: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
        name: 'email_1_role_1'
      }
    );
    console.log('✅ Created new partial index for email_1_role_1');

    console.log('\n✨ Index migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixEmailIndex();
