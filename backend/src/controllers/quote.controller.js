import Quote from '../models/Quote.js';
import Invoice from '../models/Invoice.js';
import InvoiceGroup from '../models/InvoiceGroup.js';
import TaxRate from '../models/TaxRate.js';
import Setting from '../models/Setting.js';

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Private
export const getQuotes = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 15,
      status,
      client,
      search,
      sort = '-dates.created'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (client) query.client = client;
    if (search) {
      query.quoteNumber = { $regex: search, $options: 'i' };
    }

    const total = await Quote.countDocuments(query);
    const quotes = await Quote.find(query)
      .populate('client', 'name surname company contact.email')
      .populate('user', 'profile.name email')
      .populate('invoiceGroup', 'name')
      .populate('invoice', 'invoiceNumber status')
      .sort(sort)
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

// @desc    Get single quote
// @route   GET /api/quotes/:id
// @access  Private
export const getQuote = async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('invoiceGroup')
      .populate('invoice')
      .populate('items.taxRate')
      .populate('items.product')
      .populate('taxRates.taxRate');

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quote
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create quote
// @route   POST /api/quotes
// @access  Private
export const createQuote = async (req, res, next) => {
  try {
    const { client, invoiceGroup, items, ...rest } = req.body;

    // Get default settings
    const expiresAfter = await Setting.getValue('quotes_expire_after', 15);
    const generateNumberForDraft = await Setting.getValue('generate_quote_number_for_draft', true);

    // Calculate expiry date
    const createdDate = rest.dates?.created ? new Date(rest.dates.created) : new Date();
    const expiresDate = new Date(createdDate);
    expiresDate.setDate(expiresDate.getDate() + parseInt(expiresAfter));

    // Get quote group and generate number
    const group = await InvoiceGroup.findById(invoiceGroup);
    if (!group) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice group'
      });
    }

    let quoteNumber = '';
    if (generateNumberForDraft || rest.status !== 'draft') {
      quoteNumber = group.generateNumber();
      await group.incrementNextId();
    }

    // Process items
    const processedItems = await Promise.all((items || []).map(async (item, index) => {
      let taxRatePercent = 0;
      if (item.taxRate) {
        const taxRate = await TaxRate.findById(item.taxRate);
        taxRatePercent = taxRate ? taxRate.percent : 0;
      }
      return {
        ...item,
        taxRatePercent,
        order: item.order ?? index
      };
    }));

    // Create quote
    const quote = new Quote({
      ...rest,
      client,
      invoiceGroup,
      user: req.user._id,
      quoteNumber,
      items: processedItems,
      dates: {
        created: createdDate,
        expires: rest.dates?.expires || expiresDate,
        modified: new Date()
      }
    });

    quote.calculateTotals();
    await quote.save();

    const populatedQuote = await Quote.findById(quote._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email')
      .populate('invoiceGroup', 'name');

    res.status(201).json({
      success: true,
      data: populatedQuote
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quote
// @route   PUT /api/quotes/:id
// @access  Private
export const updateQuote = async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    // Cannot update converted quotes
    if (quote.invoice) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify a quote that has been converted to an invoice'
      });
    }

    const { items, ...rest } = req.body;

    if (items) {
      const processedItems = await Promise.all(items.map(async (item, index) => {
        let taxRatePercent = 0;
        if (item.taxRate) {
          const taxRate = await TaxRate.findById(item.taxRate);
          taxRatePercent = taxRate ? taxRate.percent : 0;
        }
        return {
          ...item,
          taxRatePercent,
          order: item.order ?? index
        };
      }));
      quote.items = processedItems;
    }

    Object.keys(rest).forEach(key => {
      if (key === 'dates') {
        quote.dates = { ...quote.dates, ...rest.dates };
      } else if (key === 'amounts') {
        quote.amounts = { ...quote.amounts, ...rest.amounts };
      } else {
        quote[key] = rest[key];
      }
    });

    quote.calculateTotals();
    await quote.save();

    const updatedQuote = await Quote.findById(quote._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email');

    res.status(200).json({
      success: true,
      data: updatedQuote
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete quote
// @route   DELETE /api/quotes/:id
// @access  Private
export const deleteQuote = async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    if (quote.invoice) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a quote that has been converted to an invoice'
      });
    }

    await quote.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert quote to invoice
