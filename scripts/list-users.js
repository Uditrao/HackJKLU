const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function loadEnv(envPath = path.resolve(process.cwd(), '.env.local')) {
  if (!fs.existsSync(envPath)) return {};
  const src = fs.readFileSync(envPath, 'utf8');
  const obj = {};
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) obj[m[1]] = m[2];
  }
  return obj;
}

(async function main() {
  try {
    const env = loadEnv();
    const uri = process.env.MONGODB_URI || env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not found in process.env or .env.local');
      process.exit(1);
    }
    console.log('Connecting to', uri.replace(/:\/\/.*@/, '://<redacted>@'));
    await mongoose.connect(uri, { dbName: undefined });
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    const hasUsers = collections.some(c => c.name === 'users');
    if (!hasUsers) {
      console.log('No `users` collection found.');
    } else {
      const users = await db.collection('users').find({}).limit(20).toArray();
      console.log('Users (up to 20):', JSON.stringify(users, null, 2));
    }
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error listing users:', e);
    process.exit(1);
  }
})();
