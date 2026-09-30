// seedAdmin.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI;

async function resetAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('📂 BDD connectée :', mongoose.connection.name);

    const email = 'admin@annonces.sn';
    const plainPassword = 'xmflRaKnf2lQf37OyQI47FzS';

    // 1. Nettoyage de la collection
    await User.deleteOne({ email });

    // 2. Hachage propre
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // 3. Création sans repasser par le middleware
    await User.collection.insertOne({
      nom: 'Admin',
      prenom: 'Super',
      email: email,
      motDePasse: hashedPassword,
      telephone: '770000000',
      photo: '',
      role: 'admin',
      isVerified: true,
      isBlocked: false,
      favoris: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Admin créé avec le mot de passe définitif !');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err);
    process.exit(1);
  }
}

resetAdmin();