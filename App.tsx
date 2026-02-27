
import React, { useState, useEffect } from 'react';
import { UserPlus, LayoutDashboard, Calendar, Info, Settings, RefreshCw, WifiOff, Clock, Banknote } from 'lucide-react';
import { RegistrationsMap, EventConfig, Teacher, Student, Registration } from './types';
import { loadAllData, getEventConfig } from './services/api';
import RegistrationForm from './components/RegistrationForm';
import UpdateRegistration from './components/UpdateRegistration';
import Dashboard from './components/Dashboard/Dashboard';
import Announcements from './components/Announcements';
import Documents from './components/Documents';
import SetupModal from './components/SetupModal';
import SuccessPopup from './components/SuccessPopup';

const DRAFT_KEY = 'MSSD_REG_DRAFT_V1';
const DATA_CACHE_KEY = 'MSSD_DATA_CACHE_V1';

function App() {
  const [activeTab, setActiveTab] = useState('pendaftaran');
  const [subTab, setSubTab] = useState('daftar-baru');
  const [showSetup, setShowSetup] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState<boolean>(false);

  // 1. Ambil data sedia ada dari Cache untuk kepantasan (Instant Load)
  const [registrations, setRegistrations] = useState<RegistrationsMap>(() => {
    const saved = localStorage.getItem(DATA_CACHE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const [eventConfig, setEventConfig] = useState<EventConfig>(() => {
    const saved = localStorage.getItem('MSSD_CONFIG_CACHE');
    return saved ? JSON.parse(saved) : getEventConfig();
  });

  const [draftRegistration, setDraftRegistration] = useState(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      schoolName: '',
      schoolCode: '',
      schoolType: '',
      teachers: [{ name: '', email: '', phone: '', ic: '', position: 'Ketua' }] as Teacher[],
      students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }] as Student[]
    };
  });

  const [successData, setSuccessData] = useState<{
    isOpen: boolean;
    regId: string;
    schoolName: string;
    fullData?: Registration;
    type: 'create' | 'update';
  }>({
    isOpen: false, regId: '', schoolName: '', type: 'create'
  });

  // Simpan draf secara automatik
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftRegistration));
  }, [draftRegistration]);

  // 2. Pull data dari Cloud di latar belakang (Background Sync)
  const handleSync = async () => {
    setIsSyncing(true);
    setApiError(false);
    try {
        const result = await loadAllData();
        if (result.config) {
            setEventConfig(result.config);
            localStorage.setItem('MSSD_CONFIG_CACHE', JSON.stringify(result.config));
        }
        if (result.registrations) {
            // Merge with existing state to prevent overwriting optimistic updates if server is stale
            // Note: In a real conflict scenario, server wins, but for now we trust the fetch result
            // unless we want to do complex merging.
            // Simple approach: Use server data. The delayed sync helps consistency.
            setRegistrations(result.registrations);
            localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(result.registrations));
        } else if (result.error) {
            setApiError(true);
        }
    } catch (error) {
        setApiError(true);
    } finally {
        setIsSyncing(false);
    }
  };

  useEffect(() => { handleSync(); }, []);

  const menu = [
    { id: 'pendaftaran', label: 'Daftar', icon: <UserPlus size={16}/> },
    { id: 'dashboard', label: 'Status', icon: <LayoutDashboard size={16}/> },
    { id: 'pengumuman', label: 'Jadual', icon: <Calendar size={16}/> },
    { id: 'dokumen', label: 'Info', icon: <Info size={16}/> }
  ];

  return (
    <div className="min-h-screen flex flex-col w-full max-w-7xl mx-auto px-4 md:px-6 pb-12">
      <header className="pt-8 mb-4 flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black text-orange-600 uppercase tracking-tighter leading-none">
            {eventConfig.eventName}
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-y-1 gap-x-4 mt-2">
            <p className="text-slate-400 font-bold italic uppercase text-[10px] tracking-widest flex items-center gap-1">
              📍 {eventConfig.eventVenue}
            </p>
            {eventConfig.tournamentDate && (
                <p className="text-orange-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                  📅 {eventConfig.tournamentDate}
                </p>
            )}
            {eventConfig.registrationDeadline && (
                <p className="text-red-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                  <Clock size={10} /> Tutup: {eventConfig.registrationDeadline}
                </p>
            )}
            {eventConfig.paymentDeadline && (
                <p className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                  <Banknote size={10} /> Bayar: {eventConfig.paymentDeadline}
                </p>
            )}
          </div>
          
          <div className="mt-2">
            {isSyncing ? (
              <span className="inline-flex items-center text-orange-400 animate-pulse text-[9px] font-black uppercase tracking-tighter">
                <RefreshCw size={10} className="animate-spin mr-1"/> Menyegerak...
              </span>
            ) : apiError ? (
              <span className="inline-flex items-center text-red-400 text-[9px] font-black uppercase tracking-tighter">
                <WifiOff size={10} className="mr-1"/> Mod Luar Talian
              </span>
            ) : (
              <span className="inline-flex items-center text-emerald-500 text-[9px] font-black uppercase tracking-tighter">
                ● Cloud Aktif
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`p-2 transition-colors bg-white rounded-xl shadow-sm border border-slate-100 ${isSyncing ? 'text-orange-300' : 'text-slate-300 hover:text-orange-600'}`}
              title="Refresh Data"
            >
              <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={() => setShowSetup(true)}
              className="p-2 text-slate-300 hover:text-orange-600 transition-colors bg-white rounded-xl shadow-sm border border-slate-100"
              title="Settings"
            >
              <Settings size={20}/>
            </button>
        </div>
      </header>

      <nav className="sticky top-4 z-50 mb-8 p-1.5 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-orange-100 border border-orange-50 overflow-x-auto no-scrollbar">
        <div className="flex items-center min-w-max md:min-w-0">
          {menu.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-center gap-2 py-3 px-4 md:px-6 rounded-xl transition-all flex-1 whitespace-nowrap ${
                activeTab === item.id 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
                  : 'text-slate-400 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              {item.icon}
              <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 animate-fadeIn">
          {activeTab === 'pendaftaran' && (
              <div className="space-y-6">
                  <div className="flex gap-2 p-1.5 bg-orange-100/50 rounded-2xl max-w-md mx-auto">
                      <button onClick={() => setSubTab('daftar-baru')} className={`flex-1 py-3 font-bold rounded-xl transition-all active:scale-95 text-[10px] uppercase tracking-wider ${subTab === 'daftar-baru' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Pendaftaran Baru</button>
                      <button onClick={() => setSubTab('kemaskini')} className={`flex-1 py-3 font-bold rounded-xl transition-all active:scale-95 text-[10px] uppercase tracking-wider ${subTab === 'kemaskini' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Semak/Kemaskini</button>
                  </div>
                  {subTab === 'daftar-baru' ? 
                    <RegistrationForm 
                      registrations={registrations} 
                      onSuccess={(id, data) => {
                          // Optimistic update: Update local state immediately
                          const newRegistrations = { ...registrations, [id]: data };
                          setRegistrations(newRegistrations);
                          localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(newRegistrations));

                          setSuccessData({ isOpen: true, regId: id, schoolName: data.schoolName, fullData: data, type: 'create' });
                          
                          // Delayed sync to allow server to process data
                          setTimeout(() => handleSync(), 1500);
                          
                          setDraftRegistration({
                            schoolName: '',
                            schoolType: '',
                            teachers: [{ name: '', email: '', phone: '', ic: '', position: 'Ketua' }],
                            students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }]
                          });
                      }} 
                      eventConfig={eventConfig} 
                      draft={draftRegistration}
                      onDraftChange={setDraftRegistration}
                    /> : 
                    <UpdateRegistration 
                      localRegistrations={registrations} 
                      onUpdateSuccess={(regId, updatedData) => {
                        // Optimistic update: Update local state immediately
                        const newRegistrations = { ...registrations, [regId]: updatedData };
                        setRegistrations(newRegistrations);
                        localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(newRegistrations));
                        
                        // Delayed sync
                        setTimeout(() => handleSync(), 1500);

                        setSuccessData({ isOpen: true, regId, schoolName: updatedData.schoolName, fullData: updatedData, type: 'update' });
                      }} 
                      eventConfig={eventConfig} 
                    />
                  }
              </div>
          )}
          {activeTab === 'dashboard' && <Dashboard registrations={registrations} onRefresh={handleSync} onOpenSetup={() => setShowSetup(true)} />}
          {activeTab === 'pengumuman' && <Announcements config={eventConfig} />}
          {activeTab === 'dokumen' && <Documents config={eventConfig} />}
      </main>

      <SetupModal 
        isOpen={showSetup} 
        onClose={() => setShowSetup(false)} 
        currentConfig={eventConfig} 
        onSaveSuccess={(newConfig) => {
          setEventConfig(newConfig);
          localStorage.setItem('MSSD_CONFIG_CACHE', JSON.stringify(newConfig));
          setShowSetup(false);
          handleSync();
        }}
      />
      <SuccessPopup 
        isOpen={successData.isOpen} 
        onClose={() => setSuccessData({ ...successData, isOpen: false })} 
        regId={successData.regId} 
        schoolName={successData.schoolName}
        fullData={successData.fullData}
        eventConfig={eventConfig}
        type={successData.type}
      />
    </div>
  );
}

export default App;
