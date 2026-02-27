
import React from 'react';
import { Registration, EventConfig } from '../types';

interface RegistrationSlipProps {
  regId: string;
  data: Registration;
  eventConfig: EventConfig;
}

const RegistrationSlip: React.FC<RegistrationSlipProps> = ({ regId, data, eventConfig }) => {
  // Pastikan data wujud untuk mengelakkan "White Screen"
  const teachers = data?.teachers || [];
  const students = data?.students || [];
  const schoolName = data?.schoolName || 'Nama Sekolah Tidak Dijumpai';
  const schoolType = data?.schoolType || '';

  return (
    <div id="registration-slip" className="bg-white p-10 text-slate-900 font-sans max-w-[210mm] mx-auto border shadow-sm">
      {/* Header Slip */}
      <div className="text-center border-b-4 border-orange-600 pb-6 mb-8">
        <h1 className="text-2xl font-black uppercase leading-tight text-orange-600">{eventConfig?.eventName || 'KEJOHANAN CATUR MSSD'}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">SLIP PENGESAHAN PENDAFTARAN</p>
        <div className="flex justify-between items-end mt-6">
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID PENDAFTARAN</p>
            <p className="text-2xl font-black font-mono text-slate-800">{regId}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TARIKH DIJANA</p>
            <p className="text-sm font-bold text-slate-800">{new Date().toLocaleString('ms-MY')}</p>
          </div>
        </div>
      </div>

      {/* Maklumat Sekolah */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">MAKLUMAT SEKOLAH</p>
          <p className="text-lg font-black text-slate-800 leading-tight">{schoolName}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs font-bold text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">{data.schoolCode || 'TIADA KOD'}</span>
            <span className="text-xs font-bold text-slate-500 uppercase">{schoolType}</span>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">LOKASI KEJOHANAN</p>
          <p className="text-lg font-black text-slate-800 leading-tight">{eventConfig?.eventVenue || 'Venue Belum Ditetapkan'}</p>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase">DAERAH PASIR GUDANG</p>
        </div>
      </div>

      {/* Maklumat Guru */}
      <div className="mb-8">
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-3 border-l-4 border-orange-600 pl-3">MAKLUMAT GURU PEMBIMBING</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-2 text-left rounded-tl-lg">NAMA</th>
              <th className="p-2 text-left">NO. KP</th>
              <th className="p-2 text-left">NO. TELEFON</th>
              <th className="p-2 text-left rounded-tr-lg">JAWATAN</th>
            </tr>
          </thead>
          <tbody className="divide-y border">
            {teachers.length > 0 ? (
              teachers.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 font-bold uppercase">{t.name}</td>
                  <td className="p-2 font-mono">{t.ic}</td>
                  <td className="p-2">{t.phone}</td>
                  <td className="p-2 font-black text-orange-600 text-[10px] uppercase">{t.position}</td>
                </tr>
              ))
            ) : (
                <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Tiada maklumat guru.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Senarai Pelajar */}
      <div className="mb-8">
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-3 border-l-4 border-blue-600 pl-3">SENARAI PESERTA (PELAJAR)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-2 text-left rounded-tl-lg">NAMA PENUH</th>
              <th className="p-2 text-left">NO. KP</th>
              <th className="p-2 text-center">KATEGORI</th>
              <th className="p-2 text-center">JANTINA</th>
              <th className="p-2 text-right rounded-tr-lg">PLAYER ID</th>
            </tr>
          </thead>
          <tbody className="divide-y border">
            {students.length > 0 ? (
              students.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 font-bold uppercase">{s.name}</td>
                  <td className="p-2 font-mono text-[10px]">{s.ic}</td>
                  <td className="p-2 text-center font-black text-blue-600">{s.category}</td>
                  <td className="p-2 text-center">{s.gender}</td>
                  <td className="p-2 text-right font-black font-mono text-orange-600">{s.playerId}</td>
                </tr>
              ))
            ) : (
                <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Tiada maklumat pelajar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer & Peringatan */}
      <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-start">
        <div className="max-w-md">
          <h4 className="text-[10px] font-black text-slate-800 uppercase mb-2">Peringatan Penting:</h4>
          <ul className="text-[9px] text-slate-500 font-bold space-y-1 list-disc pl-4 uppercase leading-relaxed">
            <li>Sila bawa slip ini semasa hari kejohanan untuk urusan pendaftaran.</li>
            <li>Pastikan semua maklumat pelajar (terutama Player ID) adalah betul.</li>
            <li>Sebarang pindaan selepas tarikh tutup pendaftaran tidak akan dilayan.</li>
            <li>Slip ini dijana secara automatik oleh MSSD Catur Cloud System.</li>
          </ul>
        </div>
        <div className="text-right">
           <div className="w-24 h-24 bg-slate-100 mb-2 ml-auto flex items-center justify-center border-2 border-slate-200 rounded-xl">
             <span className="text-[10px] font-black text-slate-300 uppercase">QR CODE</span>
           </div>
           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DIJANA OLEH MSSD PASIR GUDANG</p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSlip;
