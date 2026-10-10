/**
 * OCR Advanced Extensions & Utilities
 * Provides:
 * 1. Multi-Format Export (.docx, .pdf, .xlsx, .txt, .csv, .zip)
 * 2. Table & Layout Preservation (Detection, Parsing, HTML Table, TSV, CSV)
 * 3. Handwritten OCR Optimization (Sauvola Local Adaptive Threshold, Rule Removal, Stroke Dilation)
 */

// ==========================================
// 1. TABLE DETECTION & PARSING
// ==========================================

/**
 * Parses raw text into a 2D matrix of table cells [row][col].
 * Detects pipes, tabs, double-spaces, and commas.
 */
export function parseTableFromText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const rawLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  // Check if pipe-delimited (Markdown table)
  const pipeCount = rawLines.filter(l => l.includes('|')).length;
  const isPipeTable = pipeCount >= Math.min(2, rawLines.length);

  // Check if tab-delimited
  const tabCount = rawLines.filter(l => l.includes('\t')).length;
  const isTabTable = tabCount >= Math.min(2, rawLines.length);

  let matrix = [];

  for (const line of rawLines) {
    // Skip markdown separator lines like |---|---| or +---+---+
    if (/^[|\-+: \t=]+$/.test(line) && (line.includes('-') || line.includes('='))) {
      continue;
    }

    let cells = [];
    if (isPipeTable && line.includes('|')) {
      cells = line
        .split('|')
        .map(c => c.trim())
        .filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
    } else if (isTabTable && line.includes('\t')) {
      cells = line.split('\t').map(c => c.trim());
    } else {
      // Split on 2 or more spaces, or commas
      if (/\s{2,}/.test(line)) {
        cells = line.split(/\s{2,}/).map(c => c.trim());
      } else if (line.includes(',')) {
        cells = parseCsvLine(line);
      } else {
        cells = [line];
      }
    }

    if (cells.length > 0) {
      matrix.push(cells);
    }
  }

  if (matrix.length === 0) return [];

  // Normalize column count so all rows have the same number of cells
  const maxCols = Math.max(...matrix.map(r => r.length), 1);
  return matrix.map(row => {
    const copy = [...row];
    while (copy.length < maxCols) {
      copy.push('');
    }
    return copy;
  });
}

function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Converts table matrix to semantic, styled HTML table with editable cells
 */
