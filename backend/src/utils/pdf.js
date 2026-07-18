const PDFDocument = require('pdfkit');

// Cardinal palette to match the frontend theme so exported reports look on-brand.
const COLORS = {
  primary: '#8c1515',
  ink: '#1f2933',
  muted: '#6b7280',
  stroke: '#d9dee5',
  zebra: '#f6f2f2',
  headerText: '#ffffff'
};

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;

/**
 * Render an array of row objects into a paginated PDF table and resolve with a Buffer.
 *
 * @param {Object} options
 * @param {string} options.title        Report heading (e.g. the notice title).
 * @param {string} [options.subtitle]   Secondary heading line.
 * @param {Array<{label:string,value:string}>} [options.meta] Summary key/values under the title.
 * @param {Array<{key:string,label:string,width:number}>} options.columns Table columns.
 * @param {Array<Object>} options.rows  Row objects keyed by column.key.
 * @returns {Promise<Buffer>}
 */
const renderTablePdf = ({ title, subtitle, meta = [], columns, rows }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const contentWidth = A4.width - MARGIN * 2;

    // --- Header band ---------------------------------------------------------
    doc.rect(0, 0, A4.width, 90).fill(COLORS.primary);
    doc
      .fillColor(COLORS.headerText)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Digital Department Hub', MARGIN, 26);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.headerText)
      .text('Department of Computer Science & Engineering', MARGIN, 48);
    doc
      .fontSize(9)
      .text(`Generated ${new Date().toLocaleString()}`, MARGIN, 64);

    doc.y = 110;

    // --- Title + meta --------------------------------------------------------
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(15).text(title, MARGIN, doc.y);
    if (subtitle) {
      doc.moveDown(0.2);
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text(subtitle, MARGIN);
    }

    if (meta.length) {
      doc.moveDown(0.6);
      meta.forEach((item) => {
        doc
          .fillColor(COLORS.ink)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(`${item.label}: `, { continued: true })
          .font('Helvetica')
          .fillColor(COLORS.muted)
          .text(item.value);
      });
    }

    doc.moveDown(0.8);

    // --- Table ---------------------------------------------------------------
    const totalDeclared = columns.reduce((sum, col) => sum + col.width, 0);
    const scale = contentWidth / totalDeclared;
    const scaledCols = columns.map((col) => ({ ...col, w: col.width * scale }));

    const rowPadding = 5;
    const headerHeight = 20;

    const columnX = (index) =>
      MARGIN + scaledCols.slice(0, index).reduce((sum, col) => sum + col.w, 0);

    const drawHeaderRow = (y) => {
      doc.rect(MARGIN, y, contentWidth, headerHeight).fill(COLORS.primary);
      scaledCols.forEach((col, index) => {
        doc
          .fillColor(COLORS.headerText)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(col.label, columnX(index) + rowPadding, y + 6, {
            width: col.w - rowPadding * 2,
            lineBreak: false,
            ellipsis: true
          });
      });
      return y + headerHeight;
    };

    const measureRowHeight = (row) => {
      const heights = scaledCols.map((col) => {
        const text = row[col.key] === undefined || row[col.key] === null ? '' : String(row[col.key]);
        return doc.font('Helvetica').fontSize(8.5).heightOfString(text || ' ', {
          width: col.w - rowPadding * 2
        });
      });
      return Math.max(...heights) + rowPadding * 2;
    };

    let y = drawHeaderRow(doc.y);
    const pageBottom = A4.height - MARGIN;

    rows.forEach((row, rowIndex) => {
      const rowHeight = measureRowHeight(row);

      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = drawHeaderRow(MARGIN);
      }

      if (rowIndex % 2 === 1) {
        doc.rect(MARGIN, y, contentWidth, rowHeight).fill(COLORS.zebra);
      }

      scaledCols.forEach((col, index) => {
        const raw = row[col.key];
        const text = raw === undefined || raw === null ? '' : String(raw);
        doc
          .fillColor(COLORS.ink)
          .font('Helvetica')
          .fontSize(8.5)
          .text(text, columnX(index) + rowPadding, y + rowPadding, {
            width: col.w - rowPadding * 2
          });
      });

      doc
        .moveTo(MARGIN, y + rowHeight)
        .lineTo(MARGIN + contentWidth, y + rowHeight)
        .lineWidth(0.5)
        .strokeColor(COLORS.stroke)
        .stroke();

      y += rowHeight;
    });

    if (!rows.length) {
      doc
        .fillColor(COLORS.muted)
        .font('Helvetica-Oblique')
        .fontSize(10)
        .text('No records match the selected filters.', MARGIN, y + 12);
    }

    // --- Page numbers --------------------------------------------------------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc
        .fillColor(COLORS.muted)
        .font('Helvetica')
        .fontSize(8)
        .text(
          `Page ${i - range.start + 1} of ${range.count}`,
          MARGIN,
          A4.height - MARGIN + 8,
          { width: contentWidth, align: 'right' }
        );
    }

    doc.end();
  });