// @route   POST /api/quotes/:id/convert
// @access  Private
export const convertToInvoice = async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    if (quote.invoice) {
      return res.status(400).json({
        success: false,
        message: 'Quote has already been converted to an invoice'
      });
    }

    // Get invoice-specific number series (NOT the quote's series)
    let group = null;
    
    // 1. Check if specific group provided in request
    if (req.body.invoiceGroup) {
      group = await InvoiceGroup.findById(req.body.invoiceGroup);
    }
    
    // 2. Find default invoice series
    if (!group) {
      group = await InvoiceGroup.findOne({ 
        documentType: 'invoice', 
        isDefault: true,
        isActive: true 
      });
    }
    
    // 3. Find any invoice series
    if (!group) {
      group = await InvoiceGroup.findOne({ 
        $or: [{ documentType: 'invoice' }, { documentType: 'both' }],
        isActive: true 
      });
    }
    
    // 4. Last resort: any active group
    if (!group) {
      group = await InvoiceGroup.findOne({ isActive: true });
    }
    
    if (!group) {
      return res.status(400).json({
        success: false,
        message: 'No invoice number series available'
      });
    }
    const invoiceNumber = group.generateNumber();
    await group.incrementNextId();

    // Calculate due date
    const dueAfter = await Setting.getValue('invoices_due_after', 30);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(dueAfter));

    // Create invoice from quote
    const invoice = new Invoice({
      client: quote.client,
      user: req.user._id,
      invoiceGroup: group._id,
      invoiceNumber,
      status: 'draft',
      quote: quote._id,
      items: quote.items.map(item => ({
        ...item.toObject(),
        _id: undefined
      })),
      amounts: {
        ...quote.amounts.toObject(),
        paid: 0,
        balance: quote.amounts.total
      },
      taxRates: quote.taxRates.map(tr => ({
        ...tr.toObject(),
        _id: undefined
      })),
      dates: {
        created: new Date(),
        due: dueDate,
        modified: new Date()
      },
      customFields: quote.customFields
    });

    await invoice.save();

    // Update quote with invoice reference
    quote.invoice = invoice._id;
    quote.status = 'approved';
    await quote.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email')
      .populate('invoiceGroup', 'name');

    res.status(201).json({
      success: true,
      data: populatedInvoice,
      quote: quote
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark quote as sent
// @route   POST /api/quotes/:id/send
// @access  Private
export const markAsSent = async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    // Generate quote number if not set
    if (!quote.quoteNumber) {
      const group = await InvoiceGroup.findById(quote.invoiceGroup);
      quote.quoteNumber = group.generateNumber();
      await group.incrementNextId();
    }

    quote.status = 'sent';
    await quote.save();

    res.status(200).json({
      success: true,
      data: quote
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Copy quote
// @route   POST /api/quotes/:id/copy
// @access  Private
export const copyQuote = async (req, res, next) => {
  try {
    const sourceQuote = await Quote.findById(req.params.id);

    if (!sourceQuote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    const group = await InvoiceGroup.findById(sourceQuote.invoiceGroup);
    const generateNumberForDraft = await Setting.getValue('generate_quote_number_for_draft', true);
    
    let quoteNumber = '';
    if (generateNumberForDraft) {
      quoteNumber = group.generateNumber();
      await group.incrementNextId();
    }

    const expiresAfter = await Setting.getValue('quotes_expire_after', 15);
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + parseInt(expiresAfter));

    const newQuote = new Quote({
      client: sourceQuote.client,
      user: req.user._id,
      invoiceGroup: sourceQuote.invoiceGroup,
      quoteNumber,
      status: 'draft',
      items: sourceQuote.items.map(item => ({
        ...item.toObject(),
        _id: undefined
      })),
      amounts: sourceQuote.amounts.toObject(),
      taxRates: sourceQuote.taxRates.map(tr => ({
        ...tr.toObject(),
        _id: undefined
      })),
      notes: sourceQuote.notes,
      dates: {
        created: new Date(),
        expires: expiresDate,
        modified: new Date()
      },
      customFields: sourceQuote.customFields
    });

    await newQuote.save();

    const populatedQuote = await Quote.findById(newQuote._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email');

    res.status(201).json({
      success: true,
      data: populatedQuote
    });
  } catch (error) {
    next(error);
  }
};
