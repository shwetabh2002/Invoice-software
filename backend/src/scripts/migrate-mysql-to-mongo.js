/**
 * MySQL to MongoDB Migration Script for InvoicePlane
 * 
 * This script migrates data from the original PHP/MySQL InvoicePlane
 * to the new Next.js/Express.js/MongoDB version.
 * 
 * Prerequisites:
 * - npm install mysql2
 * - Configure MySQL connection below
 * - Make sure MongoDB is running
 * 
 * Usage:
 * node migrate-mysql-to-mongo.js
 */

import mongoose from 'mongoose';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import User from '../models/User.js';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import TaxRate from '../models/TaxRate.js';
import InvoiceGroup from '../models/InvoiceGroup.js';
import PaymentMethod from '../models/PaymentMethod.js';
import Setting from '../models/Setting.js';
import Family from '../models/Family.js';
import Unit from '../models/Unit.js';

// MySQL Configuration - UPDATE THESE VALUES
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'invoiceplane'
};

// ID mapping for references
const idMap = {
  users: new Map(),
  clients: new Map(),
  invoices: new Map(),
  quotes: new Map(),
  taxRates: new Map(),
  invoiceGroups: new Map(),
  paymentMethods: new Map(),
  products: new Map(),
  families: new Map(),
  units: new Map()
};

let mysqlConnection;

async function connectMySQL() {
  console.log('Connecting to MySQL...');
  mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
  console.log('✅ MySQL connected');
}

async function connectMongoDB() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoiceplane');
  console.log('✅ MongoDB connected');
}

async function clearMongoDB() {
  console.log('Clearing existing MongoDB data...');
  await User.deleteMany({});
  await Client.deleteMany({});
  await Invoice.deleteMany({});
  await Quote.deleteMany({});
  await Payment.deleteMany({});
  await Product.deleteMany({});
  await TaxRate.deleteMany({});
  await InvoiceGroup.deleteMany({});
  await PaymentMethod.deleteMany({});
  await Setting.deleteMany({});
  await Family.deleteMany({});
  await Unit.deleteMany({});
  console.log('✅ MongoDB cleared');
}

async function migrateSettings() {
  console.log('Migrating settings...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_settings');
  
  for (const row of rows) {
    await Setting.setValue(row.setting_key, row.setting_value, 'general');
  }
  
  console.log(`✅ Migrated ${rows.length} settings`);
}

async function migrateUsers() {
  console.log('Migrating users...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_users');
  
  for (const row of rows) {
    const user = await User.create({
      email: row.user_email,
      password: row.user_password, // Already hashed, but we'll update
      userType: row.user_type,
      isActive: row.user_active === 1,
      profile: {
        name: row.user_name || '',
        company: row.user_company || '',
        address1: row.user_address_1 || '',
        address2: row.user_address_2 || '',
        city: row.user_city || '',
        state: row.user_state || '',
        zip: row.user_zip || '',
        country: row.user_country || 'IN',
        phone: row.user_phone || '',
        mobile: row.user_mobile || '',
        fax: row.user_fax || '',
        web: row.user_web || '',
        vatId: row.user_vat_id || '',
        taxCode: row.user_tax_code || ''
      },
      bankDetails: {
        bank: row.user_bank || '',
        iban: row.user_iban || '',
        bic: row.user_bic_swift || ''
      }
    });
    
    // Re-hash password with bcrypt (original may be different hash)
    user.password = await bcrypt.hash('changeme123', 10);
    await user.save();
    
    idMap.users.set(row.user_id, user._id);
  }
  
  console.log(`✅ Migrated ${rows.length} users (passwords reset to 'changeme123')`);
}

async function migrateTaxRates() {
  console.log('Migrating tax rates...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_tax_rates');
  
  for (const row of rows) {
    const taxRate = await TaxRate.create({
      name: row.tax_rate_name,
      percent: parseFloat(row.tax_rate_percent) || 0,
      isDefault: row.tax_rate_default === 1,
      isActive: true
    });
    
    idMap.taxRates.set(row.tax_rate_id, taxRate._id);
  }
  
  console.log(`✅ Migrated ${rows.length} tax rates`);
}

