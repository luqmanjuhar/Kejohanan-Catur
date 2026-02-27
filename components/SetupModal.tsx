
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2, Info, Calendar, Link, FileText, Plus, Trash2, Lock, ShieldCheck, Database, Check, Copy } from 'lucide-react';
import { updateRemoteConfig } from '../services/api';
import { EventConfig } from '../types';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: EventConfig;
  onSaveSuccess: (config: EventConfig) => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, currentConfig, onSaveSuccess }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'jadual' | 'pautan' | 'dokumen' | 'system'>('info');
  const [config, setConfig] = useState<EventConfig>(currentConfig);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Password protection state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(JSON.parse(JSON.stringify(currentConfig))); // Deep copy to avoid mutating original props
      setError(null);
      setIsAuthorized(false);
      setPassword('');
      setAuthError(false);
    }
  }, [isOpen, currentConfig]);

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
        onSaveSuccess(config);
        alert("Konfigurasi berjaya dikemaskini ke Cloud!");
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

  const getScriptContent = () => {
    return `/**
 * MSSD Catur Cloud Script - v3.1 (Updated Columns)
 * 
 * STRUKTUR SHEET & COLUMN INDEX (A=0, B=1, ...):
 * 
 * 1. SHEET SEKOLAH
 *    [0] Timestamp, [1] ID Sekolah, [2] Kod Sekolah, [3] Nama Sekolah, [4] Jenis Sekolah, 
 *    [5] Last Update, 
 *    [6] Lelaki, [7] Perempuan, [8] Melayu, [9] Cina, [10] India, [11] Lain-lain, 
 *    [12] Jumlah Pelajar, [13] Jumlah Guru
 * 
 * 2. SHEET GURU
 *    [0] Last update, [1] ID Sekolah, [2] Kod Sekolah, [3] Nama Sekolah, [4] Jenis Sekolah, 
 *    [5] Nama Guru, [6] No Kad Pengenalan, [7] Email, [8] No Telefon, [9] Jawatan
 * 
 * 3. SHEET PELAJAR
 *    [0] Last Update, [1] ID Sekolah, [2] Kod Sekolah, [3] Nama Sekolah, [4] Jenis Sekolah, 
 *    [5] ID Pelajar, [6] Nama Pelajar, [7] No Kad Pengenalan, 
 *    [8] Jantina, [9] Kategori, [10] Bangsa
 * 
 * 4. SHEET INFO
 *    [0] Nama, [1] Lokasi, [2] Telefon Admin, [3] Tarikh Kejohanan, [4] Tarikh Akhir Pendaftaran, [5] Tarikh Akhir Pembayaran
 * 
 * 5. SHEET PAUTAN
 *    [0] Peraturan, [1] Keputusan, [2] Gambar
 * 
 * 6. SHEET DOKUMEN
 *    [0] Jemputan, [1] Mesyuarat, [2] Arbiter
 * 
 * 7. SHEET JADUAL
 *    [0] Kategori, [1] Hari, [2] Masa, [3] Aktiviti
 */

const SS_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  
  let result = {};
  
  try {
    if (action === 'loadAll') {
      result = loadAllData();
    } else if (action === 'search') {
      result = searchRegistration(params.regId, params.password);
    }
  } catch (error) {
    result = { error: error.toString() };
  }
  
  const callback = params.callback;
  const output = JSON.stringify(result);
  
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + output + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    let result = {};
    
    if (action === 'submit' || action === 'update') {
      result = saveRegistration(postData);
    } else if (action === 'updateConfig') {
      result = saveConfig(postData.config);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- FUNGSI UTAMA ---

function loadAllData() {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // 1. INFO (Row 2, Cols A-F)
  const infoSheet = ss.getSheetByName('INFO');
  const infoData = infoSheet.getRange(2, 1, 1, 6).getValues()[0];

  // 2. PAUTAN (Row 2, Cols A-C)
  const linkSheet = ss.getSheetByName('PAUTAN');
  const linkData = linkSheet.getRange(2, 1, 1, 3).getValues()[0];

  // 3. DOKUMEN (Row 2, Cols A-C)
  const docSheet = ss.getSheetByName('DOKUMEN');
  const docData = docSheet.getRange(2, 1, 1, 3).getValues()[0];

  // 4. JADUAL (Baca semua baris bermula row 2)
  const schedSheet = ss.getSheetByName('JADUAL');
  const schedRows = schedSheet.getDataRange().getValues().slice(1); // Skip header row 1
  
  // Asingkan mengikut column A (Kategori: SR atau SM)
  const primarySched = transformSchedule(schedRows.filter(r => r[0] === 'SR'));
  const secondarySched = transformSchedule(schedRows.filter(r => r[0] === 'SM'));

  const config = {
    eventName: infoData[0],
    eventVenue: infoData[1],
    adminPhone: infoData[2],
    tournamentDate: infoData[3],
    registrationDeadline: infoData[4],
    paymentDeadline: infoData[5],
    links: {
      rules: linkData[0],
      results: linkData[1],
      photos: linkData[2]
    },
    documents: {
      invitation: docData[0],
      meeting: docData[1],
      arbiter: docData[2]
    },
    schedules: {
      primary: primarySched,
      secondary: secondarySched
    }
  };
  
  // 5. DATA PENDAFTARAN
  const registrations = {};
  
  // Load SEKOLAH (ID di Column B [Index 1])
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  const schools = schoolSheet.getDataRange().getValues().slice(1);
  schools.forEach(row => {
    // Row: [0]Timestamp, [1]ID, [2]Kod, [3]Nama, [4]Jenis, [5]Update...
    if(row[1]) { 
      registrations[row[1]] = {
        schoolCode: row[2],
        schoolName: row[3],
        schoolType: row[4],
        status: 'AKTIF',
        createdAt: row[0],
        updatedAt: row[5],
        teachers: [],
        students: []
      };
    }
  });

  // Load GURU (ID Sekolah di Column B [Index 1])
  const teacherSheet = ss.getSheetByName('GURU');
  const teachers = teacherSheet.getDataRange().getValues().slice(1);
  teachers.forEach(row => {
    // Row: [0]Update, [1]ID, [2]Kod, [3]NamaSek, [4]Jenis, [5]NamaGuru, [6]IC, [7]Email, [8]Tel, [9]Jawatan
    const id = row[1];
    if (registrations[id]) {
      registrations[id].teachers.push({
        name: row[5],
        ic: row[6],
        email: row[7],
        phone: row[8],
        position: row[9]
      });
    }
  });

  // Load PELAJAR (ID Sekolah di Column B [Index 1])
  const studentSheet = ss.getSheetByName('PELAJAR');
  const students = studentSheet.getDataRange().getValues().slice(1);
  students.forEach(row => {
    // Row: [0]Update, [1]ID, [2]Kod, [3]NamaSek, [4]Jenis, [5]IDPel, [6]Nama, [7]IC, [8]Jan, [9]Kat, [10]Bangsa
    const id = row[1];
    if (registrations[id]) {
      registrations[id].students.push({
        playerId: row[5],
        name: row[6],
        ic: row[7],
        gender: row[8],
        category: row[9],
        race: row[10]
      });
    }
  });
  
  return { config, registrations };
}

function saveRegistration(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const regId = data.registrationId;
  const isUpdate = data.action === 'update';
  const schoolType = data.schoolType || '';
  const now = new Date();
  
  // Kira Statistik untuk Sheet SEKOLAH
  const teacherCount = data.teachers.length;
  const studentCount = data.students.length;
  const maleCount = data.students.filter(s => s.gender === 'Lelaki').length;
  const femaleCount = data.students.filter(s => s.gender === 'Perempuan').length;
  
  const malayCount = data.students.filter(s => s.race === 'Melayu').length;
  const chineseCount = data.students.filter(s => s.race === 'Cina').length;
  const indianCount = data.students.filter(s => s.race === 'India').length;
  const othersCount = data.students.filter(s => s.race === 'Lain-lain' || !['Melayu', 'Cina', 'India'].includes(s.race)).length;

  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  if (!lock.hasLock()) throw new Error("Server sibuk. Sila cuba sebentar lagi.");
  
  try {
    // --- 1. SHEET SEKOLAH ---
    const schoolSheet = ss.getSheetByName('SEKOLAH');
    // Jika update, buang baris lama berdasarkan ID (Column B, Index 1)
    if (isUpdate) deleteRowsById(schoolSheet, regId, 1);

    // Susunan Column:
    // [0]Timestamp, [1]ID, [2]Kod, [3]Nama, [4]Jenis, [5]Last Update, 
    // [6]Lelaki, [7]Perempuan, [8]Melayu, [9]Cina, [10]India, [11]Lain, [12]J.Pelajar, [13]J.Guru
    const schoolRow = [
      data.createdAt ? new Date(data.createdAt) : now,
      regId,
      data.schoolCode,
      data.schoolName,
      schoolType,
      now,
      maleCount,
      femaleCount,
      malayCount,
      chineseCount,
      indianCount,
      othersCount,
      studentCount,
      teacherCount
    ];
    schoolSheet.appendRow(schoolRow);
    
    // --- 2. SHEET GURU ---
    const teacherSheet = ss.getSheetByName('GURU');
    if (isUpdate) deleteRowsById(teacherSheet, regId, 1);

    // Susunan Column:
    // [0]Update, [1]ID, [2]Kod, [3]NamaSek, [4]Jenis, [5]Nama, [6]IC, [7]Email, [8]Tel, [9]Jawatan
    const teacherRows = data.teachers.map(t => [
      now,
      regId,
      data.schoolCode,
      data.schoolName,
      schoolType,
      t.name,
      t.ic,
      t.email,
      t.phone,
      t.position
    ]);
    if (teacherRows.length > 0) {
      teacherSheet.getRange(teacherSheet.getLastRow() + 1, 1, teacherRows.length, 10).setValues(teacherRows);
    }
    
    // --- 3. SHEET PELAJAR ---
    const studentSheet = ss.getSheetByName('PELAJAR');
    if (isUpdate) deleteRowsById(studentSheet, regId, 1);

    // Susunan Column:
    // [0]Update, [1]ID, [2]Kod, [3]NamaSek, [4]Jenis, [5]IDPel, [6]Nama, [7]IC, [8]Jan, [9]Kat, [10]Bangsa
    const studentRows = data.students.map(s => [
      now,
      regId,
      data.schoolCode,
      data.schoolName,
      schoolType,
      s.playerId,
      s.name,
      s.ic,
      s.gender,
      s.category,
      s.race
    ]);
    if (studentRows.length > 0) {
      studentSheet.getRange(studentSheet.getLastRow() + 1, 1, studentRows.length, 11).setValues(studentRows);
    }
    
    return { status: 'success', regId: regId };
    
  } finally {
    lock.releaseLock();
  }
}

function saveConfig(config) {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // 1. INFO (Row 2, Cols A-F)
  const infoSheet = ss.getSheetByName('INFO');
  infoSheet.getRange(2, 1, 1, 6).setValues([[
    config.eventName,
    config.eventVenue,
    config.adminPhone,
    config.tournamentDate,
    config.registrationDeadline,
    config.paymentDeadline
  ]]);

  // 2. PAUTAN (Row 2, Cols A-C)
  const linkSheet = ss.getSheetByName('PAUTAN');
  linkSheet.getRange(2, 1, 1, 3).setValues([[
    config.links.rules,
    config.links.results,
    config.links.photos
  ]]);

  // 3. DOKUMEN (Row 2, Cols A-C)
  const docSheet = ss.getSheetByName('DOKUMEN');
  docSheet.getRange(2, 1, 1, 3).setValues([[
    config.documents.invitation,
    config.documents.meeting,
    config.documents.arbiter
  ]]);

  // 4. JADUAL (Flatten Data)
  const schedSheet = ss.getSheetByName('JADUAL');
  
  // Clear data lama (simpan header di Row 1)
  const lastRow = schedSheet.getLastRow();
  if (lastRow > 1) {
    schedSheet.getRange(2, 1, lastRow - 1, 4).clearContent();
  }

  const newRows = [];
  // Primary (SR)
  if (config.schedules.primary) {
    config.schedules.primary.forEach(day => {
      day.items.forEach(item => {
        // [0]Kategori, [1]Hari, [2]Masa, [3]Aktiviti
        newRows.push(['SR', day.date, item.time, item.activity]);
      });
    });
  }
  // Secondary (SM)
  if (config.schedules.secondary) {
    config.schedules.secondary.forEach(day => {
      day.items.forEach(item => {
        newRows.push(['SM', day.date, item.time, item.activity]);
      });
    });
  }

  if (newRows.length > 0) {
    schedSheet.getRange(2, 1, newRows.length, 4).setValues(newRows);
  }

  return { status: 'success' };
}

function searchRegistration(regId, password) {
  const data = loadAllData();
  const reg = data.registrations[regId];
  
  if (!reg) return { found: false, error: 'ID Pendaftaran tidak wujud.' };
  
  // Password check: 4 digit akhir no telefon guru pertama
  if (reg.teachers.length > 0) {
    const phone = reg.teachers[0].phone.replace(/\D/g, '');
    const last4 = phone.slice(-4);
    if (last4 === password) {
      return { found: true, registration: reg };
    }
  }
  
  return { found: false, error: 'Kata laluan salah.' };
}

// Helpers
function deleteRowsById(sheet, id, idColIndex) {
  const data = sheet.getDataRange().getValues();
  // Loop dari bawah ke atas untuk delete dengan selamat
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idColIndex] === id) {
      sheet.deleteRow(i + 1);
    }
  }
}

function transformSchedule(rows) {
  // Tukar format Flat DB (Row by Row) ke Nested JSON (Date > Items)
  const daysMap = {};
  rows.forEach(r => {
    const date = r[1]; // Col B: Hari
    if (!daysMap[date]) daysMap[date] = [];
    daysMap[date].push({ time: r[2], activity: r[3] }); // Col C: Masa, Col D: Aktiviti
  });

  return Object.keys(daysMap).map(date => ({
    date: date,
    items: daysMap[date]
  }));
}

function initSheets(ss) {
  const configs = {
    'SEKOLAH': ['TIMESTAMP', 'ID SEKOLAH', 'KOD SEKOLAH', 'NAMA SEKOLAH', 'JENIS SEKOLAH', 'LAST UPDATE', 'LELAKI', 'PEREMPUAN', 'MELAYU', 'CINA', 'INDIA', 'LAIN-LAIN', 'JUMLAH PELAJAR', 'JUMLAH GURU'],
    'GURU': ['ID', 'KOD SEKOLAH', 'NAMA SEKOLAH', 'NAMA GURU', 'EMAIL', 'TELEFON', 'JAWATAN', 'URUTAN', 'DAFTAR', 'KEMASKINI', 'STATUS'],
    'PELAJAR': ['ID', 'KOD SEKOLAH', 'NAMA SEKOLAH', 'NAMA PELAJAR', 'NO IC', 'JANTINA', 'KATEGORI UMUR', 'KATEGORI DISPLAY', 'BANGSA', 'ID PEMAIN', 'GURU KETUA', 'TELEFON GURU', 'DAFTAR', 'KEMASKINI', 'STATUS'],
    'INFO': ['KEY', 'VALUE'],
    'JADUAL': ['TYPE', 'DAY', 'TIME', 'ACTIVITY'],
    'PAUTAN': ['KEY', 'VALUE'],
    'DOKUMEN': ['KEY', 'VALUE']
  };
  
  Object.keys(configs).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(configs[name]);
      sh.getRange(1,1,1,configs[name].length).setFontWeight('bold').setBackground('#f3f3f3');
      sh.setFrozenRows(1);
    }
  });
}
`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] max-w-5xl w-full shadow-2xl flex flex-col overflow-hidden animate-fadeIn h-[90vh]">
        
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
          <>
            <div className="flex bg-gray-50 border-b overflow-x-auto no-scrollbar shrink-0">
                {[
                    { id: 'info', label: 'Info', icon: <Info size={18}/> },
                    { id: 'jadual', label: 'Jadual', icon: <Calendar size={18}/> },
                    { id: 'pautan', label: 'Pautan', icon: <Link size={18}/> },
                    { id: 'dokumen', label: 'Dokumen', icon: <FileText size={18}/> },
                    { id: 'system', label: 'Sistem', icon: <Database size={18}/> },
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
                        
                        {/* NEW DATE FIELDS */}
                        <div className="grid md:grid-cols-2 gap-6 bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
                            <div>
                                <label className="block text-[10px] font-black text-orange-400 mb-2 uppercase tracking-[0.2em]">Tarikh Kejohanan</label>
                                <input placeholder="Contoh: 12 - 14 JULAI 2026" type="text" value={config.tournamentDate || ''} onChange={(e) => setConfig({...config, tournamentDate: e.target.value})} className="w-full px-5 py-4 border-2 border-orange-100 bg-white rounded-2xl focus:border-orange-500 outline-none transition-all font-bold text-orange-800" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-orange-400 mb-2 uppercase tracking-[0.2em]">Tarikh Tutup Pendaftaran</label>
                                <input placeholder="Contoh: 10 JULAI 2026" type="text" value={config.registrationDeadline || ''} onChange={(e) => setConfig({...config, registrationDeadline: e.target.value})} className="w-full px-5 py-4 border-2 border-orange-100 bg-white rounded-2xl focus:border-orange-500 outline-none transition-all font-bold text-orange-800" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-orange-400 mb-2 uppercase tracking-[0.2em]">Tarikh Akhir Pembayaran</label>
                                <input placeholder="Contoh: 15 JULAI 2026" type="text" value={config.paymentDeadline || ''} onChange={(e) => setConfig({...config, paymentDeadline: e.target.value})} className="w-full px-5 py-4 border-2 border-orange-100 bg-white rounded-2xl focus:border-orange-500 outline-none transition-all font-bold text-orange-800" />
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

                {activeTab === 'system' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-black text-blue-800 text-lg">Google Apps Script (Backend)</h4>
                                    <p className="text-xs text-blue-600 font-bold mt-1">Sila kemaskini kod ini di Google Apps Script Editor anda untuk menyokong medan "KOD SEKOLAH".</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(getScriptContent());
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }} 
                                    className="px-4 py-2 bg-white text-blue-600 rounded-xl font-black text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                                >
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'TELAH DISALIN' : 'SALIN KOD'}
                                </button>
                            </div>
                            <div className="bg-gray-900 rounded-2xl p-4 overflow-hidden">
                                <pre className="text-[10px] font-mono text-gray-400 h-96 overflow-y-auto custom-scrollbar">
                                    {getScriptContent()}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>

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
