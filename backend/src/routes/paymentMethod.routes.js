import express from 'express';
import PaymentMethod from '../models/PaymentMethod.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all payment methods
router.get('/', async (req, res, next) => {
  try {
    const methods = await PaymentMethod.find({ isActive: true }).sort('name');
    res.json({ success: true, data: methods });
  } catch (error) {
    next(error);
  }
});

// Get single payment method
router.get('/:id', async (req, res, next) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    res.json({ success: true, data: method });
  } catch (error) {
    next(error);
  }
});

// Create payment method (admin only)
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const method = await PaymentMethod.create(req.body);
    res.status(201).json({ success: true, data: method });
  } catch (error) {
    next(error);
  }
});

// Update payment method (admin only)
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const method = await PaymentMethod.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    res.json({ success: true, data: method });
  } catch (error) {
    next(error);
  }
});

// Delete payment method (admin only)
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const method = await PaymentMethod.findByIdAndDelete(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
