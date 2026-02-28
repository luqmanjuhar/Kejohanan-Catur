
import React, { useState } from 'react';
import { Search, Save, X, Plus, Trash2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { searchRemoteRegistration, syncRegistration } from '../services/api';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, isValidEmail, isValidMalaysianPhone } from '../utils/formatters';

interface UpdateRegistrationProps {
  localRegistrations: RegistrationsMap;
  onUpdateSuccess: (regId: string, updatedData: any) => void;
  eventConfig: EventConfig;
}

const UpdateRegistration: React.FC<UpdateRegistrationProps> = ({ localRegistrations, onUpdateSuccess, eventConfig }) => {
  const [searchRegId, setSearchRegId] = useState('');
  const [searchPassword, setSearchPassword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingReg, setEditingReg] = useState<{ id: string; data: any } | null>(null);
  const [formErrors, setFormErrors] = useState<{teachers: Record<number, string[]>, students: Record<number, string[]>, schoolCode?: string}>({
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
            const phone = (found.teachers[0].phone || '').replace(/\D/g, '');
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

    // Validate School Code: 3 letters + 4 numbers
    const schoolCodeRegex = /^[A-Z]{3}\d{4}$/;
    if (!schoolCodeRegex.test(editingReg.data.schoolCode)) {
        errors.schoolCode = "Format Kod Sekolah Salah (Contoh: JEA1057)";
        hasError = true;
    }

    editingReg.data.teachers.forEach((t: Teacher, i: number) => {
      const tErrors = [];
      if (!isValidEmail(t.email)) tErrors.push('Email tidak sah');
      if (!isValidMalaysianPhone(t.phone)) tErrors.push('No. Telefon tidak sah');
      if (t.ic && t.ic.replace(/\D/g, '').length !== 12) tErrors.push('IC tidak lengkap');
      if (tErrors.length > 0) {
        errors.teachers[i] = tErrors;
        hasError = true;
      }
    });

    editingReg.data.students.forEach((s: Student, i: number) => {
        const sErrors = [];
        if ((s.ic || '').replace(/\D/g, '').length !== 12) sErrors.push('IC tidak lengkap');
        if (sErrors.length > 0) {
            errors.students[i] = sErrors;
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
    if (!editingReg || isUpdating) return;

    if (!validateEditForm()) {
      alert("Sila betulkan ralat data.");
      return;
    }

    setIsUpdating(true);
    try {
        const updatedData = {
          ...editingReg.data,
          schoolName: formatSchoolName(editingReg.data.schoolName),
          schoolCode: editingReg.data.schoolCode,
          teachers: editingReg.data.teachers.map((t: Teacher) => ({ ...t, name: t.name.toUpperCase() })),
          students: editingReg.data.students.map((s: Student) => ({ ...s, name: s.name.toUpperCase() })),
          updatedAt: new Date().toISOString()
        };
        await syncRegistration(editingReg.id, updatedData, true);
        onUpdateSuccess(editingReg.id, updatedData);
        setEditingReg(null);
        setSearchRegId('');
        setSearchPassword('');
    } catch (err) {
        console.error(err);
        alert("Ralat Rangkaian: Gagal menyambung ke awan. Sila cuba lagi.");
    } finally {
        setIsUpdating(false);
    }
  };

  const updateData = (updater: (prev: any) => any) => {
    setEditingReg(prev => prev ? { ...prev, data: updater(prev.data) } : null);
  };

  const getCategoryOptions = (schoolType: string, gender: string) => {
    if (schoolType === 'SEKOLAH RENDAH') {
        if (gender === 'Lelaki') return [{ value: 'L12', label: 'U12 Lelaki (L12)' }];
        if (gender === 'Perempuan') return [{ value: 'P12', label: 'U12 Perempuan (P12)' }];
        return [];
    }
    if (schoolType === 'SEKOLAH MENENGAH') {
        if (gender === 'Lelaki') return [
            { value: 'L15', label: 'U15 Lelaki (L15)' },
            { value: 'L18', label: 'U18 Lelaki (L18)' }
        ];
        if (gender === 'Perempuan') return [
            { value: 'P15', label: 'U15 Perempuan (P15)' },
            { value: 'P18', label: 'U18 Perempuan (P18)' }
        ];
        return [];
    }
    return [];
  };

  if (editingReg) {
    const { data } = editingReg;
    return (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-lg border-2 border-blue-100 animate-fadeIn space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-blue-600 uppercase">Kemaskini: {editingReg.id}</h3>
                <button onClick={cancelEdit} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-10">
                 {/* Section 1: Sekolah */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Kod Sekolah *</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                required 
                                maxLength={3}
                                value={data.schoolCode ? data.schoolCode.replace(/[^A-Z]/g, '') : ''} 
                                onChange={e => {
                                    const letters = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
                                    const numbers = data.schoolCode ? data.schoolCode.replace(/[^0-9]/g, '') : '';
                                    updateData(d => ({...d, schoolCode: letters + numbers}));
                                }} 
                                className={`w-1/3 min-h-[50px] px-4 py-3 border-2 rounded-2xl outline-none transition-all font-bold uppercase text-sm text-center ${formErrors.schoolCode ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-blue-300'}`}
                                placeholder="ABC"
                            />
                            <input 
                                type="text" 
                                required 
                                maxLength={4}
                                value={data.schoolCode ? data.schoolCode.replace(/[^0-9]/g, '') : ''} 
                                onChange={e => {
                                    const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                    const letters = data.schoolCode ? data.schoolCode.replace(/[^A-Z]/g, '') : '';
                                    updateData(d => ({...d, schoolCode: letters + numbers}));
                                }} 
                                className={`flex-1 min-h-[50px] px-4 py-3 border-2 rounded-2xl outline-none transition-all font-bold uppercase text-sm tracking-widest ${formErrors.schoolCode ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-blue-300'}`}
                                placeholder="1234"
                            />
                        </div>
                        {formErrors.schoolCode && (
                            <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.schoolCode}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Sekolah *</label>
                        <select 
                            value={data.schoolType}
                            onChange={e => {
                                const type = e.target.value;
                                updateData(d => {
                                    const students = d.students.map((s: Student) => {
                                        let cat = s.category;
                                        if (type === 'SEKOLAH RENDAH') {
                                            cat = s.gender === 'Lelaki' ? 'L12' : 'P12';
                                        }
                                        return {...s, category: cat};
                                    });
                                    return {...d, schoolType: type, students};
                                });
                            }}
                            className="w-full min-h-[50px] px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-blue-300 outline-none transition-all font-bold text-sm" 
                            required
                        >
                            <option value="SEKOLAH RENDAH">SEKOLAH RENDAH</option>
                            <option value="SEKOLAH MENENGAH">SEKOLAH MENENGAH</option>
                        </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Sekolah *</label>
                        <input 
                            value={data.schoolName} 
                            onChange={e => updateData(d => ({...d, schoolName: e.target.value}))} 
                            onBlur={() => updateData(d => ({...d, schoolName: formatSchoolName(d.schoolName)}))} 
                            className="w-full min-h-[50px] px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-blue-300 outline-none transition-all font-bold uppercase text-sm" 
                            placeholder="Contoh: SK TAMAN DESA"
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                         <div className="flex gap-2 items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-gray-600 font-medium leading-snug">
                                Jika sekolah kebangsaan hanya tulis <strong className="text-blue-700">SK</strong>, 
                                jika sekolah menengah kebangsaan tulis <strong className="text-blue-700">SMK</strong>, 
                                jika sekolah jenis kebangsaan cina atau india tulis sahaja <strong className="text-blue-700">SJKC</strong> atau <strong className="text-blue-700">SJKT</strong>.
                            </p>
                        </div>
                    </div>
                 </div>

                 {/* Section 2: Guru */}
                 <div className="bg-orange-50/30 p-6 rounded-[2rem] border-2 border-orange-50">
                    <h4 className="font-black text-orange-600 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">👨‍🏫 Maklumat Guru</h4>
                    {data.teachers.map((t: Teacher, i: number) => (
                        <div key={i} className="mb-6 p-5 bg-white rounded-2xl border-2 border-orange-50 relative">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{t.position}</span>
                                {i > 0 && <button type="button" onClick={() => updateData(d => ({...d, teachers: d.teachers.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>}
                             </div>
                             <div className="grid md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Guru Pengiring (Seperti dalam Kad Pengenalan) *</label>
                                    <input 
                                        placeholder="Contoh: MUHAMMAD ALI BIN ABU BAKAR"
                                        value={t.name}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].name = e.target.value;
                                            return { ...d, teachers };
                                        })}
                                        className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300 uppercase" required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Kad Pengenalan *</label>
                                    <input 
                                        placeholder="000000000000"
                                        value={t.ic || ''}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].ic = formatIC(e.target.value);
                                            return { ...d, teachers };
                                        })}
                                        maxLength={14}
                                        className={`w-full px-4 py-3 bg-white border-2 rounded-xl outline-none text-sm font-bold shadow-sm font-mono focus:border-orange-300 ${formErrors.teachers[i]?.includes('IC tidak lengkap') ? 'border-red-400' : 'border-gray-100'}`} required
                                    />
                                    {formErrors.teachers[i]?.includes('IC tidak lengkap') && <p className="text-[9px] text-red-500 font-black">IC tidak lengkap</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Alamat Emel *</label>
                                    <input 
                                        placeholder="Contoh: guru@moe.gov.my"
                                        value={t.email}
                                        type="email"
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].email = e.target.value;
                                            return { ...d, teachers };
                                        })}
                                        className={`w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300 ${formErrors.teachers[i]?.includes('Email tidak sah') ? 'border-red-300' : ''}`} required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Telefon *</label>
                                    <input 
                                        placeholder="Contoh: 0123456789"
                                        value={t.phone}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].phone = formatPhoneNumber(e.target.value);
                                            return { ...d, teachers };
                                        })}
                                        className={`w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300 ${formErrors.teachers[i]?.includes('No. Telefon tidak sah') ? 'border-red-300' : ''}`} required
                                    />
                                </div>
                             </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => ({...d, teachers: [...d.teachers, {name:'', email:'', phone:'', ic: '', position:'Pengiring'}]}))} className="w-full py-4 bg-orange-100 text-orange-600 text-xs font-black rounded-2xl border-2 border-dashed border-orange-200 hover:bg-orange-200 transition-all uppercase flex items-center justify-center gap-2">
                        <Plus size={14} /> Tambah Guru
                    </button>
                 </div>

                 {/* Section 3: Pelajar */}
                 <div className="bg-blue-50/30 p-6 rounded-[2rem] border-2 border-blue-50">
                    <h4 className="font-black text-blue-600 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">👥 Maklumat Pelajar</h4>
                    {data.students.map((s: Student, i: number) => (
                        <div key={i} className="mb-6 p-5 bg-white rounded-2xl border-2 border-blue-50 relative">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pelajar {i + 1}</span>
                                <button type="button" onClick={() => updateData(d => ({...d, students: d.students.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                             </div>
                            
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Pelajar (Seperti dalam Kad Pengenalan) *</label>
                                    <input 
                                        placeholder="Contoh: AHMAD BIN ABDULLAH"
                                        value={s.name}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].name = e.target.value;
                                            return {...d, students};
                                        })}
                                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none text-sm font-bold bg-white focus:border-blue-300 uppercase" required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Kad Pengenalan *</label>
                                    <input 
                                        placeholder="000000000000"
                                        value={s.ic}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            const formatted = formatIC(e.target.value);
                                            students[i].ic = formatted;
                                            const digits = formatted.replace(/\D/g, '');
                                            if (digits.length === 12) {
                                              const last = parseInt(digits.charAt(11));
                                              const detectedGender = last % 2 === 0 ? 'Perempuan' : 'Lelaki';
                                              students[i].gender = detectedGender;
                                              
                                              if (d.schoolType === 'SEKOLAH RENDAH') {
                                                  students[i].category = detectedGender === 'Lelaki' ? 'L12' : 'P12';
                                              }
                                            }
                                            if (students[i].category && students[i].gender) {
                                              students[i].playerId = generatePlayerId(students[i].gender, d.schoolName, i, students[i].category, editingReg.id);
                                            }
                                            return {...d, students};
                                        })}
                                        className={`w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold font-mono bg-white focus:border-blue-300 ${formErrors.students[i]?.includes('IC tidak lengkap') ? 'border-red-400' : 'border-gray-100'}`} required
                                    />
                                    {formErrors.students[i]?.includes('IC tidak lengkap') && <p className="text-[9px] text-red-500 font-black">IC tidak lengkap</p>}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Bangsa *</label>
                                    <select value={s.race} onChange={e => updateData(d => { const students = [...d.students]; students[i].race = e.target.value; return {...d, students}; })} className="w-full px-3 border-2 border-gray-100 rounded-xl text-xs font-bold outline-none bg-white min-h-[45px]">
                                        <option value="Melayu">Melayu</option>
                                        <option value="Cina">Cina</option>
                                        <option value="India">India</option>
                                        <option value="Lain-lain">Lain-lain</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Jantina *</label>
                                    <select value={s.gender} onChange={e => updateData(d => { const students = [...d.students]; students[i].gender = e.target.value as any; if (students[i].category && students[i].gender) students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id); return {...d, students}; })} className="w-full px-3 border-2 border-gray-100 rounded-xl text-xs font-bold outline-none bg-white min-h-[45px]">
                                        <option value="Lelaki">Lelaki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Kategori *</label>
                                    <select 
                                      value={s.category} 
                                      disabled={!s.gender}
                                      onChange={e => updateData(d => { const students = [...d.students]; students[i].category = e.target.value; if (students[i].category && students[i].gender) students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id); return {...d, students}; })} 
                                      className="w-full px-3 border-2 border-gray-100 rounded-xl text-xs font-bold outline-none disabled:bg-gray-100 bg-white min-h-[45px]"
                                    >
                                        <option value="">Pilih</option>
                                        {getCategoryOptions(data.schoolType, s.gender).map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Pemain</label>
                                    <div className="px-3 bg-gray-100 rounded-xl text-[10px] font-mono flex items-center text-gray-400 border-2 border-white uppercase overflow-hidden min-h-[45px]">
                                        {s.playerId || 'AUTO-ID'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => {
                      return {...d, students: [...d.students, {name:'', ic:'', gender:'', race:'', category:'', playerId:''}]};
                    })} className="w-full py-4 bg-blue-100 text-blue-600 text-xs font-black rounded-2xl border-2 border-dashed border-blue-200 hover:bg-blue-200 transition-all uppercase flex items-center justify-center gap-2">
                        <Plus size={14} /> Tambah Pelajar
                    </button>
                 </div>

                 <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={cancelEdit} disabled={isUpdating} className="px-8 py-3 bg-gray-100 text-gray-400 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs disabled:opacity-50">Batal</button>
                    <button 
                      type="submit" 
                      disabled={isUpdating}
                      className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 transform active:scale-95 uppercase text-xs tracking-widest disabled:bg-blue-400"
                    >
                        {isUpdating ? <><RefreshCw className="animate-spin" size={20} /> Menyimpan...</> : <><Save size={20} /> Simpan Kemaskini</>}
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
