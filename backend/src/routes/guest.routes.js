import express from 'express';
import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';

const router = express.Router();

// @desc    Get invoice by URL key (public view)
// @route   GET /api/guest/invoice/:urlKey
// @access  Public
router.get('/invoice/:urlKey', async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      urlKey: req.params.urlKey,
      status: { $in: ['sent', 'viewed', 'paid'] }
    })
      .populate('client')
      .populate('user', 'profile bankDetails')
      .populate('paymentMethod', 'name')
      .populate('items.taxRate', 'name percent');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found or not available'
      });
    }

    // Check password if set
    if (invoice.password) {
      const { password } = req.query;
      if (!password || password !== invoice.password) {
        return res.status(401).json({
          success: false,
          message: 'Password required',
          requiresPassword: true
        });
      }
    }

    // Mark as viewed if sent
    if (invoice.status === 'sent') {
      invoice.status = 'viewed';
      await invoice.save();
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get quote by URL key (public view)
// @route   GET /api/guest/quote/:urlKey
// @access  Public
router.get('/quote/:urlKey', async (req, res, next) => {
  try {
    const quote = await Quote.findOne({
      urlKey: req.params.urlKey,
      status: { $in: ['sent', 'viewed', 'approved', 'rejected'] }
    })
      .populate('client')
      .populate('user', 'profile bankDetails')
      .populate('items.taxRate', 'name percent');

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found or not available'
      });
    }

    // Check password if set
    if (quote.password) {
      const { password } = req.query;
      if (!password || password !== quote.password) {
        return res.status(401).json({
          success: false,
          message: 'Password required',
          requiresPassword: true
        });
      }
    }

    // Mark as viewed if sent
    if (quote.status === 'sent') {
      quote.status = 'viewed';
      await quote.save();
    }

    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Approve quote (client action)
// @route   POST /api/guest/quote/:urlKey/approve
// @access  Public
router.post('/quote/:urlKey/approve', async (req, res, next) => {
  try {
    const quote = await Quote.findOne({
      urlKey: req.params.urlKey,
      status: { $in: ['sent', 'viewed'] }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found or cannot be approved'
      });
    }

    quote.status = 'approved';
    await quote.save();

    res.json({
      success: true,
      message: 'Quote approved successfully',
      data: quote
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Reject quote (client action)
// @route   POST /api/guest/quote/:urlKey/reject
// @access  Public
router.post('/quote/:urlKey/reject', async (req, res, next) => {
  try {
    const quote = await Quote.findOne({
      urlKey: req.params.urlKey,
      status: { $in: ['sent', 'viewed'] }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found or cannot be rejected'
      });
    }

    quote.status = 'rejected';
    await quote.save();

    res.json({
      success: true,
      message: 'Quote rejected',
      data: quote
    });
  } catch (error) {
    next(error);
  }
});

export default router;
