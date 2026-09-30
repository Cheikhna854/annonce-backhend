// forceAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI;

async function forceAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connecté à la base de données.');

    const email = 'admin@annonces.sn';
    const rawPassword = 'xmflRaKnf2lQf37OyQI47FzS';

    // 1. Supprimer s'il existe déjà
    await User.deleteOne({ email });

    // 2. Hacher manuellement le mot de passe pour éliminer tout bug de middleware
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // 3. Créer directement en base avec le mot de passe déjà haché
    const newAdmin = new User({
      nom: 'Admin',
      prenom: 'Super',
      email: email,
      motDePasse: hashedPassword,
      role: 'admin',
      isBlocked: false
    });

    // Sauvegarder sans repasser par le hook si nécessaire ou avec la méthode standard
    await newAdmin.save();

    console.log('----------------------------------------');
    console.log('✅ COMPTE ADMIN CRÉÉ AVEC SUCCÈS !');
    console.log('Email:', email);
    console.log('Mot de passe:', rawPassword);
    console.log('----------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Erreur :', err);
    process.exit(1);
  }
}

forceAdmin();