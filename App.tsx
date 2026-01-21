
import React, { useState, useEffect } from 'react';
import { AlertCircle, UserPlus, LayoutDashboard, Calendar, Info } from 'lucide-react';
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
        // Konfigurasi acara kini sentiasa diambil terus dari Cloud
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
    { id: 'pendaftaran', label: 'Daftar', icon: <UserPlus size={18}/> },
    { id: 'dashboard', label: 'Status', icon: <LayoutDashboard size={18}/> },
    { id: 'pengumuman', label: 'Jadual', icon: <Calendar size={18}/> },
    { id: 'dokumen', label: 'Info', icon: <Info size={18}/> }
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-4">
      <header className="bg-white rounded-3xl p-6 md:p-8 mt-6 mb-8 shadow-xl shadow-orange-100 border-b-4 border-orange-600 text-center animate-fadeIn">
        <h1 className="text-xl md:text-3xl font-extrabold text-orange-600 uppercase tracking-tighter leading-tight">{eventConfig.eventName}</h1>
        <p className="text-slate-400 mt-2 font-bold italic uppercase text-[10px] tracking-widest">📍 {eventConfig.eventVenue} • Pasir Gudang Cloud Hub</p>
      </header>

      <main className="flex-1 pb-24">
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
                        <div className="flex gap-2 p-1.5 bg-orange-100/50 rounded-2xl">
                            <button onClick={() => setSubTab('daftar-baru')} className={`flex-1 py-3 font-bold rounded-xl transition-all active:scale-95 text-xs uppercase ${subTab === 'daftar-baru' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Pendaftaran Baru</button>
                            <button onClick={() => setSubTab('kemaskini')} className={`flex-1 py-3 font-bold rounded-xl transition-all active:scale-95 text-xs uppercase ${subTab === 'kemaskini' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Kemaskini Data</button>
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

      <nav className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl z-50 glass rounded-2xl p-2 shadow-2xl border border-white/50">
        <div className="flex justify-around items-center">
          {menu.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all flex-1 min-w-0 ${
                activeTab === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-orange-50'
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter truncate w-full text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

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
