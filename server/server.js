import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import leadRoutes from './src/routes/leads.js';

const app = express();
const port = process.env.PORT || 5002;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
      const isLocalDev = /^http:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+):\d+$/.test(origin || '');

      if (!origin || origin === allowedOrigin || isLocalDev) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'mini-crm-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);

const clientDist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'mini-crm-api' });
  });
}

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Copy .env.example to .env and set your MongoDB connection string.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  app.listen(port, () => {
    console.log(`Mini CRM API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
