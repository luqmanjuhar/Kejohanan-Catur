
import React, { useState } from 'react';
import { Search, Save, X, Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { searchRemoteRegistration, syncRegistration } from '../services/api';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, sendWhatsAppNotification, isValidEmail, isValidMalaysianPhone } from '../utils/formatters';

interface UpdateRegistrationProps {
  localRegistrations: RegistrationsMap;
  onUpdateSuccess: (regId: string) => void;
  eventConfig: EventConfig;
}

const UpdateRegistration: React.FC<UpdateRegistrationProps> = ({ localRegistrations, onUpdateSuccess, eventConfig }) => {
  const [searchRegId, setSearchRegId] = useState('');
  const [searchPassword, setSearchPassword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingReg, setEditingReg] = useState<{ id: string; data: any } | null>(null);
  const [formErrors, setFormErrors] = useState<{teachers: Record<number, string[]>, students: Record<number, string[]>}>({
    teachers: {},
    students: {}
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    setEditingReg(null);

    try {
        let found = localRegistrations[searchRegId];
        let isValid = false;

        if (found && found.teachers.length > 0) {
            const phone = found.teachers[0].phone.replace(/\D/g, '');
            const last4 = phone.slice(-4);
            if (last4 === searchPassword) isValid = true;
        }

        if (isValid) {
            setEditingReg({ id: searchRegId, data: JSON.parse(JSON.stringify(found)) });
            setIsSearching(false);
            return;
        }

        const remoteResult = await searchRemoteRegistration(searchRegId, searchPassword);
        if (remoteResult.found && remoteResult.registration) {
             setEditingReg({ id: searchRegId, data: remoteResult.registration });
        } else {
             setSearchError(remoteResult.error || "Pendaftaran tidak dijumpai atau kata laluan salah.");
        }

    } catch (err: any) {
        setSearchError(err.message || "Ralat mencari pendaftaran.");
    } finally {
        setIsSearching(false);
    }
  };

  const validateEditForm = (): boolean => {
    if (!editingReg) return false;
    const errors: any = { teachers: {}, students: {} };
    let hasError = false;

    editingReg.data.teachers.forEach((t: Teacher, i: number) => {
      const tErrors = [];
      if (!isValidEmail(t.email)) tErrors.push('Email tidak sah');
      if (!isValidMalaysianPhone(t.phone)) tErrors.push('No. Telefon tidak sah');
      if (t.ic && t.ic.replace(/\D/g, '').length !== 12) tErrors.push('IC tidak sah');
      if (tErrors.length > 0) {
        errors.teachers[i] = tErrors;
        hasError = true;
      }
    });

    setFormErrors(errors);
    return !hasError;
  };

  const cancelEdit = () => {
    setEditingReg(null);
    setSearchRegId('');
    setSearchPassword('');
    setFormErrors({ teachers: {}, students: {} });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;

    if (!validateEditForm()) {
      alert("Sila betulkan ralat data guru.");
      return;
    }

    try {
        await syncRegistration(editingReg.id, editingReg.data, true);
        onUpdateSuccess(editingReg.id);
        sendWhatsAppNotification(editingReg.id, editingReg.data, 'update', eventConfig.adminPhone);
        setEditingReg(null);
        setSearchRegId('');
        setSearchPassword('');
    } catch (err) {
        alert("Gagal mengemaskini. Sila cuba lagi.");
    }
  };

  const updateData = (updater: (prev: any) => any) => {
    setEditingReg(prev => prev ? { ...prev, data: updater(prev.data) } : null);
  };

  if (editingReg) {
    const { data } = editingReg;
    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-blue-100 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-blue-600 uppercase">Kemaskini: {editingReg.id}</h3>
                <button onClick={cancelEdit} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Nama Sekolah</label>
                        <input 
                            value={data.schoolName} 
                            onChange={e => updateData(d => ({...d, schoolName: formatSchoolName(e.target.value)}))}
                            className="p-3 border-2 border-gray-100 rounded-xl focus:border-blue-300 outline-none w-full font-bold" required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Jenis Sekolah</label>
                        <select 
                            value={data.schoolType}
                            onChange={e => {
                                const type = e.target.value;
                                updateData(d => {
                                    const students = type === 'Sekolah Kebangsaan' 
                                        ? d.students.map((s: Student) => ({...s, category: 'Bawah 12 Tahun'}))
                                        : d.students;
                                    return {...d, schoolType: type, students};
                                });
                            }}
                            className="p-3 border-2 border-gray-100 rounded-xl focus:border-blue-300 outline-none w-full font-bold" required
                        >
                            <option value="Sekolah Kebangsaan">Sekolah Kebangsaan</option>
                            <option value="Sekolah Menengah">Sekolah Menengah</option>
                        </select>
                    </div>
                 </div>

                 <div className="bg-orange-50/50 p-6 rounded-3xl border-2 border-orange-100">
                    <h4 className="font-black text-orange-600 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">👨‍🏫 Maklumat Guru</h4>
                    {data.teachers.map((t: Teacher, i: number) => (
                        <div key={i} className="mb-6 grid md:grid-cols-2 gap-4 pb-6 border-b border-orange-100 last:border-0 last:pb-0">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">Nama Penuh</label>
                                <input 
                                    value={t.name}
                                    onChange={e => updateData(d => {
                                        const teachers = [...d.teachers];
                                        teachers[i].name = e.target.value.toUpperCase();
                                        return { ...d, teachers };
                                    })}
                                    className="p-2.5 border-2 border-white rounded-xl w-full outline-none focus:border-orange-300 font-bold" required
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">No. KP (Guru)</label>
                                <input 
                                    value={t.ic || ''}
                                    onChange={e => updateData(d => {
                                        const teachers = [...d.teachers];
                                        teachers[i].ic = formatIC(e.target.value);
                                        return { ...d, teachers };
                                    })}
                                    maxLength={14}
                                    className={`p-2.5 border-2 border-white rounded-xl w-full outline-none focus:border-orange-300 font-bold font-mono ${formErrors.teachers[i]?.includes('IC tidak sah') ? 'border-red-300' : ''}`} placeholder="000000-00-0000" required
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">Email</label>
                                <input 
                                    value={t.email}
                                    type="email"
                                    onChange={e => updateData(d => {
                                        const teachers = [...d.teachers];
                                        teachers[i].email = e.target.value;
                                        return { ...d, teachers };
                                    })}
                                    className={`p-2.5 border-2 border-white rounded-xl w-full outline-none focus:border-orange-300 font-bold ${formErrors.teachers[i]?.includes('Email tidak sah') ? 'border-red-300' : ''}`} required
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">No. Telefon</label>
                                    <input 
                                        value={t.phone}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].phone = formatPhoneNumber(e.target.value);
                                            return { ...d, teachers };
                                        })}
                                        className={`p-2.5 border-2 border-white rounded-xl w-full outline-none focus:border-orange-300 font-bold ${formErrors.teachers[i]?.includes('No. Telefon tidak sah') ? 'border-red-300' : ''}`} required
                                    />
                                </div>
                                {i > 0 && (
                                    <div className="flex items-end">
                                        <button type="button" onClick={() => updateData(d => ({...d, teachers: d.teachers.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 mb-1 p-2 transition-colors">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => ({...d, teachers: [...d.teachers, {name:'', email:'', phone:'', ic: '', position:'Pengiring'}]}))} className="text-[10px] font-black text-orange-600 bg-white px-4 py-2.5 rounded-xl hover:bg-orange-100 transition-colors flex items-center gap-2 mt-4 border-2 border-orange-100 shadow-sm uppercase">
                        <Plus size={14} /> Tambah Guru Pengiring
                    </button>
                 </div>

                 <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-100">
                    <h4 className="font-black text-blue-600 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">👥 Maklumat Pelajar</h4>
                    {data.students.map((s: Student, i: number) => (
                        <div key={i} className="mb-6 border-b border-blue-100 pb-6 last:border-0 last:pb-0">
                            <div className="grid md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">Nama Pelajar</label>
                                    <input 
                                        value={s.name}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].name = e.target.value.toUpperCase();
                                            return {...d, students};
                                        })}
                                        className="p-2.5 border-2 border-white rounded-xl w-full outline-none focus:border-blue-300 font-bold" required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">No. IC (Penuh)</label>
                                        <input 
                                            value={s.ic}
                                            onChange={e => updateData(d => {
                                                const students = [...d.students];
                                                const formatted = formatIC(e.target.value);
                                                students[i].ic = formatted;
                                                const digits = formatted.replace(/\D/g, '');
                                                if (digits.length === 12) {
                                                  const last = parseInt(digits.charAt(11));
                                                  students[i].gender = last % 2 === 0 ? 'Perempuan' : 'Lelaki';
                                                }
                                                if (students[i].category && students[i].gender) {
                                                  students[i].playerId = generatePlayerId(students[i].gender, d.schoolName, i, students[i].category, editingReg.id);
                                                }
                                                return {...d, students};
                                            })}
                                            className="p-2.5 border-2 border-white rounded-xl w-full outline-none focus:border-blue-300 font-bold font-mono" required
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button type="button" onClick={() => updateData(d => ({...d, students: d.students.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 mb-1 p-2 transition-colors">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">Bangsa</label>
                                    <select value={s.race} onChange={e => updateData(d => { const students = [...d.students]; students[i].race = e.target.value; return {...d, students}; })} className="p-2.5 border-2 border-white rounded-xl w-full text-xs font-bold outline-none bg-white">
                                        <option value="Melayu">Melayu</option>
                                        <option value="Cina">Cina</option>
                                        <option value="India">India</option>
                                        <option value="Bumiputera">Bumiputera</option>
                                        <option value="Lain-lain">Lain-lain</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">Jantina</label>
                                    <select value={s.gender} onChange={e => updateData(d => { const students = [...d.students]; students[i].gender = e.target.value as any; if (students[i].category && students[i].gender) students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id); return {...d, students}; })} className="p-2.5 border-2 border-white rounded-xl w-full text-xs font-bold outline-none bg-white">
                                        <option value="Lelaki">Lelaki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">Kategori</label>
                                    <select 
                                      value={s.category} 
                                      disabled={data.schoolType === 'Sekolah Kebangsaan'}
                                      onChange={e => updateData(d => { const students = [...d.students]; students[i].category = e.target.value; if (students[i].category && students[i].gender) students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id); return {...d, students}; })} 
                                      className="p-2.5 border-2 border-white rounded-xl w-full text-xs font-bold outline-none disabled:bg-gray-100 bg-white"
                                    >
                                        <option value="Bawah 12 Tahun">U12</option>
                                        <option value="Bawah 15 Tahun">U15</option>
                                        <option value="Bawah 18 Tahun">U18</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 block mb-1 uppercase">Player ID</label>
                                    <input value={s.playerId} readOnly className="p-2.5 bg-gray-100 rounded-xl w-full text-[9px] font-mono border-2 border-white" />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => {
                      const defaultCat = d.schoolType === 'Sekolah Kebangsaan' ? 'Bawah 12 Tahun' : '';
                      return {...d, students: [...d.students, {name:'', ic:'', gender:'', race:'', category:defaultCat, playerId:''}]};
                    })} className="text-[10px] font-black text-blue-600 bg-white px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2 mt-4 border-2 border-blue-100 shadow-sm uppercase">
                        <Plus size={14} /> Tambah Pelajar Baru
                    </button>
                 </div>

                 <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={cancelEdit} className="px-8 py-3 bg-gray-100 text-gray-400 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs">Batal</button>
                    <button type="submit" className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 transform active:scale-95 uppercase text-xs tracking-widest">
                        <Save size={20} /> Simpan Data Baru
                    </button>
                 </div>
            </form>
        </div>
    );
  }

  return (
    <div className="bg-blue-50/50 border-2 border-blue-100 rounded-[2.5rem] p-6 md:p-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100"><Search size={20} /></div>
          <h4 className="text-xl font-black text-blue-800 uppercase tracking-tighter">Cari & Kemaskini</h4>
      </div>
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <label className="block text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">ID Pendaftaran *</label>
            <input
              type="text"
              required
              value={searchRegId}
              onChange={(e) => setSearchRegId(e.target.value)}
              className="w-full px-5 py-3 border-2 border-white bg-white rounded-2xl focus:border-blue-600 outline-none transition-all font-mono font-bold shadow-sm"
              placeholder="MSSD-XX-XX"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">4 Digit Akhir Telefon *</label>
            <input
              type="text"
              required
              maxLength={4}
              value={searchPassword}
              onChange={(e) => setSearchPassword(e.target.value)}
              className="w-full px-5 py-3 border-2 border-white bg-white rounded-2xl focus:border-blue-600 outline-none transition-all font-mono font-bold shadow-sm"
              placeholder="1234"
            />
          </div>
        </div>
        {searchError && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 animate-shake">
            <AlertCircle size={18} /> {searchError}
          </div>
        )}
        <button
          type="submit"
          disabled={isSearching}
          className="flex items-center justify-center gap-3 w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black shadow-xl shadow-blue-100 disabled:opacity-50 transform active:scale-95 uppercase text-xs tracking-[0.2em]"
        >
          {isSearching ? <><RefreshCw className="animate-spin" size={18} /> Mencari...</> : <><Search size={18} /> Semak Data</>}
        </button>
      </form>
    </div>
  );
};

export default UpdateRegistration;
