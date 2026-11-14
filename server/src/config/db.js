import mongoose from 'mongoose';

export async function connectDB(uri = process.env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = uri || 'mongodb://127.0.0.1:27017/foodbridge_ai';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[DB WARNING] Could not connect to MongoDB at ${mongoUri}. Reason: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.log('[DB] Running in detached/mock mode for development without live database.');
    return null;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
