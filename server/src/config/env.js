import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Canonical location: Root workspace directory (Documents/foodbridge-ai/.env)
const rootEnvPath = path.resolve(__dirname, '../../../.env');
// Secondary fallback location: server package directory (Documents/foodbridge-ai/server/.env)
const serverEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

export const ENV_LOADED_FROM = fs.existsSync(rootEnvPath)
  ? rootEnvPath
  : (fs.existsSync(serverEnvPath) ? serverEnvPath : 'process.cwd()/.env');
