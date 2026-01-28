
import { RegistrationsMap } from '../types';

export const formatSchoolName = (name: string): string => {
  if (!name) return '';
  let formatted = String(name).toUpperCase();
  formatted = formatted.replace(/SEKOLAH KEBANGSAAN/gi, 'SK');
  formatted = formatted.replace(/SEKOLAH MENENGAH KEBANGSAAN AGAMA/gi, 'SMKA');
  formatted = formatted.replace(/SEKOLAH MENENGAH KEBANGSAAN/gi, 'SMK');
  formatted = formatted.replace(/SEKOLAH JENIS KEBANGSAAN \(CINA\)/gi, 'SJKC');
  formatted = formatted.replace(/SEKOLAH JENIS KEBANGSAAN \(TAMIL\)/gi, 'SJKT');
  formatted = formatted.replace(/SEKOLAH JENIS KEBANGSAAN/gi, 'SJK');
  return formatted;
};

export const formatPhoneNumber = (phone: string | number): string => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length >= 11) {
    return cleaned.substring(0, 3) + '-' + cleaned.substring(3, 6) + ' ' + cleaned.substring(6, 11);
  } else if (cleaned.length >= 10) {
    return cleaned.substring(0, 3) + '-' + cleaned.substring(3, 6) + ' ' + cleaned.substring(6, 10);
  }
  return cleaned;
};

export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email));
};

export const isValidMalaysianPhone = (phone: string | number): boolean => {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\D/g, '');
  // Format Malaysia: 01x-xxxxxxxx (10 digit) atau 011-xxxxxxxx (11 digit)
  // Juga terima format antarabangsa 601...
  return (cleaned.startsWith('01') && (cleaned.length === 10 || cleaned.length === 11)) ||
         (cleaned.startsWith('601') && (cleaned.length === 11 || cleaned.length === 12));
};

export const formatIC = (ic: string | number): string => {
  if (!ic) return '';
  let cleaned = String(ic).replace(/\D/g, '');
  if (cleaned.length >= 12) {
    return cleaned.substring(0, 6) + '-' + cleaned.substring(6, 8) + '-' + cleaned.substring(8, 12);
  }
  return cleaned;
};

export const generateRegistrationId = (category: string, registrations: RegistrationsMap): string => {
  let categoryCount = 0;
  Object.values(registrations).forEach(reg => {
    // Safety check: Pastikan students wujud dan adalah array
    if (reg && Array.isArray(reg.students)) {
        const hasCategory = reg.students.some(student => student.category === category);
        if (hasCategory) {
          categoryCount++;
        }
    }
  });

  const categoryCode = category.includes('12') ? '01' : '02';
  const count = String(categoryCount + 1).padStart(2, '0');
  
  return `MSSD-${categoryCode}-${count}`;
};

export const generatePlayerId = (
  gender: string, 
  schoolName: string, 
  studentIndex: number, 
  category: string, 
  regId: string
): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  let categoryCode = '15';
  if (category.includes('12')) {
    categoryCode = '12';
  } else if (category.includes('15')) {
    categoryCode = '15';
  } else if (category.includes('18')) {
    categoryCode = '18';
  }
  const genderCode = gender === 'Lelaki' ? '01' : '02';
  const schoolNo = regId ? regId.split('-').pop()?.padStart(2, '0') ?? '00' : '00';
  const playerCount = String(studentIndex + 1).padStart(2, '0');
  
  return `${year}${categoryCode}${genderCode}${schoolNo}${playerCount}`;
};

export const getWhatsAppLink = (regId: string, data: any, type: 'create' | 'update', adminPhone: string | number): string => {
    // Pastikan adminPhone ditukar kepada string dan tidak kosong
    const phoneStr = String(adminPhone || '').trim();
    if (!phoneStr) return '';
    
    // Buang aksara bukan nombor
    let targetPhone = phoneStr.replace(/\D/g, '');
    
    // Normalize phone number for WhatsApp (Malaysia context primarily)
    if (targetPhone.startsWith('01')) {
        targetPhone = '6' + targetPhone;
    } else if (targetPhone.startsWith('1')) {
        // Handle cases where 0 might be omitted but it's a mobile number (rare but possible user entry)
        targetPhone = '60' + targetPhone;
    }
    
    // Verify we have a usable number length (min 10 digits for international format)
    if (targetPhone.length < 10) return '';

    const isUpdate = type === 'update';
    const categoryCounts: Record<string, number> = {
        'L12': 0, 'P12': 0, 'L15': 0, 'P15': 0, 'L18': 0, 'P18': 0
    };
    if (data && data.students && Array.isArray(data.students)) {
        data.students.forEach((student: any) => {
            if (!student.gender || !student.category) return;
            const genderCode = student.gender === 'Lelaki' ? 'L' : 'P';
            // Extract age safely
            let ageCode = '12';
            if (student.category.includes('15')) ageCode = '15';
            else if (student.category.includes('18')) ageCode = '18';
            else if (student.category.includes('12')) ageCode = '12';

            const key = genderCode + ageCode;
            if (categoryCounts[key] !== undefined) categoryCounts[key]++;
        });
    }
    
    const categoryBreakdown: string[] = [];
    Object.entries(categoryCounts).forEach(([k, v]) => {
        if (v > 0) categoryBreakdown.push(`${k}: ${v}`);
    });
    const categoryText = categoryBreakdown.join(', ');
    
    const title = isUpdate ? '📢 *KEMASKINI PENDAFTARAN*' : '📢 *PENDAFTARAN BARU*';
    const actionText = isUpdate ? 'mengemaskini pendaftaran' : 'mendaftar';
    
    // Safety checks for undefined data
    const schoolName = (data?.schoolName || 'Tidak dinyatakan').trim();
    const teacherName = (data?.teachers?.[0]?.name || 'Tidak dinyatakan').trim();
    const teacherPhone = (data?.teachers?.[0]?.phone || 'Tidak dinyatakan').trim();
    const totalStudents = data?.students?.length || 0;

    const messageLines = [
        title,
        `Salam Sejahtera, saya baru ${actionText} untuk *Kejohanan Catur MSSD Pasir Gudang*.`,
        '',
        `🏫 *${schoolName}*`,
        `🆔 ID: *${regId}*`,
        `👤 Guru: ${teacherName}`,
        `📱 Tel: ${teacherPhone}`,
        `👥 Peserta: ${totalStudents} orang`,
        `📊 Pecahan: ${categoryText}`,
        '',
        'Mohon pengesahan penerimaan. Terima kasih. 🙏'
    ];
    
    const message = encodeURIComponent(messageLines.join('\n'));
    return `https://wa.me/${targetPhone}?text=${message}`;
};
