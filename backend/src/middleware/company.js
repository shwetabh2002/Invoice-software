import Company from '../models/Company.js';

// Middleware to attach company info to request
export const attachCompany = async (req, res, next) => {
  try {
    // Company ID comes from authenticated user's company field
    if (req.user && req.user.company) {
      const company = await Company.findById(req.user.company);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      if (!company.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Company account is inactive'
        });
      }

      // Check subscription status
      if (company.subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Company subscription is not active'
        });
      }

      // Attach company to request for use in controllers
      req.company = company;
      req.companyId = company._id;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Helper function to create filter with company scope
export const companyFilter = (req, additionalFilters = {}) => {
  return {
    belongsTo: req.companyId,
    ...additionalFilters
  };
};

// Middleware to check company limits (for creating resources)
export const checkCompanyLimits = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.company) {
        return next();
      }

      const company = req.company;
      const limits = company.subscription;

      // Count current resources
      let count = 0;
      let limit = 0;

      switch (resourceType) {
        case 'client':
          const Client = (await import('../models/Client.js')).default;
          count = await Client.countDocuments({ belongsTo: company._id });
          limit = limits.maxClients;
          break;
        case 'invoice':
          const Invoice = (await import('../models/Invoice.js')).default;
          count = await Invoice.countDocuments({ belongsTo: company._id });
          limit = limits.maxInvoices;
          break;
        case 'user':
          const User = (await import('../models/User.js')).default;
          count = await User.countDocuments({ company: company._id });
          limit = limits.maxUsers;
          break;
        default:
          return next();
      }

      // Check if limit exceeded (0 means unlimited)
      if (limit > 0 && count >= limit) {
        return res.status(403).json({
          success: false,
          message: `You have reached the maximum limit of ${limit} ${resourceType}s for your subscription plan. Please upgrade to add more.`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
