const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI est absente. Vérifie la configuration du fichier .env.');
  }

  // Ne pas mettre les requêtes en attente si la base n'est pas connectée.
  mongoose.set('bufferCommands', false);
  const conn = await mongoose.connect(mongoUri, {
    dbName: 'SenAnnonce',
    family: 4,
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`✅ MongoDB connecté : ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;