# ToolStacker Suite – Client-Side Utility Tools

A suite of 100% in-browser, privacy-first web utilities featuring zero server uploads, no signups, and no watermarks.

---

## 📑 Tools Included

### 1. Merge PDF (`/tools/merge-pdf.html` or `/merge-pdf`)
- **100% In-Browser Merging**: Uses `pdf-lib` to combine multiple PDFs with full vector fidelity, preserved fonts, and zero quality loss.
- **Multi-Format Auto-Conversion**: Supports PDF, PNG, JPG, JPEG, DOCX (via Mammoth.js), and XLSX (via SheetJS) into unified PDF pages.
- **Drag-and-Drop Reordering**: Interactive reordering with visual handles (`⋮⋮`), drop indicators, and mobile-friendly "Move Up" / "Move Down" buttons.
- **Live First-Page Thumbnails**: Powered by `pdf.js` canvas rendering.
- **Page Counts & File Metadata**: Displays live page counts (e.g., "12 pages") and formatted sizes.
- **Smart File Naming**: Auto-generates `merged_YYYYMMDD_HHMM.pdf` with in-browser custom naming.
- **Progress Tracking**: Real-time progress bar (0–100%) and status messages.
- **Safety & Validation**: Enforces max 20 files, 100MB per file, empty file detection, duplicate file warnings, and automatic memory cleanup (revokes Object URLs).

### 2. Split PDF (`/tools/split-pdf.html` or `/split-pdf`)
- **100% In-Browser Splitting**: Extract pages, split by custom range, divide every N pages, or separate even/odd pages.
- **Visual Thumbnail Grid**: 100x130px canvas preview for every page rendered dynamically with `pdf.js`.
- **Interactive Page Selection**: Checkbox overlay, click-to-select, range string sync ("1, 3, 5-7"), and Select All / Deselect All / Even / Odd filters.
- **Batch Export**: Instant single PDF download or bulk ZIP export powered by `JSZip`.
- **Validation & Safety**: Handles up to 200MB PDFs, detects invalid ranges and non-existent pages, with smooth progress tracking.

### 3. Compress PDF (`/tools/compress-pdf.html` or `/compress-pdf`)
- **100% In-Browser PDF Compression**: Reduce file size by up to 90% using smart resolution downscaling and JPEG stream re-encoding.
- **3 Tailored Presets**: Low (~50% smaller, print quality), Medium (~70% smaller, balanced), High (~90% smaller, email/mobile).
- **Live Side-by-Side Comparison**: Side-by-side original vs compressed page preview with zoom slider (50% to 200%) and page selector.
- **Smart Analysis**: Automatically analyzes bytes-per-page to suggest the optimal compression preset (image-heavy vs text-heavy).
- **Metadata Stripping**: Purges titles, authors, creators, and unused tags for maximum space savings and privacy.

### 4. PDF ↔ Image Converter (`/tools/pdf-image-converter.html` or `/pdf-image-converter`)
- **Two-Way Client-Side Conversion**: Seamlessly convert PDF to PNG/JPG/WebP or combine multiple photos into a clean PDF document.
- **DPI Resolution Control**: Screen (72 DPI), Balanced (150 DPI), and Ultra HQ Print (300 DPI).
- **Page Layout Customization**: Page size (A4, Letter, Custom dimensions), Orientation (Portrait, Landscape), and adjustable margins (0-50mm).
- **Drag-to-Reorder**: Interactive image reordering with mobile-friendly Move Up/Down controls.
- **Batch ZIP & PDF Downloads**: Export all converted images in a single ZIP or download the unified combined PDF directly.

### 5. Sign PDF (`/tools/sign-pdf.html` or `/sign-pdf`)
- **3 Signature Modes**: Draw with smooth mouse/stylus pen via `signature_pad`, type with 5 stylish cursive Google Fonts, or upload PNG/SVG signature image.
- **Precise Placement Controls**: Interactive canvas overlay with drag-to-position, corner resize handles, and 360° rotation.
- **Multi-Signature & Multi-Page Support**: Place multiple signatures across any page of the PDF document.
- **Smart Local Library**: Save signatures to `localStorage` for instant one-click reuse across sessions.
- **100% In-Browser Execution**: Embedded directly using `pdf-lib` vector precision with zero server uploads.

