import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // URL rewrite for clean routes
  app.use((req, res, next) => {
    const p = req.path;
    if (p === '/image-tools' || p === '/image-tools/') {
      req.url = '/image-tools.html';
      return next();
    }
    if (p === '/tools/image-compressor' || p === '/tools/image-compressor/' || p === '/image-compressor' || p === '/image-compressor/' || p === '/image-compressor.html') {
      req.url = '/tools/image-compressor.html';
      return next();
    }
    if (p === '/tools/image-converter' || p === '/tools/image-converter/' || p === '/image-converter' || p === '/image-converter/' || p === '/image-converter.html') {
      req.url = '/tools/image-converter.html';
      return next();
    }
    if (p === '/tools/merge-pdf' || p === '/tools/merge-pdf/' || p === '/merge-pdf' || p === '/merge-pdf/' || p === '/merge-pdf.html') {
      req.url = '/tools/merge-pdf.html';
      return next();
    }
    if (p === '/tools/split-pdf' || p === '/tools/split-pdf/' || p === '/split-pdf' || p === '/split-pdf/' || p === '/split-pdf.html') {
      req.url = '/tools/split-pdf.html';
      return next();
    }
    if (p === '/tools/compress-pdf' || p === '/tools/compress-pdf/' || p === '/compress-pdf' || p === '/compress-pdf/' || p === '/compress-pdf.html') {
      req.url = '/tools/compress-pdf.html';
      return next();
    }
    if (p === '/tools/pdf-image-converter' || p === '/tools/pdf-image-converter/' || p === '/pdf-image-converter' || p === '/pdf-image-converter/' || p === '/pdf-image-converter.html' || p === '/pdf-to-image') {
      req.url = '/tools/pdf-image-converter.html';
      return next();
    }
    if (
      p === '/tools/image-to-pdf' ||
      p === '/tools/image-to-pdf/' ||
      p === '/image-to-pdf' ||
      p === '/image-to-pdf/' ||
      p === '/image-to-pdf.html' ||
      p === '/tools/jpg-to-pdf' ||
      p === '/tools/jpg-to-pdf/' ||
      p === '/jpg-to-pdf' ||
      p === '/jpg-to-pdf/' ||
      p === '/tools/png-to-pdf' ||
      p === '/tools/png-to-pdf/' ||
      p === '/png-to-pdf' ||
      p === '/png-to-pdf/'
    ) {
      req.url = '/tools/image-to-pdf.html';
      return next();
    }
    if (p === '/tools/sign-pdf' || p === '/tools/sign-pdf/' || p === '/sign-pdf' || p === '/sign-pdf/' || p === '/sign-pdf.html') {
      req.url = '/tools/sign-pdf.html';
      return next();
    }
    if (
      p === '/tools/protect-unlock-pdf' ||
      p === '/tools/protect-unlock-pdf/' ||
      p === '/protect-unlock-pdf' ||
      p === '/protect-unlock-pdf/' ||
      p === '/protect-unlock-pdf.html' ||
      p === '/tools/protect-pdf' ||
      p === '/tools/protect-pdf/' ||
      p === '/protect-pdf' ||
      p === '/protect-pdf/' ||
      p === '/protect-pdf.html' ||
      p === '/tools/unlock-pdf' ||
      p === '/tools/unlock-pdf/' ||
      p === '/unlock-pdf' ||
      p === '/unlock-pdf/' ||
      p === '/unlock-pdf.html'
    ) {
      req.url = '/tools/protect-unlock-pdf.html';
      return next();
    }
    if (
      p === '/tools/watermark-pdf' ||
      p === '/tools/watermark-pdf/' ||
      p === '/watermark-pdf' ||
      p === '/watermark-pdf/' ||
      p === '/watermark-pdf.html'
    ) {
      req.url = '/tools/watermark-pdf.html';
      return next();
    }
    if (
      p === '/tools/rotate-pdf' ||
      p === '/tools/rotate-pdf/' ||
      p === '/rotate-pdf' ||
      p === '/rotate-pdf/' ||
      p === '/rotate-pdf.html'
    ) {
      req.url = '/tools/rotate-pdf.html';
      return next();
    }
    if (
      p === '/tools/crop-pdf' ||
      p === '/tools/crop-pdf/' ||
      p === '/crop-pdf' ||
      p === '/crop-pdf/' ||
      p === '/crop-pdf.html'
    ) {
      req.url = '/tools/crop-pdf.html';
      return next();
    }
    if (
      p === '/tools/reorder-pdf' ||
      p === '/tools/reorder-pdf/' ||
      p === '/reorder-pdf' ||
      p === '/reorder-pdf/' ||
      p === '/reorder-pdf.html' ||
      p === '/tools/remove-reorder-pdf' ||
      p === '/tools/remove-reorder-pdf/' ||
      p === '/remove-reorder-pdf' ||
      p === '/remove-reorder-pdf/' ||
      p === '/remove-reorder-pdf.html'
    ) {
      req.url = '/tools/reorder-pdf.html';
      return next();
    }
    if (
      p === '/tools/flatten-pdf' ||
      p === '/tools/flatten-pdf/' ||
      p === '/flatten-pdf' ||
      p === '/flatten-pdf/' ||
      p === '/flatten-pdf.html'
    ) {
      req.url = '/tools/flatten-pdf.html';
      return next();
    }
    if (
      p === '/tools/grayscale-pdf' ||
      p === '/tools/grayscale-pdf/' ||
      p === '/grayscale-pdf' ||
      p === '/grayscale-pdf/' ||
      p === '/grayscale-pdf.html'
    ) {
      req.url = '/tools/grayscale-pdf.html';
      return next();
    }
    if (
      p === '/tools/page-numbers-pdf' ||
      p === '/tools/page-numbers-pdf/' ||
      p === '/page-numbers-pdf' ||
      p === '/page-numbers-pdf/' ||
      p === '/page-numbers-pdf.html' ||
      p === '/tools/add-page-numbers' ||
      p === '/tools/add-page-numbers/' ||
      p === '/add-page-numbers' ||
      p === '/add-page-numbers/' ||
      p === '/add-page-numbers.html'
    ) {
      req.url = '/tools/page-numbers-pdf.html';
      return next();
    }
    if (
      p === '/tools/edit-pdf-metadata' ||
      p === '/tools/edit-pdf-metadata/' ||
      p === '/edit-pdf-metadata' ||
      p === '/edit-pdf-metadata/' ||
      p === '/edit-pdf-metadata.html' ||
      p === '/tools/pdf-metadata' ||
      p === '/tools/pdf-metadata/' ||
      p === '/pdf-metadata' ||
      p === '/pdf-metadata/' ||
      p === '/pdf-metadata.html'
    ) {
      req.url = '/tools/edit-pdf-metadata.html';
      return next();
    }
    if (
      p === '/tools/stamp-pdf' ||
      p === '/tools/stamp-pdf/' ||
      p === '/stamp-pdf' ||
      p === '/stamp-pdf/' ||
      p === '/stamp-pdf.html'
    ) {
      req.url = '/tools/stamp-pdf.html';
      return next();
    }
    if (
      p === '/tools/invoice-generator' ||
      p === '/tools/invoice-generator/' ||
      p === '/invoice-generator' ||
      p === '/invoice-generator/' ||
      p === '/invoice-generator.html' ||
      p === '/tools/invoice' ||
      p === '/tools/invoice/' ||
      p === '/invoice' ||
      p === '/invoice/'
    ) {
      req.url = '/tools/invoice-generator.html';
      return next();
    }
    // Auto-resolve non-extension paths to .html if exists
    if (!path.extname(p) && p !== '/') {
      const clean = p.replace(/^\//, '');
      const rootHtml = path.join(process.cwd(), `${clean}.html`);
      const toolsHtml = path.join(process.cwd(), 'tools', `${clean.replace(/^tools\//, '')}.html`);
      if (fs.existsSync(rootHtml)) {
        req.url = `/${clean}.html`;
      } else if (fs.existsSync(toolsHtml)) {
        req.url = `/tools/${clean.replace(/^tools\//, '')}.html`;
      }
    }
    next();
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const cleanPath = req.path.replace(/^\//, '');
      const possibleHtml = path.join(distPath, cleanPath.endsWith('.html') ? cleanPath : `${cleanPath}.html`);
      if (cleanPath && fs.existsSync(possibleHtml)) {
        return res.sendFile(possibleHtml);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} in use, retrying in 1s...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
