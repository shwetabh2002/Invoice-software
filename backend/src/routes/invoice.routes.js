import express from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markAsSent,
  copyInvoice,
  createCreditInvoice,
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem
} from '../controllers/invoice.controller.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(deleteInvoice);

router.post('/:id/send', markAsSent);
router.post('/:id/copy', copyInvoice);
router.post('/:id/credit', createCreditInvoice);

// Item routes
router.post('/:id/items', addInvoiceItem);
router.put('/:id/items/:itemId', updateInvoiceItem);
router.delete('/:id/items/:itemId', deleteInvoiceItem);

export default router;
