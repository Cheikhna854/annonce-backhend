require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin(origin, callback) {
    // Autorise les requêtes sans Origin (Postman, appels serveur à serveur).
    if (!origin) return callback(null, true);

    let hostname;
    try {
      hostname = new URL(origin).hostname;
    } catch {
      return callback(new Error('Origine CORS invalide'));
    }

    if (
      origin === FRONTEND_URL ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    return callback(new Error('Origine bloquée par la politique CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({
    message: 'API Annonces.sn fonctionne !',
    frontend: FRONTEND_URL,
    status: 'online',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/annonces', require('./routes/annonces'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

const startServer = async () => {
  try {
    // L'API ne doit pas annoncer qu'elle est prête si MongoDB est inaccessible.
    await connectDB();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur lancé sur le port ${PORT}`);
      console.log(`🌐 Frontend autorisé : ${FRONTEND_URL}`);
    });

    server.on('error', (error) => {
      console.error(`❌ Impossible de démarrer le serveur : ${error.message}`);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(`❌ Erreur MongoDB : ${error.message}`);
    console.error("Vérifie MONGO_URI, le cluster Atlas et l'IP Access List (0.0.0.0/0 pour autoriser toutes les IP).");
    process.exitCode = 1;
  }
};

startServer();