export function tableToHtml(matrix, isEditable = true) {
  if (!matrix || matrix.length === 0) {
    return '<p class="text-neutral-500 italic p-4 text-center">No structured table data detected.</p>';
  }

  const [headerRow, ...bodyRows] = matrix;
  let html = '<div class="overflow-x-auto w-full rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">';
  html += '<table id="ocr-structured-table" class="min-w-full text-left text-sm divide-y divide-neutral-200 dark:divide-neutral-800">';
  
  // Header
  html += '<thead class="bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold uppercase tracking-wider text-xs">';
  html += '<tr>';
  headerRow.forEach((cell, idx) => {
    html += `<th scope="col" class="px-4 py-3 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 ${isEditable ? 'focus:outline-blue-500' : ''}" ${isEditable ? 'contenteditable="true"' : ''} data-row="0" data-col="${idx}">${escapeHtml(cell || `Column ${idx + 1}`)}</th>`;
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody class="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">';
  bodyRows.forEach((row, rIdx) => {
    const isAlt = rIdx % 2 === 1;
    html += `<tr class="${isAlt ? 'bg-neutral-50/60 dark:bg-neutral-950/30' : ''} hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">`;
    row.forEach((cell, cIdx) => {
      html += `<td class="px-4 py-2.5 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 ${isEditable ? 'focus:outline-blue-500 focus:bg-white dark:focus:bg-neutral-800' : ''}" ${isEditable ? 'contenteditable="true"' : ''} data-row="${rIdx + 1}" data-col="${cIdx}">${escapeHtml(cell)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

/**
 * Converts table matrix to CSV string with RFC 4180 quotes
 */
export function tableToCsv(matrix) {
  if (!matrix || matrix.length === 0) return '';
  return matrix.map(row => {
    return row.map(cell => {
      const str = String(cell || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  }).join('\r\n');
}

/**
 * Converts table matrix to Markdown table string
 */
export function tableToMarkdown(matrix) {
  if (!matrix || matrix.length === 0) return '';
  const [header, ...body] = matrix;
  let md = '| ' + header.map(c => c || ' ').join(' | ') + ' |\n';
  md += '| ' + header.map(() => '---').join(' | ') + ' |\n';
  body.forEach(row => {
    md += '| ' + row.map(c => c || ' ').join(' | ') + ' |\n';
  });
  return md;
}

/**
 * Converts table matrix to TSV (Tab Separated Values) for copy-pasting directly into Excel
 */
export function tableToTsv(matrix) {
  if (!matrix || matrix.length === 0) return '';
  return matrix.map(row => row.join('\t')).join('\n');
}

// ==========================================
// 2. EXPORT FORMAT GENERATORS (.docx, .pdf, .xlsx, .txt, .csv, .zip)
// ==========================================

/**
 * Generates an authentic Microsoft Word (.docx) file using JSZip
 */
export async function exportDocx({ title = 'Extracted Document', text = '', tableData = null, filename = 'extracted-document.docx' }) {
  const JSZip = window.JSZip;
  if (!JSZip) {
    throw new Error('JSZip library is not loaded. Cannot generate .docx.');
  }

  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  // 2. _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // 3. word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  // Build document.xml body
  let bodyXml = '';

  // Document Title
  bodyXml += `<w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:after="240"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/>
        <w:b/>
        <w:sz w:val="36"/>
        <w:color w:val="1E3A8A"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(title)}</w:t>
    </w:r>
  </w:p>`;

  // Subtitle / metadata stamp
  bodyXml += `<w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:after="400"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:i/>
        <w:sz w:val="18"/>
        <w:color w:val="64748B"/>
      </w:rPr>
      <w:t xml:space="preserve">Generated by ToolStacker OCR • ${new Date().toLocaleDateString()}</w:t>
    </w:r>
  </w:p>`;

  // If structured table exists, render Word table <w:tbl>
  if (tableData && Array.isArray(tableData) && tableData.length > 0) {
    bodyXml += `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>`;

    tableData.forEach((row, rIdx) => {
      const isHeader = rIdx === 0;
      bodyXml += `<w:tr>`;
      row.forEach(cell => {
        bodyXml += `<w:tc>
          <w:tcPr>
            <w:tcMar>
              <w:top w:w="120" w:type="dxa"/>
              <w:left w:w="150" w:type="dxa"/>
              <w:bottom w:w="120" w:type="dxa"/>
              <w:right w:w="150" w:type="dxa"/>
            </w:tcMar>
            ${isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/>' : ''}
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/>
                ${isHeader ? '<w:b/><w:color w:val="1E40AF"/>' : '<w:color w:val="1E293B"/>'}
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(String(cell || ''))}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;
      });
      bodyXml += `</w:tr>`;
    });

    bodyXml += `</w:tbl>`;
    bodyXml += `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
  }

  // Paragraphs of text
  if (text) {
    const paragraphs = text.split(/\r?\n/);
    paragraphs.forEach(para => {
      const trimmed = para.trim();
      if (!trimmed) {
        bodyXml += `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
        return;
      }

      const isHeading = trimmed.length <= 70 && (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':') || /^===.*===$/.test(trimmed));

      bodyXml += `<w:p>
        <w:pPr>
          <w:spacing w:after="${isHeading ? '180' : '120'}" w:line="276" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/>
            ${isHeading ? '<w:b/><w:sz w:val="26"/><w:color w:val="0F172A"/>' : '<w:sz w:val="22"/><w:color w:val="334155"/>'}
          </w:rPr>
          <w:t xml:space="preserve">${escapeXml(trimmed)}</w:t>
        </w:r>
      </w:p>`;
    });
  }

  // Complete word/document.xml
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', docXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  downloadBlob(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
}

/**
 * Generates high quality PDF using jsPDF
 */
