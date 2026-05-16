import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabaseRoutes from './routes/supabaseRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', supabaseRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
