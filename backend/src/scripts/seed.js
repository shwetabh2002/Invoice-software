import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Company from '../models/Company.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import TaxRate from '../models/TaxRate.js';
import InvoiceGroup from '../models/InvoiceGroup.js';
import PaymentMethod from '../models/PaymentMethod.js';

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/girjasoft_invoices');
    console.log('Connected to MongoDB');

    // Check if already seeded
    const existingCompany = await Company.findOne({});
    if (existingCompany) {
      console.log('Database already seeded. Skipping...');
      process.exit(0);
    }

    console.log('Seeding database...');

    // Create default company
    const company = await Company.create({
      name: 'Demo Company',
      slug: 'demo-company',
      email: 'admin@example.com',
      phone: '+91 9876543210',
      address: {
        line1: '123 Business Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zip: '400001',
        country: 'IN'
      },
      taxInfo: {
        gstin: '',
        pan: ''
      },
      settings: {
        currencySymbol: '₹',
        currencyCode: 'INR',
        dateFormat: 'DD-MM-YYYY',
        invoicePrefix: 'INV',
        quotePrefix: 'QUO',
        invoiceDueAfter: 30,
        quoteExpiresAfter: 15,
        invoiceFooter: 'Thank you for your business!'
      },
      subscription: {
        plan: 'free',
        status: 'active',
        maxUsers: 5,
        maxClients: 100,
        maxInvoices: 500
      }
    });
    console.log('✅ Demo company created');

    // Create admin user linked to company
    const admin = await User.create({
      email: 'admin@example.com',
      password: 'admin123',
      company: company._id,
      role: 'owner',
      userType: 1,
      isActive: true,
      profile: {
        name: 'Admin User',
        company: 'Demo Company',
        country: 'IN'
      }
    });
    console.log('✅ Admin user created (email: admin@example.com, password: admin123)');

    // Update company with createdBy
    company.createdBy = admin._id;
    await company.save();

    // Create default settings (system-wide)
    const defaultSettings = [
      { key: 'default_language', value: 'english', category: 'general' },
      { key: 'date_format', value: 'DD-MM-YYYY', category: 'general' },
      { key: 'currency_symbol', value: '₹', category: 'general' },
      { key: 'currency_symbol_placement', value: 'before', category: 'general' },
      { key: 'currency_code', value: 'INR', category: 'general' },
      { key: 'default_country', value: 'IN', category: 'general' },
      { key: 'tax_rate_decimal_places', value: 2, category: 'general' },
      { key: 'default_list_limit', value: 15, category: 'general' },
      { key: 'thousands_separator', value: ',', category: 'general' },
      { key: 'decimal_point', value: '.', category: 'general' },
      { key: 'system_theme', value: 'light', category: 'appearance' },
      { key: 'app_name', value: 'Girjasoft Invoices', category: 'general' },
    ];

    for (const setting of defaultSettings) {
      await Setting.setValue(setting.key, setting.value, setting.category);
    }
    console.log('✅ System settings created');

    // Create default tax rates for the company
    const taxRates = [
      { belongsTo: company._id, name: 'GST 18%', percent: 18, isDefault: true },
      { belongsTo: company._id, name: 'GST 12%', percent: 12 },
      { belongsTo: company._id, name: 'GST 5%', percent: 5 },
      { belongsTo: company._id, name: 'No Tax', percent: 0 }
    ];

    for (const rate of taxRates) {
      await TaxRate.create(rate);
    }
    console.log('✅ Tax rates created');

    // Create default number series for the company
    const numberSeries = [
      { 
        belongsTo: company._id, 
        name: 'Invoice Series', 
        documentType: 'invoice', 
        identifierFormat: 'INV-{{{year}}}-{{{id}}}', 
        nextId: 1, 
        leftPad: 4, 
        isDefault: true 
      },
      { 
        belongsTo: company._id, 
        name: 'Quotation Series', 
        documentType: 'quotation', 
        identifierFormat: 'QUO-{{{year}}}-{{{id}}}', 
        nextId: 1, 
        leftPad: 4,
        isDefault: true
      }
    ];

    for (const series of numberSeries) {
      await InvoiceGroup.create(series);
    }
    console.log('✅ Number series created');

    // Create default payment methods for the company
    const paymentMethods = [
      { belongsTo: company._id, name: 'Cash', isDefault: true },
      { belongsTo: company._id, name: 'Bank Transfer' },
      { belongsTo: company._id, name: 'Credit Card' },
      { belongsTo: company._id, name: 'UPI' },
      { belongsTo: company._id, name: 'Cheque' }
    ];

    for (const method of paymentMethods) {
      await PaymentMethod.create(method);
    }
    console.log('✅ Payment methods created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n═══════════════════════════════════════');
    console.log('  LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('  Email:    admin@example.com');
    console.log('  Password: admin123');
    console.log('  Company:  Demo Company');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
