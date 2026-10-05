const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../services/email');

const tentatives = new Map();
const fenetreMs = 15 * 60 * 1000;
const maximumMessages = 5;

router.post('/', async (req, res) => {
  const maintenant = Date.now();
  for (const [ip, entree] of tentatives) {
    if (maintenant - entree.debut > fenetreMs) tentatives.delete(ip);
  }

  const ip = req.ip || req.socket.remoteAddress || 'inconnu';
  const entree = tentatives.get(ip);
  if (entree && entree.nombre >= maximumMessages && maintenant - entree.debut < fenetreMs) {
    return res.status(429).json({ message: 'Trop de messages envoyés. Réessayez dans quelques minutes.' });
  }

  const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (nom.length < 2 || nom.length > 80) return res.status(400).json({ message: 'Veuillez saisir un nom de 2 à 80 caractères.' });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Veuillez saisir une adresse email valide.' });
  if (message.length < 5 || message.length > 2000) return res.status(400).json({ message: 'Le message doit contenir entre 5 et 2 000 caractères.' });

  if (!entree || maintenant - entree.debut >= fenetreMs) tentatives.set(ip, { debut: maintenant, nombre: 1 });
  else entree.nombre += 1;

  try {
    await sendContactMessage({ nom, email, message });
    return res.json({ message: 'Votre message a bien été envoyé.' });
  } catch (err) {
    console.error('Échec envoi message de contact:', err.message);
    return res.status(503).json({ message: 'Le service email est momentanément indisponible. Réessayez ou écrivez à annonce854@gmail.com.' });
  }
});

module.exports = router;
