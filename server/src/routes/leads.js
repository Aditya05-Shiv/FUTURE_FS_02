import express from 'express';
import Lead from '../models/Lead.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const statuses = ['new', 'contacted', 'converted'];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.post('/', async (req, res) => {
  const { name, email, phone, source, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  const lead = await Lead.create({ name, email, phone, source, message });
  return res.status(201).json(lead);
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { status, search = '' } = req.query;
  const query = {};

  if (status && statuses.includes(status)) {
    query.status = status;
  }

  if (search.trim()) {
    const safeSearch = escapeRegex(search.trim());
    query.$or = [
      { name: new RegExp(safeSearch, 'i') },
      { email: new RegExp(safeSearch, 'i') },
      { source: new RegExp(safeSearch, 'i') }
    ];
  }

  const leads = await Lead.find(query).sort({ createdAt: -1 });
  const [total, newCount, contacted, converted] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ status: 'new' }),
    Lead.countDocuments({ status: 'contacted' }),
    Lead.countDocuments({ status: 'converted' })
  ]);

  return res.json({
    leads,
    analytics: {
      total,
      new: newCount,
      contacted,
      converted,
      conversionRate: total ? Math.round((converted / total) * 100) : 0
    }
  });
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  if (!statuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid lead status' });
  }

  const lead = await Lead.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });

  if (!lead) {
    return res.status(404).json({ message: 'Lead not found' });
  }

  return res.json(lead);
});

router.post('/:id/notes', async (req, res) => {
  const { text } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ message: 'Note text is required' });
  }

  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    return res.status(404).json({ message: 'Lead not found' });
  }

  lead.notes.push({ text: text.trim(), author: req.admin.email });
  await lead.save();

  return res.status(201).json(lead);
});

router.delete('/:id', async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);

  if (!lead) {
    return res.status(404).json({ message: 'Lead not found' });
  }

  return res.status(204).send();
});

export default router;
