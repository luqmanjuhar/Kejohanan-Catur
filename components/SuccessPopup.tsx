
import React from 'react';
import { CheckCircle, Clipboard, FileText, MessageCircle, Printer } from 'lucide-react';
import RegistrationSlip from './RegistrationSlip';
import { Registration, EventConfig } from '../types';
import { getWhatsAppLink } from '../utils/formatters';

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  regId: string;
  schoolName: string;
  fullData?: Registration;
  eventConfig: EventConfig;
  type?: 'create' | 'update';
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ isOpen, onClose, regId, schoolName, fullData, eventConfig, type = 'create' }) => {
  if (!isOpen) return null;

  // Ensure safeData has ALL required fields with defaults
  const safeData: Registration = {
    ...fullData, // Spread first so defaults override undefined values
    schoolName: fullData?.schoolName || schoolName || 'Sekolah',
    schoolCode: fullData?.schoolCode || '',
    schoolType: fullData?.schoolType || '',
    teachers: (fullData?.teachers && Array.isArray(fullData.teachers)) ? fullData.teachers : [],
    students: (fullData?.students && Array.isArray(fullData.students)) ? fullData.students : [],
    createdAt: fullData?.createdAt || new Date().toISOString(),
    updatedAt: fullData?.updatedAt || new Date().toISOString(),
    status: fullData?.status || 'AKTIF',
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(regId);
    alert("ID Pendaftaran disalin!");
  };

  const handleViewSlip = () => {
    const printContent = document.getElementById('registration-slip-hidden');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Sila benarkan 'popups' untuk melihat slip.");
        return;
    }

    const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>';
    const styles = `
      <style>
        body { background-color: #f3f4f6; padding: 40px 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; background-color: white; -webkit-print-color-adjust: exact; padding-top: 0; }
          #print-controls { display: none !important; }
          #registration-slip { 
            box-shadow: none !important; 
            margin: 0 !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Slip Pendaftaran - ${regId}</title>
          ${tailwindCdn}
          ${styles}
        </head>
        <body>
          <div id="print-controls" class="fixed bottom-8 right-8 flex gap-4 z-50">
            <button onclick="window.print()" class="flex items-center gap-2 bg-orange-600 text-white px-8 py-4 rounded-full shadow-2xl font-black hover:bg-orange-700 transition-all uppercase text-xs tracking-widest cursor-pointer border-2 border-orange-500 hover:scale-105 active:scale-95">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2-2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
               Cetak / Simpan PDF
            </button>
            <button onclick="window.close()" class="bg-white text-gray-700 px-8 py-4 rounded-full shadow-2xl font-black hover:bg-gray-100 transition-all uppercase text-xs tracking-widest cursor-pointer border-2 border-gray-200 hover:scale-105 active:scale-95">
               Tutup
            </button>
          </div>
          
          <div class="flex justify-center p-4">
             ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Safe execution of link generation
  let whatsappLink = '';
  try {
      whatsappLink = getWhatsAppLink(regId, safeData as Registration, type as 'create' | 'update', eventConfig?.adminPhone || '');
  } catch (e) {
      console.error("Error generating WhatsApp Link", e);
  }

  const handleWhatsAppClick = (e: React.MouseEvent) => {
      e.preventDefault();
      
      // Ensure adminPhone is treated as string and trimmed
      const adminPhone = String(eventConfig?.adminPhone || '').trim();

      if (!adminPhone) {
          alert("RALAT: Nombor telefon admin belum ditetapkan dalam sistem. Sila hubungi urusetia.");
          return;
      }
      
      if (!whatsappLink) {
          // Providing slightly more detail in error message
          alert("RALAT: Gagal menjana pautan WhatsApp. Sila pastikan nombor telefon admin sah dan maklumat pendaftaran lengkap.");
          return;
      }

      window.open(whatsappLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      {/* Hidden component for generating HTML with safety check */}
      <div id="registration-slip-hidden" className="hidden">
        {isOpen && <RegistrationSlip regId={regId} data={safeData as Registration} eventConfig={eventConfig} />}
      </div>

      <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden">
        <div className="p-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full animate-bounce">
              <CheckCircle size={64} className="text-green-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-gray-800 mb-2">
             {type === 'create' ? 'Pendaftaran Berjaya!' : 'Kemaskini Berjaya!'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Sila simpan ID pendaftaran atau cetak slip untuk rujukan masa akan datang.
          </p>

          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 mb-8 relative group">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID Pendaftaran</p>
             <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-black text-green-600 font-mono tracking-tighter">{regId}</span>
                <button onClick={copyToClipboard} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-green-600 shadow-sm">
                    <Clipboard size={18} />
                </button>
             </div>
             <p className="mt-4 text-xs font-bold text-gray-700 uppercase">{schoolName}</p>
          </div>

          <div className="space-y-3">
            <button 
                onClick={handleWhatsAppClick}
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-black hover:bg-green-600 transition-all shadow-xl shadow-green-100 flex items-center justify-center gap-3 uppercase text-xs tracking-widest cursor-pointer active:scale-95"
            >
                <MessageCircle size={18} /> Hantar Bukti ke WhatsApp
            </button>
            <button 
                onClick={handleViewSlip}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-3 uppercase text-xs tracking-widest active:scale-95"
            >
                <Printer size={18} /> Lihat Slip & Cetak (PDF)
            </button>
            <button 
                onClick={onClose}
                className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
            >
                Tutup & Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPopup;
