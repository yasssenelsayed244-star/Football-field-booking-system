const mongoose = require('mongoose');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing in environment variables');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[${timestamp()}] ✅ MongoDB connected`);
}

module.exports = {
  connectDB,
};

