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
    if (!origin) return callback(null, true);
    let hostname;
    try {
      hostname = new URL(origin).hostname;
    } catch {
      return callback(new Error('Invalid CORS origin'));
    }
    if (
      origin === FRONTEND_URL ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.vercel.app')
    ) return callback(null, true);
    return callback(new Error('Origin blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/uploads', express.static(process.env.UPLOADS_DIR || path.join(__dirname, 'uploads'), { maxAge: '1d' }));

app.get('/', (req, res) => {
  res.json({
    message: 'API Annonces.sn fonctionne !',
    frontend: FRONTEND_URL,
    status: 'online',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/annonces', require('./routes/annonces'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

async function startServer() {
  try {
    console.log('Connexion a MongoDB...');
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Allowed frontend: ${FRONTEND_URL}`);
    });
    server.on('error', (error) => {
      console.error(`Server startup error: ${error.message}`);
      process.exit(1);
    });
  } catch (error) {
    console.error(`Erreur de connexion MongoDB: ${error.message}`);
    if (error.code === 'ETIMEOUT' && error.message.includes('querySrv')) {
      console.error("Le DNS SRV d'Atlas ne repond pas a temps. Verifiez votre DNS et votre connexion reseau.");
    } else {
      console.error('Verifiez MONGO_URI, le cluster Atlas et la liste Network Access.');
    }
    process.exit(1);
  }
}

startServer();
