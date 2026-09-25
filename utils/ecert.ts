import { jsPDF } from 'jspdf';
import { Registration, ECertTemplate } from '../types';

export const getDirectImageUrl = (url: string, forCanvas: boolean = false): string => {
  if (!url) return '';
  
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  
  const openRegex = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const matchOpen = url.match(openRegex);
  
  const id = (match && match[1]) || (matchOpen && matchOpen[1]);
  
  if (id) {
    if (forCanvas) {
      // Untuk PDF, kita guna uc?export=download yang lebih sesuai untuk ditarik sebagai fail raw
      return `https://drive.google.com/uc?id=${id}&export=download&confirm=t`;
    } else {
      // Untuk preview HTML sahaja
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1500`;
    }
  }

  return url;
};

// Fungsi memuatkan imej yang lebih kebal CORS (Multiple Fallbacks)
const loadImage = async (url: string): Promise<HTMLImageElement> => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.error("Failed to load image from proxy:", url);
      reject(new Error("Gagal memuat turun gambar melalui proksi pelayan."));
    };
    // Gunakan proksi backend kita sendiri untuk bypass CORS sepenuhnya!
    img.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  });
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
      
      const fontParts = (field.fontFamily || 'helvetica').split('-');
      const fontName = fontParts[0];
      const fontStyle = fontParts[1] || 'normal';
      
      pdf.setFont(fontName, fontStyle);
      pdf.setFontSize(field.fontSize || 20);
      pdf.setTextColor(field.color || '#000000');
      
      const xMm = (field.x / 100) * pdfWidth;
      const yMm = (field.y / 100) * pdfHeight;
      
      const textOptions: any = { align: field.align || 'center' };
      if (field.maxWidth && field.maxWidth > 0) {
        textOptions.maxWidth = (field.maxWidth / 100) * pdfWidth;
      }
      
      pdf.text(text.toUpperCase(), xMm, yMm, textOptions);
    };

    drawText(fields.name, s.name);
    drawText(fields.ic, s.ic);
    drawText(fields.school, data.schoolName);
    drawText(fields.category, s.category);
  }

  pdf.save(`Sijil_${ecertTemplate.name}_${data.schoolCode}_${data.schoolName}.pdf`);
};
