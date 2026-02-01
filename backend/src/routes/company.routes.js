import express from 'express';
import Company from '../models/Company.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get current company details (for logged in user)
router.get('/current', protect, async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
});

// Update company details (owner/admin only)
router.put('/current', protect, async (req, res, next) => {
  try {
    // Check if user is owner or admin
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company owner or admin can update company details'
      });
    }

    const allowedUpdates = [
      'name', 'logo', 'email', 'phone', 'website',
      'address', 'taxInfo', 'bankDetails', 'settings', 'branding'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const company = await Company.findByIdAndUpdate(
      req.user.company,
      updates,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
});

// Get company by slug (for public pages)
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const company = await Company.findOne({ 
      slug: req.params.slug,
      isActive: true 
    }).select('name logo branding settings.currencySymbol settings.dateFormat');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
});

export default router;
