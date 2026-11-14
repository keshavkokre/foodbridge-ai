import mongoose from 'mongoose';

/**
 * Sanitizes MongoDB connection URIs to redact passwords from logs.
 */
function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/**
 * Normalizes connection URI by removing template brackets (< >) and trailing semicolons.
 */
function normalizeMongoUri(rawUri) {
  if (!rawUri) return '';
  let uri = rawUri.trim().replace(/;$/, '');
  // Remove template brackets if user left <password>
  uri = uri.replace(/:<([^>]+)>@/, ':$1@');
  return uri;
}

/**
 * Fallback replica-set resolver for Windows environments where Node c-ares DNS cannot query SRV records.
 */
function resolveReplicaSetFallback(srvUri) {
  if (srvUri.includes('cluster0.xuevq8h.mongodb.net')) {
    const match = srvUri.match(/mongodb(?:\+srv)?:\/\/([^:]+):([^@]+)@/);
    if (match) {
      const user = match[1];
      const pass = match[2];
      return `mongodb://${user}:${pass}@ac-ssvlfvx-shard-00-00.xuevq8h.mongodb.net:27017,ac-ssvlfvx-shard-00-01.xuevq8h.mongodb.net:27017,ac-ssvlfvx-shard-00-02.xuevq8h.mongodb.net:27017/foodbridge_ai?ssl=true&replicaSet=atlas-chmsjr-shard-0&authSource=admin&retryWrites=true&w=majority`;
    }
  }
  return null;
}

export async function connectDB(uri = process.env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const rawUri = uri || process.env.MONGODB_URI;
  const mongoUri = normalizeMongoUri(rawUri);

  if (!mongoUri || mongoUri.includes('YOUR_ATLAS') || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
    console.log('[DB] No live MongoDB Atlas connection string configured. Running in detached local persistent demo mode.');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] Connected to MongoDB Atlas: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    // If SRV lookup failed on local Windows environment, attempt direct replicaSet connection
    if (error.message && (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED'))) {
      const fallbackUri = resolveReplicaSetFallback(mongoUri);
      if (fallbackUri) {
        try {
          console.log('[DB] Attempting direct replicaSet connection fallback for local environment...');
          const conn = await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 5000,
          });
          console.log(`[DB] Connected to MongoDB Atlas (Direct ReplicaSet): ${conn.connection.host}/${conn.connection.name}`);
          return conn;
        } catch (fallbackErr) {
          console.warn(`[DB WARNING] Fallback connection failed: ${fallbackErr.message}`);
        }
      }
    }

    console.warn(`[DB WARNING] Could not connect to MongoDB Atlas at ${sanitizeMongoUri(mongoUri)}. Reason: ${error.message}`);
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
