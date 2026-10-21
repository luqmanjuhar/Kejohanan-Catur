
import React from 'react';
import { Registration, EventConfig } from '../types';

interface RegistrationSlipProps {
  regId: string;
  data: Registration;
  eventConfig: EventConfig;
}

const RegistrationSlip: React.FC<RegistrationSlipProps> = ({ regId, data, eventConfig }) => {
  // Safety check
  if (!data) return null;

  // Pastikan data wujud untuk mengelakkan "White Screen"
  const teachers = Array.isArray(data.teachers) ? data.teachers : [];
  const students = Array.isArray(data.students) ? data.students : [];
  const schoolName = data.schoolName || 'Nama Sekolah Tidak Dijumpai';
  const schoolType = data.schoolType || '';

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
            <span className="text-xs font-bold text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">{data?.schoolCode || 'TIADA KOD'}</span>
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

      {/* Senarai Pelajar & Maklumat Pertandingan */}
      <div className="mb-6">
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

      {/* SENARAI SEMAK DOKUMEN WAJIB (CHECKLIST GURU) */}
      <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] border-l-4 border-emerald-600 pl-3">
            SENARAI SEMAK DOKUMEN WAJIB (CHECKLIST GURU)
          </h3>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            {schoolType?.toUpperCase().includes('MENENGAH') ? 'SEKOLAH MENENGAH' : 'SEKOLAH RENDAH'}
          </span>
        </div>
        
        <p className="text-[9px] text-slate-600 font-medium mb-3 leading-relaxed">
          * Guru pembimbing hendaklah menyemak dokumen setiap peserta berikut sebelum memuat naik mengikut slot berasingan di portal sistem. Sistem akan menamakan semula fail secara automatik mengikut jenis dokumen.
        </p>

        <table className="w-full text-[10px] bg-white border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-700 text-white font-black text-[9px] uppercase">
              <th className="p-2 text-center w-8">BIL</th>
              <th className="p-2 text-left">NAMA PESERTA</th>
              <th className="p-2 text-center w-24">
                {schoolType?.toUpperCase().includes('MENENGAH') ? 'BORANG M01' : 'BORANG R01'}
              </th>
              <th className="p-2 text-center w-28">
                {schoolType?.toUpperCase().includes('MENENGAH') ? 'SALINAN IC / PASPORT' : 'MYKID / S.BERANAK'}
              </th>
              <th className="p-2 text-center w-28">KEBENARAN KEJOHANAN</th>
              <th className="p-2 text-center w-28">KEBENARAN MEDIA</th>
              <th className="p-2 text-center w-20">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y border">
            {students.length > 0 ? (
              students.map((s, i) => {
                const docs = s.documents || {};
                const isFormChecked = !!docs.hasForm;
                const isIdChecked = !!docs.hasIdDoc;
                const isParentChecked = !!docs.hasParentConsent;
                const isMediaChecked = !!docs.hasMediaConsent;
                const isAllChecked = isFormChecked && isIdChecked && isParentChecked && isMediaChecked;

                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 text-center font-bold text-slate-500">{i + 1}</td>
                    <td className="p-2 font-bold uppercase text-slate-800">{s.name}</td>
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center justify-center gap-1 font-mono font-bold">
                        <span className={`inline-block w-4 h-4 border-2 rounded ${isFormChecked ? 'bg-emerald-600 border-emerald-600 text-white text-center leading-[12px] text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {isFormChecked ? '✓' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center justify-center gap-1 font-mono font-bold">
                        <span className={`inline-block w-4 h-4 border-2 rounded ${isIdChecked ? 'bg-emerald-600 border-emerald-600 text-white text-center leading-[12px] text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {isIdChecked ? '✓' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center justify-center gap-1 font-mono font-bold">
                        <span className={`inline-block w-4 h-4 border-2 rounded ${isParentChecked ? 'bg-emerald-600 border-emerald-600 text-white text-center leading-[12px] text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {isParentChecked ? '✓' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center justify-center gap-1 font-mono font-bold">
                        <span className={`inline-block w-4 h-4 border-2 rounded ${isMediaChecked ? 'bg-emerald-600 border-emerald-600 text-white text-center leading-[12px] text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {isMediaChecked ? '✓' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${isAllChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isAllChecked ? 'LENGKAP' : 'SEMAKAN'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={7} className="p-3 text-center text-slate-400 italic">Tiada peserta.</td></tr>
            )}
          </tbody>
        </table>

        {/* Panduan Penamaan PDF */}
        <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/60 flex items-start gap-2">
          <span className="text-emerald-700 font-bold text-xs mt-0.5">ℹ️</span>
          <p className="text-[8px] text-emerald-800 font-semibold leading-relaxed uppercase">
            Format Auto-Rename: 4 Dokumen boleh dimuat naik secara berasingan (<strong className="font-mono text-slate-900 bg-white px-1 py-0.5 rounded border border-emerald-200">BORANG</strong>, <strong className="font-mono text-slate-900 bg-white px-1 py-0.5 rounded border border-emerald-200">SALINAN IC</strong>, <strong className="font-mono text-slate-900 bg-white px-1 py-0.5 rounded border border-emerald-200">KEBENARAN KEJOHANAN</strong>, & <strong className="font-mono text-slate-900 bg-white px-1 py-0.5 rounded border border-emerald-200">KEBENARAN MEDIA</strong>).
          </p>
        </div>

        {data?.adminNotes && (
          <div className="mt-2.5 p-2 bg-amber-50 rounded-lg border border-amber-300 text-[8px] text-amber-900 flex items-start gap-1.5">
            <strong className="uppercase font-black shrink-0">Catatan Urusetia:</strong>
            <span className="font-semibold">{data.adminNotes}</span>
          </div>
        )}
      </div>

      {/* Footer & Peringatan */}
      <div className="mt-auto pt-8 border-t border-slate-100">
        <div className="grid grid-cols-3 gap-8 mb-6">
            <div className="col-span-2">
                <h4 className="text-[10px] font-black text-slate-800 uppercase mb-2">Peringatan Penting:</h4>
                <ol className="text-[9px] text-slate-600 font-bold space-y-1.5 list-decimal pl-4 uppercase leading-relaxed">
                    <li>Sila bawa slip ini semasa hari kejohanan dan juga semasa ingin membuat pembayaran.</li>
                    <li>Pastikan semua maklumat pelajar betul terutama nama dan no kad pengenalan.</li>
                    <li>Jika ada buat kemaskini data, perlu download slip pendaftaran yang terkini.</li>
                    <li>Slip ini dijana secara automatik oleh MSSD Catur Cloud System.</li>
                </ol>
            </div>
            <div className="text-right flex flex-col items-end justify-end">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">DIJANA OLEH MSSD PASIR GUDANG</p>
            </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <div>
                <h5 className="text-[10px] font-black text-orange-800 uppercase mb-1">Maklumat Pembayaran</h5>
                <p className="text-[9px] text-orange-700 font-bold uppercase leading-relaxed">
                    Pembayaran perlu dibuat di pejabat <span className="text-black">SK Taman Cahaya Masai</span>,<br/> 
                    sebelum atau pada <span className="text-black">1 April 2026, 12:00 Tengahari</span>.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSlip;
