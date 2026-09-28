const express = require('express');
const router = express.Router();
const Annonce = require('../models/Annonce');
const User = require('../models/User');
const { protect, vendeur } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/annonces - recherche + filtres
router.get('/', async (req, res) => {
  try {
    const { q, categorie, ville, prixMin, prixMax, tri } = req.query;
    const filtre = { actif: true, statut: 'validee' };

    if (q) filtre.$text = { $search: q };
    if (categorie) filtre.categorie = categorie;
    if (ville) filtre.ville = new RegExp(ville, 'i');
    if (prixMin || prixMax) {
      filtre.prix = {};
      if (prixMin) filtre.prix.$gte = Number(prixMin);
      if (prixMax) filtre.prix.$lte = Number(prixMax);
    }

    let sort = '-createdAt';
    if (tri === 'popularite') sort = '-vues';
    if (tri === 'prix_asc') sort = 'prix';
    if (tri === 'prix_desc') sort = '-prix';

    const annonces = await Annonce.find(filtre)
      .populate('categorie', 'nom icone')
      .populate('utilisateur', 'nom prenom photo')
      .sort(sort);

    res.json(annonces);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET mes annonces (prestataire/admin uniquement)
router.get('/mes-annonces', protect, vendeur, async (req, res) => {
  const annonces = await Annonce.find({ utilisateur: req.user._id })
    .populate('categorie', 'nom icone')
    .sort('-createdAt');
  res.json(annonces);
});

// GET une annonce (détail)
router.get('/:id', async (req, res) => {
  try {
    const annonce = await Annonce.findByIdAndUpdate(
      req.params.id,
      { $inc: { vues: 1 } },
      { new: true }
    )
      .populate('categorie', 'nom icone')
      .populate('utilisateur', 'nom prenom photo telephone createdAt');

    if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
    res.json(annonce);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST créer une annonce (prestataire/admin uniquement)
router.post('/', protect, vendeur, upload.array('images', 5), async (req, res) => {
  try {
    const { titre, description, prix, categorie, ville } = req.body;
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    const annonce = await Annonce.create({
      titre,
      description,
      prix,
      categorie,
      ville,
      images,
      utilisateur: req.user._id,
      statut: 'en_attente',
    });

    res.status(201).json(annonce);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PUT modifier une annonce
router.put('/:id', protect, async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.id);
    if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
    if (annonce.utilisateur.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    Object.assign(annonce, req.body);
    await annonce.save();
    res.json(annonce);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PATCH activer/désactiver
router.patch('/:id/statut', protect, async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.id);
    if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
    if (annonce.utilisateur.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    annonce.actif = !annonce.actif;
    await annonce.save();
    res.json(annonce);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE supprimer
router.delete('/:id', protect, async (req, res) => {
  try {
    const annonce = await Annonce.findById(req.params.id);
    if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
    if (annonce.utilisateur.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    await annonce.deleteOne();
    res.json({ message: 'Annonce supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST signaler une annonce
router.post('/:id/signaler', protect, async (req, res) => {
  try {
    const annonce = await Annonce.findByIdAndUpdate(
      req.params.id,
      { $inc: { signalements: 1 } },
      { new: true }
    );
    if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
    res.json({ message: 'Annonce signalée, merci pour votre vigilance' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST favoris (ajouter/retirer)
router.post('/:id/favori', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const index = user.favoris.indexOf(req.params.id);
    if (index === -1) {
      user.favoris.push(req.params.id);
    } else {
      user.favoris.splice(index, 1);
    }
    await user.save();
    res.json({ favoris: user.favoris });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET mes favoris
router.get('/utilisateur/favoris', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favoris',
    populate: { path: 'categorie', select: 'nom icone' },
  });
  res.json(user.favoris);
});

module.exports = router;