async function migrateInvoiceGroups() {
  console.log('Migrating invoice groups...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_invoice_groups');
  
  for (const row of rows) {
    const group = await InvoiceGroup.create({
      name: row.invoice_group_name,
      identifierFormat: row.invoice_group_identifier_format || '{{{id}}}',
      nextId: parseInt(row.invoice_group_next_id) || 1,
      leftPad: parseInt(row.invoice_group_left_pad) || 0,
      isDefault: row.invoice_group_default === 1,
      isActive: true
    });
    
    idMap.invoiceGroups.set(row.invoice_group_id, group._id);
  }
  
  console.log(`✅ Migrated ${rows.length} invoice groups`);
}

async function migratePaymentMethods() {
  console.log('Migrating payment methods...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_payment_methods');
  
  for (const row of rows) {
    const method = await PaymentMethod.create({
      name: row.payment_method_name,
      isDefault: row.payment_method_default === 1,
      isActive: true
    });
    
    idMap.paymentMethods.set(row.payment_method_id, method._id);
  }
  
  console.log(`✅ Migrated ${rows.length} payment methods`);
}

async function migrateFamilies() {
  console.log('Migrating product families...');
  try {
    const [rows] = await mysqlConnection.execute('SELECT * FROM ip_families');
    
    for (const row of rows) {
      const family = await Family.create({
        name: row.family_name,
        isActive: true
      });
      
      idMap.families.set(row.family_id, family._id);
    }
    
    console.log(`✅ Migrated ${rows.length} families`);
  } catch (error) {
    console.log('⚠️ No families table found, skipping');
  }
}

async function migrateUnits() {
  console.log('Migrating units...');
  try {
    const [rows] = await mysqlConnection.execute('SELECT * FROM ip_units');
    
    for (const row of rows) {
      const unit = await Unit.create({
        name: row.unit_name,
        namePlural: row.unit_name_plrl || row.unit_name,
        isActive: true
      });
      
      idMap.units.set(row.unit_id, unit._id);
    }
    
    console.log(`✅ Migrated ${rows.length} units`);
  } catch (error) {
    console.log('⚠️ No units table found, skipping');
  }
}

async function migrateClients() {
  console.log('Migrating clients...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_clients');
  
  for (const row of rows) {
    const client = await Client.create({
      name: row.client_name || '',
      surname: row.client_surname || '',
      title: '', // Map from original if exists
      company: row.client_company || '',
      address: {
        line1: row.client_address_1 || '',
        line2: row.client_address_2 || '',
        city: row.client_city || '',
        state: row.client_state || '',
        zip: row.client_zip || '',
        country: row.client_country || 'IN'
      },
      contact: {
        email: row.client_email || '',
        phone: row.client_phone || '',
        mobile: row.client_mobile || '',
        fax: row.client_fax || '',
        web: row.client_web || ''
      },
      tax: {
        vatId: row.client_vat_id || '',
        taxCode: row.client_tax_code || ''
      },
      language: row.client_language || 'system',
      isActive: row.client_active === 1,
      createdBy: idMap.users.values().next().value // First user
    });
    
    idMap.clients.set(row.client_id, client._id);
  }
  
  console.log(`✅ Migrated ${rows.length} clients`);
}

async function migrateProducts() {
  console.log('Migrating products...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_products');
  
  for (const row of rows) {
    const product = await Product.create({
      name: row.product_name || '',
      description: row.product_description || '',
      sku: row.product_sku || '',
      price: parseFloat(row.product_price) || 0,
      purchasePrice: parseFloat(row.product_purchase_price) || 0,
      family: idMap.families.get(row.family_id) || null,
      taxRate: idMap.taxRates.get(row.tax_rate_id) || null,
      unit: idMap.units.get(row.unit_id) || null,
      isActive: true
    });
    
    idMap.products.set(row.product_id, product._id);
  }
  
  console.log(`✅ Migrated ${rows.length} products`);
}

