import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/girjasoft_invoices', {
      // Connection pool settings for scalability
      maxPoolSize: 50,           // Maximum connections in the pool
      minPoolSize: 5,            // Minimum connections to maintain
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000,    // Socket timeout
      maxIdleTimeMS: 30000,      // Close idle connections after 30s
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't exit immediately - let the app handle retries
    throw error;
  }
};

export default connectDB;
