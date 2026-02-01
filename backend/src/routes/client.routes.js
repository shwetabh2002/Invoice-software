import express from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientInvoices,
  getClientQuotes,
  addClientNote,
  deleteClientNote,
  getClientStats
} from '../controllers/client.controller.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getClients)
  .post(createClient);

router.route('/:id')
  .get(getClient)
  .put(updateClient)
  .delete(adminOnly, deleteClient);

router.get('/:id/invoices', getClientInvoices);
router.get('/:id/quotes', getClientQuotes);
router.get('/:id/stats', getClientStats);

router.route('/:id/notes')
  .post(addClientNote);

router.delete('/:id/notes/:noteId', deleteClientNote);

export default router;