### 6. Protect & Unlock PDF (`/tools/protect-unlock-pdf.html` or `/protect-unlock-pdf`)
- **Dual Mode (Protect / Unlock)**: Add military-grade AES encryption or decrypt and remove security restrictions from password-protected PDFs.
- **Granular Permissions**: Restrict or enable Printing, Content Copying, Document Editing, and Form Filling.
- **Instant Strong Password Generator**: 16-character cryptographic generator with automatic clipboard copy.
- **Security Validation**: Validates passwords (min 8 chars), confirms password matching, and handles decryption with clear error prompts.
- **100% Client-Side Privacy**: Passwords and document contents never leave the user's browser.

### 7. Watermark PDF (`/tools/watermark-pdf.html` or `/watermark-pdf`)
- **Dual Mode (Text / Image)**: Add customizable text banners or company logo/stamp images to PDF pages.
- **Full Customization**: Configure text presets, 5 standard vector fonts, size (12-120 pt), hex/palette color, opacity (5-100%), and 360° rotation angle.
- **3x3 Position Grid**: Precise placement (Top-Left, Center, Bottom-Right, etc.) with automatic bounds detection.
- **Interactive Live Preview**: Real-time PDF preview powered by `pdf.js` with page navigation and instant overlay updates.
- **Page Range Selection**: Apply watermarks to all pages or selective ranges (e.g. `1, 3, 5-7`, `even`, `odd`).
- **Multi-Layer Support**: Layer multiple text and image watermarks onto the same document.
- **100% Client-Side**: Embedded directly with `pdf-lib` vector precision with zero uploads or watermarks.

### 8. Rotate PDF (`/tools/rotate-pdf.html` or `/rotate-pdf`)
- **Visual Page Grid**: High-resolution thumbnails rendered dynamically with `pdf.js`.
- **Individual & Bulk Rotation**: Click any page to rotate +90° clockwise, right-click for counterclockwise, or rotate all / selected pages together.
- **Selective Page Controls**: Multi-select pages with checkboxes and batch rotate.
- **Live Angle Badges**: Real-time orientation angle indicator (0°, 90°, 180°, 270°) and instant CSS transform animation.
- **100% Client-Side**: Rotates orientation tags directly with `pdf-lib` with zero server uploads, 100% quality retention, and smart filename generation (`rotated_YYYYMMDD_HHMM.pdf`).

### 9. Crop PDF (`/tools/crop-pdf.html` or `/crop-pdf`)
- **Interactive Visual Crop Box**: 8 draggable corner and edge handles with rule-of-thirds grid overlay.
- **Standard Aspect Ratios**: Free crop, A4 ratio, Letter, Square (1:1), and 16:9 widescreen presets.
- **Instant Margin Trimming**: 1-click removal of 10mm, 20mm, or 30mm page margins.
- **Undo / Redo History**: Full history state stack to easily revert or restore crop adjustments.
- **Selective Page Targeting**: Apply crop boundaries to all pages or selective ranges (e.g. `1, 3, 5-7`).
- **100% Client-Side**: Updates `CropBox` natively in `pdf-lib` with zero quality degradation or uploads.

### 10. Remove & Reorder PDF Pages (`/tools/reorder-pdf.html` or `/reorder-pdf`)
- **Visual Thumbnail Grid**: 100x130px thumbnails rendered in real-time with `pdf.js` with instant in-memory image caching.
- **Drag-and-Drop Reordering**: Rearrange pages seamlessly by dragging thumbnail cards or handles (⋮⋮), with Prev/Next buttons for mobile.
- **Instant Page Deletion**: Click X on any page card or select multiple pages for bulk deletion.
- **Reverse Sequence & Reset**: One-click sequence flipping or instant restoration to the original document state.
- **Page Navigator**: Jump directly to any page number with smooth scrolling and highlight pulse animation.
- **100% Client-Side Assembly**: Assembles new PDF documents in memory via `pdf-lib` with zero server uploads, 100% vector fidelity, and smart timestamped filenames.

