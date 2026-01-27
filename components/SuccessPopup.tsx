
import React, { useRef, useEffect } from 'react';
import { CheckCircle, Clipboard, FileText, X, MessageCircle } from 'lucide-react';
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
  const slipRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(regId);
    alert("ID Pendaftaran disalin!");
  };

  const handlePrint = () => {
    const printContent = document.getElementById('registration-slip-hidden');
    if (!printContent) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.left = '-1000px';
    iframe.style.top = '-1000px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>';
    const styles = `
      <style>
        @media print {
          @page { size: A4; margin: 10mm; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          #registration-slip { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; margin: 0 auto; }
        }
      </style>
    `;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Slip Pendaftaran - ${regId}</title>
          ${tailwindCdn}
          ${styles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    // Wait for content/styles to load then print
    setTimeout(() => {
        if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
        // Clean up iframe after printing (give user time to interact with dialog)
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 2000);
    }, 1000);
  };
  
  // Auto-trigger print when popup opens
  useEffect(() => {
    if (isOpen) {
        handlePrint();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  const whatsappLink = fullData ? getWhatsAppLink(regId, fullData, type, eventConfig.adminPhone) : '#';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fadeIn">
      {/* Hidden component for printing */}
      <div id="registration-slip-hidden" className="hidden">
        {fullData && <RegistrationSlip regId={regId} data={fullData} eventConfig={eventConfig} />}
      </div>

      <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden animate-scaleIn">
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
            Slip pendaftaran sedang dimuat turun secara automatik...
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
            <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-black hover:bg-green-600 transition-all shadow-xl shadow-green-100 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
            >
                <MessageCircle size={18} /> Hantar Bukti ke WhatsApp
            </a>
            <button 
                onClick={handlePrint}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
            >
                <FileText size={18} /> Muat Turun Semula Slip
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
