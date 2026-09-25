import React, { useState, useRef } from 'react';
import { Search, AlertCircle, RefreshCw, Download, FileCheck, CheckCircle2 } from 'lucide-react';
import { RegistrationsMap, EventConfig, Registration } from '../types';
import { searchRemoteRegistration } from '../services/api';
import { generateECertsPDF } from '../utils/ecert';

interface PrintECertProps {
  localRegistrations: RegistrationsMap;
  config: EventConfig;
}

const PrintECert: React.FC<PrintECertProps> = ({ localRegistrations, config }) => {
  const [regPart1, setRegPart1] = useState('');
  const [regPart2, setRegPart2] = useState('');
  const [searchPassword, setSearchPassword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const part2Ref = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    setRegistration(null);

    const fullRegId = `MSSD-${regPart1}-${regPart2}`;

    try {
        let found = localRegistrations[fullRegId];
        let isValid = false;
        
        if (found && found.teachers.length > 0) {
            const phone = (found.teachers[0].phone || '').replace(/\D/g, '');
            const last4 = phone.slice(-4);
            if (last4 === searchPassword) isValid = true;
        }

        if (isValid) {
            setRegistration(JSON.parse(JSON.stringify(found)));
            setIsSearching(false);
            return;
        }

        const remoteResult = await searchRemoteRegistration(fullRegId, searchPassword);
        
        if (remoteResult.found && remoteResult.registration) {
             setRegistration(remoteResult.registration);
        } else {
             setSearchError(remoteResult.error || "Pendaftaran tidak dijumpai atau kata laluan salah.");
        }
    } catch (err: any) {
        setSearchError(err.message || "Ralat mencari pendaftaran.");
    } finally {
        setIsSearching(false);
    }
  };

  const handleDownload = async (templateId: string) => {
    if (!registration) return;
    const template = config.ecertTemplates?.find(t => t.id === templateId);
    if (!template) return;

    setDownloadingId(templateId);
    setSearchError(null);

    try {
        await generateECertsPDF(registration, template);
    } catch (err: any) {
        setSearchError(err.message || "Gagal menjana sijil. Sila cuba lagi.");
    } finally {
        setDownloadingId(null);
    }
  };

  const hasTemplates = config.ecertTemplates && config.ecertTemplates.length > 0;

  return (
    <div className="bg-purple-50/50 border-2 border-purple-100 rounded-[2.5rem] p-6 md:p-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-2">
          <div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg shadow-purple-100"><FileCheck size={20} /></div>
          <h4 className="text-xl font-black text-purple-800 uppercase tracking-tighter">Muat Turun E-Cert</h4>
      </div>
      
      {!registration ? (
        <>
            <p className="text-sm text-purple-700 font-medium mb-6 bg-purple-100/50 p-3 rounded-xl border border-purple-200/50 inline-block">
                Cari pendaftaran anda untuk memuat turun E-Cert.
            </p>

            <form onSubmit={handleSearch}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-1">
                    <label className="block text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">ID Pendaftaran *</label>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center px-4 py-3 border-2 border-white bg-white rounded-2xl shadow-sm select-none">
                            <span className="font-mono font-bold text-gray-400">MSSD</span>
                        </div>
                        <span className="font-black text-purple-200">-</span>
                        <input
                        type="text"
                        required
                        maxLength={2}
                        value={regPart1}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setRegPart1(val);
                            if (val.length === 2) {
                                part2Ref.current?.focus();
                            }
                        }}
                        className="w-20 px-4 py-3 border-2 border-white bg-white rounded-2xl focus:border-purple-600 outline-none transition-all font-mono font-bold text-center shadow-sm text-slate-800"
                        placeholder="00"
                        />
                        <span className="font-black text-purple-200">-</span>
                        <input
                        ref={part2Ref}
                        type="text"
                        required
                        maxLength={2}
                        value={regPart2}
                        onChange={(e) => setRegPart2(e.target.value.replace(/\D/g, ''))}
                        className="w-20 px-4 py-3 border-2 border-white bg-white rounded-2xl focus:border-purple-600 outline-none transition-all font-mono font-bold text-center shadow-sm text-slate-800"
                        placeholder="00"
                        />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1 ml-1">Masukkan ID mengikut format: MSSD - XX - XX</p>
                </div>

                <div className="space-y-1">
                    <label className="block text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">4 Digit Akhir Telefon *</label>
                    <input
                    type="text"
                    required
                    maxLength={4}
                    value={searchPassword}
                    onChange={(e) => setSearchPassword(e.target.value)}
                    className="w-full px-5 py-3 border-2 border-white bg-white rounded-2xl focus:border-purple-600 outline-none transition-all font-mono font-bold shadow-sm"
                    placeholder="1234"
                    />
                </div>
                </div>

                {searchError && (
                <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 animate-shake">
                    <AlertCircle size={18} /> {searchError}
                </div>
                )}

                <button
                type="submit"
                disabled={isSearching}
                className="flex items-center justify-center gap-3 w-full md:w-auto px-10 py-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all font-black shadow-xl shadow-purple-100 disabled:opacity-50 transform active:scale-95 uppercase text-xs tracking-[0.2em]"
                >
                {isSearching ? <><RefreshCw className="animate-spin" size={18} /> Mencari...</> : <><Search size={18} /> Semak & Cari</>}
                </button>
            </form>
        </>
      ) : (
        <div className="animate-fadeIn mt-6">
            <div className="bg-white p-6 rounded-3xl border border-purple-100 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h5 className="font-black text-slate-800 text-lg">{registration.schoolName}</h5>
                        <p className="text-sm font-bold text-slate-500 mt-1">{registration.schoolCode}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-green-100">
                        <CheckCircle2 size={14} /> Pendaftaran Sah
                    </div>
                </div>
                
                <div className="mt-8 space-y-4">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sijil Tersedia:</h6>
                    
                    {!hasTemplates ? (
                        <div className="bg-orange-50 text-orange-700 p-4 rounded-2xl border border-orange-100 text-xs font-bold flex items-center gap-3">
                            <AlertCircle size={16} /> Tiada templat E-Cert disediakan oleh urusetia buat masa ini.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {config.ecertTemplates!.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => handleDownload(template.id)}
                                    disabled={downloadingId !== null}
                                    className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-2xl border border-purple-200 transition-all text-left group"
                                >
                                    <div>
                                        <h6 className="font-black text-purple-900 text-sm">{template.name}</h6>
                                        <p className="text-xs text-purple-600 font-medium mt-1 group-hover:text-purple-700 transition-colors">
                                            Jana & Muat Turun (PDF)
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-xl text-white shadow-sm ${downloadingId === template.id ? 'bg-purple-400' : 'bg-purple-600 group-hover:bg-purple-700'} transition-all`}>
                                        {downloadingId === template.id ? (
                                            <RefreshCw className="animate-spin" size={18} />
                                        ) : (
                                            <Download size={18} />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {searchError && (
                <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl mt-6 text-xs font-bold flex items-center gap-3 animate-shake">
                    <AlertCircle size={18} /> {searchError}
                </div>
                )}
            </div>
            
            <button
                onClick={() => setRegistration(null)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider px-4 py-2"
            >
                Kembali
            </button>
        </div>
      )}
    </div>
  );
};

export default PrintECert;
