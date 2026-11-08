import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('✅ Connected to MongoDB successfully.');
    return true;
  } catch (error) {
    console.warn('⚠️ Warning: MongoDB connection failed. Database features may be offline.');
    console.warn('   Ensure MongoDB is running locally or check MONGODB_URI in .env');
    return false;
  }
};
