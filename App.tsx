
import React, { useState, useEffect } from 'react';
import { AlertCircle, UserPlus, LayoutDashboard, Calendar, Info, Settings } from 'lucide-react';
import { RegistrationsMap, EventConfig, Teacher, Student } from './types';
import { loadAllData, getEventConfig } from './services/api';
import RegistrationForm from './components/RegistrationForm';
import UpdateRegistration from './components/UpdateRegistration';
import Dashboard from './components/Dashboard/Dashboard';
import Announcements from './components/Announcements';
import Documents from './components/Documents';
import SetupModal from './components/SetupModal';
import SuccessPopup from './components/SuccessPopup';

function App() {
  const [activeTab, setActiveTab] = useState('pendaftaran');
  const [subTab, setSubTab] = useState('daftar-baru');
  const [registrations, setRegistrations] = useState<RegistrationsMap>({});
  const [showSetup, setShowSetup] = useState(false);
  const [eventConfig, setEventConfig] = useState<EventConfig>(getEventConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [draftRegistration, setDraftRegistration] = useState({
    schoolName: '',
    schoolType: '',
    teachers: [{ name: '', email: '', phone: '', position: 'Ketua' }] as Teacher[],
    students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }] as Student[]
  });

  const [successData, setSuccessData] = useState({
    isOpen: false, regId: '', schoolName: ''
  });

  const handleSync = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
        const result = await loadAllData();
        if (result.config) {
            setEventConfig(result.config);
        }
        if (result.registrations) {
            setRegistrations(result.registrations);
        } else if (result.error) {
            setApiError(result.error);
        }
    } catch (error) {
        setApiError("Ralat Cloud. Sila periksa sambungan internet.");
    } finally {
        setIsLoading(false);
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
      {/* Top Header Section */}
      <header className="pt-8 mb-4 flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black text-orange-600 uppercase tracking-tighter leading-none">
            {eventConfig.eventName}
          </h1>
          <p className="text-slate-400 mt-1 font-bold italic uppercase text-[10px] tracking-widest flex items-center gap-1">
            📍 {eventConfig.eventVenue}
          </p>
        </div>
        <button 
          onClick={() => setShowSetup(true)}
          className="p-2 text-slate-300 hover:text-orange-600 transition-colors bg-white rounded-xl shadow-sm border border-slate-100"
        >
          <Settings size={20}/>
        </button>
      </header>

      {/* Top Navigation Bar - Now Sticky */}
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

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-orange-600 font-bold text-xs uppercase tracking-widest animate-pulse">Menghubungi Cloud...</p>
            </div>
        ) : apiError ? (
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

      {/* Modals */}
      <SetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
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
