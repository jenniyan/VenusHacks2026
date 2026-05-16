import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

router.get('/items', async (req, res) => {
  const { data, error } = await supabase.from('items').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

router.post('/items', async (req, res) => {
  const payload = req.body;

  const { data, error } = await supabase.from('items').insert([payload]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data[0]);
});

router.get('/profile/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

export default router;