export async function exportPdf({ title = 'Extracted Document', text = '', tableData = null, filename = 'extracted-document.pdf' }) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('jsPDF library is not loaded. Cannot generate .pdf.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxContentWidth = pageWidth - margin * 2;
  let y = margin + 10;

  // Header banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175); // Blue 800
  doc.text(title, margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Generated by ToolStacker OCR • ${new Date().toLocaleString()}`, margin, y);
  y += 15;

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Render Table if available
  if (tableData && Array.isArray(tableData) && tableData.length > 0) {
    const colCount = Math.max(...tableData.map(r => r.length), 1);
    const colWidth = maxContentWidth / colCount;
    const rowHeight = 20;

    tableData.forEach((row, rIdx) => {
      // Check page break
      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      const isHeader = rIdx === 0;
      row.forEach((cell, cIdx) => {
        const x = margin + cIdx * colWidth;

        // Background
        if (isHeader) {
          doc.setFillColor(239, 246, 255); // Blue 50
          doc.rect(x, y, colWidth, rowHeight, 'F');
        } else if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate 50
          doc.rect(x, y, colWidth, rowHeight, 'F');
        }

        // Border
        doc.setDrawColor(203, 213, 225);
        doc.rect(x, y, colWidth, rowHeight, 'S');

        // Text
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(isHeader ? 9 : 8.5);
        doc.setTextColor(isHeader ? 30 : 51, isHeader ? 64 : 65, isHeader ? 175 : 85);
        
        const cellText = doc.splitTextToSize(String(cell || ''), colWidth - 8);
        doc.text(cellText[0] || '', x + 4, y + 13);
      });
      y += rowHeight;
    });

    y += 18;
  }

  // Render Plain / Paragraph Text
  if (text) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);

    const lines = text.split(/\r?\n/);
    lines.forEach(rawLine => {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y += 8;
        return;
      }

      const isSectionHeader = trimmed.length <= 70 && (trimmed === trimmed.toUpperCase() || /^===.*===$/.test(trimmed));

      if (isSectionHeader) {
        if (y + 25 > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(trimmed, margin, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(51, 65, 85);
        return;
      }

      const wrapped = doc.splitTextToSize(trimmed, maxContentWidth);
      wrapped.forEach(wrapLine => {
        if (y + 14 > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(wrapLine, margin, y);
        y += 14;
      });
      y += 4;
    });
  }

  // Add Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 50, pageHeight - 20);
    doc.text('ToolStacker OCR', margin, pageHeight - 20);
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Generates Excel (.xlsx) spreadsheet using SheetJS
 */
export function exportXlsx({ title = 'Sheet1', text = '', tableData = null, multiSheets = null, filename = 'extracted-data.xlsx' }) {
  if (!window.XLSX) {
    throw new Error('SheetJS (XLSX) library is not loaded. Cannot generate .xlsx.');
  }

  const wb = window.XLSX.utils.book_new();

  if (multiSheets && Array.isArray(multiSheets) && multiSheets.length > 0) {
    // Multi-sheet batch export
    multiSheets.forEach((item, index) => {
      const sheetName = (item.name || `Image_${index + 1}`).slice(0, 31).replace(/[\\/?*[\]]/g, '_');
      let data = item.tableData;
      if (!data || data.length === 0) {
        data = (item.text || '').split(/\r?\n/).map(l => [l]);
      }
      const ws = window.XLSX.utils.aoa_to_sheet(data);
      window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  } else if (tableData && Array.isArray(tableData) && tableData.length > 0) {
    const ws = window.XLSX.utils.aoa_to_sheet(tableData);
    window.XLSX.utils.book_append_sheet(wb, ws, 'Table_Data');
  } else {
    // Convert lines into spreadsheet rows
    const rows = (text || '').split(/\r?\n/).map(l => [l]);
    const ws = window.XLSX.utils.aoa_to_sheet(rows.length ? rows : [['No text detected']]);
    window.XLSX.utils.book_append_sheet(wb, ws, 'Extracted_Text');
  }

  window.XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Downloads UTF-8 Plain Text (.txt) with BOM for proper Bengali / multilingual encoding
 */
export function exportTxt({ text = '', filename = 'extracted-text.txt' }) {
  const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.txt') ? filename : `${filename}.txt`);
}

/**
 * Downloads CSV (.csv) file with UTF-8 BOM
 */
export function exportCsv({ tableData = null, text = '', filename = 'extracted-table.csv' }) {
  let csvContent = '';
  if (tableData && Array.isArray(tableData) && tableData.length > 0) {
    csvContent = tableToCsv(tableData);
  } else {
    const matrix = parseTableFromText(text);
    csvContent = matrix.length > 0 ? tableToCsv(matrix) : text;
  }
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Packs multiple files into a single ZIP archive using JSZip
 */
export async function exportZip({ files = [], filename = 'batch-ocr-results.zip' }) {
  const JSZip = window.JSZip;
  if (!JSZip) {
    throw new Error('JSZip library is not loaded. Cannot generate .zip archive.');
  }

  const zip = new JSZip();
  files.forEach(f => {
    zip.file(f.name, f.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, filename.endsWith('.zip') ? filename : `${filename}.zip`);
}

// ==========================================
// 3. ADVANCED HANDWRITTEN PRE-PROCESSING
// ==========================================

/**
 * Applies Adaptive Local Thresholding (Sauvola-inspired fast integral image)
 * Tailored for handwritten notes, notebook paper, student exams, and shadows
 */
export function applyAdaptiveLocalThreshold(ctx, width, height, windowRadius = 15, k = 0.2) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Grayscale & compute integral image
  const gray = new Uint8Array(width * height);
  const integral = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const g = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      gray[y * width + x] = g;
      integral[(y + 1) * (width + 1) + (x + 1)] = g +
        integral[y * (width + 1) + (x + 1)] +
        integral[(y + 1) * (width + 1) + x] -
        integral[y * (width + 1) + x];
    }
  }

  // 2. Local adaptive thresholding using integral image
  const w = windowRadius;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - w);
    const y1 = Math.min(height, y + w + 1);

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - w);
      const x1 = Math.min(width, x + w + 1);

      const count = (x1 - x0) * (y1 - y0);
      const sum = integral[y1 * (width + 1) + x1] -
                  integral[y0 * (width + 1) + x1] -
                  integral[y1 * (width + 1) + x0] +
                  integral[y0 * (width + 1) + x0];
      const mean = sum / count;

      // Threshold: pixel is foreground if significantly darker than local average
      const threshold = mean * (1 - k * 0.5) - 3;
      const pixel = gray[y * width + x];
      const val = pixel < threshold ? 0 : 255;

      const idx = (y * width + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Removes or attenuates horizontal ruled lines found on notebook paper
 */
export function removeNotebookHorizontalLines(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Detect horizontal runs of dark pixels that span across large horizontal width
  // but are only 1-3 pixels thick vertically
  const minRunLength = Math.max(40, Math.floor(width * 0.15));

  for (let y = 2; y < height - 2; y++) {
    let run = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isDark = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 120;

      if (isDark) {
        run++;
      } else {
        if (run >= minRunLength) {
          // Check if it's a thin horizontal line (neighbors above and below are light)
          for (let rx = x - run; rx < x; rx++) {
            const aboveIdx = ((y - 2) * width + rx) * 4;
            const belowIdx = ((y + 2) * width + rx) * 4;
            const aboveLight = (data[aboveIdx] + data[aboveIdx + 1] + data[aboveIdx + 2]) / 3 > 160;
            const belowLight = (data[belowIdx] + data[belowIdx + 1] + data[belowIdx + 2]) / 3 > 160;

            if (aboveLight && belowLight) {
              const targetIdx = (y * width + rx) * 4;
              data[targetIdx] = 255;
              data[targetIdx + 1] = 255;
              data[targetIdx + 2] = 255;
            }
          }
        }
        run = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Morphological dilation to thicken faint handwritten pencil/ink strokes
 */
export function applyMorphologyDilation(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imgData.data);
  const dst = imgData.data;

  // Dilation on black ink (dark pixels): If any neighbor within 1px is black, set to black
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (src[idx] < 128) continue; // Already black

      // Check cross neighbors
      const top = src[((y - 1) * width + x) * 4];
      const bottom = src[((y + 1) * width + x) * 4];
      const left = src[(y * width + (x - 1)) * 4];
      const right = src[(y * width + (x + 1)) * 4];

      if (top < 100 || bottom < 100 || left < 100 || right < 100) {
        dst[idx] = 0;
        dst[idx + 1] = 0;
        dst[idx + 2] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// ==========================================
// HELPER UTILITIES
// ==========================================

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
