import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
export const getClients = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 15,
      search,
      active,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    // Filter by active status
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { surname: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create client
// @route   POST /api/clients
// @access  Private
export const createClient = async (req, res, next) => {
  try {
    const clientData = {
      ...req.body,
      createdBy: req.user._id
    };

    const client = await Client.create(clientData);

    res.status(201).json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
export const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private (Admin)
export const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check for linked invoices/quotes
    const invoiceCount = await Invoice.countDocuments({ client: req.params.id });
    const quoteCount = await Quote.countDocuments({ client: req.params.id });

    if (invoiceCount > 0 || quoteCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete client. Has ${invoiceCount} invoices and ${quoteCount} quotes.`
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get client invoices
// @route   GET /api/clients/:id/invoices
// @access  Private
export const getClientInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 15 } = req.query;

    const total = await Invoice.countDocuments({ client: req.params.id });
    const invoices = await Invoice.find({ client: req.params.id })
      .populate('user', 'profile.name email')
      .populate('invoiceGroup', 'name')
      .sort('-dates.created')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get client quotes
// @route   GET /api/clients/:id/quotes
// @access  Private
export const getClientQuotes = async (req, res, next) => {
  try {
    const { page = 1, limit = 15 } = req.query;

    const total = await Quote.countDocuments({ client: req.params.id });
    const quotes = await Quote.find({ client: req.params.id })
      .populate('user', 'profile.name email')
      .populate('invoiceGroup', 'name')
      .sort('-dates.created')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: quotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to client
// @route   POST /api/clients/:id/notes
// @access  Private
export const addClientNote = async (req, res, next) => {
  try {
    const { content } = req.body;

    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.notes.push({
      date: new Date(),
      content
    });

    await client.save();

    res.status(201).json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete client note
// @route   DELETE /api/clients/:id/notes/:noteId
// @access  Private
export const deleteClientNote = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.notes = client.notes.filter(
      note => note._id.toString() !== req.params.noteId
    );

    await client.save();

    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get client stats
// @route   GET /api/clients/:id/stats
// @access  Private
export const getClientStats = async (req, res, next) => {
  try {
    const clientId = req.params.id;

    // Get invoice totals
    const invoiceStats = await Invoice.aggregate([
      { $match: { client: clientId } },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$amounts.total' },
          totalPaid: { $sum: '$amounts.paid' },
          totalBalance: { $sum: '$amounts.balance' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get quote totals
    const quoteStats = await Quote.aggregate([
      { $match: { client: clientId } },
      {
        $group: {
          _id: null,
          totalQuoted: { $sum: '$amounts.total' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        invoices: invoiceStats[0] || { totalInvoiced: 0, totalPaid: 0, totalBalance: 0, count: 0 },
        quotes: quoteStats[0] || { totalQuoted: 0, count: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
};
