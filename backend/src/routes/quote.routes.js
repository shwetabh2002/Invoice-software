import express from 'express';
import {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  convertToInvoice,
  markAsSent,
  copyQuote
} from '../controllers/quote.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getQuotes)
  .post(createQuote);

router.route('/:id')
  .get(getQuote)
  .put(updateQuote)
  .delete(deleteQuote);

router.post('/:id/convert', convertToInvoice);
router.post('/:id/send', markAsSent);
router.post('/:id/copy', copyQuote);

export default router;
