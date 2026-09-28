const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET liste des conversations (dernier message par contact)
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({
      $or: [{ expediteur: userId }, { recepteur: userId }],
    })
      .sort('-createdAt')
      .populate('expediteur', 'nom prenom photo')
      .populate('recepteur', 'nom prenom photo')
      .populate('annonce', 'titre images prix');

    const conversations = {};
    messages.forEach((msg) => {
      const contact =
        msg.expediteur._id.toString() === userId.toString() ? msg.recepteur : msg.expediteur;
      const key = contact._id.toString();
      if (!conversations[key]) {
        conversations[key] = { contact, dernierMessage: msg, nonLus: 0 };
      }
      if (msg.recepteur._id.toString() === userId.toString() && !msg.lu) {
        conversations[key].nonLus += 1;
      }
    });

    res.json(Object.values(conversations));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET messages avec un contact précis
router.get('/:contactId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { contactId } = req.params;

    const messages = await Message.find({
      $or: [
        { expediteur: userId, recepteur: contactId },
        { expediteur: contactId, recepteur: userId },
      ],
    }).sort('createdAt');

    await Message.updateMany(
      { expediteur: contactId, recepteur: userId, lu: false },
      { lu: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// POST envoyer un message
router.post('/', protect, async (req, res) => {
  try {
    const { recepteur, contenu, annonce } = req.body;
    if (!recepteur || !contenu) {
      return res.status(400).json({ message: 'Destinataire et contenu requis' });
    }
    const message = await Message.create({
      expediteur: req.user._id,
      recepteur,
      contenu,
      annonce: annonce || undefined,
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
