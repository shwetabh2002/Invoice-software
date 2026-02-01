import Invoice from '../models/Invoice.js';
import InvoiceGroup from '../models/InvoiceGroup.js';
import TaxRate from '../models/TaxRate.js';
import Setting from '../models/Setting.js';

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 15,
      status,
      client,
      search,
      overdue,
      sort = '-dates.created'
    } = req.query;

    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by client
    if (client) {
      query.client = client;
    }

    // Filter overdue
    if (overdue === 'true') {
      query.status = { $in: ['sent', 'viewed'] };
      query['dates.due'] = { $lt: new Date() };
    }

    // Search by invoice number
    if (search) {
      query.invoiceNumber = { $regex: search, $options: 'i' };
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('client', 'name surname company contact.email')
      .populate('user', 'profile.name email')
      .populate('invoiceGroup', 'name')
      .sort(sort)
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

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('user', '-password')
      .populate('invoiceGroup')
      .populate('paymentMethod')
      .populate('items.taxRate')
      .populate('items.product')
      .populate('taxRates.taxRate');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoice = async (req, res, next) => {
  try {
    const { client, invoiceGroup, items, ...rest } = req.body;

    // Get default settings
    const dueAfter = await Setting.getValue('invoices_due_after', 30);
    const generateNumberForDraft = await Setting.getValue('generate_invoice_number_for_draft', true);
    const defaultTaxRate = await Setting.getValue('default_invoice_tax_rate');

    // Calculate due date
    const createdDate = rest.dates?.created ? new Date(rest.dates.created) : new Date();
    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + parseInt(dueAfter));

    // Get invoice group and generate number
    const group = await InvoiceGroup.findById(invoiceGroup);
    if (!group) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice group'
      });
    }

    let invoiceNumber = '';
    if (generateNumberForDraft || rest.status !== 'draft') {
      invoiceNumber = group.generateNumber();
      await group.incrementNextId();
    }

    // Process items with tax rates
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

    // Create invoice
    const invoice = new Invoice({
      ...rest,
      client,
      invoiceGroup,
      user: req.user._id,
      invoiceNumber,
      items: processedItems,
      dates: {
        created: createdDate,
        due: rest.dates?.due || dueDate,
        modified: new Date()
      }
    });

    // Calculate totals
    invoice.calculateTotals();

    // Add default tax rate if configured
    if (defaultTaxRate && invoice.taxRates.length === 0) {
      invoice.taxRates.push({
        taxRate: defaultTaxRate,
        includeItemTax: false,
        amount: 0
      });
    }

    await invoice.save();

    // Populate and return
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email')
      .populate('invoiceGroup', 'name');

    res.status(201).json({
      success: true,
      data: populatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if read-only
    if (invoice.isReadOnly) {
      return res.status(403).json({
        success: false,
        message: 'Invoice is read-only and cannot be modified'
      });
    }

    const { items, ...rest } = req.body;

    // Process items with tax rates
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
      invoice.items = processedItems;
    }

    // Update other fields
    Object.keys(rest).forEach(key => {
      if (key === 'dates') {
        invoice.dates = { ...invoice.dates, ...rest.dates };
      } else if (key === 'amounts') {
        invoice.amounts = { ...invoice.amounts, ...rest.amounts };
      } else {
        invoice[key] = rest[key];
      }
    });

    // Recalculate totals
    invoice.calculateTotals();

    await invoice.save();

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email');

    res.status(200).json({
      success: true,
      data: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (with config check)
export const deleteInvoice = async (req, res, next) => {
  try {
    const enableDeletion = await Setting.getValue('enable_invoice_deletion', false);
    
    if (!enableDeletion) {
      return res.status(403).json({
        success: false,
        message: 'Invoice deletion is disabled'
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark invoice as sent
// @route   POST /api/invoices/:id/send
// @access  Private
export const markAsSent = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Generate invoice number if not set
    if (!invoice.invoiceNumber) {
      const group = await InvoiceGroup.findById(invoice.invoiceGroup);
      invoice.invoiceNumber = group.generateNumber();
      await group.incrementNextId();
    }

    invoice.status = 'sent';

    // Check read-only setting
    const readOnlyToggle = await Setting.getValue('read_only_toggle', 4);
    if (readOnlyToggle === 2) { // 2 = on send
      invoice.isReadOnly = true;
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Copy invoice
// @route   POST /api/invoices/:id/copy
// @access  Private
export const copyInvoice = async (req, res, next) => {
  try {
    const sourceInvoice = await Invoice.findById(req.params.id);

    if (!sourceInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get invoice group
    const group = await InvoiceGroup.findById(sourceInvoice.invoiceGroup);
    const generateNumberForDraft = await Setting.getValue('generate_invoice_number_for_draft', true);
    
    let invoiceNumber = '';
    if (generateNumberForDraft) {
      invoiceNumber = group.generateNumber();
      await group.incrementNextId();
    }

    // Calculate new due date
    const dueAfter = await Setting.getValue('invoices_due_after', 30);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(dueAfter));

    // Create copy
    const newInvoice = new Invoice({
      client: sourceInvoice.client,
      user: req.user._id,
      invoiceGroup: sourceInvoice.invoiceGroup,
      invoiceNumber,
      status: 'draft',
      isReadOnly: false,
      items: sourceInvoice.items.map(item => ({
        ...item.toObject(),
        _id: undefined
      })),
      amounts: {
        ...sourceInvoice.amounts.toObject(),
        paid: 0,
        balance: sourceInvoice.amounts.total
      },
      taxRates: sourceInvoice.taxRates.map(tr => ({
        ...tr.toObject(),
        _id: undefined
      })),
      terms: sourceInvoice.terms,
      paymentMethod: sourceInvoice.paymentMethod,
      dates: {
        created: new Date(),
        due: dueDate,
        modified: new Date()
      },
      customFields: sourceInvoice.customFields
    });

    await newInvoice.save();

    const populatedInvoice = await Invoice.findById(newInvoice._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email');

    res.status(201).json({
      success: true,
      data: populatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create credit invoice
// @route   POST /api/invoices/:id/credit
// @access  Private
export const createCreditInvoice = async (req, res, next) => {
  try {
    const sourceInvoice = await Invoice.findById(req.params.id);

    if (!sourceInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get invoice group
    const group = await InvoiceGroup.findById(sourceInvoice.invoiceGroup);
    const invoiceNumber = group.generateNumber();
    await group.incrementNextId();

    // Create credit invoice with negative quantities
    const creditInvoice = new Invoice({
      client: sourceInvoice.client,
      user: req.user._id,
      invoiceGroup: sourceInvoice.invoiceGroup,
      invoiceNumber,
      status: 'draft',
      sign: -1,
      creditInvoiceParent: sourceInvoice._id,
      items: sourceInvoice.items.map(item => ({
        ...item.toObject(),
        _id: undefined,
        quantity: -Math.abs(item.quantity) // Negative quantity
      })),
      taxRates: sourceInvoice.taxRates.map(tr => ({
        ...tr.toObject(),
        _id: undefined,
        amount: -Math.abs(tr.amount)
      })),
      terms: sourceInvoice.terms,
      dates: {
        created: new Date(),
        due: new Date(),
        modified: new Date()
      }
    });

    creditInvoice.calculateTotals();
    await creditInvoice.save();

    const populatedInvoice = await Invoice.findById(creditInvoice._id)
      .populate('client', 'name surname company')
      .populate('user', 'profile.name email');

    res.status(201).json({
      success: true,
      data: populatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to invoice
// @route   POST /api/invoices/:id/items
// @access  Private
export const addInvoiceItem = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.isReadOnly) {
      return res.status(403).json({
        success: false,
        message: 'Invoice is read-only'
      });
    }

    const item = req.body;
    
    // Get tax rate percent
    if (item.taxRate) {
      const taxRate = await TaxRate.findById(item.taxRate);
      item.taxRatePercent = taxRate ? taxRate.percent : 0;
    }

    item.order = invoice.items.length;
    invoice.items.push(item);
    invoice.calculateTotals();

    await invoice.save();

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice item
// @route   PUT /api/invoices/:id/items/:itemId
// @access  Private
export const updateInvoiceItem = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.isReadOnly) {
      return res.status(403).json({
        success: false,
        message: 'Invoice is read-only'
      });
    }

    const itemIndex = invoice.items.findIndex(
      item => item._id.toString() === req.params.itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const itemUpdate = req.body;
    
    // Get tax rate percent
    if (itemUpdate.taxRate) {
      const taxRate = await TaxRate.findById(itemUpdate.taxRate);
      itemUpdate.taxRatePercent = taxRate ? taxRate.percent : 0;
    }

    invoice.items[itemIndex] = { ...invoice.items[itemIndex].toObject(), ...itemUpdate };
    invoice.calculateTotals();

    await invoice.save();

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice item
// @route   DELETE /api/invoices/:id/items/:itemId
// @access  Private
export const deleteInvoiceItem = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.isReadOnly) {
      return res.status(403).json({
        success: false,
        message: 'Invoice is read-only'
      });
    }

    invoice.items = invoice.items.filter(
      item => item._id.toString() !== req.params.itemId
    );

    invoice.calculateTotals();
    await invoice.save();

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};
