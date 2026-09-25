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
      // Untuk PDF, kita guna uc?export=download yang lebih sesuai untuk ditarik sebagai fail raw
      return \`https://drive.google.com/uc?id=\${id}&export=download\`;
    } else {
      // Untuk preview HTML sahaja
      return \`https://drive.google.com/thumbnail?id=\${id}&sz=w1500\`;
    }
  }

  return url;
};

// Fungsi memuatkan imej yang lebih kebal CORS (Multiple Fallbacks)
const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const loadFromSrc = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Kalau ia base64 data URI, kita tak perlukan Anonymous
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load from src"));
    img.src = src;
  });

  // Cuba 1: Guna proxy AllOrigins (paling stabil untuk Google Drive - pulangkan base64)
  try {
    const response = await fetch(\`https://api.allorigins.win/get?url=\${encodeURIComponent(url)}\`);
    const data = await response.json();
    if (data && data.contents && data.contents.startsWith('data:image')) {
      return await loadFromSrc(data.contents);
    }
  } catch (err) {
    console.warn("AllOrigins base64 failed", err);
  }

  // Cuba 2: Guna CORS Proxy IO
  try {
    return await loadFromSrc(\`https://corsproxy.io/?\${encodeURIComponent(url)}\`);
  } catch (err) {
    console.warn("corsproxy.io failed", err);
  }

  // Cuba 3: Tarik direct dengan parameter cache-buster
  try {
    const urlWithCb = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    return await loadFromSrc(urlWithCb);
  } catch (err) {
    console.warn("Direct load failed", err);
  }

  throw new Error("Semua proksi gagal memuat turun gambar.");
};

export const generateECertsPDF = async (data: Registration, ecertTemplate: ECertTemplate) => {
  if (!ecertTemplate.backgroundUrl) {
    throw new Error("URL Background E-Cert tidak dijumpai dalam tetapan.");
  }

  // Load background image
  let img;
  try {
    const finalUrl = getDirectImageUrl(ecertTemplate.backgroundUrl, true);
    img = await loadImage(finalUrl);
  } catch (error) {
    console.error(error);
    throw new Error("Gagal memuatkan gambar background sijil. Pastikan URL sah dan membenarkan akses terbuka (Anyone with the link).");
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
`

fs.writeFileSync('utils/ecert.ts', content);
