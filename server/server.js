import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './src/routes/auth.js';
import leadRoutes from './src/routes/leads.js';

const app = express();
const port = process.env.PORT || 5002;

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

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'mini-crm-api', dashboard: process.env.CLIENT_ORIGIN });
});

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
