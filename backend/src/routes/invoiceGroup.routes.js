import express from 'express';
import InvoiceGroup from '../models/InvoiceGroup.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all number series (optionally filtered by document type)
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let query = { isActive: true };
    
    // Filter by document type if specified
    if (type === 'invoice') {
      query.documentType = { $in: ['invoice', 'both'] };
    } else if (type === 'quotation') {
      query.documentType = { $in: ['quotation', 'both'] };
    }
    
    const series = await InvoiceGroup.find(query).sort('name');
    res.json({ success: true, data: series });
  } catch (error) {
    next(error);
  }
});

// Get single number series
router.get('/:id', async (req, res, next) => {
  try {
    const series = await InvoiceGroup.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ success: false, message: 'Number series not found' });
    }
    res.json({ success: true, data: series });
  } catch (error) {
    next(error);
  }
});

// Create number series (admin only)
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const series = await InvoiceGroup.create(req.body);
    res.status(201).json({ success: true, data: series });
  } catch (error) {
    next(error);
  }
});

// Update number series (admin only)
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const series = await InvoiceGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!series) {
      return res.status(404).json({ success: false, message: 'Number series not found' });
    }
    res.json({ success: true, data: series });
  } catch (error) {
    next(error);
  }
});

// Delete number series (admin only)
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const series = await InvoiceGroup.findByIdAndDelete(req.params.id);
    if (!series) {
      return res.status(404).json({ success: false, message: 'Number series not found' });
    }
    res.json({ success: true, message: 'Number series deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
