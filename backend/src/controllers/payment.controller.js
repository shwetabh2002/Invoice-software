import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 15,
      invoice,
      paymentMethod,
      startDate,
      endDate,
      sort = '-date'
    } = req.query;

    const query = {};

    if (invoice) query.invoice = invoice;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate({
        path: 'invoice',
        select: 'invoiceNumber client amounts',
        populate: { path: 'client', select: 'name surname company' }
      })
      .populate('paymentMethod', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: payments,
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

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
export const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: 'invoice',
        populate: { path: 'client' }
      })
      .populate('paymentMethod');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment
// @route   POST /api/payments
// @access  Private
export const createPayment = async (req, res, next) => {
  try {
    const { invoice, amount, date, paymentMethod, note } = req.body;

    // Verify invoice exists
    const invoiceDoc = await Invoice.findById(invoice);
    if (!invoiceDoc) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const payment = await Payment.create({
      invoice,
      amount,
      date: date || new Date(),
      paymentMethod,
      note
    });

    // Payment model has post-save hook to update invoice

    const populatedPayment = await Payment.findById(payment._id)
      .populate({
        path: 'invoice',
        select: 'invoiceNumber amounts status',
        populate: { path: 'client', select: 'name surname company' }
      })
      .populate('paymentMethod', 'name');

    res.status(201).json({
      success: true,
      data: populatedPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private
export const updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { amount, date, paymentMethod, note } = req.body;

    if (amount !== undefined) payment.amount = amount;
    if (date !== undefined) payment.date = date;
    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (note !== undefined) payment.note = note;

    await payment.save(); // Triggers post-save hook

    const updatedPayment = await Payment.findById(payment._id)
      .populate({
        path: 'invoice',
        select: 'invoiceNumber amounts status',
        populate: { path: 'client', select: 'name surname company' }
      })
      .populate('paymentMethod', 'name');

    res.status(200).json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private
export const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await Payment.findByIdAndDelete(req.params.id); // Triggers post hook

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payments for an invoice
// @route   GET /api/invoices/:invoiceId/payments
// @access  Private
export const getInvoicePayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ invoice: req.params.invoiceId })
      .populate('paymentMethod', 'name')
      .sort('-date');

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};
