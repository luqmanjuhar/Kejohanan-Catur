const fs = require('fs');

const content = `import { jsPDF } from 'jspdf';
import { Registration, ECertTemplate } from '../types';

export const getDirectImageUrl = (url: string, forCanvas: boolean = false): string => {
  if (!url) return '';
  
  const driveRegex = /drive\\.google\\.com\\/file\\/d\\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  
  const openRegex = /drive\\.google\\.com\\/open\\?id=([a-zA-Z0-9_-]+)/;
  const matchOpen = url.match(openRegex);
  
  const id = (match && match[1]) || (matchOpen && matchOpen[1]);
  
  if (id) {
    if (forCanvas) {
      // uc endpoint supports CORS, allowing jsPDF to read the image pixels.
      return \`https://drive.google.com/uc?export=view&id=\${id}\`;
    } else {
      // thumbnail API bypasses iframe restrictions for preview, but no CORS headers.
      return \`https://drive.google.com/thumbnail?id=\${id}&sz=w1500\`;
    }
  }

  return url;
};

// Robust image loader with CORS proxy fallbacks
const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load"));
    img.src = src;
  });

  try {
    // 1. First try original URL (with cache-buster to prevent caching without CORS headers)
    const urlWithCb = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    return await load(urlWithCb);
  } catch (err1) {
    try {
      // 2. Try with generic CORS proxy
      return await load(\`https://corsproxy.io/?\${encodeURIComponent(url)}\`);
    } catch (err2) {
      // 3. Try with another proxy
      return await load(\`https://api.allorigins.win/raw?url=\${encodeURIComponent(url)}\`);
    }
  }
};

export const generateECertsPDF = async (data: Registration, ecertTemplate: ECertTemplate) => {
  if (!ecertTemplate.backgroundUrl) {
    throw new Error("URL Background E-Cert tidak dijumpai dalam tetapan.");
  }

  // Load background image
  let img;
  try {
    // getDirectImageUrl with true ensures we get the CORS-friendly uc?export=view
    const finalUrl = getDirectImageUrl(ecertTemplate.backgroundUrl, true);
    img = await loadImage(finalUrl);
  } catch (error) {
    throw new Error("Gagal memuatkan gambar background sijil. Pastikan URL sah dan membenarkan akses terbuka.");
  }

  // Calculate PDF dimensions (based on user setting or image aspect ratio)
  const isLandscape = ecertTemplate.orientation === 'portrait' ? false : (ecertTemplate.orientation === 'landscape' ? true : img.width > img.height);
  const orientation = isLandscape ? 'l' : 'p';
  const format = 'a4'; // standard A4
  
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const students = Array.isArray(data.students) ? data.students : [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    
    if (i > 0) {
      pdf.addPage();
    }

    // Add background
    pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Add texts
    const fields = ecertTemplate.fields;
    
    const drawText = (field: any, text: string) => {
      if (!field || !field.show || !text) return;
      
      pdf.setFontSize(field.fontSize || 20);
      pdf.setTextColor(field.color || '#000000');
      
      const xMm = (field.x / 100) * pdfWidth;
      const yMm = (field.y / 100) * pdfHeight;
      
      pdf.text(text.toUpperCase(), xMm, yMm, { align: field.align || 'center' });
    };

    drawText(fields.name, s.name);
    drawText(fields.ic, s.ic);
    drawText(fields.school, data.schoolName);
    drawText(fields.category, s.category);
  }

  pdf.save(\`Sijil_\${ecertTemplate.name}_\${data.schoolCode}_\${data.schoolName}.pdf\`);
};
`;

fs.writeFileSync('utils/ecert.ts', content);
