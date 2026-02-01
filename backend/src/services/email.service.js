import nodemailer from 'nodemailer';
import Setting from '../models/Setting.js';
import EmailTemplate from '../models/EmailTemplate.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
      });
      this.initialized = true;
    } else {
      console.warn('Email service not configured. Set SMTP_* environment variables.');
    }
  }

  async sendEmail({ to, subject, html, text, attachments = [] }) {
    await this.init();

    if (!this.transporter) {
      console.warn('Email not sent - SMTP not configured');
      return { success: false, message: 'SMTP not configured' };
    }

    const fromName = process.env.SMTP_FROM_NAME || 'Girjasoft Invoices';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
        attachments
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, message: error.message };
    }
  }

  async sendInvoiceEmail(invoice, user, options = {}) {
    const { attachPDF = true, pdfPath = null } = options;
    const clientEmail = invoice.client?.contact?.email;

    if (!clientEmail) {
      return { success: false, message: 'Client email not found' };
    }

    const settings = await Setting.getAllAsObject();
    const currencySymbol = settings.currency_symbol || '₹';

    // Replace placeholders
    const replacements = {
      '{invoice_number}': invoice.invoiceNumber || 'DRAFT',
      '{invoice_date}': this.formatDate(invoice.dates?.created),
      '{invoice_due_date}': this.formatDate(invoice.dates?.due),
      '{invoice_total}': `${currencySymbol}${this.formatNumber(invoice.amounts?.total || 0)}`,
      '{invoice_balance}': `${currencySymbol}${this.formatNumber(invoice.amounts?.balance || 0)}`,
      '{invoice_url}': `${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest/invoice/${invoice.urlKey}`,
      '{client_name}': `${invoice.client?.name || ''} ${invoice.client?.surname || ''}`.trim(),
      '{client_company}': invoice.client?.company || '',
      '{client_email}': clientEmail,
      '{user_name}': user?.profile?.name || '',
      '{user_company}': user?.profile?.company || '',
      '{user_email}': user?.email || ''
    };

    let subject = `Invoice ${invoice.invoiceNumber || ''} from ${user?.profile?.company || settings.app_name || 'Girjasoft Invoices'}`;
    let html = this.getDefaultInvoiceEmailTemplate();

    // Try to get custom template
    const template = await EmailTemplate.findOne({ type: 'invoice', isDefault: true, isActive: true });
    if (template) {
      subject = template.subject;
      html = template.body;
    }

    // Replace placeholders
    Object.entries(replacements).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key, 'g'), value);
      html = html.replace(new RegExp(key, 'g'), value);
    });

    const attachments = [];
    if (attachPDF && pdfPath) {
      attachments.push({
        filename: `Invoice-${invoice.invoiceNumber || invoice._id}.pdf`,
        path: pdfPath
      });
    }

    return this.sendEmail({
      to: clientEmail,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''),
      attachments
    });
  }

  async sendQuoteEmail(quote, user, options = {}) {
    const { attachPDF = true, pdfPath = null } = options;
    const clientEmail = quote.client?.contact?.email;

    if (!clientEmail) {
      return { success: false, message: 'Client email not found' };
    }

    const settings = await Setting.getAllAsObject();
    const currencySymbol = settings.currency_symbol || '₹';

    const replacements = {
      '{quote_number}': quote.quoteNumber || 'DRAFT',
      '{quote_date}': this.formatDate(quote.dates?.created),
      '{quote_expires}': this.formatDate(quote.dates?.expires),
      '{quote_total}': `${currencySymbol}${this.formatNumber(quote.amounts?.total || 0)}`,
      '{quote_url}': `${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest/quote/${quote.urlKey}`,
      '{client_name}': `${quote.client?.name || ''} ${quote.client?.surname || ''}`.trim(),
      '{client_company}': quote.client?.company || '',
      '{client_email}': clientEmail,
      '{user_name}': user?.profile?.name || '',
      '{user_company}': user?.profile?.company || '',
      '{user_email}': user?.email || ''
    };

    let subject = `Quotation ${quote.quoteNumber || ''} from ${user?.profile?.company || settings.app_name || 'Girjasoft Invoices'}`;
    let html = this.getDefaultQuoteEmailTemplate();

    const template = await EmailTemplate.findOne({ type: 'quote', isDefault: true, isActive: true });
    if (template) {
      subject = template.subject;
      html = template.body;
    }

    Object.entries(replacements).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key, 'g'), value);
      html = html.replace(new RegExp(key, 'g'), value);
    });

    const attachments = [];
    if (attachPDF && pdfPath) {
      attachments.push({
        filename: `Quote-${quote.quoteNumber || quote._id}.pdf`,
        path: pdfPath
      });
    }

    return this.sendEmail({
      to: clientEmail,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''),
      attachments
    });
  }

  async sendPaymentConfirmation(payment, invoice, user) {
    const clientEmail = invoice.client?.contact?.email;

    if (!clientEmail) {
      return { success: false, message: 'Client email not found' };
    }

    const settings = await Setting.getAllAsObject();
    const currencySymbol = settings.currency_symbol || '₹';

    const subject = `Payment Received - Invoice ${invoice.invoiceNumber || ''}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">Payment Received</h2>
        <p>Dear ${invoice.client?.name || 'Customer'},</p>
        <p>We have received your payment. Thank you!</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Invoice:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.invoiceNumber || ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment Amount:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${currencySymbol}${this.formatNumber(payment.amount)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment Date:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${this.formatDate(payment.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Remaining Balance:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${currencySymbol}${this.formatNumber(invoice.amounts?.balance || 0)}</td>
          </tr>
        </table>
        <p>Best regards,<br>${user?.profile?.company || settings.app_name || 'Girjasoft Invoices'}</p>
      </div>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, '')
    });
  }

  getDefaultInvoiceEmailTemplate() {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Invoice {invoice_number}</h2>
        <p>Dear {client_name},</p>
        <p>Please find attached the invoice for your reference.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Invoice Number:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Invoice Date:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{invoice_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Due Date:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{invoice_due_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount Due:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>{invoice_balance}</strong></td>
          </tr>
        </table>
        <p>
          <a href="{invoice_url}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            View Invoice Online
          </a>
        </p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>{user_company}</p>
      </div>
    `;
  }

  getDefaultQuoteEmailTemplate() {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Quote {quote_number}</h2>
        <p>Dear {client_name},</p>
        <p>Please find attached the quote for your review.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Quote Number:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{quote_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{quote_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Valid Until:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{quote_expires}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Amount:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>{quote_total}</strong></td>
          </tr>
        </table>
        <p>
          <a href="{quote_url}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
            View & Approve Quote
          </a>
        </p>
        <p>Please let us know if you have any questions.</p>
        <p>Best regards,<br>{user_company}</p>
      </div>
    `;
  }

  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  }

  formatNumber(num) {
    return (num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

export default new EmailService();
