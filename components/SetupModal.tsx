
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2, Info, Calendar, Link, FileText, Plus, Trash2, Lock, ShieldCheck } from 'lucide-react';
import { getEventConfig, updateRemoteConfig } from '../services/api';
import { EventConfig } from '../types';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'jadual' | 'pautan' | 'dokumen'>('info');
  const [config, setConfig] = useState<EventConfig>(getEventConfig());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Password protection state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getEventConfig());
      setError(null);
      setIsAuthorized(false);
      setPassword('');
      setAuthError(false);
    }
  }, [isOpen]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'kamuscatur') {
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPassword('');
    }
  };

  const handleSaveAll = async () => {
    setError(null);
    setIsSaving(true);
    try {
        await updateRemoteConfig(config);
        onClose();
        window.location.reload(); 
    } catch (err: any) {
        setError(err.message || "Ralat semasa menyimpan ke Cloud.");
    } finally {
        setIsSaving(false);
    }
  };

  const updateScheduleItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number, field: 'time' | 'activity', value: string) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items[itemIndex][field] = value;
    setConfig(newConfig);
  };

  const addScheduleDay = (type: 'primary' | 'secondary') => {
    const newConfig = { ...config };
    newConfig.schedules[type].push({ date: 'HARI BARU', items: [{ time: '', activity: '' }] });
    setConfig(newConfig);
  };

  const removeScheduleDay = (type: 'primary' | 'secondary', dayIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type].splice(dayIndex, 1);
    setConfig(newConfig);
  };

  const addScheduleItem = (type: 'primary' | 'secondary', dayIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items.push({ time: '', activity: '' });
    setConfig(newConfig);
  };

  const removeScheduleItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items.splice(itemIndex, 1);
    setConfig(newConfig);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] max-w-5xl w-full shadow-2xl flex flex-col overflow-hidden animate-fadeIn h-[90vh]">
        
        {/* Header (Shared) */}
        <div className="p-8 bg-orange-600 text-white flex justify-between items-center relative shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                    {isAuthorized ? <ShieldCheck size={28}/> : <Lock size={28}/>}
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tight">Kemas Kini Maklumat</h2>
                    <p className="text-xs font-bold opacity-70 tracking-widest uppercase">Daerah Pasir Gudang Hub</p>
                </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-black/20 p-3 rounded-full transition-all"><X size={24} /></button>
        </div>

        {!isAuthorized ? (
          /* Password Protection Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-orange-50/20">
            <form onSubmit={handleAuth} className="w-full max-w-sm text-center space-y-6">
               <div className="space-y-2">
                 <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Akses Terhad</h3>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                   Sila masukkan kata laluan untuk mengakses konfigurasi awan MSSD Pasir Gudang.
                 </p>
               </div>
               
               <div className="relative group">
                 <input 
                   type="password"
                   autoFocus
                   value={password}
                   onChange={(e) => {
                     setPassword(e.target.value);
                     setAuthError(false);
                   }}
                   placeholder="Kata Laluan"
                   className={`w-full px-6 py-4 bg-white border-2 rounded-2xl text-center font-black tracking-[0.5em] focus:border-orange-500 outline-none transition-all shadow-sm ${
                     authError ? 'border-red-400 animate-shake bg-red-50' : 'border-gray-100'
                   }`}
                 />
                 {authError && (
                   <p className="text-[10px] text-red-500 font-black mt-2 uppercase tracking-widest italic">
                     Kata laluan salah. Sila cuba lagi.
                   </p>
                 )}
               </div>

               <button 
                 type="submit"
                 className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-orange-100 active:scale-95 transition-all"
               >
                 Masuk Tetapan
               </button>
            </form>
          </div>
        ) : (
          /* Authorized Content */
          <>
            {/* Navigation */}
            <div className="flex bg-gray-50 border-b overflow-x-auto no-scrollbar shrink-0">
                {[
                    { id: 'info', label: 'Info', icon: <Info size={18}/> },
                    { id: 'jadual', label: 'Jadual', icon: <Calendar size={18}/> },
                    { id: 'pautan', label: 'Pautan', icon: <Link size={18}/> },
                    { id: 'dokumen', label: 'Dokumen', icon: <FileText size={18}/> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-8 py-5 text-sm font-black transition-all border-b-4 whitespace-nowrap ${
                            activeTab === tab.id ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white no-scrollbar">
                {error && (
                    <div className="bg-red-50 border-2 border-red-100 p-5 rounded-3xl flex items-start gap-4 animate-shake">
                        <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                        <div className="text-sm">
                            <p className="font-black text-red-800">Ralat Kemaskini</p>
                            <p className="text-red-600 font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="space-y-8 animate-fadeIn max-w-2xl">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Nama Rasmi Kejohanan</label>
                            <input type="text" value={config.eventName} onChange={(e) => setConfig({...config, eventName: e.target.value})} className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-black text-lg text-orange-600" />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Lokasi / Venue</label>
                                <input type="text" value={config.eventVenue} onChange={(e) => setConfig({...config, eventVenue: e.target.value})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">No. Telefon Admin</label>
                                <input type="text" value={config.adminPhone} onChange={(e) => setConfig({...config, adminPhone: e.target.value})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'jadual' && (
                    <div className="space-y-12 animate-fadeIn">
                        {(['primary', 'secondary'] as const).map(type => (
                            <div key={type} className="bg-gray-50/50 p-8 rounded-[2.5rem] border-2 border-gray-100">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="font-black text-gray-800 flex items-center gap-3 text-lg">
                                        {type === 'primary' ? '🏫 Sekolah Rendah' : '🎓 Sekolah Menengah'}
                                    </h4>
                                    <button onClick={() => addScheduleDay(type)} className="px-5 py-2.5 bg-gray-800 text-white text-[10px] font-black rounded-xl hover:bg-black transition-all flex items-center gap-2 uppercase">
                                        <Plus size={14}/> Tambah Hari
                                    </button>
                                </div>
                                
                                <div className="grid lg:grid-cols-2 gap-8">
                                    {config.schedules[type].map((day, dIdx) => (
                                        <div key={dIdx} className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-sm relative group">
                                            <button onClick={() => removeScheduleDay(type, dIdx)} className="absolute -top-3 -right-3 bg-red-100 text-red-500 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"><Trash2 size={16}/></button>
                                            <input 
                                                type="text" 
                                                value={day.date} 
                                                onChange={(e) => {
                                                    const newConfig = {...config};
                                                    newConfig.schedules[type][dIdx].date = e.target.value;
                                                    setConfig(newConfig);
                                                }}
                                                className="font-black text-orange-600 mb-6 outline-none border-b-4 border-orange-50 w-full text-base focus:border-orange-500 uppercase pb-2"
                                            />
                                            <div className="space-y-4">
                                                {day.items.map((item, iIdx) => (
                                                    <div key={iIdx} className="flex gap-3">
                                                        <input value={item.time} onChange={(e) => updateScheduleItem(type, dIdx, iIdx, 'time', e.target.value)} placeholder="Masa" className="w-28 text-[11px] font-bold p-3 border-2 border-gray-50 rounded-xl focus:border-orange-200 outline-none" />
                                                        <input value={item.activity} onChange={(e) => updateScheduleItem(type, dIdx, iIdx, 'activity', e.target.value)} placeholder="Aktiviti" className="flex-1 text-[11px] font-bold p-3 border-2 border-gray-100 rounded-xl focus:border-orange-200 outline-none" />
                                                        <button onClick={() => removeScheduleItem(type, dIdx, iIdx)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addScheduleItem(type, dIdx)} className="w-full py-3 bg-orange-50 text-orange-600 text-[10px] font-black rounded-xl border-2 border-dashed border-orange-100 hover:bg-orange-100 flex items-center justify-center gap-2 transition-all">
                                                    <Plus size={14}/> TAMBAH SLOT MASA
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'pautan' && (
                    <div className="space-y-8 animate-fadeIn max-w-2xl">
                        {Object.entries(config.links).map(([key, val]) => (
                            <div key={key}>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">{key}</label>
                                <input type="text" value={val} onChange={(e) => setConfig({...config, links: {...config.links, [key]: e.target.value}})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-xs text-blue-600" placeholder="https://..." />
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'dokumen' && (
                    <div className="space-y-8 animate-fadeIn max-w-2xl">
                        {Object.entries(config.documents).map(([key, val]) => (
                            <div key={key}>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">{key}</label>
                                <input type="text" value={val} onChange={(e) => setConfig({...config, documents: {...config.documents, [key]: e.target.value}})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-xs text-red-600" placeholder="https://..." />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50 flex justify-end items-center border-t border-gray-100 shrink-0">
                <div className="flex gap-4">
                    <button onClick={onClose} className="px-8 py-3 font-black text-gray-400 hover:text-gray-600 transition-colors uppercase text-xs">Batal</button>
                    <button onClick={handleSaveAll} disabled={isSaving} className="px-10 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-orange-100 flex items-center gap-3 disabled:bg-orange-300 hover:bg-orange-700 transition-all transform active:scale-95 uppercase text-xs tracking-widest">
                        {isSaving ? <><Loader2 className="animate-spin" size={18}/> Menyimpan...</> : <><Save size={18}/> Kemaskini Cloud</>}
                    </button>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SetupModal;