/**
 * Render a single-page scholarship award confirmation letter and resolve with a
 * Buffer. Used to give an approved applicant downloadable proof of the award.
 *
 * @param {Object} options
 * @param {string} options.recipientName   Applicant's full name.
 * @param {string} options.noticeTitle     Scholarship notice title (resolved).
 * @param {Array<{label:string,value:string}>} [options.details] Award detail rows.
 * @param {string} [options.body]          Body paragraph.
 * @param {string} [options.reference]     Reference/application id line.
 * @returns {Promise<Buffer>}
 */
const renderAwardLetterPdf = ({ recipientName, noticeTitle, details = [], body, reference }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const contentWidth = A4.width - MARGIN * 2;

    // --- Header band ---------------------------------------------------------
    doc.rect(0, 0, A4.width, 90).fill(COLORS.primary);
    doc
      .fillColor(COLORS.headerText)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Digital Department Hub', MARGIN, 26);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.headerText)
      .text('Department of Computer Science & Engineering', MARGIN, 48);
    doc.fontSize(9).text(`Issued ${new Date().toLocaleDateString()}`, MARGIN, 64);

    doc.y = 130;

    // --- Title ---------------------------------------------------------------
    doc
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('Scholarship Award Confirmation', MARGIN, doc.y, {
        width: contentWidth,
        align: 'center'
      });

    doc.moveDown(1.5);

    // --- Salutation + body ---------------------------------------------------
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica')
      .fontSize(11)
      .text(`Dear ${recipientName},`, MARGIN);

    doc.moveDown(0.8);

    const paragraph =
      body ||
      `We are pleased to confirm that your application for "${noticeTitle}" has been approved. ` +
        'The details of your award are set out below. Please retain this letter for your records.';
    doc.font('Helvetica').fontSize(11).fillColor(COLORS.ink).text(paragraph, MARGIN, doc.y, {
      width: contentWidth,
      align: 'left',
      lineGap: 3
    });

    doc.moveDown(1.2);

    // --- Detail box ----------------------------------------------------------
    if (details.length) {
      const boxTop = doc.y;
      const lineHeight = 22;
      const boxHeight = details.length * lineHeight + 16;
      doc
        .rect(MARGIN, boxTop, contentWidth, boxHeight)
        .fill(COLORS.zebra);
      doc
        .rect(MARGIN, boxTop, 4, boxHeight)
        .fill(COLORS.primary);

      let rowY = boxTop + 12;
      details.forEach((item) => {
        doc
          .fillColor(COLORS.muted)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`${item.label}`, MARGIN + 18, rowY, { width: 160, lineBreak: false });
        doc
          .fillColor(COLORS.ink)
          .font('Helvetica')
          .fontSize(10)
          .text(String(item.value), MARGIN + 185, rowY, {
            width: contentWidth - 200,
            lineBreak: false,
            ellipsis: true
          });
        rowY += lineHeight;
      });

      doc.y = boxTop + boxHeight;
      doc.moveDown(1.2);
    }

    doc
      .fillColor(COLORS.ink)
      .font('Helvetica')
      .fontSize(11)
      .text(
        'This confirmation is generated electronically by the Digital Department Hub and is valid without a signature.',
        MARGIN,
        doc.y,
        { width: contentWidth, lineGap: 3 }
      );

    doc.moveDown(2);
    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Scholarship Committee', MARGIN);
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(10)
      .text('Department of Computer Science & Engineering', MARGIN);

    // --- Footer reference ----------------------------------------------------
    if (reference) {
      doc
        .fillColor(COLORS.muted)
        .font('Helvetica')
        .fontSize(8)
        .text(`Reference: ${reference}`, MARGIN, A4.height - MARGIN, {
          width: contentWidth,
          align: 'left'
        });
    }

    doc.end();
  });

module.exports = { renderTablePdf, renderAwardLetterPdf };