async function migrateInvoices() {
  console.log('Migrating invoices...');
  const [rows] = await mysqlConnection.execute(`
    SELECT i.*, ia.* 
    FROM ip_invoices i 
    LEFT JOIN ip_invoice_amounts ia ON i.invoice_id = ia.invoice_id
  `);
  
  for (const row of rows) {
    // Map status
    const statusMap = {
      1: 'draft',
      2: 'sent',
      3: 'viewed',
      4: 'paid'
    };
    
    const invoice = await Invoice.create({
      invoiceNumber: row.invoice_number || '',
      urlKey: row.invoice_url_key || undefined,
      client: idMap.clients.get(row.client_id),
      user: idMap.users.get(row.user_id) || idMap.users.values().next().value,
      invoiceGroup: idMap.invoiceGroups.get(row.invoice_group_id) || idMap.invoiceGroups.values().next().value,
      status: statusMap[row.invoice_status_id] || 'draft',
      isReadOnly: row.is_read_only === 1,
      password: row.invoice_password || '',
      dates: {
        created: row.invoice_date_created ? new Date(row.invoice_date_created) : new Date(),
        due: row.invoice_date_due ? new Date(row.invoice_date_due) : new Date(),
        modified: row.invoice_date_modified ? new Date(row.invoice_date_modified) : new Date()
      },
      items: [],
      amounts: {
        subtotal: parseFloat(row.invoice_item_subtotal) || 0,
        itemTaxTotal: parseFloat(row.invoice_item_tax_total) || 0,
        taxTotal: parseFloat(row.invoice_tax_total) || 0,
        discountAmount: parseFloat(row.invoice_discount_amount) || 0,
        discountPercent: parseFloat(row.invoice_discount_percent) || 0,
        total: parseFloat(row.invoice_total) || 0,
        paid: parseFloat(row.invoice_paid) || 0,
        balance: parseFloat(row.invoice_balance) || 0
      },
      terms: row.invoice_terms || '',
      paymentMethod: idMap.paymentMethods.get(row.payment_method) || null,
      sign: row.invoice_sign || 1
    });
    
    idMap.invoices.set(row.invoice_id, invoice._id);
  }
  
  // Migrate invoice items
  console.log('Migrating invoice items...');
  const [items] = await mysqlConnection.execute('SELECT * FROM ip_invoice_items ORDER BY item_order');
  
  for (const item of items) {
    const invoiceId = idMap.invoices.get(item.invoice_id);
    if (invoiceId) {
      await Invoice.findByIdAndUpdate(invoiceId, {
        $push: {
          items: {
            name: item.item_name || '',
            description: item.item_description || '',
            quantity: parseFloat(item.item_quantity) || 1,
            price: parseFloat(item.item_price) || 0,
            discountAmount: parseFloat(item.item_discount_amount) || 0,
            taxRate: idMap.taxRates.get(item.item_tax_rate_id) || null,
            taxRatePercent: parseFloat(item.item_tax_rate_percent) || 0,
            product: idMap.products.get(item.item_product_id) || null,
            order: parseInt(item.item_order) || 0,
            amounts: {
              subtotal: parseFloat(item.item_subtotal) || 0,
              tax: parseFloat(item.item_tax_total) || 0,
              discount: parseFloat(item.item_discount) || 0,
              total: parseFloat(item.item_total) || 0
            }
          }
        }
      });
    }
  }
  
  console.log(`✅ Migrated ${rows.length} invoices with ${items.length} items`);
}

