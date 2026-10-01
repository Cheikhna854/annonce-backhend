const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET latest conversations. Aggregate in MongoDB instead of loading/populating every message in Node.
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Message.aggregate([
      { $match: { $or: [{ expediteur: userId }, { recepteur: userId }] } },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ['$expediteur', userId] }, '$recepteur', '$expediteur'] },
          dernierMessage: {
            $first: {
              _id: '$_id', expediteur: '$expediteur', recepteur: '$recepteur',
              annonce: '$annonce', contenu: '$contenu', lu: '$lu', createdAt: '$createdAt',
            },
          },
          nonLus: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recepteur', userId] }, { $eq: ['$lu', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: '_id',
          foreignField: '_id',
          pipeline: [{ $project: { _id: 1, nom: 1, prenom: 1, photo: 1 } }],
          as: 'contact',
        },
      },
      { $unwind: '$contact' },
      { $sort: { 'dernierMessage.createdAt': -1 } },
      { $limit: 50 },
      { $project: { _id: 0, contact: 1, dernierMessage: 1, nonLus: 1 } },
    ]);

    return res.json(conversations);
  } catch (err) {
    console.error('Erreur chargement conversations:', err.message);
    return res.status(500).json({ message: 'Impossible de charger les conversations.' });
  }
});

// GET messages with a specific contact
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

    return res.json(messages);
  } catch (err) {
    console.error('Erreur chargement messages:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST send a message
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
    return res.status(201).json(message);
  } catch (err) {
    console.error('Erreur envoi message:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
