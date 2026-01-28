
import React, { useMemo, useState } from 'react';
import { RegistrationsMap, Registration } from '../../types';
import { Users, School, GraduationCap, RefreshCw, Activity, ChevronRight, Info, Filter, Layers, X, Search } from 'lucide-react';

interface DashboardProps {
  registrations: RegistrationsMap;
  onRefresh: () => void;
  onOpenSetup: () => void;
}

const RACE_COLORS: Record<string, string> = {
  'Melayu': 'bg-blue-500',
  'Cina': 'bg-red-500',
  'India': 'bg-yellow-500',
  'Bumiputera': 'bg-emerald-500',
  'Lain-lain': 'bg-slate-400'
};

// Helper untuk meneka jenis sekolah dengan lebih tepat (Sistem > Pelajar > Nama)
const inferSchoolType = (reg: Registration): 'SR' | 'SM' | 'Unknown' => {
    const type = (reg.schoolType || '').toLowerCase();
    const name = (reg.schoolName || '').toLowerCase();

    // 1. Cek Field Jenis Sekolah (Keutamaan Tertinggi - Data dari Sheet)
    if (type.includes('rendah') || type.includes('sr') || type === 'sr') return 'SR';
    if (type.includes('menengah') || type.includes('sm') || type === 'sm') return 'SM';

    // 2. Cek Kategori Pelajar (Jika Jenis Sekolah Kosong)
    const hasPrimary = reg.students.some(s => s.category && s.category.includes('12'));
    const hasSecondary = reg.students.some(s => s.category && (s.category.includes('15') || s.category.includes('18')));
    
    if (hasPrimary && !hasSecondary) return 'SR';
    if (hasSecondary && !hasPrimary) return 'SM';

    // 3. Teka dari Nama Sekolah (Fallback Terakhir)
    if (
        name.startsWith('sk ') || name.includes(' sk ') || 
        name.startsWith('sjk') || name.includes(' sjk') ||
        name.includes('sekolah kebangsaan') || 
        name.includes('rendah') ||
        name.startsWith('sr ') || name.includes(' sr ') ||
        name.startsWith('sra ') || name.includes(' sra ') ||
        name.startsWith('sri ') || name.includes(' sri ') ||
        name.includes('integrasi')
    ) return 'SR';

    if (
        name.startsWith('smk') || name.includes(' smk') || 
        name.startsWith('sm ') || name.includes(' sm ') ||
        name.includes('menengah') ||
        name.includes('kolej') || name.includes('kv ') || 
        name.includes('sbp') || name.includes('mrs') ||
        name.includes('maktab') || name.includes('vokasional') ||
        name.includes('teknik')
    ) return 'SM';

    return 'Unknown';
};

