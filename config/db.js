const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing from .env.');
  }

  mongoose.set('bufferCommands', false);
  const conn = await mongoose.connect(mongoUri, {
    dbName: 'SenAnnonce',
    family: 4,
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
