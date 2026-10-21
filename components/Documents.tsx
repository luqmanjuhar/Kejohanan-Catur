
import React from 'react';
import { FileText, Users, Scale, Download, CheckSquare, FileCheck } from 'lucide-react';
import { EventConfig } from '../types';

interface DocumentsProps {
  config: EventConfig;
}

const Documents: React.FC<DocumentsProps> = ({ config }) => {
  return (
    <div className="space-y-8">
      {/* Bahagian 1: Borang Rasmi Pendaftaran Murid (Wajib Muat Turun) */}
      <div className="bg-white rounded-[2rem] shadow-sm border-2 border-orange-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-orange-100">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-orange-100 text-orange-700 rounded-2xl">
                <FileCheck size={24} />
              </span>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
                  Borang Kelayakan & Kebenaran Murid
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Borang rasmi untuk diedarkan kepada murid & ibu bapa sebelum disahkan oleh guru
                </p>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-black uppercase px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 self-start md:self-auto">
            Wajib Disediakan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <DocCard 
            icon={<FileText size={32} />}
            title="Borang R01"
            badge="Sekolah Rendah"
            desc="Borang pendaftaran individu rasmi MSSD khas untuk murid Sekolah Rendah (disahkan Guru Besar)."
            link={config.documents?.borangR01 || config.documents?.invitation || '#'}
            color="orange"
          />
          <DocCard 
            icon={<FileText size={32} />}
            title="Borang M01"
            badge="Sekolah Menengah"
            desc="Borang pendaftaran individu rasmi MSSD khas untuk murid Sekolah Menengah (disahkan Pengetua)."
            link={config.documents?.borangM01 || config.documents?.meeting || '#'}
            color="blue"
          />
          <DocCard 
            icon={<CheckSquare size={32} />}
            title="Kebenaran Kejohanan"
            badge="Semua Murid"
            desc="Surat pelepasan dan kebenaran ibu bapa/penjaga untuk murid menyertai pertandingan."
            link={config.documents?.kebenaranKejohanan || config.documents?.arbiter || '#'}
            color="purple"
          />
          <DocCard 
            icon={<FileCheck size={32} />}
            title="Kebenaran Media"
            badge="Semua Murid"
            desc="Surat persetujuan penyiaran dan hebahan rasmi gambar, video, serta audio murid."
            link={config.documents?.kebenaranMedia || config.documents?.arbiter || '#'}
            color="green"
          />
        </div>

        {/* Panduan Kompilasi & Senarai Semak Guru */}
        <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5">
          <h4 className="text-xs font-black uppercase text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Panduan Penyediaan & Muat Naik Dokumen Murid:
          </h4>
          <ol className="text-xs text-slate-600 font-medium space-y-1.5 list-decimal pl-5">
            <li><strong>Sekolah Rendah:</strong> Kumpul Borang R01, Salinan Sijil Lahir/MyKid, Surat Kebenaran Kejohanan & Surat Kebenaran Media bagi setiap murid.</li>
            <li><strong>Sekolah Menengah:</strong> Kumpul Borang M01, Salinan Kad Pengenalan / Pasport, Surat Kebenaran Kejohanan & Surat Kebenaran Media bagi setiap murid.</li>
            <li>Gunakan <strong>Slip Pendaftaran (Senarai Semak)</strong> yang dicetak dari sistem ini untuk menyemak kelengkapan setiap murid.</li>
            <li><strong>Muat Naik Berasingan:</strong> Guru kini boleh memuat naik mengikut jenis dokumen secara berasingan melalui tab <em>Kemaskini / Status</em>. Sistem akan menamakan semula fail secara automatik mengikut jenis dokumen.</li>
          </ol>
        </div>
      </div>

      {/* Bahagian 2: Surat & Dokumen Pentadbiran */}
      <div className="bg-white rounded-[2rem] shadow-sm border-2 border-slate-100 p-6 md:p-8">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
          📄 Dokumen Tambahan & Pentadbiran Kejohanan
        </h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6">
          Surat jemputan rasmi, notis mesyuarat pengurus pasukan, dan pelantikan arbiter
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DocCard 
            icon={<FileText size={36} />}
            title="Surat Jemputan"
            badge="Pentadbiran"
            desc="Surat rasmi jemputan untuk kejohanan catur MSSD Pasir Gudang."
            link={config.documents.invitation}
            color="blue"
          />
          <DocCard 
            icon={<Users size={36} />}
            title="Surat Mesyuarat"
            badge="Pengurus Pasukan"
            desc="Notis mesyuarat pengurus pasukan dan taklimat guru pengiring."
            link={config.documents.meeting}
            color="green"
          />
          <DocCard 
            icon={<Scale size={36} />}
            title="Lantikan Arbiter"
            badge="Pegawai Teknikal"
            desc="Surat rasmi lantikan arbiter dan pegawai kejohanan."
            link={config.documents.arbiter}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
};

const DocCard = ({ icon, title, badge, desc, link, color }: any) => {
    const bg = color === 'blue' ? 'bg-blue-50/50 border-blue-200' : color === 'green' ? 'bg-emerald-50/50 border-emerald-200' : color === 'orange' ? 'bg-orange-50/50 border-orange-200' : 'bg-purple-50/50 border-purple-200';
    const text = color === 'blue' ? 'text-blue-800' : color === 'green' ? 'text-emerald-800' : color === 'orange' ? 'text-orange-800' : 'text-purple-800';
    const btn = color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : color === 'green' ? 'bg-emerald-600 hover:bg-emerald-700' : color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700';
    const isLink = link && link !== '#' && link !== '';

    return (
        <div className={`${bg} border-2 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className={text}>{icon}</div>
                {badge && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                    {badge}
                  </span>
                )}
              </div>
              <h3 className={`text-base font-black mb-1 ${text}`}>{title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">{desc}</p>
            </div>
            <div>
              {isLink ? (
                  <a href={link} target="_blank" rel="noreferrer" className={`w-full flex items-center justify-center gap-2 py-2.5 text-white font-bold rounded-xl text-xs ${btn} shadow-sm transition-all`}>
                      <Download size={14} /> Muat Turun Dokumen
                  </a>
              ) : (
                  <button disabled className="w-full py-2.5 text-slate-400 font-bold rounded-xl text-xs bg-slate-200 cursor-not-allowed">
                      Pautan Dalam Proses
                  </button>
              )}
            </div>
        </div>
    );
};

export default Documents;
