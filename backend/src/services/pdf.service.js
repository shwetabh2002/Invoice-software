import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Setting from '../models/Setting.js';

class PDFService {
  constructor() {
    this.uploadsDir = process.env.UPLOAD_DIR || 'uploads';
    this.pdfDir = path.join(this.uploadsDir, 'pdfs');
    
    if (!fs.existsSync(this.pdfDir)) {
      fs.mkdirSync(this.pdfDir, { recursive: true });
    }

    // Simple grayscale color scheme
    this.colors = {
      black: '#000000',
      darkGray: '#333333',
      gray: '#666666',
      lightGray: '#999999',
      border: '#cccccc',
      lightBg: '#f5f5f5'
    };
  }

  async generateInvoicePDF(invoice, user) {
    return new Promise(async (resolve, reject) => {
      try {
        const settings = await Setting.getAllAsObject();
        const currencySymbol = settings.currency_symbol || '₹';
        const companyName = user?.profile?.company || settings.company_name || 'Company Name';
        
        const doc = new PDFDocument({ 
          margin: 40,
          size: 'A4'
        });
        
        const filename = `invoice-${invoice.invoiceNumber || invoice._id}.pdf`;
        const filepath = path.join(this.pdfDir, filename);
        const writeStream = fs.createWriteStream(filepath);
        
        doc.pipe(writeStream);

        // ============ HEADER ============
        let y = 40;
        
        // Company name (left)
        doc.fontSize(18).font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text(companyName, 40, y);
        
        // INVOICE title (right)
        doc.fontSize(24).font('Helvetica-Bold').fillColor(this.colors.darkGray);
        doc.text('INVOICE', 400, y, { width: 155, align: 'right' });
        
        y += 30;
        
        // Company details (left)
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        if (user?.profile?.address1) { doc.text(user.profile.address1, 40, y); y += 12; }
        if (user?.profile?.city) { 
          doc.text(`${user.profile.city}${user.profile.state ? ', ' + user.profile.state : ''} ${user.profile.zip || ''}`, 40, y); 
          y += 12; 
        }
        if (user?.profile?.phone) { doc.text(`Tel: ${user.profile.phone}`, 40, y); y += 12; }
        if (user?.email) { doc.text(user.email, 40, y); y += 12; }
        
        // Invoice details (right side)
        let rightY = 70;
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        
        doc.text('Invoice No:', 400, rightY);
        doc.font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text(invoice.invoiceNumber || 'DRAFT', 470, rightY);
        rightY += 14;
        
        doc.font('Helvetica').fillColor(this.colors.gray);
        doc.text('Date:', 400, rightY);
        doc.fillColor(this.colors.black);
        doc.text(this.formatDate(invoice.dates?.created), 470, rightY);
        rightY += 14;
        
        doc.fillColor(this.colors.gray);
        doc.text('Due Date:', 400, rightY);
        doc.fillColor(this.colors.black);
        doc.text(this.formatDate(invoice.dates?.due), 470, rightY);
        rightY += 14;
        
        doc.fillColor(this.colors.gray);
        doc.text('Status:', 400, rightY);
        doc.fillColor(this.colors.black);
        doc.text((invoice.status || 'draft').toUpperCase(), 470, rightY);

        // ============ BILL TO SECTION ============
        y = Math.max(y, rightY) + 25;
        
        // Horizontal line
        doc.strokeColor(this.colors.border).lineWidth(0.5);
        doc.moveTo(40, y).lineTo(555, y).stroke();
        y += 15;
        
        // Bill To
        doc.fontSize(10).font('Helvetica-Bold').fillColor(this.colors.darkGray);
        doc.text('BILL TO:', 40, y);
        y += 14;
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text(`${invoice.client?.name || ''} ${invoice.client?.surname || ''}`.trim(), 40, y);
        y += 13;
        
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        if (invoice.client?.company) { doc.text(invoice.client.company, 40, y); y += 12; }
        if (invoice.client?.address?.line1) { doc.text(invoice.client.address.line1, 40, y); y += 12; }
        if (invoice.client?.address?.city) {
          doc.text(`${invoice.client.address.city}${invoice.client.address.state ? ', ' + invoice.client.address.state : ''} ${invoice.client.address.zip || ''}`, 40, y);
          y += 12;
        }
        if (invoice.client?.contact?.email) { doc.text(invoice.client.contact.email, 40, y); y += 12; }
        if (invoice.client?.contact?.phone) { doc.text(`Tel: ${invoice.client.contact.phone}`, 40, y); y += 12; }

        // ============ ITEMS TABLE ============
        y += 15;
        
        // Table header
        const tableLeft = 40;
        const colWidths = { item: 220, qty: 50, rate: 80, tax: 60, amount: 85 };
        const colX = {
          item: tableLeft,
          qty: tableLeft + colWidths.item,
          rate: tableLeft + colWidths.item + colWidths.qty,
          tax: tableLeft + colWidths.item + colWidths.qty + colWidths.rate,
          amount: tableLeft + colWidths.item + colWidths.qty + colWidths.rate + colWidths.tax
        };
        
        // Header background
        doc.rect(tableLeft, y, 515, 20).fill(this.colors.lightBg);
        
        // Header text
        doc.fontSize(8).font('Helvetica-Bold').fillColor(this.colors.darkGray);
        doc.text('DESCRIPTION', colX.item + 5, y + 6);
        doc.text('QTY', colX.qty + 5, y + 6);
        doc.text('RATE', colX.rate + 5, y + 6);
        doc.text('TAX', colX.tax + 5, y + 6);
        doc.text('AMOUNT', colX.amount + 5, y + 6);
        
        y += 20;
        
        // Table rows
        doc.font('Helvetica').fillColor(this.colors.black);
        
        for (const item of invoice.items || []) {
          const itemTotal = item.amounts?.total || (item.quantity * item.price);
          const rowHeight = item.description ? 28 : 18;
          
          // Check page break
          if (y + rowHeight > 700) {
            doc.addPage();
            y = 40;
          }
          
          // Row border
          doc.strokeColor(this.colors.border).lineWidth(0.3);
          doc.moveTo(tableLeft, y + rowHeight).lineTo(555, y + rowHeight).stroke();
          
          // Row content
          doc.fontSize(9).fillColor(this.colors.black);
          doc.text(item.name || '', colX.item + 5, y + 4, { width: colWidths.item - 10 });
          
          if (item.description) {
            doc.fontSize(8).fillColor(this.colors.gray);
            doc.text(item.description, colX.item + 5, y + 16, { width: colWidths.item - 10 });
          }
          
          doc.fontSize(9).fillColor(this.colors.black);
          doc.text(String(item.quantity || 1), colX.qty + 5, y + 4);
          doc.text(`${currencySymbol}${this.formatNumber(item.price || 0)}`, colX.rate + 5, y + 4);
          doc.text(`${item.taxRatePercent || 0}%`, colX.tax + 5, y + 4);
          doc.text(`${currencySymbol}${this.formatNumber(itemTotal)}`, colX.amount + 5, y + 4);
          
          y += rowHeight;
        }

        // ============ TOTALS ============
        y += 15;
        const totalsX = 380;
        const totalsValueX = 480;
        
        // Subtotal
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        doc.text('Subtotal:', totalsX, y);
        doc.fillColor(this.colors.black);
        doc.text(`${currencySymbol}${this.formatNumber(invoice.amounts?.subtotal || 0)}`, totalsValueX, y, { width: 75, align: 'right' });
        y += 15;
        
        // Tax
        if (invoice.amounts?.itemTaxTotal > 0) {
          doc.fillColor(this.colors.gray);
          doc.text('Tax:', totalsX, y);
          doc.fillColor(this.colors.black);
          doc.text(`${currencySymbol}${this.formatNumber(invoice.amounts.itemTaxTotal)}`, totalsValueX, y, { width: 75, align: 'right' });
          y += 15;
        }
        
        // Discount
        if (invoice.amounts?.discountAmount > 0 || invoice.amounts?.discountPercent > 0) {
          doc.fillColor(this.colors.gray);
          doc.text('Discount:', totalsX, y);
          doc.fillColor(this.colors.black);
          doc.text(`-${currencySymbol}${this.formatNumber(invoice.amounts.discountAmount || 0)}`, totalsValueX, y, { width: 75, align: 'right' });
          y += 15;
        }
        
        // Total line
        doc.strokeColor(this.colors.border).lineWidth(0.5);
        doc.moveTo(totalsX, y).lineTo(555, y).stroke();
        y += 8;
        
        // Grand Total
        doc.fontSize(11).font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text('TOTAL:', totalsX, y);
        doc.text(`${currencySymbol}${this.formatNumber(invoice.amounts?.total || 0)}`, totalsValueX, y, { width: 75, align: 'right' });
        y += 18;
        
        // Payment info
        if (invoice.amounts?.paid > 0) {
          doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
          doc.text('Amount Paid:', totalsX, y);
          doc.fillColor(this.colors.black);
          doc.text(`${currencySymbol}${this.formatNumber(invoice.amounts.paid)}`, totalsValueX, y, { width: 75, align: 'right' });
          y += 15;
          
          doc.font('Helvetica-Bold').fillColor(this.colors.black);
          doc.text('Balance Due:', totalsX, y);
          doc.text(`${currencySymbol}${this.formatNumber(invoice.amounts.balance || 0)}`, totalsValueX, y, { width: 75, align: 'right' });
          y += 15;
        }

        // ============ BANK DETAILS ============
        if (user?.bankDetails?.bank || user?.bankDetails?.iban) {
          y += 20;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(this.colors.darkGray);
          doc.text('Payment Details:', 40, y);
          y += 12;
          
          doc.font('Helvetica').fillColor(this.colors.gray);
          if (user.bankDetails.bank) { doc.text(`Bank: ${user.bankDetails.bank}`, 40, y); y += 11; }
          if (user.bankDetails.iban) { doc.text(`IBAN: ${user.bankDetails.iban}`, 40, y); y += 11; }
          if (user.bankDetails.bic) { doc.text(`BIC/SWIFT: ${user.bankDetails.bic}`, 40, y); y += 11; }
        }

        // ============ TERMS ============
        if (invoice.terms) {
          y += 15;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(this.colors.darkGray);
          doc.text('Terms & Conditions:', 40, y);
          y += 12;
          
          doc.font('Helvetica').fontSize(8).fillColor(this.colors.gray);
          doc.text(invoice.terms, 40, y, { width: 300 });
        }

        // ============ FOOTER ============
        const footerY = 780;
        doc.fontSize(8).font('Helvetica').fillColor(this.colors.lightGray);
        doc.text(settings.pdf_invoice_footer || 'Thank you for your business!', 40, footerY, { 
          width: 515, 
          align: 'center' 
        });

        doc.end();

        writeStream.on('finish', () => {
          resolve({ filename, filepath, url: `/uploads/pdfs/${filename}` });
        });
        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateQuotePDF(quote, user) {
    return new Promise(async (resolve, reject) => {
      try {
        const settings = await Setting.getAllAsObject();
        const currencySymbol = settings.currency_symbol || '₹';
        const companyName = user?.profile?.company || settings.company_name || 'Company Name';
        
        const doc = new PDFDocument({ 
          margin: 40,
          size: 'A4'
        });
        
        const filename = `quotation-${quote.quoteNumber || quote._id}.pdf`;
        const filepath = path.join(this.pdfDir, filename);
        const writeStream = fs.createWriteStream(filepath);
        
        doc.pipe(writeStream);

        // ============ HEADER ============
        let y = 40;
        
        // Company name (left)
        doc.fontSize(18).font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text(companyName, 40, y);
        
        // QUOTATION title (right)
        doc.fontSize(24).font('Helvetica-Bold').fillColor(this.colors.darkGray);
        doc.text('QUOTATION', 380, y, { width: 175, align: 'right' });
        
        y += 30;
        
        // Company details (left)
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        if (user?.profile?.address1) { doc.text(user.profile.address1, 40, y); y += 12; }
        if (user?.profile?.city) { 
          doc.text(`${user.profile.city}${user.profile.state ? ', ' + user.profile.state : ''} ${user.profile.zip || ''}`, 40, y); 
          y += 12; 
        }
        if (user?.profile?.phone) { doc.text(`Tel: ${user.profile.phone}`, 40, y); y += 12; }
        if (user?.email) { doc.text(user.email, 40, y); y += 12; }
        
        // Quotation details (right side)
        let rightY = 70;
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        
        doc.text('Quotation No:', 380, rightY);
        doc.font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text(quote.quoteNumber || 'DRAFT', 460, rightY);
        rightY += 14;
        
        doc.font('Helvetica').fillColor(this.colors.gray);
        doc.text('Date:', 380, rightY);
        doc.fillColor(this.colors.black);
        doc.text(this.formatDate(quote.dates?.created), 460, rightY);
        rightY += 14;
        
        doc.fillColor(this.colors.gray);
        doc.text('Valid Until:', 380, rightY);
        doc.fillColor(this.colors.black);
        doc.text(this.formatDate(quote.dates?.expires), 460, rightY);
        rightY += 14;
        
        doc.fillColor(this.colors.gray);
        doc.text('Status:', 380, rightY);
        doc.fillColor(this.colors.black);
        doc.text((quote.status || 'draft').toUpperCase(), 460, rightY);

        // ============ QUOTATION FOR SECTION ============
        y = Math.max(y, rightY) + 25;
        
        // Horizontal line
        doc.strokeColor(this.colors.border).lineWidth(0.5);
        doc.moveTo(40, y).lineTo(555, y).stroke();
        y += 15;
        
        // Quotation For
        doc.fontSize(10).font('Helvetica-Bold').fillColor(this.colors.darkGray);
        doc.text('QUOTATION FOR:', 40, y);
        y += 14;
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text(`${quote.client?.name || ''} ${quote.client?.surname || ''}`.trim(), 40, y);
        y += 13;
        
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        if (quote.client?.company) { doc.text(quote.client.company, 40, y); y += 12; }
        if (quote.client?.address?.line1) { doc.text(quote.client.address.line1, 40, y); y += 12; }
        if (quote.client?.address?.city) {
          doc.text(`${quote.client.address.city}${quote.client.address.state ? ', ' + quote.client.address.state : ''} ${quote.client.address.zip || ''}`, 40, y);
          y += 12;
        }
        if (quote.client?.contact?.email) { doc.text(quote.client.contact.email, 40, y); y += 12; }
        if (quote.client?.contact?.phone) { doc.text(`Tel: ${quote.client.contact.phone}`, 40, y); y += 12; }

        // ============ ITEMS TABLE ============
        y += 15;
        
        const tableLeft = 40;
        const colWidths = { item: 220, qty: 50, rate: 80, tax: 60, amount: 85 };
        const colX = {
          item: tableLeft,
          qty: tableLeft + colWidths.item,
          rate: tableLeft + colWidths.item + colWidths.qty,
          tax: tableLeft + colWidths.item + colWidths.qty + colWidths.rate,
          amount: tableLeft + colWidths.item + colWidths.qty + colWidths.rate + colWidths.tax
        };
        
        // Header background
        doc.rect(tableLeft, y, 515, 20).fill(this.colors.lightBg);
        
        // Header text
        doc.fontSize(8).font('Helvetica-Bold').fillColor(this.colors.darkGray);
        doc.text('DESCRIPTION', colX.item + 5, y + 6);
        doc.text('QTY', colX.qty + 5, y + 6);
        doc.text('RATE', colX.rate + 5, y + 6);
        doc.text('TAX', colX.tax + 5, y + 6);
        doc.text('AMOUNT', colX.amount + 5, y + 6);
        
        y += 20;
        
        // Table rows
        doc.font('Helvetica').fillColor(this.colors.black);
        
        for (const item of quote.items || []) {
          const itemTotal = item.amounts?.total || (item.quantity * item.price);
          const rowHeight = item.description ? 28 : 18;
          
          // Check page break
          if (y + rowHeight > 700) {
            doc.addPage();
            y = 40;
          }
          
          // Row border
          doc.strokeColor(this.colors.border).lineWidth(0.3);
          doc.moveTo(tableLeft, y + rowHeight).lineTo(555, y + rowHeight).stroke();
          
          // Row content
          doc.fontSize(9).fillColor(this.colors.black);
          doc.text(item.name || '', colX.item + 5, y + 4, { width: colWidths.item - 10 });
          
          if (item.description) {
            doc.fontSize(8).fillColor(this.colors.gray);
            doc.text(item.description, colX.item + 5, y + 16, { width: colWidths.item - 10 });
          }
          
          doc.fontSize(9).fillColor(this.colors.black);
          doc.text(String(item.quantity || 1), colX.qty + 5, y + 4);
          doc.text(`${currencySymbol}${this.formatNumber(item.price || 0)}`, colX.rate + 5, y + 4);
          doc.text(`${item.taxRatePercent || 0}%`, colX.tax + 5, y + 4);
          doc.text(`${currencySymbol}${this.formatNumber(itemTotal)}`, colX.amount + 5, y + 4);
          
          y += rowHeight;
        }

        // ============ TOTALS ============
        y += 15;
        const totalsX = 380;
        const totalsValueX = 480;
        
        // Subtotal
        doc.fontSize(9).font('Helvetica').fillColor(this.colors.gray);
        doc.text('Subtotal:', totalsX, y);
        doc.fillColor(this.colors.black);
        doc.text(`${currencySymbol}${this.formatNumber(quote.amounts?.subtotal || 0)}`, totalsValueX, y, { width: 75, align: 'right' });
        y += 15;
        
        // Tax
        if (quote.amounts?.itemTaxTotal > 0) {
          doc.fillColor(this.colors.gray);
          doc.text('Tax:', totalsX, y);
          doc.fillColor(this.colors.black);
          doc.text(`${currencySymbol}${this.formatNumber(quote.amounts.itemTaxTotal)}`, totalsValueX, y, { width: 75, align: 'right' });
          y += 15;
        }
        
        // Discount
        if (quote.amounts?.discountAmount > 0 || quote.amounts?.discountPercent > 0) {
          doc.fillColor(this.colors.gray);
          doc.text('Discount:', totalsX, y);
          doc.fillColor(this.colors.black);
          doc.text(`-${currencySymbol}${this.formatNumber(quote.amounts.discountAmount || 0)}`, totalsValueX, y, { width: 75, align: 'right' });
          y += 15;
        }
        
        // Total line
        doc.strokeColor(this.colors.border).lineWidth(0.5);
        doc.moveTo(totalsX, y).lineTo(555, y).stroke();
        y += 8;
        
        // Grand Total
        doc.fontSize(11).font('Helvetica-Bold').fillColor(this.colors.black);
        doc.text('TOTAL:', totalsX, y);
        doc.text(`${currencySymbol}${this.formatNumber(quote.amounts?.total || 0)}`, totalsValueX, y, { width: 75, align: 'right' });

        // ============ NOTES ============
        if (quote.notes) {
          y += 30;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(this.colors.darkGray);
          doc.text('Notes:', 40, y);
          y += 12;
          
          doc.font('Helvetica').fontSize(8).fillColor(this.colors.gray);
          doc.text(quote.notes, 40, y, { width: 300 });
        }

        // ============ VALIDITY NOTICE ============
        y = Math.min(y + 40, 740);
        doc.fontSize(8).font('Helvetica').fillColor(this.colors.gray);
        doc.text(`This quotation is valid until ${this.formatDate(quote.dates?.expires)}.`, 40, y);

        // ============ FOOTER ============
        const footerY = 780;
        doc.fontSize(8).font('Helvetica').fillColor(this.colors.lightGray);
        doc.text('We look forward to doing business with you.', 40, footerY, { 
          width: 515, 
          align: 'center' 
        });

        doc.end();

        writeStream.on('finish', () => {
          resolve({ filename, filepath, url: `/uploads/pdfs/${filename}` });
        });
        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatNumber(num) {
    return (num || 0).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
}

export default new PDFService();
