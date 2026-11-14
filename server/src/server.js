import './config/env.js';

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[FoodBridge AI Server] Operational on port ${PORT}`);
    console.log(`[Health Endpoint] http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL SERVER ERROR]', err);
  process.exit(1);
});