### 11. Flatten PDF (`/tools/flatten-pdf.html` or `/flatten-pdf`)
- **Make Form Fields & Annotations Permanent**: Locks fillable inputs (AcroForm widgets), comments, highlights, and stamps into static page content.
- **Smart Element Detection**: Scans and reports counts of form fields and annotations across all pages.
- **Interactive Live Preview**: Real-time PDF preview with visual highlight overlay boxes differentiating form fields (blue) and annotations (amber).
- **Granular Flatten Options**: Choose to flatten form fields only, annotations only, or both together.
- **Irreversible Action Warning**: Clear amber warning banner explaining permanent changes while preserving the untouched local file.
- **Before & After Size Comparison**: Live file size difference reporting with percentage savings badge.
- **100% In-Browser Privacy**: Powered by `pdf-lib` and `pdf.js` with zero server uploads and smart file naming (`[name]_flattened_YYYYMMDD_HHMM.pdf`).

### 12. Grayscale PDF (`/tools/grayscale-pdf.html` or `/grayscale-pdf`)
- **Convert Color to Black & White**: High-fidelity Rec. 601 luminance filter converting full color PDFs to clean monochrome.
- **Side-by-Side Live Comparison**: Interactive side-by-side or toggleable preview comparing original color vs grayscale.
- **Size Reduction Estimate**: Eliminates color channels, shrinking file size by 20–40% with live before/after size comparisons.
- **Zoom & Page Navigator**: Responsive zoom slider (50%–200%) and multi-page preview controls.
- **Batch Processing & ZIP Archive**: Process single or multiple PDFs simultaneously with individual or one-click ZIP download.
- **Already Grayscale Detection**: Proactively samples canvas pixels to alert users if a document is already monochrome.
- **100% Client-Side Privacy**: Runs in browser memory with zero server uploads and smart file naming (`[name]_grayscale_YYYYMMDD_HHMM.pdf`).

### 13. Add Page Numbers to PDF (`/tools/page-numbers-pdf.html` or `/page-numbers-pdf`)
- **9 Preset Positions & Custom Coordinates**: 3x3 layout selector (Top-Left to Bottom-Right) plus millimeter coordinate inputs.
- **Multiple Numbering Formats**: Simple (`1, 2, 3`), with prefix (`Page 1`), roman numerals (`I, II, III`), and total count (`Page 1 of 10`).
- **Typography & Style Controls**: 5 standard vector fonts, font size slider (8–24 pt), color picker with palette presets, and opacity slider.
- **Flexible Range & Skip Controls**: Exclude cover pages (skip first N), skip appendix pages (skip last N), and custom starting sequence number.
- **Interactive Live Preview**: Real-time overlay preview on actual PDF page canvas powered by `pdf.js` with page navigation.
- **Batch Numbering & ZIP Export**: Number multiple PDFs simultaneously with individual or one-click ZIP download.
- **100% In-Browser Vector Rendering**: Direct vector font drawing in `pdf-lib` with zero server uploads and smart file naming (`[name]_numbered_YYYYMMDD_HHMM.pdf`).

### 14. Edit PDF Metadata (`/tools/edit-pdf-metadata.html` or `/edit-pdf-metadata`)
- **Inspect Original Metadata**: Read-only view of existing Title, Author, Subject, Keywords, Creator application, Producer, Creation Date, and Modification Date.
- **Interactive Property Editing**: Text fields to edit or enrich document properties with comma-separated keyword tagging.
- **Remove All Metadata (One-Click Cleanse)**: Strip author, title, software, and organization traces to protect privacy before sharing documents publicly.
- **Live Before/After Comparison Table**: Real-time diff table highlighting unchanged, added, modified, and removed attributes.
- **Privacy Advisory Banner**: Clear guidance on sensitive information embedded in PDF metadata dictionaries.
- **100% Client-Side In-Browser Execution**: PDF dictionary manipulation via `pdf-lib` with zero server uploads, progress indicators, and smart file naming (`[name]_metadata_YYYYMMDD_HHMM.pdf`).

