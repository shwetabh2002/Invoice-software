import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
export const getDashboard = async (req, res, next) => {
  try {
    const { period = 'this-month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this-quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'this-year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Invoice stats by status
    const invoiceStats = await Invoice.aggregate([
      {
        $match: {
          'dates.created': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amounts.total' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Quote stats by status
    const quoteStats = await Quote.aggregate([
      {
        $match: {
          'dates.created': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amounts.total' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Overdue invoices
    const overdueInvoices = await Invoice.find({
      status: { $in: ['sent', 'viewed'] },
      'dates.due': { $lt: now }
    })
      .populate('client', 'name surname company')
      .sort('dates.due')
      .limit(10);

    const overdueTotal = await Invoice.aggregate([
      {
        $match: {
          status: { $in: ['sent', 'viewed'] },
          'dates.due': { $lt: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amounts.balance' }
        }
      }
    ]);

    // Recent invoices
    const recentInvoices = await Invoice.find()
      .populate('client', 'name surname company')
      .sort('-dates.created')
      .limit(10);

    // Recent quotes
    const recentQuotes = await Quote.find()
      .populate('client', 'name surname company')
      .sort('-dates.created')
      .limit(10);

    // Recent payments
    const recentPayments = await Payment.find()
      .populate({
        path: 'invoice',
        select: 'invoiceNumber',
        populate: { path: 'client', select: 'name surname company' }
      })
      .populate('paymentMethod', 'name')
      .sort('-date')
      .limit(10);

    // Total counts
    const totalCounts = {
      clients: await Client.countDocuments({ isActive: true }),
      invoices: await Invoice.countDocuments(),
      quotes: await Quote.countDocuments(),
      overdueCount: overdueInvoices.length
    };

    // Format stats
    const formatStats = (stats, type) => {
      const statusMap = type === 'invoice' 
        ? { draft: 'Draft', sent: 'Sent', viewed: 'Viewed', paid: 'Paid' }
        : { draft: 'Draft', sent: 'Sent', viewed: 'Viewed', approved: 'Approved', rejected: 'Rejected' };

      return Object.keys(statusMap).map(status => {
        const stat = stats.find(s => s._id === status);
        return {
          status,
          label: statusMap[status],
          total: stat?.total || 0,
          count: stat?.count || 0
        };
      });
    };

    res.status(200).json({
      success: true,
      data: {
        period,
        invoiceStats: formatStats(invoiceStats, 'invoice'),
        quoteStats: formatStats(quoteStats, 'quote'),
        overdueInvoices,
        overdueTotal: overdueTotal[0]?.total || 0,
        recentInvoices,
        recentQuotes,
        recentPayments,
        totals: totalCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chart data for reports
// @route   GET /api/dashboard/charts
// @access  Private
export const getChartData = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    // Monthly invoice totals
    const monthlyInvoices = await Invoice.aggregate([
      {
        $match: {
          'dates.created': {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$dates.created' },
          total: { $sum: '$amounts.total' },
          paid: { $sum: '$amounts.paid' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Monthly payments
    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing months
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const invoiceData = months.map(month => {
      const data = monthlyInvoices.find(m => m._id === month);
      return {
        month,
        total: data?.total || 0,
        paid: data?.paid || 0,
        count: data?.count || 0
      };
    });

    const paymentData = months.map(month => {
      const data = monthlyPayments.find(m => m._id === month);
      return {
        month,
        total: data?.total || 0,
        count: data?.count || 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        year: parseInt(year),
        invoices: invoiceData,
        payments: paymentData
      }
    });
  } catch (error) {
    next(error);
  }
};