const Dashboard: React.FC<DashboardProps> = ({ registrations, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [analysisLevel, setAnalysisLevel] = useState<'primary' | 'secondary'>('primary');
  const [hoveredRace, setHoveredRace] = useState<{cat: string, race: string, count: number} | null>(null);

  const stats = useMemo(() => {
    const categories = ['L12', 'P12', 'L15', 'P15', 'L18', 'P18'];
    const initialRace = () => ({ 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 });
    
    const categoryMetrics: Record<string, { total: number; race: Record<string, number> }> = {};
    categories.forEach(cat => {
      categoryMetrics[cat] = { total: 0, race: initialRace() };
    });

    let totals = { 
        students: 0, 
        teachers: 0,
        teachersMale: 0,
        teachersFemale: 0,
        male: 0, 
        female: 0, 
        schools: new Set<string>(),
        schoolsSR: 0,
        schoolsSM: 0,
        cat12: 0,
        cat15: 0,
        cat18: 0
    };

    const processedSchools = new Set<string>();

    (Object.values(registrations) as Registration[]).forEach((reg) => {
        totals.teachers += reg.teachers.length;

        // Detect Teacher Gender from IC
        reg.teachers.forEach(t => {
            const ic = t.ic.replace(/\D/g, '');
            if (ic.length === 12) {
                const lastDigit = parseInt(ic.slice(-1));
                if (lastDigit % 2 === 0) totals.teachersFemale++;
                else totals.teachersMale++;
            }
        });
        
        totals.students += reg.students.length;
        
        // Handle School Counts (Unique by Name)
        if (!processedSchools.has(reg.schoolName)) {
            processedSchools.add(reg.schoolName);
            totals.schools.add(reg.schoolName);
            
            // Gunakan logic inferens yang sama
            const inferred = inferSchoolType(reg);
            if (inferred === 'SR') totals.schoolsSR++;
            else if (inferred === 'SM') totals.schoolsSM++;
        }
        
        reg.students.forEach(s => {
            const isMale = s.gender === 'Lelaki';
            if (isMale) totals.male++; else totals.female++;

            // Count Age Categories
            if (s.category.includes('12')) totals.cat12++;
            if (s.category.includes('15')) totals.cat15++;
            if (s.category.includes('18')) totals.cat18++;
            
            // Race Analysis
            const raceMap = initialRace();
            const raceKey = (s.race && s.race in raceMap) ? s.race : 'Lain-lain';

            const catMetric = categoryMetrics[s.category];
            if (catMetric) {
                catMetric.total += 1;
                catMetric.race[raceKey] = (catMetric.race[raceKey] || 0) + 1;
            }
        });
    });

    // Find max total for scaling bars
    const maxTotal = Math.max(...Object.values(categoryMetrics).map(m => m.total), 1);

    return { totals, categoryMetrics, maxTotal };
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return Object.entries(registrations).filter(([id, reg]) => {
      const r = reg as Registration;
      const search = searchTerm.toLowerCase();
      const matchesSearch = r.schoolName.toLowerCase().includes(search) || id.toLowerCase().includes(search);
      
      const inferred = inferSchoolType(r);
      let matchesType = false;

      if (filterType === 'all') {
          matchesType = true;
      } else if (filterType === 'SR') {
          matchesType = inferred === 'SR';
      } else if (filterType === 'SM') {
          matchesType = inferred === 'SM';
      }
      
      return matchesSearch && matchesType;
    });
  }, [registrations, searchTerm, filterType]);

  const renderStackedBar = (cat: string, label: string) => {
    const data = stats.categoryMetrics[cat];
    if (!data || data.total === 0) return (
        <div className="py-4 border-b border-slate-50 last:border-0 opacity-40">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label} ({cat})</span>
                <span className="text-[10px] font-bold text-slate-300">Tiada Data</span>
            </div>
            <div className="h-8 w-full bg-slate-50 rounded-xl"></div>
        </div>
    );

    const barWidthPct = (data.total / stats.maxTotal) * 100;

    return (
      <div className="py-6 border-b border-slate-50 last:border-0 group">
        <div className="flex justify-between items-end mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-800 tracking-tighter">{cat}</span>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-md uppercase">Total: {data.total}</span>
            </div>
          </div>
          
          {/* Legend preview for this bar on hover */}
          <div className="hidden md:flex gap-3">
             {Object.entries(data.race).map(([race, count]: [string, number]) => {
                if (count === 0) return null;
                return (
                    <div key={race} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${RACE_COLORS[race]}`}></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{race}: {count}</span>
                    </div>
                );
             })}
          </div>
        </div>

        <div className="relative h-10 w-full bg-slate-50 rounded-2xl overflow-hidden flex shadow-inner border border-slate-100 transition-all group-hover:shadow-md">
            {Object.entries(data.race).map(([race, count]: [string, number]) => {
                if (count === 0) return null;
                const segmentWidth = (count / data.total) * 100;
                const isHovered = hoveredRace?.cat === cat && hoveredRace?.race === race;
                
                return (
                    <div 
                        key={race}
                        className={`${RACE_COLORS[race]} h-full transition-all cursor-pointer relative group/segment`}
                        style={{ width: `${segmentWidth}%` }}
                        onMouseEnter={() => setHoveredRace({ cat, race, count })}
                        onMouseLeave={() => setHoveredRace(null)}
                    >
                        {/* Internal Label if wide enough */}
                        {segmentWidth > 15 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-[9px] font-black text-white/90 drop-shadow-sm uppercase">
                                    {((count / data.total) * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className={`absolute inset-0 bg-white/10 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
                    </div>
                );
            })}
        </div>
        
        {/* Mobile Mini Legend for hovered segment */}
        <div className="md:hidden mt-2 h-4">
             {hoveredRace?.cat === cat && (
                <div className="flex items-center gap-2 animate-fadeIn">
                    <div className={`w-2 h-2 rounded-full ${RACE_COLORS[hoveredRace.race]}`}></div>
                    <span className="text-[9px] font-black text-slate-600 uppercase">
                        {hoveredRace.race}: <span className="text-orange-600">{hoveredRace.count}</span> ({((hoveredRace.count / data.total) * 100).toFixed(1)}%)
                    </span>
                </div>
             )}
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

       {/* Top Stats Grid - Redesigned to 4 columns */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DetailedStatCard 
                label="Sekolah Berdaftar" 
                value={stats.totals.schools.size} 
                icon={<School size={24} />} 
                color="orange"
                subStats={[
                    { label: 'Sekolah Rendah', value: stats.totals.schoolsSR },
                    { label: 'Sekolah Menengah', value: stats.totals.schoolsSM }
                ]}
            />
            <DetailedStatCard 
                label="Guru Pembimbing" 
                value={stats.totals.teachers} 
                icon={<GraduationCap size={24} />} 
                color="indigo"
                subStats={[
                    { label: 'Lelaki', value: stats.totals.teachersMale },
                    { label: 'Wanita', value: stats.totals.teachersFemale }
                ]}
            />
            <DetailedStatCard 
                label="Jumlah Peserta" 
                value={stats.totals.students} 
                icon={<Users size={24} />} 
                color="blue"
                subStats={[
                    { label: 'Lelaki', value: stats.totals.male },
                    { label: 'Perempuan', value: stats.totals.female }
                ]}
            />
            <DetailedStatCard 
                label="Kategori Umur" 
                value={stats.totals.students} 
                icon={<Layers size={24} />} 
                color="emerald"
                subStats={[
                    { label: 'Bawah 12', value: stats.totals.cat12 },
                    { label: 'Bawah 15', value: stats.totals.cat15 },
                    { label: 'Bawah 18', value: stats.totals.cat18 }
                ]}
            />
       </div>

       {/* Analysis Section (Stacked Bars) */}
       <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border-2 border-orange-50 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-lg shadow-orange-100"><Activity size={22}/></div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Analisis Kategori & Bangsa</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Visual Pecahan Bangsa Per Kategori</p>
                  </div>
                </div>
                
                <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto">
                    <button 
                      onClick={() => setAnalysisLevel('primary')}
                      className={`flex-1 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisLevel === 'primary' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Sekolah Rendah
                    </button>
                    <button 
                      onClick={() => setAnalysisLevel('secondary')}
                      className={`flex-1 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analysisLevel === 'secondary' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Sekolah Menengah
                    </button>
                </div>
            </div>

            {/* Global Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-10 pb-6 border-b border-slate-50">
                {Object.entries(RACE_COLORS).map(([race, color]) => (
                    <div key={race} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color} shadow-sm`}></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{race}</span>
                    </div>
                ))}
                <div className="ml-auto flex items-center gap-2 text-[9px] font-bold text-slate-300 italic">
                    <Info size={12}/> Halakan tetikus pada bar untuk butiran
                </div>
            </div>

            <div className="animate-fadeIn w-full">
                {analysisLevel === 'primary' ? (
                  <div className="space-y-4">
                    {renderStackedBar('L12', 'Bawah 12 Lelaki')}
                    {renderStackedBar('P12', 'Bawah 12 Perempuan')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12">
                       {renderStackedBar('L15', 'Bawah 15 Lelaki')}
                       {renderStackedBar('P15', 'Bawah 15 Perempuan')}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12 pt-4">
                       {renderStackedBar('L18', 'Bawah 18 Lelaki')}
                       {renderStackedBar('P18', 'Bawah 18 Perempuan')}
                    </div>
                  </div>
                )}
            </div>
       </div>

       {/* School List */}
       <div className="bg-white rounded-[2.5rem] border-2 border-orange-50 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] mb-4 md:mb-0">Senarai Sekolah Berdaftar</h3>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Filter Type */}
                    <div className="relative min-w-[180px]">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Filter size={16} />
                        </div>
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full pl-11 pr-8 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-600 outline-none transition-all text-xs font-bold appearance-none cursor-pointer hover:bg-white"
                        >
                            <option value="all">Semua Jenis</option>
                            <option value="SR">Sekolah Rendah (SR)</option>
                            <option value="SM">Sekolah Menengah (SM)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
                        </div>
                    </div>

                    {/* Search Input */}
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
            </div>

            <div className="space-y-3">
                {filteredRegistrations.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 italic text-sm bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        {searchTerm || filterType !== 'all' ? `Tiada pendaftaran ditemui dengan tapisan ini.` : 'Tiada pendaftaran ditemui.'}
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

const DetailedStatCard = ({ label, value, icon, color, subStats }: any) => {
     const colorClasses: Record<string, string> = {
        orange: "from-orange-500 to-orange-600 shadow-orange-200",
        blue: "from-blue-500 to-blue-600 shadow-blue-200",
        emerald: "from-emerald-500 to-emerald-600 shadow-emerald-200",
        indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200",
    };

    return (
        <div className={`bg-white rounded-3xl p-5 border-2 border-slate-50 shadow-xl shadow-slate-100 flex flex-col justify-between h-full hover:scale-[1.02] transition-transform`}>
           <div className="flex items-start justify-between mb-4">
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                  <h3 className="text-3xl font-black text-slate-800">{value}</h3>
              </div>
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}>
                {icon}
              </div>
           </div>
           
           <div className="space-y-2 mt-auto">
              {subStats.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                     <span className="text-slate-500 uppercase tracking-wider text-[9px]">{item.label}</span>
                     <span className="text-slate-800 font-black">{item.value}</span>
                  </div>
              ))}
           </div>
        </div>
    );
};

const SchoolListItem: React.FC<{ id: string; reg: Registration }> = ({ id, reg }) => {
    const [expanded, setExpanded] = React.useState(false);
    const inferredType = inferSchoolType(reg);
    
    // Logic badge yang lebih fleksibel
    let badge = null;
    if (inferredType === 'SR') {
        badge = <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">SR</span>;
    } else if (inferredType === 'SM') {
        badge = <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-purple-50 text-purple-600">SM</span>;
    } else {
        // Fallback jika 'Unknown', cuba paparkan teks asal atau '??'
        const rawType = (reg.schoolType || '').toUpperCase();
        const displayType = rawType.length > 0 ? (rawType.length > 5 ? rawType.substring(0,3) + '..' : rawType) : '??';
        badge = <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">{displayType}</span>;
    }

    return (
        <div className="bg-gray-50/50 rounded-2xl border-2 border-transparent hover:border-orange-100 hover:bg-white transition-all overflow-hidden group shadow-sm">
            <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 md:p-5 flex justify-between items-center">
                <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase group-hover:text-orange-600 transition-colors">{reg.schoolName}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">ID: {id}</span>
                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">{reg.students.length} Pelajar</span>
                        {badge}
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
