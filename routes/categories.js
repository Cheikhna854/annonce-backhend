const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');

const categoriesParDefaut = [
  'Immobilier',
  'Automobile',
  'Emploi',
  'Téléphones',
  'Informatique',
  'Mode',
  'Services',
  'Électronique',
];

// GET toutes les catégories
router.get('/', async (req, res) => {
  try {
    let categories = await Category.find().sort('nom');
    if (categories.length === 0) {
      try {
        await Category.insertMany(categoriesParDefaut.map((nom) => ({ nom })), { ordered: false });
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
      categories = await Category.find().sort('nom');
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Impossible de charger les catégories', error: err.message });
  }
});

// POST créer (admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { nom, icone, description } = req.body;
    const categorie = await Category.create({ nom, icone, description });
    res.status(201).json(categorie);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// PUT modifier (admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const categorie = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(categorie);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// DELETE (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Catégorie supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
