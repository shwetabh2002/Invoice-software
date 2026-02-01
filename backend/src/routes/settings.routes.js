import express from 'express';
import Setting from '../models/Setting.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Get all settings
router.get('/', async (req, res, next) => {
  try {
    const settings = await Setting.getAllAsObject();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// Get settings by category
router.get('/category/:category', async (req, res, next) => {
  try {
    const settings = await Setting.getByCategory(req.params.category);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// Get single setting
router.get('/:key', async (req, res, next) => {
  try {
    const value = await Setting.getValue(req.params.key);
    res.json({ success: true, data: { key: req.params.key, value } });
  } catch (error) {
    next(error);
  }
});

// Update setting (admin only)
router.put('/:key', adminOnly, async (req, res, next) => {
  try {
    const { value, category } = req.body;
    const setting = await Setting.setValue(req.params.key, value, category);
    res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
});

// Bulk update settings (admin only)
router.post('/bulk', adminOnly, async (req, res, next) => {
  try {
    const { settings } = req.body;
    
    const results = await Promise.all(
      Object.entries(settings).map(([key, value]) => 
        Setting.setValue(key, value)
      )
    );
    
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;
