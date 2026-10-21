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

/**
 * Memecahkan nama panjang kepada 2 baris yang seimbang mengikut tatabahasa nama Malaysia
 * (Contoh: pembahagian di BIN, BINTI, A/L, A/P, ANAK atau ruang perkataan paling seimbang)
 */
export const splitNameToTwoLines = (name: string): [string, string] => {
  const clean = (name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return ['', ''];

  // 1. Semak penanda bapa/keturunan seperti BIN, BINTI, A/L, A/P, ANAK, S/O, D/O, B., BT.
  const patronymicRegex = /\s+(BIN|BINTI|B\.|BT\.|A\/L|A\/P|ANAK|S\/O|D\/O)\s+/i;
  const match = clean.match(patronymicRegex);

  if (match && match.index !== undefined) {
    const splitIndex = match.index;
    const part1 = clean.substring(0, splitIndex).trim();
    const part2 = clean.substring(splitIndex).trim();

    if (part1.length >= 3 && part2.length >= 3) {
      return [part1, part2];
    }
  }

  // 2. Jika tiada kata kunci atau nama bukan format di atas, pecahkan pada ruang perkataan (space)
  // yang paling hampir dengan titik tengah (50% panjang teks)
  const words = clean.split(' ');
  if (words.length <= 1) {
    return [clean, ''];
  }

  const targetMid = clean.length / 2;
  let bestIndex = 1;
  let minDiff = Infinity;
  let currentLen = 0;

  for (let i = 0; i < words.length - 1; i++) {
    currentLen += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(currentLen - targetMid);
    if (diff < minDiff) {
      minDiff = diff;
      bestIndex = i + 1;
    }
  }

  const part1 = words.slice(0, bestIndex).join(' ');
  const part2 = words.slice(bestIndex).join(' ');
  return [part1, part2];
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
    
    const drawText = (field: any, text: string, isNameField: boolean = false) => {
      if (!field || !field.show || !text) return;
      
      const fontParts = (field.fontFamily || 'helvetica').split('-');
      const fontName = fontParts[0];
      const fontStyle = fontParts[1] || 'normal';
      
      pdf.setFont(fontName, fontStyle);
      const fontSize = field.fontSize || 20;
      pdf.setFontSize(fontSize);
      pdf.setTextColor(field.color || '#000000');
      
      const xMm = (field.x / 100) * pdfWidth;
      const yMm = (field.y / 100) * pdfHeight;
      
      // Had lebar maksimum teks (%)
      // Lalai: 75% untuk nama dan sekolah agar tidak melimpah keluar dari bingkai sijil
      const defaultMaxWidth = (isNameField || field === fields.school) ? 75 : 0;
      const effectiveMaxWidthPercent = (field.maxWidth && field.maxWidth > 0) ? field.maxWidth : defaultMaxWidth;
      const maxAllowedWidth = effectiveMaxWidthPercent > 0 ? (effectiveMaxWidthPercent / 100) * pdfWidth : 0;

      const cleanText = text.toUpperCase().trim();
      let lines: string[] = [];

      // Semak lebar sebenar teks dalam mm
      const textWidthMm = (pdf.getStringUnitWidth(cleanText) * fontSize) * (25.4 / 72);
      const isTooWide = maxAllowedWidth > 0 && textWidthMm > maxAllowedWidth;

      if (isNameField && (isTooWide || cleanText.length > 28)) {
        // Gunakan pemisah nama pintar 2 baris
        const [p1, p2] = splitNameToTwoLines(cleanText);
        if (p2) {
          lines = [p1, p2];
        } else if (maxAllowedWidth > 0) {
          lines = pdf.splitTextToSize(cleanText, maxAllowedWidth);
        } else {
          lines = [cleanText];
        }
      } else if (isTooWide) {
        lines = pdf.splitTextToSize(cleanText, maxAllowedWidth);
      } else {
        lines = [cleanText];
      }

      const align = field.align || 'center';
      const textOptions: any = { align };

      // Pelarasan Menegak Seimbang (Vertical Auto-Centering):
      // Jika teks menjadi 2 baris atau lebih, baris-baris berpusat tepat pada koordinat Y
      // tanpa menolak baris kedua melanggar teks/garisan lain di bawahnya.
      const lineHeightMm = (fontSize * 1.18) * (25.4 / 72);
      const totalBlockHeightMm = (lines.length - 1) * lineHeightMm;
      const startYMm = yMm - (totalBlockHeightMm / 2);

      if (lines.length > 1) {
        lines.forEach((line, index) => {
          pdf.text(line, xMm, startYMm + (index * lineHeightMm), textOptions);
        });
      } else {
        pdf.text(lines[0] || cleanText, xMm, yMm, textOptions);
      }
    };

    drawText(fields.name, s.name, true);
    drawText(fields.ic, s.ic, false);
    drawText(fields.school, data.schoolName, false);
    drawText(fields.category, s.category, false);
  }

  pdf.save(`Sijil_${ecertTemplate.name}_${data.schoolCode}_${data.schoolName}.pdf`);
};