### 15. Stamp PDF (`/tools/stamp-pdf.html` or `/stamp-pdf`)
- **8 Preset Rubber Stamps**: High-definition digital rubber stamps for `APPROVED`, `DRAFT`, `CONFIDENTIAL`, `FINAL`, `REJECTED`, `COPY`, `URGENT`, and `FOR REVIEW`.
- **Custom Text & Formatting**: Custom stamp text with dynamic auto-fitting, subtitle/date lines, 5 vector fonts, 4 border styles (double, solid, dashed, none), and complete RGB/HEX color palette.
- **Logo & Image Upload**: Upload custom company logos or transparent signatures in PNG, SVG, JPG, or WebP formats.
- **Full Stamp Customization**: Size slider (50%–200%), opacity control (30%–100%), and rotation slider with quick angle presets (-45° to +45°).
- **Interactive Live Drag & 9-Point Alignment**: 3x3 layout alignment grid plus direct drag-and-drop repositioning anywhere on the real-time `pdf.js` page canvas.
- **Multi-Stamp Stacking & Page Ranges**: Configure multiple independent stamps across specific pages or the entire document.
- **100% Client-Side In-Browser Assembly**: High-precision vector image embedding using `pdf-lib` with zero server uploads and smart file naming (`[name]_stamped_YYYYMMDD_HHMM.pdf`).

### 16. Invoice Generator (`/tools/invoice-generator.html` or `/invoice-generator`)
- **5 Professional Designer Templates**: Modern Minimalist, Corporate Executive, Creative Studio, Classic Formal, and Tech Startup.
- **Live Side-by-Side A4 Preview**: Instant, real-time rendering of all business information, client details, line items, and totals as you type.
- **Auto-Calculations**: Automatic computation of line item amounts (`qty × rate`), subtotal, percentage tax, percentage or fixed discount, and balance due.
- **Multi-Currency Support**: Instant formatting in USD ($), EUR (€), GBP (£), CAD ($), AUD ($), BDT (৳), INR (₹), JPY (¥), and CHF (Fr).
- **Logo Upload & Brand Identity**: Upload business logo with instant preview and safe size scaling.
- **Vector PDF Export & Print Styles**: High-DPI canvas-to-PDF rendering (`html2canvas` + `jsPDF`) and clean `@media print` layout for printer-ready output.
- **Draft Auto-Saving**: Automatically saves and restores draft invoices in `localStorage` without sending any financial data to external servers.

### 17. Image to PDF Converter (`/tools/image-to-pdf.html` or `/image-to-pdf`)
- **Multi-Format Image Support**: Convert JPG, JPEG, PNG, and WebP images into a single multi-page PDF document.
- **Batch Processing (Up to 50 Images)**: Drag and drop or browse up to 50 images at once with file size checking and safety warnings.
- **Interactive Drag-to-Reorder Grid**: Seamless drag-and-drop reordering of image sequence with touch-friendly step buttons and sequence badges (`#1, #2, ...`).
- **Flexible Page Layout & Sizing**: Support for standard A4, US Letter, and Fit to Image (proportional sizing matching image aspect ratio).
- **Orientation Controls**: Portrait, Landscape, or Auto (dynamically detects portrait or landscape orientation per image).
- **Custom Margin Options**: None (0mm full bleed), Small (10mm), or Large (20mm).
- **Quality & Resolution Presets**: High (300 DPI for print quality) and Medium (150 DPI for compact web distribution).
- **Smart Progress Tracking & File Naming**: Live animated modal with percentage progress bar and timestamped filename (`images_YYYYMMDD_HHMM.pdf`).
- **100% Client-Side Privacy**: Built with `jsPDF` executing entirely inside browser memory with zero server uploads.

### 6. Image Format Converter (`/tools/image-converter.html` or `/image-converter`)
- In-browser conversion across JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, ICO, and SVG.
- Live Before/After interactive thumbnail slider and zoom comparison modal.

### 6. Image Compressor (`/tools/image-compressor.html` or `/image-compressor`)
- Lossy & lossless client-side image compression with target size search and batch ZIP downloads.

### 4. Other Utilities
- Image-to-Text OCR (Tesseract.js WASM)
- QR Code Generator
- JSON Formatter & Validator
- Discount & Sale Calculator
- Universal Unit Converter
- Chronological Age Calculator
- Word & Character Counter

---

## 🚀 Running Locally

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Start the production server**:
   ```bash
   npm start
   ```
