import { SampleImage } from '../types';

/**
 * Programmatically generates high-quality realistic document images as Data URLs.
 * This guarantees offline, immediate testability without depending on external asset hosts.
 */
function createReceiptImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border & subtle receipt texture
  ctx.strokeStyle = '#e2ded5';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  // Header text
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 26px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BLUE BIRD CAFE & ROASTERY', 300, 70);

  ctx.font = '16px "Courier New", Courier, monospace';
  ctx.fillText('1042 Market Street, Suite 400', 300, 100);
  ctx.fillText('San Francisco, CA 94103', 300, 125);
  ctx.fillText('Tel: (415) 555-0198', 300, 150);

  // Dashed divider
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(40, 175);
  ctx.lineTo(560, 175);
  ctx.stroke();
  ctx.setLineDash([]);

  // Receipt info
  ctx.textAlign = 'left';
  ctx.font = '15px "Courier New", Courier, monospace';
  ctx.fillText('ORDER: #4891', 40, 210);
  ctx.fillText('DATE: 2026-09-15  10:24 AM', 40, 235);
  ctx.fillText('SERVER: Alex M.       TABLE: 12', 40, 260);

  // Divider
  ctx.beginPath();
  ctx.moveTo(40, 280);
  ctx.lineTo(560, 280);
  ctx.stroke();

  // Column header
  ctx.font = 'bold 15px "Courier New", Courier, monospace';
  ctx.fillText('QTY  ITEM                         PRICE', 40, 310);

  // Divider
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(40, 325);
  ctx.lineTo(560, 325);
  ctx.stroke();
  ctx.setLineDash([]);

  // Items
  ctx.font = '16px "Courier New", Courier, monospace';
  const items = [
    { qty: '1', name: 'Oat Milk Flat White', price: '$5.50' },
    { qty: '2', name: 'Almond Croissant', price: '$8.50' },
    { qty: '1', name: 'Avocado Sourdough Toast', price: '$14.00' },
    { qty: '1', name: 'Cold Brew Reserve (16oz)', price: '$6.25' },
    { qty: '1', name: 'Sparkling Mineral Water', price: '$3.50' }
  ];

  let y = 360;
  items.forEach(item => {
    ctx.fillText(`${item.qty}    ${item.name.padEnd(27, ' ')} ${item.price}`, 40, y);
    y += 35;
  });

  // Summary divider
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(560, y);
  ctx.stroke();

  y += 35;
  ctx.font = '16px "Courier New", Courier, monospace';
  ctx.fillText('SUBTOTAL:                             $37.75', 40, y);
  y += 28;
  ctx.fillText('SALES TAX (8.625%):                    $3.26', 40, y);
  y += 32;
  ctx.font = 'bold 20px "Courier New", Courier, monospace';
  ctx.fillText('TOTAL DUE:                            $41.01', 40, y);

  y += 50;
  ctx.font = '14px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAYMENT METHOD: VISA ENDING IN 9042', 300, y);
  y += 25;
  ctx.fillText('APPROVED - AUTH #082914', 300, y);
  y += 35;
  ctx.font = 'italic 16px "Courier New", Courier, monospace';
  ctx.fillText('Thank you for visiting Blue Bird Cafe!', 300, y);

  return canvas.toDataURL('image/png');
}

function createArticleImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#e4e4e7';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Title
  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE ESSENCE OF MODERN ARCHITECTURE', 60, 80);

  // Subtitle
  ctx.fillStyle = '#52525b';
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText('Simplicity, Form and Sustainable Harmony in Urban Design', 60, 115);

  // Metadata
  ctx.fillStyle = '#71717a';
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Published on September 15, 2026 • By Elena Rostova', 60, 150);

  // Divider line
  ctx.strokeStyle = '#d4d4d8';
  ctx.beginPath();
  ctx.moveTo(60, 170);
  ctx.lineTo(660, 170);
  ctx.stroke();

  // Paragraph 1
  ctx.fillStyle = '#18181b';
  ctx.font = '18px Georgia, serif';
  const p1 = [
    'Architecture is not merely the construction of shelter; it is the physical',
    'manifestation of human aspiration and cultural balance. When we craft spaces',
    'with natural daylight, sustainable timbers, and acoustic clarity, we transform',
    'ordinary rooms into sanctuaries of daily inspiration.'
  ];
  let y = 215;
  p1.forEach(line => {
    ctx.fillText(line, 60, y);
    y += 32;
  });

  // Subheading
  y += 15;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('Key Principles of Minimalist Design', 60, y);

  // Bullet points
  y += 40;
  ctx.font = '18px Georgia, serif';
  const bullets = [
    '• 1. Intentional negative space creates mental calm and focus.',
    '• 2. Unadorned structural honesty celebrates raw materials.',
    '• 3. Passive solar orientation reduces thermal footprint.',
    '• 4. Ergonomic circulation paths guide natural human movement.'
  ];
  bullets.forEach(bullet => {
    ctx.fillText(bullet, 60, y);
    y += 34;
  });

  // Conclusion
  y += 20;
  const p2 = [
    'Every architectural line drawn carries ethical weight. As our urban centers',
    'expand, our structures must remain human-scaled, enduring, and respectful.'
  ];
  p2.forEach(line => {
    ctx.fillText(line, 60, y);
    y += 32;
  });

  return canvas.toDataURL('image/png');
}

function createNoticeImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#fefce8'; // soft warning yellow paper
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Double border
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  // Header Banner
  ctx.fillStyle = '#b45309';
  ctx.fillRect(34, 34, canvas.width - 68, 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IMPORTANT NOTICE', canvas.width / 2, 78);

  ctx.fillStyle = '#1c1917';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('BUILDING ACCESS & SECURITY PROTOCOL', canvas.width / 2, 140);

  ctx.textAlign = 'left';
  ctx.font = '17px Arial, sans-serif';
  const lines = [
    'Attention all building tenants, employees, and authorized visitors:',
    '',
    '1. Valid ID badges must be clearly displayed at all times.',
    '2. Delivery couriers must report to the Security Desk on Level 1.',
    '3. Emergency exit doors are alarmed 24/7. Do not prop doors open.',
    '4. After-hours entry requires biometric keycard verification.',
    '',
    'For security inquiries or emergency assistance, contact:'
  ];

  let y = 180;
  lines.forEach(l => {
    if (l) {
      ctx.fillText(l, 60, y);
    }
    y += 28;
  });

  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillStyle = '#b45309';
  ctx.fillText('CAMPUS SECURITY OPERATIONS: (800) 555-SAFE', 60, y);
  y += 28;
  ctx.font = 'italic 15px Arial, sans-serif';
  ctx.fillStyle = '#78716c';
  ctx.fillText('Effective Date: September 2026 • Directorate of Safety', 60, y);

  return canvas.toDataURL('image/png');
}

export function getSampleImages(): SampleImage[] {
  return [
    {
      id: 'receipt',
      title: 'Cafe Receipt',
      description: 'Cafe receipt with tabular layout and pricing',
      category: 'Financial',
      dataUrl: createReceiptImage()
    },
    {
      id: 'article',
      title: 'Article Page',
      description: 'Clean article with headlines and bulleted list',
      category: 'Document',
      dataUrl: createArticleImage()
    },
    {
      id: 'notice',
      title: 'Security Notice',
      description: 'Public notice with warnings and instructions',
      category: 'Signage',
      dataUrl: createNoticeImage()
    }
  ];
}
