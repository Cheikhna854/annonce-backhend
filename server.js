require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// ==========================================
// CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5173';

// ==========================================
// MIDDLEWARES
// ==========================================

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// ==========================================
// ROUTE DE TEST
// ==========================================

app.get('/', (req, res) => {
  res.json({
    message: 'API Annonces.sn fonctionne !',
    frontend: FRONTEND_URL,
    status: 'online'
  });
});

// ==========================================
// ROUTES API
// ==========================================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/annonces', require('./routes/annonces'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

// ==========================================
// ROUTE 404
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    message: 'Route introuvable'
  });
});

// ==========================================
// Démarrer l'API uniquement lorsque MongoDB est disponible.
const startServer = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    console.log(`🌐 Frontend autorisé : ${FRONTEND_URL}`);
  });
};

startServer();