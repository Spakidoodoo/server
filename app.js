import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.js';
import auth from './routes/auth.js';
import artists from './routes/artists.js';
import tracks from './routes/tracks.js';
import playlists from './routes/playlists.js';
dotenv.config();

const app = express();

// console.log("DATABASE_URL", process.env.DATABASE_URL);

// ===== Middleware =====
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Fallback if env missing
  credentials: true, // Allow cookies/auth headers
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); // Handle larger JSON payloads if needed
app.use(express.urlencoded({ extended: true }));

// ===== Routes =====
app.use('/api/auth', auth);
app.use('/api/artists', artists);
app.use('/api/tracks', tracks);
app.use('/api/playlists', playlists);

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// ===== Error Handling =====
app.use(errorHandler);

export default app;
