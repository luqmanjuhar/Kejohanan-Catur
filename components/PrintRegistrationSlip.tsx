import React, { useState, useRef } from 'react';
import { Search, AlertCircle, RefreshCw, Printer } from 'lucide-react';
import { RegistrationsMap } from '../types';
import { searchRemoteRegistration } from '../services/api';

interface PrintRegistrationSlipProps {
  localRegistrations: RegistrationsMap;
  onPrintSuccess: (regId: string, data: any) => void;
}

const PrintRegistrationSlip: React.FC<PrintRegistrationSlipProps> = ({ localRegistrations, onPrintSuccess }) => {
  const [regPart1, setRegPart1] = useState('');
  const [regPart2, setRegPart2] = useState('');
  const [searchPassword, setSearchPassword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const part2Ref = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError(null);

    // Format ID: MSSD-XX-XX
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
            onPrintSuccess(fullRegId, JSON.parse(JSON.stringify(found)));
            setIsSearching(false);
            return;
        }

        const remoteResult = await searchRemoteRegistration(fullRegId, searchPassword);
        if (remoteResult.found && remoteResult.registration) {
             onPrintSuccess(fullRegId, remoteResult.registration);
        } else {
             setSearchError(remoteResult.error || "Pendaftaran tidak dijumpai atau kata laluan salah.");
        }

    } catch (err: any) {
        setSearchError(err.message || "Ralat mencari pendaftaran.");
    } finally {
        setIsSearching(false);
    }
  };

  return (
    <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-[2.5rem] p-6 md:p-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-100"><Printer size={20} /></div>
          <h4 className="text-xl font-black text-emerald-800 uppercase tracking-tighter">Cetak Slip</h4>
      </div>
      <p className="text-sm text-emerald-700 font-medium mb-6 bg-emerald-100/50 p-3 rounded-xl border border-emerald-200/50 inline-block">
          Tarikh akhir muat turun slip: <strong className="font-black">5 April 2026</strong>
      </p>
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <label className="block text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">ID Pendaftaran *</label>
            <div className="flex items-center gap-2">
                <div className="flex items-center px-4 py-3 border-2 border-white bg-white rounded-2xl shadow-sm select-none">
                    <span className="font-mono font-bold text-gray-400">MSSD</span>
                </div>
                <span className="font-black text-emerald-200">-</span>
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
                  className="w-20 px-4 py-3 border-2 border-white bg-white rounded-2xl focus:border-emerald-600 outline-none transition-all font-mono font-bold text-center shadow-sm text-slate-800"
                  placeholder="00"
                />
                <span className="font-black text-emerald-200">-</span>
                <input
                  ref={part2Ref}
                  type="text"
                  required
                  maxLength={2}
                  value={regPart2}
                  onChange={(e) => setRegPart2(e.target.value.replace(/\D/g, ''))}
                  className="w-20 px-4 py-3 border-2 border-white bg-white rounded-2xl focus:border-emerald-600 outline-none transition-all font-mono font-bold text-center shadow-sm text-slate-800"
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
              className="w-full px-5 py-3 border-2 border-white bg-white rounded-2xl focus:border-emerald-600 outline-none transition-all font-mono font-bold shadow-sm"
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
          className="flex items-center justify-center gap-3 w-full md:w-auto px-10 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black shadow-xl shadow-emerald-100 disabled:opacity-50 transform active:scale-95 uppercase text-xs tracking-[0.2em]"
        >
          {isSearching ? <><RefreshCw className="animate-spin" size={18} /> Mencari...</> : <><Search size={18} /> Semak & Cetak</>}
        </button>
      </form>
    </div>
  );
};

export default PrintRegistrationSlip;
