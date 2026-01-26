
import React, { useMemo, useState } from 'react';
import { RegistrationsMap, Registration } from '../../types';
import { Users, School, GraduationCap, RefreshCw, UserCircle, UserCircle2, Search, X, Activity, ChevronRight } from 'lucide-react';

interface DashboardProps {
  registrations: RegistrationsMap;
  onRefresh: () => void;
  onOpenSetup: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ registrations, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [analysisLevel, setAnalysisLevel] = useState<'primary' | 'secondary'>('primary');

  const stats = useMemo(() => {
    const categories = ['L12', 'P12', 'L15', 'P15', 'L18', 'P18'];
    const initialRace = () => ({ 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 });
    
    const categoryMetrics: Record<string, { total: number; race: Record<string, number> }> = {};
    categories.forEach(cat => {
      categoryMetrics[cat] = { total: 0, race: initialRace() };
    });

    let totals = { students: 0, teachers: 0, male: 0, female: 0, schools: new Set<string>() };

    const counters = {
        primary: { 
            schools: new Set<string>(), 
            u12m: 0, u12f: 0,
            race: initialRace() as Record<string, number>
        },
        secondary: { 
            schools: new Set<string>(), 
            u15m: 0, u15f: 0, u18m: 0, u18f: 0,
            raceU15: initialRace() as Record<string, number>,
            raceU18: initialRace() as Record<string, number>
        }
    };

    Object.values(registrations).forEach((reg: Registration) => {
        totals.teachers += reg.teachers.length;
        totals.students += reg.students.length;
        totals.schools.add(reg.schoolName);
        
        reg.students.forEach(s => {
            const isMale = s.gender === 'Lelaki';
            if (isMale) totals.male++; else totals.female++;
            const raceKey = (s.race && initialRace().hasOwnProperty(s.race)) ? s.race : 'Lain-lain';

            if (categoryMetrics[s.category]) {
                categoryMetrics[s.category].total++;
                categoryMetrics[s.category].race[raceKey]++;
            }

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

    return { totals, counters, categoryMetrics };
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return Object.entries(registrations).filter(([id, reg]) => {
      const search = searchTerm.toLowerCase();
      return reg.schoolName.toLowerCase().includes(search) || id.toLowerCase().includes(search);
    });
  }, [registrations, searchTerm]);

  const renderRaceBar = (race: string, count: number, total: number, colorClass: string) => {
    if (count === 0) return null;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div key={race} className="space-y-1">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
          <span className="text-slate-400">{race}</span>
          <span className="text-slate-700">{count}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100/50 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
       {/* Header Section */}
       <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-orange-50 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
           <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
           Dashboard MSSD Pasir Gudang
        </h2>
        <button onClick={onRefresh} className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
            <RefreshCw size={14} /> Segerak Data
        </button>
       </div>

       {/* Top Stats Grid */}
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Sekolah" value={stats.totals.schools.size} icon={<School size={18}/>} color="orange" />
            <StatCard label="Guru" value={stats.totals.teachers} icon={<GraduationCap size={18}/>} color="indigo" />
            <StatCard label="Peserta" value={stats.totals.students} icon={<Users size={18}/>} color="amber" />
            <StatCard label="Lelaki" value={stats.totals.male} icon={<UserCircle size={18}/>} color="blue" />
            <StatCard label="Perempuan" value={stats.totals.female} icon={<UserCircle2 size={18}/>} color="pink" />
       </div>

       {/* Interactive Analysis Section */}
       <div className="bg-white rounded-[2.5rem] p-8 border-2 border-orange-50 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-100"><Activity size={20}/></div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Analisis Kategori & Bangsa</h3>
                </div>
                
                <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto">
                    <button 
                      onClick={() => setAnalysisLevel('primary')}
                      className={`flex-1 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisLevel === 'primary' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Sekolah Rendah
                    </button>
                    <button 
                      onClick={() => setAnalysisLevel('secondary')}
                      className={`flex-1 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisLevel === 'secondary' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Sekolah Menengah
                    </button>
                </div>
            </div>

            <div className="animate-fadeIn">
                {analysisLevel === 'primary' ? (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-12 items-start">
                    <div className="space-y-8">
                       <div className="flex items-center justify-between border-b pb-4">
                          <h4 className="font-black text-orange-600 text-xs uppercase tracking-[0.3em]">Bawah 12 (L12 / P12)</h4>
                          <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase">{stats.counters.primary.schools.size} Sekolah</span>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-50">
                             <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black text-blue-600 uppercase">Lelaki (L12)</span>
                                <span className="text-2xl font-black text-blue-700">{stats.counters.primary.u12m}</span>
                             </div>
                             <div className="space-y-2">
                               {Object.entries(stats.categoryMetrics['L12']?.race || {}).map(([race, count]) => 
                                 renderRaceBar(race, count, stats.categoryMetrics['L12']?.total || 0, 'bg-blue-400')
                               )}
                             </div>
                          </div>
                          <div className="bg-pink-50/50 p-6 rounded-3xl border-2 border-pink-50">
                             <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black text-pink-600 uppercase">Perempuan (P12)</span>
                                <span className="text-2xl font-black text-pink-700">{stats.counters.primary.u12f}</span>
                             </div>
                             <div className="space-y-2">
                               {Object.entries(stats.categoryMetrics['P12']?.race || {}).map(([race, count]) => 
                                 renderRaceBar(race, count, stats.categoryMetrics['P12']?.total || 0, 'bg-pink-400')
                               )}
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
                       <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Rumusan SR</h5>
                       <div className="space-y-3">
                          {Object.entries(stats.counters.primary.race).map(([race, count]) => (
                            count > 0 && (
                              <div key={race} className="flex justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{race}</span>
                                <span className="text-[11px] font-black text-orange-600">{count}</span>
                              </div>
                            )
                          ))}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12">
                     {[
                       { age: '15', label: 'Bawah 15 (L15/P15)', l: 'L15', p: 'P15' },
                       { age: '18', label: 'Bawah 18 (L18/P18)', l: 'L18', p: 'P18' }
                     ].map(group => (
                       <div key={group.age} className="space-y-6">
                          <div className="flex items-center gap-4">
                            <h4 className="font-black text-slate-800 text-xs uppercase tracking-[0.3em] whitespace-nowrap">{group.label}</h4>
                            <div className="h-px bg-slate-100 w-full"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                <div className="flex justify-between items-center mb-6">
                                   <span className="text-[10px] font-black text-blue-600 uppercase">Lelaki ({group.l})</span>
                                   <span className="text-2xl font-black text-slate-800">{stats.categoryMetrics[group.l]?.total || 0}</span>
                                </div>
                                <div className="space-y-2">
                                  {Object.entries(stats.categoryMetrics[group.l]?.race || {}).map(([race, count]) => 
                                    renderRaceBar(race, count, stats.categoryMetrics[group.l]?.total || 0, 'bg-blue-400')
                                  )}
                                </div>
                             </div>
                             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                <div className="flex justify-between items-center mb-6">
                                   <span className="text-[10px] font-black text-pink-600 uppercase">Perempuan ({group.p})</span>
                                   <span className="text-2xl font-black text-slate-800">{stats.categoryMetrics[group.p]?.total || 0}</span>
                                </div>
                                <div className="space-y-2">
                                  {Object.entries(stats.categoryMetrics[group.p]?.race || {}).map(([race, count]) => 
                                    renderRaceBar(race, count, stats.categoryMetrics[group.p]?.total || 0, 'bg-pink-400')
                                  )}
                                </div>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
            </div>
       </div>

       {/* School List */}
       <div className="bg-white rounded-[2.5rem] border-2 border-orange-50 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Senarai Sekolah Berdaftar</h3>
                
                <div className="relative flex-1 max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Search size={16} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Cari nama sekolah..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-600 outline-none transition-all text-xs font-bold"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {filteredRegistrations.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 italic text-sm bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        {searchTerm ? `Tiada sekolah ditemui untuk "${searchTerm}".` : 'Tiada pendaftaran ditemui.'}
                    </div>
                ) : (
                    filteredRegistrations.map(([id, reg]) => (
                        <SchoolListItem key={id} id={id} reg={reg as Registration} />
                    ))
                )}
            </div>
       </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
    const colorClasses: Record<string, string> = {
        orange: "from-orange-600 to-orange-700 text-orange-50",
        indigo: "from-indigo-600 to-indigo-700 text-indigo-50",
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
        <div className="bg-gray-50/50 rounded-2xl border-2 border-transparent hover:border-orange-100 hover:bg-white transition-all overflow-hidden group shadow-sm">
            <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 md:p-5 flex justify-between items-center">
                <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase group-hover:text-orange-600 transition-colors">{reg.schoolName}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">ID: {id}</span>
                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">{reg.students.length} Pelajar</span>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-300 shadow-sm transition-transform ${expanded ? 'rotate-180 text-orange-600' : ''}`}>
                    <ChevronRight size={16} />
                </div>
            </button>
            {expanded && (
                <div className="p-5 pt-0 border-t border-gray-100 bg-white animate-fadeIn">
                    <div className="mt-4 grid md:grid-cols-2 gap-6">
                        <div>
                            <h5 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Guru Pembimbing</h5>
                            {reg.teachers.map((t, i) => (
                                <div key={i} className="mb-2 p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                                    <div>
                                      <p className="text-xs font-black text-slate-700">{t.name}</p>
                                      <p className="text-[9px] font-bold text-orange-600 uppercase">{t.position}</p>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">{t.phone}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h5 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Senarai Peserta</h5>
                             <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {reg.students.map((s, i) => (
                                    <div key={i} className="text-[10px] bg-white border border-gray-100 p-2 rounded-xl flex justify-between items-center">
                                        <span className="font-bold text-slate-600 truncate">{s.name}</span>
                                        <span className={`font-black px-2 py-0.5 rounded-md ${s.category.startsWith('L') ? 'text-blue-600 bg-blue-50' : 'text-pink-600 bg-pink-50'}`}>{s.category}</span>
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
