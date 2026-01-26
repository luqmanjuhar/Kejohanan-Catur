
import React, { useMemo } from 'react';
import { RegistrationsMap, Registration } from '../../types';
import { Users, School, GraduationCap, UserCheck, RefreshCw, UserCircle, UserCircle2 } from 'lucide-react';

interface DashboardProps {
  registrations: RegistrationsMap;
  onRefresh: () => void;
  onOpenSetup: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ registrations, onRefresh }) => {
  const stats = useMemo(() => {
    let totalStudents = 0;
    let totalTeachers = 0;
    let totalMale = 0;
    let totalFemale = 0;
    const schools = new Set<string>();
    
    const counters = {
        primary: { 
            schools: new Set<string>(), 
            u12m: 0, u12f: 0,
            race: { 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 } as Record<string, number>
        },
        secondary: { 
            schools: new Set<string>(), 
            u15m: 0, u15f: 0, u18m: 0, u18f: 0,
            raceU15: { 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 } as Record<string, number>,
            raceU18: { 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 } as Record<string, number>
        }
    };

    Object.values(registrations).forEach((reg: Registration) => {
        totalTeachers += reg.teachers.length;
        totalStudents += reg.students.length;
        schools.add(reg.schoolName);
        
        let isPrimary = reg.schoolType === 'Sekolah Kebangsaan';

        reg.students.forEach(s => {
            const isMale = s.gender === 'Lelaki';
            if (isMale) totalMale++; else totalFemale++;
            
            const raceKey = (s.race && counters.primary.race.hasOwnProperty(s.race)) ? s.race : 'Lain-lain';

            if (s.category === 'L12' || s.category === 'P12') {
                if(isMale) counters.primary.u12m++; else counters.primary.u12f++;
                counters.primary.race[raceKey]++;
                counters.primary.schools.add(reg.schoolName);
            } else if (s.category === 'L15' || s.category === 'P15') {
                if(isMale) counters.secondary.u15m++; else counters.secondary.u15f++;
                counters.secondary.raceU15[raceKey]++;
                counters.secondary.schools.add(reg.schoolName);
            } else if (s.category === 'L18' || s.category === 'P18') {
                if(isMale) counters.secondary.u18m++; else counters.secondary.u18f++;
                counters.secondary.raceU18[raceKey]++;
                counters.secondary.schools.add(reg.schoolName);
            }
        });
    });

    return { totalStudents, totalTeachers, totalMale, totalFemale, totalSchools: schools.size, counters };
  }, [registrations]);

  return (
    <div className="space-y-8 animate-fadeIn">
       <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-orange-50 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
           <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
           Statistik Pendaftaran MSSD (7-Sheet Sync)
        </h2>
        <button onClick={onRefresh} className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
            <RefreshCw size={14} /> Segerak Cloud
        </button>
       </div>

       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sekolah" value={stats.totalSchools} icon={<School size={18}/>} color="orange" />
            <StatCard label="Peserta" value={stats.totalStudents} icon={<Users size={18}/>} color="amber" />
            <StatCard label="Lelaki" value={stats.totalMale} icon={<UserCircle size={18}/>} color="blue" />
            <StatCard label="Perempuan" value={stats.totalFemale} icon={<UserCircle2 size={18}/>} color="pink" />
       </div>

       <div className="bg-white rounded-[2.5rem] p-8 border-2 border-orange-50 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 mb-8 text-center uppercase tracking-[0.3em]">Analisis Kategori & Bangsa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="text-center">
                    <div className="bg-orange-600 text-white px-6 py-2 rounded-2xl font-black mb-6 inline-block shadow-lg">
                        <div className="text-2xl">{stats.counters.primary.schools.size}</div>
                        <div className="text-[9px] uppercase tracking-widest opacity-80">Sekolah Rendah</div>
                    </div>
                    <div className="bg-orange-50/30 border-2 border-orange-50 rounded-[2rem] p-6 mx-auto max-w-sm">
                        <div className="font-black text-orange-600 mb-4 text-[11px] uppercase tracking-widest border-b pb-2">Bawah 12 (L12/P12)</div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                            <div className="bg-white text-blue-600 p-3 rounded-2xl shadow-sm">
                                <span className="font-black block text-xl">{stats.counters.primary.u12m}</span>
                                <span className="text-[9px] font-bold uppercase">L12</span>
                            </div>
                            <div className="bg-white text-pink-600 p-3 rounded-2xl shadow-sm">
                                <span className="font-black block text-xl">{stats.counters.primary.u12f}</span>
                                <span className="text-[9px] font-bold uppercase">P12</span>
                            </div>
                        </div>
                        <div className="space-y-1 text-[10px] text-left">
                            {/* Fixed: Added type assertion to 'count' to ensure it's treated as a number for comparison */}
                            {Object.entries(stats.counters.primary.race).map(([race, count]) => (
                                (count as number) > 0 && (
                                <div key={race} className="flex justify-between bg-white px-3 py-1.5 rounded-lg border border-orange-50">
                                    <span className="font-bold text-slate-400 uppercase">{race}</span> 
                                    <span className="font-black text-orange-600">{count as number}</span>
                                </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <div className="bg-slate-800 text-white px-6 py-2 rounded-2xl font-black mb-6 inline-block shadow-lg">
                        <div className="text-2xl">{stats.counters.secondary.schools.size}</div>
                        <div className="text-[9px] uppercase tracking-widest opacity-80">Sekolah Menengah</div>
                    </div>
                    <div className="space-y-6 mx-auto max-w-sm">
                        <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6">
                            <div className="font-black text-slate-800 mb-4 text-[11px] uppercase tracking-widest border-b pb-2">Bawah 15 (L15/P15)</div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white text-blue-600 p-3 rounded-2xl shadow-sm">
                                    <span className="font-black block text-xl">{stats.counters.secondary.u15m}</span>
                                    <span className="text-[9px] font-bold uppercase">L15</span>
                                </div>
                                <div className="bg-white text-pink-600 p-3 rounded-2xl shadow-sm">
                                    <span className="font-black block text-xl">{stats.counters.secondary.u15f}</span>
                                    <span className="text-[9px] font-bold uppercase">P15</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6">
                            <div className="font-black text-slate-800 mb-4 text-[11px] uppercase tracking-widest border-b pb-2">Bawah 18 (L18/P18)</div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white text-blue-600 p-3 rounded-2xl shadow-sm">
                                    <span className="font-black block text-xl">{stats.counters.secondary.u18m}</span>
                                    <span className="text-[9px] font-bold uppercase">L18</span>
                                </div>
                                <div className="bg-white text-pink-600 p-3 rounded-2xl shadow-sm">
                                    <span className="font-black block text-xl">{stats.counters.secondary.u18f}</span>
                                    <span className="text-[9px] font-bold uppercase">P18</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
       </div>

       <div className="bg-white rounded-[2.5rem] border-2 border-orange-50 p-6 md:p-8">
            <h3 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-[0.2em]">Senarai Sekolah Berdaftar</h3>
            {Object.entries(registrations).length === 0 ? (
                <div className="text-center text-gray-400 py-12 italic text-sm">Tiada pendaftaran ditemui.</div>
            ) : (
                <div className="space-y-3">
                    {Object.entries(registrations).map(([id, reg]) => (
                        <SchoolListItem key={id} id={id} reg={reg as Registration} />
                    ))}
                </div>
            )}
       </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
    const colorClasses: Record<string, string> = {
        orange: "from-orange-600 to-orange-700 text-orange-50",
        amber: "from-amber-500 to-amber-600 text-amber-50",
        blue: "from-blue-600 to-blue-700 text-blue-50",
        pink: "from-pink-500 to-pink-600 text-pink-50",
    };
    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-3xl p-5 text-white shadow-xl flex flex-col items-center text-center transition-all hover:scale-105`}>
            <div className="mb-2 p-2 bg-white/20 rounded-xl">{icon}</div>
            <div className="text-2xl font-black mb-1">{value}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">{label}</div>
        </div>
    );
};

const SchoolListItem: React.FC<{ id: string; reg: Registration }> = ({ id, reg }) => {
    const [expanded, setExpanded] = React.useState(false);
    return (
        <div className="bg-gray-50/50 rounded-2xl border-2 border-transparent hover:border-orange-100 hover:bg-white transition-all overflow-hidden group">
            <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 md:p-5 flex justify-between items-center">
                <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase group-hover:text-orange-600 transition-colors">{reg.schoolName}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">ID: {id}</span>
                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">{reg.students.length} Pelajar</span>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-300 shadow-sm transition-transform ${expanded ? 'rotate-180 text-orange-600' : ''}`}>
                    <span className="text-[10px]">▼</span>
                </div>
            </button>
            {expanded && (
                <div className="p-5 pt-0 border-t border-gray-100 bg-white animate-fadeIn">
                    <div className="mt-4 grid md:grid-cols-2 gap-6">
                        <div>
                            <h5 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Guru</h5>
                            {reg.teachers.map((t, i) => (
                                <div key={i} className="mb-2 p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs font-black text-slate-700">{t.name}</p>
                                    <p className="text-[9px] font-bold text-orange-600 uppercase">{t.position}</p>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h5 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Peserta</h5>
                             <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                {reg.students.map((s, i) => (
                                    <div key={i} className="text-[10px] bg-white border border-gray-100 p-2 rounded-xl flex justify-between items-center">
                                        <span className="font-bold text-slate-600 truncate">{s.name}</span>
                                        <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">{s.category}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
