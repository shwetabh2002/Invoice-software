import express from 'express';
import path from 'path';
import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';
import { protect } from '../middleware/auth.js';
import pdfService from '../services/pdf.service.js';
import emailService from '../services/email.service.js';

const router = express.Router();

// Generate Invoice PDF
router.get('/invoice/:id', protect, async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('items.taxRate');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const result = await pdfService.generateInvoicePDF(invoice, req.user);
    
    res.json({
      success: true,
      data: {
        url: result.url,
        filename: result.filename
      }
    });
  } catch (error) {
    next(error);
  }
});

// Download Invoice PDF
router.get('/invoice/:id/download', protect, async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('items.taxRate');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const result = await pdfService.generateInvoicePDF(invoice, req.user);
    
    res.download(result.filepath, result.filename);
  } catch (error) {
    next(error);
  }
});

// Generate Quote PDF
router.get('/quote/:id', protect, async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('items.taxRate');

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    const result = await pdfService.generateQuotePDF(quote, req.user);
    
    res.json({
      success: true,
      data: {
        url: result.url,
        filename: result.filename
      }
    });
  } catch (error) {
    next(error);
  }
});

// Download Quote PDF
router.get('/quote/:id/download', protect, async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('items.taxRate');

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    const result = await pdfService.generateQuotePDF(quote, req.user);
    
    res.download(result.filepath, result.filename);
  } catch (error) {
    next(error);
  }
});

// Send Invoice Email
router.post('/invoice/:id/email', protect, async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('items.taxRate');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Generate PDF first
    const pdfResult = await pdfService.generateInvoicePDF(invoice, req.user);
    
    // Send email with PDF attachment
    const emailResult = await emailService.sendInvoiceEmail(invoice, req.user, {
      attachPDF: true,
      pdfPath: pdfResult.filepath
    });

    if (emailResult.success) {
      // Update invoice status to sent
      if (invoice.status === 'draft') {
        invoice.status = 'sent';
        await invoice.save();
      }
    }
    
    res.json({
      success: emailResult.success,
      message: emailResult.success ? 'Invoice sent successfully' : emailResult.message,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// Send Quote Email
router.post('/quote/:id/email', protect, async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('items.taxRate');

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    // Generate PDF first
    const pdfResult = await pdfService.generateQuotePDF(quote, req.user);
    
    // Send email with PDF attachment
    const emailResult = await emailService.sendQuoteEmail(quote, req.user, {
      attachPDF: true,
      pdfPath: pdfResult.filepath
    });

    if (emailResult.success) {
      // Update quote status to sent
      if (quote.status === 'draft') {
        quote.status = 'sent';
        await quote.save();
      }
    }
    
    res.json({
      success: emailResult.success,
      message: emailResult.success ? 'Quote sent successfully' : emailResult.message,
      data: quote
    });
  } catch (error) {
    next(error);
  }
});

export default router;
