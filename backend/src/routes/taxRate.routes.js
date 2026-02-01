import express from 'express';
import TaxRate from '../models/TaxRate.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all tax rates
router.get('/', async (req, res, next) => {
  try {
    const taxRates = await TaxRate.find({ isActive: true }).sort('name');
    res.json({ success: true, data: taxRates });
  } catch (error) {
    next(error);
  }
});

// Get single tax rate
router.get('/:id', async (req, res, next) => {
  try {
    const taxRate = await TaxRate.findById(req.params.id);
    if (!taxRate) {
      return res.status(404).json({ success: false, message: 'Tax rate not found' });
    }
    res.json({ success: true, data: taxRate });
  } catch (error) {
    next(error);
  }
});

// Create tax rate (admin only)
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const taxRate = await TaxRate.create(req.body);
    res.status(201).json({ success: true, data: taxRate });
  } catch (error) {
    next(error);
  }
});

// Update tax rate (admin only)
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const taxRate = await TaxRate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!taxRate) {
      return res.status(404).json({ success: false, message: 'Tax rate not found' });
    }
    res.json({ success: true, data: taxRate });
  } catch (error) {
    next(error);
  }
});

// Delete tax rate (admin only)
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const taxRate = await TaxRate.findByIdAndDelete(req.params.id);
    if (!taxRate) {
      return res.status(404).json({ success: false, message: 'Tax rate not found' });
    }
    res.json({ success: true, message: 'Tax rate deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
