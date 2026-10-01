const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sendPasswordResetCode } = require('../services/email');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET est absente de la configuration.');
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const publicUser = (user) => ({
  _id: user._id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  telephone: user.telephone,
  photo: user.photo,
  role: user.role,
  token: generateToken(user._id),
});

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hashResetCode = (email, code) => crypto
  .createHash('sha256')
  .update(`${email}:${code}:${process.env.JWT_SECRET || ''}`)
  .digest('hex');

router.post('/inscription', async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone, role } = req.body;
    const cleanEmail = normalizeEmail(email);
    if (!nom || !prenom || !isValidEmail(cleanEmail) || !motDePasse) {
      return res.status(400).json({ message: 'Nom, prénom, email valide et mot de passe sont obligatoires.' });
    }
    if (motDePasse.length < 8) return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' });

    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(400).json({ message: 'Cet email est déjà utilisé.' });

    const user = await User.create({
      nom: nom.trim(), prenom: prenom.trim(), email: cleanEmail, motDePasse,
      telephone, role: role === 'prestataire' ? 'prestataire' : 'client',
    });
    return res.status(201).json(publicUser(user));
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    console.error('Erreur inscription:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/connexion', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.motDePasse === 'string' ? req.body.motDePasse : '';
    if (!email || !password) return res.status(400).json({ message: 'Veuillez remplir tous les champs.' });

    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user || !user.motDePasse || !(await bcrypt.compare(password, user.motDePasse))) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }
    if (user.isBlocked) return res.status(403).json({ message: 'Ce compte a été bloqué.' });
    return res.json(publicUser(user));
  } catch (err) {
    console.error('Erreur connexion:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/mot-de-passe-oublie', async (req, res) => {
  const genericMessage = 'Si un compte correspond à cette adresse, un code de réinitialisation lui a été envoyé.';
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Veuillez saisir une adresse email valide.' });
    const user = await User.findOne({ email }).select('+resetCodeHash +resetCodeExpiresAt +resetCodeAttempts +resetCodeSentAt');
    if (!user) return res.json({ message: genericMessage });

    if (user.resetCodeSentAt && Date.now() - user.resetCodeSentAt.getTime() < 60 * 1000) {
      return res.json({ message: genericMessage });
    }

    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    user.resetCodeHash = hashResetCode(email, code);
    user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.resetCodeAttempts = 0;
    user.resetCodeSentAt = new Date();
    await user.save();

    try {
      await sendPasswordResetCode(email, code);
    } catch (mailError) {
      console.error('Échec envoi code réinitialisation:', mailError.message);
      user.resetCodeHash = undefined;
      user.resetCodeExpiresAt = undefined;
      user.resetCodeAttempts = 0;
      await user.save();
    }
    return res.json({ message: genericMessage });
  } catch (err) {
    console.error('Erreur mot de passe oublié:', err.message);
    return res.json({ message: genericMessage });
  }
});

router.post('/reinitialiser-mot-de-passe', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const newPassword = typeof req.body.nouveauMotDePasse === 'string' ? req.body.nouveauMotDePasse : '';
    if (!isValidEmail(email) || !/^\d{6}$/.test(code) || newPassword.length < 8) {
      return res.status(400).json({ message: 'Email, code à 6 chiffres et nouveau mot de passe d’au moins 8 caractères requis.' });
    }

    const user = await User.findOne({ email }).select('+motDePasse +resetCodeHash +resetCodeExpiresAt +resetCodeAttempts +resetCodeSentAt');
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt || user.resetCodeExpiresAt <= new Date()) {
      return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }
    if (user.resetCodeAttempts >= 5) {
      user.resetCodeHash = undefined;
      user.resetCodeExpiresAt = undefined;
      user.resetCodeAttempts = 0;
      await user.save();
      return res.status(429).json({ message: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    const expected = Buffer.from(user.resetCodeHash, 'hex');
    const supplied = Buffer.from(hashResetCode(email, code), 'hex');
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
      user.resetCodeAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }

    user.motDePasse = newPassword;
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    user.resetCodeAttempts = 0;
    await user.save();
    return res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
  } catch (err) {
    console.error('Erreur réinitialisation mot de passe:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/mot-de-passe', protect, async (req, res) => {
  try {
    const newPassword = typeof req.body.nouveauMotDePasse === 'string' ? req.body.nouveauMotDePasse : '';
    if (newPassword.length < 8) return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' });
    const user = await User.findById(req.user._id).select('+motDePasse');
    if (user.motDePasse) {
      const currentPassword = typeof req.body.motDePasseActuel === 'string' ? req.body.motDePasseActuel : '';
      if (!(await bcrypt.compare(currentPassword, user.motDePasse))) {
        return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
      }
    }
    user.motDePasse = newPassword;
    await user.save();
    return res.json({ message: 'Mot de passe défini avec succès.' });
  } catch (err) {
    console.error('Erreur définition mot de passe:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/profil', protect, async (req, res) => res.json(req.user));

router.put('/profil', protect, upload.single('photo'), async (req, res) => {
  try {
    const { nom, prenom, telephone, photo } = req.body;
    const user = await User.findById(req.user._id);
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (typeof telephone === 'string') user.telephone = telephone;
    if (req.file) user.photo = `/uploads/${req.file.filename}`;
    else if (photo) user.photo = photo;
    await user.save();
    return res.json(user);
  } catch (err) {
    console.error('Erreur mise à jour profil:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
