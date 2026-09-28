const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

router.post('/inscription', async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone, role } = req.body;

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
    }

    const roleFinal = role === 'prestataire' ? 'prestataire' : 'client';

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = await User.create({ nom, prenom, email, motDePasse, telephone, role: roleFinal });

    res.status(201).json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.post('/connexion', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Ce compte a été bloqué' });
    }

    const match = await user.comparePassword(motDePasse);
    if (!match) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    res.json({
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      photo: user.photo,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.get('/profil', protect, async (req, res) => {
  res.json(req.user);
});

router.put('/profil', protect, async (req, res) => {
  try {
    const { nom, prenom, telephone, photo } = req.body;
    const user = await User.findById(req.user._id);
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;
    if (photo) user.photo = photo;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;