const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Annonce = require('../models/Annonce');
const { protect, admin } = require('../middleware/auth');

router.use(protect, admin);

// GET statistiques dashboard
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAnnonces = await Annonce.countDocuments();
    const enAttente = await Annonce.countDocuments({ statut: 'en_attente' });
    const signalements = await Annonce.countDocuments({ signalements: { $gt: 0 } });

    res.json({ totalUsers, totalAnnonces, enAttente, signalements });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET tous les utilisateurs
router.get('/utilisateurs', async (req, res) => {
  const users = await User.find().select('-motDePasse').sort('-createdAt');
  res.json(users);
});

// PATCH bloquer/débloquer un utilisateur
router.patch('/utilisateurs/:id/bloquer', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET toutes les annonces (y compris inactives)
router.get('/annonces', async (req, res) => {
  const annonces = await Annonce.find()
    .populate('categorie', 'nom')
    .populate('utilisateur', 'nom prenom email')
    .sort('-createdAt');
  res.json(annonces);
});

// PATCH valider une annonce en attente
router.patch('/annonces/:id/valider', async (req, res) => {
  try {
    const annonce = await Annonce.findByIdAndUpdate(
      req.params.id,
      { statut: 'validee', signalements: 0 },
      { new: true }
    );
    if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
    res.json(annonce);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE supprimer une annonce (modération)
router.delete('/annonces/:id', async (req, res) => {
  try {
    await Annonce.findByIdAndDelete(req.params.id);
    res.json({ message: 'Annonce supprimée par l\'administrateur' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;