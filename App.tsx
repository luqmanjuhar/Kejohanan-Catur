
import React, { useState, useEffect } from 'react';
import { AlertCircle, UserPlus, LayoutDashboard, Calendar, Info, Settings, RefreshCw } from 'lucide-react';
import { RegistrationsMap, EventConfig, Teacher, Student } from './types';
import { loadAllData, getEventConfig } from './services/api';
import RegistrationForm from './components/RegistrationForm';
import UpdateRegistration from './components/UpdateRegistration';
import Dashboard from './components/Dashboard/Dashboard';
import Announcements from './components/Announcements';
import Documents from './components/Documents';
import SetupModal from './components/SetupModal';
import SuccessPopup from './components/SuccessPopup';

const STORAGE_KEY = 'MSSD_REG_DRAFT_V1';

function App() {
  const [activeTab, setActiveTab] = useState('pendaftaran');
  const [subTab, setSubTab] = useState('daftar-baru');
  const [registrations, setRegistrations] = useState<RegistrationsMap>({});
  const [showSetup, setShowSetup] = useState(false);
  const [eventConfig, setEventConfig] = useState<EventConfig>(getEventConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [draftRegistration, setDraftRegistration] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved draft", e);
      }
    }
    return {
      schoolName: '',
      schoolType: '',
      teachers: [{ name: '', email: '', phone: '', ic: '', position: 'Ketua' }] as Teacher[],
      students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }] as Student[]
    };
  });

  const [successData, setSuccessData] = useState({
    isOpen: false, regId: '', schoolName: ''
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftRegistration));
  }, [draftRegistration]);

  const handleSync = async () => {
    setIsSyncing(true);
    setApiError(null);
    try {
        const result = await loadAllData();
        if (result.config) {
            setEventConfig(result.config);
        }
        if (result.registrations) {
            setRegistrations(result.registrations);
        } else if (result.error && !result.config) {
            setApiError(result.error);
        }
    } catch (error) {
        console.error("Sync error:", error);
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
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-4 pb-12">
      <header className="pt-8 mb-4 flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black text-orange-600 uppercase tracking-tighter leading-none">
            {eventConfig.eventName}
          </h1>
          <p className="text-slate-400 mt-1 font-bold italic uppercase text-[10px] tracking-widest flex items-center gap-1">
            📍 {eventConfig.eventVenue}
            {isSyncing && <span className="ml-2 inline-flex items-center text-orange-400 animate-pulse"><RefreshCw size={10} className="animate-spin mr-1"/> Menyegerak Cloud...</span>}
          </p>
        </div>
        <button 
          onClick={() => setShowSetup(true)}
          className="p-2 text-slate-300 hover:text-orange-600 transition-colors bg-white rounded-xl shadow-sm border border-slate-100"
        >
          <Settings size={20}/>
        </button>
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

      <main className="flex-1">
        {apiError && !Object.keys(registrations).length ? (
            <div className="bg-white rounded-[2rem] p-8 text-center border-2 border-red-50 shadow-2xl animate-fadeIn">
                <AlertCircle className="text-red-500 mx-auto mb-4" size={48}/>
                <h2 className="text-xl font-black text-slate-800 mb-2">Cloud Tidak Ditemui</h2>
                <p className="text-slate-500 text-sm mb-6">{apiError}</p>
                <button onClick={handleSync} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95">Cuba Lagi</button>
            </div>
        ) : (
            <div className="animate-fadeIn">
                {activeTab === 'pendaftaran' && (
                    <div className="space-y-6">
                        <div className="flex gap-2 p-1.5 bg-orange-100/50 rounded-2xl max-w-md mx-auto">
                            <button onClick={() => setSubTab('daftar-baru')} className={`flex-1 py-3 font-bold rounded-xl transition-all active:scale-95 text-[10px] uppercase tracking-wider ${subTab === 'daftar-baru' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Pendaftaran Baru</button>
                            <button onClick={() => setSubTab('kemaskini')} className={`flex-1 py-3 font-bold rounded-xl transition-all active:scale-95 text-[10px] uppercase tracking-wider ${subTab === 'kemaskini' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Kemaskini Data</button>
                        </div>
                        {subTab === 'daftar-baru' ? 
                          <RegistrationForm 
                            registrations={registrations} 
                            onSuccess={(id, data) => {
                                setSuccessData({ isOpen: true, regId: id, schoolName: data.schoolName });
                                handleSync();
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
                          <UpdateRegistration localRegistrations={registrations} onUpdateSuccess={handleSync} eventConfig={eventConfig} />
                        }
                    </div>
                )}
                {activeTab === 'dashboard' && <Dashboard registrations={registrations} onRefresh={handleSync} onOpenSetup={() => setShowSetup(true)} />}
                {activeTab === 'pengumuman' && <Announcements config={eventConfig} />}
                {activeTab === 'dokumen' && <Documents config={eventConfig} />}
            </div>
        )}
      </main>

      <SetupModal 
        isOpen={showSetup} 
        onClose={() => setShowSetup(false)} 
        currentConfig={eventConfig} 
        onSaveSuccess={(newConfig) => {
          setEventConfig(newConfig);
          setShowSetup(false);
          handleSync();
        }}
      />
      <SuccessPopup 
        isOpen={successData.isOpen} 
        onClose={() => setSuccessData({ ...successData, isOpen: false })} 
        regId={successData.regId} 
        schoolName={successData.schoolName}
      />
    </div>
  );
}

export default App;
