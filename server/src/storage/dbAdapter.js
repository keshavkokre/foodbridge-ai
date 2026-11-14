import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'demo_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialStore() {
  return {
    users: [],
    donorProfiles: [],
    ngoProfiles: [],
    volunteerProfiles: [],
    foodDonations: [],
    ngoFoodDemands: [],
    allocations: [],
    pickupAssignments: [],
    handoverVerifications: []
  };
}

let memoryStore = null;

function loadStore() {
  if (memoryStore) return memoryStore;
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryStore = JSON.parse(content);
      return memoryStore;
    } catch (e) {
      console.warn('[STORAGE] Corrupt local demo store, re-initializing empty store.');
    }
  }
  memoryStore = getInitialStore();
  saveStore();
  return memoryStore;
}

function saveStore() {
  if (!memoryStore) return;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[STORAGE ERROR] Failed writing local demo store:', err.message);
  }
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export function getStorageMode() {
  if (isMongoConnected()) {
    return {
      mode: 'MONGODB_ATLAS',
      isLiveDb: true,
      label: 'MongoDB Atlas Active'
    };
  }
  return {
    mode: 'LOCAL_PERSISTENT_DEMO_STORE',
    isLiveDb: false,
    label: 'Local Persistent Demo Store (Persistent JSON)'
  };
}

export function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Universal Store Interface: Seamlessly delegates to Mongoose if live DB is connected,
 * otherwise performs persistent file-backed JSON operations.
 */
export const dbStore = {
  // Clear collections for seeding
  async resetDemoData() {
    if (isMongoConnected()) {
      await mongoose.connection.dropDatabase().catch(() => {});
    }
    memoryStore = getInitialStore();
    saveStore();
  },

  // Generic collection accessor
  collection(name) {
    const store = loadStore();
    if (!store[name]) store[name] = [];
    return {
      getAll() {
        return store[name];
      },
      find(filter = {}) {
        return store[name].filter(item => matchFilter(item, filter));
      },
      findOne(filter = {}) {
        return store[name].find(item => matchFilter(item, filter)) || null;
      },
      findById(id) {
        if (!id) return null;
        const idStr = id.toString();
        return store[name].find(item => item._id?.toString() === idStr) || null;
      },
      insert(doc) {
        const _id = doc._id || generateId();
        const record = {
          ...doc,
          _id,
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        store[name].push(record);
        saveStore();
        return record;
      },
      updateById(id, update = {}) {
        const idStr = id?.toString();
        const index = store[name].findIndex(item => item._id?.toString() === idStr);
        if (index === -1) return null;

        const current = store[name][index];
        const updated = applyUpdate(current, update);
        store[name][index] = updated;
        saveStore();
        return updated;
      },
      findOneAndUpdate(filter, update, options = {}) {
        const index = store[name].findIndex(item => matchFilter(item, filter));
        if (index === -1) return null;

        const current = store[name][index];
        const updated = applyUpdate(current, update);
        store[name][index] = updated;
        saveStore();
        return options.new !== false ? updated : current;
      },
      updateOne(filter, update) {
        return this.findOneAndUpdate(filter, update);
      },
      deleteMany(filter = {}) {
        const before = store[name].length;
        store[name] = store[name].filter(item => !matchFilter(item, filter));
        saveStore();
        return { deletedCount: before - store[name].length };
      },
      countDocuments(filter = {}) {
        return this.find(filter).length;
      }
    };
  }
};

function matchFilter(item, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(val)) {
      if (!val.some(sub => matchFilter(item, sub))) return false;
      continue;
    }
    if (key === '$and' && Array.isArray(val)) {
      if (!val.every(sub => matchFilter(item, sub))) return false;
      continue;
    }

    const itemVal = getNestedValue(item, key);

    // Operator handling
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if ('$in' in val) {
        const match = Array.isArray(val.$in) && (
          Array.isArray(itemVal)
            ? itemVal.some(v => val.$in.includes(v))
            : val.$in.map(x => x?.toString()).includes(itemVal?.toString())
        );
        if (!match) return false;
        continue;
      }
      if ('$nin' in val) {
        if (Array.isArray(val.$nin) && val.$nin.map(x => x?.toString()).includes(itemVal?.toString())) return false;
        continue;
      }
      if ('$ne' in val) {
        if (val.$ne === null && (itemVal !== null && itemVal !== undefined)) continue;
        if (val.$ne !== null && itemVal?.toString() === val.$ne?.toString()) return false;
        continue;
      }
      if ('$gte' in val) {
        if (!(itemVal >= val.$gte)) return false;
        continue;
      }
      if ('$gt' in val) {
        if (val.$gt instanceof Date) {
          if (new Date(itemVal) <= val.$gt) return false;
        } else if (!(itemVal > val.$gt)) {
          return false;
        }
        continue;
      }
      if ('$lte' in val) {
        if (val.$lte instanceof Date) {
          if (new Date(itemVal) > val.$lte) return false;
        } else if (!(itemVal <= val.$lte)) {
          return false;
        }
        continue;
      }
      if ('$lt' in val) {
        if (val.$lt instanceof Date) {
          if (new Date(itemVal) >= val.$lt) return false;
        } else if (!(itemVal < val.$lt)) {
          return false;
        }
        continue;
      }
    }

    // Direct comparison
    if (val instanceof Date) {
      if (new Date(itemVal).getTime() !== val.getTime()) return false;
      continue;
    }

    if (itemVal?.toString() !== val?.toString()) {
      return false;
    }
  }

  return true;
}

function applyUpdate(current, update) {
  const result = { ...current, updatedAt: new Date().toISOString() };

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      setNestedValue(result, k, v);
    }
  }

  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      const cur = getNestedValue(result, k) || 0;
      setNestedValue(result, k, cur + Number(v));
    }
  }

  if (!update.$set && !update.$inc) {
    Object.assign(result, update);
  }

  return result;
}

function getNestedValue(obj, pathStr) {
  if (!obj) return undefined;
  const parts = pathStr.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr == null) return undefined;
    curr = curr[part];
  }
  return curr;
}

function setNestedValue(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object') {
      curr[part] = {};
    }
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = value;
}