async function migrateQuotes() {
  console.log('Migrating quotes...');
  const [rows] = await mysqlConnection.execute(`
    SELECT q.*, qa.* 
    FROM ip_quotes q 
    LEFT JOIN ip_quote_amounts qa ON q.quote_id = qa.quote_id
  `);
  
  for (const row of rows) {
    const statusMap = {
      1: 'draft',
      2: 'sent',
      3: 'viewed',
      4: 'approved',
      5: 'rejected',
      6: 'cancelled'
    };
    
    const quote = await Quote.create({
      quoteNumber: row.quote_number || '',
      urlKey: row.quote_url_key || undefined,
      client: idMap.clients.get(row.client_id),
      user: idMap.users.get(row.user_id) || idMap.users.values().next().value,
      invoiceGroup: idMap.invoiceGroups.get(row.invoice_group_id) || idMap.invoiceGroups.values().next().value,
      invoice: idMap.invoices.get(row.invoice_id) || null,
      status: statusMap[row.quote_status_id] || 'draft',
      password: row.quote_password || '',
      dates: {
        created: row.quote_date_created ? new Date(row.quote_date_created) : new Date(),
        expires: row.quote_date_expires ? new Date(row.quote_date_expires) : new Date(),
        modified: row.quote_date_modified ? new Date(row.quote_date_modified) : new Date()
      },
      items: [],
      amounts: {
        subtotal: parseFloat(row.quote_item_subtotal) || 0,
        itemTaxTotal: parseFloat(row.quote_item_tax_total) || 0,
        taxTotal: parseFloat(row.quote_tax_total) || 0,
        discountAmount: parseFloat(row.quote_discount_amount) || 0,
        discountPercent: parseFloat(row.quote_discount_percent) || 0,
        total: parseFloat(row.quote_total) || 0
      },
      notes: row.quote_notes || ''
    });
    
    idMap.quotes.set(row.quote_id, quote._id);
  }
  
  // Migrate quote items
  console.log('Migrating quote items...');
  const [items] = await mysqlConnection.execute('SELECT * FROM ip_quote_items ORDER BY item_order');
  
  for (const item of items) {
    const quoteId = idMap.quotes.get(item.quote_id);
    if (quoteId) {
      await Quote.findByIdAndUpdate(quoteId, {
        $push: {
          items: {
            name: item.item_name || '',
            description: item.item_description || '',
            quantity: parseFloat(item.item_quantity) || 1,
            price: parseFloat(item.item_price) || 0,
            discountAmount: parseFloat(item.item_discount_amount) || 0,
            taxRate: idMap.taxRates.get(item.item_tax_rate_id) || null,
            taxRatePercent: parseFloat(item.item_tax_rate_percent) || 0,
            product: idMap.products.get(item.item_product_id) || null,
            order: parseInt(item.item_order) || 0,
            amounts: {
              subtotal: parseFloat(item.item_subtotal) || 0,
              tax: parseFloat(item.item_tax_total) || 0,
              discount: parseFloat(item.item_discount) || 0,
              total: parseFloat(item.item_total) || 0
            }
          }
        }
      });
    }
  }
  
  console.log(`✅ Migrated ${rows.length} quotes with ${items.length} items`);
}

async function migratePayments() {
  console.log('Migrating payments...');
  const [rows] = await mysqlConnection.execute('SELECT * FROM ip_payments');
  
  for (const row of rows) {
    const invoiceId = idMap.invoices.get(row.invoice_id);
    if (invoiceId) {
      await Payment.create({
        invoice: invoiceId,
        paymentMethod: idMap.paymentMethods.get(row.payment_method_id) || null,
        amount: parseFloat(row.payment_amount) || 0,
        date: row.payment_date ? new Date(row.payment_date) : new Date(),
        note: row.payment_note || ''
      });
    }
  }
  
  console.log(`✅ Migrated ${rows.length} payments`);
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('InvoicePlane MySQL to MongoDB Migration');
  console.log('='.repeat(60));
  console.log('');

  try {
    await connectMySQL();
    await connectMongoDB();
    
    console.log('');
    console.log('Starting migration...');
    console.log('-'.repeat(40));
    
    await clearMongoDB();
    await migrateSettings();
    await migrateUsers();
    await migrateTaxRates();
    await migrateInvoiceGroups();
    await migratePaymentMethods();
    await migrateFamilies();
    await migrateUnits();
    await migrateClients();
    await migrateProducts();
    await migrateInvoices();
    await migrateQuotes();
    await migratePayments();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  Users: ${idMap.users.size}`);
    console.log(`  Clients: ${idMap.clients.size}`);
    console.log(`  Invoices: ${idMap.invoices.size}`);
    console.log(`  Quotes: ${idMap.quotes.size}`);
    console.log(`  Products: ${idMap.products.size}`);
    console.log(`  Tax Rates: ${idMap.taxRates.size}`);
    console.log('');
    console.log('⚠️  Note: All user passwords have been reset to "changeme123"');
    console.log('    Please ask users to change their passwords after migration.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
    await mongoose.connection.close();
  }
}

// Run migration
runMigration().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
