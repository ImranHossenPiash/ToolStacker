import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          about: path.resolve(__dirname, 'about.html'),
          terms: path.resolve(__dirname, 'terms.html'),
          blogs: path.resolve(__dirname, 'blogs.html'),
          privacy: path.resolve(__dirname, 'privacy.html'),
          contact: path.resolve(__dirname, 'contact.html'),
          imageToText: path.resolve(__dirname, 'tools/image-to-text.html'),
          discountCalculator: path.resolve(__dirname, 'tools/discount-calculator.html'),
          wordCounter: path.resolve(__dirname, 'tools/word-counter.html'),
          qrGenerator: path.resolve(__dirname, 'tools/qr-generator.html'),
          qrCodeGenerator: path.resolve(__dirname, 'tools/qr-code-generator.html'),
          jsonFormatter: path.resolve(__dirname, 'tools/json-formatter.html'),
          unitConverter: path.resolve(__dirname, 'tools/unit-converter.html'),
          ageCalculator: path.resolve(__dirname, 'tools/age-calculator.html'),
          profile: path.resolve(__dirname, 'profile.html'),
          imageTools: path.resolve(__dirname, 'image-tools.html'),
          imageCompressor: path.resolve(__dirname, 'tools/image-compressor.html'),
          imageCompressorRoot: path.resolve(__dirname, 'image-compressor.html'),
          imageConverter: path.resolve(__dirname, 'tools/image-converter.html'),
          imageConverterRoot: path.resolve(__dirname, 'image-converter.html'),
          mergePdf: path.resolve(__dirname, 'tools/merge-pdf.html'),
          mergePdfRoot: path.resolve(__dirname, 'merge-pdf.html'),
          splitPdf: path.resolve(__dirname, 'tools/split-pdf.html'),
          splitPdfRoot: path.resolve(__dirname, 'split-pdf.html'),
          compressPdf: path.resolve(__dirname, 'tools/compress-pdf.html'),
          compressPdfRoot: path.resolve(__dirname, 'compress-pdf.html'),
          pdfImageConverter: path.resolve(__dirname, 'tools/pdf-image-converter.html'),
          pdfImageConverterRoot: path.resolve(__dirname, 'pdf-image-converter.html'),
          signPdf: path.resolve(__dirname, 'tools/sign-pdf.html'),
          signPdfRoot: path.resolve(__dirname, 'sign-pdf.html'),
          protectUnlockPdf: path.resolve(__dirname, 'tools/protect-unlock-pdf.html'),
          protectUnlockPdfRoot: path.resolve(__dirname, 'protect-unlock-pdf.html'),
          watermarkPdf: path.resolve(__dirname, 'tools/watermark-pdf.html'),
          watermarkPdfRoot: path.resolve(__dirname, 'watermark-pdf.html'),
          rotatePdf: path.resolve(__dirname, 'tools/rotate-pdf.html'),
          rotatePdfRoot: path.resolve(__dirname, 'rotate-pdf.html'),
          cropPdf: path.resolve(__dirname, 'tools/crop-pdf.html'),
          cropPdfRoot: path.resolve(__dirname, 'crop-pdf.html'),
          reorderPdf: path.resolve(__dirname, 'tools/reorder-pdf.html'),
          reorderPdfRoot: path.resolve(__dirname, 'reorder-pdf.html'),
          flattenPdf: path.resolve(__dirname, 'tools/flatten-pdf.html'),
          flattenPdfRoot: path.resolve(__dirname, 'flatten-pdf.html'),
          grayscalePdf: path.resolve(__dirname, 'tools/grayscale-pdf.html'),
          grayscalePdfRoot: path.resolve(__dirname, 'grayscale-pdf.html'),
          pageNumbersPdf: path.resolve(__dirname, 'tools/page-numbers-pdf.html'),
          pageNumbersPdfRoot: path.resolve(__dirname, 'page-numbers-pdf.html'),
          editPdfMetadata: path.resolve(__dirname, 'tools/edit-pdf-metadata.html'),
          editPdfMetadataRoot: path.resolve(__dirname, 'edit-pdf-metadata.html'),
          stampPdf: path.resolve(__dirname, 'tools/stamp-pdf.html'),
          stampPdfRoot: path.resolve(__dirname, 'stamp-pdf.html'),
          invoiceGenerator: path.resolve(__dirname, 'tools/invoice-generator.html'),
          invoiceGeneratorRoot: path.resolve(__dirname, 'invoice-generator.html'),
          imageToPdf: path.resolve(__dirname, 'tools/image-to-pdf.html'),
          imageToPdfRoot: path.resolve(__dirname, 'image-to-pdf.html'),
          videoToMp3: path.resolve(__dirname, 'tools/video-to-mp3.html'),
          videoToMp3Root: path.resolve(__dirname, 'video-to-mp3.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
